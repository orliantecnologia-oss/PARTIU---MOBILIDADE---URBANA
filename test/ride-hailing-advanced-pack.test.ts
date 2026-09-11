import { describe, test, expect } from "./test-harness.mjs";
import {
  criarNovaCorrida,
  type CorridaPartiu,
} from "../src/lib/partiu-engine.ts";
import { extrairOfertaDeCorrida } from "../src/routes/app.motorista.tsx";
import {
  driverWithdrawalService,
  type PixKeyType,
} from "../src/services/DriverWithdrawalService.ts";
import { driverLedgerEngine } from "../src/lib/driver/driver-ledger-engine.ts";
import {
  h3DemandHeatmapEngine,
} from "../src/lib/spatial/h3-demand-heatmap-engine.ts";
import {
  adaptiveTelemetryEngine,
} from "../src/lib/telemetry/adaptive-telemetry-engine.ts";

describe("SUITE 52: OTHER PERSON RIDES, DRIVER PIX WITHDRAWAL, H3 DEMAND HEATMAP & ADAPTIVE GPS", () => {
  // ============================================================================
  // 1. CORRIDA PARA TERCEIROS (IS_FOR_OTHER_PERSON — PADRÃO 99/UBER)
  // ============================================================================
  test("1. Corrida para Terceiros: Criação, extração de oferta e roteamento de contato direto", () => {
    // Cenário: João solicita uma corrida para sua mãe Dona Maria
    const corridaTerceiro = criarNovaCorrida({
      origem: "Rua Dez de Maio, 100 - Centro",
      destino: "Hospital São José do Avaí",
      modalidade: "CARRO",
      valor: 18.5,
      distanciaKm: 3.8,
      duracaoMin: 12,
      formaPagamento: "pix",
      passageiroNome: "Dona Maria",
      passageiroTelefone: "(22) 98888-7777",
      isForOtherPerson: true,
      otherPersonName: "Dona Maria",
      otherPersonPhone: "(22) 98888-7777",
      solicitanteNome: "João da Silva",
      solicitanteTelefone: "(22) 99999-1111",
    });

    expect(corridaTerceiro.isForOtherPerson).toBe(true);
    expect(corridaTerceiro.otherPersonName).toBe("Dona Maria");
    expect(corridaTerceiro.otherPersonPhone).toBe("(22) 98888-7777");
    expect(corridaTerceiro.solicitanteNome).toBe("João da Silva");

    // Valida extração de oferta para o cockpit do motorista
    const oferta = extrairOfertaDeCorrida(corridaTerceiro, "PARTIU");
    expect(oferta.passageiro).toBe("Dona Maria (Pedido por João da Silva)");
    expect(oferta.telefone).toBe("(22) 98888-7777"); // Telefone da pessoa real que vai embarcar!
    expect(oferta.isForOtherPerson).toBe(true);
  });

  // ============================================================================
  // 2. VALIDAÇÃO CRIPTO-MATEMÁTICA DE CHAVES PIX
  // ============================================================================
  test("2. DriverWithdrawalService: Validação de Chaves PIX (CPF, CNPJ, Email, Celular e EVP)", () => {
    // CPF Válido com cálculo do Módulo 11 (algoritmo oficial RFB)
    const validCpf = "52998224725"; // CPF matematicamente válido
    expect(driverWithdrawalService.validateCpf(validCpf)).toBe(true);

    // CPF Inválido (dígito adulterado)
    expect(driverWithdrawalService.validateCpf("52998224720")).toBe(false);
    // CPF com todos os números iguais (inválido por regra)
    expect(driverWithdrawalService.validateCpf("11111111111")).toBe(false);

    // CNPJ Válido e Inválido
    expect(driverWithdrawalService.validateCnpj("11222333000181")).toBe(true);
    expect(driverWithdrawalService.validateCnpj("11222333000100")).toBe(false);

    // E-mail Válido e Inválido
    expect(driverWithdrawalService.validateEmail("motorista.parceiro@partiu.app")).toBe(true);
    expect(driverWithdrawalService.validateEmail("email-sem-arroba.com")).toBe(false);

    // Telefone Nacional com DDD
    expect(driverWithdrawalService.validatePhone("(22) 99876-5432")).toBe(true);
    expect(driverWithdrawalService.validatePhone("12345")).toBe(false);

    // Chave Aleatória EVP (UUID v4)
    expect(driverWithdrawalService.validateEvp("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
    expect(driverWithdrawalService.validateEvp("chave-invalida-123")).toBe(false);
  });

  // ============================================================================
  // 3. SAQUE PIX INSTANTÂNEO DO MOTORISTA (D+0) COM DÉBITO CONTÁBIL
  // ============================================================================
  test("3. DriverWithdrawalService: Processamento de Saque PIX D+0 e emissão de comprovante", async () => {
    driverWithdrawalService.resetLocalStore();
    const driverId = "mot-test-saque-1";

    // Credita R$ 150 no ledger do motorista
    driverLedgerEngine.settleTripRide(driverId, "ride-saque-seed", 150.0, "CARRO");
    const summaryBefore = driverLedgerEngine.getEarningsSummary(driverId);
    const balanceBefore = summaryBefore.availableBalanceCents / 100;
    expect(balanceBefore >= 100).toBe(true);

    // 1. Tentar sacar valor abaixo do mínimo (R$ 5,00) deve falhar
    const resLow = await driverWithdrawalService.requestPixWithdrawal({
      driverId,
      amountBrl: 2.0,
      pixKey: "52998224725",
      pixKeyType: "CPF",
    });
    expect(resLow.success).toBe(false);
    expect(resLow.status).toBe("FAILED");
    expect(resLow.message).toContain("R$ 5,00");

    // 2. Tentar sacar com chave inválida deve falhar
    const resBadKey = await driverWithdrawalService.requestPixWithdrawal({
      driverId,
      amountBrl: 50.0,
      pixKey: "cpf-invalido",
      pixKeyType: "CPF",
    });
    expect(resBadKey.success).toBe(false);

    // 3. Saque válido de R$ 50,00
    const resOk = await driverWithdrawalService.requestPixWithdrawal({
      driverId,
      amountBrl: 50.0,
      pixKey: "52998224725",
      pixKeyType: "CPF",
    });
    expect(resOk.success).toBe(true);
    expect(resOk.status).toBe("COMPLETED");
    expect(resOk.transferId).toContain("PIX-OUT-");
    expect(resOk.amountBrl).toBe(50.0);

    // Saldo no ledger deve ter sido debitado em exatamente R$ 50,00
    const summaryAfter = driverLedgerEngine.getEarningsSummary(driverId);
    const balanceAfter = summaryAfter.availableBalanceCents / 100;
    expect(Math.round(balanceAfter * 100) / 100).toBe(Math.round((balanceBefore - 50.0) * 100) / 100);
  });

  // ============================================================================
  // 4. HEATMAP DE DEMANDA HEXAGONAL H3 (DYNAMIC DEMAND SURGE MAP)
  // ============================================================================
  test("4. H3DemandHeatmapEngine: Agregação em células H3, multiplicador dinâmico e polígonos GeoJSON", () => {
    h3DemandHeatmapEngine.reset();

    const lat = -21.205;
    const lng = -41.888;

    // Registra 8 eventos de demanda na mesma região
    for (let i = 0; i < 8; i++) {
      h3DemandHeatmapEngine.recordDemandEvent(lat, lng, 1);
    }

    const summaries = h3DemandHeatmapEngine.getDemandSummaries();
    expect(summaries.length > 0).toBe(true);

    const topCell = summaries[0];
    expect(topCell.count).toBe(8);
    expect(topCell.multiplier).toBe(1.5); // Alta Demanda 1.5x
    expect(topCell.fillColor).toBe("#F97316"); // Laranja

    // Valida geração do FeatureCollection GeoJSON
    const geoJson = h3DemandHeatmapEngine.generateDemandHeatmapGeoJson();
    expect(geoJson.type).toBe("FeatureCollection");
    expect(geoJson.features.length > 0).toBe(true);

    const feature = geoJson.features[0];
    expect(feature.geometry.type).toBe("Polygon");
    const polygon = (feature.geometry as any).coordinates[0];
    expect(polygon.length >= 6).toBe(true); // Hexágono tem 6 vértices + 1 de fechamento

    // Verifica fechamento do polígono topológico GeoJSON
    const firstVertex = polygon[0];
    const lastVertex = polygon[polygon.length - 1];
    expect(firstVertex[0]).toBe(lastVertex[0]);
    expect(firstVertex[1]).toBe(lastVertex[1]);
  });

  // ============================================================================
  // 5. TELEMETRIA ADAPTATIVA DINÂMICA (GPS RATE ENGINE / MOBILECONFIG)
  // ============================================================================
  test("5. AdaptiveTelemetryEngine: Seleção de intervalos dinâmicos e métricas de economia", () => {
    // 1. Em viagem ativa com passageiro: 3000ms (3s) e alta precisão
    const configOnTrip = adaptiveTelemetryEngine.getAdaptiveConfig("IN_PROGRESS", 90);
    expect(configOnTrip.intervalMs).toBe(3000);
    expect(configOnTrip.distanceFilterMeters).toBe(5);
    expect(configOnTrip.enableHighAccuracy).toBe(true);

    // 2. A caminho do embarque: 3000ms (3s)
    const configHeading = adaptiveTelemetryEngine.getAdaptiveConfig("HEADING_TO_PICKUP", 90);
    expect(configHeading.intervalMs).toBe(3000);

    // 3. Em movimento sem corrida: 5000ms (5s)
    const configMoving = adaptiveTelemetryEngine.getAdaptiveConfig("ONLINE_MOVING", 90);
    expect(configMoving.intervalMs).toBe(5000);
    expect(configMoving.distanceFilterMeters).toBe(15);

    // 4. Ocioso / Parado: 15000ms (15s) e GNSS desativado para economia extrema
    const configIdle = adaptiveTelemetryEngine.getAdaptiveConfig("ONLINE_IDLE", 90);
    expect(configIdle.intervalMs).toBe(15000);
    expect(configIdle.distanceFilterMeters).toBe(30);
    expect(configIdle.enableHighAccuracy).toBe(false);
    expect(configIdle.estimatedBatterySavingsPercent >= 70).toBe(true);

    // 5. Bateria Crítica (<= 15%): modo de sobrevivência energética a 30s
    const configLowBatt = adaptiveTelemetryEngine.getAdaptiveConfig("IN_PROGRESS", 12);
    expect(configLowBatt.isLowBatteryMode).toBe(true);
    expect(configLowBatt.intervalMs).toBe(30000);
    expect(configLowBatt.distanceFilterMeters).toBe(50);

    // 5. Cálculo de Métricas de Eficiência
    adaptiveTelemetryEngine.reset();
    for (let i = 0; i < 60; i++) {
      // 60 segundos de corrida
      adaptiveTelemetryEngine.recordPing("ONLINE_IDLE", 1);
    }
    const metrics = adaptiveTelemetryEngine.getEfficiencyMetrics();
    expect(metrics.baselinePings).toBe(60);
    expect(metrics.actualPings).toBe(60);
  });
});
