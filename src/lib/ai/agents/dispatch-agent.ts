/**
 * DISPATCH AGENT
 * 
 * Agente especialista em liquidez, matching preditivo, redispatch em cascata e contenção de ETA.
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

export class DispatchAgent implements SpecializedAgent {
  public readonly role: AgentRole = 'DISPATCH_AGENT';
  public readonly name = 'Dispatch Intelligence Agent';

  public analyze(state: MarketplaceStateVector): AgentAnalysis {
    const v = state.embedding;
    const etaNorm = v[4] ?? 0;
    const acceptNorm = v[5] ?? 0;
    const cancelNorm = v[6] ?? 0;
    const liquidity = v[7] ?? 0;

    const healthIndex = Math.round((acceptNorm * 0.4 + (1.0 - cancelNorm) * 0.3 + (1.0 - etaNorm) * 0.3) * 100);
    const urgencyLevel = healthIndex < 50 ? 'CRITICA' : healthIndex < 70 ? 'ALTA' : healthIndex < 85 ? 'MEDIA' : 'BAIXA';

    const bottlenecks: string[] = [];
    const opportunities: string[] = [];

    if (etaNorm > 0.5) bottlenecks.push('ETA médio extrapolando teto de conforto (5.5+ min).');
    if (cancelNorm > 0.3) bottlenecks.push('Taxa de cancelamento elevada por espera de matching.');
    if (liquidity < 0.25) bottlenecks.push('Déficit agudo de motoristas livres na malha.');
    if (acceptNorm > 0.92) opportunities.push('Alta aderência da frota permitindo matching mais amplo.');

    return {
      agentRole: this.role,
      cityId: state.cityId,
      timestamp: Date.now(),
      healthIndex,
      urgencyLevel,
      detectedOpportunities: opportunities,
      detectedBottlenecks: bottlenecks,
      metricsSnapshot: {
        etaNormalizado: etaNorm,
        aceiteNormalizado: acceptNorm,
        cancelamentoNormalizado: cancelNorm
      }
    };
  }

  public recommend(analysis: AgentAnalysis): AgentRecommendation {
    const needsExpansion = analysis.healthIndex < 70;
    const actionType = needsExpansion ? 'EXPANDIR_RAIO_DISPATCH' : 'MANTER_DISPATCH_PADRAO';

    return {
      id: `REC-DISP-${Date.now()}`,
      agentRole: this.role,
      cityId: analysis.cityId,
      actionType,
      parameters: {
        raioAlvoKm: needsExpansion ? 5.2 : 3.8,
        prioridadeConfort: true,
        janelaTimeoutSegundos: 12
      },
      priority: analysis.urgencyLevel === 'CRITICA' ? 'P0' : analysis.urgencyLevel === 'ALTA' ? 'P1' : 'P2',
      rationale: needsExpansion 
        ? 'Expansão dinâmica do raio de matching primário para absorver fila e reduzir tempo de espera.'
        : 'Parâmetros de alocação equilibrados, mantendo raio padrão de 3.8 km.',
      confidenceScore: 0.94,
      expectedImpact: {
        etaVariationMinutes: needsExpansion ? -1.4 : 0,
        completionRateDeltaPct: needsExpansion ? 4.8 : 0.5
      },
      conflictsWithRoles: ['REVENUE_AGENT'] // Revenue Agent pode temer que corrida distante aumente custo
    };
  }

  public simulate(rec: AgentRecommendation): AgentSimulationOutcome {
    const isP0 = rec.priority === 'P0';
    return {
      recommendationId: rec.id,
      projectedSuccessProbability: 0.92,
      projectedGmvImpactPct: 3.5,
      projectedCancellationImpactPct: -2.8,
      projectedRiskScore: isP0 ? 35 : 15,
      recommendedBySimulation: true,
      simulationNotes: 'A expansão reduz o tempo de busca e eleva a conversão em 4.8% sem estresse de combustível.'
    };
  }

  public execute(rec: AgentRecommendation): AgentExecutionResult {
    return {
      executionId: `EXEC-DISP-${Date.now()}`,
      recommendationId: rec.id,
      status: 'EXECUTADO',
      executedAt: Date.now(),
      revertible: true,
      auditHash: `SHA-${Date.now().toString(16)}-DISPATCH`,
      details: `Raio de despacho ajustado para ${rec.parameters['raioAlvoKm']} km em ${rec.cityId}.`
    };
  }
}

export const dispatchAgent = new DispatchAgent();
