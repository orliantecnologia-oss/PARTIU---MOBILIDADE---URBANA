/**
 * ==============================================================================
 * 🔐 PARTIU DELIVERY DUAL PIN SECURITY SUITE (v4.0)
 * ==============================================================================
 * Testes rigorosos de certificação para o fluxo de segurança "Duplo PIN":
 * 1. Geração de PIN 1 (Coleta) e PIN 2 (Entrega) de 4 dígitos.
 * 2. Validação cega e Inviolabilidade da Cadeia de Custódia (FSM).
 * 3. Bloqueio estrito de entrega antes da coleta (Dropoff before Pickup).
 * 4. Defesa Antifraude e Brute Force (bloqueio após 3 tentativas consecutivas).
 * 5. Geração de Link de Compartilhamento via WhatsApp para o Destinatário.
 * ==============================================================================
 */

import { describe, test, testAsync, expect } from "./test-harness.mjs";
import {
  deliveryDualPinService,
  generateSecurePin,
} from "../src/services/DeliveryDualPinService.ts";

describe("29. PARTIU DELIVERY — DUAL PIN SECURITY & CUSTODY CHAIN ENGINE", () => {
  test("Geração Numérica de 4 Dígitos: PINs seguros entre 1000 e 9999", () => {
    for (let i = 0; i < 50; i++) {
      const pin = generateSecurePin();
      expect(pin.length).toBe(4);
      const num = parseInt(pin, 10);
      expect(num >= 1000 && num <= 9999).toBe(true);
      expect(/^\d{4}$/.test(pin)).toBe(true);
    }
  });

  test("Geração Dupla: PIN de Coleta e PIN de Entrega devem ser independentes", () => {
    const deliveryId = "deliv-test-dual-gen-1";
    const session = deliveryDualPinService.initDeliverySession(
      deliveryId,
      "Maria Silva",
      "João Souza",
      "5522999887766"
    );

    expect(session.deliveryId).toBe(deliveryId);
    expect(session.pickupPin.length).toBe(4);
    expect(session.dropoffPin.length).toBe(4);
    expect(session.pickupVerified).toBe(false);
    expect(session.dropoffVerified).toBe(false);
    expect(session.state).toBe("PENDING_PICKUP");
  });

  testAsync("Validação Cega de Coleta (PIN 1): Autoriza início do transporte e avança FSM", async () => {
    const deliveryId = "deliv-test-pickup-ok";
    const session = deliveryDualPinService.initDeliverySession(
      deliveryId,
      "Remetente Ana",
      "Destinatário Pedro",
      "552299881122",
      "4231",
      "8765"
    );

    // Motorista digita PIN 1 correto
    const result = await deliveryDualPinService.validatePickupPin(deliveryId, "4231", "drv-101");
    expect(result.success).toBe(true);
    expect(result.state).toBe("IN_TRANSIT");

    const updatedSession = deliveryDualPinService.getSession(deliveryId);
    expect(updatedSession?.pickupVerified).toBe(true);
    expect(updatedSession?.state).toBe("IN_TRANSIT");
  });

  testAsync("Inviolabilidade da Cadeia de Custódia: Dropoff BLOQUEADO antes da Coleta", async () => {
    const deliveryId = "deliv-test-custody-invariant";
    const session = deliveryDualPinService.initDeliverySession(
      deliveryId,
      "Remetente Ana",
      "Destinatário Pedro",
      "552299881122",
      "3311",
      "7799"
    );

    // Motorista tenta pular a coleta e validar diretamente o PIN de entrega
    const result = await deliveryDualPinService.validateDropoffPin(deliveryId, "7799", "drv-101");
    expect(result.success).toBe(false);
    expect(result.message.includes("coleta")).toBe(true);

    const updatedSession = deliveryDualPinService.getSession(deliveryId);
    expect(updatedSession?.dropoffVerified).toBe(false);
    expect(updatedSession?.state).toBe("PENDING_PICKUP");
  });

  testAsync("Validação de Entrega (PIN 2): Sucesso conclui a viagem e avança para DELIVERED", async () => {
    const deliveryId = "deliv-test-full-lifecycle";
    deliveryDualPinService.initDeliverySession(
      deliveryId,
      "Remetente Carla",
      "Destinatário Roberto",
      "552299881122",
      "1234",
      "5678"
    );

    // 1. Valida Coleta
    const pickupRes = await deliveryDualPinService.validatePickupPin(deliveryId, "1234", "drv-101");
    expect(pickupRes.success).toBe(true);

    // 2. Valida Entrega
    const dropoffRes = await deliveryDualPinService.validateDropoffPin(deliveryId, "5678", "drv-101");
    expect(dropoffRes.success).toBe(true);
    expect(dropoffRes.state).toBe("DELIVERED");

    const finishedSession = deliveryDualPinService.getSession(deliveryId);
    expect(finishedSession?.dropoffVerified).toBe(true);
    expect(finishedSession?.state).toBe("DELIVERED");
  });

  testAsync("Defesa Antifraude / Brute Force: Bloqueia sessão após 3 erros consecutivos", async () => {
    const deliveryId = "deliv-test-brute-force";
    deliveryDualPinService.initDeliverySession(
      deliveryId,
      "Remetente",
      "Destinatário",
      "552299999999",
      "5555",
      "9999"
    );

    // Tentativa 1 incorreta
    const attempt1 = await deliveryDualPinService.validatePickupPin(deliveryId, "0000", "drv-fraud");
    expect(attempt1.success).toBe(false);
    expect(attempt1.remainingAttempts).toBe(2);
    expect(attempt1.locked).toBe(false);

    // Tentativa 2 incorreta
    const attempt2 = await deliveryDualPinService.validatePickupPin(deliveryId, "1111", "drv-fraud");
    expect(attempt2.success).toBe(false);
    expect(attempt2.remainingAttempts).toBe(1);
    expect(attempt2.locked).toBe(false);

    // Tentativa 3 incorreta -> BLOQUEIO
    const attempt3 = await deliveryDualPinService.validatePickupPin(deliveryId, "2222", "drv-fraud");
    expect(attempt3.success).toBe(false);
    expect(attempt3.remainingAttempts).toBe(0);
    expect(attempt3.locked).toBe(true);

    // Tentativa 4 (mesmo que com o PIN correto) deve ser rejeitada por bloqueio
    const attempt4 = await deliveryDualPinService.validatePickupPin(deliveryId, "5555", "drv-fraud");
    expect(attempt4.success).toBe(false);
    expect(attempt4.locked).toBe(true);
  });

  test("Compartilhamento WhatsApp: Gera deep link codificado com telefone e PIN 2", () => {
    const url = deliveryDualPinService.generateWhatsAppPinShareUrl({
      recipientPhone: "(22) 99887-6655",
      recipientName: "Lucas Ferreira",
      dropoffPin: "4829",
      trackingUrl: "https://partiu.app/tracking/deliv-999",
    });

    expect(url.startsWith("https://api.whatsapp.com/send?phone=")).toBe(true);
    expect(url.includes("5522998876655")).toBe(true);
    expect(url.includes("4829")).toBe(true);
    expect(url.includes("Lucas%20Ferreira") || url.includes("Lucas+Ferreira") || decodeURIComponent(url).includes("Lucas Ferreira")).toBe(true);
    expect(decodeURIComponent(url).includes("PIN de Entrega: *4829*")).toBe(true);
  });
});
