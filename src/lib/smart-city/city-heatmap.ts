/**
 * CITY HEATMAP ENGINE
 * 
 * Mapeamento espacial de calor urbano (H3 Hexagonal e Zonas Geográficas):
 * - Concentração de demanda de passageiros
 * - Densidade de oferta ociosa (motoristas e vans disponíveis)
 * - Zonas de gargalo viário
 * - Índice de segurança operacional por microrregião
 */

export interface CityHeatmapPoint {
  h3Index: string;
  latitude: number;
  longitude: number;
  districtName: string;
  demandIntensity: number; // 0.0 a 1.0
  supplyIntensity: number; // 0.0 a 1.0
  congestionIntensity: number; // 0.0 a 1.0
  safetyRating: number; // 0 a 100
  recommendedSurgeFactor: number;
  criticalityLevel: 'NORMAL' | 'ATENCAO' | 'ALERTA' | 'SATURADO';
}

export interface CityHeatmapSnapshot {
  cityId: string;
  timestamp: number;
  totalHexagons: number;
  averageDemand: number;
  averageSupply: number;
  bottleneckZones: string[];
  points: CityHeatmapPoint[];
}

export class CityHeatmapEngine {
  private heatmaps: Map<string, CityHeatmapSnapshot> = new Map();

  constructor() {
    this.seedDefaultHeatmap();
  }

  private seedDefaultHeatmap(): void {
    const itaperunaPoints: CityHeatmapPoint[] = [
      {
        h3Index: '887a0480a1fffff',
        latitude: -21.2056,
        longitude: -41.8874,
        districtName: 'Centro Comercial / Rodoviária',
        demandIntensity: 0.88,
        supplyIntensity: 0.65,
        congestionIntensity: 0.55,
        safetyRating: 92.0,
        recommendedSurgeFactor: 1.25,
        criticalityLevel: 'ATENCAO'
      },
      {
        h3Index: '887a0480a3fffff',
        latitude: -21.1980,
        longitude: -41.8790,
        districtName: 'Polo Universitário Redentor / UNIG',
        demandIntensity: 0.92,
        supplyIntensity: 0.70,
        congestionIntensity: 0.40,
        safetyRating: 95.0,
        recommendedSurgeFactor: 1.30,
        criticalityLevel: 'ATENCAO'
      },
      {
        h3Index: '887a0480a5fffff',
        latitude: -21.2120,
        longitude: -41.8950,
        districtName: 'Bairro Aeroporto / Polo Médico',
        demandIntensity: 0.62,
        supplyIntensity: 0.58,
        congestionIntensity: 0.25,
        safetyRating: 94.0,
        recommendedSurgeFactor: 1.0,
        criticalityLevel: 'NORMAL'
      },
      {
        h3Index: '887a0480a7fffff',
        latitude: -21.1890,
        longitude: -41.9050,
        districtName: 'Distrito Industrial / Cehab',
        demandIntensity: 0.45,
        supplyIntensity: 0.40,
        congestionIntensity: 0.20,
        safetyRating: 88.0,
        recommendedSurgeFactor: 1.0,
        criticalityLevel: 'NORMAL'
      }
    ];

    this.heatmaps.set('itaperuna-rj', {
      cityId: 'itaperuna-rj',
      timestamp: Date.now(),
      totalHexagons: itaperunaPoints.length,
      averageDemand: 0.72,
      averageSupply: 0.58,
      bottleneckZones: ['Centro Comercial / Rodoviária', 'Polo Universitário Redentor / UNIG'],
      points: itaperunaPoints
    });
  }

  public getCityHeatmap(cityId: string): CityHeatmapSnapshot {
    const snap = this.heatmaps.get(cityId);
    if (snap) return snap;

    return {
      cityId,
      timestamp: Date.now(),
      totalHexagons: 1,
      averageDemand: 0.5,
      averageSupply: 0.5,
      bottleneckZones: [],
      points: [
        {
          h3Index: '887a000000fffff',
          latitude: -21.2,
          longitude: -41.9,
          districtName: 'Região Central',
          demandIntensity: 0.5,
          supplyIntensity: 0.5,
          congestionIntensity: 0.2,
          safetyRating: 90.0,
          recommendedSurgeFactor: 1.0,
          criticalityLevel: 'NORMAL'
        }
      ]
    };
  }
}

export const cityHeatmapEngine = new CityHeatmapEngine();
