/**
 * ==============================================================================
 * ⚙️ OUTBOX WORKER ENGINE (SERVER-SIDE) — ENTERPRISE V6.0
 * Processamento assíncrono idempotente com retry exponencial e Dead-Letter Queue (DLQ)
 * Executa exclusivamente no backend / workers de background.
 * ==============================================================================
 */

export interface OutboxProcessResult {
  processed: number;
  published: number;
  failed: number;
  deadLetters: number;
  details: Array<{ id: string; eventType: string; status: string; error?: string }>;
}

export type OutboxEventHandler = (payload: any, eventType: string) => Promise<void>;

const EVENT_HANDLERS = new Map<string, OutboxEventHandler[]>();

export function registerServerEventHandler(eventType: string, handler: OutboxEventHandler): void {
  const existing = EVENT_HANDLERS.get(eventType) || [];
  existing.push(handler);
  EVENT_HANDLERS.set(eventType, existing);
}

/**
 * Calcula o backoff exponencial em milissegundos para retentativas de eventos
 * Fórmula: baseMs * (2 ^ tentativa) com teto máximo
 */
export function calculateExponentialBackoffMs(
  attempt: number,
  baseMs = 1000,
  maxMs = 300000,
): number {
  const delay = baseMs * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(delay, maxMs);
}

/**
 * Ciclo principal de consumo da Outbox no servidor
 */
export async function runOutboxWorkerBatch(
  mockEventsProvider?: any[],
  dlqSink?: any[],
): Promise<OutboxProcessResult> {
  const result: OutboxProcessResult = {
    processed: 0,
    published: 0,
    failed: 0,
    deadLetters: 0,
    details: [],
  };

  // 1. Obter lote de eventos pendentes ou com falha temporária
  let events: any[] = [];
  if (mockEventsProvider) {
    events = mockEventsProvider.filter(
      (e) =>
        e.status === "PENDING" || (e.status === "FAILED" && e.retry_count < (e.max_retries || 5)),
    );
  }

  for (const event of events) {
    result.processed++;
    event.status = "PROCESSING";
    event.retry_count = (event.retry_count || 0) + 1;

    try {
      const handlers = EVENT_HANDLERS.get(event.event_type);
      if (!handlers || handlers.length === 0) {
        throw new Error(`Nenhum consumidor registrado para o evento '${event.event_type}'`);
      }
      for (const handler of handlers) {
        await handler(event.payload, event.event_type);
      }

      event.status = "PUBLISHED";
      event.published_at = new Date().toISOString();
      result.published++;
      result.details.push({ id: event.id, eventType: event.event_type, status: "PUBLISHED" });
    } catch (err: any) {
      const errorMessage = err?.message || "Falha desconhecida no consumidor";
      event.last_error = errorMessage;

      if (event.retry_count >= (event.max_retries || 5)) {
        // Excedeu o limite: despacha para a Dead Letter Queue (DLQ)
        event.status = "DEAD_LETTER";
        result.deadLetters++;

        const dlqItem = {
          id: `dlq_${Date.now()}_${result.deadLetters}`,
          outbox_id: event.id,
          event_type: event.event_type,
          payload: event.payload,
          error_message: errorMessage,
          failed_at: new Date().toISOString(),
        };

        if (dlqSink) dlqSink.push(dlqItem);
        result.details.push({
          id: event.id,
          eventType: event.event_type,
          status: "DEAD_LETTER",
          error: errorMessage,
        });
      } else {
        // Falha temporária: marca como FAILED com agendamento de retry
        event.status = "FAILED";
        result.failed++;
        const nextRetryMs = calculateExponentialBackoffMs(event.retry_count);
        result.details.push({
          id: event.id,
          eventType: event.event_type,
          status: "FAILED",
          error: `${errorMessage} (Próximo retry em ${nextRetryMs}ms)`,
        });
      }
    }
  }

  return result;
}
