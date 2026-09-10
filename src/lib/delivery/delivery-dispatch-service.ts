/**
 * ==============================================================================
 * 🚀 PARTIU DELIVERY OS — DISPATCH & CONCURRENCY SERVICE (v1.0)
 * ==============================================================================
 * Orquestração de despacho de entregas, concorrência atômica via fencing tokens,
 * integração de canais de sincronização em tempo real e persistência auditada.
 * Padrão operacional 99Entrega.
 * ==============================================================================
 */

import {
  DeliveryContact,
  DeliveryOrder,
  DeliveryPricingQuote,
  DeliveryVehicleType,
  PackageSpec,
} from "./delivery-domain";
import { vehicleCapabilityEngine } from "./vehicle-capability-engine";
import { deliveryStateMachine } from "./delivery-state-machine";
import { deliveryMultiStopEngine, CreateStopInput } from "./delivery-multistop-engine";
import { deliveryPinEngine } from "./delivery-pin-engine";
import { deliveryTrackingEngine } from "./delivery-tracking-engine";
import { broadcastEventoCorrida } from "../partiu-realtime-service";
import { silentCatchWarn } from "@/lib/structured-logger";


const BASE_FARES: Record<DeliveryVehicleType, number> = {
  MOTO: 7.5,
  CARRO: 12.0,
  UTILITARIO: 35.0,
  VAN: 70.0,
  CARRETO: 120.0,
};

const KM_RATES: Record<DeliveryVehicleType, number> = {
  MOTO: 1.8,
  CARRO: 2.5,
  UTILITARIO: 4.5,
  VAN: 6.0,
  CARRETO: 8.5,
};

export class DeliveryDispatchService {
  private activeDeliveries = new Map<string, DeliveryOrder>();
  private claimLocks = new Map<string, { driverId: string; fencingToken: string; claimedAt: number }>();

  /**
   * Calcula o orçamento formal (cotação) da entrega com precisão exata em centavos (Minor Units)
   */
  public calculateQuote(params: {
    vehicleType: DeliveryVehicleType;
    distanceKm: number;
    durationMin: number;
    additionalStopsCount: number;
    declaredValueBrl?: number | undefined;
  }): DeliveryPricingQuote {
    const baseFareCents = Math.round((BASE_FARES[params.vehicleType] || 7.5) * 100);
    const kmRateCents = Math.round((KM_RATES[params.vehicleType] || 1.8) * 100);
    const distanceFareCents = Math.round(params.distanceKm * kmRateCents);
    const additionalStopsFareCents = Math.round(
      deliveryMultiStopEngine.calculateAdditionalStopsFare(params.additionalStopsCount + 1) * 100
    );

    // Seguro de carga: 0.8% do valor declarado acima de R$ 50,00 (5000 centavos)
    let insuranceFareCents = 0;
    if (params.declaredValueBrl && params.declaredValueBrl > 50) {
      const excessCents = Math.round((params.declaredValueBrl - 50) * 100);
      insuranceFareCents = Math.round(excessCents * 0.008);
    }

    const grossTotalCents = baseFareCents + distanceFareCents + additionalStopsFareCents + insuranceFareCents;
    const driverEarningsCents = Math.round(grossTotalCents * 0.88);
    const platformRevenueCents = grossTotalCents - driverEarningsCents;

    const baseFareBrl = baseFareCents / 100;
    const distanceFareBrl = distanceFareCents / 100;
    const additionalStopsFareBrl = additionalStopsFareCents / 100;
    const insuranceFareBrl = insuranceFareCents / 100;
    const grossTotalBrl = grossTotalCents / 100;
    const driverEarningsBrl = driverEarningsCents / 100;
    const platformRevenueBrl = platformRevenueCents / 100;

    return {
      baseFareBrl,
      distanceKm: params.distanceKm,
      distanceFareBrl,
      durationMin: params.durationMin,
      additionalStopsCount: params.additionalStopsCount,
      additionalStopsFareBrl,
      insuranceFareBrl,
      returnFareBrl: 0,
      grossTotalBrl,
      driverEarningsBrl,
      platformRevenueBrl,
      baseFareCents,
      distanceFareCents,
      additionalStopsFareCents,
      insuranceFareCents,
      grossTotalCents,
      driverEarningsCents,
      platformRevenueCents,
    };
  }

  /**
   * Cria e despacha uma nova solicitação de entrega
   */
  public createDeliveryOrder(params: {
    senderId: string;
    senderContact: DeliveryContact;
    vehicleType: DeliveryVehicleType;
    packageSpec: PackageSpec;
    pickupAddress: string;
    dropoffStops: CreateStopInput[];
    distanceKm: number;
    durationMin: number;
  }): DeliveryOrder {
    // 1. Validação de capacidade do veículo
    const validation = vehicleCapabilityEngine.validatePackageCompatibility(
      params.packageSpec,
      params.vehicleType,
      params.dropoffStops.length > 1 ? params.dropoffStops.length - 1 : 0
    );

    if (!validation.isCompatible) {
      throw new Error(
        `Incompatibilidade veicular detectada: ${validation.reasons.join(". ")}${
          validation.suggestedVehicle ? ` Sugerido: ${validation.suggestedVehicle}` : ""
        }`
      );
    }

    const deliveryId = `DEL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const trackingCode = `DEL-${Math.floor(10000 + Math.random() * 90000)}`;
    const trackingToken = deliveryTrackingEngine.generateTrackingToken(deliveryId);

    // 2. Inicializa máquina de estados
    deliveryStateMachine.initDelivery(deliveryId, "DRAFT");
    deliveryStateMachine.transition(deliveryId, "REQUESTED", "SENDER", "Entrega solicitada pelo remetente");
    deliveryStateMachine.transition(deliveryId, "SEARCHING_DRIVER", "SYSTEM", "Buscando entregadores homologados");

    // 3. Inicializa paradas com OTPs seguros
    const pickupOtp = deliveryPinEngine.generateOtp();
    const pickupStopInput: CreateStopInput = {
      type: "PICKUP",
      address: params.pickupAddress,
      contact: params.senderContact,
      instructions: "Coletar pacote com o remetente",
      otpExpected: pickupOtp,
    };

    const stops = deliveryMultiStopEngine.initializeStops(
      deliveryId,
      pickupStopInput,
      params.dropoffStops
    );

    // 4. Calcula cotação
    const pricing = this.calculateQuote({
      vehicleType: params.vehicleType,
      distanceKm: params.distanceKm,
      durationMin: params.durationMin,
      additionalStopsCount: params.dropoffStops.length > 1 ? params.dropoffStops.length - 1 : 0,
      declaredValueBrl: params.packageSpec.declaredValueBrl,
    });

    const order: DeliveryOrder = {
      id: deliveryId,
      trackingCode,
      trackingToken,
      senderId: params.senderId,
      senderContact: params.senderContact,
      vehicleType: params.vehicleType,
      packageSpec: params.packageSpec,
      status: "SEARCHING_DRIVER",
      stops,
      currentStopIndex: 0,
      pricing,
      proofs: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.activeDeliveries.set(deliveryId, order);
    deliveryTrackingEngine.registerDelivery(order);

    // Sincroniza via Broadcast
    if (typeof window !== "undefined") {
      localStorage.setItem("partiu_delivery_ativa", JSON.stringify(order));
      window.dispatchEvent(new CustomEvent("partiu:delivery-atualizada", { detail: order }));
    }

    try {
      broadcastEventoCorrida("TRIP_OFFERED", null);
    } catch (err) { silentCatchWarn("delivery-dispatch-service", err); }

    return order;
  }

  /**
   * Aceite concorrente atômico pelo condutor via Fencing Token
   */
  public claimDelivery(
    deliveryId: string,
    driver: {
      id: string;
      name: string;
      phone: string;
      vehicleModel: string;
      vehiclePlate: string;
      rating?: number | undefined;
    }
  ): { success: boolean; fencingToken?: string | undefined; order?: DeliveryOrder | undefined; message: string } {
    const existingClaim = this.claimLocks.get(deliveryId);
    if (existingClaim && existingClaim.driverId !== driver.id) {
      return {
        success: false,
        message: "Outro entregador aceitou esta solicitação frações de segundo antes.",
      };
    }

    const order = this.activeDeliveries.get(deliveryId);
    if (!order) {
      return { success: false, message: "Solicitação de entrega não encontrada." };
    }

    const fencingToken = `FENCE-DEL-${Date.now()}-${driver.id}`;
    this.claimLocks.set(deliveryId, {
      driverId: driver.id,
      fencingToken,
      claimedAt: Date.now(),
    });

    order.driverId = driver.id;
    order.driverName = driver.name;
    order.driverPhone = driver.phone;
    order.driverVehicleModel = driver.vehicleModel;
    order.driverVehiclePlate = driver.vehiclePlate;
    order.driverRating = driver.rating || 4.96;
    order.updatedAt = Date.now();

    // Transiciona FSM
    deliveryStateMachine.transition(deliveryId, "DRIVER_ASSIGNED", "SYSTEM", "Entregador associado");
    deliveryStateMachine.transition(deliveryId, "DRIVER_ACCEPTED", "DRIVER", "Entregador aceitou no radar");
    deliveryStateMachine.transition(deliveryId, "HEADING_TO_PICKUP", "DRIVER", "A caminho da coleta");
    order.status = "HEADING_TO_PICKUP";

    if (typeof window !== "undefined") {
      localStorage.setItem("partiu_delivery_ativa", JSON.stringify(order));
      window.dispatchEvent(new CustomEvent("partiu:delivery-atualizada", { detail: order }));
    }

    return {
      success: true,
      fencingToken,
      order,
      message: "Entrega aceita com sucesso!",
    };
  }

  /**
   * Obtém a entrega ativa no ecossistema
   */
  public getActiveDelivery(): DeliveryOrder | null {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("partiu_delivery_ativa");
        if (raw) return JSON.parse(raw);
      } catch (err) { silentCatchWarn("delivery-dispatch-service", err); }
    }
    const list = Array.from(this.activeDeliveries.values());
    return list.find((d) => d.status !== "COMPLETED" && d.status !== "CANCELLED") || null;
  }

  /**
   * Obtém entrega por ID
   */
  public getDelivery(id: string): DeliveryOrder | undefined {
    return this.activeDeliveries.get(id);
  }
}

export const deliveryDispatchService = new DeliveryDispatchService();
