/**
 * ==============================================================================
 * 🔄 PARTIU DRIVER OS — CONSECUTIVE RIDES ENGINE (BACK-TO-BACK DISPATCH) (v1.0)
 * ==============================================================================
 * Motor de despacho consecutivo (encadeamento de corridas) para motoristas.
 * Padrão operacional Uber / 99:
 * 
 * 1. Janela de Oportunidade: Permite envio de oferta da próxima corrida apenas
 *    quando o condutor está em viagem ativa (IN_PROGRESS) e a <= 5 minutos ou <= 2.5 km
 *    do destino final.
 * 2. Isolamento Estrito de Estados: A corrida ativa permanece inalterada em IN_PROGRESS.
 *    A próxima corrida reside no estado isolado QUEUED.
 * 3. Transição Atômica (Handover): Ao finalizar a corrida atual (COMPLETED), o motorista
 *    transiciona automaticamente para HEADING_TO_PICKUP da corrida enfileirada, sem passar
 *    por IDLE e sem correr risco de dupla atribuição.
 * 4. Desacoplamento de Cancelamento: Se o passageiro da próxima corrida cancelar, a corrida
 *    atual continua com 100% de integridade e estabilidade.
 * ==============================================================================
 */

import { driverStateMachine } from "./driver-state-machine";
import type { CorridaPartiu } from "../partiu-engine";
import { silentCatchWarn } from "@/lib/structured-logger";


const STORAGE_KEY_QUEUED_RIDE = "partiu_driver_queued_ride_v1";

export interface QueuedRideSlot {
  driverId: string;
  activeRideId: string;
  queuedRide: CorridaPartiu | null;
  offeredRide: CorridaPartiu | null;
  offeredAt: number | null;
  acceptedAt: number | null;
}

export class DriverConsecutiveRidesEngine {
  private static instance: DriverConsecutiveRidesEngine;
  private queuedSlots = new Map<string, QueuedRideSlot>();

  private constructor() {
    this.restoreFromStorage();
  }

  public static getInstance(): DriverConsecutiveRidesEngine {
    if (!DriverConsecutiveRidesEngine.instance) {
      DriverConsecutiveRidesEngine.instance = new DriverConsecutiveRidesEngine();
    }
    return DriverConsecutiveRidesEngine.instance;
  }

  /**
   * Avalia se o condutor está na janela operacional de receber uma corrida consecutiva
   */
  public canOfferConsecutiveRide(params: {
    driverOperatingState: string;
    remainingDistanceKm: number;
    remainingDurationMin: number;
    driverId: string;
  }): boolean {
    // Apenas em viagem ativa
    if (params.driverOperatingState !== "IN_TRIP" && params.driverOperatingState !== "IN_PROGRESS") {
      return false;
    }

    // Não pode ter outra corrida já enfileirada
    const slot = this.getSlot(params.driverId);
    if (slot.queuedRide) {
      return false;
    }

    // Janela: últimos 5 minutos OU últimos 2.5 km
    const isCloseByTime = params.remainingDurationMin <= 5 && params.remainingDurationMin > 0;
    const isCloseByDistance = params.remainingDistanceKm <= 2.5 && params.remainingDistanceKm > 0;

    return isCloseByTime || isCloseByDistance;
  }

  /**
   * Dispara oferta de corrida consecutiva no Cockpit do motorista
   */
  public offerConsecutiveRide(
    driverId: string,
    activeRideId: string,
    candidateRide: CorridaPartiu
  ): boolean {
    const slot = this.getSlot(driverId);
    if (slot.queuedRide) {
      console.warn("[ConsecutiveRides] Motorista já possui corrida consecutiva enfileirada.");
      return false;
    }

    slot.activeRideId = activeRideId;
    slot.offeredRide = candidateRide;
    slot.offeredAt = Date.now();
    this.queuedSlots.set(driverId, slot);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:consecutive-ride-offered", {
          detail: { driverId, activeRideId, candidateRide },
        })
      );
    }

    return true;
  }

  /**
   * Motorista aceita a próxima corrida antes de terminar a atual
   */
  public acceptConsecutiveRide(driverId: string): CorridaPartiu | null {
    const slot = this.getSlot(driverId);
    if (!slot.offeredRide) {
      console.warn("[ConsecutiveRides] Nenhuma oferta consecutiva pendente para aceitar.");
      return null;
    }

    const accepted = {
      ...slot.offeredRide,
      status: "AGUARDANDO_VEICULO_TERMINAR_CORRIDA_ANTERIOR" as any,
      motoristaId: driverId,
    };

    slot.queuedRide = accepted;
    slot.offeredRide = null;
    slot.acceptedAt = Date.now();
    this.queuedSlots.set(driverId, slot);
    this.persistToStorage(driverId, accepted);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:consecutive-ride-accepted", {
          detail: { driverId, queuedRide: accepted },
        })
      );
    }

    return accepted;
  }

  /**
   * Motorista recusa a oferta consecutiva (sem penalidade)
   */
  public rejectConsecutiveRide(driverId: string): void {
    const slot = this.getSlot(driverId);
    slot.offeredRide = null;
    slot.offeredAt = null;
    this.queuedSlots.set(driverId, slot);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:consecutive-ride-rejected", {
          detail: { driverId },
        })
      );
    }
  }

  /**
   * Obtém a corrida enfileirada para a próxima etapa
   */
  public getQueuedRide(driverId: string): CorridaPartiu | null {
    const slot = this.getSlot(driverId);
    return slot.queuedRide;
  }

  /**
   * Transição Atômica: Conclui a corrida anterior e promove a enfileirada para ativa
   */
  public promoteQueuedRideToActive(driverId: string): CorridaPartiu | null {
    const slot = this.getSlot(driverId);
    if (!slot.queuedRide) {
      return null;
    }

    const nextRide: CorridaPartiu = {
      ...slot.queuedRide,
      status: "A_CAMINHO",
    };

    // 1. Limpa slot de enfileiramento
    slot.queuedRide = null;
    slot.activeRideId = nextRide.id;
    slot.acceptedAt = null;
    this.queuedSlots.set(driverId, slot);
    this.clearStorage(driverId);

    // 2. Salva como corrida ativa global
    if (typeof window !== "undefined") {
      localStorage.setItem("partiu_corrida_ativa", JSON.stringify(nextRide));
    }

    // 3. Transição direta na máquina de estados para HEADING_TO_PICKUP
    driverStateMachine.safeTransitionRide(
      "HEADING_TO_PICKUP",
      driverId,
      nextRide.id,
      "SYSTEM",
      { backToBackPromotion: true, previousRideId: slot.activeRideId }
    );

    // 4. Notifica UI do motorista para atualizar rota e dados do passageiro imediatamente
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:corrida-atualizada", {
          detail: nextRide,
        })
      );
      window.dispatchEvent(
        new CustomEvent("partiu:consecutive-ride-promoted", {
          detail: { driverId, activeRide: nextRide },
        })
      );
    }

    return nextRide;
  }

  /**
   * Cancela apenas a corrida enfileirada se o próximo passageiro desistir
   */
  public cancelQueuedRide(driverId: string, reason: string): boolean {
    const slot = this.getSlot(driverId);
    if (!slot.queuedRide) return false;

    const cancelledId = slot.queuedRide.id;
    slot.queuedRide = null;
    slot.acceptedAt = null;
    this.queuedSlots.set(driverId, slot);
    this.clearStorage(driverId);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:consecutive-ride-cancelled", {
          detail: { driverId, rideId: cancelledId, reason },
        })
      );
    }

    return true;
  }

  private getSlot(driverId: string): QueuedRideSlot {
    const existing = this.queuedSlots.get(driverId);
    if (existing) return existing;

    const newSlot: QueuedRideSlot = {
      driverId,
      activeRideId: "",
      queuedRide: null,
      offeredRide: null,
      offeredAt: null,
      acceptedAt: null,
    };
    this.queuedSlots.set(driverId, newSlot);
    return newSlot;
  }

  private persistToStorage(driverId: string, ride: CorridaPartiu): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`${STORAGE_KEY_QUEUED_RIDE}_${driverId}`, JSON.stringify(ride));
    } catch (err) { silentCatchWarn("driver-consecutive-rides-engine", err); }
  }

  private clearStorage(driverId: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(`${STORAGE_KEY_QUEUED_RIDE}_${driverId}`);
    } catch (err) { silentCatchWarn("driver-consecutive-rides-engine", err); }
  }

  private restoreFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_QUEUED_RIDE)) {
          const driverId = key.replace(`${STORAGE_KEY_QUEUED_RIDE}_`, "");
          const raw = localStorage.getItem(key);
          if (raw) {
            const ride: CorridaPartiu = JSON.parse(raw);
            const slot = this.getSlot(driverId);
            slot.queuedRide = ride;
            this.queuedSlots.set(driverId, slot);
          }
        }
      }
    } catch (err) { silentCatchWarn("driver-consecutive-rides-engine", err); }
  }
}

export const driverConsecutiveRidesEngine = DriverConsecutiveRidesEngine.getInstance();
