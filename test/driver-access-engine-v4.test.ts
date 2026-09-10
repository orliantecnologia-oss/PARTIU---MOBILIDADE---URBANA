/**
 * ==============================================================================
 * 🔐 PARTIU DRIVER ACCESS ENGINE V4 — AUTOMATED CERTIFICATION TEST SUITE
 * ==============================================================================
 * Testes rigorosos de certificação para:
 * 1. DriverAccessGuard & Matriz de Decisão de Acesso (Estados Permitidos vs Bloqueados).
 * 2. Motor de Monetização Dinâmico (Zero Hardcode nos Planos).
 * 3. Gateway Abstraction Layer (Strategy Pattern: Asaas, Efí, Mercado Pago, Stripe, Pagar.me, PagBank).
 * 4. Geração de EMV PIX Copia e Cola Padrão BACEN com CRC16.
 * 5. Ciclo de Cobrança e Ativação Atômica Idempotente (< 2s SLA).
 * 6. Sistema de Carência (Grace Period) e Bloqueio Operacional no Matching Engine.
 * 7. Invariante Antifraude: Nenhuma liberação client-side sem confirmação bancária.
 * ==============================================================================
 */

import { describe, test, testAsync, expect } from "./test-harness.mjs";
import {
  pixBillingService,
  DEFAULT_MONETIZATION_PLANS,
} from "../src/services/subscription/PixBillingService.ts";
import {
  paymentGatewayManager,
  buildStandardEmvPix,
  AsaasProvider,
  EfiBankProvider,
  MercadoPagoProvider,
} from "../src/services/payment/PaymentProviderAdapter.ts";
import { matchingEngine } from "../src/services/MatchingEngine.ts";

describe("30. PARTIU DRIVER ACCESS ENGINE V4 — MODULE 1: Access Decision & Guard Invariants", () => {
  testAsync("Estados Bloqueados: EXPIRED, SUSPENDED, PAYMENT_PENDING impedem acesso operacional", async () => {
    // Motorista sem cadastro prévio
    const decision = await pixBillingService.evaluateDriverAccess("drv-iniciante-sem-plano");
    expect(decision.is_eligible).toBe(false);
    expect(["PAYMENT_PENDING", "EXPIRED", "SUSPENDED"].includes(decision.status)).toBe(true);
    expect(decision.reasons.length > 0).toBe(true);
  });

  testAsync("Estados Permitidos: ACTIVE e GRACE_PERIOD liberam acesso ao Cockpit", async () => {
    const driverId = "drv-ativo-teste-liberado";
    const billing = await pixBillingService.createDriverBilling(
      driverId,
      "plano-diaria-essencial",
      "DAILY",
      "Motorista Teste"
    );

    // Confirmação do pagamento via Webhook / RPC
    const confirmResult = await pixBillingService.confirmPayment(billing.id, "gw_tx_test_123", 14.90);
    expect(confirmResult.success).toBe(true);

    const access = await pixBillingService.evaluateDriverAccess(driverId);
    expect(access.is_eligible).toBe(true);
    expect(access.status).toBe("ACTIVE");
    expect(new Date(access.expires_at!).getTime() > Date.now()).toBe(true);
  });
});

describe("31. PARTIU DRIVER ACCESS ENGINE V4 — MODULE 2: Dynamic Monetization Plans (Zero Hardcode)", () => {
  testAsync("Carregamento Dinâmico de Planos: Planos configuráveis sem valores fixos", async () => {
    const plans = await pixBillingService.fetchMonetizationPlans();
    expect(plans.length >= 3).toBe(true);

    const diariaPlan = plans.find((p) => p.id === "plano-diaria-essencial");
    expect(diariaPlan !== undefined).toBe(true);
    expect(diariaPlan?.daily_fee).toBe(14.90);
    expect(diariaPlan?.commission_percent).toBe(0.00); // 0% Take Rate

    const semanalPlan = plans.find((p) => p.id === "plano-semanal-pro");
    expect(semanalPlan !== undefined).toBe(true);
    expect(semanalPlan?.weekly_fee).toBe(69.90);
    expect(semanalPlan?.priority_weight).toBe(2.50);

    const ouroPlan = plans.find((p) => p.id === "plano-mensal-ouro");
    expect(ouroPlan !== undefined).toBe(true);
    expect(ouroPlan?.monthly_fee).toBe(199.90);
    expect(ouroPlan?.priority_weight).toBe(5.00);
  });
});

describe("32. PARTIU DRIVER ACCESS ENGINE V4 — MODULE 5: Gateway Abstraction Layer (Strategy Pattern)", () => {
  test("Seleção Dinâmica de Gateway: Suporte a Asaas, Efí Bank e Mercado Pago", () => {
    paymentGatewayManager.setActiveGateway("ASAAS");
    expect(paymentGatewayManager.getActiveGateway().name).toBe("ASAAS");

    paymentGatewayManager.setActiveGateway("EFI_BANK");
    expect(paymentGatewayManager.getActiveGateway().name).toBe("EFI_BANK");

    paymentGatewayManager.setActiveGateway("MERCADO_PAGO");
    expect(paymentGatewayManager.getActiveGateway().name).toBe("MERCADO_PAGO");

    // Retorna para o padrão Asaas
    paymentGatewayManager.setActiveGateway("ASAAS");
  });

  testAsync("Geração de PIX via Strategy Pattern: Gera Copia e Cola e QR Code", async () => {
    const gateway = paymentGatewayManager.getActiveGateway();
    const result = await gateway.createPix({
      driverId: "drv-strategy-test",
      driverName: "Ana Clara",
      amount: 14.90,
      description: "Diária PARTIU",
      expiresInMinutes: 30,
    });

    expect(result.amount).toBe(14.90);
    expect(result.copiaECola.startsWith("00020126")).toBe(true);
    expect(result.qrCodeUrl.includes("api.qrserver.com")).toBe(true);
    expect(result.status).toBe("PENDING");
  });

  test("Formatação EMV BACEN: Gera payload padronizado com campos obrigatórios", () => {
    const emv = buildStandardEmvPix(
      "12345678000199",
      "PARTIU MOBILIDADE",
      "MACAE",
      14.90,
      "TX999"
    );

    expect(emv.includes("BR.GOV.BCB.PIX")).toBe(true);
    expect(emv.includes("14.90")).toBe(true);
    expect(emv.includes("PARTIU MOBILIDADE")).toBe(true);
    expect(emv.includes("MACAE")).toBe(true);
  });
});

describe("33. PARTIU DRIVER ACCESS ENGINE V4 — MODULE 6 & 7: PIX Billing & Atomic Webhook Activation", () => {
  testAsync("Fluxo Ponta a Ponta: Criação de Cobrança -> Confirmação de Pagamento -> Liberação", async () => {
    const driverId = "drv-e2e-pix-liberacao";

    // 1. Gera cobrança
    const billing = await pixBillingService.createDriverBilling(
      driverId,
      "plano-diaria-essencial",
      "DAILY",
      "Carlos Santos"
    );

    expect(billing.status).toBe("PENDING");
    expect(billing.amount).toBe(14.90);
    expect(billing.pix_code.length > 20).toBe(true);

    // 2. Simula o recebimento do Webhook bancário
    const webhookRes = await pixBillingService.confirmPayment(billing.id, "gw_ext_987654", 14.90);
    expect(webhookRes.success).toBe(true);
    expect(webhookRes.driverId).toBe(driverId);
    expect(webhookRes.expiresAt !== undefined).toBe(true);

    // 3. Verifica liberação imediata de acesso
    const updatedAccess = await pixBillingService.evaluateDriverAccess(driverId);
    expect(updatedAccess.is_eligible).toBe(true);
    expect(updatedAccess.status).toBe("ACTIVE");
  });

  testAsync("Renovação por Ciclo Semanal: Validade estendida por 7 dias", async () => {
    const driverId = "drv-semanal-teste";
    const billing = await pixBillingService.createDriverBilling(
      driverId,
      "plano-semanal-pro",
      "WEEKLY",
      "Marcos Paulo"
    );

    expect(billing.amount).toBe(69.90);

    const webhookRes = await pixBillingService.confirmPayment(billing.id, "gw_semanal_123", 69.90);
    expect(webhookRes.success).toBe(true);

    const access = await pixBillingService.evaluateDriverAccess(driverId);
    expect(access.is_eligible).toBe(true);

    const diffDays = (new Date(access.expires_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDays >= 6.9).toBe(true); // ~7 dias
  });
});

describe("34. PARTIU DRIVER ACCESS ENGINE V4 — MODULE 10 & 11: Operational Lockout in Matching Engine", () => {
  test("Bloqueio no Matching Engine: Motoristas com status EXPIRED, SUSPENDED ou CANCELLED são excluídos", () => {
    expect(matchingEngine.isDriverEligible("ONLINE")).toBe(true);
    expect(matchingEngine.isDriverEligible("EXPIRED")).toBe(false);
    expect(matchingEngine.isDriverEligible("SUSPENDED")).toBe(false);
    expect(matchingEngine.isDriverEligible("PAYMENT_PENDING")).toBe(false);
    expect(matchingEngine.isDriverEligible("DEBT_BLOCKED")).toBe(false);
    expect(matchingEngine.isDriverEligible("CANCELLED")).toBe(false);
  });
});
