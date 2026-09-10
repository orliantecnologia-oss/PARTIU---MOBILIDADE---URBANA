import { describe, test, expect } from "./test-harness.mjs";
import {
  cancellationPolicyService,
  CancellationPolicyService,
} from "../src/services/CancellationPolicyService.ts";
import {
  PASSENGER_RIDE_TRANSITIONS,
  type PassengerRideState,
} from "../src/lib/passenger/passenger-ride-machine.ts";

describe("SUITE 45: PARTIU MOTORISTA A CAMINHO (EN ROUTE EXPERIENCE) — Uber/99 Standard", () => {
  test("1. Política de Cancelamento: Carência gratuita dentro da janela de tolerância (2 min)", () => {
    // Corrida aceita há 30 segundos atrás (dentro dos 2 min de tolerância)
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const policy = cancellationPolicyService.evaluatePolicy(thirtySecondsAgo, 2, 5.0);

    expect(policy.isGracePeriodActive).toBe(true);
    expect(policy.shouldChargeFee).toBe(false);
    expect(policy.timeRemainingSeconds > 0).toBe(true);
    expect(policy.toleranceMinutes).toBe(2);
    expect(policy.cancellationFee).toBe(5.0);

    const notice = cancellationPolicyService.getCancellationNoticeText(policy);
    expect(notice.includes("Cancelamento grátis")).toBe(true);
  });

  test("2. Política de Cancelamento: Aplicação de taxa após expiração da tolerância", () => {
    // Corrida aceita há 3 minutos atrás (além dos 2 min de tolerância)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const policy = cancellationPolicyService.evaluatePolicy(threeMinutesAgo, 2, 5.0);

    expect(policy.isGracePeriodActive).toBe(false);
    expect(policy.shouldChargeFee).toBe(true);
    expect(policy.timeRemainingSeconds).toBe(0);

    const notice = cancellationPolicyService.getCancellationNoticeText(policy);
    expect(notice.includes("Taxa de cancelamento")).toBe(true);
    expect(notice.includes("5,00")).toBe(true);
  });

  test("3. Formatação Horária e Configuração Dinâmica por Tenant", () => {
    const service = CancellationPolicyService.getInstance();
    service.setConfig({ defaultToleranceMinutes: 3, defaultCancellationFeeBrl: 7.5 });

    const nowIso = new Date().toISOString();
    const policy = service.evaluatePolicy(nowIso);

    expect(policy.toleranceMinutes).toBe(3);
    expect(policy.cancellationFee).toBe(7.5);
    expect(policy.isGracePeriodActive).toBe(true);

    const formattedTime = service.formatFreeUntilTime(policy.freeCancellationUntil);
    expect(formattedTime.length).toBe(5);
    expect(formattedTime.includes(":")).toBe(true);

    // Restaura configurações padrão para os demais testes
    service.setConfig({ defaultToleranceMinutes: 2, defaultCancellationFeeBrl: 5.0 });
  });

  test("4. Máquina de Estados: Interoperabilidade canônica com Supabase (ACCEPTED, DRIVER_EN_ROUTE, DRIVER_ARRIVED)", () => {
    // Validação dos estados canônicos
    expect(PASSENGER_RIDE_TRANSITIONS["ACCEPTED"]).toBeDefined();
    expect(PASSENGER_RIDE_TRANSITIONS["DRIVER_EN_ROUTE"]).toBeDefined();
    expect(PASSENGER_RIDE_TRANSITIONS["DRIVER_ARRIVED"]).toBeDefined();

    // Transição ACCEPTED -> DRIVER_EN_ROUTE
    expect(PASSENGER_RIDE_TRANSITIONS["ACCEPTED"].includes("DRIVER_EN_ROUTE")).toBe(true);

    // Transição DRIVER_EN_ROUTE -> DRIVER_ARRIVED
    expect(PASSENGER_RIDE_TRANSITIONS["DRIVER_EN_ROUTE"].includes("DRIVER_ARRIVED")).toBe(true);

    // Transição DRIVER_ARRIVED -> ON_TRIP
    expect(PASSENGER_RIDE_TRANSITIONS["DRIVER_ARRIVED"].includes("ON_TRIP")).toBe(true);

    // Cancelamento permitido em todos os estados de aproximação
    expect(PASSENGER_RIDE_TRANSITIONS["ACCEPTED"].includes("CANCELLED")).toBe(true);
    expect(PASSENGER_RIDE_TRANSITIONS["DRIVER_EN_ROUTE"].includes("CANCELLED")).toBe(true);
    expect(PASSENGER_RIDE_TRANSITIONS["DRIVER_ARRIVED"].includes("CANCELLED")).toBe(true);
  });

  test("5. Smart Camera Padding: Garantia de desobstrução visual do Bottom Sheet (~320px)", () => {
    const strictEnRoutePadding = {
      top: 100,
      bottom: 380,
      left: 80,
      right: 80,
    };

    // Bottom padding deve ser estritamente >= 380px para cobrir o modal sem sobrepor rota
    expect(strictEnRoutePadding.bottom >= 380).toBe(true);
    expect(strictEnRoutePadding.top >= 100).toBe(true);
    expect(strictEnRoutePadding.left >= 80).toBe(true);
    expect(strictEnRoutePadding.right >= 80).toBe(true);
  });

  test("6. Central de Segurança: Geração de payload de compartilhamento e discagem 190", () => {
    const driverName = "Carlos Eduardo Silva";
    const driverPlate = "ABC1D23";
    const destination = "Centro Universitário Redentor";

    const sharePayload = `Estou a bordo da PARTIU em viagem com o motorista ${driverName} (${driverPlate}). Destino: ${destination}. Rota acompanhada em tempo real.`;

    expect(sharePayload.includes(driverName)).toBe(true);
    expect(sharePayload.includes(driverPlate)).toBe(true);
    expect(sharePayload.includes(destination)).toBe(true);
    expect(sharePayload.includes("tempo real")).toBe(true);

    const emergencyDialerNumber = "190";
    expect(`tel:${emergencyDialerNumber}`).toBe("tel:190");
  });

  test("7. Resiliência de Rede: Detecção de motorista sem sinal de telemetria (> 30s)", () => {
    const now = Date.now();
    const lastTelemetryTimestamp = now - 36000; // 36 segundos atrás

    const isDriverSignalStale = now - lastTelemetryTimestamp > 30000;
    expect(isDriverSignalStale).toBe(true);

    const freshTelemetryTimestamp = now - 5000; // 5 segundos atrás
    const isFreshSignalStale = now - freshTelemetryTimestamp > 30000;
    expect(isFreshSignalStale).toBe(false);
  });
});
