/**
 * AUTONOMOUS CAPITAL ALLOCATION ENGINE
 * 
 * Motor de Alocação Autônoma de Capital Financeiro e Investimento:
 * Decide autonomamente:
 * - Onde investir capital de tesouraria?
 * - Onde expandir frotas e novas operações?
 * - Onde subsidiar passageiros e motoristas?
 * - Onde reduzir incentivos e otimizar margem líquida?
 * 
 * Baseado na otimização multiobjetivo de:
 * ROI, Payback, LTV, CAC, Market Share e Expansion Score
 */

export interface CapitalAllocationCandidate {
  cityId: string;
  cityName: string;
  tipoOportunidade: 'NOVA_EXPANSAO' | 'ACELERACAO_MKT' | 'SUBSIDIO_LIQUIDEZ' | 'OTIMIZACAO_MARGEM';
  capitalRequeridoBrl: number;
  roiEstimadoPct: number;
  paybackDias: number;
  ltvCacRatio: number;
  marketShareAtualPct: number;
  expansionScore: number;
}

export interface CapitalAllocationDecision {
  cityId: string;
  cityName: string;
  tipoOportunidade: CapitalAllocationCandidate['tipoOportunidade'];
  capitalAlocadoBrl: number;
  retornoEsperadoGmvBrl: number;
  retornoEsperadoReceitaBrl: number;
  prioridade: 'P0_ESTRATEGICA' | 'P1_ALTA' | 'P2_APROVADA' | 'REJEITADA';
  scoreAtratividadeCapital: number; // 0 a 100
  justificativaAlocacao: string;
}

export interface CapitalAllocationPortfolio {
  timestamp: number;
  orcamentoTotalDisponivelBrl: number;
  totalAlocadoBrl: number;
  saldoRemanescenteBrl: number;
  roiMedioPonderadoPct: number;
  paybackMedioPonderadoDias: number;
  decisoesAlocadas: CapitalAllocationDecision[];
  sinteseExecutivaTesouraria: string;
}

export class CapitalAllocationEngine {
  /**
   * Otimiza a alocação de um orçamento global de investimento entre candidatos concorrentes
   */
  public allocateCapitalPortfolio(
    orcamentoDisponivelBrl: number,
    candidates: CapitalAllocationCandidate[]
  ): CapitalAllocationPortfolio {
    const timestamp = Date.now();
    let saldo = orcamentoDisponivelBrl;
    const decisoes: CapitalAllocationDecision[] = [];

    // 1. Pontuação de Atratividade de Capital para cada candidato (0 a 100)
    // Pondera: ROI (30%), LTV/CAC (25%), Payback (20%), Expansion Score (15%), Potencial de Market Share (10%)
    const scoredCandidates = candidates.map((c) => {
      const scoreRoi = Math.max(0, Math.min(100, (c.roiEstimadoPct / 200.0) * 100));
      const scoreLtvCac = Math.max(0, Math.min(100, (c.ltvCacRatio / 5.0) * 100));
      const scorePayback = Math.max(0, Math.min(100, 100 - (c.paybackDias * 1.2)));
      const scoreExpansion = Math.max(0, Math.min(100, c.expansionScore));
      const scoreMarketShare = Math.max(0, Math.min(100, 100 - c.marketShareAtualPct)); // Mais espaço para crescer

      const atratividade = Math.max(5, Math.min(99, Math.round(
        scoreRoi * 0.30 +
        scoreLtvCac * 0.25 +
        scorePayback * 0.20 +
        scoreExpansion * 0.15 +
        scoreMarketShare * 0.10
      )));

      return { ...c, atratividade };
    });

    // Ordenação decrescente por score de atratividade
    scoredCandidates.sort((a, b) => b.atratividade - a.atratividade);

    let gmvTotalEsperado = 0;
    let receitaTotalEsperada = 0;
    let somaRoiPonderado = 0;
    let somaPaybackPonderado = 0;
    let capitalTotalAlocado = 0;

    scoredCandidates.forEach((c) => {
      if (saldo >= c.capitalRequeridoBrl && c.atratividade >= 60) {
        const capital = c.capitalRequeridoBrl;
        saldo -= capital;
        capitalTotalAlocado += capital;

        const gmvRetorno = Math.round(capital * (c.roiEstimadoPct > 100 ? 6.2 : 4.5));
        const receitaRetorno = Math.round(gmvRetorno * 0.12);

        gmvTotalEsperado += gmvRetorno;
        receitaTotalEsperada += receitaRetorno;
        somaRoiPonderado += c.roiEstimadoPct * capital;
        somaPaybackPonderado += c.paybackDias * capital;

        decisoes.push({
          cityId: c.cityId,
          cityName: c.cityName,
          tipoOportunidade: c.tipoOportunidade,
          capitalAlocadoBrl: capital,
          retornoEsperadoGmvBrl: gmvRetorno,
          retornoEsperadoReceitaBrl: receitaRetorno,
          prioridade: c.atratividade >= 80 ? 'P0_ESTRATEGICA' : 'P1_ALTA',
          scoreAtratividadeCapital: c.atratividade,
          justificativaAlocacao: `Alocação de R$ ${capital.toLocaleString('pt-BR')} aprovada para [${c.tipoOportunidade}]. Score: ${c.atratividade}/100, ROI: ${c.roiEstimadoPct}%, Payback: ${c.paybackDias}d, LTV/CAC: ${c.ltvCacRatio}x.`
        });
      } else {
        decisoes.push({
          cityId: c.cityId,
          cityName: c.cityName,
          tipoOportunidade: c.tipoOportunidade,
          capitalAlocadoBrl: 0,
          retornoEsperadoGmvBrl: 0,
          retornoEsperadoReceitaBrl: 0,
          prioridade: 'REJEITADA',
          scoreAtratividadeCapital: c.atratividade,
          justificativaAlocacao: c.atratividade < 60 
            ? `Rejeitado por baixa atratividade econômica (${c.atratividade}/100).` 
            : `Rejeitado por restrição orçamentária no ciclo atual.`
        });
      }
    });

    const roiMedio = capitalTotalAlocado > 0 ? Number((somaRoiPonderado / capitalTotalAlocado).toFixed(1)) : 0;
    const paybackMedio = capitalTotalAlocado > 0 ? Number((somaPaybackPonderado / capitalTotalAlocado).toFixed(1)) : 0;

    const sintese = `O Autonomous Capital Allocation Engine alocou R$ ${capitalTotalAlocado.toLocaleString('pt-BR')} de R$ ${orcamentoDisponivelBrl.toLocaleString('pt-BR')} disponíveis em ${decisoes.filter((d) => d.capitalAlocadoBrl > 0).length} praças prioritárias com ROI médio ponderado de ${roiMedio}% e Payback médio de ${paybackMedio} dias.`;

    return {
      timestamp,
      orcamentoTotalDisponivelBrl: orcamentoDisponivelBrl,
      totalAlocadoBrl: capitalTotalAlocado,
      saldoRemanescenteBrl: saldo,
      roiMedioPonderadoPct: roiMedio,
      paybackMedioPonderadoDias: paybackMedio,
      decisoesAlocadas: decisoes,
      sinteseExecutivaTesouraria: sintese
    };
  }
}

export const capitalAllocationEngine = new CapitalAllocationEngine();
