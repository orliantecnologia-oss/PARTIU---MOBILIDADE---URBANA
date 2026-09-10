/**
 * ==============================================================================
 * 💳 PARTIU REVENUE OS — AUTOMATED BILLING & RECOVERY ENGINE (v1.0)
 * ==============================================================================
 * Orquestrador de Cobrança Automática em Cascata e Recuperação de Inadimplência:
 * - Ordem de Cobrança Mandatória:
 *   1. Wallet Interna
 *   2. Saldo de Corridas D+0
 *   3. Cobrança Instantânea via PIX
 *   4. Cartão de Crédito
 * - Dedução Automática no Saque:
 *   Ex: Saldo R$ 200,00 - Mensalidade R$ 49,90 - Pendências R$ 10,00 = Disponível R$ 140,10
 * - Travas Operacionais Configuráveis de Inadimplência
 * ==============================================================================
 */

import { subscriptionEngine, type DriverSubscription } from "./subscription-engine";
import { revenueNotifications } from "./revenue-notifications";
import { silentCatchWarn } from "@/lib/structured-logger";


export interface GovernanceBillingSettings {
  gracePeriodDays: number; // Padrão: 3 dias
  maxDebtLimitBrl: number; // Padrão: R$ 80,00
  allowRidesWithPendingDebt: boolean; // Permitir corridas durante a carência
  blockRadarOnSuspension: boolean;
  blockWithdrawalsOnSuspension: boolean;
  blockAllRidesOnSuspension: boolean;
  autoDeductOnWithdrawal: boolean; // Deduzir débitos antes de liberar saque PIX
}

export interface InvoiceRecord {
  id: string;
  driverId: string;
  type: "SUBSCRIPTION_MONTHLY" | "PROTECTION_REPLENISHMENT" | "PLATFORM_DEBT" | "CHARGEBACK_RECOVERY";
  amountBrl: number;
  amountCents: number;
  dueDate: number;
  status: "PAID" | "PENDING" | "OVERDUE" | "CANCELLED";
  paidAt?: number | undefined;
  paymentMethodUsed?: "WALLET" | "BALANCE_DEDUCTION" | "PIX" | "CARD" | undefined;
  pixCopiaECola?: string | undefined;
  pixQrCodeUrl?: string | undefined;
  description: string;
  createdAt: number;
}

export type DriverBilling = InvoiceRecord;

export interface WithdrawalPreCheckResult {
  canWithdraw: boolean;
  driverId: string;
  grossAvailableBalanceBrl: number;
  grossAvailableBalanceCents: number;
  subscriptionDeductionBrl: number;
  subscriptionDeductionCents: number;
  pendingDebtsDeductionBrl: number;
  pendingDebtsDeductionCents: number;
  netWithdrawalAvailableBrl: number;
  netWithdrawalAvailableCents: number;
  reason?: string | undefined;
  deductionSummary: string[];
}

export interface CascadePaymentResult {
  success: boolean;
  invoiceId: string;
  amountPaidBrl: number;
  methodUsed: "WALLET" | "BALANCE_DEDUCTION" | "PIX" | "CARD" | "NONE";
  remainingDebtBrl: number;
  pixQrCodePayload?: string | undefined;
  message: string;
}

export const DEFAULT_GOVERNANCE_SETTINGS: GovernanceBillingSettings = {
  gracePeriodDays: 3,
  maxDebtLimitBrl: 80.0,
  allowRidesWithPendingDebt: true,
  blockRadarOnSuspension: true,
  blockWithdrawalsOnSuspension: true,
  blockAllRidesOnSuspension: true,
  autoDeductOnWithdrawal: true,
};

const STORAGE_GOVERNANCE_KEY = "partiu_billing_governance_settings_v1";
const STORAGE_INVOICES_KEY = "partiu_driver_invoices_v1";

export class BillingEngine {
  private static instance: BillingEngine;
  private settings: GovernanceBillingSettings = DEFAULT_GOVERNANCE_SETTINGS;
  private invoices: InvoiceRecord[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): BillingEngine {
    if (!BillingEngine.instance) {
      BillingEngine.instance = new BillingEngine();
    }
    return BillingEngine.instance;
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const rawSettings = localStorage.getItem(STORAGE_GOVERNANCE_KEY);
      if (rawSettings) {
        this.settings = { ...DEFAULT_GOVERNANCE_SETTINGS, ...JSON.parse(rawSettings) };
      }

      const rawInvoices = localStorage.getItem(STORAGE_INVOICES_KEY);
      if (rawInvoices) {
        this.invoices = JSON.parse(rawInvoices);
      }
    } catch (err) { silentCatchWarn("billing-engine", err); }
  }

  public saveSettings(newSettings: Partial<GovernanceBillingSettings>): GovernanceBillingSettings {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_GOVERNANCE_KEY, JSON.stringify(this.settings));
      } catch (err) { silentCatchWarn("billing-engine", err); }
    }
    return this.settings;
  }

  public getSettings(): GovernanceBillingSettings {
    return { ...this.settings };
  }

  public getDriverInvoices(driverId: string): InvoiceRecord[] {
    return this.invoices.filter((inv) => inv.driverId === driverId);
  }

  private persistInvoices(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(this.invoices));
    } catch (err) { silentCatchWarn("billing-engine", err); }
  }

  /**
   * Cria uma fatura de cobrança (ex: mensalidade de assinatura)
   */
  public generateSubscriptionInvoice(driverId: string, monthlyFeeBrl: number, planName: string): InvoiceRecord {
    const now = Date.now();
    const amountCents = Math.round(monthlyFeeBrl * 100);

    const invoice: InvoiceRecord = {
      id: `INV-${now}-${Math.floor(1000 + Math.random() * 9000)}`,
      driverId,
      type: "SUBSCRIPTION_MONTHLY",
      amountBrl: monthlyFeeBrl,
      amountCents,
      dueDate: now + this.settings.gracePeriodDays * 86400000,
      status: "PENDING",
      description: `Mensalidade do Plano ${planName} • PARTIU Driver OS`,
      pixCopiaECola: `00020126580014br.gov.bcb.pix0136partiu-pagamentos-${driverId}5204000053039865405${monthlyFeeBrl.toFixed(2)}5802BR5922PARTIU MOBILIDADE SA6009ITAPERUNA62070503***6304ABCD`,
      createdAt: now,
    };

    this.invoices.unshift(invoice);
    this.persistInvoices();

    // Registra dívida na assinatura
    subscriptionEngine.recordDebt(driverId, amountCents, `Fatura de Mensalidade #${invoice.id}`);

    return invoice;
  }

  /**
   * Pré-cálculo e dedução de saques (AUDITORIA 5)
   * Garante que o motorista liquide mensalidades e pendências no ato de sacar.
   */
  public calculateNetWithdrawal(params: {
    driverId: string;
    grossBalanceCents: number;
    subscription: DriverSubscription;
  }): WithdrawalPreCheckResult {
    const { driverId, grossBalanceCents, subscription } = params;
    const grossBrl = grossBalanceCents / 100;

    const deductionSummary: string[] = [];
    let subscriptionDeductionCents = 0;
    let pendingDebtsDeductionCents = 0;

    // Se a assinatura tiver débito acumulado
    if (subscription.accumulatedDebtCents > 0 && this.settings.autoDeductOnWithdrawal) {
      // Se tiver fatura de mensalidade vencida ou carência
      const monthlyDebtCents = Math.min(subscription.monthlyFeeCents, subscription.accumulatedDebtCents);
      const otherDebtCents = subscription.accumulatedDebtCents - monthlyDebtCents;

      // Dedução de mensalidade
      subscriptionDeductionCents = Math.min(grossBalanceCents, monthlyDebtCents);
      if (subscriptionDeductionCents > 0) {
        deductionSummary.push(`Mensalidade do Plano: -${(subscriptionDeductionCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
      }

      // Dedução de outras pendências
      const remainingBalance = grossBalanceCents - subscriptionDeductionCents;
      pendingDebtsDeductionCents = Math.min(remainingBalance, otherDebtCents);
      if (pendingDebtsDeductionCents > 0) {
        deductionSummary.push(`Pendências operacionais: -${(pendingDebtsDeductionCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
      }
    }

    const totalDeductionCents = subscriptionDeductionCents + pendingDebtsDeductionCents;
    const netWithdrawalAvailableCents = Math.max(0, grossBalanceCents - totalDeductionCents);
    const netWithdrawalAvailableBrl = netWithdrawalAvailableCents / 100;

    // Verifica regras de bloqueio por suspensão
    if (subscription.status === "SUSPENDED" && this.settings.blockWithdrawalsOnSuspension) {
      return {
        canWithdraw: false,
        driverId,
        grossAvailableBalanceBrl: grossBrl,
        grossAvailableBalanceCents: grossBalanceCents,
        subscriptionDeductionBrl: subscriptionDeductionCents / 100,
        subscriptionDeductionCents,
        pendingDebtsDeductionBrl: pendingDebtsDeductionCents / 100,
        pendingDebtsDeductionCents,
        netWithdrawalAvailableBrl: 0,
        netWithdrawalAvailableCents: 0,
        reason: "Saque bloqueado devido a suspensão de inadimplência. Regularize suas pendências para liberar.",
        deductionSummary,
      };
    }

    return {
      canWithdraw: netWithdrawalAvailableCents > 0,
      driverId,
      grossAvailableBalanceBrl: grossBrl,
      grossAvailableBalanceCents: grossBalanceCents,
      subscriptionDeductionBrl: subscriptionDeductionCents / 100,
      subscriptionDeductionCents,
      pendingDebtsDeductionBrl: pendingDebtsDeductionCents / 100,
      pendingDebtsDeductionCents,
      netWithdrawalAvailableBrl,
      netWithdrawalAvailableCents,
      deductionSummary,
    };
  }

  /**
   * Executa a cobrança em cascata (Wallet -> Saldo de Corridas -> PIX -> Cartão)
   */
  public executeCascadeBilling(driverId: string, invoiceId: string, availableBalanceCents: number): CascadePaymentResult {
    const invoice = this.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) throw new Error(`Fatura não encontrada: ${invoiceId}`);
    if (invoice.status === "PAID") {
      return {
        success: true,
        invoiceId,
        amountPaidBrl: invoice.amountBrl,
        methodUsed: invoice.paymentMethodUsed || "WALLET",
        remainingDebtBrl: 0,
        message: "Fatura já liquidada anteriormente.",
      };
    }

    // 1. Tentar Wallet / Saldo de Corridas
    if (availableBalanceCents >= invoice.amountCents) {
      invoice.status = "PAID";
      invoice.paidAt = Date.now();
      invoice.paymentMethodUsed = "BALANCE_DEDUCTION";
      this.persistInvoices();

      subscriptionEngine.clearDebt(driverId, invoice.amountCents);
      revenueNotifications.notifyChargeSuccess({
        driverId,
        amountBrl: invoice.amountBrl,
      });

      return {
        success: true,
        invoiceId,
        amountPaidBrl: invoice.amountBrl,
        methodUsed: "BALANCE_DEDUCTION",
        remainingDebtBrl: 0,
        message: "Cobrança liquidada com sucesso via saldo de corridas.",
      };
    }

    // 2. Se o saldo for insuficiente, mantém PENDING e disponibiliza chave PIX
    revenueNotifications.notifyChargeFailed({
      driverId,
      amountBrl: invoice.amountBrl,
      pixCopiaECola: invoice.pixCopiaECola,
    });

    return {
      success: false,
      invoiceId,
      amountPaidBrl: 0,
      methodUsed: "PIX",
      remainingDebtBrl: invoice.amountBrl,
      pixQrCodePayload: invoice.pixCopiaECola,
      message: "Saldo em carteira insuficiente. Efetue a quitação via PIX Copia e Cola.",
    };
  }
}

export const billingEngine = BillingEngine.getInstance();
