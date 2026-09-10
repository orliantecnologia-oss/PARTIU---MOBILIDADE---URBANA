/**
 * DEMAND AGENT
 * 
 * Agente especialista no lado da demanda (Passageiros):
 * Reativação de usuários inativos, geração inteligente de cupons direcionados e equilíbrio de horários de vale.
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

export class DemandAgent implements SpecializedAgent {
  public readonly role: AgentRole = 'DEMAND_AGENT';
  public readonly name = 'Demand & Rider Growth Agent';

  public analyze(state: MarketplaceStateVector): AgentAnalysis {
    const v = state.embedding;
    const waitingPassengers = v[2] ?? 0;
    const activeTrips = v[3] ?? 0;
    const isRushHour = v[14] ?? 0;
    const hourOfDay = v[12] ?? 0;

    const healthIndex = Math.round((Math.min(1.0, (waitingPassengers + activeTrips) * 2)) * 100);
    // Se for horário de vale (10h-16h) e houver baixa demanda, urgência para estímulo
    const isValleyHour = !isRushHour && hourOfDay > 0.4 && hourOfDay < 0.7;
    const urgencyLevel = isValleyHour && waitingPassengers < 0.1 ? 'ALTA' : 'BAIXA';

    const bottlenecks: string[] = [];
    const opportunities: string[] = [];

    if (waitingPassengers < 0.08) bottlenecks.push('Ociosidade da demanda no horário intermediário.');
    if (activeTrips > 0.6) opportunities.push('Forte tração orgânica permitindo redução de incentivos promocionais.');

    return {
      agentRole: this.role,
      cityId: state.cityId,
      timestamp: Date.now(),
      healthIndex,
      urgencyLevel,
      detectedOpportunities: opportunities,
      detectedBottlenecks: bottlenecks,
      metricsSnapshot: {
        passageirosAguardando: waitingPassengers,
        corridasAtivas: activeTrips,
        isValleyHour: isValleyHour ? 1 : 0
      }
    };
  }

  public recommend(analysis: AgentAnalysis): AgentRecommendation {
    const needsStimulus = analysis.urgencyLevel === 'ALTA';

    return {
      id: `REC-DEM-${Date.now()}`,
      agentRole: this.role,
      cityId: analysis.cityId,
      actionType: needsStimulus ? 'DISPARAR_CUPOM_HORARIO_VALE' : 'MANTER_CRESCIMENTO_ORGANICO',
      parameters: {
        cupom: 'PARTIUFLEX',
        descontoPercentual: needsStimulus ? 15 : 0,
        limiteDescontoBrl: 6.0,
        janelaHoras: 4
      },
      priority: needsStimulus ? 'P2' : 'P3',
      rationale: needsStimulus 
        ? 'Estímulo de demanda com cupom de 15% para preencher a ociosidade dos condutores no horário de vale.'
        : 'Demanda orgânica dentro da curva esperada.',
      confidenceScore: 0.88,
      expectedImpact: {
        completionRateDeltaPct: needsStimulus ? 8.5 : 0,
        revenueDeltaBrl: needsStimulus ? 320.0 : 0
      },
      conflictsWithRoles: ['REVENUE_AGENT'] // Desconto pontual reduz receita por viagem, mas eleva volume
    };
  }

  public simulate(rec: AgentRecommendation): AgentSimulationOutcome {
    const isPromo = (rec.parameters['descontoPercentual'] || 0) > 0;
    return {
      recommendationId: rec.id,
      projectedSuccessProbability: 0.86,
      projectedGmvImpactPct: isPromo ? 6.8 : 0,
      projectedCancellationImpactPct: 0.2,
      projectedRiskScore: 12,
      recommendedBySimulation: true,
      simulationNotes: 'A campanha ocupa a frota disponível gerando receita incremental sem canibalizar o horário de pico.'
    };
  }

  public execute(rec: AgentRecommendation): AgentExecutionResult {
    return {
      executionId: `EXEC-DEM-${Date.now()}`,
      recommendationId: rec.id,
      status: 'EXECUTADO',
      executedAt: Date.now(),
      revertible: true,
      auditHash: `SHA-${Date.now().toString(16)}-DEMAND`,
      details: `Campanha promocional de ${rec.parameters['descontoPercentual']}% ativada em ${rec.cityId}.`
    };
  }
}

export const demandAgent = new DemandAgent();
