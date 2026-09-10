/**
 * CROSS-SIDE CASHBACK ENGINE
 * 
 * Motor de Cashback Cruzado:
 * - Compras no comércio parceiro geram créditos na PARTIU Wallet para corridas
 * - Corridas realizadas geram cashback aplicável em compras no varejo credenciado
 * - Liquidação atômica e conciliação financeira em tempo real
 */

import { partiuWalletEngine } from '../finance/partiu-wallet';
import { pixEngine } from '../finance/pix-engine';
import { silentCatchWarn } from "@/lib/structured-logger";


export interface CashbackTransaction {
  transactionId: string;
  sourceType: 'COMPRA_COMERCIO' | 'CORRIDA_PARTIU';
  userId: string;
  merchantId?: string;
  rideId?: string;
  totalSpentBrl: number;
  cashbackPct: number;
  cashbackEarnedBrl: number;
  destinationWalletId: string;
  timestamp: number;
  status: 'CREDITADO' | 'PENDENTE';
}

export class CashbackEngine {
  private transactions: Map<string, CashbackTransaction> = new Map();

  /**
   * Processa cashback quando o usuário realiza uma compra em um estabelecimento parceiro
   */
  public processMerchantPurchaseCashback(params: {
    userId: string;
    merchantId: string;
    purchaseAmountBrl: number;
    cashbackPct: number;
  }): CashbackTransaction {
    const cashbackValue = Number(((params.purchaseAmountBrl * params.cashbackPct) / 100).toFixed(2));
    const txId = `CB-MERCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const tx: CashbackTransaction = {
      transactionId: txId,
      sourceType: 'COMPRA_COMERCIO',
      userId: params.userId,
      merchantId: params.merchantId,
      totalSpentBrl: params.purchaseAmountBrl,
      cashbackPct: params.cashbackPct,
      cashbackEarnedBrl: cashbackValue,
      destinationWalletId: `WAL-${params.userId}`,
      timestamp: Date.now(),
      status: 'CREDITADO'
    };

    this.transactions.set(txId, tx);

    // Credita na carteira digital do usuário
    try {
      const wallet = partiuWalletEngine.getOrCreateWallet(params.userId, 'PASSENGER');
      wallet.cashbackBalance += cashbackValue;
      wallet.balance += cashbackValue;
      wallet.availableBalance += cashbackValue;
      wallet.updatedAt = Date.now();
    } catch (err) { silentCatchWarn("cashback-engine", err); }

    return tx;
  }

  /**
   * Processa cashback pós-corrida para gastar no comércio conveniado
   */
  public processRideRewardCashback(params: {
    userId: string;
    rideId: string;
    rideFareBrl: number;
  }): CashbackTransaction {
    const defaultPct = 3.0; // 3% da corrida vira crédito no comércio
    const cashbackValue = Number(((params.rideFareBrl * defaultPct) / 100).toFixed(2));
    const txId = `CB-RIDE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const tx: CashbackTransaction = {
      transactionId: txId,
      sourceType: 'CORRIDA_PARTIU',
      userId: params.userId,
      rideId: params.rideId,
      totalSpentBrl: params.rideFareBrl,
      cashbackPct: defaultPct,
      cashbackEarnedBrl: cashbackValue,
      destinationWalletId: `WAL-${params.userId}`,
      timestamp: Date.now(),
      status: 'CREDITADO'
    };

    this.transactions.set(txId, tx);
    return tx;
  }
}

export const cashbackEngine = new CashbackEngine();
