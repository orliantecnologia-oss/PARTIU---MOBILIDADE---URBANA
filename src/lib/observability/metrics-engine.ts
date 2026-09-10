/**
 * PARTIU TITANIUM SHIELD — SRE METRICS ENGINE
 * 
 * Coleta contínua de telemetria e cálculo de percentis (p50, p95, p99):
 * - Dispatch Latency (Meta: < 200ms)
 * - PIX Settlement Latency (Meta: < 500ms)
 * - Wallet Balance Latency (Meta: < 100ms)
 * - API p95 Latency (Meta: < 300ms)
 * - Realtime Sync Latency (Meta: < 100ms)
 */

export interface LatencySample {
  metricName: string;
  durationMs: number;
  timestamp: number;
  success: boolean;
}

export interface MetricSummary {
  metricName: string;
  count: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorRatePct: number;
  slaCompliant: boolean;
  targetSlaMs: number;
}

export class MetricsEngine {
  private static instance: MetricsEngine;
  private samples: Map<string, LatencySample[]> = new Map();

  private readonly SLA_TARGETS: Record<string, number> = {
    'dispatch_latency': 200,
    'pix_settlement': 500,
    'wallet_query': 100,
    'api_response': 300,
    'realtime_sync': 100
  };

  private constructor() {}

  public static getInstance(): MetricsEngine {
    if (!MetricsEngine.instance) {
      MetricsEngine.instance = new MetricsEngine();
    }
    return MetricsEngine.instance;
  }

  /**
   * Registra uma medição de latência
   */
  public recordSample(metricName: string, durationMs: number, success: boolean = true): void {
    if (!this.samples.has(metricName)) {
      this.samples.set(metricName, []);
    }

    const list = this.samples.get(metricName)!;
    list.push({
      metricName,
      durationMs,
      timestamp: Date.now(),
      success
    });

    // Mantém as últimas 1.000 amostras por métrica
    if (list.length > 1000) {
      list.shift();
    }
  }

  /**
   * Mede e calcula estatísticas com percentis
   */
  public getMetricSummary(metricName: string): MetricSummary {
    const list = this.samples.get(metricName) || [];
    const target = this.SLA_TARGETS[metricName] || 300;

    if (list.length === 0) {
      return {
        metricName,
        count: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
        errorRatePct: 0,
        slaCompliant: true,
        targetSlaMs: target
      };
    }

    const durations = list.map(s => s.durationMs).sort((a, b) => a - b);
    const failed = list.filter(s => !s.success).length;

    const p50 = durations[Math.floor(durations.length * 0.50)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
    const errorRate = Number(((failed / list.length) * 100).toFixed(2));

    return {
      metricName,
      count: list.length,
      p50Ms: Number(p50.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      p99Ms: Number(p99.toFixed(2)),
      errorRatePct: errorRate,
      slaCompliant: p95 <= target && errorRate < 1.0,
      targetSlaMs: target
    };
  }

  public getAllSummaries(): MetricSummary[] {
    const metrics = Object.keys(this.SLA_TARGETS);
    return metrics.map(m => this.getMetricSummary(m));
  }
}

export const metricsEngine = MetricsEngine.getInstance();
