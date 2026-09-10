/**
 * URBAN METRICS ENGINE
 * 
 * Coleta e consolidação de telemetria urbana:
 * - Densidade veicular e ocupação de malha viária
 * - Velocidade média de tráfego por corredor
 * - Índices de congestionamento e gargalos
 * - Emissões de CO2 e intensidade de ruído estimada
 */

export interface UrbanCorridorMetrics {
  corridorId: string;
  corridorName: string;
  cityId: string;
  averageSpeedKmh: number;
  freeFlowSpeedKmh: number;
  congestionIndexPct: number; // 0% livre a 100% parado
  vehicleDensityPerKm: number;
  activeTransitVehicles: number;
  activePrivateVehicles: number;
  estimatedCo2GramsPerKm: number;
  noiseDecibelsEstimate: number;
  levelOfService: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; // Highway Capacity Manual (HCM)
}

export interface CityUrbanSummary {
  cityId: string;
  cityName: string;
  overallCongestionPct: number;
  averageCitySpeedKmh: number;
  totalTripsActive: number;
  transitRidershipPerHour: number;
  co2SavedBySharedMobilityKg: number;
  highDensityZonesCount: number;
  lastUpdated: number;
}

export class UrbanMetricsEngine {
  private corridorMetrics: Map<string, UrbanCorridorMetrics[]> = new Map();

  constructor() {
    this.seedDefaultCorridors();
  }

  private seedDefaultCorridors(): void {
    const itaperunaCorridors: UrbanCorridorMetrics[] = [
      {
        corridorId: 'CORR-ITAP-01',
        corridorName: 'Av. Cardoso Moreira (Eixo Central Comercial)',
        cityId: 'itaperuna-rj',
        averageSpeedKmh: 24.5,
        freeFlowSpeedKmh: 45.0,
        congestionIndexPct: 45.5,
        vehicleDensityPerKm: 68.0,
        activeTransitVehicles: 14,
        activePrivateVehicles: 85,
        estimatedCo2GramsPerKm: 145.0,
        noiseDecibelsEstimate: 72.0,
        levelOfService: 'C'
      },
      {
        corridorId: 'CORR-ITAP-02',
        corridorName: 'BR-356 (Acesso Distrito Industrial / Raposo)',
        cityId: 'itaperuna-rj',
        averageSpeedKmh: 68.0,
        freeFlowSpeedKmh: 80.0,
        congestionIndexPct: 15.0,
        vehicleDensityPerKm: 22.0,
        activeTransitVehicles: 8,
        activePrivateVehicles: 45,
        estimatedCo2GramsPerKm: 120.0,
        noiseDecibelsEstimate: 65.0,
        levelOfService: 'B'
      },
      {
        corridorId: 'CORR-ITAP-03',
        corridorName: 'Av. Zulamith Bittencourt (Eixo Hospitalar / Cehab)',
        cityId: 'itaperuna-rj',
        averageSpeedKmh: 28.0,
        freeFlowSpeedKmh: 40.0,
        congestionIndexPct: 30.0,
        vehicleDensityPerKm: 42.0,
        activeTransitVehicles: 12,
        activePrivateVehicles: 58,
        estimatedCo2GramsPerKm: 135.0,
        noiseDecibelsEstimate: 68.0,
        levelOfService: 'B'
      }
    ];

    this.corridorMetrics.set('itaperuna-rj', itaperunaCorridors);
  }

  public getCorridorsByCity(cityId: string): UrbanCorridorMetrics[] {
    return this.corridorMetrics.get(cityId) || [];
  }

  public getCitySummary(cityId: string, cityName: string): CityUrbanSummary {
    const corridors = this.getCorridorsByCity(cityId);
    if (corridors.length === 0) {
      return {
        cityId,
        cityName,
        overallCongestionPct: 22.0,
        averageCitySpeedKmh: 35.0,
        totalTripsActive: 340,
        transitRidershipPerHour: 850,
        co2SavedBySharedMobilityKg: 420.0,
        highDensityZonesCount: 2,
        lastUpdated: Date.now()
      };
    }

    const avgCongestion = corridors.reduce((acc, c) => acc + c.congestionIndexPct, 0) / corridors.length;
    const avgSpeed = corridors.reduce((acc, c) => acc + c.averageSpeedKmh, 0) / corridors.length;
    const totalTransit = corridors.reduce((acc, c) => acc + c.activeTransitVehicles, 0);

    return {
      cityId,
      cityName,
      overallCongestionPct: Number(avgCongestion.toFixed(1)),
      averageCitySpeedKmh: Number(avgSpeed.toFixed(1)),
      totalTripsActive: totalTransit * 25,
      transitRidershipPerHour: totalTransit * 60,
      co2SavedBySharedMobilityKg: Number((totalTransit * 18.5).toFixed(1)),
      highDensityZonesCount: corridors.filter(c => c.congestionIndexPct > 40).length,
      lastUpdated: Date.now()
    };
  }
}

export const urbanMetricsEngine = new UrbanMetricsEngine();
