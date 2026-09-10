// ==============================================================================
// 💳 SUPABASE EDGE FUNCTION: payment-webhook (PARTIU DRIVER ACCESS ENGINE V4)
// ==============================================================================
// Processador oficial de webhooks bancários para liberação autônoma de condutores.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();

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
