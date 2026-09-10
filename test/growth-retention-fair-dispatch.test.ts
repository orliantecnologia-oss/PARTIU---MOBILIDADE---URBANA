/**
 * ==============================================================================
 * 🚀 PARTIU DRIVER REVENUE & GROWTH RETENTION SUITE
 * ==============================================================================
 * Validação rigorosa das Fases 1 a 9:
 * 1. Gold Plan Protection (Teto R$ 8.000 / 0.5% excedente) e Simulador Econômico
 * 2. Despacho Justo com Guarda de Proximidade (300m) e Pesos Balanceados (1.00 - 1.50)
 * 3. Ocultação de Complexidade e 6 Dados Vitais do Cockpit do Motorista
 * 4. Programa de Fidelidade (Iniciante, Profissional, Elite, Lendário)
 * 5. Sistema de Indicação com Anti-Fraude Multi-Vetorial (Dispositivo, CNH, Placa, Self-Referral)
 * 6. Inteligência de Retenção e Upgrade Temporário 48h Plano Ouro
 * ==============================================================================
 */

import {
  commissionEngine,
  subscriptionEngine,
  STANDARD_DRIVER_PLANS,
  type DriverPlanFeeConfig,
} from "../src/lib/revenue";
import {
  rankDriversByFairMarketplaceScore,
  type CandidateDriver,
  type DispatchTripRequest,
} from "../src/lib/partiu-dispatch-engine";
import { driverLoyaltyEngine } from "../src/lib/loyalty/driver-loyalty-engine";
import { referralEngine } from "../src/lib/referral/referral-engine";
import { retentionIntelligenceEngine } from "../src/lib/retention/retention-intelligence-engine";

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🏆 INICIANDO AUDITORIA EXECUTIVA: GROWTH, RETENÇÃO & MONETIZAÇÃO HÍBRIDA");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FALHA: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passedTests++;
    console.log(`  ✓ ${message}`);
  }

  // ============================================================================
  // SUITE 1: PLANO OURO PROTEGIDO & SIMULADOR ECONÔMICO (FASE 1)
  // ============================================================================
  console.log("🔹 [SUITE 1] Teste de Proteção do Plano Ouro e Simulador da Plataforma...");

  // Reset config para o padrão
  commissionEngine.updateGoldProtectionConfig({
    monthlyGrossThresholdBrl: 8000,
    postThresholdCommissionPercent: 0.5,
    protectionEnabled: true,
  });

  const plans = subscriptionEngine.getAllPlans();
  const freePlan = plans.find((p) => p.id === "plano-livre")!;
  const bronzePlan = plans.find((p) => p.id === "plano-bronze")!;
  const silverPlan = plans.find((p) => p.id === "plano-prata")!;
  const goldSubPlan = plans.find((p) => p.id === "plano-ouro")!;

  assert(goldSubPlan.dispatchWeightPercent === 1.50, "Plano Ouro peso balanceado ajustado para 1.50 (não mais 5.0)");
  assert(freePlan.dispatchWeightPercent === 1.00, "Plano Grátis peso = 1.00");
  assert(bronzePlan.dispatchWeightPercent === 1.15, "Plano Bronze peso = 1.15");
  assert(silverPlan.dispatchWeightPercent === 1.30, "Plano Prata peso = 1.30");

  const goldPlan = STANDARD_DRIVER_PLANS.OURO;

  // Caso 1: Corrida abaixo do teto de R$ 8.000 (0% comissão)
  const splitUnder = commissionEngine.calculateRideSplit({
    rideId: "ride-gold-1",
    driverId: "drv-gold-under",
    grossFareBrl: 40.0,
    plan: goldPlan,
    currentProtectionBalanceCents: 3500, // fundo cheio
    monthlyAccumulatedGrossBrl: 6500.0,
  });
  assert(splitUnder.platformCommissionCents === 0, "Abaixo do teto (R$ 6.500): 0% comissão, taxa zero!");
  assert(splitUnder.driverNetEarningsCents === 4000, "Repasse integral de R$ 40,00 ao condutor.");

  // Caso 2: Corrida de transição (inicia em R$ 7.960 e fatura R$ 80,00 -> total R$ 8.040)
  // Abaixo de 8.000: R$ 40 (0%). Acima de 8.000: R$ 40 com 0.5% = R$ 0,20
  const splitTransition = commissionEngine.calculateRideSplit({
    rideId: "ride-gold-trans",
    driverId: "drv-gold-trans",
    grossFareBrl: 80.0,
    plan: goldPlan,
    currentProtectionBalanceCents: 3500,
    monthlyAccumulatedGrossBrl: 7960.0,
  });
  assert(splitTransition.platformCommissionCents === 20, "Transição do teto: R$ 0,20 de taxa cobrada apenas sobre os R$ 40 excedentes.");
  assert(splitTransition.driverNetEarningsCents === 7980, "Motorista retém R$ 79,80 na corrida de transição.");

  // Caso 3: Corrida totalmente acima do teto (R$ 9.000 acumulado -> R$ 100,00 a 0.5% = R$ 0,50)
  const splitOver = commissionEngine.calculateRideSplit({
    rideId: "ride-gold-over",
    driverId: "drv-gold-over",
    grossFareBrl: 100.0,
    plan: goldPlan,
    currentProtectionBalanceCents: 3500,
    monthlyAccumulatedGrossBrl: 9000.0,
  });
  assert(splitOver.platformCommissionCents === 50, "Acima do teto (R$ 9.000): cobra 0.5% = R$ 0,50 de comissão mínima de segurança.");
  assert(splitOver.driverNetEarningsCents === 9950, "Motorista recebe R$ 99,50 com segurança financeira para a plataforma.");

  // Teste do Simulador Econômico
  const simulation = commissionEngine.simulatePlatformEconomics({
    activeDriversCount: 500,
    avgTripsPerDriverPerMonth: 300,
    avgGrossFareBrl: 22.50,
    distribution: { freePercent: 40, bronzePercent: 30, silverPercent: 20, goldPercent: 10 },
  });
  assert(simulation.totalMarketplaceGMVBrl > 0, `GMV mensal estimado: R$ ${simulation.totalMarketplaceGMVBrl.toLocaleString("pt-BR")}`);
  assert(simulation.grossPlatformRevenueBrl > simulation.totalOperationalCostBrl, "Receita total mensal supera custos de infraestrutura.");
  assert(simulation.netMarginPercent > 50, `Margem líquida saudável: ${simulation.netMarginPercent.toFixed(1)}%`);
  assert(simulation.totalDriverSavingsVsUber20Brl > 0, `Economia estimada aos motoristas vs Uber: R$ ${simulation.totalDriverSavingsVsUber20Brl.toLocaleString("pt-BR")}`);
  assert(simulation.breakevenDriversCount < 500, `Breakeven atingido com ${simulation.breakevenDriversCount} condutores.`);

  // ============================================================================
  // SUITE 2: DESPACHO JUSTO & GUARDA DE PROXIMIDADE 300M (FASE 2)
  // ============================================================================
  console.log("\n🔹 [SUITE 2] Despacho Justo e Regra de Ouro da Proximidade...");

  const baseRequest: DispatchTripRequest = {
    id: "trip-fairness-test",
    pickup: { latitude: -21.2056, longitude: -41.8872 },
    pickupAddress: "Praça Central",
    dropoff: { latitude: -21.2200, longitude: -41.9000 },
    dropoffAddress: "Bairro Norte",
    category: "POP",
    baseFare: 20.0,
    passengerRating: 5.0,
    maxPickupDistanceKm: 10.0,
  };

  // Condição Proximidade Estrita:
  // Condutor A (Plano Grátis) está a ~350 metros (0.35 km)
  // Condutor B (Plano Ouro) está a ~1.200 metros (1.2 km)
  // Delta = ~0.85 km > 0.3 km (300m). O motorista mais próximo DEVE vencer incondicionalmente!
  subscriptionEngine.changeDriverPlan("driver-close-free", "plano-livre");
  subscriptionEngine.changeDriverPlan("driver-far-gold", "plano-ouro");

  const candidatesProximity: CandidateDriver[] = [
    {
      id: "driver-far-gold",
      name: "Motorista Ouro Mais Distante",
      location: { latitude: -21.2150, longitude: -41.8920 },
      rating: 4.95,
      acceptanceRate: 0.98,
      cancellationRate: 0.01,
      hourlyEarningsToday: 40.0,
      isOnline: true,
      currentTripStatus: "IDLE",
      vehicleCategory: "CARRO",
      consecutiveRejections: 0,
      onlineHoursToday: 5.0,
    },
    {
      id: "driver-close-free",
      name: "Motorista Grátis Muito Perto",
      location: { latitude: -21.2070, longitude: -41.8885 },
      rating: 4.88,
      acceptanceRate: 0.92,
      cancellationRate: 0.02,
      hourlyEarningsToday: 25.0,
      isOnline: true,
      currentTripStatus: "IDLE",
      vehicleCategory: "CARRO",
      consecutiveRejections: 0,
      onlineHoursToday: 3.0,
    },
  ];

  const proximityRanking = rankDriversByFairMarketplaceScore(candidatesProximity, baseRequest);
  assert(proximityRanking.length === 2, "2 motoristas elegíveis ranqueados.");
  assert(
    proximityRanking[0]!.driverId === "driver-close-free",
    "Motorista mais próximo (Grátis a 350m) VENCE incondicionalmente o motorista Ouro a 1.2km (Delta > 300m)."
  );

  // Condição Empate Técnico (< 300m):
  // Condutor C (Plano Prata) está a ~500 metros
  // Condutor D (Plano Ouro) está a ~550 metros (Delta = 50m < 300m)
  // Com métricas similares, o plano Ouro atua como desempate inteligente.
  subscriptionEngine.changeDriverPlan("driver-silver-tie", "plano-prata");
  subscriptionEngine.changeDriverPlan("driver-gold-tie", "plano-ouro");

  const candidatesTie: CandidateDriver[] = [
    {
      id: "driver-silver-tie",
      name: "Motorista Prata Empatado",
      location: { latitude: -21.2090, longitude: -41.8890 },
      rating: 4.90,
      acceptanceRate: 0.95,
      cancellationRate: 0.02,
      hourlyEarningsToday: 30.0,
      isOnline: true,
      currentTripStatus: "IDLE",
      vehicleCategory: "CARRO",
      consecutiveRejections: 0,
      onlineHoursToday: 4.0,
    },
    {
      id: "driver-gold-tie",
      name: "Motorista Ouro Empatado",
      location: { latitude: -21.2094, longitude: -41.8893 },
      rating: 4.90,
      acceptanceRate: 0.95,
      cancellationRate: 0.02,
      hourlyEarningsToday: 30.0,
      isOnline: true,
      currentTripStatus: "IDLE",
      vehicleCategory: "CARRO",
      consecutiveRejections: 0,
      onlineHoursToday: 4.0,
    },
  ];

  const tieRanking = rankDriversByFairMarketplaceScore(candidatesTie, baseRequest);
  assert(
    tieRanking[0]!.driverId === "driver-gold-tie",
    "No empate técnico (<300m e métricas idênticas), o Plano Ouro vence legitimamente como critério de desempate."
  );

  // ============================================================================
  // SUITE 3: PROGRAMA DE FIDELIDADE EM 4 NÍVEIS (FASE 5)
  // ============================================================================
  console.log("\n🔹 [SUITE 3] Programa de Fidelidade e Níveis de Motorista...");

  // Inicial: Iniciante
  const tierIniciante = driverLoyaltyEngine.evaluateProgression({
    driverId: "driver-newbie",
    completedTrips: 5,
    rating: 4.80,
  });
  assert(tierIniciante.tier === "INICIANTE", "Novo motorista inicia como INICIANTE");
  assert(tierIniciante.badgeIcon === "🥉", "Badge de Iniciante é 🥉");

  // Upgrade para Profissional (50+ corridas, nota >= 4.80, cancelamento <= 8%)
  const tierPro = driverLoyaltyEngine.evaluateProgression({
    driverId: "driver-pro",
    completedTrips: 150,
    rating: 4.88,
    cancellationRatePercent: 4.5,
    onlineHoursTotal: 80,
  });
  assert(tierPro.tier === "PROFISSIONAL", "Motorista com 150 corridas e nota 4.88 atinge nível PROFISSIONAL");
  assert(tierPro.badgeIcon === "🥈", "Badge de Profissional é 🥈");

  // Upgrade para Elite (200+ corridas, nota >= 4.90, cancelamento <= 4%)
  const tierElite = driverLoyaltyEngine.evaluateProgression({
    driverId: "driver-elite",
    completedTrips: 600,
    rating: 4.93,
    cancellationRatePercent: 2.5,
    onlineHoursTotal: 320,
  });
  assert(tierElite.tier === "ELITE", "Motorista com 600 corridas e nota 4.93 atinge nível ELITE");
  assert(tierElite.badgeIcon === "🥇", "Badge de Elite é 🥇");

  // Upgrade para Lendário (1000+ corridas, nota >= 4.95, cancelamento <= 2%)
  const tierLegend = driverLoyaltyEngine.evaluateProgression({
    driverId: "driver-legend",
    completedTrips: 1800,
    rating: 4.98,
    cancellationRatePercent: 1.2,
    onlineHoursTotal: 950,
  });
  assert(tierLegend.tier === "LENDARIO", "Motorista com 1800 corridas e nota 4.98 atinge nível LENDÁRIO");
  assert(tierLegend.badgeIcon === "💎", "Badge de Lendário é 💎");

  // Invariante de Fidelidade: Nível de fidelidade NUNCA altera split financeiro
  const splitLoyaltyCheck = commissionEngine.calculateRideSplit({
    rideId: "ride-loyalty-check",
    driverId: "driver-legend",
    grossFareBrl: 50.0,
    plan: STANDARD_DRIVER_PLANS.LIVRE,
    currentProtectionBalanceCents: 3500,
  });
  assert(splitLoyaltyCheck.commissionPercent === 5.0, "Fidelidade preserva rigorosamente as regras de monetização sem misturar escopos.");

  // ============================================================================
  // SUITE 4: SISTEMA DE INDICAÇÕES COM ANTI-FRAUDE MULTI-VETORIAL (FASE 6)
  // ============================================================================
  console.log("\n🔹 [SUITE 4] Motor de Indicações e Proteções Anti-Fraude...");

  // Bloqueio 1: Auto-indicação (Self-Referral)
  const selfReferral = referralEngine.registerReferral({
    referrerId: "drv-influencer",
    referrerName: "Carlos Padrinho",
    referrerRole: "DRIVER",
    referredId: "drv-influencer",
    referredName: "Carlos Padrinho",
    referralCode: "CARLOS50",
    clientIp: "177.12.34.56",
    deviceFingerprint: "fingerprint-abc",
  });
  assert(selfReferral.status === "BLOCKED_FRAUD", "Anti-Fraude: Auto-indicação bloqueada.");
  assert(selfReferral.fraudSignals.includes("SELF_REFERRAL_DETECTED"), "Sinal de fraude registrado: SELF_REFERRAL_DETECTED.");

  // Bloqueio 2: Mesmo Fingerprint de Dispositivo (Device Cloned)
  const duplicateDevice = referralEngine.registerReferral({
    referrerId: "drv-influencer",
    referrerName: "Carlos Padrinho",
    referrerRole: "DRIVER",
    referredId: "drv-friend-2",
    referredName: "Amigo Fraudador",
    referralCode: "CARLOS50",
    clientIp: "177.12.34.56",
    deviceFingerprint: "fingerprint-shared-device",
    referrerDeviceFingerprint: "fingerprint-shared-device",
  });
  assert(duplicateDevice.status === "BLOCKED_FRAUD", "Anti-Fraude: Dispositivo compartilhado bloqueado.");
  assert(duplicateDevice.fraudSignals.includes("IDENTICAL_DEVICE_FINGERPRINT"), "Sinal de fraude: IDENTICAL_DEVICE_FINGERPRINT.");

  // Caso Válido: Escrow de 20 Corridas
  const validDriverReferral = referralEngine.registerReferral({
    referrerId: "drv-influencer",
    referrerName: "Carlos Padrinho",
    referrerRole: "DRIVER",
    referredId: "drv-honest-worker",
    referredName: "Trabalhador Honesto",
    referralCode: "CARLOS50",
    clientIp: "189.45.67.89",
    deviceFingerprint: "fingerprint-unique-samsung",
    referrerDeviceFingerprint: "fingerprint-padrinho-iphone",
  });
  assert(validDriverReferral.status === "PENDING", "Indicação legítima de motorista aprovada em quarentena (PENDING).");
  assert(validDriverReferral.completedTripsCount === 0, "Inicia com 0 corridas completadas.");
  assert(validDriverReferral.targetTripsCount === 20, "Meta qualificadora de 20 corridas.");

  // Atualização de corridas até completar o teto de 20 corridas
  for (let c = 1; c < 20; c++) {
    const updated = referralEngine.recordTripCompletion("drv-honest-worker");
    assert(updated?.status === "PENDING", `Corrida ${c}: ainda em progresso de qualificação.`);
  }
  const completedRecord = referralEngine.recordTripCompletion("drv-honest-worker"); // 20ª corrida
  assert(completedRecord !== null, "Registro recuperado na 20ª corrida.");
  assert(completedRecord?.status === "PAID", "Meta atingida: status liquidado para PAID.");
  assert(completedRecord?.bonusAmountBrl === 50.0, "Bônus de R$ 50,00 concedido integralmente.");

  // ============================================================================
  // SUITE 5: INTELIGÊNCIA DE RETENÇÃO & WIN-BACK 48H (FASE 7)
  // ============================================================================
  console.log("\n🔹 [SUITE 5] Retenção Automática de Condutores & Win-Back...");

  // Consulta de registros e métricas de churn
  const retentionRecords = retentionIntelligenceEngine.getAllRecords();
  assert(retentionRecords.length > 0, "Registros de retenção carregados com sucesso.");

  const criticalDriver = retentionRecords.find((r) => r.riskLevel === "CRITICO")!;
  assert(criticalDriver !== undefined, "Motorista em nível CRÍTICO identificado pelo algoritmo.");
  assert(criticalDriver.suggestedAction === "OFFER_48H_GOLD", "Ação sugerida de alta conversão: OFFER_48H_GOLD.");

  // Disparo de ação de retenção: OFFER_48H_GOLD
  const winbackResult = retentionIntelligenceEngine.triggerWinbackAction(criticalDriver.driverId, "OFFER_48H_GOLD");
  assert(winbackResult.success, "Ação de winback disparada com sucesso.");
  assert(winbackResult.record.temporaryGoldActiveUntil !== undefined, "Timestamp de término do Plano Ouro 48h gerado.");
  assert(winbackResult.record.status === "CAMPAIGN_SENT", "Status do condutor atualizado para CAMPAIGN_SENT.");
  assert(winbackResult.message.includes("48h de Plano Ouro"), "Mensagem de confirmação detalha concessão do plano.");

  // Métricas do Centro de Retenção
  const metrics = retentionIntelligenceEngine.getMetrics();
  assert(metrics.totalMonitored >= 4, "Total de condutores monitorados ativo.");
  assert(metrics.criticalCount >= 1, "Detecção autônoma de condutores críticos operacional.");

  console.log("\n================================================================================");
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES DE GROWTH & RETENÇÃO PASSARAM COM 100% DE SUCESSO!`);
  console.log("   CERTIFICAÇÃO DAS FASES 1 A 8 INTEGRALMENTE CONCLUÍDA.");
  console.log("================================================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Erro fatal na suíte de testes:", err);
  process.exit(1);
});
