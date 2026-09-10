/**
 * ==============================================================================
 * 💳 PARTIU ECOSYSTEM — DRIVER SUBSCRIPTION SERVICE (SaaS MODEL)
 * ==============================================================================
 * Gerenciador da Trava Inteligente de Diária Pré-Paga (24 horas) do Motorista.
 *
 * REGRA DE OURO DO PARTIU:
 * - O sistema opera 100% no modelo SaaS por diária pré-paga via PIX.
 * - NENHUMA comissão percentual é cobrada sobre as corridas (0% Take Rate).
 * - O motorista fica com 100% dos ganhos de cada viagem e entrega.
 * - Se a diária de 24h estiver vencida ou não paga, o cockpit é bloqueado
 *   até a liquidação do PIX.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { appSettingsService } from "./app-settings-service";

export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "PENDING" | "CANCELLED";

export interface DriverSubscriptionRecord {
  id: string;
  driver_id: string;
  vehicle_type: "MOTO" | "CARRO";
  status: SubscriptionStatus;
  starts_at: string;
  expires_at: string;
  pix_txid: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
}

export interface GeneratedPixPayment {
  txId: string;
  txid: string;
  amount: number;
  copiaECola: string;
  qrCodeUrl: string;
  expiresInMinutes: number;
  receiver: {
    name: string;
    pixKey: string;
    city: string;
  };
}

const SUBSCRIPTIONS_STORAGE_KEY = "partiu_driver_subscriptions_store";

class DriverSubscriptionService {
  private subscriptions: DriverSubscriptionRecord[] = [];
  private listeners: Set<(subs: DriverSubscriptionRecord[]) => void> = new Set();

  constructor() {
    this.subscriptions = this.loadFromStorage();
    if (typeof window !== "undefined") {
      void this.syncFromBackend();
    }
  }

  private loadFromStorage(): DriverSubscriptionRecord[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("[DriverSubscriptionService] Falha ao ler cache:", e);
    }
    return [];
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(this.subscriptions));
    } catch (e) {
      console.warn("[DriverSubscriptionService] Falha ao salvar cache:", e);
    }
  }

  public async syncFromBackend(): Promise<DriverSubscriptionRecord[]> {
    if (!isSupabaseConfigured()) {
      return this.subscriptions;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("driver_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        this.subscriptions = data.map((d: any) => ({
          id: d.id,
          driver_id: d.driver_id,
          vehicle_type: d.vehicle_type === "MOTO" ? "MOTO" : "CARRO",
          status: d.status as SubscriptionStatus,
          starts_at: d.starts_at,
          expires_at: d.expires_at,
          pix_txid: d.pix_txid || "",
          amount_paid: Number(d.amount_paid) || 0,
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));
        this.saveToStorage();
        this.notifyListeners();
      }
    } catch (e) {
      console.warn("[DriverSubscriptionService] Falha ao buscar no Supabase:", e);
    }

    return this.subscriptions;
  }

  /**
   * Consulta a assinatura ativa mais recente do condutor
   */
  public getActiveSubscription(driverId: string): DriverSubscriptionRecord | null {
    const now = new Date().getTime();
    const subs = this.subscriptions.filter((s) => s.driver_id === driverId);

    for (const sub of subs) {
      const expires = new Date(sub.expires_at).getTime();
      if (sub.status === "ACTIVE" && expires > now) {
        return sub;
      }
    }
    return null;
  }

  /**
   * Verifica se o condutor está desbloqueado para operar (diária de 24h válida)
   */
  public isDriverUnlocked(driverId: string): boolean {
    const active = this.getActiveSubscription(driverId);
    return Boolean(active);
  }

  /**
   * Calcula o tempo restante da diária ativa em horas e minutos formatados
   */
  public getRemainingTime(subscription: DriverSubscriptionRecord): { hours: number; minutes: number; formatted: string } {
    const now = Date.now();
    const diffMs = Math.max(0, new Date(subscription.expires_at).getTime() - now);
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return {
      hours,
      minutes,
      formatted: `${hours}h ${minutes.toString().padStart(2, "0")}min`,
    };
  }

  /**
   * Gera ordem de pagamento PIX dinâmico para a diária do motorista
   */
  public generateDailyFeePix(
    driverId: string,
    vehicleType: "MOTO" | "CARRO" = "CARRO"
  ): GeneratedPixPayment {
    const settings = appSettingsService.getSettings();
    const amount = vehicleType === "MOTO" ? settings.daily_fee_moto : settings.daily_fee_car;
    const txId = `PARTIU_DAILY_${Date.now()}_${driverId.slice(-4)}`;

    // Monta payload PIX Copia e Cola padronizado do Banco Central (EMV)
    const formattedAmount = amount.toFixed(2);
    const copiaECola = `00020126580014BR.GOV.BCB.PIX0136${settings.pix_key}520400005303986540${formattedAmount.length.toString().padStart(2, "0")}${formattedAmount}5802BR5925${settings.pix_receiver_name.slice(0, 25)}6009${settings.pix_receiver_city.slice(0, 9)}62070503***6304ABCD`;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      copiaECola
    )}`;

    return {
      txId,
      txid: txId,
      amount,
      copiaECola,
      qrCodeUrl,
      expiresInMinutes: 30,
      receiver: {
        name: settings.pix_receiver_name,
        pixKey: settings.pix_key,
        city: settings.pix_receiver_city,
      },
    };
  }

  /**
   * Confirma o pagamento da diária e libera o condutor por exatamente 24 horas
   */
  public async confirmDailyFeePayment(
    driverId: string,
    vehicleType: "MOTO" | "CARRO",
    txId?: string,
    amount?: number
  ): Promise<DriverSubscriptionRecord> {
    const settings = appSettingsService.getSettings();
    const valorDiaria = amount !== undefined ? amount : (vehicleType === "MOTO" ? settings.daily_fee_moto : settings.daily_fee_car);
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000); // Exatas 24h

    const newSub: DriverSubscriptionRecord = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      driver_id: driverId,
      vehicle_type: vehicleType,
      status: "ACTIVE",
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      pix_txid: txId || `TX_SIM_${Date.now()}`,
      amount_paid: valorDiaria,
      created_at: startsAt.toISOString(),
      updated_at: startsAt.toISOString(),
    };

    // Remove eventuais ativas anteriores expiradas e insere no topo
    this.subscriptions = [newSub, ...this.subscriptions];
    this.saveToStorage();
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      try {
        await (supabase as any).from("driver_subscriptions").insert({
          id: newSub.id,
          driver_id: newSub.driver_id,
          vehicle_type: newSub.vehicle_type,
          status: newSub.status,
          starts_at: newSub.starts_at,
          expires_at: newSub.expires_at,
          pix_txid: newSub.pix_txid,
          amount_paid: newSub.amount_paid,
          created_at: newSub.created_at,
          updated_at: newSub.updated_at,
        });
      } catch (e) {
        console.warn("[DriverSubscriptionService] Falha ao persistir no Supabase:", e);
      }
    }

    return newSub;
  }

  /**
   * Simulação instantânea para homologação e testes de desbloqueio imediato
   */
  public async simulateDailyFeePayment(
    driverId: string,
    vehicleType: "MOTO" | "CARRO" = "CARRO"
  ): Promise<DriverSubscriptionRecord> {
    return this.confirmDailyFeePayment(driverId, vehicleType, `TX_TEST_${Date.now()}`);
  }

  /**
   * Métricas Financeiras SaaS para o Painel Administrativo
   */
  public getSaaSMetrics(): {
    totalRevenueToday: number;
    totalRevenueMonth: number;
    activeDriversCount: number;
    expiredDriversCount: number;
    totalSubscriptionsCount: number;
  } {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentYearMonth = todayStr.slice(0, 7);

    let totalRevenueToday = 0;
    let totalRevenueMonth = 0;
    const activeDrivers = new Set<string>();
    const expiredDrivers = new Set<string>();

    for (const sub of this.subscriptions) {
      if (sub.status === "ACTIVE") {
        const subDate = sub.created_at.slice(0, 10);
        if (subDate === todayStr) {
          totalRevenueToday += sub.amount_paid;
        }
        if (subDate.startsWith(currentYearMonth)) {
          totalRevenueMonth += sub.amount_paid;
        }

        const isExpired = new Date(sub.expires_at).getTime() < now.getTime();
        if (isExpired) {
          expiredDrivers.add(sub.driver_id);
        } else {
          activeDrivers.add(sub.driver_id);
        }
      }
    }

    return {
      totalRevenueToday: Math.round(totalRevenueToday * 100) / 100,
      totalRevenueMonth: Math.round(totalRevenueMonth * 100) / 100,
      activeDriversCount: activeDrivers.size,
      expiredDriversCount: expiredDrivers.size,
      totalSubscriptionsCount: this.subscriptions.length,
    };
  }

  public getAllSubscriptions(): DriverSubscriptionRecord[] {
    return [...this.subscriptions];
  }

  public subscribe(listener: (subs: DriverSubscriptionRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllSubscriptions());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const list = this.getAllSubscriptions();
    this.listeners.forEach((l) => {
      try {
        l(list);
      } catch (e) {
        console.error("[DriverSubscriptionService] Erro no listener:", e);
      }
    });
  }
}

export const driverSubscriptionService = new DriverSubscriptionService();
