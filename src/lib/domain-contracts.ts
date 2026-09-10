/**
 * ==============================================================================
 * 📑 PARTIU MOBILIDADE URBANA & ENTREGAS — DOMAIN CONTRACTS (v3.2)
 * Catálogo de Códigos de Erro, Source of Truth Matrix e Contratos de Eventos
 * ==============================================================================
 */

// 1. CÓDIGOS DE ERRO DE DOMÍNIO PADRONIZADOS
export type DomainErrorCode =
  | "AUTH_INVALID"
  | "FORBIDDEN"
  | "TENANT_ACCESS_DENIED"
  | "TICKET_EXPIRED"
  | "TICKET_ALREADY_USED"
  | "TICKET_SIGNATURE_INVALID"
  | "TICKET_TRIP_MISMATCH"
  | "TICKET_CONFLICT"
  | "PAYMENT_NOT_CONFIRMED"
  | "PAYMENT_EXPIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "DEVICE_REVOKED"
  | "DEVICE_NOT_REGISTERED"
  | "DEVICE_CLOCK_DRIFT"
  | "TRIP_NOT_ACTIVE"
  | "GEOFENCE_VIOLATION"
  | "LEDGER_IMBALANCE"
  | "SYNC_CONFLICT"
  | "RATE_LIMITED"
  | "INVALID_STATE_TRANSITION"
  | "RESOURCE_NOT_FOUND"
  | "INTERNAL_ERROR";

export interface DomainError {
  code: DomainErrorCode;
  message: string;
  details?: Record<string, unknown> | undefined;
  timestamp: string;
  correlationId?: string | undefined;
}

export function createDomainError(
  code: DomainErrorCode,
  message: string,
  details?: Record<string, unknown>,
): DomainError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    correlationId: "corr_" + Math.random().toString(36).substring(2, 10),
  };
}

// 2. SOURCE OF TRUTH MATRIX
export const SOURCE_OF_TRUTH_MATRIX = {
  PAYMENT: "PSP (Gateway) + Backend PARTIU",
  TICKET: "Backend PARTIU (PostgreSQL Database)",
  OFFLINE_VALIDATION: "Primária: Dispositivo Autorizado | Definitiva: Backend após Sincronização",
  GPS_TELEMETRY: "Primária: Dispositivo/IoT Autorizado | Persistência: PostGIS",
  TRIP_STATUS: "Backend PARTIU (State Machine)",
  VEHICLE_STATE: "Backend PARTIU + Eventos de Telemetria",
  FINANCIAL_LEDGER: "Ledger Financeiro Imutável (Double-Entry Journal)",
  USER_IDENTITY: "Supabase Auth / Sistema de Identidade",
  AUTHORIZATION: "RBAC Multi-Tenant Engine (Row Level Security)",
  AUDIT: "audit_logs Imutáveis",
} as const;

// 3. CONTRATOS DE EVENTOS DE DOMÍNIO
export type DomainEventType =
  | "trip.created"
  | "trip.started"
  | "trip.completed"
  | "vehicle.location.updated"
  | "vehicle.geofence.entered"
  | "vehicle.geofence.exited"
  | "ticket.issued"
  | "ticket.validated"
  | "ticket.validation.conflict"
  | "payment.created"
  | "payment.paid"
  | "payment.failed"
  | "incident.created"
  | "incident.resolved"
  | "device.heartbeat"
  | "device.revoked"
  | "settlement.created";

export interface DomainEvent<T = unknown> {
  eventId: string;
  eventType: DomainEventType;
  version: string;
  occurredAt: string;
  producer: string;
  organizationId: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  payload: T;
  metadata?: Record<string, unknown> | undefined;
}

export function createDomainEvent<T>(
  eventType: DomainEventType,
  organizationId: string,
  aggregateType: string,
  aggregateId: string,
  payload: T,
): DomainEvent<T> {
  return {
    eventId: "evt_" + Math.random().toString(36).substring(2, 12),
    eventType,
    version: "3.2.0",
    occurredAt: new Date().toISOString(),
    producer: "partiu-core-backend",
    organizationId,
    aggregateType,
    aggregateId,
    correlationId: "corr_" + Math.random().toString(36).substring(2, 10),
    payload,
  };
}

// 4. ESTADOS FORMAIS DE ENTIDADES
export type TicketState =
  | "CREATED"
  | "PAID"
  | "ISSUED"
  | "VALIDATED"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED"
  | "REJECTED";
export type PaymentState =
  "CREATED" | "PENDING" | "PAID" | "EXPIRED" | "FAILED" | "CANCELLED" | "REFUNDED";
export type TripState =
  "PLANNED" | "BOARDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "SUSPENDED" | "EMERGENCY";
export type VehicleState =
  "AVAILABLE" | "ASSIGNED" | "IN_SERVICE" | "OUT_OF_SERVICE" | "MAINTENANCE";
export type IncidentState = "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type DeviceState =
  "PROVISIONING" | "ACTIVE" | "OFFLINE" | "SUSPENDED" | "REVOKED" | "RETIRED";
export type BoardingPassengerState =
  "EXPECTED" | "WAITING" | "BOARDED" | "NO_SHOW" | "CANCELLED" | "REJECTED";
