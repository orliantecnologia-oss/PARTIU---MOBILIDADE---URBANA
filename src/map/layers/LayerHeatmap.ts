/**
 * ==============================================================================
 * ♨️ PARTIU — LAYER HEATMAP (PASSENGER DEMAND HOTSPOTS & SURGE ZONES)
 * ==============================================================================
 * Camada independente de mapa de calor WebGL acelerada por GPU:
 * 1. Renderiza densidade de chamadas e zonas de alta demanda (Hotspots).
 * 2. Transições suaves de raio e peso conforme o zoom do mapa.
 * 3. Permite alternar visibilidade sem afetar a frota ou a navegação.
 * ==============================================================================
 */

import type mapboxgl from "mapbox-gl";
import { MAP_SOURCES } from "../MapConstants";

export interface DemandPoint {
  coords: [number, number];
  intensity?: number;
}

export class LayerHeatmap {
  private map: mapboxgl.Map | null = null;
  private isInitialized = false;
  private isVisible = false;
  private layerId = "partiu-layer-demand-heatmap";

  public init(map: mapboxgl.Map): void {
    this.map = map;

    if (!map.getSource(MAP_SOURCES.HEATMAP_DEMAND)) {
      map.addSource(MAP_SOURCES.HEATMAP_DEMAND, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getLayer(this.layerId)) {
      map.addLayer(
        {
          id: this.layerId,
          type: "heatmap",
          source: MAP_SOURCES.HEATMAP_DEMAND,
          maxzoom: 17,
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "intensity"],
              0, 0,
              5, 1,
            ],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              9, 1,
              15, 3,
            ],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0, 136, 255, 0)",
              0.2, "rgba(0, 198, 255, 0.4)",
              0.4, "rgba(16, 185, 129, 0.6)",
              0.7, "rgba(245, 158, 11, 0.8)",
              1.0, "rgba(239, 68, 68, 0.95)",
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              9, 15,
              13, 25,
              16, 40,
            ],
            "heatmap-opacity": 0.65,
          },
        },
        // Posicionado abaixo das linhas de rota e marcadores de veículos
        map.getLayer("partiu-layer-drivers-cluster") ? "partiu-layer-drivers-cluster" : undefined
      );
    }

    this.isInitialized = true;
    this.applyVisibility();
  }

  public updateDemand(points: DemandPoint[]): void {
    if (!this.map || !this.isInitialized) return;

    const source = this.map.getSource(MAP_SOURCES.HEATMAP_DEMAND) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: points.map((p, idx) => ({
          type: "Feature",
          id: idx,
          properties: { intensity: p.intensity ?? 1 },
          geometry: { type: "Point", coordinates: p.coords },
        })),
      });
    }
  }

  public setVisibility(visible: boolean): void {
    this.isVisible = visible;
    this.applyVisibility();
  }

  private applyVisibility(): void {
    if (!this.map || !this.isInitialized) return;
    if (this.map.getLayer(this.layerId)) {
      this.map.setLayoutProperty(this.layerId, "visibility", this.isVisible ? "visible" : "none");
    }
  }

  public destroy(): void {
    this.map = null;
    this.isInitialized = false;
  }
}
