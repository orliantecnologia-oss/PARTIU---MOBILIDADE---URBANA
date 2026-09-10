/**
 * PARTIU PASSENGER BEHAVIOR ANALYSIS
 * 
 * Análise Comportamental e Telemetria de Uso do Passageiro.
 * Avalia pontualidade de embarque, cancelamentos pós-aceite e consistência de uso.
 */

export interface PassengerBehaviorMetrics {
  passengerId: string;
  totalCompletedRides: number;
  cancellationsTotal: number;
  cancellationsAfterDriverDispatched: number;
  averageBoardingDelaySeconds: number; // SLA ideal < 120s
  daysActiveOnPlatform: number;
  weeklyRideFrequency: number;
  driverComplaintsCount: number;
  fiveStarRatingsReceivedCount: number;
  lateNightTripsCount: number;
}

export class PassengerBehaviorAnalysisEngine {
  /**
   * Avalia os sinais comportamentais do passageiro e retorna o subscore comportamental (0 a 100)
   */
  public evaluateBehavior(metrics: PassengerBehaviorMetrics): {
    behaviorScore: number;
    punctualityIndex: number;
    cancellationPenalty: number;
    loyaltyBonus: number;
  } {
    // 1. Pontualidade de Embarque (até 35 pts)
    let punctualityIndex = 35;
    if (metrics.averageBoardingDelaySeconds > 300) punctualityIndex = 10;
    else if (metrics.averageBoardingDelaySeconds > 180) punctualityIndex = 20;
    else if (metrics.averageBoardingDelaySeconds > 120) punctualityIndex = 28;

    // 2. Penalidade por Cancelamento Pós-Despacho (até -30 pts)
    const cancelRatio = metrics.totalCompletedRides > 0
      ? metrics.cancellationsAfterDriverDispatched / metrics.totalCompletedRides
      : 0;
    let cancellationPenalty = 0;
    if (cancelRatio > 0.20) cancellationPenalty = 30;
    else if (cancelRatio > 0.10) cancellationPenalty = 18;
    else if (cancelRatio > 0.05) cancellationPenalty = 8;

    // 3. Bônus de Fidelidade e Avaliações Positivas (até 35 pts)
    let loyaltyBonus = Math.min(20, (metrics.daysActiveOnPlatform / 180) * 20);
    const positiveRatingsBonus = Math.min(15, (metrics.fiveStarRatingsReceivedCount / Math.max(1, metrics.totalCompletedRides)) * 15);
    loyaltyBonus += positiveRatingsBonus;

    // 4. Penalidade por Reclamações de Motoristas
    const complaintPenalty = metrics.driverComplaintsCount * 12;

    const rawScore = 30 + punctualityIndex + loyaltyBonus - cancellationPenalty - complaintPenalty;
    const behaviorScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    return {
      behaviorScore,
      punctualityIndex,
      cancellationPenalty,
      loyaltyBonus: Math.round(loyaltyBonus)
    };
  }
}

export const passengerBehaviorAnalysisEngine = new PassengerBehaviorAnalysisEngine();
