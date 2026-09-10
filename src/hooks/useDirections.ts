/**
 * ==============================================================================
 * 🛣️ PARTIU — HOOK USE DIRECTIONS (REACTIVE REAL-TIME ROUTING & LIVE TRAFFIC)
 * ==============================================================================
 * Hook reativo para cálculo contínuo de trajetos em vias reais com tráfego vivo.
 * ==============================================================================
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  directionsService,
  type RouteResult,
  type DirectionsOptions,
} from "@/services/DirectionsService";

export interface UseDirectionsResult {
  route: RouteResult | null;
  isLoading: boolean;
  error: string | null;
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][];
  trafficCongestion: "low" | "moderate" | "heavy" | "severe";
  recalculateRoute: () => Promise<RouteResult | null>;
}

export function useDirections(
  origin: [number, number] | null | undefined,
  destination: [number, number] | null | undefined,
  options: DirectionsOptions = {}
): UseDirectionsResult {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestCounterRef = useRef<number>(0);

  const calculate = useCallback(async (): Promise<RouteResult | null> => {
    if (!origin || !destination) {
      setRoute(null);
      setIsLoading(false);
      return null;
    }

    const currentRequestId = ++requestCounterRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await directionsService.getRoute(origin, destination, options);
      if (currentRequestId === requestCounterRef.current) {
        setRoute(result);
        setIsLoading(false);
        return result;
      }
    } catch (err: any) {
      if (currentRequestId === requestCounterRef.current) {
        setError(err.message || "Erro ao calcular rota");
        setIsLoading(false);
      }
    }

    return null;
  }, [
    origin ? origin[0] : null,
    origin ? origin[1] : null,
    destination ? destination[0] : null,
    destination ? destination[1] : null,
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

  return {
    route,
    isLoading,
    error,
    distanceKm: route ? route.distanceKm : 0,
    durationMinutes: route ? route.durationMinutes : 0,
    coordinates: route ? route.coordinates : [],
    trafficCongestion: route?.trafficCongestion || "low",
    recalculateRoute: calculate,
  };
}
