/**
 * CAMPUS ROUTING & ACADEMIC VANS NETWORK
 * 
 * Rotas expressas universitárias, linhas de vans acadêmicas
 * e sincronização de horários de embarque com turnos de aulas.
 */

export interface AcademicRoute {
  routeId: string;
  routeName: string;
  cityId: string;
  universityIds: string[];
  originTerminal: string;
  destinationCampus: string;
  stops: string[];
  timetable: {
    morningDeparture: string[];
    eveningDeparture: string[];
    nightReturn: string[];
  };
  capacitySeatsPerTrip: number;
  allocatedVehiclesCount: number;
  ticketPriceBrl: number;
  studentDiscountedPriceBrl: number;
  active: boolean;
}

export class CampusRoutingEngine {
  private routes: Map<string, AcademicRoute> = new Map();

  constructor() {
    this.seedDefaultRoutes();
  }

  private seedDefaultRoutes(): void {
    const routes: AcademicRoute[] = [
      {
        routeId: 'ACAD-ITAP-01',
        routeName: 'Linha Universitária 01: Rodoviária — Polo UNIG / Redentor',
        cityId: 'itaperuna-rj',
        universityIds: ['UNIG-ITAP', 'REDENTOR-ITAP'],
        originTerminal: 'Terminal Rodoviário Central',
        destinationCampus: 'Campus Integrado UNIG / UniRedentor',
        stops: ['Praça do Boa Fortuna', 'Av. Presidente Dutra', 'Centro / Nilo Peçanha'],
        timetable: {
          morningDeparture: ['06:40', '07:15'],
          eveningDeparture: ['12:45', '13:15', '18:15', '18:45'],
          nightReturn: ['22:10', '22:40']
        },
        capacitySeatsPerTrip: 18,
        allocatedVehiclesCount: 6,
        ticketPriceBrl: 7.0,
        studentDiscountedPriceBrl: 3.5,
        active: true
      },
      {
        routeId: 'ACAD-ITAP-02',
        routeName: 'Expresso Universitário Intermunicipal: Bom Jesus do Itabapoana — Itaperuna',
        cityId: 'itaperuna-rj',
        universityIds: ['UNIG-ITAP', 'REDENTOR-ITAP'],
        originTerminal: 'Praça Central de Bom Jesus do Itabapoana',
        destinationCampus: 'Campus Redentor / UNIG Itaperuna',
        stops: ['Trevo de Natividade', 'Cehab Itaperuna'],
        timetable: {
          morningDeparture: ['06:15'],
          eveningDeparture: ['17:45'],
          nightReturn: ['22:45']
        },
        capacitySeatsPerTrip: 24,
        allocatedVehiclesCount: 4,
        ticketPriceBrl: 16.0,
        studentDiscountedPriceBrl: 8.0,
        active: true
      }
    ];

    routes.forEach(r => this.routes.set(r.routeId, r));
  }

  public getAcademicRoutes(cityId: string): AcademicRoute[] {
    return Array.from(this.routes.values()).filter(r => r.cityId === cityId && r.active);
  }

  public getRoute(routeId: string): AcademicRoute | undefined {
    return this.routes.get(routeId);
  }
}

export const campusRoutingEngine = new CampusRoutingEngine();
