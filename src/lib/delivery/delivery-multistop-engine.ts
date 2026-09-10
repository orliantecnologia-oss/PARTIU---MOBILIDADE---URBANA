/**
 * ==============================================================================
 * 🗺️ PARTIU DELIVERY OS — MULTI-STOP ROUTE & STOP ENGINE (v1.0)
 * ==============================================================================
 * Gerenciamento de paradas fracionadas sequenciais (1 Coleta + até 5 Paradas de Entrega).
 * Padrão operacional 99Entrega com tarifação progressiva e controle de status individual.
 * ==============================================================================
 */

import { DeliveryStop, DeliveryStopStatus, DeliveryStopType } from "./delivery-domain";

export interface CreateStopInput {
  type: DeliveryStopType;
  address: string;
  complement?: string | undefined;
  reference?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  contact: {
    name: string;
    phone: string;
    email?: string | undefined;
    documentCpf?: string | undefined;
  };
  instructions?: string | undefined;
  otpExpected: string;
}

export class DeliveryMultiStopEngine {
  private stopsByDelivery = new Map<string, DeliveryStop[]>();
  private currentStopIndexByDelivery = new Map<string, number>();

  /**
   * Inicializa as paradas de uma entrega: 1 Coleta (sequence 0) + N Entregas (sequence 1..N)
   */
  public initializeStops(
    deliveryId: string,
    pickupInput: CreateStopInput,
    dropoffInputs: CreateStopInput[]
  ): DeliveryStop[] {
    if (dropoffInputs.length === 0) {
      throw new Error("Uma entrega deve conter ao menos uma parada de destino.");
    }
    if (dropoffInputs.length > 5) {
      throw new Error("Limite operacional de paradas excedido (máximo de 5 paradas de entrega).");
    }

    const stops: DeliveryStop[] = [];

    // Parada 0: Coleta
    stops.push({
      id: `STOP-${deliveryId}-0-PICKUP`,
      deliveryId,
      sequence: 0,
      type: "PICKUP",
      address: pickupInput.address,
      complement: pickupInput.complement,
      reference: pickupInput.reference,
      latitude: pickupInput.latitude,
      longitude: pickupInput.longitude,
      contact: pickupInput.contact,
      instructions: pickupInput.instructions,
      status: "PENDING",
      otpExpected: pickupInput.otpExpected,
      otpVerified: false,
      otpFailedAttempts: 0,
    });

    // Paradas 1..N: Entregas
    dropoffInputs.forEach((input, idx) => {
      stops.push({
        id: `STOP-${deliveryId}-${idx + 1}-DROPOFF`,
        deliveryId,
        sequence: idx + 1,
        type: "DROPOFF",
        address: input.address,
        complement: input.complement,
        reference: input.reference,
        latitude: input.latitude,
        longitude: input.longitude,
        contact: input.contact,
        instructions: input.instructions,
        status: "PENDING",
        otpExpected: input.otpExpected,
        otpVerified: false,
        otpFailedAttempts: 0,
      });
    });

    this.stopsByDelivery.set(deliveryId, stops);
    this.currentStopIndexByDelivery.set(deliveryId, 0);

    return stops;
  }

  /**
   * Obtém todas as paradas de uma entrega
   */
  public getStops(deliveryId: string): DeliveryStop[] {
    return this.stopsByDelivery.get(deliveryId) || [];
  }

  /**
   * Obtém a parada atualmente ativa
   */
  public getCurrentStop(deliveryId: string): DeliveryStop | null {
    const stops = this.getStops(deliveryId);
    const index = this.currentStopIndexByDelivery.get(deliveryId) ?? 0;
    return stops[index] || null;
  }

  /**
   * Atualiza o status de uma parada específica
   */
  public updateStopStatus(
    deliveryId: string,
    stopId: string,
    newStatus: DeliveryStopStatus,
    proofId?: string | undefined
  ): DeliveryStop | null {
    const stops = this.getStops(deliveryId);
    const stop = stops.find((s) => s.id === stopId);
    if (!stop) return null;

    stop.status = newStatus;
    const now = Date.now();

    if (newStatus === "ARRIVED") {
      stop.arrivedAt = now;
    } else if (newStatus === "COMPLETED" || newStatus === "FAILED") {
      stop.completedAt = now;
      if (proofId) stop.proofId = proofId;
    }

    return stop;
  }

  /**
   * Avança para a próxima parada da rota
   */
  public advanceToNextStop(deliveryId: string): DeliveryStop | null {
    const stops = this.getStops(deliveryId);
    const currentIndex = this.currentStopIndexByDelivery.get(deliveryId) ?? 0;
    const nextIndex = currentIndex + 1;
    const nextStop = stops[nextIndex];

    if (nextStop) {
      this.currentStopIndexByDelivery.set(deliveryId, nextIndex);
      nextStop.status = "HEADING";
      return nextStop;
    }

    return null;
  }

  /**
   * Adiciona uma parada de retorno ao remetente quando ocorre falha no destinatário
   */
  public appendReturnStop(
    deliveryId: string,
    pickupAddress: string,
    senderContact: { name: string; phone: string },
    returnOtp: string
  ): DeliveryStop {
    const stops = this.getStops(deliveryId);
    const returnStop: DeliveryStop = {
      id: `STOP-${deliveryId}-${stops.length}-RETURN`,
      deliveryId,
      sequence: stops.length,
      type: "RETURN",
      address: pickupAddress,
      contact: senderContact,
      instructions: "Devolução de encomenda não entregue ao remetente",
      status: "HEADING",
      otpExpected: returnOtp,
      otpVerified: false,
      otpFailedAttempts: 0,
    };

    stops.push(returnStop);
    this.currentStopIndexByDelivery.set(deliveryId, stops.length - 1);
    return returnStop;
  }

  /**
   * Verifica se todas as paradas de entrega foram concluídas
   */
  public areAllDropoffsCompleted(deliveryId: string): boolean {
    const stops = this.getStops(deliveryId);
    const dropoffs = stops.filter((s) => s.type === "DROPOFF");
    return dropoffs.length > 0 && dropoffs.every((s) => s.status === "COMPLETED");
  }

  /**
   * Calcula o valor adicional cobrado por paradas fracionadas
   * (+R$ 7,00 por parada adicional além da primeira entrega)
   */
  public calculateAdditionalStopsFare(dropoffCount: number): number {
    if (dropoffCount <= 1) return 0;
    const extraStops = dropoffCount - 1;
    return extraStops * 7.0; // R$ 7,00 por parada adicional
  }
}

export const deliveryMultiStopEngine = new DeliveryMultiStopEngine();
