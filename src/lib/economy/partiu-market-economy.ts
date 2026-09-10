/**
 * PARTIU MARKETPLACE ECONOMY ENGINE
 * 
 * Modela a micro e macroeconomia bilateral do ecossistema de mobilidade:
 * - Curvas de Oferta (Supply) e Demanda (Demand)
 * - Equilíbrio de Mercado e Ponto de Equilíbrio de Liquidez
 * - Elasticidade de Preço da Demanda (Ed) e da Oferta (Es)
 * - GMV, Receita da Plataforma, Take-Rate Dinâmico e Ganhos de Condutores
 * - Retenção de Coortes e Eficiência Alocativa
 * - MarketplaceEconomicScore (0 a 100) em 7 dimensões
 */

export interface MarketEconomyRawInput {
  cityId: string;
  cityName: string;
  activeOnlineDrivers: number;
  busyDriversCount: number;
  waitingPassengersCount: number;
  completedTripsPerHour: number;
  averageTripPriceBrl: number;
  averageTripDistanceKm: number;
  averageTripDurationMinutes: number;
  platformTakeRatePct: number; // ex: 5.0 (modelo híbrido)
  averageEtaMinutes: number;
  acceptanceRatePct: number;
  cancellationRatePct: number;
  unfilledDemandRatePct: number;
  driverRetentionRate30dPct: number;
  passengerRetentionRate30dPct: number;
  deadheadKilometersPct: number; // km rodados vazios / km totais
  dailyGmvGrowthPct: number;
  currentSurgeMultiplier: number;
}

export interface EconomicElasticityAnalysis {
  elasticidadePrecoDemanda: number; // Ep < 0 (ex: -1.25)
  elasticidadePrecoOferta: number; // Es > 0 (ex: +0.85)
  elasticidadeTempoEspera: number; // E_eta < 0 (ex: -0.65)
  pontoEquilibrioPrecoBrl: number;
  takeRateOtimoPct: number;
  sensibilidadePrecoDemanda: 'ELASTICA' | 'UNITARIA' | 'INELASTICA';
}

export interface EconomicScoreDimensions {
  liquidez: number; // 0 a 100
  conversao: number; // 0 a 100
  rentabilidade: number; // 0 a 100
  crescimento: number; // 0 a 100
  retencao: number; // 0 a 100
  elasticidade: number; // 0 a 100
  eficienciaOperacional: number; // 0 a 100
}

export interface MarketplaceEconomicSnapshot {
  cityId: string;
  cityName: string;
  timestamp: number;
  gmvHorarioEstimadoBrl: number;
  receitaHorariaPlataformaBrl: number;
  ganhoHorarioTotalMotoristasBrl: number;
  ganhoMedioLiquidoPorHoraCondutorBrl: number;
  razaoLiquidezOfertaDemanda: number; // Condutores disponíveis / Passageiros aguardando
  elasticidade: EconomicElasticityAnalysis;
  dimensoesScore: EconomicScoreDimensions;
  marketplaceEconomicScore: number; // 0 a 100
  statusEconomico: 'EXPANSAO_ALTA_EFICIENCIA' | 'EQUILIBRADO_SAUDAVEL' | 'DEFICIT_LIQUIDEZ' | 'PRESSAO_MARGEM' | 'VULNERAVEL';
  diagnosticoMacro: string;
}

export class MarketplaceEconomyEngine {
  /**
   * Avalia a saúde e a dinâmica econômica do ecossistema de marketplace
   */
  public evaluateMarketEconomy(input: MarketEconomyRawInput): MarketplaceEconomicSnapshot {
    const timestamp = Date.now();
    const gmvHorario = input.completedTripsPerHour * input.averageTripPriceBrl;
    const takeRateDec = input.platformTakeRatePct / 100.0;
    const receitaPlataformaHoraria = gmvHorario * takeRateDec;
    const repasseMotoristasHorario = gmvHorario * (1.0 - takeRateDec);

    const motoristasDisponiveis = Math.max(1, input.activeOnlineDrivers - input.busyDriversCount);
    const passageirosAguardando = Math.max(1, input.waitingPassengersCount);
    const razaoLiquidez = Number((motoristasDisponiveis / passageirosAguardando).toFixed(2));

    // 1. Estimativa microeconômica de Elasticidades
    // Demanda de mobilidade em cidades médias brasileiras apresenta elasticidade-preço típica de -1.1 a -1.4
    // Oferta de motoristas parceiros tem elasticidade típica de +0.7 a +1.0
    const surgeFactor = Math.max(1.0, input.currentSurgeMultiplier);
    const epd = Number((-1.15 - (surgeFactor - 1.0) * 0.45).toFixed(3));
    const eps = Number((0.85 + (surgeFactor - 1.0) * 0.30).toFixed(3));
    const eEta = Number((-0.60 - (input.averageEtaMinutes > 7.0 ? 0.35 : 0.0)).toFixed(3));

    const precoBase = input.averageTripPriceBrl / surgeFactor;
    // Ponto ótimo de equilíbrio de preço
    const precoEquilibrio = Number((precoBase * (1.0 + Math.max(0, 1.0 - razaoLiquidez) * 0.25)).toFixed(2));

    // Curva de Laffer para Take-Rate no Modelo Híbrido: comissão otimizada entre 0% e 5.0%
    const takeRateOtimo = Number(Math.max(1.0, Math.min(5.0, 5.0 - (input.unfilledDemandRatePct * 0.05))).toFixed(1));

    const sensibilidade: EconomicElasticityAnalysis['sensibilidadePrecoDemanda'] = 
      Math.abs(epd) > 1.1 ? 'ELASTICA' : Math.abs(epd) < 0.9 ? 'INELASTICA' : 'UNITARIA';

    const elasticidade: EconomicElasticityAnalysis = {
      elasticidadePrecoDemanda: epd,
      elasticidadePrecoOferta: eps,
      elasticidadeTempoEspera: eEta,
      pontoEquilibrioPrecoBrl: precoEquilibrio,
      takeRateOtimoPct: takeRateOtimo,
      sensibilidadePrecoDemanda: sensibilidade
    };

    // 2. Cálculo das 7 Dimensões do MarketplaceEconomicScore (0 a 100)
    // Dimensão 1: Liquidez (relação de motoristas vs passageiros e taxa de pedidos não atendidos)
    const scoreLiquidez = Math.max(0, Math.min(100, Math.round(
      (Math.min(2.5, razaoLiquidez) / 2.0) * 60 +
      (100 - input.unfilledDemandRatePct * 4) * 0.4
    )));

    // Dimensão 2: Conversão (aceite e conclusão)
    const scoreConversao = Math.max(0, Math.min(100, Math.round(
      input.acceptanceRatePct * 0.65 + (100 - input.cancellationRatePct * 3) * 0.35
    )));

    // Dimensão 3: Rentabilidade (margem saudável sem sufocar o parceiro)
    const margemIdealPct = 12.5;
    const desvioMargem = Math.abs(input.platformTakeRatePct - margemIdealPct);
    const scoreRentabilidade = Math.max(0, Math.min(100, Math.round(100 - desvioMargem * 6)));

    // Dimensão 4: Crescimento de GMV
    const scoreCrescimento = Math.max(0, Math.min(100, Math.round(
      Math.min(100, 50 + input.dailyGmvGrowthPct * 5)
    )));

    // Dimensão 5: Retenção Coorte 30 dias
    const scoreRetencao = Math.max(0, Math.min(100, Math.round(
      input.driverRetentionRate30dPct * 0.55 + input.passengerRetentionRate30dPct * 0.45
    )));

    // Dimensão 6: Equilíbrio de Elasticidade (resiliência a choques)
    const scoreElasticidade = Math.max(0, Math.min(100, Math.round(
      85 - Math.abs(input.currentSurgeMultiplier - 1.15) * 40
    )));

    // Dimensão 7: Eficiência Operacional (baixo deadhead e tempo de espera curto)
    const scoreEficiencia = Math.max(0, Math.min(100, Math.round(
      (100 - input.deadheadKilometersPct * 1.8) * 0.6 +
      Math.max(0, 100 - input.averageEtaMinutes * 10) * 0.4
    )));

    const dimensoes: EconomicScoreDimensions = {
      liquidez: scoreLiquidez,
      conversao: scoreConversao,
      rentabilidade: scoreRentabilidade,
      crescimento: scoreCrescimento,
      retencao: scoreRetencao,
      elasticidade: scoreElasticidade,
      eficienciaOperacional: scoreEficiencia
    };

    // Média ponderada com pesos de Governança de Marketplace
    const scoreFinal = Math.round(
      scoreLiquidez * 0.22 +
      scoreConversao * 0.18 +
      scoreRentabilidade * 0.15 +
      scoreCrescimento * 0.12 +
      scoreRetencao * 0.13 +
      scoreElasticidade * 0.08 +
      scoreEficiencia * 0.12
    );

    // Ganho líquido por hora ativa de motorista
    const condutoresAtivos = Math.max(1, input.activeOnlineDrivers);
    const ganhoLiquidoPorHoraCondutor = Number((
      (repasseMotoristasHorario * 0.72) / condutoresAtivos // deduzindo 28% de custos operacionais médios de combustível
    ).toFixed(2));

    let status: MarketplaceEconomicSnapshot['statusEconomico'] = 'EQUILIBRADO_SAUDAVEL';
    let diagnostico = `Marketplace operando em equilíbrio saudável em ${input.cityName}. Liquidez ratio de ${razaoLiquidez}x e score econômico de ${scoreFinal}/100.`;

    if (scoreFinal >= 85) {
      status = 'EXPANSAO_ALTA_EFICIENCIA';
      diagnostico = `Alta eficiência e aceleração de GMV (+${input.dailyGmvGrowthPct}%). Praça pronta para reinvestimento e alavancagem operacional.`;
    } else if (scoreLiquidez < 50) {
      status = 'DEFICIT_LIQUIDEZ';
      diagnostico = `Déficit crítico de liquidez com ${input.unfilledDemandRatePct}% de chamadas não atendidas. Requer atração de condutores parceiros.`;
    } else if (scoreRentabilidade < 50) {
      status = 'PRESSAO_MARGEM';
      diagnostico = `Pressão de margem: Take-rate de ${input.platformTakeRatePct}% afasta-se do ponto ótimo de ${takeRateOtimo}%.`;
    } else if (scoreFinal < 60) {
      status = 'VULNERAVEL';
      diagnostico = `Mercado vulnerável com fricções de retenção (Motoristas 30d: ${input.driverRetentionRate30dPct}%, Passageiros 30d: ${input.passengerRetentionRate30dPct}%).`;
    }

    return {
      cityId: input.cityId,
      cityName: input.cityName,
      timestamp,
      gmvHorarioEstimadoBrl: Number(gmvHorario.toFixed(2)),
      receitaHorariaPlataformaBrl: Number(receitaPlataformaHoraria.toFixed(2)),
      ganhoHorarioTotalMotoristasBrl: Number(repasseMotoristasHorario.toFixed(2)),
      ganhoMedioLiquidoPorHoraCondutorBrl: ganhoLiquidoPorHoraCondutor,
      razaoLiquidezOfertaDemanda: razaoLiquidez,
      elasticidade,
      dimensoesScore: dimensoes,
      marketplaceEconomicScore: scoreFinal,
      statusEconomico: status,
      diagnosticoMacro: diagnostico
    };
  }
}

export const marketplaceEconomyEngine = new MarketplaceEconomyEngine();
