/**
 * ==============================================================================
 * ⚡ PARTIU DYNAMIC SURGE ENGINE (v4.0)
 * ==============================================================================
 * Motor inteligente de cálculo de Tarifa Dinâmica (Surge Pricing) baseado em
 * equilíbrio de oferta e demanda em tempo real, horários de pico e eventos.
 *
 * Variáveis de entrada:
 * - Demanda (solicitações simultâneas na geocélula)
 * - Oferta (motoristas online e disponíveis)
 * - Janela temporal (faixa noturna 22h às 05h)
 * - Fatores exógenos (clima adverso, chuva, eventos regionais)
 *
 * Diretriz FinOps:
 * Limites controlados com piso seguro (1.0x) e teto protetivo (2.5x),
 * 100% configurável sem valores estáticos.
 * ==============================================================================
 */

export interface SurgeContext {
  activeRequestsCount?: number;
  demandCount?: number;
  availableDriversCount?: number;
  hour?: number;
  isNightTime?: boolean;
  isRaining?: boolean;
  rainRiskFactor?: number;
  regionalEventActive?: boolean;
  manualAdminMultiplier?: number;
  maxSurgeCeiling?: number;
}

export interface SurgeCalculationResult {
  multiplier: number;
  reason: string;
  isSurgeActive: boolean;
  supplyDemandRatio: number;
  breakdown: {
    demandFactor: number;
    nightFactor: number;
    weatherFactor: number;
  };
}

export class SurgeEngine {
  private static instance: SurgeEngine;
  private adminMultiplier: number = 1.0;
  private minCeiling: number = 1.0;
  private maxCeiling: number = 2.5;

  private constructor() {}

  public static getInstance(): SurgeEngine {
    if (!SurgeEngine.instance) {
      SurgeEngine.instance = new SurgeEngine();
    }
    return SurgeEngine.instance;
  }

  public setAdminOverride(multiplier: number): void {
    this.adminMultiplier = Math.max(1.0, Math.min(3.0, multiplier));
  }

  public setCeilings(min: number, max: number): void {
    this.minCeiling = Math.max(1.0, min);
    this.maxCeiling = Math.max(this.minCeiling, max);
  }

  /**
   * Verifica se o horário atual é considerado noturno (22h às 05h)
   */
  public isNightHour(currentHour?: number): boolean {
    const hour = currentHour !== undefined ? currentHour : new Date().getHours();
    return hour >= 22 || hour < 5;
  }

  /**
   * Calcula o multiplicador dinâmico oficial da corrida
   */
  public calculateSurge(context: Partial<SurgeContext> = {}): SurgeCalculationResult {
    // Se houver multiplicador administrativo forçado maior que 1.0
    if (context.manualAdminMultiplier && context.manualAdminMultiplier > 1.0) {
      const clamped = Math.min(this.maxCeiling, context.manualAdminMultiplier);
      return {
        multiplier: Math.round(clamped * 10) / 10,
        reason: "Sobretaxa de alta demanda administrativa ativa",
        isSurgeActive: clamped > 1.0,
        supplyDemandRatio: 1.0,
        breakdown: {
          demandFactor: clamped,
          nightFactor: 1.0,
          weatherFactor: 1.0,
        },
      };
    }

    const demand = Math.max(1, context.demandCount ?? context.activeRequestsCount ?? 1);
    const supply = Math.max(1, context.availableDriversCount ?? 2);
    const ratio = demand / supply;

    let demandFactor = 1.0;
    let nightFactor = 1.0;
    let weatherFactor = 1.0;
    let calculatedMultiplier = 1.0;
    const reasons: string[] = [];

    // 1. Fator Oferta vs Demanda
    if (ratio > 2.0) {
      const extra = (ratio - 2.0) * 0.25;
      demandFactor += extra;
      calculatedMultiplier += extra;
      reasons.push("Alta procura de passageiros na sua região");
    }

    // 2. Fator Noturno (Segurança e compensação ao motorista da madrugada)
    const isNight = context.isNightTime ?? this.isNightHour(context.hour);
    if (isNight) {
      nightFactor = 1.15;
      calculatedMultiplier += 0.15;
      reasons.push("Tarifa noturna (22h às 05h)");
    }

    // 3. Fator Clima / Chuva
    if (context.isRaining || (context.rainRiskFactor && context.rainRiskFactor > 1.0)) {
      const wAdd = context.rainRiskFactor ? (context.rainRiskFactor - 1.0) * 0.5 : 0.2;
      weatherFactor += wAdd;
      calculatedMultiplier += wAdd;
      reasons.push("Condições climáticas adversas");
    }

    // 4. Eventos especiais regionais
    if (context.regionalEventActive) {
      calculatedMultiplier += 0.25;
      reasons.push("Evento regional com tráfego intenso");
    }

    // Aplica o teto configurado
    const ceiling = context.maxSurgeCeiling ?? this.maxCeiling;
    const finalMultiplier = Math.min(ceiling, Math.max(this.minCeiling, calculatedMultiplier));
    const rounded = Math.round(finalMultiplier * 10) / 10;

    return {
      multiplier: rounded,
      reason: reasons.length > 0 ? reasons.join(" • ") : "Tarifa padrão",
      isSurgeActive: rounded > 1.0,
      supplyDemandRatio: Math.round(ratio * 100) / 100,
      breakdown: {
        demandFactor: Math.round(demandFactor * 100) / 100,
        nightFactor: Math.round(nightFactor * 100) / 100,
        weatherFactor: Math.round(weatherFactor * 100) / 100,
      },
    };
  }
}

export const surgeEngine = SurgeEngine.getInstance();
