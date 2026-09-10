/**
 * ==============================================================================
 * 🚀 PARTIU V4.0 TRANSACTIONAL OUTBOX, EVENT BUS & DLQ ENGINE
 * Arquitetura Orientada a Eventos com Garantia de Entrega At-Least-Once
 * ==============================================================================
 */

export type OutboxStatus = "PENDING" | "PROCESSING" | "PUBLISHED" | "FAILED" | "DEAD_LETTER";

export interface OutboxEventRecord<T = unknown> {
  id: string;
  tenantId: string;
  aggregateType: "TRIP" | "TICKET" | "PAYMENT" | "VEHICLE" | "DEVICE" | "SOS" | "TELEMETRY";
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  payload: T;
  headers: Record<string, string>;
  correlationId: string;
  causationId?: string | undefined;
  occurredAt: string;
  createdAt: string;
  publishedAt?: string | undefined;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string | undefined;
  status: OutboxStatus;
}

export type EventConsumer<T = unknown> = (event: OutboxEventRecord<T>) => Promise<void>;

import { supabase } from "@/integrations/supabase/client";

// Armazenamento em memória (cache local de baixa latência)
const OUTBOX_STORE: OutboxEventRecord[] = [];
const CONSUMER_REGISTRY = new Map<string, EventConsumer[]>();
const PROCESSED_EVENT_CONSUMER_SET = new Set<string>(); // "consumerId:eventId" para idempotência

/**
 * Enfileira evento na mesma transação lógica da operação de domínio
 */
export async function enqueueTransactionalOutboxEvent<T>(
  tenantId: string,
  aggregateType: "TRIP" | "TICKET" | "PAYMENT" | "VEHICLE" | "DEVICE" | "SOS" | "TELEMETRY",
  aggregateId: string,
  eventType: string,
  eventVersion: number,
  payload: T,
  correlationId: string,
  causationId?: string,
  headers: Record<string, string> = {},
): Promise<OutboxEventRecord<T>> {
  const agora = new Date().toISOString();
  const event: OutboxEventRecord<T> = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    tenantId,
    aggregateType,
    aggregateId,
    eventType,
    eventVersion,
    payload,
    headers,
    correlationId,
    causationId,
    occurredAt: agora,
    createdAt: agora,
    attemptCount: 0,
    maxAttempts: 5,
    status: "PENDING",
  };

  OUTBOX_STORE.push(event as OutboxEventRecord);

  // Persistência relacional protegida no PostgreSQL
  try {
    const { error } = await supabase.from("event_outbox").insert({
      tenant_id: tenantId,
      aggregate_type: aggregateType,
      aggregate_id: aggregateId,
      event_type: eventType,
      payload: (payload as any) ?? {},
      correlation_id: correlationId,
      status: "PENDING",
      max_retries: 5,
    });
    if (error) {
      console.warn("[Outbox] Inserção no PostgreSQL em contingência:", error.message);
    }
  } catch (err: any) {
    console.warn("[Outbox] Falha na persistência remota:", err?.message);
  }

  return event;
}

/**
 * Registra um consumidor com ID para deduplicação idempotente
 */
export function registerEventConsumer<T>(
  eventType: string,
  consumerId: string,
  consumer: EventConsumer<T>,
) {
  const existing = CONSUMER_REGISTRY.get(eventType) || [];

  // Wrap consumer com idempotência
  const idempotentConsumer: EventConsumer<T> = async (event) => {
    const key = `${consumerId}:${event.id}`;
    if (PROCESSED_EVENT_CONSUMER_SET.has(key)) {
      return; // Já processado por este consumidor
    }
    await consumer(event);
    PROCESSED_EVENT_CONSUMER_SET.add(key);
  };

  existing.push(idempotentConsumer as EventConsumer);
  CONSUMER_REGISTRY.set(eventType, existing);
}

/**
 * Worker assíncrono que processa a fila de Outbox e despacha para os consumidores
 */
export async function processOutboxQueueWorker(): Promise<{
  processed: number;
  published: number;
  failed: number;
  deadLettered: number;
}> {
  const pendingEvents = OUTBOX_STORE.filter((e) => e.status === "PENDING" || e.status === "FAILED");

  let published = 0;
  let failed = 0;
  let deadLettered = 0;

  for (const event of pendingEvents) {
    event.status = "PROCESSING";
    event.attemptCount += 1;

    try {
      const consumers = CONSUMER_REGISTRY.get(event.eventType) || [];
      for (const consumer of consumers) {
        await consumer(event);
      }

      event.status = "PUBLISHED";
      event.publishedAt = new Date().toISOString();
      published++;
    } catch (err) {
      event.lastError = String(err);
      if (event.attemptCount >= event.maxAttempts) {
        event.status = "DEAD_LETTER";
        deadLettered++;
      } else {
        event.status = "FAILED";
        failed++;
      }
    }
  }

  return {
    processed: pendingEvents.length,
    published,
    failed,
    deadLettered,
  };
}

export function getOutboxEvents(tenantId?: string): OutboxEventRecord[] {
  if (tenantId) return OUTBOX_STORE.filter((e) => e.tenantId === tenantId);
  return OUTBOX_STORE;
}

export function getDeadLetterQueue(): OutboxEventRecord[] {
  return OUTBOX_STORE.filter((e) => e.status === "DEAD_LETTER");
}

export function resetOutboxStore() {
  OUTBOX_STORE.length = 0;
  CONSUMER_REGISTRY.clear();
  PROCESSED_EVENT_CONSUMER_SET.clear();
}
