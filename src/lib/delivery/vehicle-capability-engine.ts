/**
 * ==============================================================================
 * 🚚 PARTIU DELIVERY OS — VEHICLE CAPABILITY ENGINE (v1.0)
 * ==============================================================================
 * Validação rigorosa de peso, dimensões, cubagem e tipos de carga contra
 * a capacidade operacional dos veículos homologados.
 * Impede que cargas pesadas ou volumosas sejam despachadas para motos.
 * ==============================================================================
 */

import {
  DeliveryVehicleType,
  PackageCategory,
  PackageSpec,
  VehicleCapability,
} from "./delivery-domain";

export const VEHICLE_CAPABILITIES: Record<DeliveryVehicleType, VehicleCapability> = {
  MOTO: {
    vehicleType: "MOTO",
    maxWeightKg: 20,
    maxLengthCm: 45,
    maxWidthCm: 45,
    maxHeightCm: 45,
    maxVolumeLiters: 90,
    allowedCategories: ["DOCUMENTO", "PACOTE_PEQUENO", "ALIMENTOS", "OUTROS"],
    multipleStopsAllowed: false,
    maxStops: 1,
  },
  CARRO: {
    vehicleType: "CARRO",
    maxWeightKg: 80,
    maxLengthCm: 110,
    maxWidthCm: 85,
    maxHeightCm: 70,
    maxVolumeLiters: 550,
    allowedCategories: [
      "DOCUMENTO",
      "PACOTE_PEQUENO",
      "MEDIO",
      "GRANDE",
      "ALIMENTOS",
      "FRAGIL",
      "ELETRONICOS",
      "OUTROS",
    ],
    multipleStopsAllowed: true,
    maxStops: 3,
  },
  UTILITARIO: {
    vehicleType: "UTILITARIO",
    maxWeightKg: 650,
    maxLengthCm: 220,
    maxWidthCm: 130,
    maxHeightCm: 120,
    maxVolumeLiters: 3400,
    allowedCategories: [
      "DOCUMENTO",
      "PACOTE_PEQUENO",
      "MEDIO",
      "GRANDE",
      "ALIMENTOS",
      "FRAGIL",
      "ELETRONICOS",
      "MUDANCA",
      "OUTROS",
    ],
    multipleStopsAllowed: true,
    maxStops: 5,
  },
  VAN: {
    vehicleType: "VAN",
    maxWeightKg: 1200,
    maxLengthCm: 320,
    maxWidthCm: 160,
    maxHeightCm: 160,
    maxVolumeLiters: 8000,
    allowedCategories: [
      "DOCUMENTO",
      "PACOTE_PEQUENO",
      "MEDIO",
      "GRANDE",
      "ALIMENTOS",
      "FRAGIL",
      "ELETRONICOS",
      "MUDANCA",
      "OUTROS",
    ],
    multipleStopsAllowed: true,
    maxStops: 5,
  },
  CARRETO: {
    vehicleType: "CARRETO",
    maxWeightKg: 2000,
    maxLengthCm: 450,
    maxWidthCm: 190,
    maxHeightCm: 180,
    maxVolumeLiters: 15000,
    allowedCategories: [
      "DOCUMENTO",
      "PACOTE_PEQUENO",
      "MEDIO",
      "GRANDE",
      "ALIMENTOS",
      "FRAGIL",
      "ELETRONICOS",
      "MUDANCA",
      "OUTROS",
    ],
    multipleStopsAllowed: true,
    maxStops: 5,
  },
};

export interface PackageValidationResult {
  isCompatible: boolean;
  reasons: string[];
  suggestedVehicle?: DeliveryVehicleType | undefined;
  calculatedVolumeLiters: number;
}

export class VehicleCapabilityEngine {
  /**
   * Calcula o volume cúbico do pacote em litros a partir das dimensões em centímetros.
   */
  public calculateVolumeLiters(dimensionsCm: {
    length: number;
    width: number;
    height: number;
  }): number {
    const volumeCm3 = dimensionsCm.length * dimensionsCm.width * dimensionsCm.height;
    return Number((volumeCm3 / 1000).toFixed(1));
  }

  /**
   * Valida se o pacote e a quantidade de paradas são compatíveis com o veículo selecionado.
   */
  public validatePackageCompatibility(
    packageSpec: PackageSpec,
    vehicleType: DeliveryVehicleType,
    additionalStopsCount: number = 0
  ): PackageValidationResult {
    const capability = VEHICLE_CAPABILITIES[vehicleType];
    const reasons: string[] = [];
    const volumeLiters = this.calculateVolumeLiters(packageSpec.dimensionsCm);

    // 1. Limite de Peso
    if (packageSpec.weightKg > capability.maxWeightKg) {
      reasons.push(
        `Peso (${packageSpec.weightKg} kg) excede a capacidade máxima de ${vehicleType} (${capability.maxWeightKg} kg)`
      );
    }

    // 2. Dimensões Lineares
    if (
      packageSpec.dimensionsCm.length > capability.maxLengthCm ||
      packageSpec.dimensionsCm.width > capability.maxWidthCm ||
      packageSpec.dimensionsCm.height > capability.maxHeightCm
    ) {
      reasons.push(
        `Dimensões do pacote (${packageSpec.dimensionsCm.length}x${packageSpec.dimensionsCm.width}x${packageSpec.dimensionsCm.height}cm) excedem o compartimento de ${vehicleType} (${capability.maxLengthCm}x${capability.maxWidthCm}x${capability.maxHeightCm}cm)`
      );
    }

    // 3. Limite de Volume Cúbico
    if (volumeLiters > capability.maxVolumeLiters) {
      reasons.push(
        `Volume cúbico (${volumeLiters} L) excede o espaço de carga de ${vehicleType} (${capability.maxVolumeLiters} L)`
      );
    }

    // 4. Categoria do Pacote Permitida
    if (!capability.allowedCategories.includes(packageSpec.category)) {
      reasons.push(
        `Categoria "${packageSpec.category}" não é permitida para a modalidade ${vehicleType}`
      );
    }

    // 5. Múltiplas Paradas
    if (additionalStopsCount > 0 && !capability.multipleStopsAllowed) {
      reasons.push(
        `A modalidade ${vehicleType} não permite entregas fracionadas com múltiplas paradas`
      );
    } else if (additionalStopsCount > capability.maxStops) {
      reasons.push(
        `Quantidade de paradas adicionais (${additionalStopsCount}) excede o limite de ${vehicleType} (máximo de ${capability.maxStops} paradas)`
      );
    }

    // 6. Carga Frágil em Moto
    if (vehicleType === "MOTO" && packageSpec.isFragile) {
      reasons.push("Itens declarados como FRÁGIL exigem transporte automotivo com estabilização (Carro ou Utilitário)");
    }

    const isCompatible = reasons.length === 0;
    let suggestedVehicle: DeliveryVehicleType | undefined = undefined;

    if (!isCompatible) {
      suggestedVehicle = this.suggestOptimalVehicle(packageSpec, additionalStopsCount);
    }

    return {
      isCompatible,
      reasons,
      suggestedVehicle,
      calculatedVolumeLiters: volumeLiters,
    };
  }

  /**
   * Sugere o menor veículo compatível capaz de transportar a carga com segurança.
   */
  public suggestOptimalVehicle(
    packageSpec: PackageSpec,
    additionalStopsCount: number = 0
  ): DeliveryVehicleType {
    const hierarchy: DeliveryVehicleType[] = [
      "MOTO",
      "CARRO",
      "UTILITARIO",
      "VAN",
      "CARRETO",
    ];

    for (const vType of hierarchy) {
      const cap = VEHICLE_CAPABILITIES[vType];
      const volume = this.calculateVolumeLiters(packageSpec.dimensionsCm);

      if (
        packageSpec.weightKg <= cap.maxWeightKg &&
        packageSpec.dimensionsCm.length <= cap.maxLengthCm &&
        packageSpec.dimensionsCm.width <= cap.maxWidthCm &&
        packageSpec.dimensionsCm.height <= cap.maxHeightCm &&
        volume <= cap.maxVolumeLiters &&
        cap.allowedCategories.includes(packageSpec.category) &&
        (additionalStopsCount === 0 || (cap.multipleStopsAllowed && additionalStopsCount <= cap.maxStops)) &&
        !(vType === "MOTO" && packageSpec.isFragile)
      ) {
        return vType;
      }
    }

    return "CARRETO";
  }
}

export const vehicleCapabilityEngine = new VehicleCapabilityEngine();
