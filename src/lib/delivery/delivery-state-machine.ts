/**
 * ==============================================================================
 * ⚙️ PARTIU DELIVERY OS — SERVER-AUTHORITATIVE STATE MACHINE (v1.0)
 * ==============================================================================
 * Máquina de estados finita formal para entregas e logística last-mile.
 * Implementa 17 estados nominais e 13 estados de exceção / logística reversa.
 * Impede transições arbitrárias e registra auditoria imutável por transição.
 * ==============================================================================
 */

import { DeliveryState } from "./delivery-domain";

export class InvalidDeliveryStateTransitionError extends Error {
  constructor(
    public readonly currentState: DeliveryState,
    public readonly targetState: DeliveryState,
    public readonly reason: string
  ) {
    super(
      `TRANSIÇÃO_DE_ENTREGA_INVÁLIDA: Não é permitido mover entrega de [${currentState}] para [${targetState}]. Razão: ${reason}`
    );
    this.name = "InvalidDeliveryStateTransitionError";
  }
}

export interface DeliveryTransitionAuditLog {
  id: string;
  deliveryId: string;
  fromState: DeliveryState;
  toState: DeliveryState;
  timestamp: number;
  actor: "SYSTEM" | "DRIVER" | "SENDER" | "RECIPIENT" | "ADMIN";
  reason?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export class DeliveryStateMachine {
  // Matriz de transições permitidas (Nominais e Exceções)
  private static readonly ALLOWED_TRANSITIONS: Record<DeliveryState, DeliveryState[]> = {
    DRAFT: ["REQUESTED", "CANCELLED"],
    REQUESTED: ["SEARCHING_DRIVER", "CANCELLED", "SYSTEM_ERROR"],
    SEARCHING_DRIVER: ["DRIVER_ASSIGNED", "CANCELLED", "SYSTEM_ERROR"],
    DRIVER_ASSIGNED: ["DRIVER_ACCEPTED", "SEARCHING_DRIVER", "CANCELLED", "DRIVER_CANCELLED"],
    DRIVER_ACCEPTED: ["HEADING_TO_PICKUP", "DRIVER_CANCELLED", "CANCELLED"],
    HEADING_TO_PICKUP: ["ARRIVED_PICKUP", "FAILED_PICKUP", "DRIVER_CANCELLED", "CANCELLED"],
    ARRIVED_PICKUP: [
      "PICKUP_VERIFICATION",
      "PACKAGE_PROBLEM",
      "FAILED_PICKUP",
      "DRIVER_CANCELLED",
      "CANCELLED",
    ],
    PICKUP_VERIFICATION: [
      "PACKAGE_COLLECTED",
      "VERIFICATION_FAILED",
      "PACKAGE_PROBLEM",
      "FAILED_PICKUP",
    ],
    PACKAGE_COLLECTED: ["PICKUP_PROOF", "SYSTEM_ERROR"],
    PICKUP_PROOF: ["IN_TRANSIT", "PACKAGE_PROBLEM"],
    IN_TRANSIT: ["ARRIVED_DROPOFF", "ADDRESS_PROBLEM", "SYSTEM_ERROR"],
    ARRIVED_DROPOFF: [
      "RECIPIENT_VERIFICATION",
      "RECIPIENT_NOT_FOUND",
      "RETURN_REQUIRED",
      "ADDRESS_PROBLEM",
      "SUPPORT_REVIEW",
    ],
    RECIPIENT_VERIFICATION: [
      "DELIVERY_PROOF",
      "RECIPIENT_NOT_FOUND",
      "VERIFICATION_FAILED",
      "RETURN_REQUIRED",
    ],
    DELIVERY_PROOF: ["DELIVERED", "VERIFICATION_FAILED", "SYSTEM_ERROR"],
    DELIVERED: ["PAYMENT_SETTLED", "PAYMENT_FAILED", "COMPLETED"],
    PAYMENT_SETTLED: ["COMPLETED"],
    COMPLETED: [],

    // Estados de Exceção e Logística Reversa
    CANCELLED: [],
    DRIVER_CANCELLED: ["SEARCHING_DRIVER", "CANCELLED"],
    FAILED_PICKUP: ["CANCELLED", "SUPPORT_REVIEW"],
    RECIPIENT_NOT_FOUND: ["RETURN_REQUIRED", "RECIPIENT_VERIFICATION", "SUPPORT_REVIEW"],
    ADDRESS_PROBLEM: ["RECIPIENT_VERIFICATION", "RETURN_REQUIRED", "SUPPORT_REVIEW"],
    PACKAGE_PROBLEM: ["RETURN_REQUIRED", "SUPPORT_REVIEW", "CANCELLED"],
    VERIFICATION_FAILED: ["RECIPIENT_VERIFICATION", "RETURN_REQUIRED", "SUPPORT_REVIEW"],
    RETURN_REQUIRED: ["RETURNING_TO_PICKUP", "SUPPORT_REVIEW"],
    RETURNING_TO_PICKUP: ["RETURNED", "SUPPORT_REVIEW"],
    RETURNED: ["COMPLETED", "SUPPORT_REVIEW"],
    SUPPORT_REVIEW: ["RETURN_REQUIRED", "COMPLETED", "CANCELLED"],
    PAYMENT_FAILED: ["PAYMENT_SETTLED", "SUPPORT_REVIEW"],
    SYSTEM_ERROR: ["SUPPORT_REVIEW", "CANCELLED"],
  };

  private currentStates = new Map<string, DeliveryState>();
  private auditLogs: DeliveryTransitionAuditLog[] = [];

  public getState(deliveryId: string): DeliveryState {
    return this.currentStates.get(deliveryId) || "DRAFT";
  }

  public initDelivery(deliveryId: string, initialState: DeliveryState = "DRAFT"): void {
    this.currentStates.set(deliveryId, initialState);
    this.auditLogs.push({
      id: `DLOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      deliveryId,
      fromState: "DRAFT",
      toState: initialState,
      timestamp: Date.now(),
      actor: "SYSTEM",
      reason: "Inicialização do ciclo de vida da entrega",
    });
  }

  /**
   * Valida e executa uma transição de estado da entrega de forma estrita.
   */
  public transition(
    deliveryId: string,
    targetState: DeliveryState,
    actor: "SYSTEM" | "DRIVER" | "SENDER" | "RECIPIENT" | "ADMIN",
    reason?: string | undefined,
    metadata?: Record<string, unknown> | undefined
  ): DeliveryState {
    const currentState = this.getState(deliveryId);

    // Se já estiver no estado de destino (idempotência), retorna sem erro
    if (currentState === targetState) {
      return currentState;
    }

    const allowed = DeliveryStateMachine.ALLOWED_TRANSITIONS[currentState];
    if (!allowed || !allowed.includes(targetState)) {
      throw new InvalidDeliveryStateTransitionError(
        currentState,
        targetState,
        `Transição não permitida na máquina de estados. Destinos válidos a partir de [${currentState}]: (${
          allowed?.join(", ") || "Nenhum — estado terminal"
        })`
      );
    }

    this.currentStates.set(deliveryId, targetState);

    const logEntry: DeliveryTransitionAuditLog = {
      id: `DLOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      deliveryId,
      fromState: currentState,
      toState: targetState,
      timestamp: Date.now(),
      actor,
      reason,
      metadata,
    };
    this.auditLogs.push(logEntry);

    return targetState;
  }

  /**
   * Retorna os logs de auditoria de uma entrega específica.
   */
  public getAuditHistory(deliveryId: string): DeliveryTransitionAuditLog[] {
    return this.auditLogs.filter((l) => l.deliveryId === deliveryId);
  }
}

export const deliveryStateMachine = new DeliveryStateMachine();
