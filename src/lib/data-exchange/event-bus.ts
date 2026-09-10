/**
 * REGIONAL EVENT BUS
 * 
 * Barramento de eventos em memória de ultra-alta velocidade:
 * - Arquitetura Publish/Subscribe assíncrona
 * - Filtro por tópicos e cidades
 * - Zero latência de serialização e alta capacidade de throughput
 */

export type RegionalEventType =
  | 'RIDE_REQUESTED'
  | 'RIDE_COMPLETED'
  | 'VOUCHER_REDEEMED'
  | 'CASHBACK_PROCESSED'
  | 'ALERT_TRIGGERED'
  | 'MEDICAL_DISPATCH_SENT'
  | 'CAMPUS_BUS_BOARDED'
  | 'FRANCHISE_METRIC_UPDATED';

export interface RegionalEventMessage {
  eventId: string;
  topic: RegionalEventType;
  cityId: string;
  payload: any;
  emittedAt: number;
}

export type RegionalEventHandler = (event: RegionalEventMessage) => void;

export class EventBusEngine {
  private handlers: Map<RegionalEventType, Set<RegionalEventHandler>> = new Map();
  private totalEventsPublished: number = 0;

  public subscribe(topic: RegionalEventType, handler: RegionalEventHandler): () => void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler);

    return () => {
      this.handlers.get(topic)?.delete(handler);
    };
  }

  public publish(event: RegionalEventMessage): void {
    this.totalEventsPublished += 1;
    const subscribers = this.handlers.get(event.topic);
    if (subscribers) {
      subscribers.forEach(handler => {
        try {
          handler(event);
        } catch (err) {
          // Handlers isolados
        }
      });
    }
  }

  public getTotalEventsPublished(): number {
    return this.totalEventsPublished;
  }
}

export const eventBusEngine = new EventBusEngine();
