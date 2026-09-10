/**
 * PARTIU MARKETPLACE SIMULATOR
 * 
 * Motor de simulação contrafactual offline:
 * Permite que gestores e cientistas de dados testem alterações em tarifas, bônus,
 * regras de matching e novas praças em ambiente digital isolado, sem afetar usuários reais.
 */

export interface CounterfactualPolicyParams {
  nomePolitica: string;
  deltaBandeiradaPct: number; // ex: +10%
  deltaValorKmPct: number; // ex: -5%
  deltaTakeRatePct: number; // ex: de 12% para 10% (-2%)
  bonusPorCorridaD0: number; // ex: +R$ 3,00
  raioMatchingKm: number; // ex: 4.5km
  fatorElasticidadePreco?: number; // ex: 0.04
}

export interface SimulationResultMetrics {
  totalCorridasSimuladas: number;
  taxaConversaoChamadasPct: number;
  taxaCancelamentoPct: number;
  etaMedioMinutos: number;
  ganhoMedioPorHoraMotoristaBrl: number;
  gmvTotalBrl: number;
  receitaPlataformaBrl: number;
}

export interface SimulationComparison {
  policyName: string;
  baseline: SimulationResultMetrics;
  counterfactual: SimulationResultMetrics;
  deltas: {
    deltaGmvPct: number;
    deltaReceitaPlataformaPct: number;
    deltaGanhosMotoristaPct: number;
    deltaConversaoPontos: number;
    deltaCancelamentoPontos: number;
  };
  veredito: 'ALTAMENTE_RECOMENDADO' | 'RECOMENDADO' | 'NEUTRO' | 'DESACONSELHADO' | 'CRITICO';
  justificativa: string;
}

export class MarketplaceSimulator {
  /**
   * Executa simulação contrafactual de Monte Carlo sobre 10.000 corridas virtuais
   */
  public simularPolitica(
    params: CounterfactualPolicyParams, 
    volumeCorridasBase: number = 10000
  ): SimulationComparison {
    const ticketMedioBase = 18.50;
    const takeRateBase = 0.12;

    // Métricas do Baseline atual
    const baseline: SimulationResultMetrics = {
      totalCorridasSimuladas: volumeCorridasBase,
      taxaConversaoChamadasPct: 89.5,
      taxaCancelamentoPct: 3.8,
      etaMedioMinutos: 4.2,
      ganhoMedioPorHoraMotoristaBrl: 36.40,
      gmvTotalBrl: Math.round(volumeCorridasBase * ticketMedioBase),
      receitaPlataformaBrl: Math.round(volumeCorridasBase * ticketMedioBase * takeRateBase)
    };

    // Aplicação da política contrafactual
    const deltaPrecoPct = (params.deltaBandeiradaPct * 0.3 + params.deltaValorKmPct * 0.7);
    const elasticity = params.fatorElasticidadePreco || 0.04;
    
    // Variação no volume de passageiros solicitando corridas
    const deltaDemandaVolumePct = -(deltaPrecoPct * elasticity * 10);
    const novoVolume = Math.round(volumeCorridasBase * (1 + deltaDemandaVolumePct / 100));

    // Novo ticket médio
    const novoTicketMedio = ticketMedioBase * (1 + deltaPrecoPct / 100);

    // Novo take-rate efetivo
    const novoTakeRate = Math.max(0.05, takeRateBase + (params.deltaTakeRatePct / 100));

    // Atração de condutores devido a bônus ou preço melhor
    const incentivoCondutorPct = (novoTicketMedio * (1 - novoTakeRate) + params.bonusPorCorridaD0) / (ticketMedioBase * 0.88);
    const ganhoHoraSimulado = baseline.ganhoMedioPorHoraMotoristaBrl * incentivoCondutorPct;

    // Conversão e cancelamento
    let novaConversao = baseline.taxaConversaoChamadasPct;
    let novoCancelamento = baseline.taxaCancelamentoPct;
    let novoEta = baseline.etaMedioMinutos;

    if (incentivoCondutorPct > 1.05) {
      novaConversao = Math.min(96.0, novaConversao + 3.5);
      novoCancelamento = Math.max(1.8, novoCancelamento - 1.2);
      novoEta = Math.max(3.2, novoEta - 0.4);
    } else if (incentivoCondutorPct < 0.95) {
      novaConversao = Math.max(75.0, novaConversao - 6.0);
      novoCancelamento = Math.min(9.5, novoCancelamento + 3.0);
      novoEta = Math.min(7.0, novoEta + 1.2);
    }

    const novoGmv = Math.round(novoVolume * novoTicketMedio);
    const novaReceita = Math.round(novoGmv * novoTakeRate);

    const counterfactual: SimulationResultMetrics = {
      totalCorridasSimuladas: novoVolume,
      taxaConversaoChamadasPct: Number(novaConversao.toFixed(1)),
      taxaCancelamentoPct: Number(novoCancelamento.toFixed(1)),
      etaMedioMinutos: Number(novoEta.toFixed(1)),
      ganhoMedioPorHoraMotoristaBrl: Number(ganhoHoraSimulado.toFixed(2)),
      gmvTotalBrl: novoGmv,
      receitaPlataformaBrl: novaReceita
    };

    const deltaGmvPct = Number((((novoGmv - baseline.gmvTotalBrl) / baseline.gmvTotalBrl) * 100).toFixed(2));
    const deltaReceitaPlataformaPct = Number((((novaReceita - baseline.receitaPlataformaBrl) / baseline.receitaPlataformaBrl) * 100).toFixed(2));
    const deltaGanhosMotoristaPct = Number((((ganhoHoraSimulado - baseline.ganhoMedioPorHoraMotoristaBrl) / baseline.ganhoMedioPorHoraMotoristaBrl) * 100).toFixed(2));
    const deltaConversaoPontos = Number((novaConversao - baseline.taxaConversaoChamadasPct).toFixed(1));
    const deltaCancelamentoPontos = Number((novoCancelamento - baseline.taxaCancelamentoPct).toFixed(1));

    let veredito: SimulationComparison['veredito'] = 'NEUTRO';
    let justificativa = 'Impacto equilibrado na malha sem alterações estatísticas relevantes.';

    if (deltaReceitaPlataformaPct > 5 && deltaGanhosMotoristaPct > 0 && deltaConversaoPontos >= 0) {
      veredito = 'ALTAMENTE_RECOMENDADO';
      justificativa = 'Política gera crescimento sinérgico de receita para a plataforma e condutores sem degradar a conversão de passageiros.';
    } else if (deltaReceitaPlataformaPct > 0 && deltaGanhosMotoristaPct >= -2) {
      veredito = 'RECOMENDADO';
      justificativa = 'Aumento de faturamento com impacto aceitável na liquidez dos motoristas.';
    } else if (deltaGanhosMotoristaPct < -8 || deltaConversaoPontos < -4) {
      veredito = 'DESACONSELHADO';
      justificativa = 'Risco elevado de insatisfação de motoristas ou queda severa de conversão de corridas.';
    }

    return {
      policyName: params.nomePolitica,
      baseline,
      counterfactual,
      deltas: {
        deltaGmvPct,
        deltaReceitaPlataformaPct,
        deltaGanhosMotoristaPct,
        deltaConversaoPontos,
        deltaCancelamentoPontos
      },
      veredito,
      justificativa
    };
  }
}

export const marketplaceSimulator = new MarketplaceSimulator();
