/**
 * PARTIU ADS BILLING ENGINE
 * 
 * Faturamento e Cobrança de Publicidade Integrados ao PARTIU Pay e PIX Engine.
 * Executa deduções por CPM, CPC e CPA em saldo pré-pago ou carteira digital.
 */

import { partiuWalletEngine } from '../finance/partiu-wallet';
import { pixEngine } from '../finance/pix-engine';

export interface AdvertiserBillingAccount {
  advertiserId: string;
  businessName: string;
  cnpj: string;
  prepaidBalanceBrl: number;
  totalSpentBrl: number;
  autoRechargeEnabled: boolean;
  rechargeThresholdBrl: number;
  rechargeAmountBrl: number;
}

export class AdsBillingEngine {
  private accounts: Map<string, AdvertiserBillingAccount> = new Map();

  /**
   * Registra ou atualiza conta de anunciante
   */
  public registerAdvertiser(
    advertiserId: string,
    businessName: string,
    cnpj: string,
    initialDepositBrl: number = 0
  ): AdvertiserBillingAccount {
    const account: AdvertiserBillingAccount = {
      advertiserId,
      businessName,
      cnpj,
      prepaidBalanceBrl: initialDepositBrl,
      totalSpentBrl: 0,
      autoRechargeEnabled: true,
      rechargeThresholdBrl: 50.0,
      rechargeAmountBrl: 200.0
    };
    this.accounts.set(advertiserId, account);
    return account;
  }

  public getAccount(advertiserId: string): AdvertiserBillingAccount | undefined {
    return this.accounts.get(advertiserId);
  }

  /**
   * Cobra evento publicitário (impressão, clique ou conversão)
   */
  public chargeAdEvent(advertiserId: string, amountBrl: number, eventDescription: string): boolean {
    const account = this.accounts.get(advertiserId);
    if (!account) return false;

    if (account.prepaidBalanceBrl >= amountBrl) {
      account.prepaidBalanceBrl = Number((account.prepaidBalanceBrl - amountBrl).toFixed(2));
      account.totalSpentBrl = Number((account.totalSpentBrl + amountBrl).toFixed(2));
      return true;
    }

    return false;
  }

  /**
   * Recarrega saldo via PIX
   */
  public generatePixRecharge(advertiserId: string, amountBrl: number): { txid: string; emvPayload: string } {
    const account = this.accounts.get(advertiserId);
    if (!account) throw new Error(`Anunciante '${advertiserId}' não encontrado.`);

    const order = pixEngine.createPixCashInOrder({
      payerId: advertiserId,
      amountBrl,
      description: `Recarga PARTIU Ads - ${account.businessName}`
    });

    // Adiciona saldo
    account.prepaidBalanceBrl = Number((account.prepaidBalanceBrl + amountBrl).toFixed(2));
    return { txid: order.orderId, emvPayload: order.qrCodePayload };
  }
}

export const adsBillingEngine = new AdsBillingEngine();
