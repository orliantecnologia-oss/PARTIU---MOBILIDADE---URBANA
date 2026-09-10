/**
 * ==============================================================================
 * 📜 PARTIU REVENUE OS — SUBSCRIPTION & PLAN GOVERNANCE ENGINE (v1.0)
 * ==============================================================================
 * Gestão do Ciclo de Vida de Assinaturas e Catálogo de Planos dos Motoristas:
 * - Planos Padrão: Livre (R$ 0/mês / 7%), Bronze (R$ 19,90/mês / 5%),
 *   Prata (R$ 49,90/mês / 3%) e Ouro (R$ 99,90/mês / 1.5%)
 * - 100% configurável pelo painel administrativo (Criar, Editar, Duplicar, Desativar)
 * - Máquina de Estados: ACTIVE | PENDING | GRACE_PERIOD | SUSPENDED | REACTIVATION_REQUIRED
 * ==============================================================================
 */

import { revenueNotifications } from "./revenue-notifications";
import { silentCatchWarn } from "@/lib/structured-logger";


export type SubscriptionStatus =
  | "ACTIVE"
  | "PENDING"
  | "GRACE_PERIOD"
  | "SUSPENDED"
  | "REACTIVATION_REQUIRED";

export type BillingCycle = "DAILY" | "WEEKLY" | "MONTHLY";

export interface DriverDebt {
  id: string;
  driverId: string;
  amountBrl: number;
  amountCents: number;
  reason: string;
  dueDate: number;
  status: "OPEN" | "SETTLED" | "FORGIVEN";
  createdAt: number;
  settledAt?: number | undefined;
}

export interface DriverPlan {
  id: string;
  name: string;
  description: string;
  monthlyFeeBrl: number;
  monthlyFeeCents: number;
  dailyFeeBrl?: number | undefined;
  weeklyFeeBrl?: number | undefined;
  billingCycle?: BillingCycle | undefined;
  trialDays?: number | undefined;
  commissionPercent: number; // Oficial: 5.0% (FREE), 3.0% (Bronze), 1.0% (Prata), 0.0% (Ouro)
  dispatchWeightPercent: number; // Peso balanceado no despacho (FREE 1.00, Bronze 1.15, Prata 1.30, Ouro 1.50)
  goldThresholdBrl?: number | undefined; // Teto de isenção mensal (Padrão: R$ 8.000)
  postThresholdCommissionPercent?: number | undefined; // Taxa mínima pós-teto (Padrão: 0.5%)
  features: string[];
  badgeColor: string;
  active: boolean;
  isPopular?: boolean | undefined;
  isDefault?: boolean | undefined;
  createdAt: number;
  updatedAt: number;
}

export interface DriverSubscription {
  id: string;
  driverId: string;
  planId: string;
  status: SubscriptionStatus;
  monthlyFeeBrl: number;
  monthlyFeeCents: number;
  billingCycle?: BillingCycle | undefined;
  currentCycleStart: number;
  currentCycleEnd: number;
  nextBillingDate: number;
  gracePeriodDays: number;
  gracePeriodEndsAt?: number | undefined;
  trialDays?: number | undefined;
  trialEndsAt?: number | undefined;
  accumulatedDebtBrl: number;
  accumulatedDebtCents: number;
  autoRenew: boolean;
  preferredPaymentMethod: "WALLET" | "BALANCE" | "PIX" | "CARD";
  suspensionReason?: string | undefined;
  updatedAt: number;
}

export const INITIAL_DRIVER_PLANS: DriverPlan[] = [
  {
    id: "plano-livre",
    name: "Livre (FREE)",
    description: "Cadastro gratuito, recebe corridas normalmente com taxa de 5%",
    monthlyFeeBrl: 0,
    monthlyFeeCents: 0,
    dailyFeeBrl: 0,
    weeklyFeeBrl: 0,
    billingCycle: "MONTHLY",
    commissionPercent: 5.0,
    dispatchWeightPercent: 1.0,
    features: [
      "Taxa padrão de 5.0% por corrida",
      "Cadastro 100% gratuito sem mensalidade",
      "Repasse instantâneo via PIX D+0",
      "Acesso completo ao Trip Radar",
    ],
    badgeColor: "bg-slate-500",
    active: true,
    isDefault: true,
    createdAt: 1772928000000,
    updatedAt: 1772928000000,
  },
  {
    id: "plano-bronze",
    name: "Bronze",
    description: "Taxa reduzida de 3% e prioridade leve no Trip Radar",
    monthlyFeeBrl: 19.90,
    monthlyFeeCents: 1990,
    dailyFeeBrl: 1.50,
    weeklyFeeBrl: 6.90,
    billingCycle: "MONTHLY",
    commissionPercent: 3.0,
    dispatchWeightPercent: 1.15,
    features: [
      "Taxa reduzida de apenas 3.0% por corrida",
      "Ciclos diário (R$ 1,50), semanal (R$ 6,90) ou mensal (R$ 19,90)",
      "Prioridade equilibrada no Trip Radar (1.15x)",
      "Repasse instantâneo via PIX D+0",
      "Descontos em postos credenciados",
    ],
    badgeColor: "bg-amber-700",
    active: true,
    isPopular: true,
    createdAt: 1772928000000,
    updatedAt: 1772928000000,
  },
  {
    id: "plano-prata",
    name: "Prata",
    description: "Taxa mínima de 1% e prioridade média no Trip Radar",
    monthlyFeeBrl: 49.90,
    monthlyFeeCents: 4990,
    dailyFeeBrl: 3.50,
    weeklyFeeBrl: 16.90,
    billingCycle: "MONTHLY",
    commissionPercent: 1.0,
    dispatchWeightPercent: 1.30,
    features: [
      "Taxa mínima recorde de apenas 1.0% por corrida",
      "Ciclos diário (R$ 3,50), semanal (R$ 16,90) ou mensal (R$ 49,90)",
      "Prioridade equilibrada de distribuição no Trip Radar (1.30x)",
      "Atendimento VIP prioritário no WhatsApp",
      "Descontos em oficinas e troca de óleo",
    ],
    badgeColor: "bg-slate-300 text-slate-900",
    active: true,
    createdAt: 1772928000000,
    updatedAt: 1772928000000,
  },
  {
    id: "plano-ouro",
    name: "Ouro",
    description: "Zero comissão (0%) até R$ 8.000/mês, 100% de repasse ao condutor e prioridade máxima justa",
    monthlyFeeBrl: 99.90,
    monthlyFeeCents: 9990,
    dailyFeeBrl: 6.90,
    weeklyFeeBrl: 34.90,
    billingCycle: "MONTHLY",
    commissionPercent: 0.0,
    dispatchWeightPercent: 1.50,
    goldThresholdBrl: 8000.0,
    postThresholdCommissionPercent: 0.5,
    features: [
      "ZERO COMISSÃO (0.0% até R$ 8.000/mês)",
      "Apenas 0.5% sobre faturamento excedente pós-teto",
      "Prioridade equilibrada de desempate no Trip Radar (1.50x)",
      "Linha direta 24h com a Central Operacional",
      "Isenção total de taxas em saques PIX",
    ],
    badgeColor: "bg-amber-400 text-slate-950",
    active: true,
    createdAt: 1772928000000,
    updatedAt: 1772928000000,
  },
];

const STORAGE_PLANS_KEY = "partiu_driver_plans_v1";
const STORAGE_SUBSCRIPTIONS_KEY = "partiu_driver_subscriptions_v1";

export class SubscriptionEngine {
  private static instance: SubscriptionEngine;
  private plans: Map<string, DriverPlan> = new Map();
  private subscriptions: Map<string, DriverSubscription> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): SubscriptionEngine {
    if (!SubscriptionEngine.instance) {
      SubscriptionEngine.instance = new SubscriptionEngine();
    }
    return SubscriptionEngine.instance;
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") {
      INITIAL_DRIVER_PLANS.forEach((p) => this.plans.set(p.id, p));
      return;
    }

    try {
      const rawPlans = localStorage.getItem(STORAGE_PLANS_KEY);
      if (rawPlans) {
        const parsed = JSON.parse(rawPlans) as DriverPlan[];
        parsed.forEach((p) => this.plans.set(p.id, p));
      } else {
        INITIAL_DRIVER_PLANS.forEach((p) => this.plans.set(p.id, p));
        this.savePlans();
      }

      const rawSubs = localStorage.getItem(STORAGE_SUBSCRIPTIONS_KEY);
      if (rawSubs) {
        const parsed = JSON.parse(rawSubs) as DriverSubscription[];
        parsed.forEach((s) => this.subscriptions.set(s.driverId, s));
      }
    } catch {
      INITIAL_DRIVER_PLANS.forEach((p) => this.plans.set(p.id, p));
    }
  }

  private savePlans(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_PLANS_KEY, JSON.stringify(Array.from(this.plans.values())));
    } catch (err) { silentCatchWarn("subscription-engine", err); }
  }

  private saveSubscriptions(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_SUBSCRIPTIONS_KEY,
        JSON.stringify(Array.from(this.subscriptions.values()))
      );
    } catch (err) { silentCatchWarn("subscription-engine", err); }
  }

  // ============================================================================
  // GESTÃO DE PLANOS (ADMIN CRUD)
  // ============================================================================

  public getAllPlans(includeInactive = false): DriverPlan[] {
    const list = Array.from(this.plans.values());
    return includeInactive ? list : list.filter((p) => p.active);
  }

  public getPlanById(planId: string): DriverPlan | undefined {
    return this.plans.get(planId);
  }

  public createPlan(params: {
    name: string;
    description: string;
    monthlyFeeBrl: number;
    dailyFeeBrl?: number;
    weeklyFeeBrl?: number;
    billingCycle?: "DAILY" | "WEEKLY" | "MONTHLY";
    commissionPercent: number;
    features?: string[];
    badgeColor?: string;
  }): DriverPlan {
    const id = `plano-${params.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`;
    const newPlan: DriverPlan = {
      id,
      name: params.name,
      description: params.description,
      monthlyFeeBrl: params.monthlyFeeBrl,
      monthlyFeeCents: Math.round(params.monthlyFeeBrl * 100),
      dailyFeeBrl: params.dailyFeeBrl ?? (params.monthlyFeeBrl > 0 ? Number((params.monthlyFeeBrl / 20).toFixed(2)) : 0),
      weeklyFeeBrl: params.weeklyFeeBrl ?? (params.monthlyFeeBrl > 0 ? Number((params.monthlyFeeBrl / 3.5).toFixed(2)) : 0),
      billingCycle: params.billingCycle ?? "MONTHLY",
      commissionPercent: params.commissionPercent,
      dispatchWeightPercent: params.commissionPercent === 0 ? 1.50 : Number((Math.min(1.50, Math.max(1.00, 1.00 + (5.0 - params.commissionPercent) * 0.10))).toFixed(2)),
      features: params.features || ["Taxa diferenciada", "Repasse PIX D+0"],
      badgeColor: params.badgeColor || "bg-indigo-500",
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.plans.set(id, newPlan);
    this.savePlans();
    return newPlan;
  }

  public updatePlan(planId: string, updates: Partial<DriverPlan>): DriverPlan {
    const current = this.plans.get(planId);
    if (!current) throw new Error(`Plano não encontrado: ${planId}`);

    const updated: DriverPlan = {
      ...current,
      ...updates,
      monthlyFeeCents:
        updates.monthlyFeeBrl !== undefined
          ? Math.round(updates.monthlyFeeBrl * 100)
          : current.monthlyFeeCents,
      updatedAt: Date.now(),
    };

    this.plans.set(planId, updated);
    this.savePlans();
    return updated;
  }

  public duplicatePlan(planId: string): DriverPlan {
    const original = this.plans.get(planId);
    if (!original) throw new Error(`Plano não encontrado: ${planId}`);

    return this.createPlan({
      name: `${original.name} (Cópia)`,
      description: original.description,
      monthlyFeeBrl: original.monthlyFeeBrl,
      commissionPercent: original.commissionPercent,
      features: [...original.features],
      badgeColor: original.badgeColor,
    });
  }

  public togglePlanStatus(planId: string): DriverPlan {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plano não encontrado: ${planId}`);
    return this.updatePlan(planId, { active: !plan.active });
  }

  // ============================================================================
  // GESTÃO DE ASSINATURAS DO CONDUTOR
  // ============================================================================

  public getDriverSubscription(driverId: string = "mot-001"): DriverSubscription {
    const existing = this.subscriptions.get(driverId);
    if (existing) {
      return this.evaluateSubscriptionStatus(existing);
    }

    // Cria assinatura padrão no Plano Bronze para condutores novos
    const defaultPlan: DriverPlan =
      this.plans.get("plano-bronze") ||
      Array.from(this.plans.values())[0] ||
      INITIAL_DRIVER_PLANS[1]!;
    const now = Date.now();
    const cycleDays = 30;
    const cycleEnd = now + cycleDays * 24 * 60 * 60 * 1000;

    const initialSub: DriverSubscription = {
      id: `SUB-${driverId}-${now}`,
      driverId,
      planId: defaultPlan.id,
      status: "ACTIVE",
      monthlyFeeBrl: defaultPlan.monthlyFeeBrl,
      monthlyFeeCents: defaultPlan.monthlyFeeCents,
      currentCycleStart: now,
      currentCycleEnd: cycleEnd,
      nextBillingDate: cycleEnd,
      gracePeriodDays: 3,
      accumulatedDebtBrl: 0,
      accumulatedDebtCents: 0,
      autoRenew: true,
      preferredPaymentMethod: "BALANCE",
      updatedAt: now,
    };

    this.subscriptions.set(driverId, initialSub);
    this.saveSubscriptions();
    return initialSub;
  }

  public changeDriverPlan(driverId: string, newPlanId: string): DriverSubscription {
    const targetPlan = this.plans.get(newPlanId);
    if (!targetPlan) throw new Error(`Plano de destino inválido: ${newPlanId}`);

    const sub = this.getDriverSubscription(driverId);
    const now = Date.now();

    const updated: DriverSubscription = {
      ...sub,
      planId: targetPlan.id,
      monthlyFeeBrl: targetPlan.monthlyFeeBrl,
      monthlyFeeCents: targetPlan.monthlyFeeCents,
      updatedAt: now,
    };

    this.subscriptions.set(driverId, updated);
    this.saveSubscriptions();
    return updated;
  }

  public upgradePlan(driverId: string, targetPlanId: string): DriverSubscription {
    const currentSub = this.getDriverSubscription(driverId);
    const currentPlan = this.getPlanById(currentSub.planId);
    const targetPlan = this.getPlanById(targetPlanId);
    if (!targetPlan) throw new Error(`Plano de upgrade inválido: ${targetPlanId}`);
    if (currentPlan && targetPlan.monthlyFeeCents < currentPlan.monthlyFeeCents) {
      // Inversão: valor menor é downgrade
      return this.downgradePlan(driverId, targetPlanId);
    }
    return this.changeDriverPlan(driverId, targetPlanId);
  }

  public downgradePlan(driverId: string, targetPlanId: string): DriverSubscription {
    const targetPlan = this.getPlanById(targetPlanId);
    if (!targetPlan) throw new Error(`Plano de downgrade inválido: ${targetPlanId}`);
    return this.changeDriverPlan(driverId, targetPlanId);
  }

  public startTrialPeriod(driverId: string, planId: string, trialDays = 7): DriverSubscription {
    const targetPlan = this.getPlanById(planId);
    if (!targetPlan) throw new Error(`Plano de teste inválido: ${planId}`);
    const sub = this.getDriverSubscription(driverId);
    const now = Date.now();
    const trialEndsAt = now + trialDays * 86400000;

    const updated: DriverSubscription = {
      ...sub,
      planId: targetPlan.id,
      monthlyFeeBrl: targetPlan.monthlyFeeBrl,
      monthlyFeeCents: targetPlan.monthlyFeeCents,
      trialDays,
      trialEndsAt,
      status: "ACTIVE",
      updatedAt: now,
    };

    this.subscriptions.set(driverId, updated);
    this.saveSubscriptions();
    return updated;
  }

  public getDriverDebts(driverId: string): DriverDebt[] {
    const sub = this.getDriverSubscription(driverId);
    if (sub.accumulatedDebtCents <= 0) return [];

    return [
      {
        id: `DEBT-${driverId}-${sub.updatedAt}`,
        driverId,
        amountBrl: sub.accumulatedDebtBrl,
        amountCents: sub.accumulatedDebtCents,
        reason: sub.suspensionReason || "Débito acumulado de mensalidade/taxa de plataforma",
        dueDate: sub.nextBillingDate,
        status: "OPEN",
        createdAt: sub.updatedAt,
      },
    ];
  }

  public evaluateSubscriptionStatus(sub: DriverSubscription): DriverSubscription {
    const now = Date.now();

    // Se possui débitos acumulados e venceu o ciclo
    if (sub.accumulatedDebtCents > 0 && now > sub.nextBillingDate) {
      const graceEnd = sub.gracePeriodEndsAt || (sub.nextBillingDate + sub.gracePeriodDays * 86400000);
      if (now <= graceEnd) {
        if (sub.status !== "GRACE_PERIOD") {
          sub.status = "GRACE_PERIOD";
          sub.gracePeriodEndsAt = graceEnd;
          revenueNotifications.notifyPlanExpired({
            driverId: sub.driverId,
            planName: this.getPlanById(sub.planId)?.name,
            remainingDays: sub.gracePeriodDays,
          });
        }
      } else {
        if (sub.status !== "SUSPENDED" && sub.status !== "REACTIVATION_REQUIRED") {
          sub.status = "SUSPENDED";
          sub.suspensionReason = "Prazo de carência expirado com pendência financeira em aberto.";
          revenueNotifications.notifyBlockApplied({
            driverId: sub.driverId,
            planName: this.getPlanById(sub.planId)?.name,
            amountBrl: sub.accumulatedDebtBrl,
          });
        }
      }
      this.subscriptions.set(sub.driverId, sub);
      this.saveSubscriptions();
    }

    return sub;
  }

  public recordDebt(driverId: string, amountCents: number, reason: string): DriverSubscription {
    const sub = this.getDriverSubscription(driverId);
    sub.accumulatedDebtCents += amountCents;
    sub.accumulatedDebtBrl = sub.accumulatedDebtCents / 100;
    sub.updatedAt = Date.now();

    if (sub.accumulatedDebtCents > 0 && sub.status === "ACTIVE") {
      sub.status = "PENDING";
      revenueNotifications.notifyNegativeBalance({
        driverId,
        amountBrl: sub.accumulatedDebtBrl,
      });
    }

    this.subscriptions.set(driverId, sub);
    this.saveSubscriptions();
    return sub;
  }

  public clearDebt(driverId: string, paidCents: number): DriverSubscription {
    const sub = this.getDriverSubscription(driverId);
    const wasSuspended = sub.status === "SUSPENDED" || sub.status === "REACTIVATION_REQUIRED";
    sub.accumulatedDebtCents = Math.max(0, sub.accumulatedDebtCents - paidCents);
    sub.accumulatedDebtBrl = sub.accumulatedDebtCents / 100;

    if (sub.accumulatedDebtCents === 0) {
      sub.status = "ACTIVE";
      sub.gracePeriodEndsAt = undefined;
      sub.suspensionReason = undefined;
      if (wasSuspended) {
        revenueNotifications.notifyBlockRemoved({ driverId });
      }
    }

    sub.updatedAt = Date.now();
    this.subscriptions.set(driverId, sub);
    this.saveSubscriptions();
    return sub;
  }
}

export const subscriptionEngine = SubscriptionEngine.getInstance();
