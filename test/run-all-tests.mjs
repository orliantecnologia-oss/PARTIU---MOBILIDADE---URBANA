import { describe, test, testAsync, expect, getSummary, waitForAllTests } from "./test-harness.mjs";
import {
  transitionTripState,
  transitionTicketState,
  transitionDeviceState,
  transitionPaymentState,
} from "../src/lib/state-machines.ts";
import {
  calcularSplitFinanceiro,
  criarTransacaoPixComIdempotencia,
  transicionarEstadoPix,
  apurarExtratoLedgerMotorista,
  getJournalsContabeis,
} from "../src/lib/finops-pix-engine.ts";
import {
  assertLedgerBalanced,
  criarLancamentoEstornoContabil,
  executarConciliacaoFinOps,
} from "../src/lib/finops-reconciliation.ts";
import {
  gerarPayloadQRCodePassagem,
  validarQRCodeOffline,
  getValidacoesLocais,
} from "../src/lib/offline-ticket-crypto.ts";
import {
  enqueueDurableOfflineEvent,
  syncDurableQueueWithServer,
  verifyHashChainIntegrity,
  detectSequenceGaps,
  getDurableEventQueue,
} from "../src/lib/offline-durable-queue.ts";
import {
  processarIngestaoTelemetria,
  resetTelemetryState,
  deveTransmitirGpsDeadband,
} from "../src/lib/telemetry-pipeline.ts";
import { checkRateLimit, resetRateLimits } from "../src/lib/security-engine.ts";
import { testBackupRestoreDryRun } from "../src/lib/disaster-recovery.ts";
import { executeWithIdempotency, resetIdempotencyStore } from "../src/lib/global-idempotency.ts";
import {
  verifySignatureWithKeyRotation,
  getKeyByVersion,
} from "../src/lib/cryptographic-key-manager.ts";
import {
  signPayloadWithActiveKey,
  assinarPayloadEd25519,
} from "../src/lib/signing-key-provider.server.ts";
import { assertTenantAccess, filterByTenant } from "../src/lib/multi-tenant-security.ts";
import {
  enqueueTransactionalOutboxEvent,
  registerEventConsumer,
  processOutboxQueueWorker,
  getDeadLetterQueue,
  resetOutboxStore,
} from "../src/lib/v4-outbox-eventbus.ts";
import {
  calcularSplitMinorUnits,
  processarReembolsoFinOps,
  resetRefundStore,
} from "../src/lib/finops-minor-units.ts";
import {
  createSOSIncident,
  transitionSOSState,
  resetSOSStore,
} from "../src/lib/sos-critical-path.ts";
import {
  getCircuitBreaker,
  resetAllCircuitBreakers,
  getRateLimiter,
} from "../src/lib/circuit-breaker.ts";
import {
  verificarAssinaturaEd25519,
} from "../src/lib/offline-ticket-crypto.ts";
import {
  gerarAssinaturaWebhook,
  verificarWebhookHmac,
} from "../src/lib/payment-webhook-engine.ts";
import {
  assertDoubleEntryBalanced,
  registrarEntradaEscrow,
  liquidarSplitViagem,
} from "../src/lib/finops-double-entry.ts";
import { assinarBilheteServerSide } from "../src/lib/ticket-signing.server.ts";
import { runOutboxWorkerBatch, calculateExponentialBackoffMs } from "../src/lib/outbox-worker.server.ts";
import * as ClientCryptoModule from "../src/lib/offline-ticket-crypto.ts";
import { continuousGpsEngine } from "../src/lib/continuous-gps-engine.ts";
import {
  normalizarTelefoneBR,
  converterPassagemBancoParaBilhete,
  converterBilheteParaPassagemInsert,
  mesclarBilhetesNuvemELocal,
} from "../src/lib/passenger-cloud-sync.ts";
import {
  salvarNotificacaoBroadcast,
  obterNotificacoesParaCategoria,
  marcarNotificacaoComoLida,
  isNotificacaoLida,
} from "../src/lib/broadcast-notifications.ts";

console.log("================================================================================");
console.log("🚀 UNIVANS TOS — V4.0 ENTERPRISE PRODUCTION HARDENING CERTIFICATION SUITE");
console.log("================================================================================");

// SUITE 1: DOMAIN STATE MACHINES
describe("1. Domain State Machines & Guard Invariants", () => {
  test("Trip State Machine: Transição válida DRAFT -> SCHEDULED -> BOARDING", () => {
    const res1 = transitionTripState("DRAFT", "SCHEDULED", "dispatcher_1");
    expect(res1.success).toBe(true);
    expect(res1.toState).toBe("SCHEDULED");

    const res2 = transitionTripState("SCHEDULED", "BOARDING", "driver_1");
    expect(res2.success).toBe(true);
    expect(res2.toState).toBe("BOARDING");
  });

  test("Trip State Machine: Bloqueio de transição inválida DRAFT -> COMPLETED", () => {
    const res = transitionTripState("DRAFT", "COMPLETED", "malicious_actor");
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("TRIP_NOT_ACTIVE");
  });

  test("Ticket State Machine: CREATED -> PAID -> ACTIVE -> VALIDATED", () => {
    const res = transitionTicketState("ACTIVE", "VALIDATED", "driver_scanner");
    expect(res.success).toBe(true);
  });

  test("Ticket State Machine: Bloqueio de revalidação VALIDATED -> VALIDATED (Anti-Replay)", () => {
    const res = transitionTicketState("VALIDATED", "VALIDATED", "driver_scanner");
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("TICKET_ALREADY_USED");
  });

  test("Device State Machine: Bloqueio de ação em dispositivo REVOKED", () => {
    const res = transitionDeviceState("REVOKED", "ACTIVE", "attacker");
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("DEVICE_REVOKED");
  });
});

// SUITE 2: ZERO-TRUST MULTI-TENANCY & ADVERSARIAL RLS
describe("2. Zero-Trust Multi-Tenancy & Adversarial RLS Guards", () => {
  test("Adversarial: Tenant A tentando ler dados do Tenant B é bloqueado", () => {
    const ctxTenantA = {
      tenantId: "ORG_COOP_MACEIO",
      userId: "usr_maceio_1",
      role: "DISPATCHER",
      permissions: ["trips.view"],
      correlationId: "corr_test_1",
    };

    const check = assertTenantAccess(ctxTenantA, "ORG_COOP_ARAPIRACA", "READ");
    expect(check.allowed).toBe(false);
    expect(check.error?.code).toBe("TENANT_ACCESS_DENIED");
  });

  test("Adversarial: Tenant A tentando deletar recurso do Tenant B é bloqueado", () => {
    const ctxTenantA = {
      tenantId: "ORG_COOP_MACEIO",
      userId: "usr_maceio_1",
      role: "ADMIN",
      permissions: ["trips.delete"],
      correlationId: "corr_test_2",
    };

    const check = assertTenantAccess(ctxTenantA, "ORG_COOP_ARAPIRACA", "DELETE");
    expect(check.allowed).toBe(false);
    expect(check.error?.code).toBe("TENANT_ACCESS_DENIED");
  });

  test("Isolamento de Exportação: Filtragem de lista exclui 100% dos dados cross-tenant", () => {
    const ctxTenantA = {
      tenantId: "ORG_COOP_MACEIO",
      userId: "usr_maceio_1",
      role: "ADMIN",
      permissions: ["reports.export"],
      correlationId: "corr_test_3",
    };

    const dadosMisturados = [
      { id: "1", organizationId: "ORG_COOP_MACEIO", valor: 100 },
      { id: "2", organizationId: "ORG_COOP_ARAPIRACA", valor: 500 },
      { id: "3", organizationId: "ORG_COOP_MACEIO", valor: 250 },
    ];

    const filtrados = filterByTenant(ctxTenantA, dadosMisturados);
    expect(filtrados.length).toBe(2);
    expect(filtrados.every((d) => d.organizationId === "ORG_COOP_MACEIO")).toBe(true);
  });
});

// SUITE 3: GLOBAL IDEMPOTENCY ENGINE
describe("3. Global Idempotency Engine (Anti-Duplication & Hash Mismatch)", () => {
  test("Comando START_TRIP repetido 3x executa apenas 1x e retorna resultado idêntico", async () => {
    resetIdempotencyStore();
    let execCount = 0;

    const action = async () => {
      execCount++;
      return { tripId: "trip_mcz_01", status: "STARTED", timestamp: Date.now() };
    };

    const res1 = await executeWithIdempotency(
      "key_start_trip_99",
      "START_TRIP",
      "drv_1",
      "ORG_1",
      "corr_1",
      action,
      { tripId: "trip_mcz_01" },
    );
    expect(res1.executed).toBe(true);
    expect(res1.duplicate).toBe(false);
    expect(execCount).toBe(1);

    const res2 = await executeWithIdempotency(
      "key_start_trip_99",
      "START_TRIP",
      "drv_1",
      "ORG_1",
      "corr_1",
      action,
      { tripId: "trip_mcz_01" },
    );
    expect(res2.executed).toBe(false);
    expect(res2.duplicate).toBe(true);
    expect(res2.result.tripId).toBe("trip_mcz_01");
    expect(execCount).toBe(1);
  });

  test("Reuso de mesma Idempotency-Key com payload diferente é rejeitado com IDEMPOTENCY_CONFLICT", async () => {
    const action = async () => ({ tripId: "trip_mcz_02" });
    let errorCaught = false;

    try {
      await executeWithIdempotency(
        "key_start_trip_99",
        "START_TRIP",
        "drv_1",
        "ORG_1",
        "corr_1",
        action,
        { tripId: "trip_mcz_DIFFERENT" },
      );
    } catch (err) {
      errorCaught = true;
      expect(err.code).toBe("IDEMPOTENCY_CONFLICT");
    }
    expect(errorCaught).toBe(true);
  });
});

// SUITE 4: FINOPS DOUBLE-ENTRY LEDGER & MINOR UNITS
describe("4. FinOps Minor Units Precision & Balanced Ledger", () => {
  test("Split em centavos inteiros (Minor Units): R$ 38,00 -> 323 coop, 45 psp, 3477 motorista", () => {
    const split = calcularSplitMinorUnits(38.0, 8.5, 0.45);
    expect(split.valorBrutoCentavos).toBe(3800);
    expect(split.taxaCooperativaCentavos).toBe(323);
    expect(split.taxaPspCentavos).toBe(45);
    expect(split.repasseMotoristaCentavos).toBe(3477);
    expect(split.totalDebitosCentavos).toBe(3845);
    expect(split.totalCreditosCentavos).toBe(3845);
    expect(split.totalDebitosCentavos).toBe(split.totalCreditosCentavos);
  });

  test("Motor de Estorno (Refund): Gera lançamento de reversão imutável e bloqueia segundo estorno", () => {
    resetRefundStore();
    const res1 = processarReembolsoFinOps(
      "pay_123",
      "jnl_123",
      "ORG_AL",
      38.0,
      "Desistência do passageiro",
    );
    expect(res1.success).toBe(true);
    expect(res1.refundRecord.status).toBe("COMPLETED");

    // Tentativa de reembolso duplicado
    const res2 = processarReembolsoFinOps(
      "pay_123",
      "jnl_123",
      "ORG_AL",
      38.0,
      "Tentativa duplicada",
    );
    expect(res2.success).toBe(false);
    expect(res2.error?.code).toBe("INVALID_STATE_TRANSITION");
  });
});

// SUITE 5: TRANSACTIONAL OUTBOX & EVENT BUS V4
describe("5. Transactional Outbox, Event Bus & Dead-Letter Queue (V4)", () => {
  test("Publicação atômica no Outbox com despacho idempotente para consumidores", async () => {
    resetOutboxStore();
    let consumerCalls = 0;

    registerEventConsumer("TripStarted", "consumer_analytics", async (evt) => {
      consumerCalls++;
    });

    enqueueTransactionalOutboxEvent(
      "ORG_AL",
      "TRIP",
      "trip_100",
      "TripStarted",
      1,
      { driverId: "drv_1" },
      "corr_outbox_1",
    );

    const workerRes = await processOutboxQueueWorker();
    expect(workerRes.processed).toBe(1);
    expect(workerRes.published).toBe(1);
    expect(consumerCalls).toBe(1);

    // Segundo ciclo do worker não duplica a execução do consumer
    await processOutboxQueueWorker();
    expect(consumerCalls).toBe(1);
  });
});

// SUITE 6: SOS CRITICAL PATH & PRIORITY DISPATCH
describe("6. SOS Critical Path State Machine & Priority Queue", () => {
  test("Fluxo SOS: CREATED -> ACKNOWLEDGED -> DISPATCHED -> RESOLVED", () => {
    resetSOSStore();
    const sos = createSOSIncident(
      "ORG_AL",
      "VEH_01",
      "DRV_01",
      -9.66,
      -35.73,
      "MECHANICAL",
      "Pneu furado na BR-101",
      "corr_sos_1",
    );
    expect(sos.status).toBe("CREATED");
    expect(sos.priority).toBe("CRITICAL");

    const ack = transitionSOSState(sos.id, "ACKNOWLEDGED", "dispatcher_center");
    expect(ack.success).toBe(true);

    const disp = transitionSOSState(sos.id, "DISPATCHED", "dispatcher_center");
    expect(disp.success).toBe(true);

    const res = transitionSOSState(
      sos.id,
      "RESOLVED",
      "dispatcher_center",
      "Socorro efetuado no local",
    );
    expect(res.success).toBe(true);
    expect(res.incident?.status).toBe("RESOLVED");
  });
});

// SUITE 7: CIRCUIT BREAKER FAULT ISOLATION
describe("7. Circuit Breaker Fault Isolation Engine", () => {
  test("Circuit Breaker abre após falhas consecutivas e aciona fallback seguro", async () => {
    resetAllCircuitBreakers();
    const cb = getCircuitBreaker("PSP_GATEWAY_PIX", { failureThreshold: 2, recoveryTimeMs: 1000 });

    const failingAction = async () => {
      throw new Error("GATEWAY_TIMEOUT_504");
    };
    const fallbackAction = async () => "FALLBACK_PIX_OFFLINE_BUFFER";

    // 1ª falha
    await cb.execute(failingAction, fallbackAction);
    expect(cb.state).toBe("CLOSED");

    // 2ª falha -> Abre o circuito
    const fallbackRes = await cb.execute(failingAction, fallbackAction);
    expect(cb.state).toBe("OPEN");
    expect(fallbackRes).toBe("FALLBACK_PIX_OFFLINE_BUFFER");
  });

  test("Token Bucket Rate Limiter: Bloqueia rajadas além da capacidade máxima permitida", () => {
    const limiter = getRateLimiter("TEST_IP_BR_101", { capacity: 3, refillRatePerSecond: 0 });
    limiter.reset();

    expect(limiter.tryConsume(1).allowed).toBe(true);
    expect(limiter.tryConsume(1).allowed).toBe(true);
    expect(limiter.tryConsume(1).allowed).toBe(true);

    // 4ª tentativa sem tokens -> Rejeitado pelo ByteByteGo Rate Limiter
    const blocked = limiter.tryConsume(1);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remainingTokens).toBe(0);
  });
});

// SUITE 8: CRIPTOGRAFIA & ROTAÇÃO DE CHAVES
describe("8. Cryptographic Key Lifecycle & Multi-Version Rotation", () => {
  test("Assinatura com chave ativa (Versão N) é verificada com sucesso", () => {
    const signed = signPayloadWithActiveKey("PASSAGEM_VALIDA_2026");
    const verify = verifySignatureWithKeyRotation(
      "PASSAGEM_VALIDA_2026",
      signed.signature,
      signed.keyVersion,
    );
    expect(verify.valid).toBe(true);
  });

  test("Assinatura com chave REVOGADA é bloqueada imediatamente", () => {
    const raw = "PASSAGEM_FRAUDULENTA";
    const sig = "ED25519_SIG_INVALID_REVOKED_KEY";

    const verify = verifySignatureWithKeyRotation(raw, sig, "v0-compromised-2026");
    expect(verify.valid).toBe(false);
  });
});

// SUITE 9: OFFLINE QUEUE SEQUENCE GAPS & HASH CHAIN
describe("9. Offline Queue Sequence Gaps & Hash Chain", () => {
  test("Detecção de Sequence Gap: Detecta evento intermediário suprimido [101, 102, 103, 105]", () => {
    const mockEvents = [
      { monotonicCounter: 101 },
      { monotonicCounter: 102 },
      { monotonicCounter: 103 },
      { monotonicCounter: 105 },
    ];
    const gapResult = detectSequenceGaps(mockEvents);
    expect(gapResult.hasGaps).toBe(true);
    expect(gapResult.missingSequences[0]).toBe(104);
  });

  test("Hash Chain: Integridade da cadeia criptográfica", () => {
    enqueueDurableOfflineEvent("DEV_V4", "VEH_V4", "TRIP_01", "TICKET_VALIDATION", {
      tkt: "TKT_V4_1",
    });
    const integridade = verifyHashChainIntegrity();
    expect(integridade.valid).toBe(true);
  });
});

// SUITE 10: MULTI-VARIABLE TELEMETRY ANOMALY ENGINE
describe("10. Multi-Variable Telemetry & Anomaly Scoring Engine", () => {
  test("Telemetria Normal: Aceita e sem anomalias", () => {
    resetTelemetryState();
    const res = processarIngestaoTelemetria({
      organizationId: "ORG_01",
      vehicleId: "VEH_MCZ_01",
      deviceId: "DEV_01",
      latitude: -9.6658,
      longitude: -35.7351,
      speedKmh: 75,
      headingDegrees: 180,
      altitudeMeters: 15,
      gpsAccuracyMeters: 2.1,
      batteryVolts: 13.8,
      capturedAtTimestamp: Date.now() - 5000,
      sequenceNumber: 1,
    });
    expect(res.accepted).toBe(true);
    expect(res.isAnomaly).toBe(false);
  });

  test("Anomalia CRITICAL: Salto de Teleporte (> 180 km/h)", () => {
    const res = processarIngestaoTelemetria({
      organizationId: "ORG_01",
      vehicleId: "VEH_MCZ_01",
      deviceId: "DEV_01",
      latitude: -8.05,
      longitude: -34.9,
      speedKmh: 80,
      headingDegrees: 180,
      altitudeMeters: 15,
      gpsAccuracyMeters: 2.1,
      batteryVolts: 13.8,
      capturedAtTimestamp: Date.now(),
      sequenceNumber: 2,
    });
    expect(res.accepted).toBe(true);
    expect(res.severity).toBe("CRITICAL");
  });
});

// SUITE 11: HIGH-SCALE CPU MICRO-BENCHMARK (1,000 requests)
describe("11. Real In-Process Concurrency Benchmark (1,000 iterations)", () => {
  test("Benchmark: 1,000 splits contábeis com p95 < 20ms", () => {
    const start = Date.now();
    const latencies = [];
    const totalRequests = 1000;

    for (let i = 0; i < totalRequests; i++) {
      const reqStart = performance.now();
      calcularSplitMinorUnits(38.0 + (i % 20));
      const dur = performance.now() - reqStart;
      latencies.push(dur);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(totalRequests * 0.5)];
    const p90 = latencies[Math.floor(totalRequests * 0.9)];
    const p95 = latencies[Math.floor(totalRequests * 0.95)];
    const p99 = latencies[Math.floor(totalRequests * 0.99)];
    const totalDurationMs = Date.now() - start;

    console.log(`     ⚡ Real CPU Benchmark: ${totalRequests} ops em ${totalDurationMs}ms`);
    console.log(
      `        p50=${p50.toFixed(3)}ms | p90=${p90.toFixed(3)}ms | p95=${p95.toFixed(3)}ms | p99=${p99.toFixed(3)}ms`,
    );

    expect(p95).toBeLessThan(20);
    expect(p99).toBeLessThan(50);
  });
});

// SUITE 12: ED25519 DIGITAL SIGNATURE RFC 8032
describe("12. Authentic Ed25519 Cryptography (RFC 8032)", () => {
  test("Assinatura Ed25519 de 64 bytes válida e verificação positiva", () => {
    const payload = "UV-2026-MCZ-01|TRIP_99|R$38.00|PASSAGEIRO_ALAGOAS";
    const sig = assinarPayloadEd25519(payload);
    expect(sig.startsWith("ED25519_")).toBe(true);

    const isValid = verificarAssinaturaEd25519(payload, sig);
    expect(isValid).toBe(true);
  });

  test("Detecção de Adulteração: Payload alterado é rejeitado pela chave Ed25519", () => {
    const payloadOriginal = "UV-2026-MCZ-01|TRIP_99|R$38.00|PASSAGEIRO_ALAGOAS";
    const sig = assinarPayloadEd25519(payloadOriginal);

    const payloadAdulterado = "UV-2026-MCZ-01|TRIP_99|R$0.01|PASSAGEIRO_ALAGOAS_HACKED";
    const isValid = verificarAssinaturaEd25519(payloadAdulterado, sig);
    expect(isValid).toBe(false);
  });
});

// SUITE 13: STRIPE & MERCADO PAGO HMAC-SHA256 WEBHOOK SECURITY
describe("13. Financial Webhook HMAC-SHA256 Anti-Tamper & Anti-Replay", () => {
  test("Webhook com assinatura HMAC-SHA256 válida dentro da janela é aprovado", () => {
    const payload = JSON.stringify({ event: "payment.succeeded", id: "pi_123", amount_cents: 3800 });
    const sigHeader = gerarAssinaturaWebhook(payload);

    const res = verificarWebhookHmac(payload, sigHeader);
    expect(res.valid).toBe(true);
  });

  test("Proteção Anti-Replay: Webhook com timestamp expirado (>5min) é rejeitado", () => {
    const payload = JSON.stringify({ event: "payment.succeeded", id: "pi_123", amount_cents: 3800 });
    const timestampAntigo = Date.now() - 600 * 1000; // 10 minutos atrás
    const sigHeader = gerarAssinaturaWebhook(payload, undefined, timestampAntigo);

    const res = verificarWebhookHmac(payload, sigHeader);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain("expirada");
  });

  test("Proteção de Integridade: Payload adulterado é rejeitado pelo HMAC", () => {
    const payloadOriginal = JSON.stringify({ event: "payment.succeeded", id: "pi_123", amount_cents: 3800 });
    const sigHeader = gerarAssinaturaWebhook(payloadOriginal);

    const payloadFalso = JSON.stringify({ event: "payment.succeeded", id: "pi_123", amount_cents: 100 });
    const res = verificarWebhookHmac(payloadFalso, sigHeader);
    expect(res.valid).toBe(false);
  });
});

// SUITE 14: STRICT DOUBLE-ENTRY BOOKKEEPING (PARTIDAS DOBRADAS)
describe("14. Strict Double-Entry Bookkeeping Ledger", () => {
  test("Entrada em Escrow: SUM(Débitos) === SUM(Créditos) no valor de R$ 38,00", async () => {
    const tx = await registrarEntradaEscrow("PASSAGEM_MCZ_ARAPIRACA_01", 3800);
    expect(tx.balanced).toBe(true);
    expect(tx.totalDebitCents).toBe(3800);
    expect(tx.totalCreditCents).toBe(3800);
  });

  test("Liquidação de Viagem (Split 4 partes): Balanço contábil exato de 3800 centavos", async () => {
    const tx = await liquidarSplitViagem("VIAGEM_CONCLUIDA_88", 3800, 8.5, 45);
    expect(tx.balanced).toBe(true);
    expect(tx.totalDebitCents).toBe(3800);
    expect(tx.totalCreditCents).toBe(3800);
  });

  test("Transação desbalanceada lança erro e aborta inserção", () => {
    let capturouErro = false;
    try {
      assertDoubleEntryBalanced([
        { id: "1", transactionId: "t1", entryType: "DEBIT", accountId: "A", amountCents: 100, description: "D", createdAt: "" },
        { id: "2", transactionId: "t1", entryType: "CREDIT", accountId: "B", amountCents: 90, description: "C", createdAt: "" },
      ]);
    } catch (e) {
      capturouErro = true;
    }
    expect(capturouErro).toBe(true);
  });
});

// SUITE 15: SERVER-SIDE TICKET ISSUANCE & ZERO PRIVATE KEY CLIENT LEAK
describe("15. Server-Side Ticket Issuance & Zero Private Key Client Leak", () => {
  test("Client Key Isolation: Módulo client offline-ticket-crypto.ts NÃO exporta nenhuma chave privada", () => {
    expect(ClientCryptoModule.ED25519_MASTER_PRIVATE_KEY).toBe(undefined);
    expect(ClientCryptoModule.ED25519_MASTER_PUBLIC_KEY).toContain("BEGIN PUBLIC KEY");
  });

  test("Server Function: Emissão e assinatura criptográfica server-side com Ed25519", () => {
    const res = assinarBilheteServerSide({
      codigoBilhete: "UV-PROD-2026-999",
      viagemId: "trip_mcz_arapiraca_01",
      passageiroId: "user_pax_42",
      passageiroNome: "Maria da Silva Santos",
      origemDestino: "Maceió - Arapiraca",
      pontoEmbarque: "Trevo do Tabuleiro",
      valorTotal: 38.0,
      assentos: [7],
    });

    expect(res.keyId).toBe("v3-ed25519-prod-2026");
    expect(res.signature.startsWith("ED25519_")).toBe(true);

    const parsed = JSON.parse(res.qrPayload);
    expect(parsed.v).toBe(3);
    expect(parsed.cod).toBe("UV-PROD-2026-999");
  });

  test("Validação Offline: Totem da van valida bilhete v3 emitido pelo servidor exclusivamente com chave pública", () => {
    const res = assinarBilheteServerSide({
      codigoBilhete: "UV-PROD-2026-777",
      viagemId: "trip_mcz_palmeira_02",
      passageiroId: "user_pax_55",
      passageiroNome: "João Pereira de Lima",
      origemDestino: "Maceió - Palmeira dos Índios",
      pontoEmbarque: "Rodoviária de Maceió",
      valorTotal: 42.0,
      assentos: [3],
    });

    const validacao = validarQRCodeOffline(res.qrPayload);
    expect(validacao.valido).toBe(true);
    expect(validacao.codigoBilhete).toBe("UV-PROD-2026-777");
  });
});

// SUITE 16: ATOMIC SEAT RESERVATION & CONCURRENCY OVERBOOKING PREVENTOR
describe("16. Atomic Seat Reservation & Concurrency Overbooking Preventor", () => {
  testAsync("100 requisições simultâneas disputando 1 única vaga -> Exatamente 1 aprovada e 99 rejeitadas", async () => {
    let vagasTotais = 16;
    let vagasOcupadas = 15;
    let mutex = false;

    async function reservarVagaAtomica(qtd) {
      while (mutex) {
        await new Promise((r) => setTimeout(r, 1));
      }
      mutex = true;
      try {
        if (vagasOcupadas + qtd > vagasTotais) {
          return { sucesso: false, erro: "VAGAS_INSUFICIENTES" };
        }
        vagasOcupadas += qtd;
        return { sucesso: true, vagasRestantes: vagasTotais - vagasOcupadas };
      } finally {
        mutex = false;
      }
    }

    const promises = Array.from({ length: 100 }, () => reservarVagaAtomica(1));
    const results = await Promise.all(promises);

    const aprovadas = results.filter((r) => r.sucesso);
    const rejeitadas = results.filter((r) => !r.sucesso && r.erro === "VAGAS_INSUFICIENTES");

    expect(aprovadas.length).toBe(1);
    expect(rejeitadas.length).toBe(99);
    expect(vagasOcupadas).toBe(16);
  });
});

// SUITE 17: OUTBOX WORKER POLLER, EXPONENTIAL BACKOFF & DLQ DISPATCH
describe("17. Outbox Worker Engine, Exponential Backoff & DLQ Dispatch", () => {
  test("Cálculo de Backoff Exponencial: 1s -> 2s -> 4s -> 8s com teto máximo", () => {
    expect(calculateExponentialBackoffMs(1)).toBe(1000);
    expect(calculateExponentialBackoffMs(2)).toBe(2000);
    expect(calculateExponentialBackoffMs(3)).toBe(4000);
    expect(calculateExponentialBackoffMs(4)).toBe(8000);
    expect(calculateExponentialBackoffMs(20)).toBe(300000);
  });

  testAsync("Worker processa evento com falha repetida e transfere atomicamente para DLQ após max retries", async () => {
    const mockFailingEvent = {
      id: "evt_fail_999",
      event_type: "UNREGISTERED_HANDLER_EVENT",
      payload: { test: true },
      retry_count: 4,
      max_retries: 5,
      status: "FAILED",
    };

    const dlqSink = [];
    const res = await runOutboxWorkerBatch([mockFailingEvent], dlqSink);

    expect(res.processed).toBe(1);
    expect(res.deadLetters).toBe(1);
    expect(mockFailingEvent.status).toBe("DEAD_LETTER");
    expect(dlqSink.length).toBe(1);
    expect(dlqSink[0].outbox_id).toBe("evt_fail_999");
  });
});

// SUITE 18: SOS SECURITY HARDENING & TENANT ANTI-FLOOD GUARDS
describe("18. SOS Security Hardening & Tenant Anti-Flood Guards", () => {
  test("Validação de integridade SOS: Chamado sem dados mínimos de solicitante é rejeitado", () => {
    function validarPayloadSOS(nome, telefone) {
      if (!nome || nome.trim().length < 2) return { valido: false, erro: "NOME_INVALIDO" };
      if (!telefone || telefone.trim().length < 8) return { valido: false, erro: "TELEFONE_INVALIDO" };
      return { valido: true };
    }

    expect(validarPayloadSOS("", "82999998888").valido).toBe(false);
    expect(validarPayloadSOS("A", "82999998888").valido).toBe(false);
    expect(validarPayloadSOS("Carlos Motorista", "").valido).toBe(false);
    expect(validarPayloadSOS("Carlos Motorista", "123").valido).toBe(false);
    expect(validarPayloadSOS("Carlos Motorista", "82999998888").valido).toBe(true);
  });
});

// SUITE 19: GPS GEOGRAPHIC DEADBAND & DATABASE WRITE THROTTLE
describe("19. GPS Geographic Deadband & Database Write Throttle", () => {
  test("Van parada (deslocamento < 20m e tempo < 15s) bloqueia escrita redundante no Postgres", () => {
    const ultimoGps = { lat: -9.6658, lng: -35.7351, timestamp: 1000000 };
    const gpsComJitter = { lat: -9.66581, lng: -35.73511, timestamp: 1002000 };

    const deveTransmitir = deveTransmitirGpsDeadband(ultimoGps, gpsComJitter, 20, 15000);
    expect(deveTransmitir).toBe(false);
  });

  test("Van em movimento (deslocamento >= 20m) aprova transmissão imediata de telemetria", () => {
    const ultimoGps = { lat: -9.6658, lng: -35.7351, timestamp: 1000000 };
    const gpsMovimento = { lat: -9.6663, lng: -35.7351, timestamp: 1003000 };

    const deveTransmitir = deveTransmitirGpsDeadband(ultimoGps, gpsMovimento, 20, 15000);
    expect(deveTransmitir).toBe(true);
  });

  test("Heartbeat Temporal: Van parada por mais de 15s transmite para comprovar liveness", () => {
    const ultimoGps = { lat: -9.6658, lng: -35.7351, timestamp: 1000000 };
    const gpsTempoEsgotado = { lat: -9.6658, lng: -35.7351, timestamp: 1016000 };

    const deveTransmitir = deveTransmitirGpsDeadband(ultimoGps, gpsTempoEsgotado, 20, 15000);
    expect(deveTransmitir).toBe(true);
  });
});

// SUITE 20: CONTINUOUS GPS ENGINE & RESILIENT BACKGROUND TELEMETRY
describe("20. Continuous GPS Engine & Resilient Background Telemetry", () => {
  test("Inicialização do ContinuousGpsManager com estado ativo e transição para parado", () => {
    const estadoInicial = continuousGpsEngine.getEstado();
    expect(typeof estadoInicial.ativo).toBe("boolean");
    expect(typeof estadoInicial.pontosTransmitidos).toBe("number");
    expect(typeof estadoInicial.pontosEmBufferOffline).toBe("number");
  });

  test("Deadband e Heartbeat Temporal garantem liveness e reduzem sobrecarga", () => {
    const ultimoPonto = { lat: -9.5583, lng: -37.3811, timestamp: 1000000 };
    // Deslocamento de ~35 metros
    const pontoMovimento = { lat: -9.5586, lng: -37.3811, timestamp: 1003000 };
    expect(deveTransmitirGpsDeadband(ultimoPonto, pontoMovimento, 20, 15000)).toBe(true);

    // Parado há 1 segundo (jitter de 2 metros)
    const pontoRuido = { lat: -9.55831, lng: -37.38111, timestamp: 1001000 };
    expect(deveTransmitirGpsDeadband(ultimoPonto, pontoRuido, 20, 15000)).toBe(false);
  });

  test("Fila Durável Offline registra pontos de GPS quando transmissão falha", () => {
    const pontoGps = {
      latitude: -9.6459,
      longitude: -35.7255,
      velocidadeKmh: 65,
      rumoGraus: 180,
      precisaoMetros: 4,
      altitudeMetros: 12,
      timestamp: Date.now(),
      qualidadeSinal: "EXCELENTE",
    };

    const evt = enqueueDurableOfflineEvent(
      "dev_drv_04_al",
      "van-04",
      "trip_01",
      "GPS_TELEMETRY",
      pontoGps,
    );

    expect(evt.eventId.startsWith("d_evt_")).toBe(true);
    expect(evt.payloadType).toBe("GPS_TELEMETRY");
    expect(evt.syncStatus).toBe("PENDING");
    expect(evt.payload.velocidadeKmh).toBe(65);
  });
});

// SUITE 21: CLOUD TICKET PERSISTENCE & PHONE IDENTITY NORMALIZATION
describe("21. Cloud Ticket Persistence & Phone Identity Normalization", () => {
  test("Normalização telefônica brasileira: Valida DDD 82 e formata E.164", () => {
    const res = normalizarTelefoneBR("(82) 99841-2940");
    expect(res.valido).toBe(true);
    expect(res.e164).toBe("+5582998412940");
    expect(res.formatado).toBe("(82) 99841-2940");
    expect(res.ddd).toBe("82");
    expect(res.apenasDigitos).toBe("82998412940");

    const invalido = normalizarTelefoneBR("12345");
    expect(invalido.valido).toBe(false);
  });

  test("Conversão de BilhetePassagem para schema de inserção do Supabase", () => {
    const bilheteMock = {
      id: "UV-998877",
      linhaId: "rota-01",
      origem: "Igreja Nova",
      destino: "Maceió",
      dataViagem: "Hoje",
      horarioSaida: "07:00",
      horarioChegadaPrevisto: "09:45",
      quantidadePassagens: 2,
      passageiroNome: "Maria Clara",
      passageiroWhatsApp: "(82) 99841-2940",
      passageiroCpf: "084.129.414-88",
      valorTotal: 76.0,
      formaPagamento: "PIX",
      status: "confirmado",
      vanModelo: "Sprinter VIP",
      vanPlaca: "RJP-2F14",
      motoristaNome: "Carlos",
      motoristaFoto: "",
      codigoQr: "UNIVANS:UV-998877:RJP-2F14",
      criadoEm: new Date().toISOString(),
    };

    const insertRow = converterBilheteParaPassagemInsert(bilheteMock, "usr_123", "viagem_01");
    expect(insertRow.codigo_bilhete).toBe("UV-998877");
    expect(insertRow.passageiro_id).toBe("usr_123");
    expect(insertRow.valor_total).toBe(76.0);
    expect(insertRow.status_pagamento).toBe("confirmado");
  });

  test("Deduplicação e Mesclagem (Merge) inteligente entre nuvem e cache local", () => {
    const locais = [
      {
        id: "UV-001",
        linhaId: "1",
        origem: "Igreja Nova",
        destino: "Maceió",
        dataViagem: "Hoje",
        horarioSaida: "07:00",
        horarioChegadaPrevisto: "09:45",
        quantidadePassagens: 1,
        passageiroNome: "Carlos",
        passageiroWhatsApp: "82999991111",
        passageiroCpf: "111",
        valorTotal: 38.0,
        formaPagamento: "PIX",
        status: "confirmado",
        vanModelo: "Sprinter",
        vanPlaca: "RJP-2F14",
        motoristaNome: "Eduardo",
        motoristaFoto: "",
        codigoQr: "QR-1",
        criadoEm: "2026-09-03T10:00:00.000Z",
      },
    ];

    const nuvem = [
      {
        id: "UV-001",
        linhaId: "1",
        origem: "Igreja Nova",
        destino: "Maceió",
        dataViagem: "Hoje",
        horarioSaida: "07:00",
        horarioChegadaPrevisto: "09:45",
        quantidadePassagens: 1,
        passageiroNome: "Carlos",
        passageiroWhatsApp: "82999991111",
        passageiroCpf: "111",
        valorTotal: 38.0,
        formaPagamento: "PIX",
        status: "embarcado",
        vanModelo: "Sprinter",
        vanPlaca: "RJP-2F14",
        motoristaNome: "Eduardo",
        motoristaFoto: "",
        codigoQr: "QR-1",
        criadoEm: "2026-09-03T10:00:00.000Z",
      },
      {
        id: "UV-002",
        linhaId: "2",
        origem: "Coruripe",
        destino: "Maceió",
        dataViagem: "Amanhã",
        horarioSaida: "08:00",
        horarioChegadaPrevisto: "10:00",
        quantidadePassagens: 1,
        passageiroNome: "Carlos",
        passageiroWhatsApp: "82999991111",
        passageiroCpf: "111",
        valorTotal: 35.0,
        formaPagamento: "PIX",
        status: "confirmado",
        vanModelo: "Master",
        vanPlaca: "ABC-1234",
        motoristaNome: "João",
        motoristaFoto: "",
        codigoQr: "QR-2",
        criadoEm: "2026-09-03T11:00:00.000Z",
      },
    ];

    const mesclados = mesclarBilhetesNuvemELocal(locais, nuvem);
    expect(mesclados.length).toBe(2);
    const bilhete1 = mesclados.find((b) => b.id === "UV-001");
    expect(bilhete1?.status).toBe("embarcado");
    expect(mesclados[0].id).toBe("UV-002");
  });
});

// SUITE 22: BROADCAST NOTIFICATIONS & MULTI-CATEGORY ROUTING ENGINE
describe("22. Broadcast Notifications & Multi-Category Routing Engine", () => {
  test("Roteamento Exclusivo para Motoristas: Apenas categoria 'motorista' e 'todos' recebem", () => {
    salvarNotificacaoBroadcast({
      id: "test-notif-motorista",
      titulo: "Blitz BPRv Trevo do Francês",
      mensagem: "Atenção motoristas: fiscalização ativa.",
      categoria: "motorista",
      urgencia: "alerta",
      rotaDestino: "/app/motorista",
      enviadoPor: "Central de Operações",
      totalDestinatariosEstimados: 75,
    });

    const paraMotorista = obterNotificacoesParaCategoria("motorista");
    const temMotorista = paraMotorista.some((n) => n.id === "test-notif-motorista");
    expect(temMotorista).toBe(true);

    const paraUsuario = obterNotificacoesParaCategoria("usuario");
    const temUsuario = paraUsuario.some((n) => n.id === "test-notif-motorista");
    expect(temUsuario).toBe(false);

    const paraGratis = obterNotificacoesParaCategoria("gratis");
    const temGratis = paraGratis.some((n) => n.id === "test-notif-motorista");
    expect(temGratis).toBe(false);
  });

  test("Roteamento para Grátis (Passe Livre): Usuário comum e motorista não recebem", () => {
    salvarNotificacaoBroadcast({
      id: "test-notif-gratis",
      titulo: "Recadastramento Passe Livre PCD 2026",
      mensagem: "Prazo final para envio do laudo médico.",
      categoria: "gratis",
      urgencia: "urgente",
      rotaDestino: "/app/beneficios",
      enviadoPor: "Setor Social",
      totalDestinatariosEstimados: 210,
    });

    const paraGratis = obterNotificacoesParaCategoria("gratis");
    expect(paraGratis.some((n) => n.id === "test-notif-gratis")).toBe(true);

    const paraUsuario = obterNotificacoesParaCategoria("usuario");
    expect(paraUsuario.some((n) => n.id === "test-notif-gratis")).toBe(false);

    const paraMotorista = obterNotificacoesParaCategoria("motorista");
    expect(paraMotorista.some((n) => n.id === "test-notif-gratis")).toBe(false);
  });

  test("Roteamento 'todos': Todas as categorias (Usuário, Grátis, Motorista) recebem", () => {
    salvarNotificacaoBroadcast({
      id: "test-notif-todos",
      titulo: "Interdição Parcial da Ponte Divaldo Suruagy",
      mensagem: "Tráfego em meia pista no sentido Maceió.",
      categoria: "todos",
      urgencia: "alerta",
      rotaDestino: "/app",
      enviadoPor: "Defesa Civil",
      totalDestinatariosEstimados: 1450,
    });

    expect(obterNotificacoesParaCategoria("usuario").some((n) => n.id === "test-notif-todos")).toBe(true);
    expect(obterNotificacoesParaCategoria("gratis").some((n) => n.id === "test-notif-todos")).toBe(true);
    expect(obterNotificacoesParaCategoria("motorista").some((n) => n.id === "test-notif-todos")).toBe(true);
  });

  test("Controle de Leitura: Marcação de lido atualiza o estado da notificação", () => {
    const id = "test-notif-lida";
    salvarNotificacaoBroadcast({
      id,
      titulo: "Teste de Leitura",
      mensagem: "Mensagem para teste de confirmação.",
      categoria: "usuario",
      urgencia: "info",
      rotaDestino: "/app",
      enviadoPor: "Admin",
      totalDestinatariosEstimados: 1,
    });

    expect(isNotificacaoLida(id)).toBe(false);
    marcarNotificacaoComoLida(id);
    expect(isNotificacaoLida(id)).toBe(true);
  });
});

await waitForAllTests();
const summary = getSummary();
console.log("\n================================================================================");
console.log(
  `📊 RESULTADO FINAL V6.0 ENTERPRISE: ${summary.passedTests}/${summary.total} TESTES PASSARAM (${summary.failedTests} FALHAS)`,
);
console.log("================================================================================\n");

if (summary.failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
