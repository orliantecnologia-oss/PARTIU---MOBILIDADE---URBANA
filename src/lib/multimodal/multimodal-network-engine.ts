/**
 * PARTIU MULTIMODAL NETWORK ENGINE
 * 
 * Motor Central de Gestão e Orquestração da Rede Multimodal.
 * Opera:
 * - Carros
 * - Moto Táxi
 * - Vans
 * - Micro-ônibus
 * - Ônibus Executivos
 * - Transporte Corporativo
 * - Transporte Universitário
 * - Transporte Intermunicipal
 * 
 * Responsável por: veículos, linhas, hubs, terminais, estações, rotas,
 * cálculo de capacidade disponível, ocupação, demanda e throughput.
 */

export type MultimodalType =
  | 'CARRO'
  | 'MOTO_TAXI'
  | 'VAN'
  | 'MICRO_ONIBUS'
  | 'ONIBUS_EXECUTIVO'
  | 'TRANSPORTE_CORPORATIVO'
  | 'TRANSPORTE_UNIVERSITARIO'
  | 'TRANSPORTE_INTERMUNICIPAL';

export interface StationCoordinate {
  latitude: number;
  longitude: number;
}

export interface TransitStation {
  stationId: string;
  name: string;
  cityId: string;
  cityName: string;
  stationType: 'TERMINAL_RODOVIARIO' | 'ESTACAO_CONEXAO' | 'HUB_LOGISTICO' | 'PONTO_EMBARQUE_VIRTUAL';
  coordinates: StationCoordinate;
  modalitiesSupported: MultimodalType[];
  platformsCount: number;
  dailyCapacityPassageiros: number;
  dailyCapacityCargaKg: number;
  isActive: boolean;
}

export interface MultimodalVehicle {
  vehicleId: string;
  plate: string;
  operatorId: string;
  operatorName: string;
  modalType: MultimodalType;
  totalSeats: number;
  occupiedSeats: number;
  cargoCapacityKg: number;
  occupiedCargoKg: number;
  cargoVolumeLiters: number;
  occupiedCargoVolumeLiters: number;
  status: 'DISPONIVEL' | 'EM_VIAGEM' | 'EM_TRANSBORDO' | 'MANUTENCAO';
  currentStationId?: string | undefined;
  currentLineId?: string | undefined;
  lastUpdated: number;
}

export interface TransitLine {
  lineId: string;
  lineCode: string;
  lineName: string;
  modalType: MultimodalType;
  originStationId: string;
  destinationStationId: string;
  intermediateStations: string[];
  distanceKm: number;
  estimatedDurationMin: number;
  operatingHours: { start: string; end: string };
  frequencyMinutes: number;
  baseFareBrl: number;
  assignedVehicles: string[];
  isActive: boolean;
}

export interface LineCapacityReport {
  lineId: string;
  lineCode: string;
  modalType: MultimodalType;
  totalVehiclesAssigned: number;
  activeVehicles: number;
  totalPassengerCapacity: number;
  availableSeats: number;
  passengerOccupancyRatePct: number;
  totalCargoCapacityKg: number;
  availableCargoKg: number;
  cargoOccupancyRatePct: number;
  availableVolumeLiters: number;
  status: 'SUBUTILIZADA' | 'EQUILIBRADA' | 'SATURADA' | 'CRITICA';
}

export interface NetworkThroughputReport {
  timestamp: number;
  totalActiveLines: number;
  totalStations: number;
  totalFleetCount: number;
  activeFleetCount: number;
  totalPassageirosEmTransito: number;
  totalCargaEmTransitoKg: number;
  redeTaxaOcupacaoMediaPct: number;
  redeCapacidadeOciosaPct: number;
  throughputPassageirosPorHora: number;
  throughputCargaKgPorHora: number;
  modalBreakdown: Record<MultimodalType, {
    veiculosAtivos: number;
    passageirosTransportados: number;
    ocupacaoMediaPct: number;
  }>;
}

export class MultimodalNetworkEngine {
  private stations: Map<string, TransitStation> = new Map();
  private lines: Map<string, TransitLine> = new Map();
  private vehicles: Map<string, MultimodalVehicle> = new Map();

  constructor() {
    this.initializeDefaultNetworkTopology();
  }

  /**
   * Inicializa topologia padrão com terminais e linhas regionais de alta relevância
   */
  private initializeDefaultNetworkTopology(): void {
    // Terminais e Hubs Centrais
    const defaultStations: TransitStation[] = [
      {
        stationId: 'TERM-ITA-01',
        name: 'Terminal Rodoviário Central de Itaperuna',
        cityId: 'itaperuna-rj',
        cityName: 'Itaperuna',
        stationType: 'TERMINAL_RODOVIARIO',
        coordinates: { latitude: -21.198, longitude: -41.875 },
        modalitiesSupported: ['VAN', 'MICRO_ONIBUS', 'ONIBUS_EXECUTIVO', 'TRANSPORTE_INTERMUNICIPAL', 'TRANSPORTE_UNIVERSITARIO'],
        platformsCount: 12,
        dailyCapacityPassageiros: 8500,
        dailyCapacityCargaKg: 25000,
        isActive: true
      },
      {
        stationId: 'TERM-CMP-01',
        name: 'Shopping Estrada / Terminal Integrado Campos',
        cityId: 'campos-rj',
        cityName: 'Campos dos Goytacazes',
        stationType: 'TERMINAL_RODOVIARIO',
        coordinates: { latitude: -21.761, longitude: -41.332 },
        modalitiesSupported: ['CARRO', 'VAN', 'MICRO_ONIBUS', 'ONIBUS_EXECUTIVO', 'TRANSPORTE_INTERMUNICIPAL'],
        platformsCount: 24,
        dailyCapacityPassageiros: 22000,
        dailyCapacityCargaKg: 80000,
        isActive: true
      },
      {
        stationId: 'HUB-MAC-01',
        name: 'Hub de Conexão e Cargas Macaé Imboassica',
        cityId: 'macae-rj',
        cityName: 'Macaé',
        stationType: 'HUB_LOGISTICO',
        coordinates: { latitude: -22.376, longitude: -41.784 },
        modalitiesSupported: ['CARRO', 'VAN', 'TRANSPORTE_CORPORATIVO', 'TRANSPORTE_INTERMUNICIPAL'],
        platformsCount: 16,
        dailyCapacityPassageiros: 14000,
        dailyCapacityCargaKg: 120000,
        isActive: true
      },
      {
        stationId: 'TERM-MUR-01',
        name: 'Terminal Rodoviário Tancredo Neves Muriaé',
        cityId: 'muriae-mg',
        cityName: 'Muriaé',
        stationType: 'TERMINAL_RODOVIARIO',
        coordinates: { latitude: -21.134, longitude: -42.368 },
        modalitiesSupported: ['VAN', 'MICRO_ONIBUS', 'TRANSPORTE_INTERMUNICIPAL'],
        platformsCount: 10,
        dailyCapacityPassageiros: 6500,
        dailyCapacityCargaKg: 30000,
        isActive: true
      }
    ];

    defaultStations.forEach(s => this.registerStation(s));

    // Linhas Regionais Iniciais
    const defaultLines: TransitLine[] = [
      {
        lineId: 'LINE-ITA-CMP-01',
        lineCode: 'CORR-01',
        lineName: 'Expresso Itaperuna ↔ Campos dos Goytacazes',
        modalType: 'VAN',
        originStationId: 'TERM-ITA-01',
        destinationStationId: 'TERM-CMP-01',
        intermediateStations: ['Italva', 'Cardoso Moreira'],
        distanceKm: 110.5,
        estimatedDurationMin: 95,
        operatingHours: { start: '05:00', end: '22:30' },
        frequencyMinutes: 30,
        baseFareBrl: 36.50,
        assignedVehicles: ['V-VAN-001', 'V-VAN-002', 'V-VAN-003', 'V-VAN-004'],
        isActive: true
      },
      {
        lineId: 'LINE-ITA-MAC-01',
        lineCode: 'CORR-02',
        lineName: 'Corredor Corporativo Itaperuna ↔ Macaé Petróleo',
        modalType: 'TRANSPORTE_CORPORATIVO',
        originStationId: 'TERM-ITA-01',
        destinationStationId: 'HUB-MAC-01',
        intermediateStations: ['Bom Jesus', 'Campos Sul'],
        distanceKm: 185.0,
        estimatedDurationMin: 160,
        operatingHours: { start: '05:30', end: '21:00' },
        frequencyMinutes: 60,
        baseFareBrl: 58.00,
        assignedVehicles: ['V-BUS-101', 'V-BUS-102'],
        isActive: true
      }
    ];

    defaultLines.forEach(l => this.registerLine(l));

    // Veículos Iniciais
    const defaultVehicles: MultimodalVehicle[] = [
      {
        vehicleId: 'V-VAN-001',
        plate: 'RJP1A23',
        operatorId: 'COOP-NOROESTE',
        operatorName: 'Cooperativa VanExpress Noroeste',
        modalType: 'VAN',
        totalSeats: 16,
        occupiedSeats: 12,
        cargoCapacityKg: 450,
        occupiedCargoKg: 180,
        cargoVolumeLiters: 1200,
        occupiedCargoVolumeLiters: 480,
        status: 'EM_VIAGEM',
        currentLineId: 'LINE-ITA-CMP-01',
        lastUpdated: Date.now()
      },
      {
        vehicleId: 'V-VAN-002',
        plate: 'RJP1A24',
        operatorId: 'COOP-NOROESTE',
        operatorName: 'Cooperativa VanExpress Noroeste',
        modalType: 'VAN',
        totalSeats: 16,
        occupiedSeats: 14,
        cargoCapacityKg: 450,
        occupiedCargoKg: 220,
        cargoVolumeLiters: 1200,
        occupiedCargoVolumeLiters: 650,
        status: 'EM_VIAGEM',
        currentLineId: 'LINE-ITA-CMP-01',
        lastUpdated: Date.now()
      },
      {
        vehicleId: 'V-BUS-101',
        plate: 'RJA9B88',
        operatorId: 'TRANS-PETRO',
        operatorName: 'Transporte Executivo Macaense',
        modalType: 'TRANSPORTE_CORPORATIVO',
        totalSeats: 44,
        occupiedSeats: 38,
        cargoCapacityKg: 2500,
        occupiedCargoKg: 950,
        cargoVolumeLiters: 8500,
        occupiedCargoVolumeLiters: 3200,
        status: 'EM_VIAGEM',
        currentLineId: 'LINE-ITA-MAC-01',
        lastUpdated: Date.now()
      }
    ];

    defaultVehicles.forEach(v => this.registerVehicle(v));
  }

  public registerStation(station: TransitStation): void {
    this.stations.set(station.stationId, station);
  }

  public getStation(stationId: string): TransitStation | undefined {
    return this.stations.get(stationId);
  }

  public getAllStations(): TransitStation[] {
    return Array.from(this.stations.values());
  }

  public registerLine(line: TransitLine): void {
    this.lines.set(line.lineId, line);
  }

  public getLine(lineId: string): TransitLine | undefined {
    return this.lines.get(lineId);
  }

  public getAllLines(): TransitLine[] {
    return Array.from(this.lines.values());
  }

  public registerVehicle(vehicle: MultimodalVehicle): void {
    this.vehicles.set(vehicle.vehicleId, vehicle);
  }

  public getVehicle(vehicleId: string): MultimodalVehicle | undefined {
    return this.vehicles.get(vehicleId);
  }

  public getAllVehicles(): MultimodalVehicle[] {
    return Array.from(this.vehicles.values());
  }

  /**
   * Calcula capacidade disponível e ocupação para uma linha específica
   */
  public calculateAvailableCapacity(lineId: string): LineCapacityReport {
    const line = this.lines.get(lineId);
    if (!line) {
      throw new Error(`Linha multimodal '${lineId}' não encontrada no registro.`);
    }

    const assignedVehicles = Array.from(this.vehicles.values()).filter(
      v => v.currentLineId === lineId || line.assignedVehicles.includes(v.vehicleId)
    );

    let totalSeats = 0;
    let occupiedSeats = 0;
    let totalCargoKg = 0;
    let occupiedCargoKg = 0;
    let totalVolumeLiters = 0;
    let occupiedVolumeLiters = 0;
    let activeVehicles = 0;

    assignedVehicles.forEach(v => {
      totalSeats += v.totalSeats;
      occupiedSeats += v.occupiedSeats;
      totalCargoKg += v.cargoCapacityKg;
      occupiedCargoKg += v.occupiedCargoKg;
      totalVolumeLiters += v.cargoVolumeLiters;
      occupiedVolumeLiters += v.occupiedCargoVolumeLiters;
      if (v.status === 'EM_VIAGEM' || v.status === 'DISPONIVEL') {
        activeVehicles++;
      }
    });

    const availableSeats = Math.max(0, totalSeats - occupiedSeats);
    const availableCargoKg = Math.max(0, totalCargoKg - occupiedCargoKg);
    const availableVolumeLiters = Math.max(0, totalVolumeLiters - occupiedVolumeLiters);

    const passengerOccupancy = totalSeats > 0 ? Number(((occupiedSeats / totalSeats) * 100).toFixed(1)) : 0;
    const cargoOccupancy = totalCargoKg > 0 ? Number(((occupiedCargoKg / totalCargoKg) * 100).toFixed(1)) : 0;

    let status: LineCapacityReport['status'] = 'EQUILIBRADA';
    if (passengerOccupancy >= 95) status = 'CRITICA';
    else if (passengerOccupancy >= 85) status = 'SATURADA';
    else if (passengerOccupancy < 40) status = 'SUBUTILIZADA';

    return {
      lineId: line.lineId,
      lineCode: line.lineCode,
      modalType: line.modalType,
      totalVehiclesAssigned: assignedVehicles.length,
      activeVehicles,
      totalPassengerCapacity: totalSeats,
      availableSeats,
      passengerOccupancyRatePct: passengerOccupancy,
      totalCargoCapacityKg: totalCargoKg,
      availableCargoKg,
      cargoOccupancyRatePct: cargoOccupancy,
      availableVolumeLiters,
      status
    };
  }

  /**
   * Previsão de demanda para uma modalidade ou linha em determinado horizonte
   */
  public forecastModalDemand(lineId: string, horizonHours: number = 24): {
    lineId: string;
    horizonHours: number;
    projectedPassengers: number;
    projectedCargoKg: number;
    requiredVehicles: number;
    peakHour: number;
  } {
    const line = this.lines.get(lineId);
    if (!line) {
      throw new Error(`Linha multimodal '${lineId}' não encontrada.`);
    }

    const basePassageirosPorHora = line.modalType === 'ONIBUS_EXECUTIVO' ? 65 : 32;
    const baseCargaKgPorHora = line.modalType === 'ONIBUS_EXECUTIVO' ? 180 : 85;

    // Fator sazonal horário
    const projectedPassengers = Math.round(basePassageirosPorHora * horizonHours * 0.85);
    const projectedCargoKg = Math.round(baseCargaKgPorHora * horizonHours * 0.90);
    const vehicleCapacity = line.modalType === 'ONIBUS_EXECUTIVO' ? 44 : 16;
    const requiredVehicles = Math.max(2, Math.ceil((projectedPassengers / (horizonHours * 0.7)) / vehicleCapacity));

    return {
      lineId,
      horizonHours,
      projectedPassengers,
      projectedCargoKg,
      requiredVehicles,
      peakHour: 17
    };
  }

  /**
   * Calcula o throughput global e detalhado de toda a malha multimodal
   */
  public calculateNetworkThroughput(): NetworkThroughputReport {
    const allVehicles = Array.from(this.vehicles.values());
    const activeVehiclesList = allVehicles.filter(v => v.status === 'EM_VIAGEM' || v.status === 'DISPONIVEL');

    let totalPassengersInTransit = 0;
    let totalCargoInTransitKg = 0;
    let totalSeats = 0;
    let totalOccupiedSeats = 0;

    const modalMap: Record<MultimodalType, { veiculosAtivos: number; passageirosTransportados: number; totalAssentos: number; assentosOcupados: number }> = {
      CARRO: { veiculosAtivos: 0, passageirosTransportados: 0, totalAssentos: 0, assentosOcupados: 0 },
      MOTO_TAXI: { veiculosAtivos: 0, passageirosTransportados: 0, totalAssentos: 0, assentosOcupados: 0 },
      VAN: { veiculosAtivos: 0, passageirosTransportados: 0, totalAssentos: 0, assentosOcupados: 0 },
      MICRO_ONIBUS: { veiculosAtivos: 0, passageirosTransportados: 0, totalAssentos: 0, assentosOcupados: 0 },
      ONIBUS_EXECUTIVO: { veiculosAtivos: 0, passageirosTransportados: 0, totalAssentos: 0, assentosOcupados: 0 },
      TRANSPORTE_CORPORATIVO: { veiculosAtivos: 0, passageirosTransportados: 0, totalAssentos: 0, assentosOcupados: 0 },
      TRANSPORTE_UNIVERSITARIO: { veiculosAtivos: 0, passageirosTransportados: 0, totalAssentos: 0, assentosOcupados: 0 },
      TRANSPORTE_INTERMUNICIPAL: { veiculosAtivos: 0, passageirosTransportados: 0, totalAssentos: 0, assentosOcupados: 0 }
    };

    allVehicles.forEach(v => {
      totalSeats += v.totalSeats;
      totalOccupiedSeats += v.occupiedSeats;
      totalPassengersInTransit += v.occupiedSeats;
      totalCargoInTransitKg += v.occupiedCargoKg;

      const m = modalMap[v.modalType];
      if (m) {
        if (v.status === 'EM_VIAGEM' || v.status === 'DISPONIVEL') {
          m.veiculosAtivos++;
        }
        m.passageirosTransportados += v.occupiedSeats;
        m.totalAssentos += v.totalSeats;
        m.assentosOcupados += v.occupiedSeats;
      }
    });

    const redeTaxaOcupacaoMediaPct = totalSeats > 0 ? Number(((totalOccupiedSeats / totalSeats) * 100).toFixed(1)) : 0;
    const redeCapacidadeOciosaPct = Number((100 - redeTaxaOcupacaoMediaPct).toFixed(1));

    const modalBreakdown: NetworkThroughputReport['modalBreakdown'] = {} as any;
    (Object.keys(modalMap) as MultimodalType[]).forEach(k => {
      const entry = modalMap[k];
      modalBreakdown[k] = {
        veiculosAtivos: entry.veiculosAtivos,
        passageirosTransportados: entry.passageirosTransportados,
        ocupacaoMediaPct: entry.totalAssentos > 0 ? Number(((entry.assentosOcupados / entry.totalAssentos) * 100).toFixed(1)) : 0
      };
    });

    return {
      timestamp: Date.now(),
      totalActiveLines: Array.from(this.lines.values()).filter(l => l.isActive).length,
      totalStations: Array.from(this.stations.values()).filter(s => s.isActive).length,
      totalFleetCount: allVehicles.length,
      activeFleetCount: activeVehiclesList.length,
      totalPassageirosEmTransito: totalPassengersInTransit,
      totalCargaEmTransitoKg: totalCargoInTransitKg,
      redeTaxaOcupacaoMediaPct,
      redeCapacidadeOciosaPct,
      throughputPassageirosPorHora: Math.round(totalPassengersInTransit * 1.35),
      throughputCargaKgPorHora: Math.round(totalCargoInTransitKg * 1.20),
      modalBreakdown
    };
  }
}

export const multimodalNetworkEngine = new MultimodalNetworkEngine();
