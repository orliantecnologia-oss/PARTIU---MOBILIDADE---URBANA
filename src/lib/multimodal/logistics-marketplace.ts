/**
 * PARTIU LOGISTICS MARKETPLACE
 * 
 * Marketplace Logístico Autônomo para Fretes Urbanos, Regionais e Cross-Docking.
 * Controla:
 * - Oferta de transportadores e operadores parceiros
 * - Demanda de encomendas urbanas, expressas, same-day e cargas intermunicipais
 * - Formação dinâmica de preço de frete e liquidação autônoma
 */

export type FreightServiceLevel =
  | 'URBANO_FLASH_60M'
  | 'SAME_DAY_REGIONAL'
  | 'TRANSFERENCIA_INTERMUNICIPAL'
  | 'CROSS_DOCKING_HUB';

export interface FreightQuoteRequest {
  senderId: string;
  senderName: string;
  originCity: string;
  destinationCity: string;
  serviceLevel: FreightServiceLevel;
  weightKg: number;
  volumeLiters: number;
  declaredValueBrl: number;
  distanceKm: number;
  requiresThermalStorage?: boolean | undefined;
}

export interface FreightQuoteResult {
  quoteId: string;
  serviceLevel: FreightServiceLevel;
  distanceKm: number;
  estimatedTransitHours: number;
  basePriceBrl: number;
  weightSurchargeBrl: number;
  urgencyMultiplier: number;
  insuranceFeeBrl: number;
  finalFreightPriceBrl: number;
  carrierPayoutBrl: number;
  platformTakeRateBrl: number;
  validUntil: number;
}

export interface LogisticsCarrier {
  carrierId: string;
  carrierName: string;
  carrierType: 'AUTONOMO_MOTO' | 'AUTONOMO_CARRO' | 'COOPERATIVA_VANS' | 'OPERADOR_FROTA_REGIONAL';
  availableCapacityKg: number;
  coveredCityIds: string[];
  currentHubStationId?: string | undefined;
  ratingScore: number; // 1.0 a 5.0
  totalCompletedDeliveries: number;
  isActive: boolean;
}

export interface ActiveFreightOrder {
  orderId: string;
  quoteId: string;
  senderId: string;
  originCity: string;
  destinationCity: string;
  serviceLevel: FreightServiceLevel;
  weightKg: number;
  volumeLiters: number;
  finalFreightPriceBrl: number;
  assignedCarrierId?: string | undefined;
  carrierName?: string | undefined;
  status: 'SOLICITADO' | 'ALOCADO' | 'EM_CROSS_DOCKING' | 'EM_ROTA' | 'ENTREGUE' | 'CANCELADO';
  createdTimestamp: number;
  deliveredTimestamp?: number | undefined;
}

export interface LogisticsMarketplaceStats {
  totalOrdersCount: number;
  totalGmvFretesBrl: number;
  totalCarrierPayoutBrl: number;
  totalPlatformRevenueBrl: number;
  totalWeightDeliveredKg: number;
  activeCarriersCount: number;
  averageOnTimeDeliveryRatePct: number;
}

export class LogisticsMarketplace {
  private carriers: Map<string, LogisticsCarrier> = new Map();
  private activeOrders: Map<string, ActiveFreightOrder> = new Map();

  constructor() {
    this.initializeDefaultCarriers();
  }

  private initializeDefaultCarriers(): void {
    const defaultCarriers: LogisticsCarrier[] = [
      {
        carrierId: 'CARRIER-COOP-01',
        carrierName: 'Cooperativa TransNoroeste Vans',
        carrierType: 'COOPERATIVA_VANS',
        availableCapacityKg: 1800,
        coveredCityIds: ['itaperuna-rj', 'campos-rj', 'muriae-mg'],
        ratingScore: 4.89,
        totalCompletedDeliveries: 4200,
        isActive: true
      },
      {
        carrierId: 'CARRIER-FLASH-02',
        carrierName: 'Rede Flash Entregas Urbanas',
        carrierType: 'AUTONOMO_MOTO',
        availableCapacityKg: 45,
        coveredCityIds: ['itaperuna-rj', 'campos-rj'],
        ratingScore: 4.94,
        totalCompletedDeliveries: 12850,
        isActive: true
      },
      {
        carrierId: 'CARRIER-FROTA-03',
        carrierName: 'Logística Regional Costa do Sol',
        carrierType: 'OPERADOR_FROTA_REGIONAL',
        availableCapacityKg: 5000,
        coveredCityIds: ['macae-rj', 'cabo-frio-rj', 'campos-rj'],
        ratingScore: 4.78,
        totalCompletedDeliveries: 2310,
        isActive: true
      }
    ];

    defaultCarriers.forEach(c => this.registerCarrier(c));
  }

  public registerCarrier(carrier: LogisticsCarrier): void {
    this.carriers.set(carrier.carrierId, carrier);
  }

  public getCarrier(carrierId: string): LogisticsCarrier | undefined {
    return this.carriers.get(carrierId);
  }

  public getAllCarriers(): LogisticsCarrier[] {
    return Array.from(this.carriers.values());
  }

  /**
   * Realiza cotação dinâmica de frete baseada na distância, cubagem, urgência e SLA
   */
  public quoteFreight(request: FreightQuoteRequest): FreightQuoteResult {
    let baseRate = 15.0;
    let ratePerKm = 0.55;
    let urgencyMultiplier = 1.0;
    let estimatedHours = Math.max(1, Math.round(request.distanceKm / 45));

    switch (request.serviceLevel) {
      case 'URBANO_FLASH_60M':
        baseRate = 12.0;
        ratePerKm = 1.20;
        urgencyMultiplier = 1.45;
        estimatedHours = 1.0;
        break;
      case 'SAME_DAY_REGIONAL':
        baseRate = 25.0;
        ratePerKm = 0.65;
        urgencyMultiplier = 1.20;
        estimatedHours = Math.min(6, Math.max(2, Math.round(request.distanceKm / 40)));
        break;
      case 'TRANSFERENCIA_INTERMUNICIPAL':
        baseRate = 35.0;
        ratePerKm = 0.45;
        urgencyMultiplier = 1.0;
        estimatedHours = Math.max(3, Math.round(request.distanceKm / 50));
        break;
      case 'CROSS_DOCKING_HUB':
        baseRate = 20.0;
        ratePerKm = 0.38;
        urgencyMultiplier = 0.90; // Ganho de escala do hub
        estimatedHours = Math.max(4, Math.round(request.distanceKm / 45) + 2); // +2h de triagem
        break;
    }

    const weightSurcharge = request.weightKg > 5 ? Number(((request.weightKg - 5) * 1.35).toFixed(2)) : 0;
    const insuranceFee = Number((Math.max(1.50, request.declaredValueBrl * 0.003)).toFixed(2));
    const subtotal = (baseRate + (request.distanceKm * ratePerKm) + weightSurcharge) * urgencyMultiplier;
    const finalPrice = Number((subtotal + insuranceFee).toFixed(2));
    const carrierPayout = Number((finalPrice * 0.95).toFixed(2)); // 95% para transportador (take-rate 5%)
    const platformTakeRate = Number((finalPrice - carrierPayout).toFixed(2));

    const quoteId = `FRT-QTE-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return {
      quoteId,
      serviceLevel: request.serviceLevel,
      distanceKm: request.distanceKm,
      estimatedTransitHours: estimatedHours,
      basePriceBrl: baseRate,
      weightSurchargeBrl: weightSurcharge,
      urgencyMultiplier,
      insuranceFeeBrl: insuranceFee,
      finalFreightPriceBrl: finalPrice,
      carrierPayoutBrl: carrierPayout,
      platformTakeRateBrl: platformTakeRate,
      validUntil: Date.now() + 30 * 60 * 1000 // Válido por 30 min
    };
  }

  /**
   * Confirma e cria uma ordem de frete a partir de cotação aprovada
   */
  public createFreightOrder(quote: FreightQuoteResult, senderId: string, originCity: string, destinationCity: string, weightKg: number, volumeLiters: number): ActiveFreightOrder {
    const orderId = `ORD-LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Alocação automática do melhor transportador compatível
    const eligibleCarriers = Array.from(this.carriers.values()).filter(c =>
      c.isActive &&
      c.availableCapacityKg >= weightKg &&
      (c.coveredCityIds.includes(originCity.toLowerCase()) || c.coveredCityIds.includes(destinationCity.toLowerCase()))
    );

    let assignedCarrierId: string | undefined = undefined;
    let carrierName: string | undefined = undefined;

    if (eligibleCarriers.length > 0) {
      eligibleCarriers.sort((a, b) => b.ratingScore - a.ratingScore);
      assignedCarrierId = eligibleCarriers[0]?.carrierId;
      carrierName = eligibleCarriers[0]?.carrierName;
    }

    const order: ActiveFreightOrder = {
      orderId,
      quoteId: quote.quoteId,
      senderId,
      originCity,
      destinationCity,
      serviceLevel: quote.serviceLevel,
      weightKg,
      volumeLiters,
      finalFreightPriceBrl: quote.finalFreightPriceBrl,
      assignedCarrierId,
      carrierName,
      status: assignedCarrierId ? 'ALOCADO' : 'SOLICITADO',
      createdTimestamp: Date.now()
    };

    this.activeOrders.set(orderId, order);
    return order;
  }

  public getOrder(orderId: string): ActiveFreightOrder | undefined {
    return this.activeOrders.get(orderId);
  }

  public getAllOrders(): ActiveFreightOrder[] {
    return Array.from(this.activeOrders.values());
  }

  /**
   * Consolida métricas executivas do marketplace logístico
   */
  public getMarketplaceStats(): LogisticsMarketplaceStats {
    const orders = Array.from(this.activeOrders.values());
    const totalOrdersCount = orders.length;
    const totalGmvFretesBrl = Number(orders.reduce((sum, o) => sum + o.finalFreightPriceBrl, 0).toFixed(2));
    const totalCarrierPayoutBrl = Number((totalGmvFretesBrl * 0.85).toFixed(2));
    const totalPlatformRevenueBrl = Number((totalGmvFretesBrl - totalCarrierPayoutBrl).toFixed(2));
    const totalWeightDeliveredKg = orders.reduce((sum, o) => sum + o.weightKg, 0);

    return {
      totalOrdersCount,
      totalGmvFretesBrl,
      totalCarrierPayoutBrl,
      totalPlatformRevenueBrl,
      totalWeightDeliveredKg,
      activeCarriersCount: Array.from(this.carriers.values()).filter(c => c.isActive).length,
      averageOnTimeDeliveryRatePct: 98.4
    };
  }
}

export const logisticsMarketplace = new LogisticsMarketplace();
