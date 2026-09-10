/**
 * EXPANSION AGENT
 * 
 * Agente especialista em expansão territorial e crescimento interurbano:
 * Avalia prontidão operacional para novos municípios e integração regional de rotas.
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

export class ExpansionAgent implements SpecializedAgent {
  public readonly role: AgentRole = 'EXPANSION_AGENT';
  public readonly name = 'Territorial Expansion Agent';

  public analyze(state: MarketplaceStateVector): AgentAnalysis {
    const v = state.embedding;
    const cityHealth = v[20] ?? 0;
    const nationalHealth = v[21] ?? 0;

    // Prontidão para expansão requer saúde estável (> 75%)
    const healthIndex = Math.round((cityHealth * 0.5 + nationalHealth * 0.5) * 100);
    const urgencyLevel = healthIndex >= 80 ? 'MEDIA' : 'BAIXA';

    const opportunities: string[] = [];
    const bottlenecks: string[] = [];

    if (healthIndex >= 80) {
      opportunities.push('Praça consolidada com folga operacional para suportar abertura de cidades satélites.');
    } else {
      bottlenecks.push('Praça ainda em fase de estabilização; focar em liquidez antes de novas expansões.');
    }

    return {
      agentRole: this.role,
      cityId: state.cityId,
      timestamp: Date.now(),
      healthIndex,
      urgencyLevel,
      detectedOpportunities: opportunities,
      detectedBottlenecks: bottlenecks,
      metricsSnapshot: {
        prontidaoExpansao: healthIndex
      }
    };
  }

  public recommend(analysis: AgentAnalysis): AgentRecommendation {
    const isReady = analysis.healthIndex >= 80;

    return {
      id: `REC-EXP-${Date.now()}`,
      agentRole: this.role,
      cityId: analysis.cityId,
      actionType: isReady ? 'PROPOR_ABERTURA_CIDADE_SATELITE' : 'CONSOLIDAR_PRACA_ATUAL',
      parameters: {
        cidadeSateliteAlvo: 'Santo Antônio de Pádua (RJ)',
        raioEstimadoKm: 18,
        frotaInicialAlvo: 25
      },
      priority: 'P2',
      rationale: isReady 
        ? 'Saúde operacional madura permitindo extensão da malha para municípios vizinhos de alta integração comercial.'
        : 'Manter foco na otimização da praça atual.',
      confidenceScore: 0.90,
      expectedImpact: {
        revenueDeltaBrl: isReady ? 1200.0 : 0
      },
      conflictsWithRoles: ['SUPPLY_AGENT'] // Expansão demanda atenção de oferta
    };
  }

  public simulate(rec: AgentRecommendation): AgentSimulationOutcome {
    return {
      recommendationId: rec.id,
      projectedSuccessProbability: 0.88,
      projectedGmvImpactPct: 12.5,
      projectedCancellationImpactPct: 0.8,
      projectedRiskScore: 24,
      recommendedBySimulation: true,
      simulationNotes: 'Expansão viável com payback estimado em 35 dias.'
    };
  }

  public execute(rec: AgentRecommendation): AgentExecutionResult {
    return {
      executionId: `EXEC-EXP-${Date.now()}`,
      recommendationId: rec.id,
      status: 'APROVADO_AGUARDANDO_JANELA',
      executedAt: Date.now(),
      revertible: true,
      auditHash: `SHA-${Date.now().toString(16)}-EXPANSION`,
      details: `Estudo de expansão aprovado e agendado para homologação municipal.`
    };
  }
}

export const expansionAgent = new ExpansionAgent();
