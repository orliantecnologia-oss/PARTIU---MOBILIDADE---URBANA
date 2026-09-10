/**
 * ==============================================================================
 * 💵 HOOK: useDynamicPricing (PARTIU V4.0)
 * ==============================================================================
 * Hook reativo para precificação dinâmica multicategoria em tempo real.
 * Escuta atualizações de app_settings e recalcula instantaneamente as 7 categorias.
 * ==============================================================================
 */

import { useState, useEffect, useMemo } from "react";
import {
  pricingService,
  OFFICIAL_CATEGORIES,
  type SupportedVehicleCategory,
  type ItemizedQuote,
} from "@/services/PricingService";
import { surgeEngine, type SurgeContext } from "@/services/SurgeEngine";
import type { RouteMetrics } from "@/services/RoutingService";

export function useDynamicPricing(
  routeMetrics: RouteMetrics | null,
  surgeContext: Partial<SurgeContext> = {}
) {
  const [selectedCategory, setSelectedCategory] = useState<SupportedVehicleCategory>("PARTIU_CARRO");
  const [settingsVersion, setSettingsVersion] = useState(0);

  // Escuta alterações do painel administrativo em tempo real
  useEffect(() => {
    const handleUpdate = () => {
      setSettingsVersion((v) => v + 1);
    };

    window.addEventListener("partiu:settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("partiu:settings_updated", handleUpdate);
    };
  }, []);

  // Cotações multicategoria calculadas a partir da rota real
  const quotes = useMemo<Record<SupportedVehicleCategory, ItemizedQuote>>(() => {
    if (!routeMetrics) {
      // Cria métricas fallback temporárias enquanto a rota carrega
      const dummyMetrics: RouteMetrics = {
        distanceMeters: 4800,
        distanceKm: 4.8,
        durationSeconds: 720,
        durationMinutes: 12,
        encodedPolyline: "",
        startAddress: "Origem",
        endAddress: "Destino",
        provider: "calibrated_urban_network",
      };
      return pricingService.calculateMultiCategoryQuotes(dummyMetrics, surgeContext);
    }

    return pricingService.calculateMultiCategoryQuotes(routeMetrics, surgeContext);
  }, [routeMetrics, surgeContext, settingsVersion]);

  const activeQuote = quotes[selectedCategory] || quotes["PARTIU_CARRO"];

  const surgeInfo = useMemo(() => {
    return surgeEngine.calculateSurge(surgeContext);
  }, [surgeContext, settingsVersion]);

  return {
    quotes,
    categoriesList: OFFICIAL_CATEGORIES,
    selectedCategory,
    setSelectedCategory,
    activeQuote,
    isSurgeActive: surgeInfo.isSurgeActive,
    surgeMultiplier: surgeInfo.multiplier,
    surgeReason: surgeInfo.reason,
  };
}
