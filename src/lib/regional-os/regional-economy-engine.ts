/**
 * PARTIU REGIONAL ECONOMY ENGINE
 * 
 * Modelagem Econômica da Circulação Monetária Local e Riqueza Retida.
 * Audita o impacto socioeconômico da plataforma ao reter capital no município e cooperativas.
 */

export interface RegionalEconomyMetrics {
  cityId: string;
  cityName: string;
  monthlyGmvBrl: number;
  driverEarningsRetainedBrl: number;
  localCommerceSpendFromAdsBrl: number;
  franchiseLocalProfitBrl: number;
  totalWealthRetainedLocallyBrl: number;
  wealthRetentionRatePct: number;
  regionalKeynesianMultiplier: number;
  directJobsSupportedCount: number;
}

export class RegionalEconomyEngine {
  /**
   * Avalia a circulação e retenção de riqueza gerada pelo ecossistema na cidade
   */
  public evaluateLocalEconomy(
    cityId: string,
    cityName: string,
    monthlyGmvBrl: number,
    activeDriversCount: number
  ): RegionalEconomyMetrics {
    // 88% do GMV fica diretamente com os motoristas locais
    const driverEarningsRetainedBrl = Number((monthlyGmvBrl * 0.88).toFixed(2));
    
    // Gasto induzido no comércio local (alimentação, postos, manutenção) via Ads e parcerias
    const localCommerceSpendFromAdsBrl = Number((monthlyGmvBrl * 0.085).toFixed(2));
    
    // Lucro da franquia local reinvestido no município
    const franchiseLocalProfitBrl = Number((monthlyGmvBrl * 0.035).toFixed(2));

    const totalWealthRetainedLocallyBrl = Number((driverEarningsRetainedBrl + localCommerceSpendFromAdsBrl + franchiseLocalProfitBrl).toFixed(2));
    const wealthRetentionRatePct = Number(((totalWealthRetainedLocallyBrl / monthlyGmvBrl) * 100).toFixed(1));

    // Multiplicador Econômico Regional: cada R$ 1,00 movimentado circula gerando R$ 1,68 no comércio local
    const regionalKeynesianMultiplier = 1.68;
    const directJobsSupportedCount = Math.round(activeDriversCount * 1.25); // Motoristas + operadores + suporte local

    return {
      cityId,
      cityName,
      monthlyGmvBrl,
      driverEarningsRetainedBrl,
      localCommerceSpendFromAdsBrl,
      franchiseLocalProfitBrl,
      totalWealthRetainedLocallyBrl,
      wealthRetentionRatePct,
      regionalKeynesianMultiplier,
      directJobsSupportedCount
    };
  }
}

export const regionalEconomyEngine = new RegionalEconomyEngine();
