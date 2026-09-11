import { describe, test, testAsync, expect } from "./test-harness.mjs";
import {
  driverDestinationModeService,
  DriverDestinationModeService,
} from "../src/services/DriverDestinationModeService.ts";
import {
  antiGpsSpoofingEngine,
  AntiGpsSpoofingEngine,
} from "../src/lib/telemetry/anti-gps-spoofing-engine.ts";
import {
  fareCalculationEngine,
  FareCalculationEngine,
} from "../src/lib/pricing/fare-calculation-engine.ts";
import {
  directionsService,
  DirectionsService,
} from "../src/services/DirectionsService.ts";
import {
  routingService,
  RoutingService,
} from "../src/services/RoutingService.ts";
import {
  criarNovaCorrida,
  isCorridaElegivelParaMotorista,
  type CorridaPartiu,
} from "../src/lib/partiu-engine.ts";

describe("SUITE 54: MODO DESTINO, ANTI-FAKE GPS, MULTI-PARADAS & FALLBACK GEODÉSICO", () => {
  // ============================================================================
  // 1. DRIVER DESTINATION MODE ("CORRIDA DIRECIONADA" / "IR PARA CASA")
  // ============================================================================
  test("1. Modo Destino: Ativação, limite diário de 2 usos e cancelamento", () => {
    const service = DriverDestinationModeService.getInstance();
    const driverId = "DRV-DEST-001";

    // Garante estado limpo
    service.clearDestination(driverId);
    expect(service.getActiveDestination(driverId)).toBe(null);

    // 1º Uso do dia
    const dest1 = service.setDestination(
      driverId,
      "Rua Buarque de Nazareth, 120 - Centro",
      { lat: -21.205, lng: -41.888 }
    );
    expect(dest1.success).toBe(true);
    expect(dest1.destination?.address).toBe("Rua Buarque de Nazareth, 120 - Centro");
    expect(service.getRemainingUses(driverId)).toBe(1);

    // Consulta ativo
    const active = service.getActiveDestination(driverId);
    expect(active?.address).toBe("Rua Buarque de Nazareth, 120 - Centro");

    // Limpa destino ativo
    service.clearDestination(driverId);
    expect(service.getActiveDestination(driverId)).toBe(null);

    // 2º Uso do dia
    const dest2 = service.setDestination(
      driverId,
      "Minha Casa - Bairro Aeroporto",
      { lat: -21.218, lng: -41.875 }
    );
    expect(dest2.success).toBe(true);
    expect(service.getRemainingUses(driverId)).toBe(0);

    // 3º Uso do dia DEVE ser rejeitado (regra padrão Uber/99: máx 2/dia)
    const dest3 = service.setDestination(
      driverId,
      "Outro Destino Impossível",
      { lat: -21.2, lng: -41.8 }
    );
    expect(dest3.success).toBe(false);
    expect(dest3.message?.includes("Limite diário")).toBe(true);

    // Limpeza
    service.clearDestination(driverId);
  });

  test("2. Modo Destino: Vetor de convergência espacial de corrida", () => {
    const service = DriverDestinationModeService.getInstance();
    const driverId = "DRV-CONV-001";
    service.clearDestination(driverId);

    // Motorista define destino: Centro de Itaperuna (-21.205, -41.888)
    const targetDestination = { lat: -21.205, lng: -41.888 };
    service.setDestination(
      driverId,
      "Centro de Itaperuna",
      targetDestination
    );

    const driverCurrentLocation = { lat: -21.23, lng: -41.895 }; // 3 km ao sul

    // Caso A: Corrida que desembarca exatamente a 500m do destino do motorista (< 3.5 km)
    const rideA_Origem = { lat: -21.228, lng: -41.894 };
    const rideA_Destino = { lat: -21.207, lng: -41.889 };
    const convergeA = service.isRideConverging(
      driverCurrentLocation,
      rideA_Origem,
      rideA_Destino,
      targetDestination
    );
    expect(convergeA).toBe(true);

    // Caso B: Corrida que vai para a direção contrária (afasta 15 km)
    const rideB_Origem = { lat: -21.23, lng: -41.895 };
    const rideB_Destino = { lat: -21.32, lng: -41.95 };
    const convergeB = service.isRideConverging(
      driverCurrentLocation,
      rideB_Origem,
      rideB_Destino,
      targetDestination
    );
    expect(convergeB).toBe(false);

    service.clearDestination(driverId);
  });

  // ============================================================================
  // 2. BLINDAGEM ANTI-FAKE GPS & TELEPORT DETECTION
  // ============================================================================
  test("3. Anti-Fake GPS: Movimento cinemático regular e detecção de Mock Provider", () => {
    const engine = AntiGpsSpoofingEngine.getInstance();
    const driverId = "DRV-GPS-TEST-1";
    engine.clearSuspension(driverId);

    // Ponto 1: Posição inicial limpa
    const t0 = Date.now() - 10000;
    const r1 = engine.evaluatePing(driverId, {
      lat: -21.205,
      lng: -41.888,
      timestamp: t0,
      accuracy: 8,
      isMock: false,
    });
    expect(r1.isSpoofed).toBe(false);
    expect(r1.severity).toBe("CLEAN");

    // Ponto 2: Movimento urbano normal (~30 km/h) após 5s (~40m)
    const t1 = t0 + 5000;
    const r2 = engine.evaluatePing(driverId, {
      lat: -21.2053,
      lng: -41.8882,
      timestamp: t1,
      accuracy: 6,
      isMock: false,
    });
    expect(r2.isSpoofed).toBe(false);
    expect(r2.severity).toBe("CLEAN");

    // Ponto 3: Ativação de aplicativo de Mock Provider (Fake GPS no Android)
    const t2 = t1 + 3000;
    const r3 = engine.evaluatePing(driverId, {
      lat: -21.2055,
      lng: -41.8883,
      timestamp: t2,
      accuracy: 5,
      isMock: true, // FLAG DO SO
    });
    expect(r3.isSpoofed).toBe(true);
    expect(r3.reasons.some((r) => r.includes("MOCK_PROVIDER"))).toBe(true);
  });

  test("4. Anti-Fake GPS: Detecção de salto cinemático (> 140 km/h / Teletransporte)", () => {
    const engine = AntiGpsSpoofingEngine.getInstance();
    const driverId = "DRV-GPS-TELEPORT";
    engine.clearSuspension(driverId);

    const t0 = Date.now() - 5000;
    engine.evaluatePing(driverId, {
      lat: -21.205,
      lng: -41.888,
      timestamp: t0,
      accuracy: 8,
    });

    // Salto de 5 km em 2 segundos (~9.000 km/h - anomalia crítica de teletransporte)
    const t1 = t0 + 2000;
    const rTeleport = engine.evaluatePing(driverId, {
      lat: -21.25,
      lng: -41.888,
      timestamp: t1,
      accuracy: 8,
    });

    expect(rTeleport.isSpoofed).toBe(true);
    expect(rTeleport.severity).toBe("CRITICAL");
    expect(rTeleport.reasons.some((r) => r.includes("TELEPORT_ANOMALY"))).toBe(true);

    // Motorista fica em quarentena temporária
    const isSuspended = engine.isDriverSuspended(driverId);
    expect(isSuspended).toBe(true);

    engine.clearSuspension(driverId);
  });

  // ============================================================================
  // 3. MULTI-PARADAS DINÂMICAS & FARE CALCULATION ENGINE
  // ============================================================================
  test("5. Multi-Paradas: Cobrança de taxa por parada (R$ 2,50 / 250 centavos cada)", () => {
    const engine = FareCalculationEngine.getInstance();

    // Corrida base sem paradas: 5 km, 12 min
    const quoteZeroStops = engine.calculateFare({
      categoryId: "CARRO",
      distanceKm: 5,
      durationMinutes: 12,
      stopsCount: 0,
    });

    // Corrida com 1 parada
    const quoteOneStop = engine.calculateFare({
      categoryId: "CARRO",
      distanceKm: 5,
      durationMinutes: 12,
      stopsCount: 1,
    });

    // Corrida com 2 paradas
    const quoteTwoStops = engine.calculateFare({
      categoryId: "CARRO",
      distanceKm: 5,
      durationMinutes: 12,
      stopsCount: 2,
    });

    expect(quoteOneStop.stopsCents).toBe(250);
    expect(quoteTwoStops.stopsCents).toBe(500);

    // Diferença exata no total em centavos
    expect(quoteOneStop.totalCents - quoteZeroStops.totalCents).toBe(250);
    expect(quoteTwoStops.totalCents - quoteZeroStops.totalCents).toBe(500);

    // Formatação BRL correta
    expect(quoteOneStop.formattedPrice.includes("R$")).toBe(true);
  });

  // ============================================================================
  // 4. ROTEAMENTO RESILIENTE COM FALLBACK GEODÉSICO (DIRECTIONS & ROUTING SERVICE)
  // ============================================================================
  testAsync("6. Resiliência de Direções: Fallback geodésico calibrado quando API remota aborta", async () => {
    const origin: [number, number] = [-41.888, -21.205];
    const destination: [number, number] = [-41.875, -21.218];
    const waypoints: [number, number][] = [[-41.88, -21.21]];

    // DirectionsService com timeout de 1ms para forçar abort e ativação imediata do fallback
    const result = await directionsService.getRoute(origin, destination, {
      waypoints,
      timeoutMs: 1,
      skipCache: true,
    });

    expect(result).not.toBe(null);
    expect(result.source).toBe("calibrated_urban_network");
    expect(result.isFallback).toBe(true);
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.durationMinutes).toBeGreaterThan(0);
    expect(result.coordinates.length).toBeGreaterThan(2);

    // RoutingService fallback offline
    const urbanMetrics = routingService.generateCalibratedUrbanRoute(origin, destination, {
      waypoints,
    });
    expect(urbanMetrics.provider).toBe("calibrated_urban_network");
    expect(urbanMetrics.distanceKm).toBeGreaterThan(0);
    expect(urbanMetrics.coordinates?.length).toBeGreaterThan(3);
  });

  // ============================================================================
  // 5. INTEGRAÇÃO PARTIU-ENGINE: PARADAS, MODO DESTINO E FILTRO DE MOTORISTA
  // ============================================================================
  test("7. Partiu-Engine: Criação de corrida com paradas e validação de elegibilidade", () => {
    // 7.1 Criação de corrida com 2 paradas intermediárias
    const nova = criarNovaCorrida({
      origem: "Rua Coronel Luiz Ferraz, 100",
      destino: "Shopping Itaperuna",
      origemCoords: { lat: -21.205, lng: -41.888 },
      destinoCoords: { lat: -21.218, lng: -41.875 },
      modalidade: "POP",
      distanciaKm: 4.8,
      duracaoMin: 12,
      formaPagamento: "pix",
      passageiroNome: "Passageiro Teste Multi-Paradas",
      passageiroTelefone: "(22) 99999-8888",
      paradas: [
        { id: "p1", endereco: "Farmácia Centro", coords: { lat: -21.208, lng: -41.885 } },
        { id: "p2", endereco: "Padaria Modelo", coords: { lat: -21.212, lng: -41.88 } },
      ],
    });

    expect(nova.paradas?.length).toBe(2);
    expect(nova.paradas?.[0].endereco).toBe("Farmácia Centro");
    expect(nova.paradasConcluidas).toBe(0);

    // 7.2 Elegibilidade do Motorista com Modo Destino Ativo
    const motoristaId = "DRV-ELEGIVEL-001";
    const driverDestService = DriverDestinationModeService.getInstance();
    driverDestService.clearDestination(motoristaId);

    // Sem modo destino -> elegível
    const elegivelSemDestino = isCorridaElegivelParaMotorista({
      corrida: nova,
      driverId: motoristaId,
      driverCoords: { lat: -21.204, lng: -41.889 },
    });
    expect(elegivelSemDestino.aceitavel).toBe(true);

    // Com modo destino oposto -> não elegível
    driverDestService.setDestination(
      motoristaId,
      "Destino no Norte",
      { lat: -21.1, lng: -41.8 } // Vai para o norte, corrida vai para o sul
    );

    const elegivelComDestinoOposto = isCorridaElegivelParaMotorista({
      corrida: nova,
      driverId: motoristaId,
      driverCoords: { lat: -21.204, lng: -41.889 },
    });
    expect(elegivelComDestinoOposto.aceitavel).toBe(false);
    expect(elegivelComDestinoOposto.motivo?.includes("DESTINATION_MODE_FILTER")).toBe(true);

    // Limpeza
    driverDestService.clearDestination(motoristaId);
  });
});
