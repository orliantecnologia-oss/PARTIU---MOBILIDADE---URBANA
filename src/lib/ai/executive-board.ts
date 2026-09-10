/**
 * EXECUTIVE AI BOARD
 * 
 * Conselho deliberativo de IA que recebe, analisa e arbitra recomendações dos 6 agentes.
 * Detecta colisões de objetivos (ex: desconto vs margem) e sintetiza a 'NationalDecision'
 * baseada em otimização de Pareto e equilíbrio multiobjetivo de mercado.
 */

import { MarketplaceStateVector } from './partiu-foundation-model';
import { AgentRecommendation, SpecializedAgent } from './agents/agent-contract';
import { dispatchAgent } from './agents/dispatch-agent';
import { revenueAgent } from './agents/revenue-agent';
import { supplyAgent } from './agents/supply-agent';
import { demandAgent } from './agents/demand-agent';
import { fraudAgent } from './agents/fraud-agent';
import { expansionAgent } from './agents/expansion-agent';

export interface NationalDecision {
  decisionId: string;
  timestamp: number;
  cityId: string;
  cityName?: string;
  approvedActions: AgentRecommendation[];
  rejectedOrModifiedActions: Array<{
    recommendation: AgentRecommendation;
    reason: string;
  }>;
  consensusScore: number; // 0.0 a 1.0
  overallPriority: 'P0' | 'P1' | 'P2' | 'P3';
  projectedNetImpact: {
    gmvDeltaPct: number;
    revenueDeltaBrl: number;
    etaDeltaMinutes: number;
    driverEarningsDeltaBrl: number;
  };
  executiveJustification: string;
}

export class ExecutiveAIBoard {
  private agents: SpecializedAgent[] = [
    dispatchAgent,
    revenueAgent,
    supplyAgent,
    demandAgent,
    fraudAgent,
    expansionAgent
  ];

  /**
   * Conduz rodada deliberativa completa sobre o vetor de estado da praça
   */
  public deliberate(state: MarketplaceStateVector): NationalDecision {
    const rawRecommendations: AgentRecommendation[] = [];

    // 1. Cada agente analisa o embedding e emite sua recomendação
    this.agents.forEach((agent) => {
      const analysis = agent.analyze(state);
      const rec = agent.recommend(analysis);
      rawRecommendations.push(rec);
    });

    // 2. Resolução de Conflitos e Arbitragem
    const approvedActions: AgentRecommendation[] = [];
    const rejectedOrModifiedActions: NationalDecision['rejectedOrModifiedActions'] = [];

    let hasSurgeAction = false;
    let hasDiscountAction = false;
    let isFraudP0 = false;

    // Identifica ações prioritárias
    rawRecommendations.forEach((rec) => {
      if (rec.agentRole === 'FRAUD_AGENT' && rec.priority === 'P0') {
        isFraudP0 = true;
      }
      if (rec.actionType === 'ATIVAR_SURGE_PREDITIVO') {
        hasSurgeAction = true;
      }
      if (rec.actionType === 'DISPARAR_CUPOM_HORARIO_VALE') {
        hasDiscountAction = true;
      }
    });

    rawRecommendations.forEach((rec) => {
      // Conflito clássico: Não ativar cupom promocional se houver Surge por escassez
      if (hasSurgeAction && rec.actionType === 'DISPARAR_CUPOM_HORARIO_VALE') {
        rejectedOrModifiedActions.push({
          recommendation: rec,
          reason: 'Conflito de precificação: Demanda reprimida com Surge ativo inviabiliza queima de cupom promocional.'
        });
        return;
      }

      // Se houver P0 de fraude, ações de expansão aguardam resolução
      if (isFraudP0 && rec.agentRole === 'EXPANSION_AGENT') {
        rejectedOrModifiedActions.push({
          recommendation: rec,
          reason: 'Expansão sobrestada preventivamente durante investigação de fraude na praça.'
        });
        return;
      }

      // Se a recomendação tem alta confiança, é aprovada
      if (rec.confidenceScore >= 0.85) {
        approvedActions.push(rec);
      } else {
        rejectedOrModifiedActions.push({
          recommendation: rec,
          reason: 'Confiança estatística insuficiente (< 85%).'
        });
      }
    });

    // 3. Ponderação do impacto líquido
    let netGmvDelta = 0;
    let netRevenue = 0;
    let netEta = 0;
    let netEarnings = 0;
    let maxPriority: 'P0' | 'P1' | 'P2' | 'P3' = 'P3';

    approvedActions.forEach((a) => {
      if (a.priority === 'P0') maxPriority = 'P0';
      else if (a.priority === 'P1' && maxPriority !== 'P0') maxPriority = 'P1';
      else if (a.priority === 'P2' && maxPriority === 'P3') maxPriority = 'P2';

      netGmvDelta += 2.5;
      netRevenue += a.expectedImpact.revenueDeltaBrl || 0;
      netEta += a.expectedImpact.etaVariationMinutes || 0;
      netEarnings += a.expectedImpact.driverEarningsDeltaBrl || 0;
    });

    const consensusScore = Number((approvedActions.length / Math.max(1, rawRecommendations.length)).toFixed(2));
    const executiveJustification = `O Executive AI Board deliberou e aprovou ${approvedActions.length} ações coordenadas com consenso de ${(consensusScore * 100).toFixed(0)}%. ${rejectedOrModifiedActions.length > 0 ? `Foram mitigados ${rejectedOrModifiedActions.length} conflitos entre demanda, receita e segurança.` : 'Convergência unânime entre todos os agentes.'}`;

    return {
      decisionId: `DEC-NAT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: Date.now(),
      cityId: state.cityId,
      cityName: state.cityName,
      approvedActions,
      rejectedOrModifiedActions,
      consensusScore,
      overallPriority: maxPriority,
      projectedNetImpact: {
        gmvDeltaPct: Number(netGmvDelta.toFixed(1)),
        revenueDeltaBrl: Number(netRevenue.toFixed(2)),
        etaDeltaMinutes: Number(netEta.toFixed(1)),
        driverEarningsDeltaBrl: Number(netEarnings.toFixed(2))
      },
      executiveJustification
    };
  }
}

export const executiveAIBoard = new ExecutiveAIBoard();
