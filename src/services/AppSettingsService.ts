/**
 * ==============================================================================
 * ⚙️ PARTIU REVENUE OS — APP SETTINGS SERVICE
 * ==============================================================================
 * Centraliza as configurações globais da operação urbana consumindo a tabela
 * public.app_settings no Supabase, com cache local inteligente e fallback.
 * Permite alteração dinâmica de contatos de suporte 24h e telefone de emergência
 * pelo painel admin sem necessidade de novo deploy ou atualização nas lojas.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { silentCatchWarn } from "@/lib/structured-logger";


export interface GlobalAppSettings {
  id: string;
  whatsappSupport: string;
  phoneEmergency: string;
  supportHours: string;
  appVersion: string;
  dailyFeeCar: number;
  dailyFeeMoto: number;
  baseFareRide: number;
  baseFareDelivery: number;
  isRideActive: boolean;
  isDeliveryActive: boolean;
  pixKey: string;
  pixReceiverName: string;
  pixReceiverCity: string;
}

const STORAGE_SETTINGS_KEY = "partiu_global_app_settings_v1";

const DEFAULT_SETTINGS: GlobalAppSettings = {
  id: "global",
  whatsappSupport: "(22) 99605-1620",
  phoneEmergency: "190",
  supportHours: "24h • Todos os dias",
  appVersion: "1.0.0",
  dailyFeeCar: 10.0,
  dailyFeeMoto: 5.0,
  baseFareRide: 6.0,
  baseFareDelivery: 5.0,
  isRideActive: true,
  isDeliveryActive: true,
  pixKey: "financeiro@partiumobilidade.com.br",
  pixReceiverName: "PARTIU MOBILIDADE URBANA LTDA",
  pixReceiverCity: "ITAPERUNA",
};

export class AppSettingsService {
  private static instance: AppSettingsService;
  private cachedSettings: GlobalAppSettings | null = null;
  private listeners: Array<(settings: GlobalAppSettings) => void> = [];

  private constructor() {
    this.initRealtimeSubscription();
  }

  public static getInstance(): AppSettingsService {
    if (!AppSettingsService.instance) {
      AppSettingsService.instance = new AppSettingsService();
    }
    return AppSettingsService.instance;
  }

  /**
   * Obtém as configurações com cache síncrono imediato e revalidação assíncrona
   */
  public getSettingsSync(): GlobalAppSettings {
    if (this.cachedSettings) return this.cachedSettings;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_SETTINGS_KEY);
        if (stored) {
          this.cachedSettings = JSON.parse(stored);
          return this.cachedSettings!;
        }
      } catch (err) { silentCatchWarn("AppSettingsService", err); }
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Busca as configurações ativas na tabela app_settings
   */
  public async fetchSettings(): Promise<GlobalAppSettings> {
    if (!isSupabaseConfigured()) {
      return this.getSettingsSync();
    }

    try {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("*")
        .eq("id", "global")
        .maybeSingle();

      if (error || !data) {
        return this.getSettingsSync();
      }

      const settings: GlobalAppSettings = {
        id: data.id || "global",
        whatsappSupport: data.whatsapp_support || "(22) 99605-1620",
        phoneEmergency: data.phone_emergency || "190",
        supportHours: data.support_hours || "24h • Todos os dias",
        appVersion: data.app_version || "1.0.0",
        dailyFeeCar: Number(data.daily_fee_car) || 10.0,
        dailyFeeMoto: Number(data.daily_fee_moto) || 5.0,
        baseFareRide: Number(data.base_fare_ride) || 6.0,
        baseFareDelivery: Number(data.base_fare_delivery) || 5.0,
        isRideActive: data.is_ride_active !== false,
        isDeliveryActive: data.is_delivery_active !== false,
        pixKey: data.pix_key || "financeiro@partiumobilidade.com.br",
        pixReceiverName: data.pix_receiver_name || "PARTIU MOBILIDADE URBANA LTDA",
        pixReceiverCity: data.pix_receiver_city || "ITAPERUNA",
      };

      this.cachedSettings = settings;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
      }
      this.notifyListeners(settings);
      return settings;
    } catch {
      return this.getSettingsSync();
    }
  }

  /**
   * Registra listener para atualizações reativas
   */
  public subscribe(listener: (settings: GlobalAppSettings) => void): () => void {
    this.listeners.push(listener);
    listener(this.getSettingsSync());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(settings: GlobalAppSettings): void {
    for (const listener of this.listeners) {
      try {
        listener(settings);
      } catch (err) { silentCatchWarn("AppSettingsService", err); }
    }
  }

  /**
   * Canal Realtime do Supabase para refletir mudanças feitas no Admin instantaneamente
   */
  private initRealtimeSubscription(): void {
    if (!isSupabaseConfigured() || typeof window === "undefined") return;

    try {
      supabase
        .channel("public:app_settings")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "app_settings" },
          () => {
            void this.fetchSettings();
          }
        )
        .subscribe();
    } catch (err) { silentCatchWarn("AppSettingsService", err); }
  }
}

export const appSettingsService = AppSettingsService.getInstance();
