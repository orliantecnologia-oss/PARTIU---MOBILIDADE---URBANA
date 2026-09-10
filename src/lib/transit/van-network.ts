/**
 * VAN NETWORK ENGINE
 * 
 * Gestão da malha urbana de vans cooperadas e linhas alimentadoras:
 * - Controle de frotas de cooperativas municipais
 * - Intervalos de partidas e escalas de motoristas cooperados
 * - Telemetria de assentos disponíveis em tempo real
 */

export interface UrbanVanLine {
  lineId: string;
  lineNumber: string; // Ex: "VAN-01"
  lineName: string;
  cityId: string;
  cooperativeName: string; // Ex: "Cooperativa de Transporte Alternativo de Itaperuna"
  originHub: string;
  destinationHub: string;
  headwayMinutes: number; // Intervalo entre viagens (ex: a cada 10 min)
  operatingHours: { start: string; end: string };
  tariffBrl: number;
  activeVehiclesCount: number;
  totalSeatsCapacity: number;
  currentOccupiedSeats: number;
  status: 'EM_OPERACAO' | 'INTERVALO_REDUZIDO' | 'OPERACAO_ENCERRADA';
}

export class VanNetworkEngine {
  private vanLines: Map<string, UrbanVanLine> = new Map();

  constructor() {
    this.seedDefaultVanLines();
  }

  private seedDefaultVanLines(): void {
    const lines: UrbanVanLine[] = [
      {
        lineId: 'LINE-VAN-01',
        lineNumber: '01',
        lineName: 'Cehab — Centro — Rodoviária',
        cityId: 'itaperuna-rj',
        cooperativeName: 'CoopVans Itaperuna',
        originHub: 'Bairro Cehab (Praça da Paz)',
        destinationHub: 'Terminal Rodoviário Central',
        headwayMinutes: 12,
        operatingHours: { start: '05:30', end: '23:00' },
        tariffBrl: 4.50,
        activeVehiclesCount: 8,
        totalSeatsCapacity: 128,
        currentOccupiedSeats: 94,
        status: 'EM_OPERACAO'
      },
      {
        lineId: 'LINE-VAN-02',
        lineNumber: '04',
        lineName: 'Aeroporto — UNIG — Bairro Lions',
        cityId: 'itaperuna-rj',
        cooperativeName: 'CoopVans Itaperuna',
        originHub: 'Bairro Aeroporto',
        destinationHub: 'Campus UNIG / Bairro Lions',
        headwayMinutes: 15,
        operatingHours: { start: '06:00', end: '22:30' },
        tariffBrl: 4.50,
        activeVehiclesCount: 6,
        totalSeatsCapacity: 96,
        currentOccupiedSeats: 72,
        status: 'EM_OPERACAO'
      }
    ];

    lines.forEach(l => this.vanLines.set(l.lineId, l));
  }

  public getVanLinesByCity(cityId: string): UrbanVanLine[] {
    return Array.from(this.vanLines.values()).filter(l => l.cityId === cityId);
  }

  public getLine(lineId: string): UrbanVanLine | undefined {
    return this.vanLines.get(lineId);
  }
}

export const vanNetworkEngine = new VanNetworkEngine();
