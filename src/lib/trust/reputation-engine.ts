/**
 * PARTIU PASSENGER REPUTATION ENGINE
 * 
 * Histórico Reputacional, Integridade Financeira e Auditoria de Contestações.
 */

export interface PassengerReputationRecord {
  passengerId: string;
  isCpfVerified: boolean;
  isPhoneVerified: boolean;
  hasFacialBiometrics: boolean;
  unpaidRidesDebtBrl: number;
  chargebacksCount: number;
  severeIncidentsCount: number; // Agressão verbal, dano ao veículo, assédio
  paymentSuccessRatePct: number;
  averageDriverRatingGivenToPassenger: number; // 1.0 a 5.0
}

export class PassengerReputationEngine {
  /**
   * Avalia a integridade documental, cadastral e financeira do passageiro
   */
  public evaluateReputation(record: PassengerReputationRecord): {
    reputationScore: number;
    isPrepaymentMandatory: boolean;
    isAccountRestricted: boolean;
    financialRiskLevel: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  } {
    // Verificações cadastrais básicas (+30 pts)
    let score = 0;
    if (record.isCpfVerified) score += 15;
    if (record.isPhoneVerified) score += 10;
    if (record.hasFacialBiometrics) score += 15;

    // Avaliação do motorista (+25 pts)
    const ratingBonus = ((record.averageDriverRatingGivenToPassenger - 3.0) / 2.0) * 25;
    score += Math.max(0, ratingBonus);

    // Sucesso de Pagamento (+25 pts)
    score += (record.paymentSuccessRatePct / 100) * 25;

    // Penalidades severas
    if (record.unpaidRidesDebtBrl > 0) score -= 35;
    if (record.chargebacksCount > 0) score -= (record.chargebacksCount * 40);
    if (record.severeIncidentsCount > 0) score -= (record.severeIncidentsCount * 60);

    const reputationScore = Math.max(0, Math.min(100, Math.round(score)));

    let financialRiskLevel: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO' = 'BAIXO';
    let isPrepaymentMandatory = false;
    let isAccountRestricted = false;

    if (record.severeIncidentsCount > 0 || record.chargebacksCount >= 2 || reputationScore < 20) {
      financialRiskLevel = 'CRITICO';
      isAccountRestricted = true;
      isPrepaymentMandatory = true;
    } else if (record.unpaidRidesDebtBrl > 0 || record.chargebacksCount === 1 || reputationScore < 50) {
      financialRiskLevel = 'ALTO';
      isPrepaymentMandatory = true;
    } else if (reputationScore < 70) {
      financialRiskLevel = 'MEDIO';
    }

    return {
      reputationScore,
      isPrepaymentMandatory,
      isAccountRestricted,
      financialRiskLevel
    };
  }
}

export const passengerReputationEngine = new PassengerReputationEngine();
