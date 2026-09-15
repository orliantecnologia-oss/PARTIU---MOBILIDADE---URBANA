// ==============================================================================
// 💳 SUPABASE EDGE FUNCTION: payment-webhook (PARTIU DRIVER ACCESS ENGINE V4)
// ==============================================================================
// Processador oficial de webhooks bancários para liberação autônoma de condutores.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-signature, x-webhook-secret, x-webhook-token, asaas-access-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Empty request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Validação de Segurança contra Falsificação de Webhook (HMAC / Shared Secret)
    const webhookSecret =
      Deno.env.get("PAYMENT_WEBHOOK_SECRET") || Deno.env.get("WEBHOOK_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("authorization") || "";
    const tokenHeader =
      req.headers.get("x-webhook-secret") ||
      req.headers.get("x-webhook-token") ||
      req.headers.get("asaas-access-token") ||
      "";
    const signatureHeader =
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-signature") ||
      "";
    const apikeyHeader = req.headers.get("apikey") || "";

    let isAuthorized = false;

    // 1.1 Autorização por Service Role Key interna
    if (
      serviceRoleKey &&
      (authHeader === `Bearer ${serviceRoleKey}` || apikeyHeader === serviceRoleKey)
    ) {
      isAuthorized = true;
    }

    // 1.2 Autorização por Token ou Assinatura Criptográfica HMAC
    if (!isAuthorized && webhookSecret) {
      if (tokenHeader === webhookSecret || authHeader === `Bearer ${webhookSecret}`) {
        isAuthorized = true;
      } else if (signatureHeader) {
        try {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(webhookSecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
          );
          const cleanSig = signatureHeader.replace(/^sha256=/, "").trim();
          const sigBytes = new Uint8Array(
            cleanSig.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
          );
          if (sigBytes.length > 0) {
            isAuthorized = await crypto.subtle.verify(
              "HMAC",
              key,
              sigBytes,
              encoder.encode(rawBody)
            );
          }
        } catch {
          isAuthorized = false;
        }
      }
    } else if (!webhookSecret && !serviceRoleKey) {
      console.warn("⚠️ [payment-webhook] AVISO: PAYMENT_WEBHOOK_SECRET não configurado.");
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized: Assinatura ou token do webhook inválido ou ausente.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = JSON.parse(rawBody);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extrai identificadores comuns dos gateways (Asaas, Efí, Mercado Pago)
    const eventType = body.event || body.type || body.action || "PAYMENT_CONFIRMED";
    const payment = body.payment || body.data || body;
    const gatewayReference = payment.id || body.id || payment.txid || body.txid;
    const billingId = payment.externalReference || body.externalReference || body.billing_id;
    const amount = Number(payment.value || payment.transaction_amount || body.amount || 0);

    const validEvents = [
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECEIVED",
      "PIX_RECEIVED",
      "PIX_CONFIRMED",
      "PAYMENT_APPROVED",
      "PAYMENT_SETTLED",
    ];

    if (!validEvents.includes(eventType)) {
      return new Response(
        JSON.stringify({ message: `Evento ignorado: ${eventType}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chama a RPC atômica idempotente no PostgreSQL
    const { data, error } = await supabaseClient.rpc("fn_process_driver_pix_confirmation", {
      p_billing_id: billingId || gatewayReference,
      p_gateway_reference: gatewayReference,
      p_amount: amount > 0 ? amount : null,
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro no processamento do webhook" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
