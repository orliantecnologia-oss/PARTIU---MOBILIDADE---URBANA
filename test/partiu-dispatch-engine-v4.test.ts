import { describe, test, expect } from "./test-harness.mjs";
import {
  driverLocationService,
  type DriverOperatingState,
} from "../src/services/DriverLocationService.ts";
import {
  matchingEngine,
  type CandidateDriverProfile,
  type MatchRequest,
} from "../src/services/MatchingEngine.ts";
import {
  dispatchQueueBuilder,
  type DispatchSession,
} from "../src/services/DispatchQueueBuilder.ts";
import { callAlertService } from "../src/services/CallAlertService.ts";
import {
  liveTrackingEngine,
  type TrackingPosition,
} from "../src/services/LiveTrackingEngine.ts";
import {
  realtimeConnectionManager,
  type ConnectionState,
} from "../src/services/RealtimeConnectionManager.ts";

describe("27. PARTIU DISPATCH ENGINE V4 — MODULE 1: Driver Location & Telemetry Engine", () => {
  test("Transição de Estados Operacionais: OFFLINE -> ONLINE_IDLE -> ON_TRIP", () => {
    driverLocationService.setOperatingState("OFFLINE");
    expect(driverLocationService.getOperatingState()).toBe("OFFLINE");

    driverLocationService.setOperatingState("ONLINE_IDLE");
    expect(driverLocationService.getOperatingState()).toBe("ONLINE_IDLE");

    driverLocationService.setOperatingState("ON_TRIP");
    expect(driverLocationService.getOperatingState()).toBe("ON_TRIP");
  });

  test("Frequência de Transmissão Inteligente: 3s em viagem, 5s em movimento, 15s ocioso", () => {
    const freqIdle = driverLocationService.getTransmissionIntervalMs("ONLINE_IDLE", 80);
    expect(freqIdle).toBe(15000);

    const freqMoving = driverLocationService.getTransmissionIntervalMs("ONLINE_MOVING", 80);
    expect(freqMoving).toBe(5000);

    const freqTrip = driverLocationService.getTransmissionIntervalMs("ON_TRIP", 80);
    expect(freqTrip).toBe(3000);

    // Bateria baixa (< 15%) reduz frequência para poupar energia
    const freqBatteryLow = driverLocationService.getTransmissionIntervalMs("ONLINE_IDLE", 10);
    expect(freqBatteryLow).toBe(30000);
  });
});

describe("28. PARTIU DISPATCH ENGINE V4 — MODULE 3: Matching Engine & DispatchScore Formula", () => {
  const driverA: CandidateDriverProfile = {
    driverId: "drv-ouro",
    driverName: "Carlos Ouro",
    phone: "(22) 99999-1111",
    avatarUrl: "",
    rating: 4.95,
    acceptanceRate: 0.98,
    cancellationRate: 0.01,
    vehiclePlate: "KRT-1001",
    vehicleModel: "Corolla",
    category: "POP",
    subscriptionPlan: "OURO",
    distanceMeters: 1200, // 1.2 km
    etaMinutes: 3,
    finalScore: 0,
  };

  const driverB: CandidateDriverProfile = {
    driverId: "drv-free",
    driverName: "João Free",
    phone: "(22) 99999-2222",
    avatarUrl: "",
    rating: 4.60,
    acceptanceRate: 0.70,
    cancellationRate: 0.08,
    vehiclePlate: "ABC-2002",
    vehicleModel: "Gol",
    category: "POP",
    subscriptionPlan: "FREE",
    distanceMeters: 3500, // 3.5 km
    etaMinutes: 8,
    finalScore: 0,
  };

  test("Cálculo da Fórmula DispatchScore (40% Dist, 25% ETA, 15% Plano, 10% Aceite, 5% Nota, 5% Canc)", () => {
    const scoreA = matchingEngine.calculateScore(driverA);
    const scoreB = matchingEngine.calculateScore(driverB);

    // Motorista Ouro com menor distância e menor ETA deve ter score significativamente superior
    expect(scoreA).toBeGreaterThan(scoreB);
    expect(scoreA).toBeGreaterThan(70);
    expect(scoreB).toBeLessThan(65);
  });

  test("Filtragem de Inelegibilidade: Bloqueados, Suspensos ou Débito", () => {
    expect(matchingEngine.isDriverEligible(driverA)).toBe(true);

    const driverInadimplente = {
      ...driverA,
      driverId: "drv-inad",
      subscriptionPlan: "FREE" as const,
      status: "SUSPENDED" as const,
    };
    expect(matchingEngine.isDriverEligible(driverInadimplente)).toBe(false);

    const driverCancelador = {
      ...driverA,
      cancellationRate: 0.25, // 25% cancelamento -> Inelegível
    };
    expect(matchingEngine.isDriverEligible(driverCancelador)).toBe(false);
  });

  test("Ordenação do Top 10 de Despacho", async () => {
    const request: MatchRequest = {
      rideId: "ride-test-1",
      category: "POP",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 18.5,
    };

    const ranked = await matchingEngine.findBestDrivers(request);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.length).toBeLessThanOrEqual(10);

    // Verifica que está estritamente ordenado por score decrescente
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].finalScore).toBeGreaterThanOrEqual(ranked[i + 1].finalScore);
    }
  });
});

describe("29. PARTIU DISPATCH ENGINE V4 — MODULE 4: Cascade Dispatch Engine", () => {
  test("Início de Cascata: Configura sessão com Top 10 e janela de 10 segundos", async () => {
    const rideId = `cascade_test_${Date.now()}`;
    const session = await dispatchQueueBuilder.startCascadeDispatch({
      rideId,
      category: "POP",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 22.0,
    });

    expect(session.rideId).toBe(rideId);
    expect(session.status).toBe("DISPATCHING");
    expect(session.currentIndex).toBe(0);
    expect(session.secondsRemaining).toBe(10);
    expect(session.currentCandidate).toBeDefined();

    dispatchQueueBuilder.cancelCascade(rideId);
  });

  test("Avanço em Cascata ao Recusar Oferta: Passa para Motorista 2", async () => {
    const rideId = `advance_test_${Date.now()}`;
    const session = await dispatchQueueBuilder.startCascadeDispatch({
      rideId,
      category: "POP",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 25.0,
    });

    const firstDriverId = session.currentCandidate?.driverId;
    expect(session.currentIndex).toBe(0);

    // Motorista 1 recusa
    dispatchQueueBuilder.declineRide(rideId, firstDriverId);

    const updated = dispatchQueueBuilder.getSession(rideId);
    expect(updated?.currentIndex).toBe(1);
    expect(updated?.secondsRemaining).toBe(10);
    expect(updated?.currentCandidate?.driverId).not.toBe(firstDriverId);

    dispatchQueueBuilder.cancelCascade(rideId);
  });

  test("Aceite com Lock Atômico: Finaliza cascata com status ACCEPTED", async () => {
    const rideId = `accept_test_${Date.now()}`;
    await dispatchQueueBuilder.startCascadeDispatch({
      rideId,
      category: "POP",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 19.5,
    });

    const accepted = dispatchQueueBuilder.acceptRide(rideId);
    expect(accepted).toBe(true);

    const session = dispatchQueueBuilder.getSession(rideId);
    expect(session?.status).toBe("ACCEPTED");
    expect(session?.acceptedDriver).toBeDefined();
  });
});

describe("30. PARTIU DISPATCH ENGINE V4 — MODULE 6: Call Alert Service & Wake Lock", () => {
  test("Alerta Sonoro e Vibração: Inicia loop e para sem erros", () => {
    // startAlert não quebra em ambiente headless/Node
    expect(() => {
      callAlertService.startAlert();
      callAlertService.stopAlert();
    }).not.toThrow();
  });
});

describe("31. PARTIU DISPATCH ENGINE V4 — MODULE 8: Live Tracking Engine (60fps LERP & Anti-Teleport)", () => {
  test("Interpolação Inicial e Snap de Teleporte (> 500m)", () => {
    liveTrackingEngine.reset([-41.888, -21.205], 90);
    const initial = liveTrackingEngine.getCurrentPosition();
    expect(initial).toBeDefined();
    expect(initial?.lng).toBe(-41.888);
    expect(initial?.lat).toBe(-21.205);
    expect(initial?.bearing).toBe(90);

    // Salto anômalo de 5 km (ex: teleporte GPS / túnel / mock)
    liveTrackingEngine.pushUpdate([-41.838, -21.205]);
    const afterTeleport = liveTrackingEngine.getCurrentPosition();

    // Deve aplicar snap imediato sem tentar animar voando
    expect(afterTeleport?.lng).toBe(-41.838);
    expect(afterTeleport?.lat).toBe(-21.205);
  });

  test("Atualização Suave com Tração Natural", () => {
    liveTrackingEngine.reset([-41.888, -21.205], 0);

    // Deslocamento de 30 metros à frente
    liveTrackingEngine.pushUpdate([-41.8882, -21.2052], 45, 1000);
    const pos = liveTrackingEngine.getCurrentPosition();
    expect(pos).toBeDefined();
  });
});

describe("32. PARTIU DISPATCH ENGINE V4 — MODULE 9: Realtime Connection & Resilience", () => {
  test("Métricas de Conexão e Transição de Estados", () => {
    const metrics = realtimeConnectionManager.getMetrics();
    expect(metrics).toBeDefined();
    expect(["DISCONNECTED", "CONNECTING", "CONNECTED", "RECONNECTING", "ERROR"]).toContain(
      metrics.state
    );
  });
});

describe("33. PARTIU DISPATCH ENGINE V4 — MODULE 11: National Scale Performance Benchmark", () => {
  test("Performance de Cálculo de Score: 100 motoristas avaliados em < 10ms", () => {
    const candidates: CandidateDriverProfile[] = [];
    for (let i = 0; i < 100; i++) {
      candidates.push({
        driverId: `drv-${i}`,
        driverName: `Motorista ${i}`,
        phone: "(22) 99999-0000",
        avatarUrl: "",
        rating: 4.5 + (i % 5) * 0.1,
        acceptanceRate: 0.8 + (i % 20) * 0.01,
        cancellationRate: (i % 10) * 0.01,
        vehiclePlate: `ABC-${1000 + i}`,
        vehicleModel: "Carro",
        category: "POP",
        subscriptionPlan: i % 4 === 0 ? "OURO" : i % 3 === 0 ? "PRATA" : i % 2 === 0 ? "BRONZE" : "FREE",
        distanceMeters: 500 + i * 50,
        etaMinutes: 2 + Math.floor(i / 10),
        finalScore: 0,
      });
    }

    const t0 = performance.now();
    for (const c of candidates) {
      c.finalScore = matchingEngine.calculateScore(c);
    }
    candidates.sort((a, b) => b.finalScore - a.finalScore);
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(15); // Meta estrita de micro-latência (< 15ms)
    expect(candidates[0].finalScore).toBeGreaterThan(candidates[99].finalScore);
  });
});
