/**
 * PARTIU MOBILITY FOUNDATION MODEL
 * 
 * Modelo fundacional de representação vetorial unificada do estado nacional do marketplace.
 * Gera embeddings operacionais densos em 32 dimensões (Float32Array) que alimentam todos os agentes autônomos.
 */

export interface MarketplaceRawState {
  cityId: string;
  cityName: string;
  activeOnlineDrivers: number;
  busyDriversCount: number;
  waitingPassengersCount: number;
  activeTripsCount: number;
  averageEtaMinutes: number;
  acceptanceRatePct: number;
  cancellationRatePct: number;
  currentSurgeMultiplier: number;
  platformTakeRatePct: number; // ex: 5% (modelo híbrido)
  dailyRevenueBrl: number;
  liquidityRatio: number; // drivers / passengers
  clima: 'LIMPO' | 'CHUVA_LEVE' | 'CHUVA_MODERADA' | 'TEMPESTADE';
  eventosAtivosCount: number;
  acidentesViariosCount: number;
  cityHealthScore: number; // 0 a 100
  nationalHealthScore: number; // 0 a 100
  driverChurnRiskAvg: number; // 0.0 a 1.0
  fraudAttempts24h: number;
  hotspotMaxDeficitRatio: number;
  timestamp: number;
}

export interface MarketplaceStateVector {
  cityId: string;
  cityName: string;
  timestamp: number;
  embedding: Float32Array; // 32 dimensões normalizadas
  featuresNamed: Record<string, number>;
}

export class MobilityFoundationModel {
  private static readonly DIMENSIONS = 32;

  /**
   * Converte o estado bruto operacional em um vetor de embedding latente de 32 dimensões normalizadas
   */
  public encode(state: MarketplaceRawState): MarketplaceStateVector {
    const v = new Float32Array(MobilityFoundationModel.DIMENSIONS);
    const date = new Date(state.timestamp || Date.now());

    // 0-3: Oferta e Demanda
    v[0] = Math.min(1.0, state.activeOnlineDrivers / 500.0);
    v[1] = Math.min(1.0, state.busyDriversCount / Math.max(1, state.activeOnlineDrivers));
    v[2] = Math.min(1.0, state.waitingPassengersCount / 100.0);
    v[3] = Math.min(1.0, state.activeTripsCount / 300.0);

    // 4-7: Qualidade de Serviço e Eficiência
    v[4] = Math.min(1.0, state.averageEtaMinutes / 15.0);
    v[5] = state.acceptanceRatePct / 100.0;
    v[6] = Math.min(1.0, state.cancellationRatePct / 25.0);
    v[7] = Math.min(1.0, state.liquidityRatio / 4.0);

    // 8-11: Precificação, Economia e Margem
    v[8] = (state.currentSurgeMultiplier - 1.0) / 1.5; // 1.0 a 2.5 -> 0.0 a 1.0
    v[9] = state.platformTakeRatePct / 25.0; // 0% a 25%
    v[10] = Math.min(1.0, state.dailyRevenueBrl / 25000.0);
    v[11] = Math.min(1.0, (state.dailyRevenueBrl * (state.platformTakeRatePct / 100.0)) / 4000.0);

    // 12-15: Fatores Temporais e Sazonalidade
    v[12] = date.getHours() / 24.0;
    v[13] = date.getDay() / 7.0;
    v[14] = (date.getHours() >= 7 && date.getHours() <= 9) || (date.getHours() >= 17 && date.getHours() <= 19) ? 1.0 : 0.0;
    v[15] = date.getDay() === 5 || date.getDay() === 6 ? 1.0 : 0.0; // Fim de semana

    // 16-19: Fatores Ambientais e Choques Externos
    v[16] = state.clima === 'TEMPESTADE' ? 1.0 : state.clima === 'CHUVA_MODERADA' ? 0.65 : state.clima === 'CHUVA_LEVE' ? 0.3 : 0.0;
    v[17] = Math.min(1.0, state.eventosAtivosCount / 5.0);
    v[18] = Math.min(1.0, state.acidentesViariosCount / 4.0);
    v[19] = Math.min(1.0, state.hotspotMaxDeficitRatio / 3.0);

    // 20-23: Saúde e Governança do Ecossistema
    v[20] = state.cityHealthScore / 100.0;
    v[21] = state.nationalHealthScore / 100.0;
    v[22] = state.driverChurnRiskAvg;
    v[23] = Math.min(1.0, state.fraudAttempts24h / 20.0);

    // 24-31: Interações Não-Lineares / Projeções Latentes
    v[24] = v[0] * v[2]; // Pressão conjunta de oferta x passageiros
    v[25] = v[4] * v[6]; // Risco combinado de ETA x cancelamento
    v[26] = v[8] * v[16]; // Sensibilidade de Surge com chuva
    v[27] = (1.0 - v[5]) * v[20]; // Rejeição de viagens ponderada pela saúde
    v[28] = v[1] * v[9]; // Ocupação ponderada pelo take-rate
    v[29] = v[22] * (1.0 - v[0]); // Churn amplificado por baixa frota
    v[30] = Math.sin((v[12] * Math.PI * 2)); // Ciclo circadiano contínuo seno
    v[31] = Math.cos((v[12] * Math.PI * 2)); // Ciclo circadiano contínuo cosseno

    const featuresNamed: Record<string, number> = {
      ofertaRelativa: Number(v[0].toFixed(3)),
      pressaoEspera: Number(v[2].toFixed(3)),
      etaNormalizado: Number(v[4].toFixed(3)),
      surgeNormalizado: Number(v[8].toFixed(3)),
      impactoClima: Number(v[16].toFixed(3)),
      cityHealthNormalizado: Number(v[20].toFixed(3)),
      nationalHealthNormalizado: Number(v[21].toFixed(3)),
      riscoChurn: Number(v[22].toFixed(3)),
      riscoFraude: Number(v[23].toFixed(3))
    };

    return {
      cityId: state.cityId,
      cityName: state.cityName,
      timestamp: state.timestamp || Date.now(),
      embedding: v,
      featuresNamed
    };
  }

  /**
   * Calcula a similaridade de cosseno entre dois estados do marketplace
   */
  public cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      const valA = a[i] ?? 0;
      const valB = b[i] ?? 0;
      dot += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? Number((dot / denom).toFixed(4)) : 1.0;
  }
}

export const mobilityFoundationModel = new MobilityFoundationModel();
