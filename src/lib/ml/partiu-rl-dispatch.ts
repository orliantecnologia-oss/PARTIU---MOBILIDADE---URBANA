/**
 * PARTIU REINFORCEMENT LEARNING DISPATCH POLICY ENGINE
 * 
 * Substitui a atribuição de pesos fixos no DriverScore por uma política adaptativa
 * baseada em aprendizado por reforço (Contextual Bandits / Policy Gradients).
 * Ajusta os pesos continuamente para maximizar conclusões, minimizar cancelamentos e reduzir ETA.
 */

export interface DispatchPolicyWeights {
  weightDistance: number; // Peso da proximidade física (distância)
  weightEta: number; // Peso do ETA estimado
  weightAcceptanceRate: number; // Peso da taxa histórica de aceite
  weightCancellationRate: number; // Peso da taxa de cancelamento (negativo)
  weightDriverRating: number; // Peso da avaliação do condutor (estrelas)
  weightConsecutiveTrips: number; // Peso de corridas consecutivas (momentum)
  weightIdleTime: number; // Peso do tempo ocioso (justiça de distribuição)
  weightCategoryTier: number; // Peso da categoria do veículo
  learningRate: number;
  episodesCount: number;
}

export interface CandidateEvaluationContext {
  driverId: string;
  distanceKm: number;
  etaMinutes: number;
  acceptanceRatePct: number;
  cancellationRatePct: number;
  ratingAverage: number;
  idleTimeMinutes: number;
  consecutiveTripsToday: number;
  isVehicleCategoryMatch: boolean;
}

export interface TripOutcomeReward {
  driverId: string;
  tripCompleted: boolean;
  passengerCanceled: boolean;
  driverCanceled: boolean;
  actualArrivalEtaMinutes: number;
  expectedEtaMinutes: number;
  finalRatingGivenByPassenger: number; // 1 a 5
  driverEarningsBrl: number;
}

export class DispatchPolicyEngine {
  private weights: DispatchPolicyWeights = {
    weightDistance: 0.22,
    weightEta: 0.25,
    weightAcceptanceRate: 0.18,
    weightCancellationRate: 0.15,
    weightDriverRating: 0.10,
    weightConsecutiveTrips: 0.05,
    weightIdleTime: 0.03,
    weightCategoryTier: 0.02,
    learningRate: 0.005,
    episodesCount: 1420
  };

  /**
   * Avalia um candidato utilizando a política atual de pesos aprendidos
   */
  public evaluateCandidate(candidate: CandidateEvaluationContext): { score: number; rankMultiplier: number } {
    const w = this.weights;

    // Normalização das variáveis entre 0.0 e 1.0
    const normDist = Math.max(0, 1.0 - candidate.distanceKm / 10.0); // Mais perto = maior
    const normEta = Math.max(0, 1.0 - candidate.etaMinutes / 15.0);
    const normAccept = candidate.acceptanceRatePct / 100.0;
    const normCancel = Math.max(0, 1.0 - candidate.cancellationRatePct / 20.0);
    const normRating = (candidate.ratingAverage - 4.0) / 1.0;
    const normConsecutive = Math.min(1.0, candidate.consecutiveTripsToday / 8.0);
    const normIdle = Math.min(1.0, candidate.idleTimeMinutes / 30.0);
    const normCat = candidate.isVehicleCategoryMatch ? 1.0 : 0.6;

    // Função de valor da política Q(s, a)
    const policyValue = 
      (normDist * w.weightDistance) +
      (normEta * w.weightEta) +
      (normAccept * w.weightAcceptanceRate) +
      (normCancel * w.weightCancellationRate) +
      (normRating * w.weightDriverRating) +
      (normConsecutive * w.weightConsecutiveTrips) +
      (normIdle * w.weightIdleTime) +
      (normCat * w.weightCategoryTier);

    const finalScore = Number((policyValue * 100).toFixed(2));
    const rankMultiplier = Number((1.0 + policyValue * 0.2).toFixed(3));

    return { score: finalScore, rankMultiplier };
  }

  /**
   * Calcula o sinal de recompensa R e atualiza a política de pesos via Policy Gradient
   */
  public reportTripOutcomeAndLearn(outcome: TripOutcomeReward): { reward: number; weightsUpdated: boolean } {
    // Função de recompensa multiobjetivo
    let reward = 0;

    if (outcome.tripCompleted) {
      reward += 1.0; // Sucesso fundamental da corrida
    }

    if (outcome.driverCanceled) {
      reward -= 2.5; // Penalidade pesada por quebra de compromisso do condutor
    } else if (outcome.passengerCanceled) {
      reward -= 1.2; // Penalidade por desistência (frequentemente causada por ETA alto)
    }

    // Bônus/penalidade por precisão de chegada no ETA
    const etaDrift = outcome.actualArrivalEtaMinutes - outcome.expectedEtaMinutes;
    if (etaDrift <= 0) {
      reward += 0.3; // Chegou antes ou no horário
    } else {
      reward -= Math.min(0.8, etaDrift * 0.15); // Atraso penalizado
    }

    // Avaliação de 5 estrelas do passageiro
    if (outcome.finalRatingGivenByPassenger >= 4.8) {
      reward += 0.5;
    } else if (outcome.finalRatingGivenByPassenger < 4.0) {
      reward -= 0.6;
    }

    // Atualização dos gradientes nos pesos da política
    const lr = this.weights.learningRate;
    this.weights.episodesCount++;

    if (reward > 0) {
      // Se a corrida teve desfecho excelente, reforça critérios de avaliação e aceitação
      this.weights.weightAcceptanceRate = Math.min(0.28, this.weights.weightAcceptanceRate + lr * 0.5);
      this.weights.weightDriverRating = Math.min(0.18, this.weights.weightDriverRating + lr * 0.3);
      this.weights.weightEta = Math.min(0.30, this.weights.weightEta + lr * 0.2);
    } else {
      // Se houve cancelamento ou atraso, aumenta o rigor sobre proximidade física e cancelamento
      this.weights.weightCancellationRate = Math.min(0.25, this.weights.weightCancellationRate + lr * 0.6);
      this.weights.weightDistance = Math.min(0.30, this.weights.weightDistance + lr * 0.4);
    }

    // Re-normalização estocástica para garantir que a soma dos pesos seja igual a 1.0
    const sum = 
      this.weights.weightDistance +
      this.weights.weightEta +
      this.weights.weightAcceptanceRate +
      this.weights.weightCancellationRate +
      this.weights.weightDriverRating +
      this.weights.weightConsecutiveTrips +
      this.weights.weightIdleTime +
      this.weights.weightCategoryTier;

    if (sum > 0) {
      this.weights.weightDistance = Number((this.weights.weightDistance / sum).toFixed(4));
      this.weights.weightEta = Number((this.weights.weightEta / sum).toFixed(4));
      this.weights.weightAcceptanceRate = Number((this.weights.weightAcceptanceRate / sum).toFixed(4));
      this.weights.weightCancellationRate = Number((this.weights.weightCancellationRate / sum).toFixed(4));
      this.weights.weightDriverRating = Number((this.weights.weightDriverRating / sum).toFixed(4));
      this.weights.weightConsecutiveTrips = Number((this.weights.weightConsecutiveTrips / sum).toFixed(4));
      this.weights.weightIdleTime = Number((this.weights.weightIdleTime / sum).toFixed(4));
      this.weights.weightCategoryTier = Number((this.weights.weightCategoryTier / sum).toFixed(4));
    }

    return {
      reward: Number(reward.toFixed(3)),
      weightsUpdated: true
    };
  }

  public getCurrentPolicyWeights(): DispatchPolicyWeights {
    return { ...this.weights };
  }
}

export const dispatchPolicyEngine = new DispatchPolicyEngine();
