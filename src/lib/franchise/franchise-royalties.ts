/**
 * PARTIU FRANCHISE ROYALTIES
 * 
 * Motor de Apuração e Liquidação de Royalties e Taxas de Rede da Franqueadora.
 */

export interface FranchiseRoyaltyInvoice {
  royaltyInvoiceId: string;
  franchiseId: string;
  cityName: string;
  periodMonth: string;
  gmvBrl: number;
  royaltiesPct: number;
  royaltiesAmountBrl: number;
  marketingFeePct: number;
  marketingFeeAmountBrl: number;
  technologyFeePct: number;
  technologyFeeAmountBrl: number;
  totalDueFranchisorBrl: number;
  dueDate: number;
  status: 'ABERTO' | 'PAGO' | 'VENCIDO';
  paidAt?: number | undefined;
}

export class FranchiseRoyaltiesEngine {
  private royaltyInvoices: Map<string, FranchiseRoyaltyInvoice> = new Map();

  /**
   * Emite fatura mensal de royalties para a unidade franqueada
   */
  public generateRoyaltyInvoice(
    franchiseId: string,
    cityName: string,
    periodMonth: string,
    gmvBrl: number
  ): FranchiseRoyaltyInvoice {
    const royaltiesAmountBrl = Number((gmvBrl * 0.04).toFixed(2));
    const marketingFeeAmountBrl = Number((gmvBrl * 0.015).toFixed(2));
    const technologyFeeAmountBrl = Number((gmvBrl * 0.015).toFixed(2));
    const totalDueFranchisorBrl = Number((royaltiesAmountBrl + marketingFeeAmountBrl + technologyFeeAmountBrl).toFixed(2));

    const invoice: FranchiseRoyaltyInvoice = {
      royaltyInvoiceId: `ROY-${franchiseId}-${periodMonth.replace('/', '')}`,
      franchiseId,
      cityName,
      periodMonth,
      gmvBrl,
      royaltiesPct: 4.0,
      royaltiesAmountBrl,
      marketingFeePct: 1.5,
      marketingFeeAmountBrl,
      technologyFeePct: 1.5,
      technologyFeeAmountBrl,
      totalDueFranchisorBrl,
      dueDate: Date.now() + 10 * 86400 * 1000, // Vencimento em 10 dias
      status: 'ABERTO'
    };

    this.royaltyInvoices.set(invoice.royaltyInvoiceId, invoice);
    return invoice;
  }

  public settleRoyaltyInvoice(invoiceId: string): FranchiseRoyaltyInvoice {
    const inv = this.royaltyInvoices.get(invoiceId);
    if (!inv) throw new Error(`Fatura de royalties '${invoiceId}' não encontrada.`);
    inv.status = 'PAGO';
    inv.paidAt = Date.now();
    return inv;
  }

  public getAllRoyaltyInvoices(): FranchiseRoyaltyInvoice[] {
    return Array.from(this.royaltyInvoices.values());
  }
}

export const franchiseRoyaltiesEngine = new FranchiseRoyaltiesEngine();
