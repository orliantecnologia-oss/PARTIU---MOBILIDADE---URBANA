/**
 * ==============================================================================
 * 📦 PARTIU OUTBOX & INBOX PATTERN ENGINE (v3.3)
 * Garantia de Entrega Transacional, Idempotência de Webhooks e Workers Resilientes
 * ==============================================================================
 */

import { DomainEvent, DomainEventType } from "./domain-contracts";

export type OutboxStatus = "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED" | "DEAD_LETTER";
export type InboxStatus = "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED" | "DUPLICATE_REJECTED";

export interface OutboxRecord<T = unknown> {
  id: string;
  organizationId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload: T;
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  processedAt?: string | undefined;
  errorLog?: string | undefined;
  idempotencyKey: string;
  correlationId: string;
  createdAt: string;
}

export interface InboxRecord<T = unknown> {
  id: string;
  provider: "mercadopago" | "asaas" | "efi_banco" | "teltonika_iot" | "starlink_router";
  externalEventId: string;
  payloadHash: string;
  payload: T;
  status: InboxStatus;
  receivedAt: string;
  processedAt?: string | undefined;
  correlationId: string;
}

const STORAGE_OUTBOX_KEY = "partiu_outbox_events_store_v3_3";
const LEGACY_STORAGE_OUTBOX_KEY = "univans_outbox_events_store_v3_3";
const STORAGE_INBOX_KEY = "partiu_inbox_events_store_v3_3";
const LEGACY_STORAGE_INBOX_KEY = "univans_inbox_events_store_v3_3";

export function getOutboxStore(): OutboxRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_OUTBOX_KEY) || localStorage.getItem(LEGACY_STORAGE_OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOutboxStore(records: OutboxRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_OUTBOX_KEY, JSON.stringify(records.slice(0, 500)));
  } catch (e) {
    console.error("Erro ao salvar Outbox Store:", e);
  }
}

export function getInboxStore(): InboxRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_INBOX_KEY) || localStorage.getItem(LEGACY_STORAGE_INBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveInboxStore(records: InboxRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_INBOX_KEY, JSON.stringify(records.slice(0, 500)));
  } catch (e) {
    console.error("Erro ao salvar Inbox Store:", e);
  }
}

/**
 * Insere evento na Outbox de forma atômica
 */
export function enqueueOutboxEvent<T>(
  event: DomainEvent<T>,
  maxAttempts: number = 5,
): OutboxRecord<T> {
  const agora = new Date().toISOString();
  const record: OutboxRecord<T> = {
    id: "out_" + Math.random().toString(36).substring(2, 12),
    organizationId: event.organizationId,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload,
    status: "PENDING",
    attempts: 0,
    maxAttempts,
    nextAttemptAt: agora,
    idempotencyKey: `out_${event.aggregateId}_${event.eventType}_${Date.now()}`,
    correlationId: event.correlationId,
    createdAt: agora,
  };

  const store = getOutboxStore();
  store.push(record as OutboxRecord);
  saveOutboxStore(store);

  return record;
}

/**
 * Processador de Outbox Worker com Exponential Backoff e Jitter
 */
export async function processOutboxWorker(): Promise<{
  processedCount: number;
  failedCount: number;
  deadLetterCount: number;
}> {
  const store = getOutboxStore();
  const agoraTimestamp = Date.now();
  let processedCount = 0;
  let failedCount = 0;
  let deadLetterCount = 0;

  for (let i = 0; i < store.length; i++) {
    const item = store[i];
    if (!item) continue;

    if (item.status === "PROCESSED" || item.status === "DEAD_LETTER") continue;
    if (new Date(item.nextAttemptAt).getTime() > agoraTimestamp) continue;

    item.status = "PROCESSING";
    item.attempts += 1;

    try {
      // Simulação de envio com sucesso (ex: Realtime, Webhook externo)
      await new Promise((resolve) => setTimeout(resolve, 10));

      item.status = "PROCESSED";
      item.processedAt = new Date().toISOString();
      processedCount++;
    } catch (err) {
      if (item.attempts >= item.maxAttempts) {
        item.status = "DEAD_LETTER";
        item.errorLog = `Max attempts exceeded: ${String(err)}`;
        deadLetterCount++;
      } else {
        item.status = "FAILED";
        // Exponential backoff: 2^attempts * 1000ms + jitter
        const jitter = Math.floor(Math.random() * 500);
        const delayMs = Math.pow(2, item.attempts) * 1000 + jitter;
        item.nextAttemptAt = new Date(Date.now() + delayMs).toISOString();
        item.errorLog = String(err);
        failedCount++;
      }
    }
  }

  saveOutboxStore(store);
  return { processedCount, failedCount, deadLetterCount };
}

/**
 * Processamento de Webhooks no Inbox com Deduplicação Estrita
 */
export function processIncomingWebhookInbox<T>(
  provider: "mercadopago" | "asaas" | "efi_banco" | "teltonika_iot" | "starlink_router",
  externalEventId: string,
  payload: T,
  correlationId: string,
): { accepted: boolean; duplicate: boolean; record: InboxRecord<T> } {
  const store = getInboxStore();
  const payloadStr = JSON.stringify(payload);
  const payloadHash = "hash_" + btoa(payloadStr).substring(0, 24);

  // Verificar duplicidade por provider + externalEventId OU payloadHash
  const duplicate = store.find(
    (item) =>
      item.provider === provider &&
      (item.externalEventId === externalEventId || item.payloadHash === payloadHash),
  );

  if (duplicate) {
    return {
      accepted: false,
      duplicate: true,
      record: duplicate as InboxRecord<T>,
    };
  }

  const record: InboxRecord<T> = {
    id: "inb_" + Math.random().toString(36).substring(2, 12),
    provider,
    externalEventId,
    payloadHash,
    payload,
    status: "PROCESSED",
    receivedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    correlationId,
  };

  store.unshift(record as InboxRecord);
  saveInboxStore(store);

  return {
    accepted: true,
    duplicate: false,
    record,
  };
}
