/**
 * PARTIU CORPORATE BILLING & MOBILITY SCORE
 * 
 * Motor de Faturamento Corporativo B2B e Cálculo do Corporate Mobility Score.
 * Emite faturas consolidadas por centro de custo e audita a eficiência financeira.
 */

export interface CorporateBillingInvoice {
  invoiceId: string;
  corporateId: string;
  companyName: string;
  billingPeriodStart: number;
  billingPeriodEnd: number;
  dueDate: number;
  totalTripsCount: number;
  subtotalFaresBrl: number;
  platformServiceFeeBrl: number;
  discountBrl: number;
  totalInvoiceBrl: number;
  status: 'EM_ABERTO' | 'FECHADA' | 'PAGA' | 'VENCIDA';
  costCenterBreakdown: Record<string, number>;
  generatedAt: number;
}

export interface CorporateMobilityScoreReport {
  corporateId: string;
  companyName: string;
  compliancePct: number;
  economiaGeradaPct: number;
  custoMedioPorKmBrl: number;
  taxaUtilizacaoOrcamentoPct: number;
  totalViagensMes: number;
  totalGastoMesBrl: number;
  scoreGeral: number; // 0 a 100
  rating: 'EXCELENTE_COMPLIANCE' | 'BOM_CONTROLE' | 'ATENCAO_ORCAMENTO';
}

export class CorporateBillingEngine {
  private invoices: Map<string, CorporateBillingInvoice> = new Map();

  /**
   * Fecha ciclo e emite fatura consolidada corporativa
   */
  public generateInvoice(
    corporateId: string,
    companyName: string,
    periodStart: number,
    periodEnd: number,
    tripsCount: number,
    totalFaresBrl: number,
    costCenterBreakdown: Record<string, number>
  ): CorporateBillingInvoice {
    const invoiceId = `INV-${corporateId}-${Date.now().toString().slice(-6)}`;
    const platformServiceFeeBrl = Number((totalFaresBrl * 0.05).toFixed(2)); // Taxa SaaS corporativa 5%
    const totalInvoiceBrl = Number((totalFaresBrl + platformServiceFeeBrl).toFixed(2));

    const invoice: CorporateBillingInvoice = {
      invoiceId,
      corporateId,
      companyName,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      dueDate: periodEnd + (15 * 86400 * 1000), // Vencimento D+15
      totalTripsCount: tripsCount,
      subtotalFaresBrl: totalFaresBrl,
      platformServiceFeeBrl,
      discountBrl: 0,
      totalInvoiceBrl,
      status: 'FECHADA',
      costCenterBreakdown,
      generatedAt: Date.now()
    };

    this.invoices.set(invoiceId, invoice);
    return invoice;
  }

  public getInvoice(invoiceId: string): CorporateBillingInvoice | undefined {
    return this.invoices.get(invoiceId);
  }

  public getAllInvoices(): CorporateBillingInvoice[] {
    return Array.from(this.invoices.values());
  }

  /**
   * Calcula o Corporate Mobility Score para auditoria de eficiência e governança
   */
  public calculateCorporateMobilityScore(
    corporateId: string,
    companyName: string,
    totalTrips: number,
    totalSpendBrl: number,
    allocatedBudgetBrl: number,
    totalKmTraveled: number,
    compliantTripsCount: number
  ): CorporateMobilityScoreReport {
    const compliancePct = totalTrips > 0
      ? Number(((compliantTripsCount / totalTrips) * 100).toFixed(1))
      : 100.0;

    // Comparativo: Custo táxi tradicional ~ R$ 4.80/km vs PARTIU B2B
    const custoMedioPorKmBrl = totalKmTraveled > 0
      ? Number((totalSpendBrl / totalKmTraveled).toFixed(2))
      : 2.85;

    const baselineTaxiCost = totalKmTraveled * 4.80;
    const economiaGeradaPct = baselineTaxiCost > 0
      ? Number((((baselineTaxiCost - totalSpendBrl) / baselineTaxiCost) * 100).toFixed(1))
      : 38.5;

    const taxaUtilizacaoOrcamentoPct = allocatedBudgetBrl > 0
      ? Number(((totalSpendBrl / allocatedBudgetBrl) * 100).toFixed(1))
      : 74.0;

    // Score ponderado: Compliance (40%), Economia (35%), Utilização Orçamentária (25%)
    const score = Math.min(100, Math.round(
      (compliancePct * 0.40) +
      (Math.min(100, economiaGeradaPct * 2) * 0.35) +
      ((taxaUtilizacaoOrcamentoPct <= 100 ? 100 : 70) * 0.25)
    ));

    let rating: CorporateMobilityScoreReport['rating'] = 'BOM_CONTROLE';
    if (score >= 88) rating = 'EXCELENTE_COMPLIANCE';
    else if (score < 65) rating = 'ATENCAO_ORCAMENTO';

    return {
      corporateId,
      companyName,
      compliancePct,
      economiaGeradaPct: Math.max(0, economiaGeradaPct),
      custoMedioPorKmBrl,
      taxaUtilizacaoOrcamentoPct,
      totalViagensMes: totalTrips,
      totalGastoMesBrl: totalSpendBrl,
      scoreGeral: score,
      rating
    };
  }
}

export const corporateBillingEngine = new CorporateBillingEngine();
