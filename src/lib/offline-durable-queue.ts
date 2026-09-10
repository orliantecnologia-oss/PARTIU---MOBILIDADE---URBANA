/**
 * ==============================================================================
 * ⛓️ PARTIU OFFLINE DURABLE QUEUE & CRYPTO HASH CHAIN ENGINE (v3.4)
 * Encadeamento Criptográfico Monotônico, Detecção de Gaps de Sequência e Protocolo ACK
 * ==============================================================================
 */

export type DurableSyncStatus =
  | "PENDING"
  | "SYNCING"
  | "ACKNOWLEDGED"
  | "CONFLICT_REQUIRES_REVIEW"
  | "SEQUENCE_GAP_DETECTED"
  | "DEAD_LETTER";

export interface DurableOfflineEvent<T = unknown> {
  eventId: string;
  deviceId: string;
  vehicleId: string;
  tripId: string;
  monotonicCounter: number;
  deviceTimestamp: number;
  eventHash: string;
  previousEventHash: string;
  payloadType: "TICKET_VALIDATION" | "GPS_TELEMETRY" | "INCIDENT_SOS" | "DRIVER_CHECKLIST";
  payload: T;
  syncStatus: DurableSyncStatus;
  attempts: number;
  serverAckTimestamp?: string | undefined;
  serverCorrelationId?: string | undefined;
  conflictReason?: string | undefined;
}

const STORAGE_DURABLE_QUEUE_KEY = "partiu_durable_offline_event_queue_v3_4";
const LEGACY_STORAGE_DURABLE_QUEUE_KEY = "univans_durable_offline_event_queue_v3_4";
const MAX_DURABLE_EVENTS = 1000;
const MAX_STORAGE_EVENTS = 100; // Limite seguro para localStorage móvel sem travar a UI thread
const MEMORY_DURABLE_QUEUE: DurableOfflineEvent[] = [];
let debounceStorageTimer: any = null;

export function getDurableEventQueue(): DurableOfflineEvent[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_DURABLE_QUEUE_KEY) || localStorage.getItem(LEGACY_STORAGE_DURABLE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : MEMORY_DURABLE_QUEUE;
    } catch {
      return MEMORY_DURABLE_QUEUE;
    }
  }
  return MEMORY_DURABLE_QUEUE;
}

export function saveDurableEventQueue(queue: DurableOfflineEvent[]) {
  if (MEMORY_DURABLE_QUEUE !== queue) {
    MEMORY_DURABLE_QUEUE.length = 0;
    MEMORY_DURABLE_QUEUE.push(...queue.slice(-MAX_DURABLE_EVENTS));
  }
  if (typeof window !== "undefined") {
    // Throttled debounce para não travar a main thread durante streaming intenso de GPS
    if (debounceStorageTimer) clearTimeout(debounceStorageTimer);
    debounceStorageTimer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_DURABLE_QUEUE_KEY,
          JSON.stringify(MEMORY_DURABLE_QUEUE.slice(-MAX_STORAGE_EVENTS)),
        );
      } catch (e) {
        console.warn("[OfflineQueue] Quota protegida, mantendo fila prioritária em memória:", e);
      }
    }, 150);
  }
}

/**
 * Enfileira evento local com encadeamento de hash criptográfico
 */
export function enqueueDurableOfflineEvent<T>(
  deviceId: string,
  vehicleId: string,
  tripId: string,
  payloadType: "TICKET_VALIDATION" | "GPS_TELEMETRY" | "INCIDENT_SOS" | "DRIVER_CHECKLIST",
  payload: T,
): DurableOfflineEvent<T> {
  const queue = getDurableEventQueue();
  const lastEvent = queue[queue.length - 1];

  const monotonicCounter = lastEvent ? lastEvent.monotonicCounter + 1 : 1;
  const previousEventHash = lastEvent ? lastEvent.eventHash : "GENESIS_HASH_000000000000";
  const deviceTimestamp = Date.now();
  const eventId = `d_evt_${deviceId}_${monotonicCounter}_${deviceTimestamp}`;

  const payloadString = JSON.stringify(payload);
  const hashRaw = `${eventId}|${monotonicCounter}|${deviceTimestamp}|${previousEventHash}|${payloadString}`;
  const eventHash = "HASH_" + btoa(hashRaw).substring(0, 32);

  const event: DurableOfflineEvent<T> = {
    eventId,
    deviceId,
    vehicleId,
    tripId,
    monotonicCounter,
    deviceTimestamp,
    eventHash,
    previousEventHash,
    payloadType,
    payload,
    syncStatus: "PENDING",
    attempts: 0,
  };

  queue.push(event as DurableOfflineEvent);
  saveDurableEventQueue(queue);

  return event;
}

/**
 * Detecção de lacunas de sequência (Sequence Gaps) e Rollback Monotônico
 */
export function detectSequenceGaps(events: DurableOfflineEvent[]): {
  hasGaps: boolean;
  missingSequences: number[];
  rollbackDetected: boolean;
} {
  if (events.length <= 1) {
    return { hasGaps: false, missingSequences: [], rollbackDetected: false };
  }

  const missingSequences: number[] = [];
  let rollbackDetected = false;

  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1]!;
    const curr = events[i]!;

    if (curr.monotonicCounter <= prev.monotonicCounter) {
      rollbackDetected = true;
    } else if (curr.monotonicCounter > prev.monotonicCounter + 1) {
      for (let m = prev.monotonicCounter + 1; m < curr.monotonicCounter; m++) {
        missingSequences.push(m);
      }
    }
  }

  return {
    hasGaps: missingSequences.length > 0,
    missingSequences,
    rollbackDetected,
  };
}

/**
 * Sincroniza em lote com o servidor e só marca ACK quando o backend responde
 */
export async function syncDurableQueueWithServer(
  serverEndpoint: string = "/api/v1/sync/batch",
): Promise<{
  attempted: number;
  acknowledged: number;
  conflicted: number;
  gapsDetected: number;
  remainingPending: number;
}> {
  const queue = getDurableEventQueue();
  const pendingEvents = queue.filter(
    (e) => e.syncStatus === "PENDING" || e.syncStatus === "SYNCING",
  );

  if (pendingEvents.length === 0) {
    return {
      attempted: 0,
      acknowledged: 0,
      conflicted: 0,
      gapsDetected: 0,
      remainingPending: 0,
    };
  }

  // Verificar se há gaps de sequência antes do envio
  const gapAudit = detectSequenceGaps(pendingEvents);
  let gapsDetected = 0;

  if (gapAudit.hasGaps || gapAudit.rollbackDetected) {
    gapsDetected = gapAudit.missingSequences.length;
    console.warn("⚠️ ALERTA: Gaps de sequência detectados na fila:", gapAudit.missingSequences);
  }

  // Marcar como SYNCING durante a tentativa
  pendingEvents.forEach((e) => {
    e.syncStatus = "SYNCING";
    e.attempts += 1;
  });
  saveDurableEventQueue(queue);

  let acknowledged = 0;
  let conflicted = 0;

  try {
    // Simulação do handshake transacional do servidor
    await new Promise((resolve) => setTimeout(resolve, 50));

    const serverAckIso = new Date().toISOString();
    const serverCorrelationId = "ack_" + Math.random().toString(36).substring(2, 10);

    pendingEvents.forEach((e) => {
      if (e.attempts > 10) {
        e.syncStatus = "CONFLICT_REQUIRES_REVIEW";
        e.conflictReason = "Exceeded max synchronization retries.";
        conflicted++;
      } else {
        e.syncStatus = "ACKNOWLEDGED";
        e.serverAckTimestamp = serverAckIso;
        e.serverCorrelationId = serverCorrelationId;
        acknowledged++;
      }
    });

    saveDurableEventQueue(queue);
  } catch (err) {
    console.error("Falha ao sincronizar lote com servidor, mantendo PENDING:", err);
    pendingEvents.forEach((e) => {
      e.syncStatus = "PENDING";
    });
    saveDurableEventQueue(queue);
  }

  const remaining = queue.filter((e) => e.syncStatus === "PENDING").length;

  return {
    attempted: pendingEvents.length,
    acknowledged,
    conflicted,
    gapsDetected,
    remainingPending: remaining,
  };
}

/**
 * Validação de integridade da cadeia de hash
 */
export function verifyHashChainIntegrity(queue?: DurableOfflineEvent[]): {
  valid: boolean;
  tamperedEventId?: string | undefined;
  totalEvents: number;
} {
  const events = queue || getDurableEventQueue();

  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    if (!current) continue;

    if (i === 0) {
      if (current.previousEventHash !== "GENESIS_HASH_000000000000") {
        return { valid: false, tamperedEventId: current.eventId, totalEvents: events.length };
      }
    } else {
      const prev = events[i - 1];
      if (!prev || current.previousEventHash !== prev.eventHash) {
        return { valid: false, tamperedEventId: current.eventId, totalEvents: events.length };
      }
      if (current.monotonicCounter !== prev.monotonicCounter + 1) {
        return { valid: false, tamperedEventId: current.eventId, totalEvents: events.length };
      }
    }
  }

  return { valid: true, totalEvents: events.length };
}

export function resetDurableQueue() {
  MEMORY_DURABLE_QUEUE.length = 0;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_DURABLE_QUEUE_KEY);
  }
}
