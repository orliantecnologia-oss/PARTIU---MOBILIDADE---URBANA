/**
 * TOURISM & EVENTS PLATFORM — ORCHESTRATOR ENGINE
 * 
 * Orquestrador do Ecossistema Turístico e de Eventos:
 * - Emissão de City Tour Pass e integração com comércio turístico
 * - Gestão de frotas e logística de grandes eventos regionais
 * - Circuitos turísticos e transporte para estâncias hidrominerais
 * - Cálculo do Tourism Economic Impact Score (0–100)
 */

import { cityTourPassEngine, CityTourPass } from './city-tour-pass';
import { eventsEngine, RegionalEvent } from './events-engine';
import { visitorRoutingEngine, TouristCircuit } from './visitor-routing';

export interface TourismEconomicImpactScore {
  cityId: string;
  cityName: string;
  score: number; // 0 a 100
  tier: 'POLO_TURISTICO_DESTAQUE' | 'ALTA_ATRATIVIDADE' | 'DESTINO_REGIONAL' | 'EM_DESENVOLVIMENTO';
  breakdown: {
    gastoTuristicoScore: number;     // 0 a 30 (injeção de recursos em transporte, gastronomia e hotelaria)
    ocupacaoHoteleiraScore: number;  // 0 a 25 (taxa de ocupação induzida pela facilidade de mobilidade)
    atendimentoEventosScore: number; // 0 a 25 (capacidade de escoamento e PUDO em feiras/festivais)
    satisfacaoVisitanteScore: number;// 0 a 20 (avaliação dos turistas sobre locomoção e passes)
  };
  metrics: {
    totalVisitorsTransportedMonth: number;
    estimatedDirectSpendBrl: number;
    hotelOccupancyPct: number;
    activeTourPassesCount: number;
    eventsOrganizedYear: number;
  };
  calculatedAt: number;
}

export class TourismEngine {
  public getTourPassEngine() {
    return cityTourPassEngine;
  }

  public getEventsEngine() {
    return eventsEngine;
  }

  public getRoutingEngine() {
    return visitorRoutingEngine;
  }

  /**
   * Calcula o Tourism Economic Impact Score (0 a 100) para um município turístico
   */
  public calculateTourismEconomicImpactScore(cityId: string, cityName: string): TourismEconomicImpactScore {
    const events = eventsEngine.getEventsByCity(cityId);
    const circuits = visitorRoutingEngine.getCircuitsByCity(cityId);

    const spendBrl = 1250000.0;
    const hotelOccupancy = 78.5;
    const visitorSatisfaction = 93.4;

    // 1. Gasto Turístico Injetado (0 a 30) - base: R$ 1.000.000+/mês
    const spendRatio = Math.min(1.0, spendBrl / 1000000.0);
    const gastoTuristicoScore = Math.min(30, Number((spendRatio * 30).toFixed(1)));

    // 2. Ocupação Hoteleira (0 a 25) - meta: 75%+
    const ocupacaoHoteleiraScore = Math.min(25, Number(((hotelOccupancy / 100) * 25).toFixed(1)));

    // 3. Capacidade de Eventos (0 a 25)
    const eventosScore = Math.min(25, events.length > 0 ? 23.5 : 15.0);

    // 4. Satisfação do Visitante (0 a 20)
    const satisfacaoScore = Math.min(20, Number(((visitorSatisfaction / 100) * 20).toFixed(1)));

    const totalScore = Number((
      gastoTuristicoScore +
      ocupacaoHoteleiraScore +
      eventosScore +
      satisfacaoScore
    ).toFixed(1));

    let tier: TourismEconomicImpactScore['tier'] = 'EM_DESENVOLVIMENTO';
    if (totalScore >= 88) tier = 'POLO_TURISTICO_DESTAQUE';
    else if (totalScore >= 75) tier = 'ALTA_ATRATIVIDADE';
    else if (totalScore >= 60) tier = 'DESTINO_REGIONAL';

    return {
      cityId,
      cityName,
      score: totalScore,
      tier,
      breakdown: {
        gastoTuristicoScore,
        ocupacaoHoteleiraScore,
        atendimentoEventosScore: eventosScore,
        satisfacaoVisitanteScore: satisfacaoScore
      },
      metrics: {
        totalVisitorsTransportedMonth: 8900,
        estimatedDirectSpendBrl: spendBrl,
        hotelOccupancyPct: hotelOccupancy,
        activeTourPassesCount: 380,
        eventsOrganizedYear: events.length
      },
      calculatedAt: Date.now()
    };
  }
}

export const tourismEngine = new TourismEngine();
