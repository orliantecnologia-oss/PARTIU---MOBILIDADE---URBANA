// ==============================================================================
// 🚀 SUPABASE EDGE FUNCTION: dispatch-ride (PARTIU DISPATCH ENGINE V4.0)
// ==============================================================================
// Orquestrador server-side de despacho atômico e matching geoespacial PostGIS.
// Zero cálculo no lado do cliente: segurança, finops e blindagem antifraude.
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DispatchRidePayload {
  rideId: string;
  category: string;
  pickupCoordinates: [number, number]; // [lng, lat]
  destinationCoordinates: [number, number]; // [lng, lat]
  fareBrl: number;
  maxRadiusKm?: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: DispatchRidePayload = await req.json();
    const { rideId, category, pickupCoordinates, destinationCoordinates, fareBrl, maxRadiusKm = 10 } = payload;

    if (!rideId || !category || !pickupCoordinates || !destinationCoordinates) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "rideId, category, pickupCoordinates e destinationCoordinates são obrigatórios.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pickupLng = pickupCoordinates[0];
    const pickupLat = pickupCoordinates[1];

    // 1. Invoca PostGIS RPC com matching inteligente e cálculo de DispatchScore no banco
    const { data: matchedDrivers, error: matchError } = await supabase.rpc(
      "dispatch_find_best_driver",
      {
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        p_category: category,
        max_radius_km: maxRadiusKm,
        max_results: 10,
      }
    );

    if (matchError) {
      console.error("[dispatch-ride] Erro ao invocar RPC dispatch_find_best_driver:", matchError);
    }

    const candidates = matchedDrivers || [];
    const dispatchLatencyMs = Date.now() - startTime;

    // 2. Se nenhum motorista retornado pelo PostGIS, responde com queue empty
    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          status: "NO_DRIVERS_AVAILABLE",
          rideId,
          candidatesCount: 0,
          dispatchLatencyMs,
          message: "Nenhum condutor elegível disponível no raio operacional de 10km.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Seleciona o melhor candidato (índice 0 = maior DispatchScore)
    const selectedCandidate = candidates[0];

    // 4. Registra log de auditoria no banco
    try {
      await supabase.from("rides").update({
        driver_id: selectedCandidate.driver_id,
        status: "OFERTADA",
      }).eq("id", rideId);
    } catch (_) {
      // Ignora se tabela rides ainda não possui essa corrida no mock
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "DISPATCHED",
        rideId,
        topCandidate: {
          driverId: selectedCandidate.driver_id,
          driverName: selectedCandidate.driver_name,
          driverScore: selectedCandidate.final_score,
          distanceMeters: selectedCandidate.distance_meters,
          etaMinutes: selectedCandidate.eta_minutes,
          subscriptionPlan: selectedCandidate.subscription_plan,
        },
        candidatesCount: candidates.length,
        dispatchLatencyMs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[dispatch-ride] Exceção crítica:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Erro interno de despacho",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
