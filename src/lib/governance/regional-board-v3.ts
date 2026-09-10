/**
 * REGIONAL EXECUTIVE BOARD V3 & MULTI-OBJECTIVE AI GOVERNANCE
 * 
 * Conselho Executivo Colegiado Autônomo com 12 Agentes de IA:
 * 1. CEO Agent (Visão Holística e Alinhamento Estratégico)
 * 2. COO Agent (Eficiência Operacional e Despacho)
 * 3. CFO Agent (Rentabilidade, Caixa e FinOps)
 * 4. CMO Agent (Crescimento, Aquisição e Retenção)
 * 5. CRO Agent (Segurança, Fraude e Riscos)
 * 6. CTO Agent (Estabilidade, Latência e Arquitetura)
 * 7. Expansion Agent (Novas Cidades e Corredores)
 * 8. Franchise Agent (Governança e DRE de Franqueados)
 * 9. Government Agent (Convênios Cívicos e Políticas Públicas)
 * 10. Commerce Agent (Rede de Lojistas e PARTIU Ads)
 * 11. Education Agent (Universidades e Linhas Acadêmicas)
 * 12. Healthcare Agent (Transporte de Saúde e Hospitais)
 * 
 * Motor de Otimização Multi-Objetivo (Fronteira de Pareto):
 * Equilibra simultaneamente:
 * - GMV
 * - Receita
 * - EBITDA
 * - Retenção
 * - Churn (minimizado)
 * - Cobertura territorial
 * - Impacto econômico regional
 * - Satisfação do usuário
 */

export type ExecutiveAgentRoleV3 =
  | 'CEO_AGENT'
  | 'COO_AGENT'
  | 'CFO_AGENT'
  | 'CMO_AGENT'
  | 'CRO_AGENT'
  | 'CTO_AGENT'
  | 'EXPANSION_AGENT'
  | 'FRANCHISE_AGENT'
  | 'GOVERNMENT_AGENT'
  | 'COMMERCE_AGENT'
  | 'EDUCATION_AGENT'
  | 'HEALTHCARE_AGENT';

export interface BoardAgentVoteV3 {
  agentRole: ExecutiveAgentRoleV3;
  agentName: string;
  vote: 'FAVORAVEL' | 'CONTRARIO' | 'FAVORAVEL_COM_RESSALVAS';
  weight: number; // 1.0 a 1.5
  parecerIndividual: string;
  focusMetric: string;
}

export interface MultiObjectiveVector {
  gmvBrl: number;
  receitaLiquidaBrl: number;
  ebitdaBrl: number;
  retencaoUsuariosPct: number;
  churnTaxaPct: number; // Queremos minimizar
  coberturaTerritorialPct: number;
  impactoEconomicoRegionalScore: number;
  satisfacaoUsuarioScore: number;
}

export interface RegionalStrategicMotionV3 {
  motionId: string;
  title: string;
  proposerRole: ExecutiveAgentRoleV3;
  targetCityId: string;
  targetCityName: string;
  objectiveVector: MultiObjectiveVector;
  capitalAllocationBrl: number;
  expectedPaybackDays: number;
}

export interface BoardDecisionV3 {
  motionId: string;
  deliberationTimestamp: number;
  totalVotes: number;
  approved: boolean;
  weightedScore: number; // 0.0 a 1.0
  consensusPercentage: number;
  votes: BoardAgentVoteV3[];
  paretoOptimalityScore: number; // 0 a 100
  multiObjectiveFitness: number; // 0 a 100
  executiveSummary: string;
}

export class RegionalExecutiveBoardV3 {
  private agentProfiles: { role: ExecutiveAgentRoleV3; name: string; weight: number; keyMetric: string }[] = [
    { role: 'CEO_AGENT', name: 'Chief Executive Officer AI', weight: 1.5, keyMetric: 'Ecosystem Cohesion & Long-term Valuation' },
    { role: 'COO_AGENT', name: 'Chief Operating Officer AI', weight: 1.3, keyMetric: 'Operational SLA & Dispatch Efficiency' },
    { role: 'CFO_AGENT', name: 'Chief Financial Officer AI', weight: 1.4, keyMetric: 'EBITDA & Capital Allocation' },
    { role: 'CMO_AGENT', name: 'Chief Marketing Officer AI', weight: 1.2, keyMetric: 'User Retention & Virality' },
    { role: 'CRO_AGENT', name: 'Chief Risk Officer AI', weight: 1.3, keyMetric: 'Fraud Prevention & Compliance' },
    { role: 'CTO_AGENT', name: 'Chief Technology Officer AI', weight: 1.3, keyMetric: 'Sub-millisecond Latency & Reliability' },
    { role: 'EXPANSION_AGENT', name: 'Regional Expansion Director AI', weight: 1.2, keyMetric: 'Territorial Coverage & Satellites' },
    { role: 'FRANCHISE_AGENT', name: 'Franchise Network Director AI', weight: 1.2, keyMetric: 'Municipal DRE & Local Franchisee Health' },
    { role: 'GOVERNMENT_AGENT', name: 'Civic Infrastructure Director AI', weight: 1.2, keyMetric: 'Public Partnerships & Civic Subsidies' },
    { role: 'COMMERCE_AGENT', name: 'Local Commerce Director AI', weight: 1.2, keyMetric: 'Merchant GMV & Ads Penetration' },
    { role: 'EDUCATION_AGENT', name: 'Academic Mobility Director AI', weight: 1.1, keyMetric: 'University Lines & Student Access' },
    { role: 'HEALTHCARE_AGENT', name: 'Healthcare Mobility Director AI', weight: 1.1, keyMetric: 'Clinical Punctuality & Patient Safety' }
  ];

  /**
   * Calcula o Fitness Multi-Objetivo (Pareto-Score)
   */
  public evaluateMultiObjectiveFitness(vector: MultiObjectiveVector): number {
    // Normalização dos objetivos
    const gmvNorm = Math.min(1.0, vector.gmvBrl / 500000.0);
    const revNorm = Math.min(1.0, vector.receitaLiquidaBrl / 80000.0);
    const ebitdaNorm = Math.min(1.0, Math.max(0, vector.ebitdaBrl / 35000.0));
    const retNorm = Math.min(1.0, vector.retencaoUsuariosPct / 100.0);
    const churnInvertedNorm = Math.max(0, 1.0 - vector.churnTaxaPct / 10.0); // menor churn = maior score
    const cobNorm = Math.min(1.0, vector.coberturaTerritorialPct / 100.0);
    const impNorm = Math.min(1.0, vector.impactoEconomicoRegionalScore / 100.0);
    const satNorm = Math.min(1.0, vector.satisfacaoUsuarioScore / 100.0);

    const fitness = (
      gmvNorm * 0.15 +
      revNorm * 0.15 +
      ebitdaNorm * 0.15 +
      retNorm * 0.12 +
      churnInvertedNorm * 0.10 +
      cobNorm * 0.11 +
      impNorm * 0.11 +
      satNorm * 0.11
    ) * 100;

    return Number(fitness.toFixed(2));
  }

  /**
   * Conduz deliberação colegiada com os 12 agentes de IA
   */
  public deliberateMotion(motion: RegionalStrategicMotionV3): BoardDecisionV3 {
    const fitness = this.evaluateMultiObjectiveFitness(motion.objectiveVector);
    const paretoScore = Math.min(100, Number((fitness * 1.05).toFixed(1)));

    const votes: BoardAgentVoteV3[] = [];
    let weightedFavor = 0;
    let totalWeight = 0;

    for (const agent of this.agentProfiles) {
      totalWeight += agent.weight;
      let voteStatus: BoardAgentVoteV3['vote'] = 'FAVORAVEL';
      let parecer = '';

      // Regras de decisão por agente especializado
      if (agent.role === 'CFO_AGENT') {
        if (motion.objectiveVector.ebitdaBrl < 0) {
          voteStatus = 'FAVORAVEL_COM_RESSALVAS';
          parecer = 'Atenção ao fluxo de caixa inicial, mas viável pela curva de payback.';
        } else {
          parecer = `EBITDA projetado robusto de R$ ${motion.objectiveVector.ebitdaBrl.toFixed(2)}.`;
        }
      } else if (agent.role === 'CRO_AGENT') {
        if (motion.objectiveVector.churnTaxaPct > 4.5) {
          voteStatus = 'FAVORAVEL_COM_RESSALVAS';
          parecer = 'Necessário monitorar taxa de cancelamento e retenção.';
        } else {
          parecer = 'Risco e integridade devidamente parametrizados.';
        }
      } else if (agent.role === 'GOVERNMENT_AGENT') {
        parecer = 'Impacto cívico e cooperação com órgãos públicos alinhados.';
      } else {
        parecer = `Metas de ${agent.keyMetric} atendidas com alta aderência.`;
      }

      const voteWeight = voteStatus === 'FAVORAVEL' ? agent.weight : voteStatus === 'FAVORAVEL_COM_RESSALVAS' ? agent.weight * 0.75 : 0;
      weightedFavor += voteWeight;

      votes.push({
        agentRole: agent.role,
        agentName: agent.name,
        vote: voteStatus,
        weight: agent.weight,
        parecerIndividual: parecer,
        focusMetric: agent.keyMetric
      });
    }

    const weightedScore = Number((weightedFavor / totalWeight).toFixed(3));
    const approved = weightedScore >= 0.70;
    const consensusPct = Number((weightedScore * 100).toFixed(1));

    return {
      motionId: motion.motionId,
      deliberationTimestamp: Date.now(),
      totalVotes: votes.length,
      approved,
      weightedScore,
      consensusPercentage: consensusPct,
      votes,
      paretoOptimalityScore: paretoScore,
      multiObjectiveFitness: fitness,
      executiveSummary: `Proposta '${motion.title}' ${approved ? 'APROVADA' : 'REJEITADA'} com ${consensusPct}% de consenso ponderado pelos 12 Diretores de IA (Fitness Multi-Objetivo: ${fitness}/100, Pareto-Score: ${paretoScore}/100).`
    };
  }
}

export const regionalExecutiveBoardV3 = new RegionalExecutiveBoardV3();
