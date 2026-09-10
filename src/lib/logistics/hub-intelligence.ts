/**
 * PARTIU REGIONAL HUB INTELLIGENCE & PRIORITY CORRIDORS
 * 
 * Avaliação de Cidades como Hubs de Distribuição e Inteligência Operacional de Corredores.
 * 
 * Calcula:
 * - HubScore (0 a 100): População, Renda, Conectividade, Volume Viagens, Volume Logístico
 * - Classificação em Tiers: Tier S, Tier A, Tier B, Tier C
 * - Modelagem dos 7 Corredores Prioritários Estratégicos:
 *   1. RJ: Itaperuna ↔ Campos dos Goytacazes
 *   2. RJ: Itaperuna ↔ Macaé
 *   3. RJ: Itaperuna ↔ Cabo Frio
 *   4. RJ: Itaperuna ↔ Rio das Ostras
 *   5. RJ + MG: Itaperuna ↔ Muriaé
 *   6. RJ + MG: Itaperuna ↔ Juiz de Fora
 *   7. RJ + ES: Itaperuna ↔ Cachoeiro de Itapemirim
 */

export type HubTier = 'TIER_S' | 'TIER_A' | 'TIER_B' | 'TIER_C';

export interface CityHubEvaluation {
  cityId: string;
  cityName: string;
  uf: string;
  population: number;
  pibPerCapitaBrl: number;
  roadConnectivityScore: number; // 0 a 100
  mobilityTripsDailyVolume: number;
  logisticsDailyPackagesVolume: number;
  hubScore: number; // 0 a 100
  tier: HubTier;
  recommendedRole: 'MACRO_HUB_CROSS_DOCKING' | 'HUB_REGIONAL_DISTRIBUICAO' | 'SUB_HUB_CONEXAO' | 'PONTO_COLETA_ALIMENTADOR';
}

export interface PriorityCorridorIntelligence {
  corridorId: string;
  corridorName: string;
  originCity: string;
  destinationCity: string;
  states: string;
  distanceKm: number;
  estimatedTravelTimeMinutes: number;
  modalPrincipal: 'VAN' | 'ONIBUS_EXECUTIVO' | 'CARRO_COMPARTILHADO';
  
  // Métricas Operacionais
  demandaPassageirosDia: number;
  demandaEncomendasDia: number;
  ocupacaoMediaProjetadaPct: number;
  viagensDiariasRecomendadas: number;
  
  // Métricas Financeiras Consolidadas (Mensais)
  receitaMensalBrutaBrl: number;
  custosOperacionaisMensaisBrl: number;
  receitaMensalLiquidaBrl: number;
  margemContribuicaoPct: number;
  roiAnualizadoPct: number;
}

export class RegionalHubIntelligence {
  private evaluatedHubs: Map<string, CityHubEvaluation> = new Map();
  private priorityCorridors: Map<string, PriorityCorridorIntelligence> = new Map();

  constructor() {
    this.initializeHubDatabase();
    this.initializePriorityCorridors();
  }

  private initializeHubDatabase(): void {
    const rawCities = [
      { id: 'campos-rj', name: 'Campos dos Goytacazes', uf: 'RJ', pop: 515000, pib: 54200, conn: 96, trips: 14200, pkgs: 4800 },
      { id: 'itaperuna-rj', name: 'Itaperuna', uf: 'RJ', pop: 104000, pib: 32400, conn: 88, trips: 6200, pkgs: 1950 },
      { id: 'macae-rj', name: 'Macaé', uf: 'RJ', pop: 265000, pib: 112000, conn: 94, trips: 11800, pkgs: 5400 },
      { id: 'juiz-de-fora-mg', name: 'Juiz de Fora', uf: 'MG', pop: 573000, pib: 41800, conn: 95, trips: 16800, pkgs: 6200 },
      { id: 'cachoeiro-es', name: 'Cachoeiro de Itapemirim', uf: 'ES', pop: 212000, pib: 38900, conn: 86, trips: 7400, pkgs: 2600 },
      { id: 'cabo-frio-rj', name: 'Cabo Frio', uf: 'RJ', pop: 234000, pib: 44200, conn: 84, trips: 8900, pkgs: 3100 },
      { id: 'muriae-mg', name: 'Muriaé', uf: 'MG', pop: 110000, pib: 31200, conn: 82, trips: 4800, pkgs: 1650 },
      { id: 'rio-das-ostras-rj', name: 'Rio das Ostras', uf: 'RJ', pop: 156000, pib: 46800, conn: 83, trips: 6900, pkgs: 2400 }
    ];

    rawCities.forEach(c => {
      const evaluation = this.evaluateCityAsHub(c.id, c.name, c.uf, c.pop, c.pib, c.conn, c.trips, c.pkgs);
      this.evaluatedHubs.set(c.id, evaluation);
    });
  }

  /**
   * Avalia e gera o HubScore da Cidade
   */
  public evaluateCityAsHub(
    cityId: string,
    cityName: string,
    uf: string,
    population: number,
    pibPerCapitaBrl: number,
    roadConnectivityScore: number,
    mobilityTripsDailyVolume: number,
    logisticsDailyPackagesVolume: number
  ): CityHubEvaluation {
    // Pesos: População (20%), PIB (20%), Conectividade (25%), Volume Mobilidade (20%), Carga (15%)
    const scorePop = Math.min(20, (population / 500000) * 20);
    const scorePib = Math.min(20, (pibPerCapitaBrl / 80000) * 20);
    const scoreConn = (roadConnectivityScore / 100) * 25;
    const scoreMob = Math.min(20, (mobilityTripsDailyVolume / 15000) * 20);
    const scoreLog = Math.min(15, (logisticsDailyPackagesVolume / 5000) * 15);

    const hubScore = Math.min(100, Math.round(scorePop + scorePib + scoreConn + scoreMob + scoreLog));

    let tier: HubTier = 'TIER_C';
    let recommendedRole: CityHubEvaluation['recommendedRole'] = 'PONTO_COLETA_ALIMENTADOR';

    if (hubScore >= 85) {
      tier = 'TIER_S';
      recommendedRole = 'MACRO_HUB_CROSS_DOCKING';
    } else if (hubScore >= 70) {
      tier = 'TIER_A';
      recommendedRole = 'HUB_REGIONAL_DISTRIBUICAO';
    } else if (hubScore >= 55) {
      tier = 'TIER_B';
      recommendedRole = 'SUB_HUB_CONEXAO';
    }

    return {
      cityId,
      cityName,
      uf,
      population,
      pibPerCapitaBrl,
      roadConnectivityScore,
      mobilityTripsDailyVolume,
      logisticsDailyPackagesVolume,
      hubScore,
      tier,
      recommendedRole
    };
  }

  /**
   * Inicializa e audita os 7 Corredores Prioritários
   */
  private initializePriorityCorridors(): void {
    const corridorsConfig: Array<{
      id: string;
      name: string;
      orig: string;
      dest: string;
      states: string;
      distKm: number;
      timeMin: number;
      modal: PriorityCorridorIntelligence['modalPrincipal'];
      passengersDay: number;
      cargoDay: number;
      ticketMedio: number;
      freteMedio: number;
    }> = [
      { id: 'CORR-01-ITA-CMP', name: 'Corredor Norte/Noroeste: Itaperuna ↔ Campos', orig: 'Itaperuna', dest: 'Campos dos Goytacazes', states: 'RJ', distKm: 110.5, timeMin: 95, modal: 'VAN', passengersDay: 480, cargoDay: 260, ticketMedio: 36.50, freteMedio: 24.00 },
      { id: 'CORR-02-ITA-MAC', name: 'Corredor Petróleo & Offshore: Itaperuna ↔ Macaé', orig: 'Itaperuna', dest: 'Macaé', states: 'RJ', distKm: 185.0, timeMin: 160, modal: 'ONIBUS_EXECUTIVO', passengersDay: 320, cargoDay: 190, ticketMedio: 58.00, freteMedio: 38.00 },
      { id: 'CORR-03-ITA-CBF', name: 'Corredor Região dos Lagos: Itaperuna ↔ Cabo Frio', orig: 'Itaperuna', dest: 'Cabo Frio', states: 'RJ', distKm: 242.0, timeMin: 215, modal: 'ONIBUS_EXECUTIVO', passengersDay: 210, cargoDay: 120, ticketMedio: 74.00, freteMedio: 45.00 },
      { id: 'CORR-04-ITA-RDO', name: 'Corredor Litorâneo: Itaperuna ↔ Rio das Ostras', orig: 'Itaperuna', dest: 'Rio das Ostras', states: 'RJ', distKm: 198.0, timeMin: 175, modal: 'VAN', passengersDay: 180, cargoDay: 110, ticketMedio: 62.00, freteMedio: 36.00 },
      { id: 'CORR-05-ITA-MUR', name: 'Corredor Interestadual Zona da Mata: Itaperuna ↔ Muriaé', orig: 'Itaperuna', dest: 'Muriaé', states: 'RJ + MG', distKm: 62.0, timeMin: 55, modal: 'VAN', passengersDay: 360, cargoDay: 220, ticketMedio: 22.00, freteMedio: 18.00 },
      { id: 'CORR-06-ITA-JFO', name: 'Corredor Sul Mineiro: Itaperuna ↔ Juiz de Fora', orig: 'Itaperuna', dest: 'Juiz de Fora', states: 'RJ + MG', distKm: 216.0, timeMin: 195, modal: 'ONIBUS_EXECUTIVO', passengersDay: 240, cargoDay: 160, ticketMedio: 68.00, freteMedio: 42.00 },
      { id: 'CORR-07-ITA-CAC', name: 'Corredor Sul Capixaba: Itaperuna ↔ Cachoeiro', orig: 'Itaperuna', dest: 'Cachoeiro de Itapemirim', states: 'RJ + ES', distKm: 102.0, timeMin: 90, modal: 'VAN', passengersDay: 290, cargoDay: 175, ticketMedio: 34.00, freteMedio: 22.00 }
    ];

    corridorsConfig.forEach(c => {
      const diasMes = 30;
      const receitaMensalPassageiros = c.passengersDay * c.ticketMedio * diasMes;
      const receitaMensalCarga = c.cargoDay * c.freteMedio * diasMes;
      const receitaMensalBrutaBrl = Number((receitaMensalPassageiros + receitaMensalCarga).toFixed(2));

      // Viagens necessárias (assumindo vans de 16 lugares ou ônibus de 44)
      const capPorVeiculo = c.modal === 'ONIBUS_EXECUTIVO' ? 44 : 16;
      const viagensDiariasRecomendadas = Math.ceil(c.passengersDay / (capPorVeiculo * 0.85)); // 85% ocupação meta
      const ocupacaoMediaProjetadaPct = Number(((c.passengersDay / (viagensDiariasRecomendadas * capPorVeiculo)) * 100).toFixed(1));

      // Custos operacionais mensais: combustível R$ 1.10/km + pedágios + amortização
      const kmMensal = viagensDiariasRecomendadas * c.distKm * 2 * diasMes;
      const custosOperacionaisMensaisBrl = Number((kmMensal * 1.35).toFixed(2));
      const receitaMensalLiquidaBrl = Number((receitaMensalBrutaBrl - custosOperacionaisMensaisBrl).toFixed(2));
      const margemContribuicaoPct = Number(((receitaMensalLiquidaBrl / receitaMensalBrutaBrl) * 100).toFixed(1));

      // ROI Anualizado: (Lucro Líquido Anual / Capex Alocado para Rota) * 100
      const lucroAnual = receitaMensalLiquidaBrl * 12;
      const capexAlocado = viagensDiariasRecomendadas * (c.modal === 'ONIBUS_EXECUTIVO' ? 240000 : 95000); // Frota em leasing
      const roiAnualizadoPct = Number(((lucroAnual / capexAlocado) * 100).toFixed(1));

      const intelligence: PriorityCorridorIntelligence = {
        corridorId: c.id,
        corridorName: c.name,
        originCity: c.orig,
        destinationCity: c.dest,
        states: c.states,
        distanceKm: c.distKm,
        estimatedTravelTimeMinutes: c.timeMin,
        modalPrincipal: c.modal,
        demandaPassageirosDia: c.passengersDay,
        demandaEncomendasDia: c.cargoDay,
        ocupacaoMediaProjetadaPct,
        viagensDiariasRecomendadas,
        receitaMensalBrutaBrl,
        custosOperacionaisMensaisBrl,
        receitaMensalLiquidaBrl,
        margemContribuicaoPct,
        roiAnualizadoPct
      };

      this.priorityCorridors.set(c.id, intelligence);
    });
  }

  public getHubEvaluation(cityId: string): CityHubEvaluation | undefined {
    return this.evaluatedHubs.get(cityId);
  }

  public getAllHubEvaluations(): CityHubEvaluation[] {
    return Array.from(this.evaluatedHubs.values()).sort((a, b) => b.hubScore - a.hubScore);
  }

  public getCorridorIntelligence(corridorId: string): PriorityCorridorIntelligence | undefined {
    return this.priorityCorridors.get(corridorId);
  }

  public getAllCorridors(): PriorityCorridorIntelligence[] {
    return Array.from(this.priorityCorridors.values());
  }
}

export const regionalHubIntelligence = new RegionalHubIntelligence();
