/**
 * ==============================================================================
 * 🚕 PARTIU — HOOK USE RIDE ESTIMATION (CORE PRE-RIDE & PRICING ENGINE)
 * ==============================================================================
 * Conecta o fluxo de Pré-Corrida diretamente aos serviços Mapbox e Supabase:
 * 1. Consulta Mapbox Directions API (driving-traffic) com vias reais.
 * 2. Extrai distanceMeters e durationSeconds.
 * 3. Injeta no PricingService (lendo app_settings no Supabase).
 * 4. Monta o RideRequestPayload imutável com a polyline encriptada e Geography Point.
 * ==============================================================================
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { directionsService, type RouteResult } from "@/services/DirectionsService";
import {
  pricingService,
  type SupportedVehicleCategory,
  type ItemizedQuote,
} from "@/services/PricingService";
import { supabaseService } from "@/services/SupabaseService";
import type { RideRequestPayload } from "@/types/core-ride-logistics";
import { toPostGISPoint } from "@/utils/gis-interpolation";

export interface UseRideEstimationOptions {
  originAddress?: string;
  destinationAddress?: string;
  selectedCategory?: SupportedVehicleCategory | string;
  paymentMethod?: "PIX" | "DINHEIRO" | "CARTAO" | string;
}

export interface UseRideEstimationResult {
  route: RouteResult | null;
  quotes: Record<SupportedVehicleCategory, ItemizedQuote> | null;
  activeQuote: ItemizedQuote | null;
  requestPayload: RideRequestPayload | null;
  isLoading: boolean;
  error: string | null;
  distanceKm: number;
  durationMinutes: number;
  encodedPolyline: string;
  trafficCongestion: "low" | "moderate" | "heavy" | "severe";
  recalculate: () => Promise<void>;
  createRideRequest: () => Promise<{ success: boolean; ride: RideRequestPayload; error?: string }>;
}

export function useRideEstimation(
  originCoords: [number, number] | null | undefined,
  destinationCoords: [number, number] | null | undefined,
  options: UseRideEstimationOptions = {}
): UseRideEstimationResult {
  const {
    originAddress = "Local de Embarque",
    destinationAddress = "Local de Destino",
    selectedCategory = "PARTIU_CARRO",
    paymentMethod = "PIX",
  } = options;

  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestCounterRef = useRef<number>(0);

  const calculate = useCallback(async () => {
    if (!originCoords || !destinationCoords) {
      setRoute(null);
      setIsLoading(false);
      return;
    }

    const currentReq = ++requestCounterRef.current;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Chamada obrigatória ao Mapbox Directions (driving-traffic)
      const result = await directionsService.getRoute(originCoords, destinationCoords);
      if (currentReq === requestCounterRef.current) {
        setRoute(result);
        setIsLoading(false);
      }
    } catch (err: any) {
      if (currentReq === requestCounterRef.current) {
        setError(err.message || "Erro ao calcular estimativa");
        setIsLoading(false);
      }
    }
  }, [
    originCoords ? originCoords[0] : null,
    originCoords ? originCoords[1] : null,
    destinationCoords ? destinationCoords[0] : null,
    destinationCoords ? destinationCoords[1] : null,
  ]);

  useEffect(() => {
    let cancel = false;
    calculate().then(() => {
      if (cancel) return;
    });
    return () => {
      cancel = true;
    };
  }, [calculate]);

  // 2. Injeção no PricingService (taxas de app_settings no Supabase)
  const quotes = useMemo(() => {
    if (!route) return null;
    return pricingService.calculateMultiCategoryQuotes({
      distanceMeters: route.distanceMeters,
      distanceKm: route.distanceKm,
      durationSeconds: route.durationSeconds,
      durationMinutes: route.durationMinutes,
      encodedPolyline: route.encodedPolyline,
      coordinates: route.coordinates,
      startAddress: originAddress,
      endAddress: destinationAddress,
      provider: "mapbox_directions",
    });
  }, [route, originAddress, destinationAddress]);

  const activeQuote = useMemo(() => {
    if (!quotes) return null;
    const cat = selectedCategory as SupportedVehicleCategory;
    return quotes[cat] || quotes.PARTIU_CARRO;
  }, [quotes, selectedCategory]);

  // 3. Montagem do Payload de Criação (INSERT INTO rides)
  const requestPayload = useMemo((): RideRequestPayload | null => {
    if (!originCoords || !destinationCoords || !route || !activeQuote) return null;

    return {
      category: selectedCategory,
      origin_address: originAddress,
      origin_coords: originCoords,
      origin_geography: toPostGISPoint(originCoords),
      destination_address: destinationAddress,
      destination_coords: destinationCoords,
      destination_geography: toPostGISPoint(destinationCoords),
      distance_km: route.distanceKm,
      estimated_time_mins: route.durationMinutes,
      calculated_price: activeQuote.priceBrl,
      encoded_polyline: route.encodedPolyline,
      route_coordinates: route.coordinates,
      payment_method: paymentMethod,
      status: "REQUESTED",
    };
  }, [
    originCoords,
    destinationCoords,
    route,
    activeQuote,
    selectedCategory,
    originAddress,
    destinationAddress,
    paymentMethod,
  ]);

  // 4. Executa a criação no Supabase
  const createRideRequest = useCallback(async () => {
    if (!requestPayload) {
      return { success: false, ride: null as any, error: "Estimativa incompleta" };
    }
    return supabaseService.createRideRequest(requestPayload);
  }, [requestPayload]);

  return {
    route,
    quotes,
    activeQuote,
    requestPayload,
    isLoading,
    error,
    distanceKm: route ? route.distanceKm : 0,
    durationMinutes: route ? route.durationMinutes : 0,
    encodedPolyline: route ? route.encodedPolyline : "",
    trafficCongestion: route?.trafficCongestion || "low",
    recalculate: calculate,
    createRideRequest,
  };
}
