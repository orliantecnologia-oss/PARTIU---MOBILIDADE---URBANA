/**
 * ==============================================================================
 * 🗺️ HOOK: useRealtimeRouting (PARTIU V4.0)
 * ==============================================================================
 * Hook reativo para obtenção contínua e assíncrona de rota real por vias públicas,
 * alimentando o mapa com Polyline decodificada, distância e duração.
 * ==============================================================================
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { routingService, type RouteMetrics, type RouteRequestOptions } from "@/services/RoutingService";

export function useRealtimeRouting(
  origin?: [number, number] | null,
  destination?: [number, number] | null,
  options: RouteRequestOptions = {}
) {
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRoute = useCallback(async () => {
    if (!origin || !destination) {
      setRouteMetrics(null);
      return;
    }

    // Se origem e destino forem idênticos
    if (
      Math.abs(origin[0] - destination[0]) < 0.0001 &&
      Math.abs(origin[1] - destination[1]) < 0.0001
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const metrics = await routingService.getRoute(origin, destination, options);
      setRouteMetrics(metrics);
    } catch (err: any) {
      setError(err?.message || "Falha ao calcular rota real");
    } finally {
      setIsLoading(false);
    }
  }, [origin?.[0], origin?.[1], destination?.[0], destination?.[1], options.vehicleType, options.trafficAware]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  return {
    routeMetrics,
    isLoading,
    error,
    refreshRoute: fetchRoute,
  };
}
