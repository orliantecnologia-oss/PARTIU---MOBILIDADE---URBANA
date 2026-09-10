/**
 * EVENTS MOBILITY ENGINE
 * 
 * Gestão de mobilidade de grandes eventos, feiras e congressos:
 * - Exposições Agropecuárias e Festivais Musicais
 * - Congressos Médicos e Universitários
 * - Dimensionamento de frota e baias exclusivas de embarque (PUDO)
 * - Controle de surge tarifário e prevenção de gargalos na dispersão
 */

export interface RegionalEvent {
  eventId: string;
  eventName: string;
  cityId: string;
  venueName: string;
  venueAddress: string;
  expectedAttendees: number;
  startDate: string;
  endDate: string;
  peakHours: string[]; // ["23:00", "00:00", "01:00", "04:00"]
  dedicatedLanesPUDO: string[];
  dedicatedShuttleBusesCount: number;
  surgeCapFactor: number; // Teto do multiplicador para não lesar o público
  economicImpactEstimateBrl: number;
  active: boolean;
}

export class EventsEngine {
  private events: Map<string, RegionalEvent> = new Map();

  constructor() {
    this.seedDefaultEvents();
  }

  private seedDefaultEvents(): void {
    const defaultEvents: RegionalEvent[] = [
      {
        eventId: 'EVT-ITAP-01',
        eventName: 'Exposição Agropecuária de Itaperuna (EXPO Itaperuna)',
        cityId: 'itaperuna-rj',
        venueName: 'Parque de Exposições Dr. Raul Veiga',
        venueAddress: 'BR-356, Km 02',
        expectedAttendees: 45000,
        startDate: '2026-05-15',
        endDate: '2026-05-19',
        peakHours: ['21:00', '23:30', '03:30', '04:30'],
        dedicatedLanesPUDO: ['Baia 1 - Vans Circulares', 'Baia 2 - Carros de Aplicativo PARTIU', 'Baia 3 - Táxi'],
        dedicatedShuttleBusesCount: 15,
        surgeCapFactor: 1.4, // Trava de preço ética
        economicImpactEstimateBrl: 3800000.0,
        active: true
      },
      {
        eventId: 'EVT-ITAP-02',
        eventName: 'Festival Gastronômico e Cultural das Águas de Raposo',
        cityId: 'itaperuna-rj',
        venueName: 'Circuito Central de Raposo',
        venueAddress: 'Av. das Fontes, Raposo',
        expectedAttendees: 18000,
        startDate: '2026-07-10',
        endDate: '2026-07-13',
        peakHours: ['12:00', '14:30', '20:00', '22:30'],
        dedicatedLanesPUDO: ['Praça Principal das Fontes', 'Estacionamento Receptivo Norte'],
        dedicatedShuttleBusesCount: 8,
        surgeCapFactor: 1.25,
        economicImpactEstimateBrl: 1450000.0,
        active: true
      }
    ];

    defaultEvents.forEach(e => this.events.set(e.eventId, e));
  }

  public getEventsByCity(cityId: string): RegionalEvent[] {
    return Array.from(this.events.values()).filter(e => e.cityId === cityId && e.active);
  }

  public getEvent(eventId: string): RegionalEvent | undefined {
    return this.events.get(eventId);
  }
}

export const eventsEngine = new EventsEngine();
