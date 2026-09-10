/**
 * SMART PASSENGER BOARDING ENGINE — PASSENGER VERIFICATION
 * 
 * Avaliação de risco, identidade e elegibilidade para embarque inteligente (1-tap).
 * Elimina a fricção de PINs obrigatórios para passageiros verificados e de alta confiança.
 */

import { PassengerTrustTier } from '../trust/trust-score';

export type PassengerRiskLevel = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'BLOCKED';

export interface PassengerIdentityInput {
  passengerId: string;
  name: string;
  photoUrl?: string | undefined;
  cpfVerified: boolean;
  rating: number; // 0.0 a 5.0
  totalCompletedRides: number;
  accountAgeDays: number;
  trustScore?: number | undefined; // 0 a 100
  trustTier?: PassengerTrustTier | undefined;
  severeReportsCount?: number | undefined;
  cancellationRate?: number | undefined; // 0.0 a 1.0 (ex: 0.05 = 5%)
}

export interface PassengerVerificationResult {
  passengerId: string;
  passengerName: string;
  photoUrl?: string | undefined;
  riskLevel: PassengerRiskLevel;
  trustScore: number;
  trustTier: PassengerTrustTier;
  identityMatchScore: number; // 0 a 100
  canOneTapBoard: boolean;
  verificationBadges: string[];
  reasons: string[];
  evaluatedAt: number;
}

export class PassengerVerificationEngine {
  /**
   * Avalia a identidade e o risco de embarque do passageiro
   */
  public verifyPassenger(input: PassengerIdentityInput): PassengerVerificationResult {
    const reasons: string[] = [];
    const badges: string[] = [];

    // 1. Resolver Trust Score
    const trustScore = input.trustScore !== undefined
      ? input.trustScore
      : this.calculateDefaultScore(input);

    // 2. Resolver Trust Tier
    const trustTier = input.trustTier || this.resolveTierFromScore(trustScore);

    // 3. Avaliação de Badges de Identidade
    if (input.cpfVerified) {
      badges.push('CPF_VERIFICADO');
    }
    if (input.rating >= 4.8) {
      badges.push('ALTA_REPUTACAO');
    }
    if (input.totalCompletedRides >= 20) {
      badges.push('PASSAGEIRO_FREQUENTE');
    }
    if (input.totalCompletedRides >= 100) {
      badges.push('VETERANO');
    }
    if (input.photoUrl) {
      badges.push('FOTO_RECONHECIDA');
    }

    // 4. Calcular Identity Match Score
    let identityScore = 50;
    if (input.cpfVerified) identityScore += 25;
    if (input.photoUrl) identityScore += 15;
    if (input.totalCompletedRides > 5) identityScore += 10;
    if (input.totalCompletedRides >= 50) identityScore += 10;
    identityScore = Math.min(100, identityScore);

    // 5. Avaliação de Risco
    let riskLevel: PassengerRiskLevel = 'LOW_RISK';
    const severeReports = input.severeReportsCount || 0;
    const cancellationRate = input.cancellationRate || 0;

    if (trustTier === 'BLOQUEADO' || severeReports >= 2) {
      riskLevel = 'BLOCKED';
      reasons.push('Conta bloqueada por incidentes graves ou pontuação crítica de segurança.');
    } else if (trustTier === 'RESTRITO' || severeReports === 1 || cancellationRate > 0.40) {
      riskLevel = 'HIGH_RISK';
      reasons.push('Passageiro em perfil restrito ou com alta taxa de cancelamentos anômalos.');
    } else if (trustTier === 'OBSERVACAO' || input.totalCompletedRides === 0 || cancellationRate > 0.20) {
      riskLevel = 'MEDIUM_RISK';
      reasons.push('Passageiro novo ou sob monitoramento preventivo de integridade.');
    } else {
      riskLevel = 'LOW_RISK';
      reasons.push('Passageiro verificado com excelente histórico de viagens e conduta.');
    }

    // 6. Elegibilidade para Embarque 1-Tap (Sem PIN obrigatório)
    // 99 e Uber permitem embarque direto com confirmação do motorista para passageiros regulares e confiáveis
    const canOneTapBoard = riskLevel !== 'BLOCKED';

    return {
      passengerId: input.passengerId,
      passengerName: input.name,
      photoUrl: input.photoUrl,
      riskLevel,
      trustScore,
      trustTier,
      identityMatchScore: identityScore,
      canOneTapBoard,
      verificationBadges: badges,
      reasons,
      evaluatedAt: Date.now(),
    };
  }

  private calculateDefaultScore(input: PassengerIdentityInput): number {
    let score = 70; // Base padrão de início
    if (input.cpfVerified) score += 10;
    if (input.rating >= 4.9) score += 10;
    else if (input.rating < 4.0) score -= 20;
    if (input.totalCompletedRides > 10) score += 10;
    return Math.max(0, Math.min(100, score));
  }

  private resolveTierFromScore(score: number): PassengerTrustTier {
    if (score >= 90) return 'ELITE';
    if (score >= 75) return 'PREMIUM';
    if (score >= 50) return 'CONFIAVEL';
    if (score >= 35) return 'OBSERVACAO';
    if (score >= 20) return 'RESTRITO';
    return 'BLOQUEADO';
  }
}

export const passengerVerificationEngine = new PassengerVerificationEngine();
