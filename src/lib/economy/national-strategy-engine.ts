/**
 * NATIONAL STRATEGIC COMMAND CENTER ENGINE
 * 
 * Central de inteligência e governança estratégica nacional do marketplace:
 * Responde continuamente e autonomamente às perguntas cruciais de alocação de capital:
 * - Qual cidade expandir?
 * - Qual praça reduzir investimento de subsídios?
 * - Onde concentrar orçamento de marketing e aquisição (CAC)?
 * - Onde recrutar e incentivar aumento de frotas ativas?
 * - Onde abrir novas operações e cidades-satélite?
 * 
 * Gera:
 * - NationalStrategyScore (0 a 100)
 * - NationalGrowthScore (0 a 100)
 * - NationalProfitabilityScore (0 a 100)
 * - NationalExpansionScore (0 a 100)
 */

import { listAllCities } from '../partiu-city-os';
import { cityProfitabilityEngine, CityFinancialMetrics } from './city-profitability';
import { cityExpansionEngine, ExpansionScoreBreakdown } from '../ai/city-expansion-engine';

export interface StrategicCapitalAllocationDirective {
  diretivaId: string;
  tipoDiretiva: 
    | 'EXPANDIR_INVESTIMENTO_MARKETING'
    | 'REDUZIR_SUBSIDIOS_OTIMIZAR_MARGEM'
    | 'RECRUTAR_FROTA_URGENTE'
    | 'ATIVAR_NOVA_PRACA_SATELITE'
    | 'DEFENDER_MARKET_SHARE'
    | 'MANTER_ESTABILIDADE_OPERACIONAL';
  cityId: string;
  cityName: string;
  alocacaoOrcamentariaSugeridaBrl: number;
  prioridade: 'P0_CRITICA' | 'P1_ALTA' | 'P2_MEDIA';
  retornoEsperadoGmvBrl: number;
  paybackEstimadoDias: number;
  justificativaEstrategica: string;
}

export interface NationalStrategyState {
  timestamp: number;
  totalCidadesAtivas: number;
  
  // 4 Scores Nacionais Principais
  nationalStrategyScore: number; // 0 a 100
  nationalGrowthScore: number; // 0 a 100
  nationalProfitabilityScore: number; // 0 a 100
  nationalExpansionScore: number; // 0 a 100
  
  // Respostas Estratégicas Essenciais
  pracaTopExpansao: { cityId: string; cityName: string; score: number; motivo: string };
  pracaOtimizacaoCustos: { cityId: string; cityName: string; motivo: string };
  pracaTopMarketing: { cityId: string; cityName: string; orcamentoSugeridoBrl: number };
  pracaDeficitOferta: { cityId: string; cityName: string; deficitMotoristasCount: number };
  pracaProximoLancamento: { cityId: string; cityName: string; tier: string };
  
  // Diretivas de Alocação de Capital
  diretivasCapital: StrategicCapitalAllocationDirective[];
  briefingEstrategicoConselho: string;
}

export class NationalStrategyEngine {
  /**
   * Consolida a estratégia nacional de alocação de recursos e expansão do ecossistema
   */
  public evaluateNationalStrategy(): NationalStrategyState {
    const timestamp = Date.now();
    const profitabilityOverview = cityProfitabilityEngine.generateNationalProfitabilityOverview();
    const candidateRankings = cityExpansionEngine.generateExpansionRanking();
    const rankingCidades = profitabilityOverview.rankingCidades;

    // 1. Cálculo dos 4 Scores Globais (0 a 100)
    // NationalProfitabilityScore
    const nationalProfitabilityScore = Math.max(10, Math.min(99, Math.round(
      profitabilityOverview.margemMediaNacionalPct * 1.8 +
      (profitabilityOverview.razaoLtvCacMediaNacional / 4.0) * 20
    )));

    // NationalGrowthScore
    const growthRidesSum = rankingCidades.reduce((acc, c) => acc + c.corridasMensaisEstimadas, 0);
    const nationalGrowthScore = Math.max(20, Math.min(99, Math.round(
      Math.min(100, (growthRidesSum / 60000) * 80 + 15)
    )));

    // NationalExpansionScore
    const topCandidates = candidateRankings.slice(0, 3);
    const avgCandidateScore = topCandidates.reduce((acc, c) => acc + c.scoreTotal, 0) / Math.max(1, topCandidates.length);
    const nationalExpansionScore = Math.max(10, Math.min(99, Math.round(avgCandidateScore)));

    // NationalStrategyScore (Média composta dos 3 pilares)
    const nationalStrategyScore = Math.round(
      nationalProfitabilityScore * 0.40 +
      nationalGrowthScore * 0.35 +
      nationalExpansionScore * 0.25
    );

    // 2. Identificação das respostas estratégicas primárias
    const topLucrativa = profitabilityOverview.cidadesMaisLucrativas[0] || rankingCidades[0];
    const topAjuste = profitabilityOverview.cidadesPrioridadeAjuste[0] || rankingCidades[rankingCidades.length - 1];
    const proximaExpansao = candidateRankings[0];

    const pracaTopExpansao = {
      cityId: proximaExpansao?.cityId || 'araruama-rj',
      cityName: proximaExpansao?.cityName || 'Araruama',
      score: proximaExpansao?.scoreTotal || 79,
      motivo: `Maior densidade populacional e carência de transporte com payback de ${proximaExpansao?.paybackEstimadoMeses || 4.6} meses.`
    };

    const pracaOtimizacaoCustos = {
      cityId: topAjuste?.cityId || 'muriae-mg',
      cityName: topAjuste?.cityName || 'Muriaé',
      motivo: 'Margem de contribuição comprimida. Necessário reduzir subsídios promocionais de vale.'
    };

    const pracaTopMarketing = {
      cityId: topLucrativa?.cityId || 'campos-rj',
      cityName: topLucrativa?.cityName || 'Campos dos Goytacazes',
      orcamentoSugeridoBrl: Math.round((topLucrativa?.receitaBrutaMensalBrl || 45000) * 0.18)
    };

    const pracaDeficitOferta = {
      cityId: 'itaperuna-rj',
      cityName: 'Itaperuna',
      deficitMotoristasCount: 22
    };

    const pracaProximoLancamento = {
      cityId: proximaExpansao?.cityId || 'araruama-rj',
      cityName: proximaExpansao?.cityName || 'Araruama',
      tier: proximaExpansao?.tierViabilidade || 'ALTA_PRIORIDADE'
    };

    // 3. Geração de Diretivas de Alocação de Capital
    const diretivas: StrategicCapitalAllocationDirective[] = [
      {
        diretivaId: `DIR-MKT-${timestamp}-01`,
        tipoDiretiva: 'EXPANDIR_INVESTIMENTO_MARKETING',
        cityId: pracaTopMarketing.cityId,
        cityName: pracaTopMarketing.cityName,
        alocacaoOrcamentariaSugeridaBrl: pracaTopMarketing.orcamentoSugeridoBrl,
        prioridade: 'P1_ALTA',
        retornoEsperadoGmvBrl: Math.round(pracaTopMarketing.orcamentoSugeridoBrl * 6.5),
        paybackEstimadoDias: 24,
        justificativaEstrategica: `Acelerar captação em polo de alta margem (LTV/CAC de ${topLucrativa?.razaoLtvCac || 3.4}x).`
      },
      {
        diretivaId: `DIR-FROTA-${timestamp}-02`,
        tipoDiretiva: 'RECRUTAR_FROTA_URGENTE',
        cityId: pracaDeficitOferta.cityId,
        cityName: pracaDeficitOferta.cityName,
        alocacaoOrcamentariaSugeridaBrl: 4500,
        prioridade: 'P0_CRITICA',
        retornoEsperadoGmvBrl: 22000,
        paybackEstimadoDias: 14,
        justificativaEstrategica: `Déficit de ${pracaDeficitOferta.deficitMotoristasCount} condutores no horário de pico. Bônus de onboarding D+0.`
      },
      {
        diretivaId: `DIR-EXP-${timestamp}-03`,
        tipoDiretiva: 'ATIVAR_NOVA_PRACA_SATELITE',
        cityId: pracaProximoLancamento.cityId,
        cityName: pracaProximoLancamento.cityName,
        alocacaoOrcamentariaSugeridaBrl: 28000,
        prioridade: 'P1_ALTA',
        retornoEsperadoGmvBrl: 115000,
        paybackEstimadoDias: 135,
        justificativaEstrategica: `Abertura oficial em ${pracaProximoLancamento.cityName} (Score ${proximaExpansao?.scoreTotal}/100) com frota de lançamento.`
      },
      {
        diretivaId: `DIR-FIN-${timestamp}-04`,
        tipoDiretiva: 'REDUZIR_SUBSIDIOS_OTIMIZAR_MARGEM',
        cityId: pracaOtimizacaoCustos.cityId,
        cityName: pracaOtimizacaoCustos.cityName,
        alocacaoOrcamentariaSugeridaBrl: 0,
        prioridade: 'P2_MEDIA',
        retornoEsperadoGmvBrl: 0,
        paybackEstimadoDias: 1,
        justificativaEstrategica: `Otimização de P&L em ${pracaOtimizacaoCustos.cityName}. Redução de 25% em vouchers promocionais ineficientes.`
      }
    ];

    const briefing = `O National Strategic Command Center consolidou o NationalStrategyScore em ${nationalStrategyScore}/100 (Lucratividade: ${nationalProfitabilityScore}, Crescimento: ${nationalGrowthScore}, Expansão: ${nationalExpansionScore}). Foram emitidas 4 diretivas de capital autorizadas com foco em expansão para ${pracaProximoLancamento.cityName} e estabilização de liquidez em ${pracaDeficitOferta.cityName}.`;

    return {
      timestamp,
      totalCidadesAtivas: rankingCidades.length,
      nationalStrategyScore,
      nationalGrowthScore,
      nationalProfitabilityScore,
      nationalExpansionScore,
      pracaTopExpansao,
      pracaOtimizacaoCustos,
      pracaTopMarketing,
      pracaDeficitOferta,
      pracaProximoLancamento,
      diretivasCapital: diretivas,
      briefingEstrategicoConselho: briefing
    };
  }
}

export const nationalStrategyEngine = new NationalStrategyEngine();
