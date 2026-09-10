/**
 * PARTIU PASSENGER TRUST SCORE & TIERS
 * 
 * Modelo Preditivo de Confiança e Classificação em Tiers de Confiabilidade.
 */

import { PassengerBehaviorMetrics, passengerBehaviorAnalysisEngine } from './behavior-analysis';
import { PassengerReputationRecord, passengerReputationEngine } from './reputation-engine';

export type PassengerTrustTier =
  | 'ELITE'
  | 'PREMIUM'
  | 'CONFIAVEL'
  | 'OBSERVACAO'
  | 'RESTRITO'
  | 'BLOQUEADO';

export interface PassengerTrustProfile {
  passengerId: string;
  overallTrustScore: number; // 0 a 100
  tier: PassengerTrustTier;
  behaviorScore: number;
  reputationScore: number;
  isPrepaymentMandatory: boolean;
  isBlocked: boolean;
  priorityDispatchWeight: number; // Ex: 1.25x para Elite
  cashbackMultiplier: number;
  accessToExecutiveModalities: boolean;
  lastEvaluatedAt: number;
  statusBadge: string;
}

export class PassengerTrustScoreEngine {
  /**
   * Calcula o Passenger Trust Score unificado e determina o Tier
   */
  public computeTrustProfile(
    behavior: PassengerBehaviorMetrics,
    reputation: PassengerReputationRecord
  ): PassengerTrustProfile {
    const behEval = passengerBehaviorAnalysisEngine.evaluateBehavior(behavior);
    const repEval = passengerReputationEngine.evaluateReputation(reputation);

    // Fusão ponderada: 50% Comportamento em campo + 50% Reputação e Integridade Financeira
    let overallScore = Math.round((behEval.behaviorScore * 0.50) + (repEval.reputationScore * 0.50));

    // Trava de segurança: se risco financeiro crítico ou denúncia severa, score capped
    if (repEval.financialRiskLevel === 'CRITICO' || reputation.severeIncidentsCount > 0) {
      overallScore = Math.min(18, overallScore);
    }

    let tier: PassengerTrustTier = 'CONFIAVEL';
    let priorityDispatchWeight = 1.0;
    let cashbackMultiplier = 1.0;
    let accessToExecutive = true;
    let isPrepaymentMandatory = repEval.isPrepaymentMandatory;
    let isBlocked = false;
    let statusBadge = '🟢 Confiável';

    if (overallScore >= 90) {
      tier = 'ELITE';
      priorityDispatchWeight = 1.30;
      cashbackMultiplier = 1.50; // 50% mais cashback
      statusBadge = '⭐ Passageiro Elite';
    } else if (overallScore >= 75) {
      tier = 'PREMIUM';
      priorityDispatchWeight = 1.15;
      cashbackMultiplier = 1.25;
      statusBadge = '💎 Passageiro Premium';
    } else if (overallScore >= 50) {
      tier = 'CONFIAVEL';
      priorityDispatchWeight = 1.0;
      cashbackMultiplier = 1.0;
      statusBadge = '✅ Passageiro Confiável';
    } else if (overallScore >= 35) {
      tier = 'OBSERVACAO';
      priorityDispatchWeight = 0.85;
      cashbackMultiplier = 0.50;
      isPrepaymentMandatory = true;
      accessToExecutive = false;
      statusBadge = '⚠️ Em Observação (Pré-pagamento Obrigatório)';
    } else if (overallScore >= 20) {
      tier = 'RESTRITO';
      priorityDispatchWeight = 0.60;
      cashbackMultiplier = 0.0;
      isPrepaymentMandatory = true;
      accessToExecutive = false;
      statusBadge = '⛔ Restrito (Sem Corridas Noturnas)';
    } else {
      tier = 'BLOQUEADO';
      priorityDispatchWeight = 0.0;
      cashbackMultiplier = 0.0;
      isPrepaymentMandatory = true;
      accessToExecutive = false;
      isBlocked = true;
      statusBadge = '🚫 Conta Bloqueada por Risco/Fraude';
    }

    return {
      passengerId: behavior.passengerId,
      overallTrustScore: overallScore,
      tier,
      behaviorScore: behEval.behaviorScore,
      reputationScore: repEval.reputationScore,
      isPrepaymentMandatory,
      isBlocked,
      priorityDispatchWeight,
      cashbackMultiplier,
      accessToExecutiveModalities: accessToExecutive,
      lastEvaluatedAt: Date.now(),
      statusBadge
    };
  }
}

export const passengerTrustScoreEngine = new PassengerTrustScoreEngine();
