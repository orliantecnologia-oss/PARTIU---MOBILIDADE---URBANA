/**
 * PARTIU TITANIUM SHIELD — DISTRIBUTED TRACING ENGINE (W3C TRACECONTEXT)
 * 
 * Implementação do padrão W3C TraceContext:
 * traceparent: 00-{trace_id}-{span_id}-{trace_flags}
 * Permite correlação de chamadas ponta-a-ponta entre cliente, edge, banco e gateways.
 */

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string | undefined;
  name: string;
  startTime: number;
  endTime?: number | undefined;
  durationMs?: number | undefined;
  attributes: Record<string, string | number | boolean>;
  status: 'OK' | 'ERROR';
}

function randomHex(length: number): string {
  let hex = '';
  while (hex.length < length) {
    hex += Math.random().toString(16).substring(2);
  }
  return hex.substring(0, length);
}

export class TracingEngine {
  private static instance: TracingEngine;
  private activeSpans: Map<string, Span> = new Map();
  private completedSpans: Span[] = [];

  private constructor() {}

  public static getInstance(): TracingEngine {
    if (!TracingEngine.instance) {
      TracingEngine.instance = new TracingEngine();
    }
    return TracingEngine.instance;
  }

  /**
   * Inicia um novo span com suporte a rastreamento distribuído
   */
  public startSpan(name: string, parentTraceparent?: string): { span: Span; traceparent: string } {
    let traceId = randomHex(32);
    let parentSpanId: string | undefined = undefined;

    if (parentTraceparent && parentTraceparent.startsWith('00-')) {
      const parts = parentTraceparent.split('-');
      if (parts.length >= 4) {
        traceId = parts[1] ?? traceId;
        parentSpanId = parts[2];
      }
    }

    const spanId = randomHex(16);
    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      startTime: Date.now(),
      attributes: {},
      status: 'OK'
    };

    this.activeSpans.set(spanId, span);
    const traceparent = `00-${traceId}-${spanId}-01`;

    return { span, traceparent };
  }

  /**
   * Finaliza o span e calcula a duração
   */
  public endSpan(spanId: string, status: 'OK' | 'ERROR' = 'OK'): Span | undefined {
    const span = this.activeSpans.get(spanId);
    if (!span) return undefined;

    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    span.status = status;

    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);

    if (this.completedSpans.length > 1000) {
      this.completedSpans.shift();
    }

    return span;
  }

  public getRecentSpans(limit = 50): Span[] {
    return this.completedSpans.slice(-limit);
  }
}

export const tracingEngine = TracingEngine.getInstance();
