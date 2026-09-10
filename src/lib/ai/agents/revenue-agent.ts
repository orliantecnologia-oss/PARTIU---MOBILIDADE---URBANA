/**
 * REVENUE AGENT
 * 
 * Agente especialista em maximização de receita, precificação dinâmica (Surge),
 * proteção de margem líquida e sustentabilidade do take-rate da plataforma.
 */

import { MarketplaceStateVector } from '../partiu-foundation-model';
import { 
  SpecializedAgent, 
  AgentRole, 
  AgentAnalysis, 
  AgentRecommendation, 
  AgentSimulationOutcome, 
  AgentExecutionResult 
} from './agent-contract';

export class RevenueAgent implements SpecializedAgent {
  public readonly role: AgentRole = 'REVENUE_AGENT';
  public readonly name = 'Revenue & Pricing Agent';

  public analyze(state: MarketplaceStateVector): AgentAnalysis {
    const v = state.embedding;
    const surgeNorm = v[8] ?? 0;
    const takeRateNorm = v[9] ?? 0;
    const revenueNorm = v[10] ?? 0;
    const weatherImpact = v[16] ?? 0;
    const deficitRatio = v[19] ?? 0;

    const healthIndex = Math.round((revenueNorm * 0.4 + (1.0 - surgeNorm * 0.3) + takeRateNorm * 0.3) * 100);
    const urgencyLevel = (deficitRatio > 0.6 || weatherImpact > 0.6) ? 'ALTA' : 'BAIXA';

    const bottlenecks: string[] = [];
    const opportunities: string[] = [];

    if (deficitRatio > 0.5) bottlenecks.push('Demanda reprimida em hotspot sem captura de tarifa valorizada.');
    if (weatherImpact > 0.5) opportunities.push('Oportunidade de Surge preventivo para equilibrar demanda sob chuva.');
    if (takeRateNorm < 0.20) bottlenecks.push('Take-rate efetivo abaixo da meta do modelo híbrido (5%).');

    return {
      agentRole: this.role,
      cityId: state.cityId,
      timestamp: Date.now(),
      healthIndex,
      urgencyLevel,
      detectedOpportunities: opportunities,
      detectedBottlenecks: bottlenecks,
      metricsSnapshot: {
        surgeAtual: 1.0 + surgeNorm * 1.5,
        receitaNormalizada: revenueNorm,
        deficitPressionado: deficitRatio
      }
    };
  }

  public recommend(analysis: AgentAnalysis): AgentRecommendation {
    const needsSurge = analysis.urgencyLevel === 'ALTA';
    const multiplier = needsSurge ? 1.35 : 1.0;

    return {
      id: `REC-REV-${Date.now()}`,
      agentRole: this.role,
      cityId: analysis.cityId,
      actionType: needsSurge ? 'ATIVAR_SURGE_PREDITIVO' : 'MANTER_TARIFA_BASE',
      parameters: {
        multiplicadorAlvo: multiplier,
        duracaoMinutos: 30,
        categoriasElegiveis: ['POP', 'PLUS', 'FLASH']
      },
      priority: needsSurge ? 'P1' : 'P3',
      rationale: needsSurge 
        ? 'Aplicação preventiva de Surge 1.35x para maximizar receita e capturar demanda disposta a pagar em período de pico.'
        : 'Mercado equilibrado; sem necessidade de multiplicador dinâmico.',
      confidenceScore: 0.91,
      expectedImpact: {
        revenueDeltaBrl: needsSurge ? 480.0 : 0,
        driverEarningsDeltaBrl: needsSurge ? 28.0 : 0
      },
      conflictsWithRoles: ['DEMAND_AGENT'] // Demand Agent pode temer que surge reduza conversão
    };
  }

  public simulate(rec: AgentRecommendation): AgentSimulationOutcome {
    const mult = (rec.parameters['multiplicadorAlvo'] as number) || 1.0;
    return {
      recommendationId: rec.id,
      projectedSuccessProbability: 0.89,
      projectedGmvImpactPct: mult > 1.0 ? 8.2 : 0,
      projectedCancellationImpactPct: mult > 1.0 ? 1.5 : 0,
      projectedRiskScore: mult > 1.4 ? 40 : 18,
      recommendedBySimulation: true,
      simulationNotes: 'Projeção de aumento de 8.2% no GMV com elasticidade absorvida de forma saudável.'
    };
  }

  public execute(rec: AgentRecommendation): AgentExecutionResult {
    return {
      executionId: `EXEC-REV-${Date.now()}`,
      recommendationId: rec.id,
      status: 'EXECUTADO',
      executedAt: Date.now(),
      revertible: true,
      auditHash: `SHA-${Date.now().toString(16)}-REVENUE`,
      details: `Surge preditivo configurado em ${rec.parameters['multiplicadorAlvo']}x por ${rec.parameters['duracaoMinutos']}m em ${rec.cityId}.`
    };
  }
}

export const revenueAgent = new RevenueAgent();
