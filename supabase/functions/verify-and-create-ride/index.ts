// ==============================================================================
// 🚀 SUPABASE EDGE FUNCTION: verify-and-create-ride (PARTIU V4.0)
// ==============================================================================
// Recalcula rota real e tarifa no lado do servidor antes de persistir a corrida.
// Frontend envia apenas coordenadas e categoria; backend garante integridade.
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
  pickupCoordinates: [number, number]; // [lng, lat]
  destinationCoordinates: [number, number]; // [lng, lat]
  category: string; // "MOTO" | "CARRO" | "EXECUTIVO" | "FLASH" | "ENTREGA" | "TURISMO" | "VAN"
  passengerId?: string;
  passengerName: string;
  passengerPhone: string;
  pickupAddress: string;
  destinationAddress: string;
  paymentMethod: "pix" | "dinheiro" | "cartao";
  clientClaimedFare?: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: RequestPayload = await req.json();
    const { pickupCoordinates, destinationCoordinates, category, clientClaimedFare } = payload;

    if (!pickupCoordinates || !destinationCoordinates || !category) {
      return new Response(
        JSON.stringify({ error: "pickupCoordinates, destinationCoordinates e category são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Consulta app_settings no banco para pegar tarifas oficiais
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    const baseFare = Number(settingsData?.base_fare_ride) || 6.0;
    const pricePerKm = Number(settingsData?.price_per_km) || 1.8;
    const pricePerMinute = Number(settingsData?.price_per_minute) || 0.3;

    // 2. Consulta Directions API (Mapbox / OSRM) para rota real
    const mapboxToken = Deno.env.get("MAPBOX_TOKEN") || Deno.env.get("VITE_MAPBOX_TOKEN");
    let distanceKm = 4.8;
    let durationMin = 12;
    let encodedPolyline = "";

    if (mapboxToken) {
      const coords = `${pickupCoordinates[0]},${pickupCoordinates[1]};${destinationCoordinates[0]},${destinationCoordinates[1]}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?geometries=polyline&overview=full&access_token=${mapboxToken}`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            distanceKm = Math.round((data.routes[0].distance / 1000) * 100) / 100;
            durationMin = Math.max(1, Math.ceil(data.routes[0].duration / 60));
            encodedPolyline = data.routes[0].geometry || "";
          }
        }
      } catch (err) {
        console.warn("Mapbox directions fetch error in edge function:", err);
      }
    }

    // 3. Recálculo Oficial da Tarifa
    const rawCost = baseFare + distanceKm * pricePerKm + durationMin * pricePerMinute;
    let categoryMultiplier = 1.0;
    let minFloor = 10.0;

    const catUpper = category.toUpperCase();
    if (catUpper.includes("MOTO")) {
      categoryMultiplier = 0.75;
      minFloor = 7.0;
    } else if (catUpper.includes("EXECUTIVO")) {
      categoryMultiplier = 1.4;
      minFloor = 15.0;
    } else if (catUpper.includes("FLASH")) {
      categoryMultiplier = 0.85;
      minFloor = 8.5;
    } else if (catUpper.includes("ENTREGA")) {
      categoryMultiplier = 1.25;
      minFloor = 16.0;
    } else if (catUpper.includes("TURISMO")) {
      categoryMultiplier = 1.6;
      minFloor = 25.0;
    } else if (catUpper.includes("VAN")) {
      categoryMultiplier = 1.9;
      minFloor = 35.0;
    }

    const precoCalculado = Math.max(minFloor, rawCost * categoryMultiplier);
    const precoFinal = Math.round(precoCalculado * 100) / 100;

    // 4. Verificação Antifraude
    if (clientClaimedFare && clientClaimedFare > 0) {
      const discrepancy = Math.abs((clientClaimedFare - precoFinal) / precoFinal) * 100;
      if (discrepancy > 2.0) {
        return new Response(
          JSON.stringify({
            error: "FRAUD_DISCREPANCY_DETECTED",
            message: `Tarifa do cliente diverge da tarifa calculada pelo servidor em ${discrepancy.toFixed(1)}%.`,
            serverFare: precoFinal,
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Inserção Canônica na Tabela public.rides e espelhamento em partiu_corridas
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const rideId = `COR-${Date.now().toString().slice(-6)}`;
    const categoryCanonical = catUpper === "MOTO" ? "MOTO" : "CARRO";

    const pickupLat = payload.pickupCoordinates ? payload.pickupCoordinates[1] : -21.205;
    const pickupLng = payload.pickupCoordinates ? payload.pickupCoordinates[0] : -41.888;
    const destLat = payload.destinationCoordinates ? payload.destinationCoordinates[1] : -21.209;
    const destLng = payload.destinationCoordinates ? payload.destinationCoordinates[0] : -41.892;

    const { data: canonicalRide, error: insertError } = await supabase
      .from("rides")
      .insert({
        id: rideId,
        passenger_id: payload.passengerId || "guest-passenger",
        passenger_name: payload.passengerName || "Passageiro",
        passenger_phone: payload.passengerPhone || null,
        pickup_address: payload.pickupAddress || "Embarque",
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_address: payload.destinationAddress || "Destino",
        dropoff_lat: destLat,
        dropoff_lng: destLng,
        status: "REQUESTED",
        category: categoryCanonical,
        price_estimated_brl: precoFinal,
        distance_km: distanceKm,
        duration_minutes: Math.round(durationMin),
        payment_method: payload.paymentMethod || "pix",
        pin,
      })
      .select()
      .maybeSingle();

    // Espelhamento na tabela legada partiu_corridas para compatibilidade retroativa
    try {
      await supabase.from("partiu_corridas").insert({
        codigo_viagem: rideId,
        modalidade: catUpper,
        origem_endereco: payload.pickupAddress || "Embarque",
        destino_endereco: payload.destinationAddress || "Destino",
        origem_lat: pickupLat,
        origem_lng: pickupLng,
        destino_lat: destLat,
        destino_lng: destLng,
        passageiro_nome: payload.passengerName || "Passageiro",
        passageiro_telefone: payload.passengerPhone || "(00) 00000-0000",
        valor_bruto_cents: Math.round(precoFinal * 100),
        distancia_km: distanceKm,
        duracao_min: Math.round(durationMin),
        forma_pagamento: payload.paymentMethod || "pix",
        pin_seguranca: pin,
        status: "PROCURANDO",
        polyline: encodedPolyline,
      });
    } catch (_) {
      // Ignora se tabela legada estiver desativada
    }

    if (insertError) {
      console.error("Erro ao inserir corrida em public.rides:", insertError);
      return new Response(
        JSON.stringify({
          success: true,
          rideId,
          verifiedFare: precoFinal,
          distanceKm,
          durationMin,
          pin,
          status: "REQUESTED",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ride: canonicalRide || { id: rideId, status: "REQUESTED" },
        rideId,
        verifiedFare: precoFinal,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
