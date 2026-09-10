/**
 * PARTIU INTERCITY DISPATCH ENGINE
 * 
 * Motor de Despacho e Otimização Intermunicipal Autônomo.
 * Responsável por:
 * - Unir múltiplos passageiros em viagens compartilhadas intermunicipais
 * - Unir encomendas e pacotes no mesmo fluxo de passageiros
 * - Consolidar viagens para maximizar ocupação, reduzir custo por km e elevar o lucro líquido
 */

import { MultimodalType, MultimodalVehicle, TransitLine } from './multimodal-network-engine';

export interface IntercityRideRequest {
  requestId: string;
  passengerId: string;
  passengerName: string;
  originCityId: string;
  originCityName: string;
  destinationCityId: string;
  destinationCityName: string;
  desiredDepartureTimestamp: number;
  seatsRequested: number;
  baggageCount: number;
  baggageWeightKg: number;
  maxDelayMinutes: number;
  offeredFareBrl: number;
}

export interface IntercityCargoRequest {
  cargoId: string;
  senderId: string;
  senderName: string;
  recipientName: string;
  originCityId: string;
  destinationCityId: string;
  weightKg: number;
  volumeLiters: number;
  cargoType: 'DOCUMENTO' | 'ENCOMENDA_LEVE' | 'VOLUME_MEDIO' | 'MERCADORIA_FRACIONADA';
  priority: 'FLASH' | 'SAME_DAY' | 'STANDARD';
  targetDeliveryTimestamp: number;
  declaredValueBrl: number;
  freightFareBrl: number;
}

export interface ConsolidatedIntercityManifest {
  manifestId: string;
  vehicleId: string;
  operatorId: string;
  operatorName: string;
  modalType: MultimodalType;
  lineId?: string | undefined;
  originCityId: string;
  destinationCityId: string;
  scheduledDepartureTimestamp: number;
  distanceKm: number;
  passengers: IntercityRideRequest[];
  cargoPackages: IntercityCargoRequest[];
  
  // Métricas Consolidadas
  totalPassengersCount: number;
  totalCargoWeightKg: number;
  totalCargoVolumeLiters: number;
  passengerOccupancyRatePct: number;
  cargoOccupancyRatePct: number;
  
  // Financeiro do Despacho
  receitaPassageirosBrl: number;
  receitaCargaBrl: number;
  receitaBrutaTotalBrl: number;
  custoCombustivelPedagioBrl: number;
  repasseOperadorBrl: number;
  margemLiquidaPlataformaBrl: number;
  custoPorKmBrl: number;
  
  // Score de Otimização (0 a 100)
  optimizationScore: number;
  status: 'EM_CONSOLIDACAO' | 'DESPACHADO' | 'EM_TRANSITO' | 'FINALIZADO';
}

export class IntercityDispatchEngine {
  private activeManifests: Map<string, ConsolidatedIntercityManifest> = new Map();

  /**
   * Consolida passageiros e encomendas em um manifesto de despacho intermunicipal otimizado
   */
  public consolidateAndDispatch(
    originCityId: string,
    destinationCityId: string,
    distanceKm: number,
    passengerQueue: IntercityRideRequest[],
    cargoQueue: IntercityCargoRequest[],
    availableVehicles: MultimodalVehicle[]
  ): ConsolidatedIntercityManifest | null {
    if (availableVehicles.length === 0 || (passengerQueue.length === 0 && cargoQueue.length === 0)) {
      return null;
    }

    // Seleciona o melhor veículo baseado na demanda combinada
    const totalDemandedSeats = passengerQueue.reduce((acc, p) => acc + p.seatsRequested, 0);
    const totalDemandedCargoKg = cargoQueue.reduce((acc, c) => acc + c.weightKg, 0);

    // Prioriza veículos de maior ocupação proporcional (ex: Van se demanda > 6, Carro se demanda <= 4)
    const sortedVehicles = [...availableVehicles].sort((a, b) => {
      const fitA = Math.abs(a.totalSeats - totalDemandedSeats);
      const fitB = Math.abs(b.totalSeats - totalDemandedSeats);
      return fitA - fitB;
    });

    const targetVehicle = sortedVehicles[0];
    if (!targetVehicle) return null;

    // Aloca passageiros até o limite do veículo
    const allocatedPassengers: IntercityRideRequest[] = [];
    let allocatedSeats = 0;
    let allocatedPassengerBaggageKg = 0;

    for (const req of passengerQueue) {
      if (allocatedSeats + req.seatsRequested <= targetVehicle.totalSeats) {
        allocatedPassengers.push(req);
        allocatedSeats += req.seatsRequested;
        allocatedPassengerBaggageKg += req.baggageWeightKg;
      }
    }

    // Capacidade remanescente para carga
    const remainingCargoCapacityKg = Math.max(0, targetVehicle.cargoCapacityKg - allocatedPassengerBaggageKg);
    const remainingCargoVolumeLiters = targetVehicle.cargoVolumeLiters * 0.75; // Reserva 25% para malas de passageiros

    const allocatedCargo: IntercityCargoRequest[] = [];
    let allocatedCargoKg = 0;
    let allocatedCargoVol = 0;

    for (const cargo of cargoQueue) {
      if (
        allocatedCargoKg + cargo.weightKg <= remainingCargoCapacityKg &&
        allocatedCargoVol + cargo.volumeLiters <= remainingCargoVolumeLiters
      ) {
        allocatedCargo.push(cargo);
        allocatedCargoKg += cargo.weightKg;
        allocatedCargoVol += cargo.volumeLiters;
      }
    }

    // Métricas Financeiras
    const receitaPassageirosBrl = allocatedPassengers.reduce((sum, p) => sum + p.offeredFareBrl, 0);
    const receitaCargaBrl = allocatedCargo.reduce((sum, c) => sum + c.freightFareBrl, 0);
    const receitaBrutaTotalBrl = Number((receitaPassageirosBrl + receitaCargaBrl).toFixed(2));

    // Custo estimado: R$ 0.95/km combustível + R$ 0.30/km manutenção/pedágio
    const custoCombustivelPedagioBrl = Number((distanceKm * 1.25).toFixed(2));
    const repasseOperadorBrl = Number((receitaBrutaTotalBrl * 0.85).toFixed(2));
    const margemLiquidaPlataformaBrl = Number((receitaBrutaTotalBrl - repasseOperadorBrl).toFixed(2));
    const custoPorKmBrl = Number((custoCombustivelPedagioBrl / Math.max(1, distanceKm)).toFixed(2));

    const passengerOccupancyRatePct = targetVehicle.totalSeats > 0
      ? Number(((allocatedSeats / targetVehicle.totalSeats) * 100).toFixed(1))
      : 0;

    const cargoOccupancyRatePct = targetVehicle.cargoCapacityKg > 0
      ? Number((((allocatedPassengerBaggageKg + allocatedCargoKg) / targetVehicle.cargoCapacityKg) * 100).toFixed(1))
      : 0;

    // Função de Score Multivariável:
    // Maximize Ocupação (35%) + Margem (30%) + Eficiência Custo (20%) + Utilização Carga (15%)
    const scoreOcupacao = (passengerOccupancyRatePct / 100) * 35;
    const scoreMargem = Math.min(30, (margemLiquidaPlataformaBrl / Math.max(1, custoCombustivelPedagioBrl)) * 30);
    const scoreCusto = Math.max(0, 20 - (custoPorKmBrl * 4));
    const scoreCarga = (cargoOccupancyRatePct / 100) * 15;
    const optimizationScore = Math.min(100, Math.round(scoreOcupacao + scoreMargem + scoreCusto + scoreCarga));

    const manifestId = `MNF-INT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const manifest: ConsolidatedIntercityManifest = {
      manifestId,
      vehicleId: targetVehicle.vehicleId,
      operatorId: targetVehicle.operatorId,
      operatorName: targetVehicle.operatorName,
      modalType: targetVehicle.modalType,
      originCityId,
      destinationCityId,
      scheduledDepartureTimestamp: Date.now() + 15 * 60 * 1000, // Partida em 15 min
      distanceKm,
      passengers: allocatedPassengers,
      cargoPackages: allocatedCargo,
      totalPassengersCount: allocatedSeats,
      totalCargoWeightKg: allocatedCargoKg,
      totalCargoVolumeLiters: allocatedCargoVol,
      passengerOccupancyRatePct,
      cargoOccupancyRatePct,
      receitaPassageirosBrl,
      receitaCargaBrl,
      receitaBrutaTotalBrl,
      custoCombustivelPedagioBrl,
      repasseOperadorBrl,
      margemLiquidaPlataformaBrl,
      custoPorKmBrl,
      optimizationScore,
      status: 'DESPACHADO'
    };

    this.activeManifests.set(manifestId, manifest);
    return manifest;
  }

  public getManifest(manifestId: string): ConsolidatedIntercityManifest | undefined {
    return this.activeManifests.get(manifestId);
  }

  public getAllActiveManifests(): ConsolidatedIntercityManifest[] {
    return Array.from(this.activeManifests.values());
  }
}

export const intercityDispatchEngine = new IntercityDispatchEngine();
