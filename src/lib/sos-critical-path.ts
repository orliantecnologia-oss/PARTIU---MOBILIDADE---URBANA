/**
 * ==============================================================================
 * 🚨 UNIVANS SOS CRITICAL PATH STATE MACHINE & PRIORITY DISPATCH (v4.0)
 * Gestão de Emergências com Alta Prioridade, Trilha de Auditoria e Escalada
 * ==============================================================================
 */

import { DomainError, createDomainError } from "./domain-contracts";
import { enqueueTransactionalOutboxEvent } from "./v4-outbox-eventbus";

export type SOSStatus =
  "CREATED" | "ACKNOWLEDGED" | "DISPATCHED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";

export interface SOSIncidentRecord {
  id: string;
  tenantId: string;
  vehicleId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  type: "MECHANICAL" | "MEDICAL" | "ACCIDENT" | "SECURITY";
  description: string;
  status: SOSStatus;
  priority: "CRITICAL";
  actorId: string;
  correlationId: string;
  createdAt: string;
  acknowledgedAt?: string | undefined;
  dispatchedAt?: string | undefined;
  resolvedAt?: string | undefined;
  resolutionNotes?: string | undefined;
}

const SOS_STORE = new Map<string, SOSIncidentRecord>();

const VALID_SOS_TRANSITIONS: Record<SOSStatus, SOSStatus[]> = {
  CREATED: ["ACKNOWLEDGED", "CANCELLED"],
  ACKNOWLEDGED: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: [],
  CANCELLED: [],
};

/**
 * Cria incidente de SOS com prioridade máxima e disparo de Outbox Event
 */
export function createSOSIncident(
  tenantId: string,
  vehicleId: string,
  driverId: string,
  latitude: number,
  longitude: number,
  type: "MECHANICAL" | "MEDICAL" | "ACCIDENT" | "SECURITY",
  description: string,
  correlationId: string,
): SOSIncidentRecord {
  const agora = new Date().toISOString();
  const id = `sos_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const incident: SOSIncidentRecord = {
    id,
    tenantId,
    vehicleId,
    driverId,
    latitude,
    longitude,
    type,
    description,
    status: "CREATED",
    priority: "CRITICAL",
    actorId: driverId,
    correlationId,
    createdAt: agora,
  };

  SOS_STORE.set(id, incident);

  // Enfileira evento prioritário no Transactional Outbox
  enqueueTransactionalOutboxEvent(
    tenantId,
    "SOS",
    id,
    "SOSCreated",
    1,
    incident,
    correlationId,
    undefined,
    { priority: "CRITICAL" },
  );

  return incident;
}

/**
 * Transiciona estado do incidente de SOS
 */
export function transitionSOSState(
  incidentId: string,
  targetState: SOSStatus,
  actorId: string,
  notes?: string,
): { success: boolean; incident?: SOSIncidentRecord | undefined; error?: DomainError | undefined } {
  const incident = SOS_STORE.get(incidentId);

  if (!incident) {
    return {
      success: false,
      error: createDomainError(
        "RESOURCE_NOT_FOUND",
        `Incidente SOS '${incidentId}' não encontrado.`,
      ),
    };
  }

  const allowed = VALID_SOS_TRANSITIONS[incident.status];
  if (!allowed.includes(targetState)) {
    return {
      success: false,
      error: createDomainError(
        "INVALID_STATE_TRANSITION",
        `Transição ilegal de SOS: '${incident.status}' -> '${targetState}'.`,
        { currentStatus: incident.status, targetState },
      ),
    };
  }

  const agora = new Date().toISOString();
  incident.status = targetState;

  if (targetState === "ACKNOWLEDGED") incident.acknowledgedAt = agora;
  if (targetState === "DISPATCHED") incident.dispatchedAt = agora;
  if (targetState === "RESOLVED") {
    incident.resolvedAt = agora;
    if (notes) incident.resolutionNotes = notes;
  }

  SOS_STORE.set(incidentId, incident);

  enqueueTransactionalOutboxEvent(
    incident.tenantId,
    "SOS",
    incidentId,
    `SOS${targetState.charAt(0) + targetState.slice(1).toLowerCase()}`,
    1,
    { incidentId, status: targetState, actorId, notes, timestamp: agora },
    incident.correlationId,
    undefined,
    { priority: "CRITICAL" },
  );

  return {
    success: true,
    incident,
  };
}

export function resetSOSStore() {
  SOS_STORE.clear();
}
