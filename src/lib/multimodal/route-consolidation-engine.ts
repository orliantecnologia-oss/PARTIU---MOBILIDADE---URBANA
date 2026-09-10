/**
 * PARTIU ROUTE CONSOLIDATION ENGINE
 * 
 * Motor de Consolidação de Rotas e Eliminação de Quilometragem Vazia (Deadhead).
 * Responsável por:
 * - Agrupamento espaço-temporal de passageiros em viagens com trajetórias comuns
 * - Agrupamento de pequenas remessas e pacotes fracionados no mesmo trajeto
 * - Emparelhamento de retorno remunerado (Backhaul Pairing) para evitar retorno vazio
 * - Redução de custo operacional e emissões de carbono
 */

export interface SpatialTemporalWaypoint {
  cityId: string;
  cityName: string;
  orderIndex: number;
  expectedArrivalTime: number;
}

export interface RouteTripLeg {
  legId: string;
  vehicleId: string;
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  scheduledDepartureTime: number;
  passengerCount: number;
  cargoPackagesCount: number;
  isBackhaulLeg: boolean;
  status: 'PLANEJADA' | 'EM_ROTA' | 'CONCLUIDA';
}

export interface ConsolidatedRoutePlan {
  planId: string;
  corridorName: string;
  vehicleId: string;
  legs: RouteTripLeg[];
  totalDistanceKm: number;
  totalPassengersMoved: number;
  totalCargoPackagesMoved: number;
  
  // Métricas Antes vs Depois da Consolidação
  ocupacaoPreConsolidacaoPct: number;
  ocupacaoPosConsolidacaoPct: number;
  ganhoOcupacaoPct: number;
  
  // Eficiência Operacional
  kmVazioEvitadoKm: number;
  reducaoCustoOperacionalBrl: number;
  reducaoEmissoesCo2Kg: number;
  lucratividadeAdicionalBrl: number;
  
  generatedTimestamp: number;
}

export class RouteConsolidationEngine {
  private consolidatedPlans: Map<string, ConsolidatedRoutePlan> = new Map();

  /**
   * Consolida viagens de ida e volta e agrupa passageiros e pacotes esparsos
   */
  public generateConsolidatedPlan(
    corridorName: string,
    vehicleId: string,
    originCity: string,
    destinationCity: string,
    distanceKm: number,
    idaPassengers: number,
    idaCargoPackages: number,
    voltaPassengersCandidate: number,
    voltaCargoCandidate: number,
    maxVehicleCapacitySeats: number = 16
  ): ConsolidatedRoutePlan {
    const planId = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Sem consolidação (cenário base): o veículo levaria apenas ida e voltaria vazio (deadhead de 100%)
    const ocupacaoPreConsolidacaoPct = Number(((idaPassengers / maxVehicleCapacitySeats) * 50).toFixed(1)); // 50% max porque volta é vazia

    // Com consolidação: emparelhamento de passageiros e encomendas na volta
    const voltaPassengers = Math.min(maxVehicleCapacitySeats, voltaPassengersCandidate);
    const totalPassengers = idaPassengers + voltaPassengers;
    const totalCargo = idaCargoPackages + voltaCargoCandidate;

    const ocupacaoPosConsolidacaoPct = Number((((idaPassengers + voltaPassengers) / (maxVehicleCapacitySeats * 2)) * 100).toFixed(1));
    const ganhoOcupacaoPct = Number((ocupacaoPosConsolidacaoPct - ocupacaoPreConsolidacaoPct).toFixed(1));

    // Métricas de Impacto
    const kmVazioEvitadoKm = distanceKm; // Evitou rodar a volta vazia
    const reducaoCustoOperacionalBrl = Number((kmVazioEvitadoKm * 1.15).toFixed(2)); // Economia de combustível/custo marginal
    const lucratividadeAdicionalBrl = Number(((voltaPassengers * 38.0) + (voltaCargoCandidate * 18.50)).toFixed(2));
    
    // 1 km rodado por veículo leve/médio emite em média 165g de CO2
    const reducaoEmissoesCo2Kg = Number(((kmVazioEvitadoKm * 0.165)).toFixed(2));

    const legIda: RouteTripLeg = {
      legId: `LEG-${planId}-OUTBOUND`,
      vehicleId,
      originCity,
      destinationCity,
      distanceKm,
      scheduledDepartureTime: Date.now() + 10 * 60 * 1000,
      passengerCount: idaPassengers,
      cargoPackagesCount: idaCargoPackages,
      isBackhaulLeg: false,
      status: 'PLANEJADA'
    };

    const legVolta: RouteTripLeg = {
      legId: `LEG-${planId}-INBOUND`,
      vehicleId,
      originCity: destinationCity,
      destinationCity: originCity,
      distanceKm,
      scheduledDepartureTime: Date.now() + 180 * 60 * 1000, // Volta 3h após
      passengerCount: voltaPassengers,
      cargoPackagesCount: voltaCargoCandidate,
      isBackhaulLeg: true,
      status: 'PLANEJADA'
    };

    const plan: ConsolidatedRoutePlan = {
      planId,
      corridorName,
      vehicleId,
      legs: [legIda, legVolta],
      totalDistanceKm: distanceKm * 2,
      totalPassengersMoved: totalPassengers,
      totalCargoPackagesMoved: totalCargo,
      ocupacaoPreConsolidacaoPct,
      ocupacaoPosConsolidacaoPct,
      ganhoOcupacaoPct,
      kmVazioEvitadoKm,
      reducaoCustoOperacionalBrl,
      reducaoEmissoesCo2Kg,
      lucratividadeAdicionalBrl,
      generatedTimestamp: Date.now()
    };

    this.consolidatedPlans.set(planId, plan);
    return plan;
  }

  public getConsolidatedPlan(planId: string): ConsolidatedRoutePlan | undefined {
    return this.consolidatedPlans.get(planId);
  }

  public getAllConsolidatedPlans(): ConsolidatedRoutePlan[] {
    return Array.from(this.consolidatedPlans.values());
  }
}

export const routeConsolidationEngine = new RouteConsolidationEngine();
