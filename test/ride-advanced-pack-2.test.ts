import { describe, test, expect } from "./test-harness.mjs";
import {
  rideLiveTrackingService,
  RideLiveTrackingService,
} from "../src/lib/tracking/ride-live-tracking-service.ts";
import {
  fareCalculationEngine,
  FareCalculationEngine,
  DEFAULT_FARE_RULES,
} from "../src/lib/pricing/fare-calculation-engine.ts";
import {
  cancellationPolicyService,
  CancellationPolicyService,
  CANCELLATION_REASONS_PASSENGER,
  CANCELLATION_REASONS_DRIVER,
} from "../src/services/CancellationPolicyService.ts";
import {
  criarNovaCorrida,
  motoristaAceitarCorrida,
  motoristaChegouAoLocal,
  confirmarEmbarqueEIniciarViagem,
  cancelarCorrida,
  getCorridaAtiva,
} from "../src/lib/partiu-engine.ts";

describe("SUITE 53: SIGA MINHA VIAGEM, FARE ENGINE & ESTRUTURA DE CANCELAMENTO", () => {
  // ============================================================================
  // 1. RIDE LIVE TRACKING SERVICE ("SIGA MINHA VIAGEM" / RASTREIO PÚBLICO)
  // ============================================================================
  test("1. Siga Minha Viagem: Geração de token, registro e sanitização pública de dados", () => {
    const service = RideLiveTrackingService.getInstance();
    const rideId = "COR-998811";
    const token = service.generateTrackingToken(rideId);

    expect(token.startsWith("TRK-")).toBe(true);
    expect(token.length).toBeGreaterThan(6);

    const trackingData = service.registerRideTracking({
      rideId,
      status: "A_CAMINHO",
      origem: "Av. Cardoso Moreira, 500 - Centro",
      destino: "Rodoviária de Itaperuna",
      origemCoords: { lat: -21.205, lng: -41.89 },
      destinoCoords: { lat: -21.21, lng: -41.895 },
      driverCoords: { lat: -21.206, lng: -41.891 },
      driverName: "Carlos Eduardo Silva",
      driverPhoto: "https://example.com/carlos.jpg",
      driverRating: 4.96,
      vehicleModel: "Fiat Cronos Prata",
      vehiclePlate: "RIO-9A88",
      passengerName: "Mariana Albuquerque",
      distanceKm: 4.2,
      durationMin: 11,
      existingToken: token,
    });

    // Sanitização de privacidade: Apenas o primeiro nome é exposto publicamente
    expect(trackingData.passengerFirstName).toBe("Mariana");
    expect(trackingData.trackingToken).toBe(token);
    expect(trackingData.status).toBe("A_CAMINHO");
    expect(trackingData.statusLabel).toBe("Motorista a caminho do embarque");
    expect(trackingData.vehiclePlate).toBe("RIO-9A88");
    expect(trackingData.isExpired).toBe(false);

    // Consulta de visualização pública
    const publicView = service.getPublicTrackingView(token);
    expect(publicView).not.toBe(null);
    expect(publicView?.driverName).toBe("Carlos Eduardo Silva");
    expect(publicView?.driverCoords?.lat).toBe(-21.206);

    // Atualização de telemetria do motorista
    service.updateDriverLocation(token, { lat: -21.207, lng: -41.892 });
    const updatedView = service.getPublicTrackingView(token);
    expect(updatedView?.driverCoords?.lat).toBe(-21.207);
    expect(updatedView?.driverCoords?.lng).toBe(-41.892);

    // Formatação de mensagens WhatsApp / SMS
    const shareUrl = service.buildShareUrl(token);
    expect(shareUrl.includes("/rastreio/" + token)).toBe(true);

    const shareMsg = service.buildShareMessage(token, "Fiat Cronos Prata", "RIO-9A88");
    expect(shareMsg.includes("Fiat Cronos Prata")).toBe(true);
    expect(shareMsg.includes("RIO-9A88")).toBe(true);
    expect(shareMsg.includes(token)).toBe(true);
  });

  // ============================================================================
  // 2. FARE CALCULATION ENGINE (PREÇO DINÂMICO & MINOR UNITS)
  // ============================================================================
  test("2. FareCalculationEngine: Matriz por categoria, tarifa mínima e surge multiplier", () => {
    const engine = FareCalculationEngine.getInstance();

    // Verificação das regras padrão
    const rulePop = engine.getFareRule("POP");
    expect(rulePop.baseFareCents).toBe(450); // R$ 4,50
    expect(rulePop.perKmFareCents).toBe(140); // R$ 1,40/km
    expect(rulePop.perMinuteFareCents).toBe(25); // R$ 0,25/min
    expect(rulePop.minFareCents).toBe(750); // Mínimo R$ 7,50

    // Cálculo normal: 5 km e 10 min
    // subtotal = 450 + (5 * 140) + (10 * 25) = 450 + 700 + 250 = 1400 centavos (R$ 14,00)
    const resultNormal = engine.calculateFare({
      categoryId: "POP",
      distanceKm: 5,
      durationMinutes: 10,
      surgeMultiplier: 1.0,
    });
    expect(resultNormal.totalCents).toBe(1400);
    expect(resultNormal.totalBrl).toBe(14.0);
    expect(resultNormal.formattedPrice.includes("14,00")).toBe(true);

    // Cálculo de corrida curta onde se aplica a tarifa mínima: 0.5 km e 2 min
    // subtotal = 450 + (0.5 * 140) + (2 * 25) = 450 + 70 + 50 = 570 centavos (< 750)
    // Resultado deve ser 750 centavos (R$ 7,50)
    const resultCurta = engine.calculateFare({
      categoryId: "POP",
      distanceKm: 0.5,
      durationMinutes: 2,
    });
    expect(resultCurta.totalCents).toBe(750);
    expect(resultCurta.totalBrl).toBe(7.5);

    // Cálculo com Surge Multiplier de 1.5x (alta demanda / chuva)
    // 1400 * 1.5 = 2100 centavos (R$ 21,00)
    const resultSurge = engine.calculateFare({
      categoryId: "POP",
      distanceKm: 5,
      durationMinutes: 10,
      surgeMultiplier: 1.5,
    });
    expect(resultSurge.totalCents).toBe(2100);
    expect(resultSurge.totalBrl).toBe(21.0);
    expect(resultSurge.surgeMultiplier).toBe(1.5);

    // Categoria MOTO (mais econômica)
    const resultMoto = engine.calculateFare({
      categoryId: "MOTO",
      distanceKm: 3,
      durationMinutes: 6,
    });
    // MOTO: base 300 + (3 * 95) + (6 * 18) = 300 + 285 + 108 = 693 centavos (R$ 6,93)
    expect(resultMoto.totalCents).toBe(693);
    expect(resultMoto.totalBrl).toBe(6.93);
  });

  // ============================================================================
  // 3. CANCELLATION POLICY ENGINE (JANELA DE TOLERÂNCIA 99 & MOTIVOS ESTRUTURADOS)
  // ============================================================================
  test("3. CancellationPolicyService: Janela de carência de 2 min e catálogo de motivos", () => {
    const service = CancellationPolicyService.getInstance();

    // Catálogo de motivos estruturados do passageiro e motorista
    expect(CANCELLATION_REASONS_PASSENGER.length).toBeGreaterThan(4);
    expect(CANCELLATION_REASONS_DRIVER.length).toBeGreaterThan(4);

    const driverStationary = CANCELLATION_REASONS_PASSENGER.find(
      (r) => r.code === "DRIVER_STATIONARY"
    );
    expect(driverStationary?.appliesFeeWhenLate).toBe(false); // Não pune o passageiro se condutor estiver parado!

    const waitTooLong = CANCELLATION_REASONS_PASSENGER.find((r) => r.code === "WAIT_TOO_LONG");
    expect(waitTooLong?.appliesFeeWhenLate).toBe(true);

    // Cenário A: Cancelamento dentro da tolerância de 2 minutos (carência ativa)
    const acceptedJustNow = new Date(Date.now() - 30 * 1000); // 30 segundos atrás
    const policyWithinGrace = service.evaluatePolicy(acceptedJustNow, 2, 5.0);
    expect(policyWithinGrace.isGracePeriodActive).toBe(true);
    expect(policyWithinGrace.shouldChargeFee).toBe(false);
    expect(policyWithinGrace.timeRemainingSeconds).toBeGreaterThan(0);
    expect(service.getCancellationNoticeText(policyWithinGrace).includes("grátis")).toBe(true);

    // Cenário B: Cancelamento após 2 minutos (fora da tolerância)
    const acceptedLongAgo = new Date(Date.now() - 150 * 1000); // 2 min e 30s atrás
    const policyLate = service.evaluatePolicy(acceptedLongAgo, 2, 5.0);
    expect(policyLate.isGracePeriodActive).toBe(false);
    expect(policyLate.shouldChargeFee).toBe(true);
    expect(policyLate.timeRemainingSeconds).toBe(0);
    expect(service.getCancellationNoticeText(policyLate).includes("Taxa de cancelamento")).toBe(true);
  });

  // ============================================================================
  // 4. INTEGRAÇÃO PARTIU-ENGINE: AUTO-CALC, TRACKING & CANCELAMENTO COM ISENÇÃO
  // ============================================================================
  test("4. partiu-engine: Criação com FareEngine automático, trackingToken e cancelamento com isenção", () => {
    // Cria corrida sem especificar valor (0) para ativar o motor dinâmico
    const corrida = criarNovaCorrida({
      modalidade: "POP",
      origem: "Rua Dez de Maio, 100",
      destino: "Aeroporto de Itaperuna",
      valor: 0, // Auto-cálculo via FareCalculationEngine
      distanciaKm: 8,
      duracaoMin: 15,
      formaPagamento: "pix",
      passageiroNome: "Juliana Mendes",
      passageiroTelefone: "(22) 99111-2222",
    });

    // Validar auto-precificação: base 450 + (8 * 140) + (15 * 25) = 450 + 1120 + 375 = 1945 centavos (R$ 19,45)
    expect(corrida.valor).toBe(19.45);
    expect(corrida.trackingToken).toBeDefined();
    expect(corrida.trackingToken?.startsWith("TRK-")).toBe(true);

    // Validar sincronização no serviço de rastreio
    const tracking = rideLiveTrackingService.getPublicTrackingView(corrida.trackingToken!);
    expect(tracking).not.toBe(null);
    expect(tracking?.passengerFirstName).toBe("Juliana");
    expect(tracking?.status).toBe("PROCURANDO");

    // Simula motorista aceitando e chegando
    motoristaAceitarCorrida();
    const trackingAccepted = rideLiveTrackingService.getPublicTrackingView(corrida.trackingToken!);
    expect(trackingAccepted?.status).toBe("A_CAMINHO");

    motoristaChegouAoLocal();
    const trackingArrived = rideLiveTrackingService.getPublicTrackingView(corrida.trackingToken!);
    expect(trackingArrived?.status).toBe("CHEGOU");

    // Cancelamento com motivo isento (DRIVER_STATIONARY) não deve gerar multa
    const feeSettlement = cancelarCorrida({
      reasonCode: "DRIVER_STATIONARY",
      reasonLabel: "Motorista não se move no mapa",
    });

    // Como o motivo foi DRIVER_STATIONARY, a multa não é aplicada!
    expect(feeSettlement).toBe(null);

    // Rastreio deve estar marcado como cancelado
    const trackingCancelled = rideLiveTrackingService.getPublicTrackingView(corrida.trackingToken!);
    expect(trackingCancelled?.status).toBe("CANCELADA");
    expect(getCorridaAtiva()).toBe(null);
  });
});
