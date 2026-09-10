/**
 * ==============================================================================
 * 💼 PARTIU REVENUE OS — DRIVER WALLET & PROTECTION FUND ENGINE (v1.0)
 * ==============================================================================
 * Carteira Financeira Integrada do Motorista:
 * - Saldo Disponível em Centavos Inteiros
 * - Fundo de Proteção Operacional (Partiu Protection Fund) com acúmulo gradativo
 * - Economia Acumulada em Tempo Real vs Taxa de Mercado (20%)
 * - Saque Instantâneo PIX D+0 com Dedução Automática de Débitos
 * ==============================================================================
 */

import { type RideCommissionSettlement } from "./commission-engine";
import { subscriptionEngine } from "./subscription-engine";
import { billingEngine } from "./billing-engine";
import { silentCatchWarn } from "@/lib/structured-logger";


export interface DriverWalletTransaction {
  id: string;
  driverId: string;
  rideId?: string | undefined;
  type:
    | "RIDE_NET_CREDIT"
    | "RIDE_FARE"
    | "PLATFORM_COMMISSION"
    | "PROTECTION_FUND_CONTRIBUTION"
    | "SUBSCRIPTION_FEE"
    | "PIX_WITHDRAWAL"
    | "DEBT_DEDUCTION"
    | "BONUS_CREDIT"
    | "ADJUSTMENT";
  amountBrl: number;
  amountCents: number;
  isCredit?: boolean | undefined;
  balanceBeforeBrl?: number | undefined;
  balanceAfterBrl: number;
  balanceAfterCents?: number | undefined;
  description: string;
  referenceId?: string | undefined;
  timestamp: number;
}

export interface DriverWallet {
  driverId: string;
  availableBalanceBrl: number;
  availableBalanceCents: number;
  protectionFundBalanceBrl: number;
  protectionFundBalanceCents: number;
  totalGrossEarnedBrl: number;
  totalNetEarnedBrl: number;
  totalPlatformFeesPaidBrl: number;
  totalSavingsVersusUberBrl: number; // Widget de Economia PARTIU
  todayCompletedTrips: number;
  monthCompletedTrips: number;
  pendingDebtsBrl: number;
  pendingDebtsCents: number;
  lastUpdated: number;
}

export interface WalletWithdrawalExecution {
  success: boolean;
  driverId: string;
  grossAmountBrl: number;
  deductionsBrl: number;
  netWithdrawnBrl: number;
  newBalanceBrl: number;
  txid?: string | undefined;
  message: string;
  deductionBreakdown: string[];
}

const STORAGE_WALLET_PREFIX = "partiu_driver_wallet_v1_";
const STORAGE_TRANSACTIONS_PREFIX = "partiu_driver_txs_v1_";

export class DriverWalletEngine {
  private static instance: DriverWalletEngine;
  private wallets: Map<string, DriverWallet> = new Map();
  private transactions: Map<string, DriverWalletTransaction[]> = new Map();

  private constructor() {}

  public static getInstance(): DriverWalletEngine {
    if (!DriverWalletEngine.instance) {
      DriverWalletEngine.instance = new DriverWalletEngine();
    }
    return DriverWalletEngine.instance;
  }

  public getWallet(driverId: string = "mot-001"): DriverWallet {
    const existing = this.wallets.get(driverId);
    if (existing) return existing;

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`${STORAGE_WALLET_PREFIX}${driverId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.wallets.set(driverId, parsed);
          return parsed;
        }
      } catch (err) { silentCatchWarn("driver-wallet", err); }
    }

    // Carteira inicial para demonstração transparente
    const sub = subscriptionEngine.getDriverSubscription(driverId);
    const initial: DriverWallet = {
      driverId,
      availableBalanceBrl: 284.50,
      availableBalanceCents: 28450,
      protectionFundBalanceBrl: 18.60,
      protectionFundBalanceCents: 1860,
      totalGrossEarnedBrl: 5400.00,
      totalNetEarnedBrl: 5130.00,
      totalPlatformFeesPaidBrl: 162.00,
      totalSavingsVersusUberBrl: 918.00, // Exemplo do prompt: R$ 5.400 * 20% = R$ 1.080 vs R$ 162 = R$ 918 economia!
      todayCompletedTrips: 9,
      monthCompletedTrips: 74,
      pendingDebtsBrl: sub.accumulatedDebtBrl,
      pendingDebtsCents: sub.accumulatedDebtCents,
      lastUpdated: Date.now(),
    };

    this.wallets.set(driverId, initial);
    this.persistWallet(initial);
    return initial;
  }

  private persistWallet(wallet: DriverWallet): void {
    this.wallets.set(wallet.driverId, wallet);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `${STORAGE_WALLET_PREFIX}${wallet.driverId}`,
          JSON.stringify(wallet)
        );
        // Sincroniza cache legado para compatibilidade do cockpit
        localStorage.setItem("partiu_motorista_ganhos_hoje", wallet.availableBalanceBrl.toFixed(2));
      } catch (err) { silentCatchWarn("driver-wallet", err); }
    }
  }

  public getTransactions(driverId: string = "mot-001"): DriverWalletTransaction[] {
    const existing = this.transactions.get(driverId);
    if (existing) return existing;

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`${STORAGE_TRANSACTIONS_PREFIX}${driverId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.transactions.set(driverId, parsed);
          return parsed;
        }
      } catch (err) { silentCatchWarn("driver-wallet", err); }
    }

    return [];
  }

  private persistTransactions(driverId: string, txs: DriverWalletTransaction[]): void {
    this.transactions.set(driverId, txs);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `${STORAGE_TRANSACTIONS_PREFIX}${driverId}`,
          JSON.stringify(txs.slice(0, 100))
        );
      } catch (err) { silentCatchWarn("driver-wallet", err); }
    }
  }

  /**
   * Credita uma corrida liquidada na carteira do motorista
   */
  public creditRideSettlement(settlement: RideCommissionSettlement): DriverWallet {
    const wallet = this.getWallet(settlement.driverId);
    const txs = this.getTransactions(settlement.driverId);
    const now = Date.now();

    // 1. Atualiza saldos
    const newAvailableCents = wallet.availableBalanceCents + settlement.driverNetEarningsCents;
    const newProtectionCents =
      wallet.protectionFundBalanceCents + settlement.protectionFundContributionCents;

    wallet.availableBalanceCents = newAvailableCents;
    wallet.availableBalanceBrl = newAvailableCents / 100;

    wallet.protectionFundBalanceCents = newProtectionCents;
    wallet.protectionFundBalanceBrl = newProtectionCents / 100;

    wallet.totalGrossEarnedBrl += settlement.grossFareBrl;
    wallet.totalNetEarnedBrl += settlement.driverNetEarningsBrl;
    wallet.totalPlatformFeesPaidBrl += settlement.totalPlatformDeductionBrl;
    wallet.totalSavingsVersusUberBrl += settlement.savingsVersusCompetitorBrl;

    wallet.todayCompletedTrips += 1;
    wallet.monthCompletedTrips += 1;
    wallet.lastUpdated = now;

    // 2. Registra lançamento no extrato
    const tx: DriverWalletTransaction = {
      id: `TX-${now}-${Math.floor(100 + Math.random() * 900)}`,
      driverId: settlement.driverId,
      rideId: settlement.rideId,
      type: "RIDE_NET_CREDIT",
      amountBrl: settlement.driverNetEarningsBrl,
      amountCents: settlement.driverNetEarningsCents,
      isCredit: true,
      balanceAfterBrl: wallet.availableBalanceBrl,
      balanceAfterCents: wallet.availableBalanceCents,
      description: `Corrida #${settlement.rideId.slice(-6)} • Plano ${settlement.planName} (${settlement.commissionPercent}%) • Taxa PARTIU: -${settlement.platformCommissionBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      timestamp: now,
    };

    txs.unshift(tx);
    this.persistWallet(wallet);
    this.persistTransactions(settlement.driverId, txs);

    return wallet;
  }

  /**
   * Executa o saque PIX deduzindo mensalidades e pendências (AUDITORIA 5)
   */
  public executePixWithdrawal(params: {
    driverId: string;
    chavePix: string;
    amountBrl?: number | undefined;
  }): WalletWithdrawalExecution {
    const wallet = this.getWallet(params.driverId);
    const sub = subscriptionEngine.getDriverSubscription(params.driverId);

    // 1. Pré-cálculo com deduções obrigatórias
    const check = billingEngine.calculateNetWithdrawal({
      driverId: params.driverId,
      grossBalanceCents: wallet.availableBalanceCents,
      subscription: sub,
    });

    if (!check.canWithdraw) {
      return {
        success: false,
        driverId: params.driverId,
        grossAmountBrl: wallet.availableBalanceBrl,
        deductionsBrl: 0,
        netWithdrawnBrl: 0,
        newBalanceBrl: wallet.availableBalanceBrl,
        message: check.reason || "Saldo insuficiente para saque.",
        deductionBreakdown: [],
      };
    }

    const totalDeductionsCents = check.subscriptionDeductionCents + check.pendingDebtsDeductionCents;
    const requestedNetBrl = params.amountBrl
      ? Math.min(params.amountBrl, check.netWithdrawalAvailableBrl)
      : check.netWithdrawalAvailableBrl;
    const requestedNetCents = Math.round(requestedNetBrl * 100);

    const totalDebitedCents = requestedNetCents + totalDeductionsCents;

    // 2. Abate as pendências do motorista
    if (totalDeductionsCents > 0) {
      subscriptionEngine.clearDebt(params.driverId, totalDeductionsCents);
    }

    // 3. Atualiza o saldo da carteira
    wallet.availableBalanceCents = Math.max(0, wallet.availableBalanceCents - totalDebitedCents);
    wallet.availableBalanceBrl = wallet.availableBalanceCents / 100;
    wallet.pendingDebtsCents = Math.max(0, wallet.pendingDebtsCents - totalDeductionsCents);
    wallet.pendingDebtsBrl = wallet.pendingDebtsCents / 100;
    wallet.lastUpdated = Date.now();

    // 4. Registra no extrato
    const txs = this.getTransactions(params.driverId);
    const now = Date.now();

    // Lançamento de dedução se houver
    if (totalDeductionsCents > 0) {
      txs.unshift({
        id: `TX-DED-${now}`,
        driverId: params.driverId,
        type: "DEBT_DEDUCTION",
        amountBrl: totalDeductionsCents / 100,
        amountCents: totalDeductionsCents,
        isCredit: false,
        balanceAfterBrl: (wallet.availableBalanceCents + requestedNetCents) / 100,
        balanceAfterCents: wallet.availableBalanceCents + requestedNetCents,
        description: `Dedução de Mensalidade / Pendências no Saque: ${check.deductionSummary.join(" + ")}`,
        timestamp: now,
      });
    }

    // Lançamento do saque líquido PIX
    const txid = `PIX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    txs.unshift({
      id: `TX-WD-${now}`,
      driverId: params.driverId,
      type: "PIX_WITHDRAWAL",
      amountBrl: requestedNetBrl,
      amountCents: requestedNetCents,
      isCredit: false,
      balanceAfterBrl: wallet.availableBalanceBrl,
      balanceAfterCents: wallet.availableBalanceCents,
      description: `Saque Instantâneo PIX D+0 (${params.chavePix}) • TxID: ${txid}`,
      timestamp: now,
    });

    this.persistWallet(wallet);
    this.persistTransactions(params.driverId, txs);

    return {
      success: true,
      driverId: params.driverId,
      grossAmountBrl: totalDebitedCents / 100,
      deductionsBrl: totalDeductionsCents / 100,
      netWithdrawnBrl: requestedNetBrl,
      newBalanceBrl: wallet.availableBalanceBrl,
      txid,
      message: `Saque de ${requestedNetBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} enviado via PIX com sucesso!`,
      deductionBreakdown: check.deductionSummary,
    };
  }
}

export const driverWalletEngine = DriverWalletEngine.getInstance();
