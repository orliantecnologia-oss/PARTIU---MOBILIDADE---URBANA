/**
 * PARTIU LOCAL ADS MARKETPLACE
 * 
 * Marketplace de Publicidade Hiperlocal para o Comércio Regional.
 * Monetiza a atenção dos passageiros direcionando fluxo para o comércio de cada cidade.
 */

import { LocalAdCampaign, adsAuctionEngine, AdAuctionBidResult } from './ads-auction-engine';
import { adsTargetingEngine } from './ads-targeting-engine';
import { adsBillingEngine } from './ads-billing-engine';
import { adsAnalyticsEngine, CampaignPerformanceMetrics } from './ads-analytics';

export interface LocalBusinessScoreReport {
  advertiserId: string;
  businessName: string;
  category: LocalAdCampaign['category'];
  clickThroughRatePct: number;
  conversionRatePct: number;
  roasMultiplier: number;
  retentionRatePct: number;
  localBusinessScore: number; // 0 a 100
  rating: 'ALTO_RETORNO' | 'DESEMPENHO_POSITIVO' | 'OTIMIZACAO_NECESSARIA';
}

export class AdsMarketplace {
  private campaigns: Map<string, LocalAdCampaign> = new Map();

  constructor() {
    this.initializeDefaultCampaigns();
  }

  private initializeDefaultCampaigns(): void {
    const defaultAds: LocalAdCampaign[] = [
      {
        campaignId: 'AD-FAR-01',
        advertiserId: 'ADV-FARMA-CENTRAL',
        businessName: 'Farmácia Central Popular',
        category: 'FARMACIA',
        cityId: 'itaperuna-rj',
        headline: 'Medicamentos com 20% OFF no PIX',
        descriptionText: 'Apresente este voucher do PARTIU e garanta entrega grátis e desconto!',
        callToActionUrl: 'https://farmaciacentralita.com.br/partiu',
        pricingModel: 'CPC',
        maxBidBrl: 1.80,
        dailyBudgetBrl: 150.0,
        currentDaySpendBrl: 42.0,
        targetLatitude: -21.2056,
        targetLongitude: -41.8872,
        maxRadiusKm: 6.0,
        isActive: true
      },
      {
        campaignId: 'AD-POS-02',
        advertiserId: 'ADV-POSTO-VINHOSA',
        businessName: 'Posto Petrobrás Vinhosa',
        category: 'POSTO_COMBUSTIVEL',
        cityId: 'itaperuna-rj',
        headline: 'Gasolina e Etanol com R$ 0,15 de Desconto por Litro',
        descriptionText: 'Exclusivo para motoristas e passageiros PARTIU cadastrados.',
        callToActionUrl: 'https://postovinhosa.com.br/partiu-desconto',
        pricingModel: 'CPA',
        maxBidBrl: 6.50,
        dailyBudgetBrl: 250.0,
        currentDaySpendBrl: 65.0,
        targetLatitude: -21.2189,
        targetLongitude: -41.9012,
        maxRadiusKm: 8.0,
        isActive: true
      },
      {
        campaignId: 'AD-RES-03',
        advertiserId: 'ADV-REST-MACAE',
        businessName: 'Restaurante e Frutos do Mar Cavaleiros',
        category: 'RESTAURANTE',
        cityId: 'macae-rj',
        headline: 'Almoço Executivo na Orla dos Cavaleiros',
        descriptionText: 'Venha de PARTIU e ganhe uma sobremesa cortesia no almoço.',
        callToActionUrl: 'https://cavaleirosrest.com.br/promocao-partiu',
        pricingModel: 'CPM',
        maxBidBrl: 18.0,
        dailyBudgetBrl: 180.0,
        currentDaySpendBrl: 54.0,
        targetLatitude: -22.408,
        targetLongitude: -41.772,
        maxRadiusKm: 5.0,
        isActive: true
      }
    ];

    defaultAds.forEach(ad => this.registerCampaign(ad));
  }

  public registerCampaign(campaign: LocalAdCampaign): void {
    this.campaigns.set(campaign.campaignId, campaign);
    if (!adsBillingEngine.getAccount(campaign.advertiserId)) {
      adsBillingEngine.registerAdvertiser(campaign.advertiserId, campaign.businessName, '00.000.000/0001-00', 500.0);
    }
  }

  public getCampaign(campaignId: string): LocalAdCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  public getAllCampaigns(): LocalAdCampaign[] {
    return Array.from(this.campaigns.values());
  }

  /**
   * Serve o melhor anúncio para o passageiro com base em sua rota e leilão em tempo real
   */
  public serveTargetedAd(
    cityId: string,
    passengerLat: number,
    passengerLng: number,
    categoryFilter?: LocalAdCampaign['category']
  ): AdAuctionBidResult | null {
    const all = Array.from(this.campaigns.values());
    const eligible = adsTargetingEngine.filterEligibleCampaigns(all, cityId, passengerLat, passengerLng, categoryFilter);

    if (eligible.length === 0) return null;

    const firstCampaign = eligible[0]!;
    const dist = adsTargetingEngine.calculateDistanceKm(passengerLat, passengerLng, firstCampaign.targetLatitude, firstCampaign.targetLongitude);
    const auctionResult = adsAuctionEngine.executeAuction(eligible, dist);

    if (auctionResult) {
      // Registra impressão e debita custo
      adsAnalyticsEngine.recordImpression(auctionResult.winnerCampaign.campaignId, auctionResult.effectivePriceBrl);
      adsBillingEngine.chargeAdEvent(auctionResult.winnerCampaign.advertiserId, auctionResult.effectivePriceBrl, 'Impressão servida');
    }

    return auctionResult;
  }

  /**
   * Calcula o Local Business Score para o comércio anunciante
   */
  public calculateLocalBusinessScore(campaignId: string): LocalBusinessScoreReport {
    const campaign = this.campaigns.get(campaignId);
    const name = campaign?.businessName || 'Comércio Local Anunciante';
    const category = campaign?.category || 'LOJA';
    const metrics = adsAnalyticsEngine.getCampaignMetrics(campaignId, name);

    // Score: CTR (30%), Conversão (30%), ROAS (25%), Retenção estimada (15%)
    const scoreCtr = Math.min(30, (metrics.clickThroughRatePct / 5.0) * 30);
    const scoreConv = Math.min(30, (metrics.conversionRatePct / 25.0) * 30);
    const scoreRoas = Math.min(25, (metrics.returnOnAdSpendMultiplier / 6.0) * 25);
    const retentionRatePct = 78.5;
    const scoreRet = (retentionRatePct / 100) * 15;

    const localBusinessScore = Math.min(100, Math.round(scoreCtr + scoreConv + scoreRoas + scoreRet));

    let rating: LocalBusinessScoreReport['rating'] = 'DESEMPENHO_POSITIVO';
    if (localBusinessScore >= 85) rating = 'ALTO_RETORNO';
    else if (localBusinessScore < 60) rating = 'OTIMIZACAO_NECESSARIA';

    return {
      advertiserId: campaign?.advertiserId || 'ADV-DEFAULT',
      businessName: name,
      category,
      clickThroughRatePct: metrics.clickThroughRatePct,
      conversionRatePct: metrics.conversionRatePct,
      roasMultiplier: metrics.returnOnAdSpendMultiplier,
      retentionRatePct,
      localBusinessScore,
      rating
    };
  }
}

export const adsMarketplace = new AdsMarketplace();
