import { describe, test, expect } from "./test-harness.mjs";
import {
  rideRatingService,
  TAGS_99_PASSENGER_TO_DRIVER_POSITIVE,
  TAGS_99_PASSENGER_TO_DRIVER_IMPROVEMENT,
  TAGS_99_DRIVER_TO_PASSENGER,
} from "../src/services/RideRatingService.ts";
import {
  supportTicketService,
  type TicketCategory,
} from "../src/services/SupportTicketService.ts";
import { prometheusMetrics } from "../src/lib/observability/prometheus-metrics.ts";
import { redisSpatialStore } from "../src/lib/spatial/redis-spatial-store.ts";

describe("SUITE 51: SOCIAL SAFETY RATINGS, 99 SUPPORT TICKETS & PROMETHEUS METRICS", () => {
  // ============================================================================
  // 1. RIDE RATINGS & QUALITATIVE REPUTATION
  // ============================================================================
  test("1. RideRatingService: Submissão de avaliação com tags qualitativas e clamping de notas", async () => {
    rideRatingService.resetLocalStore();

    // Avaliação 1: Passageiro para Motorista (5 estrelas com tags positivas)
    const rating1 = await rideRatingService.submitRating({
      rideId: "ride-alpha-1",
      fromUserId: "usr-pass-1",
      toUserId: "usr-driver-1",
      role: "PASSENGER_TO_DRIVER",
      score: 5,
      tags: [TAGS_99_PASSENGER_TO_DRIVER_POSITIVE[0], TAGS_99_PASSENGER_TO_DRIVER_POSITIVE[1]], // "Carro limpo", "Ar-condicionado ligado"
      comment: "Excelente viagem, motorista exemplar!",
    });

    expect(rating1.id).toContain("rate-");
    expect(rating1.score).toBe(5);
    expect(rating1.tags.length).toBe(2);
    expect(rating1.tags[0]).toBe("Carro limpo");

    // Avaliação 2: Nota acima de 5 deve ser limitada (clamped) a 5
    const clampedHigh = await rideRatingService.submitRating({
      rideId: "ride-alpha-2",
      fromUserId: "usr-pass-2",
      toUserId: "usr-driver-1",
      role: "PASSENGER_TO_DRIVER",
      score: 10,
      tags: ["Direção segura"],
    });
    expect(clampedHigh.score).toBe(5);

    // Avaliação 3: Nota abaixo de 1 deve ser limitada (clamped) a 1
    const clampedLow = await rideRatingService.submitRating({
      rideId: "ride-alpha-3",
      fromUserId: "usr-pass-3",
      toUserId: "usr-driver-1",
      role: "PASSENGER_TO_DRIVER",
      score: -2,
      tags: [TAGS_99_PASSENGER_TO_DRIVER_IMPROVEMENT[0]], // "Direção brusca"
    });
    expect(clampedLow.score).toBe(1);
  });

  test("2. RideRatingService: Cálculo de média de reputação e frequência de top tags", async () => {
    // usr-driver-1 possui 3 notas: 5, 5, 1 -> soma 11, total 3 -> média 11/3 = 3.67
    const summary = await rideRatingService.getUserRatingSummary("usr-driver-1");

    expect(summary.totalRatings).toBe(3);
    expect(summary.averageScore).toBe(3.67);
    expect(summary.recentRatings.length).toBe(3);

    // Avaliação de usuário inexistente: padrão seguro 5.0 com 0 avaliações
    const emptySummary = await rideRatingService.getUserRatingSummary("usr-unknown-999");
    expect(emptySummary.totalRatings).toBe(0);
    expect(emptySummary.averageScore).toBe(5.0);
    expect(emptySummary.topTags.length).toBe(0);
  });

  // ============================================================================
  // 2. SUPPORT TICKETS (CENTRAL DE AJUDA 99)
  // ============================================================================
  test("3. SupportTicketService: Geração de protocolo formatado e abertura de chamado", async () => {
    supportTicketService.resetLocalStore();

    const proto = supportTicketService.generateTicketNumber();
    const currentYear = new Date().getFullYear().toString();
    expect(proto.startsWith(`TK-${currentYear}-`)).toBe(true);

    const ticket = await supportTicketService.createTicket({
      userId: "usr-pass-1",
      userName: "Fernanda Costa",
      userPhone: "(22) 99988-7766",
      userRole: "PASSENGER",
      rideId: "ride-alpha-1",
      category: "LOST_ITEM",
      subject: "Esqueci minha carteira no banco de trás",
      description: "Desembarquei às 14h na Av. Central e esqueci uma carteira de couro preta.",
      priority: "HIGH",
    });

    expect(ticket.id).toContain("ticket-");
    expect(ticket.status).toBe("OPEN");
    expect(ticket.category).toBe("LOST_ITEM");
    expect(ticket.priority).toBe("HIGH");
    expect(ticket.ticketNumber.startsWith(`TK-${currentYear}-`)).toBe(true);
  });

  test("4. SupportTicketService: Listagem de tickets e transição de ciclo de vida", async () => {
    const userTickets = await supportTicketService.getUserTickets("usr-pass-1");
    expect(userTickets.length).toBe(1);
    const myTicket = userTickets[0];

    // Transição para IN_REVIEW
    const updated1 = await supportTicketService.updateStatus(
      myTicket.id,
      "IN_REVIEW",
      "Contato realizado com o motorista para verificar o veículo.",
    );
    expect(updated1).toBe(true);

    const refreshed1 = await supportTicketService.getUserTickets("usr-pass-1");
    expect(refreshed1[0].status).toBe("IN_REVIEW");
    expect(refreshed1[0].adminNotes).toContain("Contato realizado");

    // Transição para RESOLVED
    const updated2 = await supportTicketService.updateStatus(
      myTicket.id,
      "RESOLVED",
      "Objeto devolvido com sucesso ao passageiro.",
    );
    expect(updated2).toBe(true);

    const refreshed2 = await supportTicketService.getUserTickets("usr-pass-1");
    expect(refreshed2[0].status).toBe("RESOLVED");
  });

  // ============================================================================
  // 3. PROMETHEUS METRICS EXPORTER
  // ============================================================================
  test("5. PrometheusMetrics: Registro de telemetria operacional, splits e histograma de latência", () => {
    prometheusMetrics.reset();

    // Simula telemetria de corridas
    prometheusMetrics.recordRide("REQUESTED");
    prometheusMetrics.recordRide("REQUESTED");
    prometheusMetrics.recordRide("COMPLETED");
    prometheusMetrics.recordRide("CANCELED");

    // Simula ondas de despacho
    prometheusMetrics.recordWaveOffer(1);
    prometheusMetrics.recordWaveOffer(1);
    prometheusMetrics.recordWaveOffer(2);

    // Simula latências de matching em milissegundos
    prometheusMetrics.recordMatchingLatency(45);  // bucket <= 50
    prometheusMetrics.recordMatchingLatency(85);  // bucket <= 100
    prometheusMetrics.recordMatchingLatency(210); // bucket <= 250

    // Simula split contábil em centavos (R$ 50 total: R$ 40 motorista, R$ 7.50 plataforma, R$ 2.50 cooperativa)
    prometheusMetrics.recordSplit(4000, 750, 250);

    const state = prometheusMetrics.getState();
    expect(state.ridesRequested).toBe(2);
    expect(state.ridesCompleted).toBe(1);
    expect(state.ridesCanceled).toBe(1);
    expect(state.waveOffers[0]).toBe(2);
    expect(state.waveOffers[1]).toBe(1);
    expect(state.splitsDriverCents).toBe(4000);
    expect(state.splitsPlatformCents).toBe(750);
    expect(state.splitsCoopCents).toBe(250);
  });

  test("6. PrometheusMetrics: Exportação canônica OpenMetrics / Prometheus text format", () => {
    const text = prometheusMetrics.generatePrometheusText();

    // Cabeçalhos de especificação
    expect(text).toContain("# HELP partiu_system_up Status operacional do cluster PARTIU");
    expect(text).toContain("# TYPE partiu_system_up gauge");
    expect(text).toContain("partiu_system_up 1");

    // Métricas de condutores e grid H3
    expect(text).toContain("partiu_active_drivers_total{state=\"online\"}");
    expect(text).toContain("partiu_h3_cells_active_total");

    // Métricas de corridas
    expect(text).toContain("partiu_rides_total{status=\"requested\"} 2");
    expect(text).toContain("partiu_rides_total{status=\"completed\"} 1");
    expect(text).toContain("partiu_rides_total{status=\"canceled\"} 1");

    // Despacho em ondas
    expect(text).toContain("partiu_dispatch_wave_offers_total{wave=\"1\"} 2");
    expect(text).toContain("partiu_dispatch_wave_offers_total{wave=\"2\"} 1");

    // Histograma de latência
    expect(text).toContain("partiu_matching_latency_ms_bucket{le=\"50\"} 1");
    expect(text).toContain("partiu_matching_latency_ms_bucket{le=\"100\"} 2");
    expect(text).toContain("partiu_matching_latency_ms_bucket{le=\"250\"} 3");
    expect(text).toContain("partiu_matching_latency_ms_bucket{le=\"+Inf\"} 3");
    expect(text).toContain("partiu_matching_latency_ms_sum 340");
    expect(text).toContain("partiu_matching_latency_ms_count 3");

    // Split contábil
    expect(text).toContain("partiu_finops_split_cents_total{recipient=\"driver\"} 4000");
    expect(text).toContain("partiu_finops_split_cents_total{recipient=\"platform\"} 750");
    expect(text).toContain("partiu_finops_split_cents_total{recipient=\"cooperative\"} 250");
  });
});
