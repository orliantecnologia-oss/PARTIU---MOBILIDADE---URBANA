/**
 * ==============================================================================
 * 💰 PARTIU FARE CALCULATION ENGINE (v1.0) — UBER / 99 STANDARD
 * ==============================================================================
 * Motor determinístico de precificação dinâmica por categoria e cidade polo.
 * Opera estritamente em Minor Units (centavos inteiros) com integração direta
 * ao Double-Entry Bookkeeping Ledger e multiplicador de alta demanda (Surge).
 * ==============================================================================
 */

export interface FareRule {
  categoryId: string;
  categoryName: string;
  cityCode: string;
  baseFareCents: number;
  perKmFareCents: number;
  perMinuteFareCents: number;
  minFareCents: number;
  cancellationFeeCents: number;
  platformFeePercent: number;
}

export interface FareCalculationParams {
  categoryId: string;
  cityCode?: string;
  distanceKm: number;
  durationMinutes: number;
  surgeMultiplier?: number;
  stopsCount?: number;
}

export interface FareCalculationResult {
  categoryId: string;
  cityCode: string;
  totalCents: number;
  totalBrl: number;
  baseFareCents: number;
  distanceCents: number;
  durationCents: number;
  stopsCents: number;
  stopsCount: number;
  minFareCents: number;
  cancellationFeeCents: number;
  surgeMultiplier: number;
  formattedPrice: string;
}

export const DEFAULT_FARE_RULES: Record<string, FareRule> = {
  POP: {
    categoryId: "POP",
    categoryName: "Partiu Carro Pop",
    cityCode: "BR-RJ-ITAPERUNA",
    baseFareCents: 450, // R$ 4,50
    perKmFareCents: 140, // R$ 1,40 / km
    perMinuteFareCents: 25, // R$ 0,25 / min
    minFareCents: 750, // R$ 7,50
    cancellationFeeCents: 500, // R$ 5,00
    platformFeePercent: 15.0,
  },
  CARRO: {
    categoryId: "CARRO",
    categoryName: "Partiu Carro Pop",
    cityCode: "BR-RJ-ITAPERUNA",
    baseFareCents: 450,
    perKmFareCents: 140,
    perMinuteFareCents: 25,
    minFareCents: 750,
    cancellationFeeCents: 500,
    platformFeePercent: 15.0,
  },
  MOTO: {
    categoryId: "MOTO",
    categoryName: "Partiu Moto",
    cityCode: "BR-RJ-ITAPERUNA",
    baseFareCents: 300, // R$ 3,00
    perKmFareCents: 95, // R$ 0,95 / km
    perMinuteFareCents: 18, // R$ 0,18 / min
    minFareCents: 500, // R$ 5,00
    cancellationFeeCents: 400, // R$ 4,00
    platformFeePercent: 12.0,
  },
  CONFORT: {
    categoryId: "CONFORT",
    categoryName: "Partiu Confort / Executivo",
    cityCode: "BR-RJ-ITAPERUNA",
    baseFareCents: 650, // R$ 6,50
    perKmFareCents: 185, // R$ 1,85 / km
    perMinuteFareCents: 35, // R$ 0,35 / min
    minFareCents: 1000, // R$ 10,00
    cancellationFeeCents: 700, // R$ 7,00
    platformFeePercent: 18.0,
  },
  EXECUTIVO: {
    categoryId: "EXECUTIVO",
    categoryName: "Partiu Confort / Executivo",
    cityCode: "BR-RJ-ITAPERUNA",
    baseFareCents: 650,
    perKmFareCents: 185,
    perMinuteFareCents: 35,
    minFareCents: 1000,
    cancellationFeeCents: 700,
    platformFeePercent: 18.0,
  },
  VAN: {
    categoryId: "VAN",
    categoryName: "Partiu Van Coletiva",
    cityCode: "BR-RJ-ITAPERUNA",
    baseFareCents: 500, // R$ 5,00
    perKmFareCents: 80, // R$ 0,80 / km
    perMinuteFareCents: 10, // R$ 0,10 / min
    minFareCents: 500, // R$ 5,00
    cancellationFeeCents: 300, // R$ 3,00
    platformFeePercent: 10.0,
  },
  ENTREGA: {
    categoryId: "ENTREGA",
    categoryName: "Partiu Flash / Encomendas",
    cityCode: "BR-RJ-ITAPERUNA",
    baseFareCents: 400, // R$ 4,00
    perKmFareCents: 110, // R$ 1,10 / km
    perMinuteFareCents: 20, // R$ 0,20 / min
    minFareCents: 600, // R$ 6,00
    cancellationFeeCents: 400, // R$ 4,00
    platformFeePercent: 12.0,
  },
  FLASH: {
    categoryId: "FLASH",
    categoryName: "Partiu Flash / Encomendas",
    cityCode: "BR-RJ-ITAPERUNA",
    baseFareCents: 400,
    perKmFareCents: 110,
    perMinuteFareCents: 20,
    minFareCents: 600,
    cancellationFeeCents: 400,
    platformFeePercent: 12.0,
  },
};

export class FareCalculationEngine {
  private static instance: FareCalculationEngine;
  private customRules: Map<string, FareRule> = new Map();

  private constructor() {
    Object.values(DEFAULT_FARE_RULES).forEach((rule) => {
      this.customRules.set(`${rule.cityCode}:${rule.categoryId.toUpperCase()}`, rule);
    });
  }

  public static getInstance(): FareCalculationEngine {
    if (!FareCalculationEngine.instance) {
      FareCalculationEngine.instance = new FareCalculationEngine();
    }
    return FareCalculationEngine.instance;
  }

  public setFareRule(rule: FareRule): void {
    const key = `${rule.cityCode}:${rule.categoryId.toUpperCase()}`;
    this.customRules.set(key, rule);
  }

  public getFareRule(categoryId: string, cityCode = "BR-RJ-ITAPERUNA"): FareRule {
    const normCat = (categoryId || "POP").toUpperCase();
    const key = `${cityCode}:${normCat}`;
    if (this.customRules.has(key)) {
      return this.customRules.get(key)!;
    }
    if (DEFAULT_FARE_RULES[normCat]) {
      return DEFAULT_FARE_RULES[normCat];
    }
    return DEFAULT_FARE_RULES.POP;
  }

  /**
   * Calcula o valor da corrida em centavos e reais baseado na fórmula padrão 99/Uber:
   * valor = max(base + (km * perKm) + (min * perMin), minFare) * surge
   */
  public calculateFare(params: FareCalculationParams): FareCalculationResult {
    const cityCode = params.cityCode || "BR-RJ-ITAPERUNA";
    const rule = this.getFareRule(params.categoryId, cityCode);
    const surge = Math.max(1.0, params.surgeMultiplier ?? 1.0);

    const safeDistanceKm = Math.max(0, params.distanceKm);
    const safeDurationMinutes = Math.max(0, params.durationMinutes);
    const stopsCount = Math.max(0, params.stopsCount || 0);
    const stopsCents = stopsCount * 250; // R$ 2,50 por parada intermediária

    const distanceCents = Math.round(safeDistanceKm * rule.perKmFareCents);
    const durationCents = Math.round(safeDurationMinutes * rule.perMinuteFareCents);
    const subtotalCents = rule.baseFareCents + distanceCents + durationCents + stopsCents;

    // Aplicação da tarifa mínima da categoria
    const withMinCents = Math.max(subtotalCents, rule.minFareCents);

    // Aplicação do multiplicador dinâmico de tarifa
    const totalCents = Math.round(withMinCents * surge);
    const totalBrl = Math.round(totalCents) / 100;

    return {
      categoryId: rule.categoryId,
      cityCode: rule.cityCode,
      totalCents,
      totalBrl,
      baseFareCents: rule.baseFareCents,
      distanceCents,
      durationCents,
      stopsCents,
      stopsCount,
      minFareCents: rule.minFareCents,
      cancellationFeeCents: rule.cancellationFeeCents,
      surgeMultiplier: surge,
      formattedPrice: this.formatCurrency(totalBrl),
    };
  }

  public formatCurrency(valueBrl: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valueBrl);
  }
}

export const fareCalculationEngine = FareCalculationEngine.getInstance();
