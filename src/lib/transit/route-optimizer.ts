/**
 * MULTIMODAL ROUTE OPTIMIZER
 * 
 * Otimizador de rotas integradas unindo:
 * - Carros por aplicativo (PARTIU Pop / Conforto)
 * - Moto Táxi (primeira e última milha ágil)
 * - Vans cooperadas e alimentadoras
 * - Ônibus troncais regulares
 * - Fretamento executivo / universitário
 */

export type TransitModalType = 'CARRO_PARTIU' | 'MOTO_TAXI' | 'VAN_COOPERADA' | 'ONIBUS_REGULAR' | 'FRETAMENTO_EXECUTIVO' | 'CAMINHADA';

export interface MultimodalRouteLeg {
  legIndex: number;
  modalType: TransitModalType;
  instructions: string;
  fromLocation: string;
  toLocation: string;
  distanceMeters: number;
  durationMinutes: number;
  costBrl: number;
  departureTimeEstimated: string;
  carrierOrLineIdentifier: string;
}

export interface MultimodalTripItinerary {
  itineraryId: string;
  origin: string;
  destination: string;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalCostBrl: number;
  co2EmissionsGrams: number;
  legs: MultimodalRouteLeg[];
  transferCount: number;
  recommendationReason: string;
}

export class RouteOptimizerEngine {
  public planMultimodalTrip(origin: string, destination: string): MultimodalTripItinerary {
    // Exemplo representativo de rota ótima multimodal
    const legs: MultimodalRouteLeg[] = [
      {
        legIndex: 1,
        modalType: 'CAMINHADA',
        instructions: 'Caminhe 350m até o Ponto de Embarque Cehab',
        fromLocation: origin,
        toLocation: 'Ponto de Embarque Cehab - Praça da Paz',
        distanceMeters: 350,
        durationMinutes: 4,
        costBrl: 0.0,
        departureTimeEstimated: '14:00',
        carrierOrLineIdentifier: 'A pé'
      },
      {
        legIndex: 2,
        modalType: 'VAN_COOPERADA',
        instructions: 'Embarque na Van Linha 01 até o Terminal Rodoviário',
        fromLocation: 'Ponto de Embarque Cehab - Praça da Paz',
        toLocation: 'Terminal Rodoviário Central de Itaperuna',
        distanceMeters: 4200,
        durationMinutes: 12,
        costBrl: 4.50,
        departureTimeEstimated: '14:05',
        carrierOrLineIdentifier: 'CoopVans - Linha 01'
      },
      {
        legIndex: 3,
        modalType: 'MOTO_TAXI',
        instructions: 'Embarque rápido na Moto PARTIU até o portão de destino',
        fromLocation: 'Terminal Rodoviário Central de Itaperuna',
        toLocation: destination,
        distanceMeters: 2100,
        durationMinutes: 5,
        costBrl: 7.00,
        departureTimeEstimated: '14:20',
        carrierOrLineIdentifier: 'PARTIU Moto'
      }
    ];

    const totalDist = legs.reduce((acc, l) => acc + l.distanceMeters, 0) / 1000;
    const totalDur = legs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const totalCost = legs.reduce((acc, l) => acc + l.costBrl, 0);

    return {
      itineraryId: `ITIN-MULTI-${Date.now()}`,
      origin,
      destination,
      totalDistanceKm: Number(totalDist.toFixed(1)),
      totalDurationMinutes: totalDur,
      totalCostBrl: Number(totalCost.toFixed(2)),
      co2EmissionsGrams: 280,
      legs,
      transferCount: 2,
      recommendationReason: 'Melhor relação custo-benefício: 55% mais econômico que táxi direto e 15 minutos mais rápido que ônibus comum.'
    };
  }
}

export const routeOptimizerEngine = new RouteOptimizerEngine();
