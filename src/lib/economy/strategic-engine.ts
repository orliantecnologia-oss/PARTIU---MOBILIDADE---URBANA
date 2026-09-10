/**
 * STRATEGIC DECISION ENGINE
 * 
 * Responde continuamente à questão: "Qual decisão gera mais valor para o marketplace?"
 * Avalia sistematicamente intervenções em pricing, subsídios, expansão e incentivos,
 * calculando o StrategicScore (0-100), ROI Esperado, Payback em dias, e impactos líquidos.
 */

export type StrategicActionType =
  | 'AUMENTAR_BONUS_CONDUTOR'
  | 'REDUZIR_BONUS_CONDUTOR'
  | 'SUBIR_SURGE_PREDITIVO'
  | 'REDUZIR_SURGE_PREDITIVO'
  | 'EXPANDIR_RAIO_MATCHING'
  | 'RESTRINGIR_RAIO_MATCHING'
  | 'ABRIR_NOVA_CIDADE'
  | 'INVESTIR_MARKETING_AQUISICAO'
  | 'CRIAR_INCENTIVO_VALE'
  | 'AJUSTAR_TAKE_RATE';

export interface StrategicEvaluationCandidate {
  actionType: StrategicActionType;
  cityId: string;
  cityName: string;
  custoImplementacaoBrl: number;
  descricaoAcao: string;
  parametrosAcao: Record<string, any>;
}

export interface StrategicScoreResult {
  actionType: StrategicActionType;
  cityId: string;
  cityName: string;
  strategicScore: number; // 0 a 100
  roiEsperadoPct: number; // Ex: +185%
  paybackDias: number; // Ex: 14 dias
  impactoGmvBrl: number; // Ex: +R$ 15.000
  impactoReceitaBrl: number; // Ex: +R$ 1.800
  impactoRetencaoPct: number; // Ex: +3.2%
  nivelRisco: 'BAIXO' | 'MODERADO' | 'ELEVADO' | 'CRITICO';
  prioridadeExecucao: 'IMEDIATA_P0' | 'ALTA_P1' | 'MEDIA_P2' | 'DESCARTAR';
  racionalEstrategico: string;
  metricasValidacao: {
    custoImplementacaoBrl: number;
    beneficioLiquidoEstimadoBrl: number;
    indiceEficienciaCapital: number; // Benefício / Custo
  };
}

export interface StrategicDecisionRanking {
  cityId: string;
  cityName: string;
  evaluatedAt: number;
  totalAcoesAvaliadas: number;
  melhorAcaoRecomendada: StrategicScoreResult;
  todasAcoesRanqueadas: StrategicScoreResult[];
  sinteseExecutiva: string;
}

export class StrategicDecisionEngine {
  /**
   * Avalia uma ação estratégica individual calculando ROI, Payback e StrategicScore
   */
  public evaluateAction(
    candidate: StrategicEvaluationCandidate,
    context: {
      gmvDiarioAtualBrl: number;
      receitaDiariaAtualBrl: number;
      motoristasAtivos: number;
      passageirosAtivos: number;
      taxaCancelamentoPct: number;
      taxaAceitePct: number;
    }
  ): StrategicScoreResult {
    let impactoGmv = 0;
    let impactoReceita = 0;
    let impactoRetencao = 0;
    let paybackDias = 30;
    let risco: StrategicScoreResult['nivelRisco'] = 'MODERADO';

    const custo = Math.max(1, candidate.custoImplementacaoBrl);

    switch (candidate.actionType) {
      case 'AUMENTAR_BONUS_CONDUTOR': {
        const aumentoOfertaPct = 0.14;
        impactoGmv = Math.round(context.gmvDiarioAtualBrl * aumentoOfertaPct * 7); // Horizonte 7d
        impactoReceita = Math.round(impactoGmv * 0.12);
        impactoRetencao = 4.8;
        paybackDias = Math.max(3, Math.round((custo / Math.max(1, impactoReceita / 7)) * 1.2));
        risco = custo > context.receitaDiariaAtualBrl * 0.4 ? 'MODERADO' : 'BAIXO';
        break;
      }
      case 'REDUZIR_BONUS_CONDUTOR': {
        impactoGmv = -Math.round(context.gmvDiarioAtualBrl * 0.04 * 7);
        impactoReceita = Math.round(custo * 0.85); // Economia direta de subsídio
        impactoRetencao = -2.1;
        paybackDias = 1;
        risco = context.taxaCancelamentoPct > 12.0 ? 'ELEVADO' : 'BAIXO';
        break;
      }
      case 'SUBIR_SURGE_PREDITIVO': {
        const fatorSurge = 1.25;
        impactoGmv = Math.round(context.gmvDiarioAtualBrl * (fatorSurge - 1.0) * 0.4 * 7);
        impactoReceita = Math.round(impactoGmv * 0.15);
        impactoRetencao = -1.2;
        paybackDias = 1;
        risco = 'MODERADO';
        break;
      }
      case 'REDUZIR_SURGE_PREDITIVO': {
        impactoGmv = Math.round(context.gmvDiarioAtualBrl * 0.06 * 7);
        impactoReceita = -Math.round(context.receitaDiariaAtualBrl * 0.03 * 7);
        impactoRetencao = 3.5;
        paybackDias = 20;
        risco = 'BAIXO';
        break;
      }
      case 'EXPANDIR_RAIO_MATCHING': {
        impactoGmv = Math.round(context.gmvDiarioAtualBrl * 0.08 * 7);
        impactoReceita = Math.round(impactoGmv * 0.12);
        impactoRetencao = 1.5;
        paybackDias = 2;
        risco = 'BAIXO';
        break;
      }
      case 'RESTRINGIR_RAIO_MATCHING': {
        impactoGmv = -Math.round(context.gmvDiarioAtualBrl * 0.03 * 7);
        impactoReceita = -Math.round(context.receitaDiariaAtualBrl * 0.03 * 7);
        impactoRetencao = 0.8; // Menor tempo de pickup agrada motorista
        paybackDias = 15;
        risco = 'BAIXO';
        break;
      }
      case 'ABRIR_NOVA_CIDADE': {
        impactoGmv = Math.round(context.gmvDiarioAtualBrl * 0.35 * 30); // Horizonte 30d
        impactoReceita = Math.round(impactoGmv * 0.12);
        impactoRetencao = 6.0;
        paybackDias = Math.max(45, Math.round((custo / Math.max(1, impactoReceita / 30)) * 1.5));
        risco = 'MODERADO';
        break;
      }
      case 'INVESTIR_MARKETING_AQUISICAO': {
        impactoGmv = Math.round(context.gmvDiarioAtualBrl * 0.18 * 14);
        impactoReceita = Math.round(impactoGmv * 0.12);
        impactoRetencao = 2.4;
        paybackDias = Math.max(12, Math.round((custo / Math.max(1, impactoReceita / 14)) * 1.3));
        risco = 'MODERADO';
        break;
      }
      case 'CRIAR_INCENTIVO_VALE': {
        impactoGmv = Math.round(context.gmvDiarioAtualBrl * 0.09 * 7);
        impactoReceita = Math.round(impactoGmv * 0.05);
        impactoRetencao = 3.8;
        paybackDias = 8;
        risco = 'BAIXO';
        break;
      }
      case 'AJUSTAR_TAKE_RATE': {
        const deltaTake = (candidate.parametrosAcao['novoTakeRatePct'] || 5.0) - 5.0;
        impactoReceita = Math.round(context.gmvDiarioAtualBrl * 7 * (deltaTake / 100.0));
        impactoGmv = deltaTake > 0 ? -Math.round(context.gmvDiarioAtualBrl * 0.02 * 7) : Math.round(context.gmvDiarioAtualBrl * 0.03 * 7);
        impactoRetencao = deltaTake > 0 ? -2.5 : 3.0;
        paybackDias = deltaTake > 0 ? 1 : 14;
        risco = Math.abs(deltaTake) > 3.0 ? 'ELEVADO' : 'BAIXO';
        break;
      }
    }

    const beneficioLiquido = impactoReceita - custo;
    const roiEsperado = Number(((beneficioLiquido / custo) * 100).toFixed(1));
    const indiceEficiencia = Number((Math.max(0, impactoReceita) / custo).toFixed(2));

    // Pontuação composta do StrategicScore (0 a 100)
    // Pondera: ROI (35%), Payback (25%), Retenção (20%), Nível de Risco (20%)
    const scoreRoi = Math.max(0, Math.min(100, (roiEsperado + 100) / 3));
    const scorePayback = Math.max(0, Math.min(100, 100 - (paybackDias * 1.5)));
    const scoreRetencao = Math.max(0, Math.min(100, 50 + impactoRetencao * 10));
    const scoreRisco = risco === 'BAIXO' ? 95 : risco === 'MODERADO' ? 75 : risco === 'ELEVADO' ? 45 : 20;

    const strategicScore = Math.max(5, Math.min(99, Math.round(
      scoreRoi * 0.35 +
      scorePayback * 0.25 +
      scoreRetencao * 0.20 +
      scoreRisco * 0.20
    )));

    let prioridade: StrategicScoreResult['prioridadeExecucao'] = 'MEDIA_P2';
    if (strategicScore >= 80 && roiEsperado > 80 && paybackDias <= 15) {
      prioridade = 'IMEDIATA_P0';
    } else if (strategicScore >= 65 && roiEsperado > 30) {
      prioridade = 'ALTA_P1';
    } else if (strategicScore < 45 || roiEsperado < 0) {
      prioridade = 'DESCARTAR';
    }

    const racional = `Ação [${candidate.actionType}] em ${candidate.cityName}: Custo de R$ ${custo.toLocaleString('pt-BR')} gera benefício líquido de R$ ${beneficioLiquido.toLocaleString('pt-BR')} (ROI de ${roiEsperado}% e Payback de ${paybackDias} dias). Impacto estimado de +R$ ${impactoGmv.toLocaleString('pt-BR')} em GMV e ${impactoRetencao > 0 ? '+' : ''}${impactoRetencao}% em retenção.`;

    return {
      actionType: candidate.actionType,
      cityId: candidate.cityId,
      cityName: candidate.cityName,
      strategicScore,
      roiEsperadoPct: roiEsperado,
      paybackDias,
      impactoGmvBrl: impactoGmv,
      impactoReceitaBrl: impactoReceita,
      impactoRetencaoPct: impactoRetencao,
      nivelRisco: risco,
      prioridadeExecucao: prioridade,
      racionalEstrategico: racional,
      metricasValidacao: {
        custoImplementacaoBrl: custo,
        beneficioLiquidoEstimadoBrl: beneficioLiquido,
        indiceEficienciaCapital: indiceEficiencia
      }
    };
  }

  /**
   * Avalia um leque de ações estratégicas simultâneas para uma praça e ranqueia a melhor opção
   */
  public rankStrategicOptions(
    cityId: string,
    cityName: string,
    candidates: StrategicEvaluationCandidate[],
    context: {
      gmvDiarioAtualBrl: number;
      receitaDiariaAtualBrl: number;
      motoristasAtivos: number;
      passageirosAtivos: number;
      taxaCancelamentoPct: number;
      taxaAceitePct: number;
    }
  ): StrategicDecisionRanking {
    const scoredList = candidates.map((c) => this.evaluateAction(c, context));
    // Ordenação decrescente por StrategicScore
    scoredList.sort((a, b) => b.strategicScore - a.strategicScore);

    const topAcao = scoredList[0] || {
      actionType: 'AUMENTAR_BONUS_CONDUTOR',
      cityId,
      cityName,
      strategicScore: 75,
      roiEsperadoPct: 120,
      paybackDias: 7,
      impactoGmvBrl: 5000,
      impactoReceitaBrl: 600,
      impactoRetencaoPct: 2.5,
      nivelRisco: 'BAIXO',
      prioridadeExecucao: 'ALTA_P1',
      racionalEstrategico: 'Ação padrão de estabilização de liquidez.',
      metricasValidacao: {
        custoImplementacaoBrl: 500,
        beneficioLiquidoEstimadoBrl: 100,
        indiceEficienciaCapital: 1.2
      }
    };

    const sintese = `O Strategic Decision Engine avaliou ${scoredList.length} cenários para ${cityName}. A decisão de maior valor econômico para o ecossistema é [${topAcao.actionType}] com StrategicScore de ${topAcao.strategicScore}/100 e Payback de ${topAcao.paybackDias} dias.`;

    return {
      cityId,
      cityName,
      evaluatedAt: Date.now(),
      totalAcoesAvaliadas: scoredList.length,
      melhorAcaoRecomendada: topAcao,
      todasAcoesRanqueadas: scoredList,
      sinteseExecutiva: sintese
    };
  }
}

export const strategicDecisionEngine = new StrategicDecisionEngine();
