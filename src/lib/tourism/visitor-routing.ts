/**
 * VISITOR ROUTING & TOURIST SHUTTLE CIRCUITS
 * 
 * Roteamento turístico com pontos de interesse (POIs):
 * - Circuito das Estâncias Hidrominerais
 * - Rota Histórica e Cultural
 * - Vans e jardineiras turísticas compartilhadas
 */

export interface TouristPOI {
  poiId: string;
  name: string;
  category: 'MONUMENTO_HISTORICO' | 'ESTANCIA_HIDROMINERAL' | 'CIRCUITO_GASTRONOMICO' | 'MIRANTE_NATUREZA';
  latitude: number;
  longitude: number;
  address: string;
  recommendedVisitMinutes: number;
  entryFeeBrl: number;
}

export interface TouristCircuit {
  circuitId: string;
  circuitName: string;
  cityId: string;
  pois: TouristPOI[];
  totalDistanceKm: number;
  estimatedTourDurationHours: number;
  farePriceBrl: number;
}

export class VisitorRoutingEngine {
  private circuits: Map<string, TouristCircuit> = new Map();

  constructor() {
    this.seedDefaultCircuits();
  }

  private seedDefaultCircuits(): void {
    const itaperunaCircuit: TouristCircuit = {
      circuitId: 'CIRC-ITAP-01',
      circuitName: 'Circuito das Águas & História Noroeste Fluminense',
      cityId: 'itaperuna-rj',
      totalDistanceKm: 36.5,
      estimatedTourDurationHours: 4.5,
      farePriceBrl: 45.0,
      pois: [
        {
          poiId: 'POI-01',
          name: 'Igreja Matriz São José do Avaí & Centro Histórico',
          category: 'MONUMENTO_HISTORICO',
          latitude: -21.2056,
          longitude: -41.8874,
          address: 'Praça Nilo Peçanha, Centro',
          recommendedVisitMinutes: 45,
          entryFeeBrl: 0
        },
        {
          poiId: 'POI-02',
          name: 'Estátua do Cristo Redentor de Itaperuna',
          category: 'MIRANTE_NATUREZA',
          latitude: -21.2180,
          longitude: -41.8750,
          address: 'Morro do Castelo',
          recommendedVisitMinutes: 40,
          entryFeeBrl: 0
        },
        {
          poiId: 'POI-03',
          name: 'Parque Hidromineral de Raposo',
          category: 'ESTANCIA_HIDROMINERAL',
          latitude: -21.1250,
          longitude: -42.0820,
          address: 'Distrito de Raposo',
          recommendedVisitMinutes: 120,
          entryFeeBrl: 15.0
        }
      ]
    };

    this.circuits.set(itaperunaCircuit.circuitId, itaperunaCircuit);
  }

  public getCircuitsByCity(cityId: string): TouristCircuit[] {
    return Array.from(this.circuits.values()).filter(c => c.cityId === cityId);
  }
}

export const visitorRoutingEngine = new VisitorRoutingEngine();
