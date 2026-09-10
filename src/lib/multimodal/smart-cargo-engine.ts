/**
 * PARTIU SMART CARGO ENGINE
 * 
 * Motor de Monetização de Capacidade Ociosa Física de Veículos.
 * Transforma porta-malas vazios de carros particulares, bagageiros de vans e
 * micro-ônibus em malha de entrega expressa colaborativa (Crowd-shipping).
 * 
 * Responsável por:
 * - Identificação de volume livre (litros / m³) e peso disponível (kg)
 * - Alocação de encomendas leves e fracionadas em viagens pré-existentes
 * - Heurística 3D de bin packing e precificação dinâmica de fretes
 */

export interface CargoDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
}

export interface AvailableTrunkSpace {
  vehicleId: string;
  driverId: string;
  driverName: string;
  vehicleModel: string;
  currentRouteOrigin: string;
  currentRouteDestination: string;
  maxTrunkVolumeLiters: number;
  availableVolumeLiters: number;
  maxTrunkWeightKg: number;
  availableWeightKg: number;
  hasRoofRack: boolean;
  emptyBackseatSeats: number;
  maxRouteDetourMinutes: number;
  pickupWindowStart: number;
  pickupWindowEnd: number;
}

export interface CargoPackageItem {
  packageId: string;
  trackingCode: string;
  senderName: string;
  recipientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  dimensions: CargoDimensions;
  category: 'DOCUMENTO' | 'ELETRONICO' | 'VESTUARIO' | 'ALIMENTO_SECO' | 'PECA_AUTOMOTIVA';
  isFragile: boolean;
  declaredValueBrl: number;
}

export interface CargoMatchAllocation {
  matchId: string;
  packageId: string;
  vehicleId: string;
  driverName: string;
  volumeUtilizedLiters: number;
  weightUtilizedKg: number;
  estimatedDetourMinutes: number;
  freightPriceBrl: number;
  driverEarningsBrl: number;
  platformFeeBrl: number;
  co2SavedGrams: number;
  status: 'PENDENTE_CONFIRMACAO' | 'ACEITO' | 'COLETADO' | 'EM_TRANSITO' | 'ENTREGUE';
  timestamp: number;
}

export class SmartCargoEngine {
  private registeredTrunkSpaces: Map<string, AvailableTrunkSpace> = new Map();
  private activeCargoMatches: Map<string, CargoMatchAllocation> = new Map();

  /**
   * Registra espaço ocioso de porta-malas/bagageiro disponível para rota ativa
   */
  public registerAvailableTrunk(space: AvailableTrunkSpace): void {
    this.registeredTrunkSpaces.set(space.vehicleId, space);
  }

  public getAvailableTrunk(vehicleId: string): AvailableTrunkSpace | undefined {
    return this.registeredTrunkSpaces.get(vehicleId);
  }

  public removeTrunkSpace(vehicleId: string): void {
    this.registeredTrunkSpaces.delete(vehicleId);
  }

  /**
   * Calcula o volume cúbico em litros a partir das dimensões em centímetros
   */
  public calculateVolumeLiters(dim: CargoDimensions): number {
    return Number(((dim.lengthCm * dim.widthCm * dim.heightCm) / 1000).toFixed(2));
  }

  /**
   * Calcula o peso cubado padrão logístico (Fator 167 kg/m³)
   */
  public calculateCubedWeightKg(dim: CargoDimensions): number {
    const volumeM3 = (dim.lengthCm * dim.widthCm * dim.heightCm) / 1_000_000;
    return Number((volumeM3 * 167).toFixed(2));
  }

  /**
   * Encontra a melhor viagem em andamento para transportar a encomenda ociosa
   */
  public matchCargoToTrunkSpace(
    cargo: CargoPackageItem,
    originCity: string,
    destinationCity: string,
    distanceKm: number
  ): CargoMatchAllocation | null {
    const packageVolumeLiters = this.calculateVolumeLiters(cargo.dimensions);
    const effectiveWeightKg = Math.max(cargo.dimensions.weightKg, this.calculateCubedWeightKg(cargo.dimensions));

    // Filtra veículos com rota compatível e capacidade livre
    const eligibleTrunks = Array.from(this.registeredTrunkSpaces.values()).filter(trunk => {
      const routeMatch =
        trunk.currentRouteOrigin.toLowerCase().includes(originCity.toLowerCase()) &&
        trunk.currentRouteDestination.toLowerCase().includes(destinationCity.toLowerCase());
      const capacityMatch =
        trunk.availableVolumeLiters >= packageVolumeLiters &&
        trunk.availableWeightKg >= effectiveWeightKg;
      return routeMatch && capacityMatch;
    });

    if (eligibleTrunks.length === 0) {
      return null;
    }

    // Seleciona o veículo com o menor desvio de rota
    eligibleTrunks.sort((a, b) => a.maxRouteDetourMinutes - b.maxRouteDetourMinutes);
    const selectedTrunk = eligibleTrunks[0];
    if (!selectedTrunk) return null;

    // Cálculo dinâmico do frete colaborativo:
    // Base R$ 12,00 + R$ 0.40/km + R$ 1.50/kg efetivo
    const freightPriceBrl = Number((12.0 + (distanceKm * 0.40) + (effectiveWeightKg * 1.50)).toFixed(2));
    const driverEarningsBrl = Number((freightPriceBrl * 0.85).toFixed(2)); // 85% para o motorista
    const platformFeeBrl = Number((freightPriceBrl - driverEarningsBrl).toFixed(2));

    // Estimativa de CO2 economizado ao não despachar caminhão dedicado: ~140g CO2/km
    const co2SavedGrams = Math.round(distanceKm * 140);

    const matchId = `SC-MATCH-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Atualiza capacidade disponível do veículo
    selectedTrunk.availableVolumeLiters = Number((selectedTrunk.availableVolumeLiters - packageVolumeLiters).toFixed(2));
    selectedTrunk.availableWeightKg = Number((selectedTrunk.availableWeightKg - effectiveWeightKg).toFixed(2));

    const allocation: CargoMatchAllocation = {
      matchId,
      packageId: cargo.packageId,
      vehicleId: selectedTrunk.vehicleId,
      driverName: selectedTrunk.driverName,
      volumeUtilizedLiters: packageVolumeLiters,
      weightUtilizedKg: effectiveWeightKg,
      estimatedDetourMinutes: Math.min(selectedTrunk.maxRouteDetourMinutes, 8),
      freightPriceBrl,
      driverEarningsBrl,
      platformFeeBrl,
      co2SavedGrams,
      status: 'ACEITO',
      timestamp: Date.now()
    };

    this.activeCargoMatches.set(matchId, allocation);
    return allocation;
  }

  public getActiveMatches(): CargoMatchAllocation[] {
    return Array.from(this.activeCargoMatches.values());
  }
}

export const smartCargoEngine = new SmartCargoEngine();
