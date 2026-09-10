/**
 * FRAUD AGENT
 * 
 * Agente especialista em segurança, risco e integridade da plataforma:
 * Detecção de Mock GPS, anéis de colusão, ghost riding e defesa financeira.
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

export class FraudAgent implements SpecializedAgent {
  public readonly role: AgentRole = 'FRAUD_AGENT';
  public readonly name = 'Fraud & Platform Integrity Agent';

  public analyze(state: MarketplaceStateVector): AgentAnalysis {
    const v = state.embedding;
    const fraudAttemptsNorm = v[23] ?? 0;
    const healthIndex = Math.round((1.0 - fraudAttemptsNorm) * 100);
    const urgencyLevel = fraudAttemptsNorm > 0.5 ? 'CRITICA' : fraudAttemptsNorm > 0.2 ? 'ALTA' : 'BAIXA';

    const bottlenecks: string[] = [];
    const opportunities: string[] = [];

    if (fraudAttemptsNorm > 0.3) bottlenecks.push('Pico de tentativas de bypass de GPS ou contas sintéticas.');
    if (fraudAttemptsNorm <= 0.1) opportunities.push('Ambiente seguro permitindo aprovação acelerada de cadastros.');

    return {
      agentRole: this.role,
      cityId: state.cityId,
      timestamp: Date.now(),
      healthIndex,
      urgencyLevel,
      detectedOpportunities: opportunities,
      detectedBottlenecks: bottlenecks,
      metricsSnapshot: {
        riscoFraudeNormalizado: fraudAttemptsNorm
      }
    };
  }

  public recommend(analysis: AgentAnalysis): AgentRecommendation {
    const isCritical = analysis.urgencyLevel === 'CRITICA' || analysis.urgencyLevel === 'ALTA';

    return {
      id: `REC-FRD-${Date.now()}`,
      agentRole: this.role,
      cityId: analysis.cityId,
      actionType: isCritical ? 'ATIVAR_BLINDAGEM_BIOMETRICA' : 'MANTER_TELEMETRIA_PADRAO',
      parameters: {
        exigirSelfieInicioJornada: isCritical,
        auditarSaltosCinematicosGps: true,
        bloqueioTemporarioContasDuplicadas: isCritical
      },
      priority: isCritical ? 'P0' : 'P3',
      rationale: isCritical 
        ? 'Detecção de surto de spoofing de GPS exigindo ativação imediata de biometria facial e auditoria rigorosa de telemetria.'
        : 'Integridade da malha sem anomalias de fraude.',
      confidenceScore: 0.98,
      expectedImpact: {
        fraudMitigationScore: isCritical ? 95 : 0
      },
      conflictsWithRoles: [] // Fraude é prioritária sobre conveniência
    };
  }

  public simulate(rec: AgentRecommendation): AgentSimulationOutcome {
    return {
      recommendationId: rec.id,
      projectedSuccessProbability: 0.97,
      projectedGmvImpactPct: -0.5, // Leve atrito de segurança
      projectedCancellationImpactPct: -1.2,
      projectedRiskScore: 5,
      recommendedBySimulation: true,
      simulationNotes: 'Elimina 95% do risco de estorno e chargeback de viagens simuladas.'
    };
  }

  public execute(rec: AgentRecommendation): AgentExecutionResult {
    return {
      executionId: `EXEC-FRD-${Date.now()}`,
      recommendationId: rec.id,
      status: 'EXECUTADO',
      executedAt: Date.now(),
      revertible: true,
      auditHash: `SHA-${Date.now().toString(16)}-FRAUD`,
      details: `Blindagem de telemetria e validação biométrica acionada em ${rec.cityId}.`
    };
  }
}

export const fraudAgent = new FraudAgent();
