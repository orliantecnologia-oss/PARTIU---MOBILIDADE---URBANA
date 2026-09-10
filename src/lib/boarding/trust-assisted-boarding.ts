/**
 * SMART PASSENGER BOARDING ENGINE — TRUST-ASSISTED BOARDING
 * 
 * Regras operacionais de embarque assistidas pelo Índice de Confiança do Passageiro (PTI).
 * Mapeia Tiers de reputação em diretrizes práticas de embarque sem PIN obrigatório.
 */

import { PassengerTrustTier } from '../trust/trust-score';

export interface TrustBoardingPolicy {
  tier: PassengerTrustTier;
  allowOneTapStart: boolean;
  pinMandatory: boolean;
  driverGuidance: string;
  badge: {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    icon: string;
  };
  safetyRecommendation: string;
  requiresVerbalDestinationCheck: boolean;
}

export class TrustAssistedBoardingEngine {
  /**
   * Obtém a política de embarque baseada no tier de confiança do passageiro
   */
  public getPolicy(tier: PassengerTrustTier, score: number): TrustBoardingPolicy {
    switch (tier) {
      case 'ELITE':
        return {
          tier: 'ELITE',
          allowOneTapStart: true,
          pinMandatory: false,
          driverGuidance: 'Passageiro VIP com índice de confiança máximo. Embarque instantâneo liberado.',
          badge: {
            label: `⭐ Elite (${score} pts)`,
            bgClass: 'bg-amber-50',
            textClass: 'text-amber-800',
            borderClass: 'border-amber-300',
            icon: 'star',
          },
          safetyRecommendation: 'Atendimento prioritário. Nenhuma verificação burocrática necessária.',
          requiresVerbalDestinationCheck: false,
        };

      case 'PREMIUM':
        return {
          tier: 'PREMIUM',
          allowOneTapStart: true,
          pinMandatory: false,
          driverGuidance: 'Passageiro frequente e altamente recomendado. Embarque em 1 clique.',
          badge: {
            label: `💎 Premium (${score} pts)`,
            bgClass: 'bg-sky-50',
            textClass: 'text-sky-800',
            borderClass: 'border-sky-300',
            icon: 'award',
          },
          safetyRecommendation: 'Perfil verificado com histórico íntegro na plataforma.',
          requiresVerbalDestinationCheck: false,
        };

      case 'CONFIAVEL':
        return {
          tier: 'CONFIAVEL',
          allowOneTapStart: true,
          pinMandatory: false,
          driverGuidance: 'Passageiro verificado. Confirme o embarque com um toque para iniciar.',
          badge: {
            label: `✅ Confiável (${score} pts)`,
            bgClass: 'bg-emerald-50',
            textClass: 'text-emerald-800',
            borderClass: 'border-emerald-300',
            icon: 'check-circle',
          },
          safetyRecommendation: 'Cumprimente o passageiro e inicie a rota padrão.',
          requiresVerbalDestinationCheck: false,
        };

      case 'OBSERVACAO':
        return {
          tier: 'OBSERVACAO',
          allowOneTapStart: true,
          pinMandatory: false,
          driverGuidance: 'Passageiro sob monitoramento. Verifique o destino antes de arrancar.',
          badge: {
            label: `⚠️ Em Observação (${score} pts)`,
            bgClass: 'bg-orange-50',
            textClass: 'text-orange-800',
            borderClass: 'border-orange-300',
            icon: 'alert-triangle',
          },
          safetyRecommendation: 'Confirme verbalmente o destino antes de pressionar iniciar.',
          requiresVerbalDestinationCheck: true,
        };

      case 'RESTRITO':
        return {
          tier: 'RESTRITO',
          allowOneTapStart: true,
          pinMandatory: false,
          driverGuidance: 'Perfil restrito. Recomenda-se confirmar a identidade verbalmente.',
          badge: {
            label: `⛔ Restrito (${score} pts)`,
            bgClass: 'bg-rose-50',
            textClass: 'text-rose-800',
            borderClass: 'border-rose-300',
            icon: 'shield-alert',
          },
          safetyRecommendation: 'Verifique se o passageiro confere com a foto antes de dar partida.',
          requiresVerbalDestinationCheck: true,
        };

      case 'BLOQUEADO':
      default:
        return {
          tier: 'BLOQUEADO',
          allowOneTapStart: false,
          pinMandatory: true,
          driverGuidance: 'Conta bloqueada para embarque direto. Acione a Central de Operações.',
          badge: {
            label: '🚫 Bloqueado',
            bgClass: 'bg-red-100',
            textClass: 'text-red-900',
            borderClass: 'border-red-400',
            icon: 'x-circle',
          },
          safetyRecommendation: 'Não embarque o passageiro. Cancele com motivo de segurança.',
          requiresVerbalDestinationCheck: true,
        };
    }
  }
}

export const trustAssistedBoardingEngine = new TrustAssistedBoardingEngine();
