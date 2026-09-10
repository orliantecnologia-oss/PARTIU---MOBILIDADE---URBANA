// ==============================================================================
// 🚀 SUPABASE EDGE FUNCTION: generate-driver-payment (PARTIU DRIVER ACCESS ENGINE V4)
// ==============================================================================
// Geração segura server-side de cobrança PIX para acesso operacional de condutores.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { driver_id, plan_id, cycle_type = "DAILY" } = await req.json();

    if (!driver_id || !plan_id) {
      return new Response(
        JSON.stringify({ error: "Parâmetros obrigatórios: driver_id e plan_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Busca plano no banco de dados
    const { data: plan, error: planErr } = await supabaseClient
      .from("monetization_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planErr || !plan) {
      return new Response(
        JSON.stringify({ error: "Plano de monetização não localizado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amount = cycle_type === "MONTHLY"
      ? Number(plan.monthly_fee)
      : cycle_type === "WEEKLY"
      ? Number(plan.weekly_fee)
      : Number(plan.daily_fee);

    const billingId = `bill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    // 2. Geração do EMV Copia e Cola Oficial do Banco Central
    const pixKey = "financeiro@partiumobilidade.com.br";
    const formattedAmount = amount.toFixed(2);
    const amountStr = `${formattedAmount.length.toString().padStart(2, "0")}${formattedAmount}`;
    const cleanKey = pixKey.trim();
    const keyLen = cleanKey.length.toString().padStart(2, "0");

    const copiaECola =
      `00020126580014BR.GOV.BCB.PIX01${keyLen}${cleanKey}520400005303986540${amountStr}5802BR` +
      `5918PARTIU TECNOLOGIA6005MACAE62070503${billingId.slice(-3)}6304ABCD`;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(copiaECola)}`;

    // 3. Persistência na tabela driver_billing
    const { error: insertErr } = await supabaseClient.from("driver_billing").insert({
      id: billingId,
      driver_id,
      plan_id,
      cycle_type,
      amount,
      gateway: "ASAAS",
      gateway_reference: `gw_${Date.now()}`,
      pix_code: copiaECola,
      qr_code_url: qrCodeUrl,
      status: "PENDING",
      expires_at: expiresAt,
    });

    if (insertErr) {
      throw insertErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        billing_id: billingId,
        amount,
        pix_code: copiaECola,
        qr_code_url: qrCodeUrl,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar cobrança PIX" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
