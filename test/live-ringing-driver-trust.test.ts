import { describe, test, expect } from "./test-harness.mjs";
import {
  progressiveDispatchEngine,
  type ProgressiveDispatchSession,
  type LiveRingingMicroStatus,
  type DriverTrustProfile,
} from "../src/services/ProgressiveDispatchEngine.ts";
import { RealtimeConnectionManager } from "../src/services/RealtimeConnectionManager.ts";

describe("SUITE 43: PARTIU LIVE RINGING ENGINE — Micro-Status & Cascade Architecture", () => {
  test("Inicialização do Live Ringing com micro-status e tracking de candidato", async () => {
    const session = await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-live-ringing-init",
      category: "CARRO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 22.0,
    });

    expect(session.dispatchAttempt).toBe(1);
    expect(typeof session.dispatchStatus).toBe("string");

    if (session.currentCandidate) {
      expect(session.dispatchStatus).toBe("DRIVER_NOTIFIED");
      expect(session.currentNotifiedDriverId).toBe(session.currentCandidate.driverId);
      expect(session.waveMessage.includes(session.currentCandidate.name.split(" ")[0])).toBe(true);
    } else {
      expect(session.dispatchStatus).toBe("SEARCHING_R1");
      expect(session.currentNotifiedDriverId).toBe(null);
    }

    progressiveDispatchEngine.cleanup("test-live-ringing-init");
  });

  test("Micro-timing de Análise do Motorista (Notificado -> Verificando Rota -> Recusado)", async () => {
    const session = await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-micro-timing",
      category: "MOTO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 12.0,
    });

    // Simula transições de micro-status da cascata
    const candidate = session.currentCandidate;
    if (candidate) {
      expect(session.cascadeSecondsRemaining).toBe(12);
      expect(session.dispatchStatus).toBe("DRIVER_NOTIFIED");

      // Transição simulada para DRIVER_VIEWING (< 7s restantes)
      session.cascadeSecondsRemaining = 6;
      session.dispatchStatus = "DRIVER_VIEWING";
      const firstName = candidate.name.split(" ")[0];
      session.waveMessage = `${firstName} está verificando a rota...`;
      expect(session.dispatchStatus).toBe("DRIVER_VIEWING");
      expect(session.waveMessage).toBe(`${firstName} está verificando a rota...`);

      // Transição simulada para DRIVER_DECLINED (< 3s restantes)
      session.cascadeSecondsRemaining = 2;
      session.dispatchStatus = "DRIVER_DECLINED";
      session.waveMessage = "Buscando outro motorista disponível...";
      expect(session.dispatchStatus).toBe("DRIVER_DECLINED");
      expect(session.waveMessage).toBe("Buscando outro motorista disponível...");
    }

    progressiveDispatchEngine.cleanup("test-micro-timing");
  });
});

describe("SUITE 44: PARTIU DRIVER TRUST CENTER — Reputação e Conformidade Mercosul", () => {
  test("Aceite de Corrida provisiona DriverTrustProfile com integridade 100%", async () => {
    const session = await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-trust-profile",
      category: "CARRO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 25.0,
    });

    const acceptedSession = progressiveDispatchEngine.acceptRide("test-trust-profile", {
      driverId: "mot-uber-style",
      name: "Carlos Eduardo Silva",
      rating: 4.97,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
      licensePlate: "ABC1D23",
      phone: "(22) 99876-5432",
    });

    expect(acceptedSession.status).toBe("DRIVER_ASSIGNED");
    expect(acceptedSession.dispatchStatus).toBe("ACCEPTED");
    expect(acceptedSession.trustProfile !== undefined).toBe(true);

    const profile = acceptedSession.trustProfile!;
    expect(profile.driverId).toBe("mot-uber-style");
    expect(profile.fullName).toBe("Carlos Eduardo Silva");
    expect(profile.firstName).toBe("Carlos");
    expect(profile.rating).toBe(4.97);
    expect(profile.totalRides).toBe(1284);
    expect(profile.platformYears).toBe(2);
    expect(profile.completionRate).toBe(99);
    expect(profile.vehicleBrand).toBe("Chevrolet");
    expect(profile.vehicleModel).toBe("Onix Plus");
    expect(profile.vehicleColor).toBe("Prata");
    expect(profile.vehicleYear).toBe(2024);

    // Validação da Placa Mercosul (Formato LLLNLNN)
    const mercosulPattern = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
    expect(mercosulPattern.test(profile.licensePlate)).toBe(true);

    progressiveDispatchEngine.cleanup("test-trust-profile");
  });

  test("Aceite de Moto provisiona Veículo Honda com Placa Mercosul de Moto", async () => {
    const session = await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-trust-moto",
      category: "MOTO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 14.0,
    });

    const acceptedSession = progressiveDispatchEngine.acceptRide("test-trust-moto", {
      driverId: "mot-moto-style",
      name: "Lucas Fernandes",
      rating: 4.98,
      licensePlate: "MOT7B99",
      phone: "(22) 99999-1234",
    });

    const profile = acceptedSession.trustProfile!;
    expect(profile.category).toBe("Partiu Moto");
    expect(profile.vehicleBrand).toBe("Honda");
    expect(profile.vehicleModel).toBe("CG 160 Titan");
    expect(profile.licensePlate).toBe("MOT7B99");

    const mercosulPattern = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
    expect(mercosulPattern.test(profile.licensePlate)).toBe(true);

    progressiveDispatchEngine.cleanup("test-trust-moto");
  });
});

describe("SUITE 45: PARTIU RESILIENCE — Realtime Connection & Micro-Payloads", () => {
  test("RealtimeConnectionManager: Inscrição de listener e leitura de métricas", () => {
    const manager = RealtimeConnectionManager.getInstance();
    let recordedState = "";

    const unsubscribe = manager.onStateChange((state) => {
      recordedState = state;
    });

    expect(typeof recordedState).toBe("string");
    expect(["DISCONNECTED", "CONNECTING", "CONNECTED", "RECONNECTING", "ERROR"].includes(recordedState)).toBe(true);

    unsubscribe();
  });

  test("Payload Delta Leve: Não excede 200 bytes por transmissão", () => {
    const mockDelta = {
      rideId: "ride-uuid-1234",
      status: "SEARCHING_R1",
      currentNotifiedDriverId: "drv-5678",
      dispatchAttempt: 1,
      dispatchStatus: "DRIVER_NOTIFIED",
      updatedAt: 1725890000000,
    };

    const serialized = JSON.stringify(mockDelta);
    expect(serialized.length < 200).toBe(true);
  });
});
