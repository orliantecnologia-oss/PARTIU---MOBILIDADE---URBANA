/**
 * CIVIC TRANSPORT ENGINE
 * 
 * Operação e despacho de viagens cívicas, linhas subsidiadas pelo município
 * e rotas de interesse público (saúde, escolas, eventos e assistência social).
 */

import { CivicContractType } from './civic-contracts';

export interface CivicRoute {
  routeId: string;
  routeName: string;
  cityId: string;
  category: CivicContractType;
  originHub: string;
  destinationHub: string;
  waypoints: string[];
  departureSchedule: string[]; // ["06:30", "07:15", "12:00", "17:30"]
  farePriceBrl: number;
  subsidizedFarePriceBrl: number; // Ex: 0.00 para passe livre
  operatingDays: ('SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM')[];
  assignedVehicleTypes: ('VAN' | 'MICRO_ONIBUS' | 'CARRO_ACESSIVEL')[];
  active: boolean;
}

export interface CivicRideManifest {
  rideId: string;
  contractId: string;
  routeId?: string;
  citizenId: string;
  category: CivicContractType;
  voucherCode?: string;
  driverId: string;
  vehiclePlate: string;
  origin: string;
  destination: string;
  status: 'AGENDADA' | 'EM_ROTA' | 'CONCLUIDA' | 'CANCELADA';
  departureTime: string;
  fareTotalBrl: number;
  subsidizedBrl: number;
  citizenCopayBrl: number;
  specialNeeds?: {
    wheelchairRequired: boolean;
    companionAllowed: boolean;
    oxygenSupport: boolean;
  };
}

export class CivicTransportEngine {
  private routes: Map<string, CivicRoute> = new Map();
  private rides: Map<string, CivicRideManifest> = new Map();

  constructor() {
    this.seedDefaultRoutes();
  }

  private seedDefaultRoutes(): void {
    const routes: CivicRoute[] = [
      {
        routeId: 'CIV-RT-01',
        routeName: 'Linha Social Saúde: Centro — Hospital São José do Avaí / UPA',
        cityId: 'itaperuna-rj',
        category: 'TRANSPORTE_SAUDE_PACIENTES',
        originHub: 'Rodoviária Municipal de Itaperuna',
        destinationHub: 'Hospital São José do Avaí / Centro Oncológico',
        waypoints: ['Posto de Saúde Aeroporto', 'Clínica da Família Cehab', 'UPA 24h'],
        departureSchedule: ['06:00', '08:00', '10:30', '13:00', '15:30', '17:45'],
        farePriceBrl: 12.0,
        subsidizedFarePriceBrl: 0.0,
        operatingDays: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
        assignedVehicleTypes: ['VAN', 'CARRO_ACESSIVEL'],
        active: true,
      },
      {
        routeId: 'CIV-RT-02',
        routeName: 'Expresso Universitário Noturno: Terminais — UNIG / Redentor',
        cityId: 'itaperuna-rj',
        category: 'TRANSPORTE_UNIVERSITARIO',
        originHub: 'Terminal Rodoviário Central',
        destinationHub: 'Campus Universitário Redentor / UNIG',
        waypoints: ['Praça Nilo Peçanha', 'Bairro Cidade Nova'],
        departureSchedule: ['18:15', '18:45', '22:15', '22:45'],
        farePriceBrl: 8.0,
        subsidizedFarePriceBrl: 2.5,
        operatingDays: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
        assignedVehicleTypes: ['VAN', 'MICRO_ONIBUS'],
        active: true,
      },
      {
        routeId: 'CIV-RT-03',
        routeName: 'Linha Rural Cívica: Raposo — Centro Itaperuna',
        cityId: 'itaperuna-rj',
        category: 'TRANSPORTE_SUBSIDIADO_GERAL',
        originHub: 'Distrito de Raposo',
        destinationHub: 'Mercado do Produtor / Centro',
        waypoints: ['Comunidade Córrego Seco', 'Retiro do Muriaé'],
        departureSchedule: ['06:30', '11:30', '16:30'],
        farePriceBrl: 18.0,
        subsidizedFarePriceBrl: 5.0,
        operatingDays: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
        assignedVehicleTypes: ['VAN', 'MICRO_ONIBUS'],
        active: true,
      }
    ];

    routes.forEach(r => this.routes.set(r.routeId, r));
  }

  public getRoutesByCity(cityId: string): CivicRoute[] {
    return Array.from(this.routes.values()).filter(r => r.cityId === cityId && r.active);
  }

  public registerCivicRide(manifest: CivicRideManifest): void {
    this.rides.set(manifest.rideId, manifest);
  }

  public getRide(rideId: string): CivicRideManifest | undefined {
    return this.rides.get(rideId);
  }

  public getRidesByCitizen(citizenId: string): CivicRideManifest[] {
    return Array.from(this.rides.values()).filter(r => r.citizenId === citizenId);
  }

  public updateRideStatus(rideId: string, status: CivicRideManifest['status']): boolean {
    const ride = this.rides.get(rideId);
    if (!ride) return false;
    ride.status = status;
    return true;
  }
}

export const civicTransportEngine = new CivicTransportEngine();
