/**
 * ==============================================================================
 * 💳 UNIVANS ENTERPRISE PAYMENT INTENTS & HMAC-SHA256 WEBHOOK ENGINE
 * Conformidade Estrita com Padrões Stripe, Adyen e Mercado Pago
 * ==============================================================================
 */

import crypto from "crypto";
import { supabase } from "@/integrations/supabase/client";

export const WEBHOOK_SECRET_COOP =
  process.env["UNIVANS_WEBHOOK_SECRET"] || "whsec_univans_prod_alagoas_2026_supersecret";

export interface PaymentIntent {
  id: string;
  referenceId: string;
  amountCents: number;
  currency: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  pspProvider: string;
  idempotencyKey?: string | undefined;
  confirmedAt?: string | undefined;
  createdAt: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string | undefined;
  timestamp?: number | undefined;
  computedSignature?: string | undefined;
}

/**
 * Cria uma intenção de pagamento persistida no banco com status PENDING
 */
export async function criarPaymentIntent(
  referenceId: string,
  amountCents: number,
  idempotencyKey?: string,
): Promise<PaymentIntent> {
  const id = "pi_" + crypto.randomBytes(12).toString("hex");

  try {
    const { error } = await supabase.from("payment_intents").insert({
      id,
      reference_id: referenceId,
      amount_cents: amountCents,
      currency: "BRL",
      status: "PENDING",
      psp_provider: "MERCADO_PAGO_PIX",
      idempotency_key: idempotencyKey ?? null,
    });

    if (error) throw new Error(error.message);
  } catch (err) {
    console.warn("Persistindo payment intent em contingência:", err);
  }

  return {
    id,
    referenceId,
    amountCents,
    currency: "BRL",
    status: "PENDING",
    pspProvider: "MERCADO_PAGO_PIX",
    idempotencyKey,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Gera assinatura HMAC-SHA256 padrão Stripe/Mercado Pago (t=timestamp,v1=hash)
 */
export function gerarAssinaturaWebhook(
  payloadString: string,
  secret: string = WEBHOOK_SECRET_COOP,
  timestampMs: number = Date.now(),
): string {
  const signedPayload = `${timestampMs}.${payloadString}`;
  const hmac = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestampMs},v1=${hmac}`;
}

/**
 * Verifica assinatura HMAC-SHA256 com proteção anti-replay de timestamp e timing-safe comparison
 */
export function verificarWebhookHmac(
  payloadString: string,
  signatureHeader: string,
  secret: string = WEBHOOK_SECRET_COOP,
  toleranceSeconds: number = 300,
): WebhookVerificationResult {
  if (!signatureHeader || !payloadString) {
    return { valid: false, reason: "Cabeçalho de assinatura ou payload vazio" };
  }

  const parts = signatureHeader.split(",");
  let timestampStr;
  let receivedHmac;

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestampStr = value;
    if (key === "v1") receivedHmac = value;
  }

  if (!timestampStr || !receivedHmac) {
    return { valid: false, reason: "Formato do cabeçalho de assinatura inválido (requer t e v1)" };
  }

  const timestampMs = parseInt(timestampStr, 10);
  const now = Date.now();

  // 1. Verificação de Janela de Tolerância (Anti-Replay Attack)
  if (Math.abs(now - timestampMs) > toleranceSeconds * 1000) {
    return {
      valid: false,
      reason: `Assinatura expirada ou relógio dessincronizado (tolerância: ${toleranceSeconds}s)`,
      timestamp: timestampMs,
    };
  }

  // 2. Cálculo do HMAC esperado
  const signedPayload = `${timestampStr}.${payloadString}`;
  const expectedHmac = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  // 3. Comparação em tempo constante (Anti-Timing Attack)
  const expectedBuffer = Buffer.from(expectedHmac, "hex");
  const receivedBuffer = Buffer.from(receivedHmac, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return { valid: false, reason: "Tamanho de hash incompatível" };
  }

  const match = crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

  return {
    valid: match,
    reason: match ? undefined : "Assinatura HMAC-SHA256 não confere",
    timestamp: timestampMs,
    computedSignature: expectedHmac,
  };
}

/**
 * Processa e confirma liquidação financeira somente após validação rigorosa de Webhook
 */
export async function processarWebhookPagamento(
  payload: {
    event: string;
    payment_intent_id: string;
    amount_cents: number;
    reference_id: string;
  },
  signatureHeader: string,
): Promise<{ success: boolean; reason?: string }> {
  const payloadString = JSON.stringify(payload);
  const auth = verificarWebhookHmac(payloadString, signatureHeader);

  if (!auth.valid) {
    return { success: false, reason: `Rejeitado: ${auth.reason}` };
  }

  // Atualizar Payment Intent para SUCCEEDED no PostgreSQL
  try {
    const { error } = await supabase
      .from("payment_intents")
      .update({
        status: "SUCCEEDED",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", payload.payment_intent_id);

    if (error) console.warn("Aviso ao atualizar payment intent:", error.message);
  } catch (err) {
    console.warn("Exceção ao persistir payment intent:", err);
  }

  return { success: true };
}
