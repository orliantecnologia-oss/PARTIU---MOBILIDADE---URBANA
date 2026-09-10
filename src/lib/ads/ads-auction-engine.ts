/**
 * PARTIU LOCAL ADS AUCTION ENGINE
 * 
 * Motor de Leilão em Tempo Real (RTB - Real-Time Bidding) para Mídia Hiperlocal.
 * Modos suportados:
 * - CPM (Custo por Mil Impressões)
 * - CPC (Custo por Clique)
 * - CPA (Custo por Ação / Corrida concluída até o local)
 * - PATROCINIO (Ponto de Interesse fixo no mapa)
 */

export type AdPricingModel = 'CPM' | 'CPC' | 'CPA' | 'PATROCINIO';

export interface LocalAdCampaign {
  campaignId: string;
  advertiserId: string;
  businessName: string;
  category: 'FARMACIA' | 'MERCADO' | 'RESTAURANTE' | 'POSTO_COMBUSTIVEL' | 'CLINICA' | 'UNIVERSIDADE' | 'LOJA';
  cityId: string;
  headline: string;
  descriptionText: string;
  callToActionUrl: string;
  pricingModel: AdPricingModel;
  maxBidBrl: number; // Lance máximo
  dailyBudgetBrl: number;
  currentDaySpendBrl: number;
  targetLatitude: number;
  targetLongitude: number;
  maxRadiusKm: number;
  isActive: boolean;
}

export interface AdAuctionBidResult {
  winnerCampaign: LocalAdCampaign;
  effectivePriceBrl: number;
  pricingModel: AdPricingModel;
  relevanceScore: number;
  auctionTimestamp: number;
}

export class AdsAuctionEngine {
  /**
   * Executa leilão de segundo preço ponderado por relevância e proximidade
   */
  public executeAuction(
    eligibleCampaigns: LocalAdCampaign[],
    passengerDistanceToAdKm: number,
    pricingModelPreference?: AdPricingModel
  ): AdAuctionBidResult | null {
    if (eligibleCampaigns.length === 0) return null;

    // Filtra campanhas que ainda têm saldo diário
    const validCampaigns = eligibleCampaigns.filter(c =>
      c.isActive && c.currentDaySpendBrl < c.dailyBudgetBrl
    );

    if (validCampaigns.length === 0) return null;

    // Calcula Score de Leilão: eCPM equivalente + Proximidade
    const scored = validCampaigns.map(c => {
      // Normaliza lance para eCPM
      let ecpm = c.maxBidBrl;
      if (c.pricingModel === 'CPC') ecpm = c.maxBidBrl * 0.045 * 1000; // CTR estimado 4.5%
      else if (c.pricingModel === 'CPA') ecpm = c.maxBidBrl * 0.015 * 1000; // Taxa conversão estimada 1.5%

      // Bônus de proximidade (quanto mais perto do estabelecimento, maior o score)
      const proximityFactor = Math.max(0.2, 1.0 - (passengerDistanceToAdKm / Math.max(1, c.maxRadiusKm)));
      const relevanceScore = ecpm * proximityFactor;

      return { campaign: c, ecpm, relevanceScore };
    });

    // Ordena por score decrescente
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const winner = scored[0]!;

    // Segundo preço (Vickrey Auction): paga o lance do segundo colocado + R$ 0.05
    const secondPrice = scored.length > 1
      ? Math.min(winner.campaign.maxBidBrl, scored[1]!.campaign.maxBidBrl + 0.05)
      : winner.campaign.maxBidBrl * 0.85;

    const effectivePriceBrl = Number(Math.max(0.10, secondPrice).toFixed(2));

    return {
      winnerCampaign: winner.campaign,
      effectivePriceBrl,
      pricingModel: winner.campaign.pricingModel,
      relevanceScore: Number(winner.relevanceScore.toFixed(2)),
      auctionTimestamp: Date.now()
    };
  }
}

export const adsAuctionEngine = new AdsAuctionEngine();
