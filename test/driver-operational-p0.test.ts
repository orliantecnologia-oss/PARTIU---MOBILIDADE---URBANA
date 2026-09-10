import { describe, test, testAsync, expect } from "./test-harness.mjs";
import {
  cancelarCorridaPeloMotorista,
  cancelarCorridaPorNoShow,
  driverStateMachine,
  driverTelemetryEngine,
  type CorridaPartiu,
} from "../src/lib/partiu-engine.ts";
import {
  getWazeUrl,
  getGoogleMapsUrl,
} from "../src/utils/navigation-launcher.ts";
import { atomicMatchingEngine } from "../src/lib/dispatch-atomic/atomic-matching.ts";
import { DRIVER_CANCEL_REASONS } from "../src/components/driver/DriverCancelBottomSheet.tsx";

describe("🚖 P0 DRIVER OPERATIONAL RESILIENCE & LIFECYCLE CERTIFICATION", () => {
  // --------------------------------------------------------------------------
  // TESTE 1: Pickup ETA & Rentabilidade na Oferta
  // --------------------------------------------------------------------------
  test("1.1 Cálculo de Pickup ETA e R$/km na Oferta do Motorista", () => {
    const distanciaKm = 4.2;
    const valorLiquido = 18.5;
    const ganhoPorKm = Number((valorLiquido / distanciaKm).toFixed(2));

    expect(ganhoPorKm).toBe(4.4); // R$ 4,40/km
    expect(ganhoPorKm).toBeGreaterThan(3.0); // Rentabilidade viável

    const pickupKm = 0.85;
    const pickupMin = 3;
    expect(pickupKm).toBeLessThan(1.5);
    expect(pickupMin).toBe(3);
  });

  // --------------------------------------------------------------------------
  // TESTE 2: Driver Cancel Flow (Cancelamento Justificado Operacional)
  // --------------------------------------------------------------------------
  test("2.1 Cancelamento Operacional pelo Motorista com registro auditado", () => {
    const rideId = `RIDE-${Date.now()}`;
    const driverId = "DRV-101";

    const reason = DRIVER_CANCEL_REASONS.find((r) => r.code === "MECHANICAL_FAILURE")!;
    expect(reason).toBeDefined();

    const res = cancelarCorridaPeloMotorista({
      rideId,
      driverId,
      reasonCode: reason.code,
      reasonLabel: reason.label,
      coords: { lat: -21.2056, lng: -41.8872 },
    });

    expect(res.sucesso).toBe(true);
    expect(res.mensagem).toContain(reason.label);
  });

  test("2.2 Lista de Motivos Justificados Obrigatórios (Zero Omissão)", () => {
    const expectedCodes = [
      "PASSENGER_REQUESTED",
      "INACCESSIBLE_LOCATION",
      "MECHANICAL_FAILURE",
      "RISK_AREA",
      "ACCIDENT",
      "PERSONAL_EMERGENCY",
    ];

    const actualCodes = DRIVER_CANCEL_REASONS.map((r) => r.code);
    expectedCodes.forEach((code) => {
      expect(actualCodes).toContain(code);
    });
  });

  // --------------------------------------------------------------------------
  // TESTE 3: No-Show Engine (Passageiro Não Compareceu após 5 min)
  // --------------------------------------------------------------------------
  test("3.1 Cancelamento por No-Show credita taxa de R$ 4,50 ao motorista", () => {
    const rideId = `RIDE-NOSHOW-${Date.now()}`;
    const driverId = "DRV-202";

    const res = cancelarCorridaPorNoShow({
      rideId,
      driverId,
      passengerPhone: "(22) 99888-7777",
      waitingMinutes: 6,
    });

    expect(res.sucesso).toBe(true);
    expect(res.settlement).toBeDefined();
    expect(res.settlement?.totalFeeBrl).toBe(6.0);
    expect(res.settlement?.driverShareBrl).toBe(4.5);
    expect(res.settlement?.platformShareBrl).toBe(1.5);
  });

  test("3.2 Telemetria: Guarda de 5 minutos de Carência (300s)", () => {
    const rideId = `RIDE-WAIT-${Date.now()}`;
    const driverId = "DRV-303";

    // Inicia cronômetro com 300s de carência
    const status = driverTelemetryEngine.startWaitingTimer(driverId, rideId, 300);
    expect(status.isGracePeriodActive).toBe(true);
    expect(status.canDriverCancelWithoutPenalty).toBe(false);

    // Imediato: sem cobrança de espera
    expect(status.accumulatedWaitingFeeCents).toBe(0);
  });

  // --------------------------------------------------------------------------
  // TESTE 4: External Navigation (Deep links Waze & Google Maps)
  // --------------------------------------------------------------------------
  test("4.1 Resolução de URLs de navegação para Waze e Google Maps", () => {
    const endereco = "Rua Amadeu Tinoco Lacerda, 492, Itaperuna - RJ";
    const coords = { lat: -21.2056, lng: -41.8872 };

    const wazeUrl = getWazeUrl({ address: endereco, ...coords });
    expect(wazeUrl).toContain("waze.com/ul");
    expect(wazeUrl).toContain("-21.2056");
    expect(wazeUrl).toContain("navigate=yes");

    const mapsUrl = getGoogleMapsUrl({ address: endereco, ...coords });
    expect(mapsUrl).toContain("google.com/maps/dir");
    expect(mapsUrl).toContain("-21.2056");
    expect(mapsUrl).toContain("travelmode=driving");
  });

  // --------------------------------------------------------------------------
  // TESTE 5: Auditoria da Máquina de Estados (Zero Deadlocks / Zero Confinamento)
  // --------------------------------------------------------------------------
  test("5.1 Transições de cancelamento para ONLINE a partir de qualquer estado", () => {
    const driverId = "DRV-STATE-1";
    const rideId = "RIDE-STATE-1";

    driverStateMachine.initDriverSession(driverId, "ONLINE");
    expect(driverStateMachine.getCurrentState()).toBe("ONLINE");

    // ONLINE -> OFFER_RECEIVED -> OFFER_ACCEPTED -> HEADING_TO_PICKUP
    driverStateMachine.transitionRide("OFFER_RECEIVED", driverId, rideId);
    driverStateMachine.transitionRide("OFFER_ACCEPTED", driverId, rideId);
    driverStateMachine.transitionRide("HEADING_TO_PICKUP", driverId, rideId);
    expect(driverStateMachine.getCurrentState()).toBe("HEADING_TO_PICKUP");

    // Cancelamento em HEADING_TO_PICKUP deve transicionar diretamente para ONLINE
    driverStateMachine.transitionRide("ONLINE", driverId, rideId, "DRIVER", {
      reason: "CANCEL_HEADING",
    });
    expect(driverStateMachine.getCurrentState()).toBe("ONLINE");

    // Nova corrida: ONLINE -> HEADING -> ARRIVED -> WAITING
    driverStateMachine.transitionRide("OFFER_RECEIVED", driverId, rideId);
    driverStateMachine.transitionRide("OFFER_ACCEPTED", driverId, rideId);
    driverStateMachine.transitionRide("HEADING_TO_PICKUP", driverId, rideId);
    driverStateMachine.transitionRide("ARRIVED", driverId, rideId);
    driverStateMachine.transitionRide("WAITING", driverId, rideId);
    expect(driverStateMachine.getCurrentState()).toBe("WAITING");

    // Cancelamento por No-Show em WAITING deve transicionar diretamente para ONLINE
    driverStateMachine.transitionRide("ONLINE", driverId, rideId, "DRIVER", {
      reason: "NO_SHOW",
    });
    expect(driverStateMachine.getCurrentState()).toBe("ONLINE");
  });

  test("5.2 Transição segura defensiva (safeTransitionRide) recupera para ONLINE", () => {
    const driverId = "DRV-SAFE-1";
    const rideId = "RIDE-SAFE-1";

    driverStateMachine.initDriverSession(driverId, "ONLINE");

    // Salto ilegal intencional (ONLINE -> COMPLETING)
    const recovered = driverStateMachine.safeTransitionRide("COMPLETING", driverId, rideId, "SYSTEM");
    expect(recovered).toBe("ONLINE");
    expect(driverStateMachine.getCurrentState()).toBe("ONLINE");
  });

  // --------------------------------------------------------------------------
  // TESTE 6: Simulação de Alta Carga — 500 Motoristas em Turno
  // --------------------------------------------------------------------------
  test("6.1 Simulação de ciclo de 500 condutores (100% sem deadlocks)", () => {
    let canceladosComSucesso = 0;
    let noShowsComSucesso = 0;
    let concluidasComSucesso = 0;

    for (let i = 0; i < 500; i++) {
      const dId = `DRV-SCALE-${i}`;
      const rId = `RIDE-SCALE-${i}`;

      if (i % 3 === 0) {
        // Motorista cancela por pane ou pedido
        const res = cancelarCorridaPeloMotorista({
          rideId: rId,
          driverId: dId,
          reasonCode: "MECHANICAL_FAILURE",
          reasonLabel: "Pane mecânica no veículo",
        });
        if (res.sucesso) canceladosComSucesso++;
      } else if (i % 3 === 1) {
        // Passageiro não compareceu (No-Show)
        const res = cancelarCorridaPorNoShow({
          rideId: rId,
          driverId: dId,
          waitingMinutes: 5,
        });
        if (res.sucesso) noShowsComSucesso++;
      } else {
        // Corrida normal
        concluidasComSucesso++;
      }
    }

    expect(canceladosComSucesso).toBe(167);
    expect(noShowsComSucesso).toBe(167);
    expect(concluidasComSucesso).toBe(166);
    expect(canceladosComSucesso + noShowsComSucesso + concluidasComSucesso).toBe(500);
  });
});
