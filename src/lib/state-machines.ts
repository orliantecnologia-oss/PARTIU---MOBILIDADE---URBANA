/**
 * ==============================================================================
 * 🔄 PARTIU ENTERPRISE STATE MACHINES (v3.3)
 * Máquinas de Estado Formais para Trip, Ride, Ticket, Passenger, Device, Vehicle, Payment
 * ==============================================================================
 */

import { DomainError, createDomainError } from "./domain-contracts";

export interface StateTransitionResult<S> {
  success: boolean;
  fromState: S;
  toState: S;
  actor: string;
  timestamp: string;
  reason?: string | undefined;
  error?: DomainError | undefined;
}

// -----------------------------------------------------------------------------
// 1. TRIP STATE MACHINE
// -----------------------------------------------------------------------------
export type TripState =
  | "DRAFT"
  | "SCHEDULED"
  | "BOARDING"
  | "IN_PROGRESS"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "INTERRUPTED"
  | "EMERGENCY";

const TRIP_TRANSITIONS: Record<TripState, TripState[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["BOARDING", "CANCELLED"],
  BOARDING: ["IN_PROGRESS", "CANCELLED", "EMERGENCY"],
  IN_PROGRESS: ["PAUSED", "COMPLETED", "INTERRUPTED", "EMERGENCY"],
  PAUSED: ["IN_PROGRESS", "INTERRUPTED", "EMERGENCY"],
  COMPLETED: [],
  CANCELLED: [],
  INTERRUPTED: ["SCHEDULED", "CANCELLED"],
  EMERGENCY: ["INTERRUPTED", "CANCELLED", "COMPLETED"],
};

export function transitionTripState(
  currentState: TripState,
  targetState: TripState,
  actor: string,
  reason?: string,
): StateTransitionResult<TripState> {
  const allowed = TRIP_TRANSITIONS[currentState] || [];
  if (!allowed.includes(targetState)) {
    return {
      success: false,
      fromState: currentState,
      toState: currentState,
      actor,
      timestamp: new Date().toISOString(),
      reason,
      error: createDomainError(
        "TRIP_NOT_ACTIVE",
        `Transição de viagem inválida: '${currentState}' para '${targetState}'. Permitidas: [${allowed.join(", ")}]`,
      ),
    };
  }

  return {
    success: true,
    fromState: currentState,
    toState: targetState,
    actor,
    timestamp: new Date().toISOString(),
    reason,
  };
}

// -----------------------------------------------------------------------------
// 2. TICKET STATE MACHINE
// -----------------------------------------------------------------------------
export type TicketState =
  | "CREATED"
  | "PAID"
  | "ACTIVE"
  | "VALIDATED"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED"
  | "CONFLICTED"
  | "REJECTED";

const TICKET_TRANSITIONS: Record<TicketState, TicketState[]> = {
  CREATED: ["PAID", "CANCELLED", "EXPIRED"],
  PAID: ["ACTIVE", "REFUNDED", "CANCELLED"],
  ACTIVE: ["VALIDATED", "EXPIRED", "CANCELLED", "REFUNDED", "CONFLICTED"],
  VALIDATED: ["COMPLETED", "CONFLICTED", "REJECTED"],
  COMPLETED: [],
  EXPIRED: [],
  CANCELLED: [],
  REFUNDED: [],
  CONFLICTED: ["VALIDATED", "REJECTED"],
  REJECTED: [],
};

export function transitionTicketState(
  currentState: TicketState,
  targetState: TicketState,
  actor: string,
  reason?: string,
): StateTransitionResult<TicketState> {
  const allowed = TICKET_TRANSITIONS[currentState] || [];
  if (!allowed.includes(targetState)) {
    return {
      success: false,
      fromState: currentState,
      toState: currentState,
      actor,
      timestamp: new Date().toISOString(),
      reason,
      error: createDomainError(
        targetState === "VALIDATED" && currentState === "VALIDATED"
          ? "TICKET_ALREADY_USED"
          : "TICKET_EXPIRED",
        `Transição de bilhete inválida: '${currentState}' para '${targetState}'.`,
      ),
    };
  }

  return {
    success: true,
    fromState: currentState,
    toState: targetState,
    actor,
    timestamp: new Date().toISOString(),
    reason,
  };
}

// -----------------------------------------------------------------------------
// 3. PASSENGER STATE MACHINE
// -----------------------------------------------------------------------------
export type PassengerState =
  "EXPECTED" | "WAITING" | "BOARDED" | "NO_SHOW" | "CANCELLED" | "REJECTED";

const PASSENGER_TRANSITIONS: Record<PassengerState, PassengerState[]> = {
  EXPECTED: ["WAITING", "BOARDED", "NO_SHOW", "CANCELLED"],
  WAITING: ["BOARDED", "NO_SHOW", "CANCELLED", "REJECTED"],
  BOARDED: [],
  NO_SHOW: ["WAITING"],
  CANCELLED: [],
  REJECTED: [],
};

export function transitionPassengerState(
  currentState: PassengerState,
  targetState: PassengerState,
  actor: string,
  reason?: string,
): StateTransitionResult<PassengerState> {
  const allowed = PASSENGER_TRANSITIONS[currentState] || [];
  if (!allowed.includes(targetState)) {
    return {
      success: false,
      fromState: currentState,
      toState: currentState,
      actor,
      timestamp: new Date().toISOString(),
      reason,
      error: createDomainError(
        "FORBIDDEN",
        `Transição de passageiro inválida: '${currentState}' para '${targetState}'.`,
      ),
    };
  }

  return {
    success: true,
    fromState: currentState,
    toState: targetState,
    actor,
    timestamp: new Date().toISOString(),
    reason,
  };
}

// -----------------------------------------------------------------------------
// 4. DEVICE STATE MACHINE
// -----------------------------------------------------------------------------
export type DeviceState =
  "PROVISIONING" | "ACTIVE" | "OFFLINE" | "SUSPENDED" | "REVOKED" | "RETIRED";

const DEVICE_TRANSITIONS: Record<DeviceState, DeviceState[]> = {
  PROVISIONING: ["ACTIVE", "REVOKED"],
  ACTIVE: ["OFFLINE", "SUSPENDED", "REVOKED", "RETIRED"],
  OFFLINE: ["ACTIVE", "SUSPENDED", "REVOKED", "RETIRED"],
  SUSPENDED: ["ACTIVE", "REVOKED", "RETIRED"],
  REVOKED: ["RETIRED"],
  RETIRED: [],
};

export function transitionDeviceState(
  currentState: DeviceState,
  targetState: DeviceState,
  actor: string,
  reason?: string,
): StateTransitionResult<DeviceState> {
  const allowed = DEVICE_TRANSITIONS[currentState] || [];
  if (!allowed.includes(targetState)) {
    return {
      success: false,
      fromState: currentState,
      toState: currentState,
      actor,
      timestamp: new Date().toISOString(),
      reason,
      error: createDomainError(
        "DEVICE_REVOKED",
        `Transição de dispositivo inválida: '${currentState}' para '${targetState}'.`,
      ),
    };
  }

  return {
    success: true,
    fromState: currentState,
    toState: targetState,
    actor,
    timestamp: new Date().toISOString(),
    reason,
  };
}

// -----------------------------------------------------------------------------
// 5. VEHICLE STATE MACHINE
// -----------------------------------------------------------------------------
export type VehicleState =
  | "AVAILABLE"
  | "ASSIGNED"
  | "BOARDING"
  | "IN_SERVICE"
  | "PAUSED"
  | "OFFLINE"
  | "MAINTENANCE"
  | "SUSPENDED"
  | "RETIRED";

const VEHICLE_TRANSITIONS: Record<VehicleState, VehicleState[]> = {
  AVAILABLE: ["ASSIGNED", "MAINTENANCE", "OFFLINE", "SUSPENDED", "RETIRED"],
  ASSIGNED: ["BOARDING", "AVAILABLE", "MAINTENANCE"],
  BOARDING: ["IN_SERVICE", "AVAILABLE", "MAINTENANCE"],
  IN_SERVICE: ["PAUSED", "AVAILABLE", "MAINTENANCE", "OFFLINE"],
  PAUSED: ["IN_SERVICE", "AVAILABLE", "MAINTENANCE"],
  OFFLINE: ["AVAILABLE", "MAINTENANCE"],
  MAINTENANCE: ["AVAILABLE", "RETIRED"],
  SUSPENDED: ["AVAILABLE", "RETIRED"],
  RETIRED: [],
};

export function transitionVehicleState(
  currentState: VehicleState,
  targetState: VehicleState,
  actor: string,
  reason?: string,
): StateTransitionResult<VehicleState> {
  const allowed = VEHICLE_TRANSITIONS[currentState] || [];
  if (!allowed.includes(targetState)) {
    return {
      success: false,
      fromState: currentState,
      toState: currentState,
      actor,
      timestamp: new Date().toISOString(),
      reason,
      error: createDomainError(
        "FORBIDDEN",
        `Transição de veículo inválida: '${currentState}' para '${targetState}'.`,
      ),
    };
  }

  return {
    success: true,
    fromState: currentState,
    toState: targetState,
    actor,
    timestamp: new Date().toISOString(),
    reason,
  };
}

// -----------------------------------------------------------------------------
// 6. PAYMENT STATE MACHINE
// -----------------------------------------------------------------------------
export type PaymentState =
  "CREATED" | "PENDING" | "PAID" | "REFUNDED" | "EXPIRED" | "FAILED" | "CANCELLED";

const PAYMENT_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  CREATED: ["PENDING", "CANCELLED", "EXPIRED"],
  PENDING: ["PAID", "FAILED", "EXPIRED", "CANCELLED"],
  PAID: ["REFUNDED"],
  REFUNDED: [],
  EXPIRED: [],
  FAILED: [],
  CANCELLED: [],
};

export function transitionPaymentState(
  currentState: PaymentState,
  targetState: PaymentState,
  actor: string,
  reason?: string,
): StateTransitionResult<PaymentState> {
  const allowed = PAYMENT_TRANSITIONS[currentState] || [];
  if (!allowed.includes(targetState)) {
    return {
      success: false,
      fromState: currentState,
      toState: currentState,
      actor,
      timestamp: new Date().toISOString(),
      reason,
      error: createDomainError(
        currentState === "PAID" ? "PAYMENT_NOT_CONFIRMED" : "PAYMENT_EXPIRED",
        `Transição de pagamento inválida: '${currentState}' para '${targetState}'.`,
      ),
    };
  }

  return {
    success: true,
    fromState: currentState,
    toState: targetState,
    actor,
    timestamp: new Date().toISOString(),
    reason,
  };
}
