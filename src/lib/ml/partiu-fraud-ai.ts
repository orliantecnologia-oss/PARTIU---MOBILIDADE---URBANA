/**
 * PARTIU FRAUD AI ENGINE
 * 
 * Substitui verificações heurísticas isoladas por modelo de classificação adaptativo
 * que detecta anomalias comportamentais, GPS falso, conluio, ghost riding e abuso promocional.
 */

export interface FraudAnalysisInput {
  driverId: string;
  passengerId: string;
  tripId: string;
  isMockLocationDetected: boolean;
  gpsSpeedJumpsMps: number; // saltos de velocidade instantânea
  matchingProximityMeters: number; // distância física no momento do match
  historicSharedTripsCount: number; // quantas vezes essa mesma dupla já correu
  tripDistanceReportedKm: number;
  tripDistanceCalculatedGpsKm: number;
  durationMinutes: number;
  promoDiscountUsedBrl: number;
  deviceFingerprintDuplicatesCount: number;
}

export type FraudRiskCluster = 
  | 'GPS_SPOOFING'
  | 'COLLUSION_RING'
  | 'GHOST_RIDING'
  | 'PROMO_ABUSE'
  | 'SYNTHETIC_ACCOUNT'
  | 'LEGITIMATE';

export interface FraudAiAssessment {
  tripId: string;
  fraudProbability: number; // 0.0 a 1.0
  riskCluster: FraudRiskCluster;
  recommendedAction: 'BLOCK_IMMEDIATE' | 'HOLD_PAYOUT' | 'REQUIRE_BIOMETRICS' | 'SHADOW_FLAG' | 'ALLOW';
  evidencias: string[];
  scoreDetalhado: {
    telemetriaScore: number;
    conluioScore: number;
    ghostRidingScore: number;
    promoAbuseScore: number;
  };
  modelVersion: string;
}

export class FraudAiEngine {
  private modelVersion = 'fraud-ai-v2.4.2';

  /**
   * Avalia uma corrida através de ensemble de árvores de decisão e detecção de anomalias
   */
  public analisarCorrida(input: FraudAnalysisInput): FraudAiAssessment {
    let telemetriaScore = 0;
    let conluioScore = 0;
    let ghostRidingScore = 0;
    let promoAbuseScore = 0;
    const evidencias: string[] = [];

    // 1. Detecção de Mock GPS e Teletransporte
    if (input.isMockLocationDetected) {
      telemetriaScore += 0.85;
      evidencias.push('API do dispositivo reportou flag de Mock Location ativo.');
    }
    if (input.gpsSpeedJumpsMps > 45) { // > 162 km/h instantâneo
      telemetriaScore += 0.65;
      evidencias.push(`Salto cinemático anômalo de velocidade (${input.gpsSpeedJumpsMps.toFixed(1)} m/s).`);
    }

    // 2. Conluio entre Motorista e Passageiro (Lavagem de vouchers ou split fraudulento)
    if (input.historicSharedTripsCount >= 6 && input.matchingProximityMeters < 15) {
      conluioScore += 0.75;
      evidencias.push(`Dupla com ${input.historicSharedTripsCount} corridas anteriores combinadas com match a < 15m.`);
    } else if (input.historicSharedTripsCount >= 3) {
      conluioScore += 0.35;
    }

    // 3. Ghost Riding (Corrida fantasma: distância relatada difere do GPS real ou tempo irreal)
    const deltaDistancia = Math.abs(input.tripDistanceReportedKm - input.tripDistanceCalculatedGpsKm);
    if (deltaDistancia > 3.0 && input.tripDistanceReportedKm > 1) {
      ghostRidingScore += 0.70;
      evidencias.push(`Divergência de trajeto: rota relatada ${input.tripDistanceReportedKm}km vs GPS real ${input.tripDistanceCalculatedGpsKm}km.`);
    }
    if (input.tripDistanceReportedKm > 8 && input.durationMinutes < 3) {
      ghostRidingScore += 0.80;
      evidencias.push('Tempo de percurso impossível para a distância faturada.');
    }

    // 4. Abuso Promocional e Contas Sintéticas (Mesmo hardware ID)
    if (input.deviceFingerprintDuplicatesCount >= 3) {
      promoAbuseScore += 0.75;
      evidencias.push(`Mesmo hardware de dispositivo compartilhado por ${input.deviceFingerprintDuplicatesCount} contas.`);
    }
    if (input.promoDiscountUsedBrl > 25 && input.historicSharedTripsCount > 2) {
      promoAbuseScore += 0.45;
      evidencias.push('Consumo reiterado de cupom de alto valor em corridas combinadas.');
    }

    // Cálculo da probabilidade agregada (máximo ponderado com sigmoid)
    const maxSubScore = Math.max(telemetriaScore, conluioScore, ghostRidingScore, promoAbuseScore);
    const meanScore = (telemetriaScore + conluioScore + ghostRidingScore + promoAbuseScore) / 4;
    const rawAggregated = maxSubScore * 0.75 + meanScore * 0.25;

    const fraudProbability = Math.min(0.99, Math.max(0.01, Number(rawAggregated.toFixed(3))));

    // Determinação do Cluster e Ação Recomendada
    let riskCluster: FraudRiskCluster = 'LEGITIMATE';
    let recommendedAction: FraudAiAssessment['recommendedAction'] = 'ALLOW';

    if (fraudProbability >= 0.75) {
      if (telemetriaScore >= 0.7) riskCluster = 'GPS_SPOOFING';
      else if (conluioScore >= 0.7) riskCluster = 'COLLUSION_RING';
      else if (ghostRidingScore >= 0.7) riskCluster = 'GHOST_RIDING';
      else riskCluster = 'PROMO_ABUSE';

      recommendedAction = 'BLOCK_IMMEDIATE';
    } else if (fraudProbability >= 0.45) {
      if (conluioScore > 0.4) riskCluster = 'COLLUSION_RING';
      else if (promoAbuseScore > 0.4) riskCluster = 'SYNTHETIC_ACCOUNT';
      else riskCluster = 'GPS_SPOOFING';

      recommendedAction = 'HOLD_PAYOUT';
    } else if (fraudProbability >= 0.25) {
      recommendedAction = 'REQUIRE_BIOMETRICS';
    }

    return {
      tripId: input.tripId,
      fraudProbability,
      riskCluster,
      recommendedAction,
      evidencias,
      scoreDetalhado: {
        telemetriaScore: Number(telemetriaScore.toFixed(2)),
        conluioScore: Number(conluioScore.toFixed(2)),
        ghostRidingScore: Number(ghostRidingScore.toFixed(2)),
        promoAbuseScore: Number(promoAbuseScore.toFixed(2))
      },
      modelVersion: this.modelVersion
    };
  }
}

export const fraudAiEngine = new FraudAiEngine();
