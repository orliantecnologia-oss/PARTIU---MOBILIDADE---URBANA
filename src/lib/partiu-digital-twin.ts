/**
 * PARTIU DIGITAL TWIN OPERACIONAL
 * 
 * Mantém réplica viva do estado operacional em memória para cada praça municipal.
 * Permite simulação preditiva contínua de micro e macro dinâmicas de oferta e demanda.
 */

import { CIDADES_PARTIU_REGISTRY, type CityOperationConfig } from './partiu-city-os';

export interface HeatmapPoint {
  zoneId: string;
  zoneName: string;
  latitude: number;
  longitude: number;
  intensity: number; // 0.0 a 1.0
  count: number;
}

export interface CityTwinState {
  cityId: string;
  cityName: string;
  uf: string;
  lastUpdated: number;
  
  // Condutores e Passageiros
  motoristasOnline: number;
  motoristasOcupados: number;
  passageirosAguardando: number;
  corridasEmAndamento: number;
  
  // Indicadores de Serviço
  etaMedioMinutos: number;
  surgeMedio: number;
  taxaAceitePercentual: number;
  taxaCancelamentoPercentual: number;
  
  // Heatmaps Espaciais
  heatmapDemanda: HeatmapPoint[];
  heatmapOferta: HeatmapPoint[];
  
  // Fatores de Contexto
  climaAtual: 'LIMPO' | 'CHUVA_LEVE' | 'TEMPESTADE';
  eventosAtivos: string[];
}

export interface TwinSimulationProjection {
  cityId: string;
  timeframeMinutes: 15 | 60;
  projectedDemand: number;
  projectedSupply: number;
  projectedEtaMinutes: number;
  projectedSurge: number;
  projectedAcceptanceRate: number;
  projectedCancellationRate: number;
  deficitSupplyRatio: number; // > 1.0 indica escassez
  riskLevel: 'NORMAL' | 'ATENCAO' | 'ALERTA' | 'CRITICO';
  hotspotsEmRisco: string[];
  recommendedAutonomousActions: string[];
}

export interface HourlyForecast {
  hour: number;
  demandIndex: number; // base 100
  expectedRides: number;
  optimalFleetCount: number;
  surgeExpected: number;
  weatherRisk: boolean;
}

export interface TwinSimulationProjection24H {
  cityId: string;
  generatedAt: number;
  peakHours: number[];
  valleyHours: number[];
  hourlyForecasts: HourlyForecast[];
  totalExpectedRides24H: number;
  estimatedPlatformRevenue: number;
}

class DigitalTwinEngine {
  private twins: Map<string, CityTwinState> = new Map();

  constructor() {
    this.initializeAllCities();
  }

  /**
   * Inicializa réplicas digitais para todas as praças do registro oficial
   */
  public initializeAllCities(): void {
    Object.values(CIDADES_PARTIU_REGISTRY).forEach((cityConfig) => {
      this.initializeCity(cityConfig);
    });
  }

  public initializeCity(config: CityOperationConfig): CityTwinState {
    const defaultState: CityTwinState = {
      cityId: config.cityId,
      cityName: config.cityName,
      uf: config.stateCode,
      lastUpdated: Date.now(),
      motoristasOnline: 48,
      motoristasOcupados: 31,
      passageirosAguardando: 7,
      corridasEmAndamento: 31,
      etaMedioMinutos: 4.2,
      surgeMedio: 1.0,
      taxaAceitePercentual: 91.5,
      taxaCancelamentoPercentual: 3.8,
      climaAtual: 'LIMPO',
      eventosAtivos: [],
      heatmapDemanda: config.hotspots.map((h, i) => ({
        zoneId: `${config.cityId}-zone-${i}`,
        zoneName: h.name,
        latitude: h.center.latitude,
        longitude: h.center.longitude,
        intensity: h.baseSurge / 2.0,
        count: Math.round(h.baseSurge * 10)
      })),
      heatmapOferta: config.hotspots.map((h, i) => ({
        zoneId: `${config.cityId}-zone-sup-${i}`,
        zoneName: `${h.name} (Frota)`,
        latitude: h.center.latitude + 0.002,
        longitude: h.center.longitude - 0.001,
        intensity: (h.baseSurge * 0.9) / 2.0,
        count: Math.round(h.baseSurge * 9)
      }))
    };

    this.twins.set(config.cityId, defaultState);
    return defaultState;
  }

  public getCityTwin(cityId: string): CityTwinState {
    const twin = this.twins.get(cityId);
    if (!twin) {
      const fallbackConfig = (CIDADES_PARTIU_REGISTRY[cityId] || Object.values(CIDADES_PARTIU_REGISTRY)[0])!;
      return this.initializeCity(fallbackConfig);
    }
    return twin;
  }

  public listAllTwins(): CityTwinState[] {
    return Array.from(this.twins.values());
  }

  public updateCityTwinState(cityId: string, delta: Partial<CityTwinState>): CityTwinState {
    const current = this.getCityTwin(cityId);
    const updated: CityTwinState = {
      ...current,
      ...delta,
      lastUpdated: Date.now()
    };
    this.twins.set(cityId, updated);
    return updated;
  }

  /**
   * Simula o comportamento operacional para os próximos 15 minutos (Micro-projeção)
   */
  public simulateNext15Minutes(cityId: string): TwinSimulationProjection {
    const twin = this.getCityTwin(cityId);
    const date = new Date();
    const currentHour = date.getHours();
    const isRush = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);

    // Variações de 15 minutos
    const demandMultiplier = isRush ? 1.25 : twin.climaAtual !== 'LIMPO' ? 1.35 : 1.05;
    const projectedDemand = Math.round((twin.passageirosAguardando + twin.corridasEmAndamento) * demandMultiplier);
    
    // Oferta disponível projetada (motoristas terminando corrida nos prox 15m)
    const completionsIn15m = Math.round(twin.corridasEmAndamento * 0.65);
    const availableSupply = (twin.motoristasOnline - twin.motoristasOcupados) + completionsIn15m;
    
    const deficitSupplyRatio = availableSupply > 0 ? projectedDemand / availableSupply : 2.5;

    let projectedEta = twin.etaMedioMinutos;
    let projectedSurge = twin.surgeMedio;
    let projectedAcceptance = twin.taxaAceitePercentual;
    let projectedCancellation = twin.taxaCancelamentoPercentual;

    if (deficitSupplyRatio > 1.2) {
      projectedEta += (deficitSupplyRatio - 1) * 2.5;
      projectedSurge = Math.min(2.0, projectedSurge + (deficitSupplyRatio - 1) * 0.4);
      projectedCancellation += (deficitSupplyRatio - 1) * 4.0;
      projectedAcceptance = Math.max(50, projectedAcceptance - (deficitSupplyRatio - 1) * 8.0);
    }

    let riskLevel: 'NORMAL' | 'ATENCAO' | 'ALERTA' | 'CRITICO' = 'NORMAL';
    if (deficitSupplyRatio >= 1.6 || projectedEta > 8.0) {
      riskLevel = 'CRITICO';
    } else if (deficitSupplyRatio >= 1.3 || projectedEta > 6.0) {
      riskLevel = 'ALERTA';
    } else if (deficitSupplyRatio >= 1.1 || projectedEta > 5.0) {
      riskLevel = 'ATENCAO';
    }

    const hotspotsEmRisco = twin.heatmapDemanda
      .filter((h) => h.intensity > 0.65 && deficitSupplyRatio > 1.15)
      .map((h) => h.zoneName);

    const recommendedAutonomousActions: string[] = [];
    if (riskLevel === 'CRITICO') {
      recommendedAutonomousActions.push('ATIVAR_MISSAO_RELAMPAGO', 'EXPANDIR_RAIO_MATCHING', 'ATIVAR_SURGE_PREVENTIVO');
    } else if (riskLevel === 'ALERTA') {
      recommendedAutonomousActions.push('DISPARAR_SMART_NUDGES', 'EXPANDIR_RAIO_MATCHING');
    } else if (riskLevel === 'ATENCAO') {
      recommendedAutonomousActions.push('DISPARAR_SMART_NUDGES');
    }

    return {
      cityId,
      timeframeMinutes: 15,
      projectedDemand,
      projectedSupply: availableSupply,
      projectedEtaMinutes: Number(projectedEta.toFixed(1)),
      projectedSurge: Number(projectedSurge.toFixed(2)),
      projectedAcceptanceRate: Number(projectedAcceptance.toFixed(1)),
      projectedCancellationRate: Number(projectedCancellation.toFixed(1)),
      deficitSupplyRatio: Number(deficitSupplyRatio.toFixed(2)),
      riskLevel,
      hotspotsEmRisco,
      recommendedAutonomousActions
    };
  }

  /**
   * Simula o comportamento operacional para os próximos 60 minutos (Médio prazo)
   */
  public simulateNext60Minutes(cityId: string): TwinSimulationProjection {
    const twin = this.getCityTwin(cityId);
    const proj15 = this.simulateNext15Minutes(cityId);

    // Efeito acumulado de 1 hora
    const projectedDemand = Math.round(proj15.projectedDemand * 3.6);
    const projectedSupply = Math.round(twin.motoristasOnline * 1.8);
    const deficitSupplyRatio = projectedSupply > 0 ? projectedDemand / projectedSupply : 2.0;

    let riskLevel: 'NORMAL' | 'ATENCAO' | 'ALERTA' | 'CRITICO' = 'NORMAL';
    if (deficitSupplyRatio >= 1.5 || proj15.projectedEtaMinutes > 7.5) {
      riskLevel = 'CRITICO';
    } else if (deficitSupplyRatio >= 1.25) {
      riskLevel = 'ALERTA';
    } else if (deficitSupplyRatio >= 1.1) {
      riskLevel = 'ATENCAO';
    }

    return {
      cityId,
      timeframeMinutes: 60,
      projectedDemand,
      projectedSupply: projectedSupply,
      projectedEtaMinutes: Number((proj15.projectedEtaMinutes * 1.1).toFixed(1)),
      projectedSurge: Number((Math.min(2.0, proj15.projectedSurge * 1.05)).toFixed(2)),
      projectedAcceptanceRate: Number(Math.max(55, proj15.projectedAcceptanceRate - 2).toFixed(1)),
      projectedCancellationRate: Number((proj15.projectedCancellationRate * 1.15).toFixed(1)),
      deficitSupplyRatio: Number(deficitSupplyRatio.toFixed(2)),
      riskLevel,
      hotspotsEmRisco: proj15.hotspotsEmRisco,
      recommendedAutonomousActions: proj15.recommendedAutonomousActions
    };
  }

  /**
   * Simulação contínua do ciclo diário de 24 horas (Curva de Demanda & Oferta)
   */
  public simulateNext24Hours(cityId: string): TwinSimulationProjection24H {
    const twin = this.getCityTwin(cityId);
    const peakHours = [7, 8, 12, 17, 18, 19];
    const valleyHours = [1, 2, 3, 4, 5, 23];
    const hourlyForecasts: HourlyForecast[] = [];

    let totalRides = 0;
    const baseRidesPerHour = Math.max(15, Math.round(twin.motoristasOnline * 0.8));

    for (let h = 0; h < 24; h++) {
      let demandIndex = 100;
      let surgeExpected = 1.0;
      
      if (peakHours.includes(h)) {
        demandIndex = 185;
        surgeExpected = 1.35;
      } else if (valleyHours.includes(h)) {
        demandIndex = 25;
        surgeExpected = 1.0;
      } else if (h >= 10 && h <= 16) {
        demandIndex = 110;
        surgeExpected = 1.05;
      }

      const expectedRides = Math.round((baseRidesPerHour * demandIndex) / 100);
      const optimalFleetCount = Math.round(expectedRides * 0.75);
      totalRides += expectedRides;

      hourlyForecasts.push({
        hour: h,
        demandIndex,
        expectedRides,
        optimalFleetCount,
        surgeExpected,
        weatherRisk: twin.climaAtual !== 'LIMPO'
      });
    }

    const estimatedTicketMedio = 18.5; // R$
    const platformTakeRate = 0.05; // 5% base take-rate (Modelo Híbrido Assinatura + Comissão)
    const estimatedPlatformRevenue = Math.round(totalRides * estimatedTicketMedio * platformTakeRate);

    return {
      cityId,
      generatedAt: Date.now(),
      peakHours,
      valleyHours,
      hourlyForecasts,
      totalExpectedRides24H: totalRides,
      estimatedPlatformRevenue
    };
  }

  /**
   * Simulação Macro-Econômica V2 integrada:
   * Dimensões Econômica, Financeira, Territorial e Operacional nos horizontes:
   * 24H, 7D, 30D, 90D, 180D e 365D
   */
  public simulateMacroEconomicTwin(cityId: string, horizon: MacroEconomicSimulationHorizon): MacroEconomicTwinProjection {
    const twin = this.getCityTwin(cityId);
    const horizonDays: Record<MacroEconomicSimulationHorizon, number> = {
      '24H': 1,
      '7D': 7,
      '30D': 30,
      '90D': 90,
      '180D': 180,
      '365D': 365
    };

    const dias = horizonDays[horizon] || 30;
    const baseDailyRides = Math.max(80, twin.motoristasOnline * 6 + twin.corridasEmAndamento * 20);
    const growthFactor = Math.pow(1.0025, dias); // 0.25% crescimento diário orgânico
    
    // Operacional
    const corridasTotais = Math.round(baseDailyRides * dias * growthFactor);
    const motoristasProjetados = Math.round(twin.motoristasOnline * (1.0 + (growthFactor - 1.0) * 0.7));
    const passageirosUnicos = Math.round(corridasTotais * 0.38);
    const etaProjetado = Number(Math.max(3.2, twin.etaMedioMinutos * (1.0 - Math.min(0.2, (dias / 365) * 0.15))).toFixed(1));
    const taxaConclusao = Number(Math.min(97.5, twin.taxaAceitePercentual + 1.5).toFixed(1));
    const taxaCancelamento = Number(Math.max(2.5, twin.taxaCancelamentoPercentual * 0.9).toFixed(1));

    // Econômico
    const precoMedio = 19.5;
    const gmv = Math.round(corridasTotais * precoMedio);
    const takeRate = 12.0;
    const receitaBruta = Math.round(gmv * (takeRate / 100.0));
    const elasticidade = -1.2;

    // Financeiro
    const custosOperacionais = Math.round(receitaBruta * 0.45);
    const subsidios = Math.round(receitaBruta * 0.14);
    const margemContribuicao = receitaBruta - custosOperacionais - subsidios;
    const margemPct = Number(((margemContribuicao / Math.max(1, receitaBruta)) * 100).toFixed(1));
    const ebitda = Math.round(margemContribuicao * 0.88);
    const paybackDias = margemContribuicao > 0 ? Math.max(5, Math.round(35000 / (margemContribuicao / dias))) : 90;

    // Territorial
    const raioUrbano = 12.0;
    const zonasAtendidas = Math.min(24, Math.round(6 + (dias / 30) * 2));
    const cobertura = Math.min(98.0, 75.0 + (dias / 365) * 20.0);
    const satelites = dias >= 90 ? ['Zona Rural Norte', 'Polo Universitário', 'Distrito Industrial'] : ['Centro Expandido'];

    const saude = Math.max(10, Math.min(99, Math.round(
      taxaConclusao * 0.4 + (100 - taxaCancelamento * 4) * 0.3 + margemPct * 0.3
    )));

    return {
      cityId,
      cityName: twin.cityName,
      horizon,
      diasSimulados: dias,
      timestamp: Date.now(),
      gmvProjetadoBrl: gmv,
      receitaBrutaPlataformaBrl: receitaBruta,
      takeRateMedioPct: takeRate,
      precoMedioCorridaBrl: precoMedio,
      elasticidadeDemandaObservada: elasticidade,
      custosOperacionaisBrl: custosOperacionais,
      subsidiosInvestidosBrl: subsidios,
      margemContribuicaoBrl: margemContribuicao,
      margemContribuicaoPct: margemPct,
      ebitdaProjetadoBrl: ebitda,
      paybackDias,
      raioUrbanoCobertoKm: raioUrbano,
      zonasAtendidasCount: zonasAtendidas,
      coberturaTerritorialPct: cobertura,
      cidadesSatelitesConectadas: satelites,
      corridasTotaisEstimadas: corridasTotais,
      motoristasAtivosProjetados: motoristasProjetados,
      passageirosUnicosAtendidos: passageirosUnicos,
      etaMedioProjetadoMinutos: etaProjetado,
      taxaConclusaoProjetadaPct: taxaConclusao,
      taxaCancelamentoProjetadaPct: taxaCancelamento,
      indiceSaudeOperacional: saude
    };
  }

  /**
   * Executa simulação para todos os 6 horizontes temporais
   */
  public simulateAllMacroHorizons(cityId: string): Record<MacroEconomicSimulationHorizon, MacroEconomicTwinProjection> {
    const horizons: MacroEconomicSimulationHorizon[] = ['24H', '7D', '30D', '90D', '180D', '365D'];
    const result: Partial<Record<MacroEconomicSimulationHorizon, MacroEconomicTwinProjection>> = {};
    horizons.forEach((h) => {
      result[h] = this.simulateMacroEconomicTwin(cityId, h);
    });
    return result as Record<MacroEconomicSimulationHorizon, MacroEconomicTwinProjection>;
  }
  /**
   * NATIONAL DIGITAL TWIN V3:
   * Fusão de 5 Dimensões Integradas nos 6 Horizontes (24h, 7d, 30d, 90d, 180d, 365d):
   * 1. Digital Twin Operacional
   * 2. Digital Twin Econômico
   * 3. Digital Twin Financeiro
   * 4. Digital Twin Territorial
   * 5. Digital Twin de Expansão
   */
  public simulateNationalDigitalTwinV3(cityId: string, horizon: MacroEconomicSimulationHorizon): NationalDigitalTwinV3Report {
    const macro = this.simulateMacroEconomicTwin(cityId, horizon);

    return {
      simulationId: `TWINV3-${Date.now()}-${cityId}-${horizon}`,
      cityId,
      cityName: macro.cityName,
      horizon,
      diasSimulados: macro.diasSimulados,
      timestamp: Date.now(),
      
      // 1. Gêmeo Operacional
      twinOperacional: {
        corridasConcluidas: macro.corridasTotaisEstimadas,
        frotaAtivaTotal: macro.motoristasAtivosProjetados,
        passageirosAtendidos: macro.passageirosUnicosAtendidos,
        etaMedioMinutos: macro.etaMedioProjetadoMinutos,
        taxaConclusaoPct: macro.taxaConclusaoProjetadaPct,
        taxaCancelamentoPct: macro.taxaCancelamentoProjetadaPct,
        healthScoreOperacional: macro.indiceSaudeOperacional
      },

      // 2. Gêmeo Econômico
      twinEconomico: {
        gmvTotalBrl: macro.gmvProjetadoBrl,
        ticketMedioBrl: macro.precoMedioCorridaBrl,
        takeRatePct: macro.takeRateMedioPct,
        elasticidadePreco: macro.elasticidadeDemandaObservada,
        razaoLiquidezProjetada: Number((macro.motoristasAtivosProjetados / Math.max(1, macro.passageirosUnicosAtendidos * 0.05)).toFixed(2))
      },

      // 3. Gêmeo Financeiro
      twinFinanceiro: {
        receitaBrutaPlataformaBrl: macro.receitaBrutaPlataformaBrl,
        custosOperacionaisBrl: macro.custosOperacionaisBrl,
        subsidiosTotalBrl: macro.subsidiosInvestidosBrl,
        margemContribuicaoBrl: macro.margemContribuicaoBrl,
        margemContribuicaoPct: macro.margemContribuicaoPct,
        ebitdaBrl: macro.ebitdaProjetadoBrl,
        paybackDias: macro.paybackDias
      },

      // 4. Gêmeo Territorial
      twinTerritorial: {
        raioAtendimentoKm: macro.raioUrbanoCobertoKm,
        zonasAtendidasCount: macro.zonasAtendidasCount,
        coberturaTerritorialPct: macro.coberturaTerritorialPct,
        h3CellsCobertasCount: macro.zonasAtendidasCount * 14
      },

      // 5. Gêmeo de Expansão
      twinExpansao: {
        cidadesSatelitesConectadas: macro.cidadesSatelitesConectadas,
        potencialCrescimentoGmvPct: Number((macro.diasSimulados > 30 ? 24.5 : 8.0).toFixed(1)),
        expansionReadinessScore: Math.min(99, Math.round(macro.indiceSaudeOperacional * 0.95))
      },

      resumoSinteticoV3: `National Digital Twin V3 (${macro.cityName} - ${horizon}): GMV projetado de R$ ${(macro.gmvProjetadoBrl / 1e3).toFixed(0)}k com ${macro.corridasTotaisEstimadas.toLocaleString('pt-BR')} corridas, EBITDA de ${macro.margemContribuicaoPct}% e cobertura territorial de ${macro.coberturaTerritorialPct}%.`
    };
  }

  /**
   * NATIONAL DIGITAL TWIN V4:
   * Expansão Multimodal, Logística e Intermunicipal:
   * Integra as 5 Dimensões do V3 + 3 Novas Dimensões:
   * 6. Dimensão Logística (cargas, hubs, throughput de fretes)
   * 7. Dimensão Multimodal (vans, ônibus, carros, motos, integrações)
   * 8. Dimensão Intermunicipal (corredores rodoviários, deadhead e fluxo)
   */
  public simulateNationalDigitalTwinV4(cityId: string, horizon: MacroEconomicSimulationHorizon): NationalDigitalTwinV4Report {
    const v3 = this.simulateNationalDigitalTwinV3(cityId, horizon);
    const macro = this.simulateMacroEconomicTwin(cityId, horizon);

    const baseFactor = macro.diasSimulados;

    return {
      ...v3,
      simulationId: `TWINV4-${Date.now()}-${cityId}-${horizon}`,
      
      // 6. Gêmeo Logístico
      twinLogistica: {
        cargasAtivasCount: Math.round(macro.corridasTotaisEstimadas * 0.28),
        volumeMovimentadoM3: Number(((macro.corridasTotaisEstimadas * 0.28 * 0.035)).toFixed(1)),
        pesoMovimentadoToneladas: Number(((macro.corridasTotaisEstimadas * 0.28 * 4.8) / 1000).toFixed(2)),
        taxaEntregaNoPrazoPct: 98.6,
        ocupacaoMediaBagageirosPct: 74.2,
        throughputCrossDockingKgPorDia: Math.round(macro.motoristasAtivosProjetados * 42)
      },

      // 7. Gêmeo Multimodal
      twinMultimodal: {
        frotaVansAtiva: Math.max(4, Math.round(macro.motoristasAtivosProjetados * 0.18)),
        frotaOnibusAtiva: Math.max(2, Math.round(macro.motoristasAtivosProjetados * 0.06)),
        frotaCarrosAtiva: Math.round(macro.motoristasAtivosProjetados * 0.52),
        frotaMotosAtiva: Math.round(macro.motoristasAtivosProjetados * 0.24),
        passageirosMultimodaisDia: Math.round(macro.passageirosUnicosAtendidos * 0.45 / Math.max(1, baseFactor)),
        tempoMedioTransbordoMinutos: 6.8,
        taxaIntegracaoMultimodalPct: 38.5
      },

      // 8. Gêmeo Intermunicipal
      twinIntermunicipal: {
        viagensIntermunicipaisDia: Math.round(macro.corridasTotaisEstimadas * 0.22 / Math.max(1, baseFactor)),
        volumeCorredoresPrioritariosDia: Math.round(macro.corridasTotaisEstimadas * 0.18 / Math.max(1, baseFactor)),
        indiceDeadheadEvitadoPct: 41.5,
        balancoFluxoOrigemDestinoRatio: 0.94,
        corredoresAtivos: [
          'Itaperuna ↔ Campos',
          'Itaperuna ↔ Macaé',
          'Itaperuna ↔ Muriaé',
          'Itaperuna ↔ Cachoeiro'
        ]
      },

      resumoSinteticoV4: `National Digital Twin V4 (${macro.cityName} - ${horizon}): GMV R$ ${(macro.gmvProjetadoBrl / 1e3).toFixed(0)}k, ${macro.corridasTotaisEstimadas.toLocaleString('pt-BR')} corridas, ${Math.round(macro.corridasTotaisEstimadas * 0.28).toLocaleString('pt-BR')} encomendas logísticas movimentadas, ${Math.max(4, Math.round(macro.motoristasAtivosProjetados * 0.18))} vans ativas e 41.5% de deadhead evitado.`
    };
  }
}

export interface NationalDigitalTwinV4Report extends NationalDigitalTwinV3Report {
  twinLogistica: {
    cargasAtivasCount: number;
    volumeMovimentadoM3: number;
    pesoMovimentadoToneladas: number;
    taxaEntregaNoPrazoPct: number;
    ocupacaoMediaBagageirosPct: number;
    throughputCrossDockingKgPorDia: number;
  };
  twinMultimodal: {
    frotaVansAtiva: number;
    frotaOnibusAtiva: number;
    frotaCarrosAtiva: number;
    frotaMotosAtiva: number;
    passageirosMultimodaisDia: number;
    tempoMedioTransbordoMinutos: number;
    taxaIntegracaoMultimodalPct: number;
  };
  twinIntermunicipal: {
    viagensIntermunicipaisDia: number;
    volumeCorredoresPrioritariosDia: number;
    indiceDeadheadEvitadoPct: number;
    balancoFluxoOrigemDestinoRatio: number;
    corredoresAtivos: string[];
  };
  resumoSinteticoV4: string;
}

export interface NationalDigitalTwinV3Report {
  simulationId: string;
  cityId: string;
  cityName: string;
  horizon: MacroEconomicSimulationHorizon;
  diasSimulados: number;
  timestamp: number;
  twinOperacional: {
    corridasConcluidas: number;
    frotaAtivaTotal: number;
    passageirosAtendidos: number;
    etaMedioMinutos: number;
    taxaConclusaoPct: number;
    taxaCancelamentoPct: number;
    healthScoreOperacional: number;
  };
  twinEconomico: {
    gmvTotalBrl: number;
    ticketMedioBrl: number;
    takeRatePct: number;
    elasticidadePreco: number;
    razaoLiquidezProjetada: number;
  };
  twinFinanceiro: {
    receitaBrutaPlataformaBrl: number;
    custosOperacionaisBrl: number;
    subsidiosTotalBrl: number;
    margemContribuicaoBrl: number;
    margemContribuicaoPct: number;
    ebitdaBrl: number;
    paybackDias: number;
  };
  twinTerritorial: {
    raioAtendimentoKm: number;
    zonasAtendidasCount: number;
    coberturaTerritorialPct: number;
    h3CellsCobertasCount: number;
  };
  twinExpansao: {
    cidadesSatelitesConectadas: string[];
    potencialCrescimentoGmvPct: number;
    expansionReadinessScore: number;
  };
  resumoSinteticoV3: string;
}

export type MacroEconomicSimulationHorizon = '24H' | '7D' | '30D' | '90D' | '180D' | '365D';

export interface MacroEconomicTwinProjection {
  cityId: string;
  cityName: string;
  horizon: MacroEconomicSimulationHorizon;
  diasSimulados: number;
  timestamp: number;
  gmvProjetadoBrl: number;
  receitaBrutaPlataformaBrl: number;
  takeRateMedioPct: number;
  precoMedioCorridaBrl: number;
  elasticidadeDemandaObservada: number;
  custosOperacionaisBrl: number;
  subsidiosInvestidosBrl: number;
  margemContribuicaoBrl: number;
  margemContribuicaoPct: number;
  ebitdaProjetadoBrl: number;
  paybackDias: number;
  raioUrbanoCobertoKm: number;
  zonasAtendidasCount: number;
  coberturaTerritorialPct: number;
  cidadesSatelitesConectadas: string[];
  corridasTotaisEstimadas: number;
  motoristasAtivosProjetados: number;
  passageirosUnicosAtendidos: number;
  etaMedioProjetadoMinutos: number;
  taxaConclusaoProjetadaPct: number;
  taxaCancelamentoProjetadaPct: number;
  indiceSaudeOperacional: number;
}

export const digitalTwinEngine = new DigitalTwinEngine();


