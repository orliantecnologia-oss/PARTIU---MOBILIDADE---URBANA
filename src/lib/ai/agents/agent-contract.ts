/**
 * CONTRATO OPERACIONAL DE AGENTES AUTÔNOMOS ESPECIALIZADOS
 * 
 * Define a interface unificada para os 6 agentes de inteligência de mobilidade:
 * analyze() -> recommend() -> simulate() -> execute()
 */

import { MarketplaceStateVector } from '../partiu-foundation-model';

export type AgentRole = 
  | 'DISPATCH_AGENT'
  | 'REVENUE_AGENT'
  | 'SUPPLY_AGENT'
  | 'DEMAND_AGENT'
  | 'FRAUD_AGENT'
  | 'EXPANSION_AGENT';

export interface AgentAnalysis {
  agentRole: AgentRole;
  cityId: string;
  timestamp: number;
  healthIndex: number; // 0 a 100
  urgencyLevel: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  detectedOpportunities: string[];
  detectedBottlenecks: string[];
  metricsSnapshot: Record<string, number>;
}

export interface AgentRecommendation {
  id: string;
  agentRole: AgentRole;
  cityId: string;
  actionType: string;
  parameters: Record<string, any>;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  rationale: string;
  confidenceScore: number; // 0.0 a 1.0
  expectedImpact: {
    etaVariationMinutes?: number;
    completionRateDeltaPct?: number;
    revenueDeltaBrl?: number;
    driverEarningsDeltaBrl?: number;
    fraudMitigationScore?: number;
  };
  conflictsWithRoles?: AgentRole[];
}

export interface AgentSimulationOutcome {
  recommendationId: string;
  projectedSuccessProbability: number;
  projectedGmvImpactPct: number;
  projectedCancellationImpactPct: number;
  projectedRiskScore: number; // 0 a 100
  recommendedBySimulation: boolean;
  simulationNotes: string;
}

export interface AgentExecutionResult {
  executionId: string;
  recommendationId: string;
  status: 'EXECUTADO' | 'APROVADO_AGUARDANDO_JANELA' | 'REJEITADO_PELO_BOARD' | 'FALHA';
  executedAt: number;
  revertible: boolean;
  auditHash: string;
  details: string;
}

export interface SpecializedAgent {
  role: AgentRole;
  name: string;
  analyze(state: MarketplaceStateVector): AgentAnalysis;
  recommend(analysis: AgentAnalysis): AgentRecommendation;
  simulate(recommendation: AgentRecommendation): AgentSimulationOutcome;
  execute(recommendation: AgentRecommendation): AgentExecutionResult;
}
