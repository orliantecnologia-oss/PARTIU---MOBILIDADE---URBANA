/**
 * DRIVER CREDIT SCORE ENGINE — CRÉDITO & ANTECIPAÇÃO PARA MOTORISTAS
 * 
 * Motor de avaliação de risco de crédito, score comportamental e concessão financeira:
 * - DriverCreditScore (0 a 1000)
 * - Tiers de Classificação de Risco: A+, A, B, C, D
 * - Limites Pré-Aprovados de Microcrédito, Linha Combustível e Financiamento Veicular
 * - Antecipação de Recebíveis com Retenção Automática no Split Diário
 */

export type CreditTier = 'A+' | 'A' | 'B' | 'C' | 'D';

export interface DriverCreditInput {
  driverId: string;
  driverName?: string;
  tempoPlataformaMeses: number;
  rendaMediaSemanalBrl: number;
  corridasConcluidas90Dias: number;
  taxaAceitePct: number;
  taxaCancelamentoPct: number;
  avaliacaoMediaEstrelas: number; // 1 a 5
  diasAtivosSemanaMedia: number; // 1 a 7
  inadimplenciaHistoricaCount: number;
  scoreEconomicoIndividual?: number; // 0 a 100
}

export interface PreApprovedCreditLines {
  linhaCombustivelGiroBrl: number;
  microcreditoEmergencialBrl: number;
  financiamentoManutencaoBrl: number;
  taxaJurosMensalPct: number;
  prazoMaximoSemanas: number;
  antecipacaoRecebiveisDisponivel: boolean;
}

export interface DriverCreditProfile {
  driverId: string;
  timestamp: number;
  creditScore: number; // 0 a 1000
  creditTier: CreditTier;
  limiteTotalCreditoPreAprovadoBrl: number;
  linhasCredito: PreApprovedCreditLines;
  fatoresPontuacao: {
    estabilidadeRenda: number; // 0 a 300 pts
    assiduidadeEConclusao: number; // 0 a 250 pts
    reputacaoEQualidade: number; // 0 a 200 pts
    tempoDeCasa: number; // 0 a 150 pts
    pontualidadeHistorica: number; // 0 a 100 pts
  };
  condicoesRetencaoSplitPct: number; // Retenção no split diário para amortização
  parecerConcessao: string;
}

export class DriverCreditEngine {
  /**
   * Avalia o perfil de crédito de um condutor e gera o DriverCreditScore de 0 a 1000
   */
  public evaluateDriverCredit(input: DriverCreditInput): DriverCreditProfile {
    const timestamp = Date.now();

    // 1. Estabilidade e Volume de Renda (Peso 300 pts)
    // Renda semanal de R$ 1.500+ atinge pontuação máxima
    const scoreRenda = Math.max(0, Math.min(300, Math.round(
      (input.rendaMediaSemanalBrl / 1500.0) * 260 + (input.diasAtivosSemanaMedia >= 5 ? 40 : 15)
    )));

    // 2. Assiduidade e Taxa de Conclusão (Peso 250 pts)
    const scoreConclusao = Math.max(0, Math.min(250, Math.round(
      (input.taxaAceitePct * 1.5) + (Math.max(0, 100 - input.taxaCancelamentoPct * 4) * 1.0)
    )));

    // 3. Reputação e Qualidade do Serviço (Peso 200 pts)
    // 4.90+ estrelas atinge 200 pts
    const scoreReputacao = Math.max(0, Math.min(200, Math.round(
      Math.max(0, (input.avaliacaoMediaEstrelas - 4.0) * 200)
    )));

    // 4. Tempo de Casa e Fidelidade (Peso 150 pts)
    // 12+ meses atinge 150 pts
    const scoreTempo = Math.max(0, Math.min(150, Math.round(
      (Math.min(12, input.tempoPlataformaMeses) / 12.0) * 150
    )));

    // 5. Pontualidade e Histórico sem Inadimplência (Peso 100 pts)
    const penalidadeInadimplencia = input.inadimplenciaHistoricaCount * 50;
    const scoreHistorico = Math.max(0, Math.min(100, 100 - penalidadeInadimplencia));

    const totalScore = Math.max(50, Math.min(995,
      scoreRenda + scoreConclusao + scoreReputacao + scoreTempo + scoreHistorico
    ));

    // Classificação em Tiers e Linhas de Crédito Pré-Aprovadas
    let tier: CreditTier = 'D';
    let limiteCombustivel = 0;
    let microcredito = 0;
    let manutencao = 0;
    let jurosMensal = 0;
    let prazoSemanas = 0;
    let retencaoSplit = 0;
    let antecipacao = false;
    let parecer = '';

    if (totalScore >= 850) {
      tier = 'A+';
      limiteCombustivel = 1200;
      microcredito = 4000;
      manutencao = 3500;
      jurosMensal = 1.15; // 1.15% a.m. (taxa prime)
      prazoSemanas = 24;
      retencaoSplit = 12.0; // retém 12% dos repasses diários
      antecipacao = true;
      parecer = 'Score Excepcional (A+). Motorista âncora de altíssima confiabilidade e baixíssimo risco de default.';
    } else if (totalScore >= 750) {
      tier = 'A';
      limiteCombustivel = 800;
      microcredito = 2500;
      manutencao = 2000;
      jurosMensal = 1.45;
      prazoSemanas = 16;
      retencaoSplit = 15.0;
      antecipacao = true;
      parecer = 'Score Ótimo (A). Linhas de crédito liberadas para combustível e giro operacional com liquidação D+0.';
    } else if (totalScore >= 650) {
      tier = 'B';
      limiteCombustivel = 500;
      microcredito = 1200;
      manutencao = 1000;
      jurosMensal = 1.95;
      prazoSemanas = 12;
      retencaoSplit = 18.0;
      antecipacao = true;
      parecer = 'Score Bom (B). Linhas de giro aprovadas com monitoramento automático de frequência de corridas.';
    } else if (totalScore >= 500) {
      tier = 'C';
      limiteCombustivel = 250;
      microcredito = 500;
      manutencao = 0;
      jurosMensal = 2.60;
      prazoSemanas = 6;
      retencaoSplit = 22.0;
      antecipacao = false;
      parecer = 'Score Moderado (C). Crédito restrito à antecipação emergencial condicionada a 22% de retenção no split.';
    } else {
      tier = 'D';
      limiteCombustivel = 0;
      microcredito = 0;
      manutencao = 0;
      jurosMensal = 0;
      prazoSemanas = 0;
      retencaoSplit = 0;
      antecipacao = false;
      parecer = 'Score em Risco (D). Crédito indisponível. Plano de aceleração de corridas sugerido para elevar score.';
    }

    const limiteTotal = limiteCombustivel + microcredito + manutencao;

    return {
      driverId: input.driverId,
      timestamp,
      creditScore: totalScore,
      creditTier: tier,
      limiteTotalCreditoPreAprovadoBrl: limiteTotal,
      linhasCredito: {
        linhaCombustivelGiroBrl: limiteCombustivel,
        microcreditoEmergencialBrl: microcredito,
        financiamentoManutencaoBrl: manutencao,
        taxaJurosMensalPct: jurosMensal,
        prazoMaximoSemanas: prazoSemanas,
        antecipacaoRecebiveisDisponivel: antecipacao
      },
      fatoresPontuacao: {
        estabilidadeRenda: scoreRenda,
        assiduidadeEConclusao: scoreConclusao,
        reputacaoEQualidade: scoreReputacao,
        tempoDeCasa: scoreTempo,
        pontualidadeHistorica: scoreHistorico
      },
      condicoesRetencaoSplitPct: retencaoSplit,
      parecerConcessao: parecer
    };
  }
}

export const driverCreditEngine = new DriverCreditEngine();
