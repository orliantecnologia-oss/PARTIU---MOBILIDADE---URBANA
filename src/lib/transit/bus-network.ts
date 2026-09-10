/**
 * BUS NETWORK & MUNICIPAL CONCESSION ENGINE
 * 
 * Integração com transporte coletivo municipal por ônibus:
 * - Linhas troncais regulares
 * - Horários tabelados e rastreamento GPS
 * - Bilhetagem eletrônica integrada
 */

export interface UrbanBusLine {
  busLineId: string;
  code: string; // Ex: "101"
  name: string;
  concessionaireName: string;
  cityId: string;
  originTerminal: string;
  destinationTerminal: string;
  stopsCount: number;
  tariffBrl: number;
  operatingFrequencyMinutes: number;
  operatingHours: { start: string; end: string };
  fleetCount: number;
  active: boolean;
}

export class BusNetworkEngine {
  private busLines: Map<string, UrbanBusLine> = new Map();

  constructor() {
    this.seedDefaultBusLines();
  }

  private seedDefaultBusLines(): void {
    const lines: UrbanBusLine[] = [
      {
        busLineId: 'BUS-ITAP-01',
        code: '101',
        name: 'Circular Troncal: Rodoviária — Hospital São José — Frigorífico',
        concessionaireName: 'Viação Santa Lúcia Ltda',
        cityId: 'itaperuna-rj',
        originTerminal: 'Terminal Rodoviário Central',
        destinationTerminal: 'Distrito Industrial Frigorífico',
        stopsCount: 28,
        tariffBrl: 4.80,
        operatingFrequencyMinutes: 20,
        operatingHours: { start: '05:00', end: '23:30' },
        fleetCount: 10,
        active: true
      },
      {
        busLineId: 'BUS-ITAP-02',
        code: '202',
        name: 'Distrital: Raposo — Retiro do Muriaé — Centro',
        concessionaireName: 'Viação Brasil',
        cityId: 'itaperuna-rj',
        originTerminal: 'Distrito de Raposo',
        destinationTerminal: 'Terminal Central',
        stopsCount: 34,
        tariffBrl: 7.50,
        operatingFrequencyMinutes: 60,
        operatingHours: { start: '06:00', end: '21:00' },
        fleetCount: 4,
        active: true
      }
    ];

    lines.forEach(b => this.busLines.set(b.busLineId, b));
  }

  public getBusLinesByCity(cityId: string): UrbanBusLine[] {
    return Array.from(this.busLines.values()).filter(b => b.cityId === cityId && b.active);
  }

  public getBusLine(lineId: string): UrbanBusLine | undefined {
    return this.busLines.get(lineId);
  }
}

export const busNetworkEngine = new BusNetworkEngine();
