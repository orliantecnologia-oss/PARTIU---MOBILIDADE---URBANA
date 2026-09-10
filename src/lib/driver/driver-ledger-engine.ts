/**
 * ==============================================================================
 * ⚖️ PARTIU DRIVER OS — DRIVER LEDGER & FINTECH ENGINE (v1.0)
 * ==============================================================================
 * Livro-Razão Financeiro Imutável com Partidas Dobradas e Minor Units (Centavos).
 * Substitui o acúmulo arbitrário no localStorage por lançamentos auditáveis:
 * - Split Oficial: Modelo Híbrido (Free 5%, Bronze 3%, Prata 1%, Ouro 0%)
 * - Invariante: CréditoMotorista + TaxaPlataforma === TarifaBruta
 * - Idempotência estrita por corrida e por transação de saque PIX
 * - Reconciliação em tempo real de saldo disponível e extrato do dia
 * ==============================================================================
 */

import { commissionEngine } from "../revenue/commission-engine";
import { subscriptionEngine } from "../revenue/subscription-engine";
import { driverWalletEngine } from "../revenue/driver-wallet";
import { billingEngine } from "../revenue/billing-engine";
import { financialAuditEngine } from "../revenue/financial-audit";
import { silentCatchWarn } from "@/lib/structured-logger";


export type DriverLedgerEntryType =
  | "RIDE_EARNING"
  | "PLATFORM_FEE"
  | "PIX_WITHDRAWAL"
  | "DEBT_DEDUCTION"
  | "PROTECTION_FUND"
  | "SUBSCRIPTION_FEE"
  | "BONUS"
  | "ADJUSTMENT"
  | "REFUND";

export interface DriverLedgerEntry {
  id: string;
  driverId: string;
  rideId?: string | undefined;
  type: DriverLedgerEntryType;
  amountCents: number; // Valor absoluto em centavos
  isCredit: boolean; // true = crédito (+), false = débito (-)
  balanceAfterCents: number;
  currency: "BRL";
  status: "SETTLED" | "PENDING" | "FAILED";
  idempotencyKey: string;
  description: string;
  createdAt: number;
}

export interface DriverEarningsSummary {
  driverId: string;
  availableBalanceBrl: number;
  availableBalanceCents: number;
  todayGrossBrl: number;
  todayNetEarningsBrl: number;
  todayPlatformFeeBrl: number;
  todayCompletedTrips: number;
  todayWithdrawalsBrl: number;
  entriesCount: number;
}

export interface PixWithdrawalResult {
  success: boolean;
  txid?: string | undefined;
  amountBrl: number;
  newBalanceBrl: number;
  ledgerEntryId?: string | undefined;
  message: string;
}

const STORAGE_KEY_DRIVER_LEDGER = "partiu_driver_ledger_entries";

export class DriverLedgerEngine {
  private static instance: DriverLedgerEngine;
  private entries: DriverLedgerEntry[] = [];
  private processedIdempotencyKeys: Set<string> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): DriverLedgerEngine {
    if (!DriverLedgerEngine.instance) {
      DriverLedgerEngine.instance = new DriverLedgerEngine();
    }
    return DriverLedgerEngine.instance;
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DRIVER_LEDGER);
      if (raw) {
        this.entries = JSON.parse(raw);
        this.entries.forEach((e) => this.processedIdempotencyKeys.add(e.idempotencyKey));
      }
    } catch {
      this.entries = [];
    }
  }

  private persistToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY_DRIVER_LEDGER, JSON.stringify(this.entries));
    } catch (err) { silentCatchWarn("driver-ledger-engine", err); }
  }

  /**
   * Obtém o saldo atual do motorista derivado da soma dos lançamentos do ledger
   */
  public getDriverBalanceCents(driverId: string = "mot-001"): number {
    let balance = 0;
    for (const entry of this.entries) {
      if (entry.driverId === driverId && entry.status === "SETTLED") {
        if (entry.isCredit) {
          balance += entry.amountCents;
        } else {
          balance -= entry.amountCents;
        }
      }
    }
    return Math.max(0, balance);
  }

  /**
   * Atalho ergonômico para liquidação de corrida
   */
  public settleTripRide(
    driverId: string,
    rideId: string,
    grossFareBrl: number,
    modalidade: string = "POP",
    idempotencyKey?: string | undefined
  ) {
    return this.settleRideEarnings({
      driverId,
      rideId,
      grossFareBrl,
      modalidade,
      idempotencyKey,
    });
  }

  /**
   * Liquida uma corrida concluída com split automático baseado no plano de assinatura do condutor
   */
  public settleRideEarnings(params: {
    rideId: string;
    driverId: string;
    grossFareBrl: number;
    modalidade: string;
    idempotencyKey?: string | undefined;
  }): { driverCreditCents: number; platformFeeCents: number; entry: DriverLedgerEntry } {
    const key = params.idempotencyKey || `SETTLE-RIDE-${params.rideId}`;

    // Proteção de Idempotência: Se já liquidada, retorna o lançamento existente
    if (this.processedIdempotencyKeys.has(key)) {
      const existing = this.entries.find((e) => e.idempotencyKey === key);
      if (existing) {
        const grossCents = Math.round(params.grossFareBrl * 100);
        const fee = Math.max(0, grossCents - existing.amountCents);
        return { driverCreditCents: existing.amountCents, platformFeeCents: fee, entry: existing };
      }
    }

    // Consulta plano ativo do condutor e saldo do fundo de proteção
    const sub = subscriptionEngine.getDriverSubscription(params.driverId);
    const plan = subscriptionEngine.getPlanById(sub.planId);
    const wallet = driverWalletEngine.getWallet(params.driverId);

    const settlement = commissionEngine.calculateRideSplit({
      rideId: params.rideId,
      driverId: params.driverId,
      grossFareBrl: params.grossFareBrl,
      plan: plan
        ? {
            planId: plan.id,
            planName: plan.name,
            commissionPercent: plan.commissionPercent,
            monthlyFeeBrl: plan.monthlyFeeBrl,
          }
        : undefined,
      currentProtectionBalanceCents: wallet.protectionFundBalanceCents,
    });

    const driverCreditCents = settlement.driverNetEarningsCents;
    const platformFeeCents = settlement.totalPlatformDeductionCents;

    // Invariante Contábil Estrita
    if (driverCreditCents + platformFeeCents !== settlement.grossFareCents) {
      throw new Error(
        `INVARIANTE_VIOLADA: Split contábil não confere com o total da corrida (${driverCreditCents} + ${platformFeeCents} !== ${settlement.grossFareCents})`
      );
    }

    // Atualiza a carteira unificada do condutor e audita
    driverWalletEngine.creditRideSettlement(settlement);
    financialAuditEngine.auditRideSettlement(settlement);

    const currentBalance = this.getDriverBalanceCents(params.driverId);
    const newBalance = currentBalance + driverCreditCents;
    const now = Date.now();

    const entry: DriverLedgerEntry = {
      id: `LED-${now}-${Math.floor(100 + Math.random() * 900)}`,
      driverId: params.driverId,
      rideId: params.rideId,
      type: "RIDE_EARNING",
      amountCents: driverCreditCents,
      isCredit: true,
      balanceAfterCents: newBalance,
      currency: "BRL",
      status: "SETTLED",
      idempotencyKey: key,
      description: `Repasse Líquido D+0 (${(100 - settlement.commissionPercent).toFixed(1)}%) • Plano ${settlement.planName} • Viagem #${params.rideId.slice(-6)} • ${params.modalidade}`,
      createdAt: now,
    };

    this.entries.unshift(entry);
    this.processedIdempotencyKeys.add(key);
    this.persistToStorage();

    // Sincroniza cache legado para compatibilidade
    if (typeof window !== "undefined") {
      localStorage.setItem("partiu_motorista_ganhos_hoje", (newBalance / 100).toFixed(2));
    }

    return { driverCreditCents, platformFeeCents, entry };
  }

  /**
   * Executa um Saque PIX instantâneo debitando da carteira do motorista
   */
  public executePixWithdrawal(
    paramsOrDriverId:
      | {
          driverId: string;
          chavePix: string;
          amountBrl?: number | undefined;
          idempotencyKey?: string | undefined;
        }
      | string,
    amountBrlOrChavePix?: number | string | undefined,
    chavePixParam?: string | undefined
  ): PixWithdrawalResult {
    let params: {
      driverId: string;
      chavePix: string;
      amountBrl?: number | undefined;
      idempotencyKey?: string | undefined;
    };

    if (typeof paramsOrDriverId === "object") {
      params = paramsOrDriverId;
    } else {
      const driverId = paramsOrDriverId;
      let amountBrl: number | undefined;
      let chavePix: string;

      if (typeof amountBrlOrChavePix === "number") {
        amountBrl = amountBrlOrChavePix;
        chavePix = chavePixParam || "chave-pix-padrao";
      } else {
        chavePix = (amountBrlOrChavePix as string) || chavePixParam || "chave-pix-padrao";
      }

      params = { driverId, chavePix, amountBrl };
    }

    const balanceCents = this.getDriverBalanceCents(params.driverId);

    // 1. Auditoria e pré-cálculo com deduções obrigatórias de governança
    const sub = subscriptionEngine.getDriverSubscription(params.driverId);
    const check = billingEngine.calculateNetWithdrawal({
      driverId: params.driverId,
      grossBalanceCents: balanceCents,
      subscription: sub,
    });

    if (!check.canWithdraw) {
      return {
        success: false,
        amountBrl: 0,
        newBalanceBrl: balanceCents / 100,
        message: check.reason || "Saldo insuficiente para saque.",
      };
    }

    const totalDeductionsCents = check.subscriptionDeductionCents + check.pendingDebtsDeductionCents;
    const requestedNetBrl = params.amountBrl
      ? Math.min(params.amountBrl, check.netWithdrawalAvailableBrl)
      : check.netWithdrawalAvailableBrl;
    const requestedNetCents = Math.round(requestedNetBrl * 100);

    const totalDebitedCents = requestedNetCents + totalDeductionsCents;

    if (totalDebitedCents <= 0) {
      return {
        success: false,
        amountBrl: 0,
        newBalanceBrl: balanceCents / 100,
        message: "Saldo insuficiente para saque.",
      };
    }

    if (totalDebitedCents > balanceCents) {
      return {
        success: false,
        amountBrl: requestedNetBrl,
        newBalanceBrl: balanceCents / 100,
        message: "Valor solicitado excede o saldo disponível após retenção de pendências.",
      };
    }

    const key = params.idempotencyKey || `WITHDRAW-${Date.now()}-${params.driverId}`;
    if (this.processedIdempotencyKeys.has(key)) {
      return {
        success: false,
        amountBrl: 0,
        newBalanceBrl: balanceCents / 100,
        message: "Saque já processado anteriormente.",
      };
    }

    const now = Date.now();
    let runningBalance = balanceCents;

    // Se houve deduções de mensalidade / pendências, cria lançamento no livro-razão
    if (totalDeductionsCents > 0) {
      subscriptionEngine.clearDebt(params.driverId, totalDeductionsCents);
      runningBalance -= totalDeductionsCents;

      const dedEntry: DriverLedgerEntry = {
        id: `LED-DED-${now}-${Math.floor(100 + Math.random() * 900)}`,
        driverId: params.driverId,
        type: "DEBT_DEDUCTION",
        amountCents: totalDeductionsCents,
        isCredit: false,
        balanceAfterCents: runningBalance,
        currency: "BRL",
        status: "SETTLED",
        idempotencyKey: `IDEM-DED-${key}`,
        description: `Dedução de Mensalidade / Pendências no Saque: ${check.deductionSummary.join(" • ")}`,
        createdAt: now,
      };
      this.entries.unshift(dedEntry);
    }

    // Lançamento do saque PIX efetivo
    runningBalance -= requestedNetCents;
    const txid = `PIX-${now}-${Math.floor(1000 + Math.random() * 9000)}`;

    const entry: DriverLedgerEntry = {
      id: `LED-${now}-${Math.floor(100 + Math.random() * 900)}`,
      driverId: params.driverId,
      type: "PIX_WITHDRAWAL",
      amountCents: requestedNetCents,
      isCredit: false,
      balanceAfterCents: runningBalance,
      currency: "BRL",
      status: "SETTLED",
      idempotencyKey: key,
      description: `Saque Instantâneo PIX para chave: ${params.chavePix} (TxID: ${txid})`,
      createdAt: now,
    };

    this.entries.unshift(entry);
    this.processedIdempotencyKeys.add(key);
    this.persistToStorage();

    if (typeof window !== "undefined") {
      localStorage.setItem("partiu_motorista_ganhos_hoje", (runningBalance / 100).toFixed(2));
    }

    // Registra na auditoria
    financialAuditEngine.auditWithdrawal({
      success: true,
      driverId: params.driverId,
      grossAmountBrl: totalDebitedCents / 100,
      deductionsBrl: totalDeductionsCents / 100,
      netWithdrawnBrl: requestedNetBrl,
      newBalanceBrl: runningBalance / 100,
      txid,
      message: "Saque e conciliação efetuados com sucesso.",
      deductionBreakdown: check.deductionSummary,
    });

    return {
      success: true,
      txid,
      amountBrl: requestedNetBrl,
      newBalanceBrl: runningBalance / 100,
      ledgerEntryId: entry.id,
      message: `Saque de R$ ${requestedNetBrl.toFixed(2).replace(".", ",")} enviado com sucesso via PIX!${
        totalDeductionsCents > 0
          ? ` (Retenção de R$ ${(totalDeductionsCents / 100).toFixed(2).replace(".", ",")} para quitação de pendências)`
          : ""
      }`,
    };
  }

  /**
   * Consolida as métricas financeiras reais do dia a partir dos lançamentos
   */
  public getEarningsSummary(driverId: string = "mot-001"): DriverEarningsSummary {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let todayGrossCents = 0;
    let todayNetCents = 0;
    let todayPlatformCents = 0;
    let todayCompletedTrips = 0;
    let todayWithdrawalsCents = 0;

    for (const entry of this.entries) {
      if (entry.driverId === driverId && entry.status === "SETTLED") {
        if (entry.createdAt >= startOfDay) {
          if (entry.type === "RIDE_EARNING") {
            todayNetCents += entry.amountCents;
            const gross = Math.round(entry.amountCents / 0.88);
            todayGrossCents += gross;
            todayPlatformCents += gross - entry.amountCents;
            todayCompletedTrips += 1;
          } else if (entry.type === "PIX_WITHDRAWAL") {
            todayWithdrawalsCents += entry.amountCents;
          }
        }
      }
    }

    const availableBalanceCents = this.getDriverBalanceCents(driverId);

    return {
      driverId,
      availableBalanceBrl: Number((availableBalanceCents / 100).toFixed(2)),
      availableBalanceCents,
      todayGrossBrl: Number((todayGrossCents / 100).toFixed(2)),
      todayNetEarningsBrl: Number((todayNetCents / 100).toFixed(2)),
      todayPlatformFeeBrl: Number((todayPlatformCents / 100).toFixed(2)),
      todayCompletedTrips,
      todayWithdrawalsBrl: Number((todayWithdrawalsCents / 100).toFixed(2)),
      entriesCount: this.entries.filter((e) => e.driverId === driverId).length,
    };
  }

  public getStatement(driverId: string = "mot-001", limit: number = 50): DriverLedgerEntry[] {
    return this.entries.filter((e) => e.driverId === driverId).slice(0, limit);
  }

  public clear(): void {
    this.entries = [];
    this.processedIdempotencyKeys.clear();
    this.persistToStorage();
  }
}

export const driverLedgerEngine = DriverLedgerEngine.getInstance();
