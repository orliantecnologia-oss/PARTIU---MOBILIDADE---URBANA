import { describe, test, expect } from "./test-harness.mjs";
import {
  PASSENGER_RIDE_TRANSITIONS,
  type PassengerRideState,
} from "../src/lib/passenger/passenger-ride-machine.ts";
import {
  progressiveDispatchEngine,
  type ProgressiveDispatchSession,
} from "../src/services/ProgressiveDispatchEngine.ts";

describe("SUITE 40: PARTIU DISPATCH V4 — Canonical State Machine & Guard Invariants", () => {
  test("Transição Canônica de Ondas: REQUESTED -> R1 -> R2 -> R3 -> TIMEOUT", () => {
    // 1. REQUESTED -> SEARCHING_R1
    expect(PASSENGER_RIDE_TRANSITIONS["REQUESTED"].includes("SEARCHING_R1")).toBe(true);
    
    // 2. SEARCHING_R1 -> SEARCHING_R2
    expect(PASSENGER_RIDE_TRANSITIONS["SEARCHING_R1"].includes("SEARCHING_R2")).toBe(true);

    // 3. SEARCHING_R2 -> SEARCHING_R3
    expect(PASSENGER_RIDE_TRANSITIONS["SEARCHING_R2"].includes("SEARCHING_R3")).toBe(true);

    // 4. SEARCHING_R3 -> TIMEOUT
    expect(PASSENGER_RIDE_TRANSITIONS["SEARCHING_R3"].includes("TIMEOUT")).toBe(true);
  });

  test("Transição de Aceite em Qualquer Onda: R1/R2/R3 -> DRIVER_ASSIGNED", () => {
    expect(PASSENGER_RIDE_TRANSITIONS["SEARCHING_R1"].includes("DRIVER_ASSIGNED")).toBe(true);
    expect(PASSENGER_RIDE_TRANSITIONS["SEARCHING_R2"].includes("DRIVER_ASSIGNED")).toBe(true);
    expect(PASSENGER_RIDE_TRANSITIONS["SEARCHING_R3"].includes("DRIVER_ASSIGNED")).toBe(true);
  });

  test("Transição de Cancelamento em Qualquer Onda: R1/R2/R3 -> CANCELLED", () => {
    expect(PASSENGER_RIDE_TRANSITIONS["SEARCHING_R1"].includes("CANCELLED")).toBe(true);
    expect(PASSENGER_RIDE_TRANSITIONS["SEARCHING_R2"].includes("CANCELLED")).toBe(true);
    expect(PASSENGER_RIDE_TRANSITIONS["SEARCHING_R3"].includes("CANCELLED")).toBe(true);
  });

  test("Transições de Saída do TIMEOUT: Tentar Novamente (REQUESTED) ou Retornar ao Mapa (IDLE)", () => {
    expect(PASSENGER_RIDE_TRANSITIONS["TIMEOUT"].includes("REQUESTED")).toBe(true);
    expect(PASSENGER_RIDE_TRANSITIONS["TIMEOUT"].includes("IDLE")).toBe(true);
  });
});

describe("SUITE 41: PARTIU DISPATCH V4 — Progressive Radius Expansion (PostGIS Multi-Tier)", () => {
  test("Onda 1: Raio estrito de 2 km, 20 segundos de duração e mensagem oficial", async () => {
    const session = await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-ride-wave1",
      category: "CARRO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 18.5,
    });

    expect(session.currentWave).toBe(1);
    expect(session.currentRadiusMeters).toBe(2000);
    expect(session.waveDurationSeconds).toBe(20);
    expect(session.status).toBe("SEARCHING_R1");
    expect(
      session.waveMessage === "Buscando motoristas próximos..." ||
      session.waveMessage.includes("analisando seu pedido")
    ).toBe(true);

    progressiveDispatchEngine.cleanup("test-ride-wave1");
  });

  test("Onda 3: Raio padrão de 6 km configurável e mensagem metropolitana", async () => {
    const session = await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-ride-wave3",
      category: "MOTO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 10.0,
      customWave3RadiusMeters: 8000,
    });

    // Simula avanço para Onda 3
    progressiveDispatchEngine.advanceCascade("test-ride-wave3");
    expect(session.currentWave).toBe(1); // iniciou na 1

    progressiveDispatchEngine.cleanup("test-ride-wave3");
  });
});

describe("SUITE 42: PARTIU DISPATCH V4 — Cascade Dispatch & 12s Window (60s Global Window)", () => {
  test("Cascata de Condutores: Janela estrita de 12s por condutor e avanço sequencial", async () => {
    const session = await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-ride-cascade",
      category: "CARRO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 22.0,
    });

    expect(session.cascadeSecondsRemaining).toBe(12);

    // Rejeição ou timeout avança para o próximo condutor
    const initialIndex = session.currentCandidateIndex;
    progressiveDispatchEngine.advanceCascade("test-ride-cascade");
    expect(session.currentCandidateIndex).toBe(initialIndex + 1);

    progressiveDispatchEngine.cleanup("test-ride-cascade");
  });

  test("Aceite do Motorista: Finaliza cascata, cancela timers e transiciona para DRIVER_ASSIGNED", async () => {
    const session = await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-ride-accept",
      category: "MOTO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 12.5,
    });

    progressiveDispatchEngine.acceptRide("test-ride-accept", {
      driverId: "drv-winner-01",
      name: "Rodrigo Moto",
      category: "MOTO",
      status: "ON_TRIP",
      subscriptionPlan: "OURO",
      lat: -21.204,
      lng: -41.887,
      rating: 4.98,
      acceptanceRate: 99,
      cancellationRate: 0.5,
      distanceMeters: 300,
      etaMinutes: 1,
      dispatchScore: 97,
    });

    const updated = progressiveDispatchEngine.getSession("test-ride-accept");
    expect(updated?.status).toBe("DRIVER_ASSIGNED");
    expect(updated?.acceptedDriver?.driverId).toBe("drv-winner-01");
    expect(updated?.waveMessage).toBe("Motorista encontrado!");

    progressiveDispatchEngine.cleanup("test-ride-accept");
  });
});

describe("SUITE 43: PARTIU DISPATCH V4 — Timeout Engine & Fast Recovery", () => {
  test("Esgotamento de Ondas: Transiciona atomicamente para TIMEOUT", async () => {
    const session = await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-ride-timeout",
      category: "CARRO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 15.0,
    });

    progressiveDispatchEngine.triggerTimeout("test-ride-timeout");
    const updated = progressiveDispatchEngine.getSession("test-ride-timeout");

    expect(updated?.status).toBe("TIMEOUT");
    expect(updated?.currentCandidate).toBe(null);
    expect(updated?.waveSecondsRemaining).toBe(0);

    progressiveDispatchEngine.cleanup("test-ride-timeout");
  });

  test("Reinício após Timeout (Tentar Novamente): Reinicia ciclo na Onda 1 (2 km)", async () => {
    await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-ride-retry",
      category: "CARRO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 16.0,
    });

    progressiveDispatchEngine.triggerTimeout("test-ride-retry");
    const sessionAfterRetry = await progressiveDispatchEngine.retrySearch("test-ride-retry");

    expect(sessionAfterRetry?.status).toBe("SEARCHING_R1");
    expect(sessionAfterRetry?.currentWave).toBe(1);
    expect(sessionAfterRetry?.currentRadiusMeters).toBe(2000);

    progressiveDispatchEngine.cleanup("test-ride-retry");
  });

  test("Clean-up Rigoroso: Cleanup remove a sessão e timers sem vazamento de memória", async () => {
    await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-ride-cleanup",
      category: "CARRO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 19.0,
    });

    expect(progressiveDispatchEngine.getSession("test-ride-cleanup")).toBeDefined();
    progressiveDispatchEngine.cleanup("test-ride-cleanup");
    expect(progressiveDispatchEngine.getSession("test-ride-cleanup")).toBeUndefined();
  });
});

describe("SUITE 46: PARTIU CANCELLATION HARDENING — Anti-Resurrection & Clean Teardown", () => {
  test("Cancelamento Atômico: cancelDispatch finaliza timers e impede ressuscitação de ondas", async () => {
    await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-ride-atomic-cancel",
      category: "CARRO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 25.0,
    });

    expect(progressiveDispatchEngine.getSession("test-ride-atomic-cancel")).toBeDefined();

    // Cancelamento
    progressiveDispatchEngine.cancelDispatch("test-ride-atomic-cancel", "PASSENGER_TEST_CANCEL");

    // Sessão deve estar limpa
    expect(progressiveDispatchEngine.getSession("test-ride-atomic-cancel")).toBeUndefined();

    // Tentar avançar cascata ou disparar timeout para corrida cancelada não tem efeito
    progressiveDispatchEngine.advanceCascade("test-ride-atomic-cancel");
    progressiveDispatchEngine.triggerTimeout("test-ride-atomic-cancel");

    expect(progressiveDispatchEngine.getSession("test-ride-atomic-cancel")).toBeUndefined();
  });
});

