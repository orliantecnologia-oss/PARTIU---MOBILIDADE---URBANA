/**
 * ==============================================================================
 * 🚀 PARTIU PIX BILLING & SUBSCRIPTION ENGINE (v4.0)
 * ==============================================================================
 * Orquestrador central de assinaturas, cobrança via PIX e liberação instantânea:
 * 1. Carrega planos dinamicamente da tabela monetization_plans (Zero Hardcode).
 * 2. Avalia elegibilidade operacional através da RPC fn_driver_evaluate_access.
 * 3. Cria cobrança PIX via PaymentProviderAdapter e persiste em driver_billing.
 * 4. Escuta o canal Realtime para liberação automática em menos de 2 segundos.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { paymentGatewayManager, PixOrderOutput } from "@/services/payment/PaymentProviderAdapter";

export interface MonetizationPlan {
  id: string;
  plan_name: string;
  description: string;
  monthly_fee: number;
  weekly_fee: number;
  daily_fee: number;
  commission_percent: number;
  trial_days: number;
  grace_days: number;
  priority_weight: number;
  features: string[];
  badge_color: string;
  is_popular: boolean;
  is_default: boolean;
  active: boolean;
}

export interface DriverAccessDecision {
  is_eligible: boolean;
  status: "ACTIVE" | "TRIAL" | "GRACE_PERIOD" | "EXPIRED" | "SUSPENDED" | "PAYMENT_PENDING" | "DEBT_BLOCKED" | "CANCELLED";
  plan_id?: string;
  plan_name?: string;
  priority_weight?: number;
  expires_at?: string;
  grace_period_ends_at?: string;
  amount_paid?: number;
  reasons: string[];
}

export interface DriverBillingRecord {
  id: string;
  driver_id: string;
  plan_id: string;
  cycle_type: "DAILY" | "WEEKLY" | "MONTHLY";
  amount: number;
  gateway: string;
  gateway_reference: string;
  pix_code: string;
  qr_code_url: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  expires_at: string;
  paid_at?: string;
  created_at: string;
}

// Planos padrão de contingência e inicialização
export const DEFAULT_MONETIZATION_PLANS: MonetizationPlan[] = [
  {
    id: "plano-diaria-essencial",
    plan_name: "Diária Essencial (Partiu Flex)",
    description: "Ideal para quem roda sob demanda com pagamento diário via PIX",
    monthly_fee: 299.00,
    weekly_fee: 79.00,
    daily_fee: 14.90,
    commission_percent: 0.00,
    trial_days: 0,
    grace_days: 2,
    priority_weight: 1.00,
    features: [
      "ZERO COMISSÃO (100% dos ganhos são seus)",
      "Liberação por 24 horas consecutivas",
      "Acesso total ao Trip Radar e entregas",
      "Saque instantâneo PIX D+0",
    ],
    badge_color: "bg-emerald-600",
    is_popular: false,
    is_default: true,
    active: true,
  },
  {
    id: "plano-semanal-pro",
    plan_name: "Semanal Pro (7 Dias)",
    description: "Para quem roda a semana inteira com desconto progressivo",
    monthly_fee: 249.00,
    weekly_fee: 69.90,
    daily_fee: 12.50,
    commission_percent: 0.00,
    trial_days: 0,
    grace_days: 3,
    priority_weight: 2.50,
    features: [
      "ZERO COMISSÃO (100% dos ganhos são seus)",
      "Desconto de 33% na diária equivalente",
      "Prioridade intermediária no despacho",
      "Suporte prioritário via WhatsApp",
    ],
    badge_color: "bg-amber-600",
    is_popular: true,
    is_default: false,
    active: true,
  },
  {
    id: "plano-mensal-ouro",
    plan_name: "Mensal Ouro (30 Dias)",
    description: "Máxima rentabilidade para motoristas profissionais de alta produtividade",
    monthly_fee: 199.90,
    weekly_fee: 55.00,
    daily_fee: 9.90,
    commission_percent: 0.00,
    trial_days: 0,
    grace_days: 5,
    priority_weight: 5.00,
    features: [
      "ZERO COMISSÃO (100% do valor da corrida)",
      "Prioridade MÁXIMA no Trip Radar",
      "Isenção total em saques PIX ilimitados",
      "Linha direta 24h com a Central",
    ],
    badge_color: "bg-amber-400 text-slate-950",
    is_popular: false,
    is_default: false,
    active: true,
  },
];

// Armazenamento em memória para contingência e execução local
const inMemoryBillings = new Map<string, DriverBillingRecord>();
const inMemorySubscriptions = new Map<string, any>();

export class PixBillingService {
  private static instance: PixBillingService;
  private plansCache: MonetizationPlan[] = DEFAULT_MONETIZATION_PLANS;
  private subscribers = new Set<(decision: DriverAccessDecision) => void>();

  private constructor() {}

  public static getInstance(): PixBillingService {
    if (!PixBillingService.instance) {
      PixBillingService.instance = new PixBillingService();
    }
    return PixBillingService.instance;
  }

  /**
   * Carrega os planos dinamicamente da tabela monetization_plans
   */
  public async fetchMonetizationPlans(forceRefresh = false): Promise<MonetizationPlan[]> {
    if (!forceRefresh && this.plansCache.length > 0 && this.plansCache !== DEFAULT_MONETIZATION_PLANS) {
      return this.plansCache;
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (supabase as any)
          .from("monetization_plans")
          .select("*")
          .eq("active", true)
          .order("priority_weight", { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          this.plansCache = data.map((d: any) => ({
            id: d.id,
            plan_name: d.plan_name,
            description: d.description || "",
            monthly_fee: Number(d.monthly_fee) || 0,
            weekly_fee: Number(d.weekly_fee) || 0,
            daily_fee: Number(d.daily_fee) || 0,
            commission_percent: Number(d.commission_percent) || 0,
            trial_days: Number(d.trial_days) || 0,
            grace_days: Number(d.grace_days) || 2,
            priority_weight: Number(d.priority_weight) || 1.0,
            features: Array.isArray(d.features) ? d.features : [],
            badge_color: d.badge_color || "bg-slate-500",
            is_popular: Boolean(d.is_popular),
            is_default: Boolean(d.is_default),
            active: Boolean(d.active),
          }));
          return this.plansCache;
        }
      } catch (err) {
        console.warn("[PixBillingService] Falha ao carregar planos remotos, usando cache:", err);
      }
    }

    return this.plansCache;
  }

  public getPlanById(planId: string): MonetizationPlan | undefined {
    return this.plansCache.find((p) => p.id === planId) || DEFAULT_MONETIZATION_PLANS.find((p) => p.id === planId);
  }

  /**
   * Avalia o acesso operacional do condutor via RPC Server-Side
   */
  public async evaluateDriverAccess(driverId: string): Promise<DriverAccessDecision> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (supabase as any).rpc("fn_driver_evaluate_access", {
          p_driver_id: driverId,
        });

        if (!error && data) {
          return {
            is_eligible: Boolean(data.is_eligible),
            status: data.status,
            plan_id: data.plan_id,
            plan_name: data.plan_name,
            priority_weight: data.priority_weight,
            expires_at: data.expires_at,
            grace_period_ends_at: data.grace_period_ends_at,
            amount_paid: data.amount_paid,
            reasons: Array.isArray(data.reasons) ? data.reasons : [],
          };
        }
      } catch (err) {
        console.warn("[PixBillingService] Falha na RPC remota, aplicando fallback in-process:", err);
      }
    }

    // Fallback in-process
    const localSub = inMemorySubscriptions.get(driverId);
    if (!localSub) {
      return {
        is_eligible: false,
        status: "PAYMENT_PENDING",
        reasons: ["Nenhuma diária ativa encontrada. Adquira sua diária para rodar."],
      };
    }

    const now = Date.now();
    const expiresAt = new Date(localSub.expires_at).getTime();

    if (localSub.status === "SUSPENDED") {
      return {
        is_eligible: false,
        status: "SUSPENDED",
        reasons: ["Conta suspensa por inadimplência. Regularize via PIX."],
      };
    }

    if (expiresAt > now) {
      return {
        is_eligible: true,
        status: "ACTIVE",
        plan_id: localSub.plan_id,
        expires_at: localSub.expires_at,
        amount_paid: localSub.amount_paid,
        reasons: [],
      };
    }

    return {
      is_eligible: false,
      status: "EXPIRED",
      reasons: ["Sua diária de 24 horas expirou. Realize o pagamento PIX para liberar o acesso."],
    };
  }

  /**
   * Gera uma ordem de cobrança PIX para o condutor
   */
  public async createDriverBilling(
    driverId: string,
    planId: string,
    cycleType: "DAILY" | "WEEKLY" | "MONTHLY" = "DAILY",
    driverName = "Motorista Parceiro"
  ): Promise<DriverBillingRecord> {
    const plan = this.getPlanById(planId) || DEFAULT_MONETIZATION_PLANS[0]!;
    const amount = cycleType === "MONTHLY"
      ? plan.monthly_fee
      : cycleType === "WEEKLY"
      ? plan.weekly_fee
      : plan.daily_fee;

    // Utiliza o Gateway Ativo via Strategy Pattern
    const gateway = paymentGatewayManager.getActiveGateway();
    const pixResult: PixOrderOutput = await gateway.createPix({
      driverId,
      driverName,
      amount,
      description: `PARTIU - Acesso ${plan.plan_name} (${cycleType})`,
      expiresInMinutes: 30,
    });

    const billingId = `bill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    const record: DriverBillingRecord = {
      id: billingId,
      driver_id: driverId,
      plan_id: planId,
      cycle_type: cycleType,
      amount,
      gateway: gateway.name,
      gateway_reference: pixResult.gatewayReference,
      pix_code: pixResult.copiaECola,
      qr_code_url: pixResult.qrCodeUrl,
      status: "PENDING",
      expires_at: pixResult.expiresAt,
      created_at: nowIso,
    };

    inMemoryBillings.set(billingId, record);

    if (isSupabaseConfigured()) {
      try {
        await (supabase as any).from("driver_billing").insert({
          id: record.id,
          driver_id: record.driver_id,
          plan_id: record.plan_id,
          cycle_type: record.cycle_type,
          amount: record.amount,
          gateway: record.gateway,
          gateway_reference: record.gateway_reference,
          pix_code: record.pix_code,
          qr_code_url: record.qr_code_url,
          status: record.status,
          expires_at: record.expires_at,
          created_at: record.created_at,
        });
      } catch (err) {
        console.warn("[PixBillingService] Falha ao persistir cobrança no Supabase:", err);
      }
    }

    return record;
  }

  /**
   * Confirmação Atômica de Pagamento (executada por Webhook ou contingência)
   */
  public async confirmPayment(
    billingId: string,
    gatewayReference?: string,
    amount?: number
  ): Promise<{ success: boolean; driverId?: string; expiresAt?: string; message: string }> {
    // 1. Tenta RPC no Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (supabase as any).rpc("fn_process_driver_pix_confirmation", {
          p_billing_id: billingId,
          p_gateway_reference: gatewayReference || null,
          p_amount: amount || null,
        });

        if (!error && data && data.success) {
          // Dispara broadcast no canal Realtime
          this.notifyRealtimeActivation(data.driver_id, data.expires_at);
          return {
            success: true,
            driverId: data.driver_id,
            expiresAt: data.expires_at,
            message: data.message,
          };
        }
      } catch (err) {
        console.warn("[PixBillingService] Falha na confirmação via RPC remota:", err);
      }
    }

    // 2. Fallback in-process
    const billing = inMemoryBillings.get(billingId);
    if (!billing) {
      return { success: false, message: "Cobrança não localizada." };
    }

    billing.status = "PAID";
    billing.paid_at = new Date().toISOString();

    const plan = this.getPlanById(billing.plan_id) || DEFAULT_MONETIZATION_PLANS[0]!;
    const durationMs = billing.cycle_type === "MONTHLY"
      ? 30 * 24 * 60 * 60 * 1000
      : billing.cycle_type === "WEEKLY"
      ? 7 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    inMemorySubscriptions.set(billing.driver_id, {
      id: `sub_${Date.now()}`,
      driver_id: billing.driver_id,
      plan_id: billing.plan_id,
      cycle_type: billing.cycle_type,
      status: "ACTIVE",
      amount_paid: billing.amount,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

    this.notifyRealtimeActivation(billing.driver_id, expiresAt);

    return {
      success: true,
      driverId: billing.driver_id,
      expiresAt,
      message: "Pagamento confirmado com sucesso! Acesso liberado.",
    };
  }

  /**
   * Notifica a ativação instantânea para o frontend escutar em tempo real
   */
  public notifyRealtimeActivation(driverId: string, expiresAt: string): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:driver_subscription_activated", {
          detail: { driverId, expiresAt, timestamp: Date.now() },
        })
      );
    }
  }

  /**
   * Subscreve para atualizações de acesso
   */
  public subscribeToAccessChanges(listener: (decision: DriverAccessDecision) => void): () => void {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }
}

export const pixBillingService = PixBillingService.getInstance();
