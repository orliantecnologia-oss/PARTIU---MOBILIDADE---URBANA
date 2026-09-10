/**
 * ==============================================================================
 * ⚙️ PARTIU ECOSYSTEM — APP SETTINGS SERVICE
 * ==============================================================================
 * Gerenciamento centralizado, reativo e resiliente das configurações globais
 * do ecossistema PARTIU (App Passageiro, App Motorista e Painel Administrativo).
 *
 * Suporte a:
 * - Leitura síncrona com cache local (LocalStorage)
 * - Sincronização em tempo real com Supabase (PostgreSQL)
 * - Fórmulas dinâmicas de cotação de viagens e entregas
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { silentCatchWarn } from "@/lib/structured-logger";


export interface AppSettings {
  id: string;
  daily_fee_car: number;
  daily_fee_moto: number;
  base_fare_ride: number;
  base_fare_delivery: number;
  price_per_km: number;
  price_per_minute: number;
  is_delivery_active: boolean;
  is_ride_active: boolean;
  currency_symbol: string;
  pix_key: string;
  pix_receiver_name: string;
  pix_receiver_city: string;
  updated_at: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: "global",
  daily_fee_car: 10.0,
  daily_fee_moto: 5.0,
  base_fare_ride: 6.0,
  base_fare_delivery: 5.0,
  price_per_km: 1.8,
  price_per_minute: 0.3,
  is_delivery_active: true,
  is_ride_active: true,
  currency_symbol: "R$",
  pix_key: "financeiro@partiumobilidade.com.br",
  pix_receiver_name: "PARTIU MOBILIDADE URBANA LTDA",
  pix_receiver_city: "ITAPERUNA",
  updated_at: new Date().toISOString(),
};

const SETTINGS_STORAGE_KEY = "partiu_global_app_settings";

class AppSettingsService {
  private currentSettings: AppSettings;
  private listeners: Set<(settings: AppSettings) => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.currentSettings = this.loadFromStorage();
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private loadFromStorage(): AppSettings {
    if (typeof window === "undefined") return { ...DEFAULT_APP_SETTINGS };
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_APP_SETTINGS,
          ...parsed,
          daily_fee_car: Number(parsed.daily_fee_car) || DEFAULT_APP_SETTINGS.daily_fee_car,
          daily_fee_moto: Number(parsed.daily_fee_moto) || DEFAULT_APP_SETTINGS.daily_fee_moto,
          base_fare_ride: Number(parsed.base_fare_ride) || DEFAULT_APP_SETTINGS.base_fare_ride,
          base_fare_delivery: Number(parsed.base_fare_delivery) || DEFAULT_APP_SETTINGS.base_fare_delivery,
          price_per_km: Number(parsed.price_per_km) || DEFAULT_APP_SETTINGS.price_per_km,
          price_per_minute: Number(parsed.price_per_minute) || DEFAULT_APP_SETTINGS.price_per_minute,
          is_delivery_active: parsed.is_delivery_active !== false,
          is_ride_active: parsed.is_ride_active !== false,
        };
      }
    } catch (e) {
      console.warn("[AppSettingsService] Falha ao ler cache local:", e);
    }
    return { ...DEFAULT_APP_SETTINGS };
  }

  private saveToStorage(settings: AppSettings) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("[AppSettingsService] Falha ao salvar cache local:", e);
    }
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Carrega dados atualizados do backend
    void this.fetchFromBackend();

    // 2. Escuta alterações em outras abas do navegador
    window.addEventListener("storage", (e) => {
      if (e.key === SETTINGS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.currentSettings = { ...DEFAULT_APP_SETTINGS, ...parsed };
          this.notifyListeners();
        } catch (err) { silentCatchWarn("app-settings-service", err); }
      }
    });

    // 3. Inicia canal Realtime se Supabase estiver ativo
    if (isSupabaseConfigured()) {
      try {
        supabase
          .channel("realtime:app_settings")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "app_settings" },
            (payload) => {
              if (payload.new && typeof payload.new === "object") {
                this.handleRemoteUpdate(payload.new as Partial<AppSettings>);
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn("[AppSettingsService] Realtime não disponível:", e);
      }
    }
  }

  public async fetchFromBackend(): Promise<AppSettings> {
    if (!isSupabaseConfigured()) {
      return this.currentSettings;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("*")
        .eq("id", "global")
        .maybeSingle();

      if (!error && data) {
        this.handleRemoteUpdate(data);
      }
    } catch (e) {
      console.warn("[AppSettingsService] Consulta ao Supabase falhou, usando cache:", e);
    }

    return this.currentSettings;
  }

  private handleRemoteUpdate(data: Partial<AppSettings>) {
    this.currentSettings = {
      ...this.currentSettings,
      ...data,
      daily_fee_car: Number(data.daily_fee_car ?? this.currentSettings.daily_fee_car),
      daily_fee_moto: Number(data.daily_fee_moto ?? this.currentSettings.daily_fee_moto),
      base_fare_ride: Number(data.base_fare_ride ?? this.currentSettings.base_fare_ride),
      base_fare_delivery: Number(data.base_fare_delivery ?? this.currentSettings.base_fare_delivery),
      price_per_km: Number(data.price_per_km ?? this.currentSettings.price_per_km),
      price_per_minute: Number(data.price_per_minute ?? this.currentSettings.price_per_minute),
      is_delivery_active: data.is_delivery_active !== undefined ? Boolean(data.is_delivery_active) : this.currentSettings.is_delivery_active,
      is_ride_active: data.is_ride_active !== undefined ? Boolean(data.is_ride_active) : this.currentSettings.is_ride_active,
      updated_at: data.updated_at || new Date().toISOString(),
    };
    this.saveToStorage(this.currentSettings);
    this.notifyListeners();
  }

  public getSettings(): AppSettings {
    return { ...this.currentSettings };
  }

  public async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const updated: AppSettings = {
      ...this.currentSettings,
      ...patch,
      daily_fee_car: patch.daily_fee_car !== undefined ? Number(patch.daily_fee_car) : this.currentSettings.daily_fee_car,
      daily_fee_moto: patch.daily_fee_moto !== undefined ? Number(patch.daily_fee_moto) : this.currentSettings.daily_fee_moto,
      base_fare_ride: patch.base_fare_ride !== undefined ? Number(patch.base_fare_ride) : this.currentSettings.base_fare_ride,
      base_fare_delivery: patch.base_fare_delivery !== undefined ? Number(patch.base_fare_delivery) : this.currentSettings.base_fare_delivery,
      price_per_km: patch.price_per_km !== undefined ? Number(patch.price_per_km) : this.currentSettings.price_per_km,
      price_per_minute: patch.price_per_minute !== undefined ? Number(patch.price_per_minute) : this.currentSettings.price_per_minute,
      is_delivery_active: patch.is_delivery_active !== undefined ? Boolean(patch.is_delivery_active) : this.currentSettings.is_delivery_active,
      is_ride_active: patch.is_ride_active !== undefined ? Boolean(patch.is_ride_active) : this.currentSettings.is_ride_active,
      updated_at: new Date().toISOString(),
    };

    this.currentSettings = updated;
    this.saveToStorage(updated);
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      try {
        await (supabase as any)
          .from("app_settings")
          .upsert({
            id: "global",
            daily_fee_car: updated.daily_fee_car,
            daily_fee_moto: updated.daily_fee_moto,
            base_fare_ride: updated.base_fare_ride,
            base_fare_delivery: updated.base_fare_delivery,
            price_per_km: updated.price_per_km,
            price_per_minute: updated.price_per_minute,
            is_delivery_active: updated.is_delivery_active,
            is_ride_active: updated.is_ride_active,
            pix_key: updated.pix_key,
            pix_receiver_name: updated.pix_receiver_name,
            pix_receiver_city: updated.pix_receiver_city,
            updated_at: updated.updated_at,
          });
      } catch (e) {
        console.warn("[AppSettingsService] Falha ao persistir no Supabase:", e);
      }
    }

    return this.currentSettings;
  }

  public subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSettings());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const settings = this.getSettings();
    this.listeners.forEach((l) => {
      try {
        l(settings);
      } catch (e) {
        console.error("[AppSettingsService] Erro no listener:", e);
      }
    });
  }

  /**
   * CÁLCULO DINÂMICO DE TARIFA DE CORRIDA (MOTO / CARRO)
   * Fórmula Base: base_fare + (km * price_per_km) + (minutos * price_per_minute)
   * - MOTO: tarifa econômica proporcional (~20% menor que o carro)
   * - CARRO: tarifa de referência completa
   */
  public calculateRideFare(
    distanciaKm: number,
    duracaoMin: number,
    categoria: "MOTO" | "CARRO" = "CARRO",
    customSettings?: AppSettings
  ): number {
    const s = customSettings || this.currentSettings;
    const km = Math.max(0.5, Number(distanciaKm) || 1);
    const min = Math.max(1, Number(duracaoMin) || 1);

    if (categoria === "MOTO") {
      const base = s.base_fare_ride * 0.75;
      const kmCost = km * (s.price_per_km * 0.78);
      const minCost = min * (s.price_per_minute * 0.75);
      const total = base + kmCost + minCost;
      return Math.round(total * 100) / 100;
    }

    // CARRO
    const total = s.base_fare_ride + km * s.price_per_km + min * s.price_per_minute;
    return Math.round(total * 100) / 100;
  }

  /**
   * CÁLCULO DINÂMICO DE ENTREGA ENCOMENDAS (MOTO / CARRO)
   * Fórmula Base: base_fare_delivery + (km * price_per_km) + (minutos * price_per_minute)
   */
  public calculateDeliveryFare(
    distanciaKm: number,
    duracaoMin: number,
    categoria: "MOTO" | "CARRO" = "MOTO",
    customSettings?: AppSettings
  ): number {
    const s = customSettings || this.currentSettings;
    const km = Math.max(0.5, Number(distanciaKm) || 1);
    const min = Math.max(1, Number(duracaoMin) || 1);

    if (categoria === "MOTO") {
      const total = s.base_fare_delivery + km * s.price_per_km + min * s.price_per_minute;
      return Math.round(total * 100) / 100;
    }

    // CARRO BAÚ / ENCOMENDAS MAIORES
    const total = (s.base_fare_delivery * 1.6) + km * (s.price_per_km * 1.35) + min * (s.price_per_minute * 1.2);
    return Math.round(total * 100) / 100;
  }
}

export const appSettingsService = new AppSettingsService();
