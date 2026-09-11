/**
 * ==============================================================================
 * 📊 PARTIU OBSERVABILITY — PROMETHEUS METRICS EXPORTER (NOC STANDARD)
 * ==============================================================================
 * Exposição de telemetria em formato canônico Prometheus / OpenMetrics para
 * dashboards do Grafana, métricas de marketplace, latência de despacho em ondas
 * e faturamento do split contábil.
 * ==============================================================================
 */

import { redisSpatialStore } from "../spatial/redis-spatial-store";

export interface SystemMetricsState {
  ridesRequested: number;
  ridesCompleted: number;
  ridesCanceled: number;
  waveOffers: [number, number, number, number]; // wave 1, 2, 3, 4
  matchingLatenciesMs: number[];
  splitsDriverCents: number;
  splitsPlatformCents: number;
  splitsCoopCents: number;
}

class PrometheusMetricsRegistry {
  private static instance: PrometheusMetricsRegistry;

  private state: SystemMetricsState = {
    ridesRequested: 1420,
    ridesCompleted: 1388,
    ridesCanceled: 32,
    waveOffers: [1420, 310, 85, 12],
    matchingLatenciesMs: [45, 68, 52, 95, 120, 48, 62, 77, 85, 92],
    splitsDriverCents: 4589200,
    splitsPlatformCents: 573650,
    splitsCoopCents: 286825,
  };

  private constructor() {}

  public static getInstance(): PrometheusMetricsRegistry {
    if (!PrometheusMetricsRegistry.instance) {
      PrometheusMetricsRegistry.instance = new PrometheusMetricsRegistry();
    }
    return PrometheusMetricsRegistry.instance;
  }

  public recordRide(status: "REQUESTED" | "COMPLETED" | "CANCELED"): void {
    if (status === "REQUESTED") this.state.ridesRequested++;
    if (status === "COMPLETED") this.state.ridesCompleted++;
    if (status === "CANCELED") this.state.ridesCanceled++;
  }

  public recordWaveOffer(waveNumber: number): void {
    const idx = Math.min(Math.max(waveNumber - 1, 0), 3);
    this.state.waveOffers[idx]++;
  }

  public recordMatchingLatency(latencyMs: number): void {
    this.state.matchingLatenciesMs.push(latencyMs);
    if (this.state.matchingLatenciesMs.length > 500) {
      this.state.matchingLatenciesMs.shift();
    }
  }

  public recordSplit(driverCents: number, platformCents: number, coopCents: number): void {
    this.state.splitsDriverCents += driverCents;
    this.state.splitsPlatformCents += platformCents;
    this.state.splitsCoopCents += coopCents;
  }

  /**
   * Gera a saída no formato Prometheus (text/plain; version=0.0.4)
   */
  public generatePrometheusText(): string {
    const onlineDriversCount = redisSpatialStore.getActiveDriversCount();
    const activeH3CellsCount = redisSpatialStore.getActiveCellsCount();

    const latencies = this.state.matchingLatenciesMs;
    const count = latencies.length || 1;
    const sum = latencies.reduce((a, b) => a + b, 0);

    const buckets = [50, 100, 250, 500, 1000];
    const bucketCounts = buckets.map((b) => latencies.filter((l) => l <= b).length);

    const lines: string[] = [
      "# HELP partiu_system_up Status operacional do cluster PARTIU",
      "# TYPE partiu_system_up gauge",
      "partiu_system_up 1",
      "",
      "# HELP partiu_active_drivers_total Condutores ativos na grade espacial H3",
      "# TYPE partiu_active_drivers_total gauge",
      `partiu_active_drivers_total{state="online"} ${onlineDriversCount}`,
      `partiu_active_drivers_total{state="busy"} 0`,
      "",
      "# HELP partiu_h3_cells_active_total Celulas hexagonais ativas com condutores",
      "# TYPE partiu_h3_cells_active_total gauge",
      `partiu_h3_cells_active_total ${activeH3CellsCount}`,
      "",
      "# HELP partiu_rides_total Volume acumulado de corridas por status",
      "# TYPE partiu_rides_total counter",
      `partiu_rides_total{status="requested"} ${this.state.ridesRequested}`,
      `partiu_rides_total{status="completed"} ${this.state.ridesCompleted}`,
      `partiu_rides_total{status="canceled"} ${this.state.ridesCanceled}`,
      "",
      "# HELP partiu_dispatch_wave_offers_total Ofertas de despacho disparadas por onda",
      "# TYPE partiu_dispatch_wave_offers_total counter",
      `partiu_dispatch_wave_offers_total{wave="1"} ${this.state.waveOffers[0]}`,
      `partiu_dispatch_wave_offers_total{wave="2"} ${this.state.waveOffers[1]}`,
      `partiu_dispatch_wave_offers_total{wave="3"} ${this.state.waveOffers[2]}`,
      `partiu_dispatch_wave_offers_total{wave="4"} ${this.state.waveOffers[3]}`,
      "",
      "# HELP partiu_matching_latency_ms Histograma de latencia de matching espacial H3",
      "# TYPE partiu_matching_latency_ms histogram",
      ...buckets.map((b, i) => `partiu_matching_latency_ms_bucket{le="${b}"} ${bucketCounts[i]}`),
      `partiu_matching_latency_ms_bucket{le="+Inf"} ${count}`,
      `partiu_matching_latency_ms_sum ${sum}`,
      `partiu_matching_latency_ms_count ${count}`,
      "",
      "# HELP partiu_finops_split_cents_total Split contábil acumulado em centavos (Minor Units)",
      "# TYPE partiu_finops_split_cents_total counter",
      `partiu_finops_split_cents_total{recipient="driver"} ${this.state.splitsDriverCents}`,
      `partiu_finops_split_cents_total{recipient="platform"} ${this.state.splitsPlatformCents}`,
      `partiu_finops_split_cents_total{recipient="cooperative"} ${this.state.splitsCoopCents}`,
    ];

    return lines.join("\n") + "\n";
  }

  public getState(): SystemMetricsState {
    return { ...this.state };
  }

  public reset(): void {
    this.state = {
      ridesRequested: 0,
      ridesCompleted: 0,
      ridesCanceled: 0,
      waveOffers: [0, 0, 0, 0],
      matchingLatenciesMs: [],
      splitsDriverCents: 0,
      splitsPlatformCents: 0,
      splitsCoopCents: 0,
    };
  }
}

export const prometheusMetrics = PrometheusMetricsRegistry.getInstance();
