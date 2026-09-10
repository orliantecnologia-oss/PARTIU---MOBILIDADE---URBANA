/**
 * PARTIU FRANCHISE FINANCE & P&L
 * 
 * Demonstração de Resultados do Exercício (P&L) e Conciliação Financeira Municipal da Franquia.
 */

export interface FranchisePnLReport {
  franchiseId: string;
  cityName: string;
  uf: string;
  monthPeriod: string;
  gmvTotalBrl: number;
  grossRevenuePlatformBrl: number; // Take-rate cobrado das corridas (ex: 12%)
  
  // Deduções da Franqueadora
  royaltiesFeeBrl: number; // 4.0% GMV
  marketingFeeBrl: number; // 1.5% GMV
  technologyFeeBrl: number; // 1.5% GMV
  totalFranchisorFeesBrl: number;
  
  // Receita Operacional Líquida da Franquia
  netFranchiseRevenueBrl: number;
  
  // Despesas Locais da Unidade
  localDriverIncentivesBrl: number;
  localSupportCostsBrl: number;
  localMarketingBrl: number;
  localAdministrativeCostsBrl: number;
  totalLocalExpensesBrl: number;
  
  // Resultado Final
  ebitdaFranchiseBrl: number;
  netMarginPct: number;
}

export class FranchiseFinanceEngine {
  /**
   * Apura o P&L mensal da franquia local
   */
  public calculateFranchisePnL(
    franchiseId: string,
    cityName: string,
    uf: string,
    monthPeriod: string,
    gmvTotalBrl: number,
    takeRatePct: number = 5.0, // 5.0% padrão base modelo híbrido
    localIncentivesBrl: number = 0,
    localSupportBrl: number = 0
  ): FranchisePnLReport {
    const grossRevenuePlatformBrl = Number(((gmvTotalBrl * takeRatePct) / 100).toFixed(2));

    // Fees da Franqueadora Nacional
    const royaltiesFeeBrl = Number((gmvTotalBrl * 0.04).toFixed(2)); // 4%
    const marketingFeeBrl = Number((gmvTotalBrl * 0.015).toFixed(2)); // 1.5%
    const technologyFeeBrl = Number((gmvTotalBrl * 0.015).toFixed(2)); // 1.5%
    const totalFranchisorFeesBrl = Number((royaltiesFeeBrl + marketingFeeBrl + technologyFeeBrl).toFixed(2));

    const netFranchiseRevenueBrl = Number((grossRevenuePlatformBrl - totalFranchisorFeesBrl).toFixed(2));

    const localDriverIncentivesBrl = localIncentivesBrl > 0 ? localIncentivesBrl : Number((gmvTotalBrl * 0.012).toFixed(2));
    const localSupportCostsBrl = localSupportBrl > 0 ? localSupportBrl : 3500.0;
    const localMarketingBrl = Number((gmvTotalBrl * 0.008).toFixed(2));
    const localAdministrativeCostsBrl = 4200.0;
    const totalLocalExpensesBrl = Number((localDriverIncentivesBrl + localSupportCostsBrl + localMarketingBrl + localAdministrativeCostsBrl).toFixed(2));

    const ebitdaFranchiseBrl = Number((netFranchiseRevenueBrl - totalLocalExpensesBrl).toFixed(2));
    const netMarginPct = grossRevenuePlatformBrl > 0
      ? Number(((ebitdaFranchiseBrl / grossRevenuePlatformBrl) * 100).toFixed(1))
      : 0;

    return {
      franchiseId,
      cityName,
      uf,
      monthPeriod,
      gmvTotalBrl,
      grossRevenuePlatformBrl,
      royaltiesFeeBrl,
      marketingFeeBrl,
      technologyFeeBrl,
      totalFranchisorFeesBrl,
      netFranchiseRevenueBrl,
      localDriverIncentivesBrl,
      localSupportCostsBrl,
      localMarketingBrl,
      localAdministrativeCostsBrl,
      totalLocalExpensesBrl,
      ebitdaFranchiseBrl,
      netMarginPct
    };
  }
}

export const franchiseFinanceEngine = new FranchiseFinanceEngine();
