/**
 * ==============================================================================
 * 🛣️ PARTIU — LAYER TRIPS (UBER/99 CLEAN ROUTE POLYLINE & TRAFFIC)
 * ==============================================================================
 * Camada independente de traçado de corrida e navegação:
 * 1. Linha da rota vetorial (Casing branco + Linha azul oficial #276EF1).
 * 2. Pinos de embarque (origem) e desembarque (destino) via camadas WebGL.
 * 3. Cache local da última rota para evitar recálculos desnecessários.
 * ==============================================================================
 */

import type mapboxgl from "mapbox-gl";
import { MAP_SOURCES, MAP_LAYERS, MAP_COLORS } from "../MapConstants";

export class LayerTrips {
  private map: mapboxgl.Map | null = null;
  private isInitialized = false;
  private isVisible = true;
  private currentCoordinates: [number, number][] = [];

  public init(map: mapboxgl.Map): void {
    this.map = map;

    // 1. Fonte da Rota Polyline
    if (!map.getSource(MAP_SOURCES.ROUTE)) {
      map.addSource(MAP_SOURCES.ROUTE, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
    }

    // 1.1 Borda de Contraste da Rota (Casing)
    if (!map.getLayer(MAP_LAYERS.ROUTE_CASING)) {
      map.addLayer({
        id: MAP_LAYERS.ROUTE_CASING,
        type: "line",
        source: MAP_SOURCES.ROUTE,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#FFFFFF",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11, 5.5,
            14, 8.5,
            16, 11,
          ],
          "line-opacity": 0.95,
        },
      });
    }

    // 1.2 Linha Principal da Rota (Azul Tech #0088FF / #276EF1)
    if (!map.getLayer(MAP_LAYERS.ROUTE_LINE)) {
      map.addLayer({
        id: MAP_LAYERS.ROUTE_LINE,
        type: "line",
        source: MAP_SOURCES.ROUTE,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": MAP_COLORS.ROUTE_LINE,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11, 3.8,
            14, 5.5,
            16, 7.5,
          ],
          "line-opacity": 1.0,
        },
      });
    }

    // 2. Fonte de Pinos de Origem e Destino
    if (!map.getSource(MAP_SOURCES.PINS)) {
      map.addSource(MAP_SOURCES.PINS, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
    }

    if (!map.getLayer(MAP_LAYERS.ADDRESS_PINS)) {
      map.addLayer({
        id: MAP_LAYERS.ADDRESS_PINS,
        type: "symbol",
        source: MAP_SOURCES.PINS,
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11, 0.70,
            14, 0.95,
            16, 1.20,
          ],
          "icon-anchor": "bottom",
          "icon-offset": [0, -10],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
    }

    this.isInitialized = true;
    this.applyVisibility();
  }

  public updateRoute(coordinates: [number, number][]): void {
    this.currentCoordinates = coordinates;
    if (!this.map || !this.isInitialized) return;

    const source = this.map.getSource(MAP_SOURCES.ROUTE) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      if (coordinates.length >= 2) {
        source.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates,
              },
            },
          ],
        });
      } else {
        source.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }
  }

  public updatePins(pickup?: [number, number], destination?: [number, number]): void {
    if (!this.map || !this.isInitialized) return;

    const source = this.map.getSource(MAP_SOURCES.PINS) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];
    if (pickup) {
      features.push({
        type: "Feature",
        properties: { icon: "origin-pin" },
        geometry: { type: "Point", coordinates: pickup },
      });
    }
    if (destination) {
      features.push({
        type: "Feature",
        properties: { icon: "destination-pin" },
        geometry: { type: "Point", coordinates: destination },
      });
    }

    source.setData({
      type: "FeatureCollection",
      features,
    });
  }

  public clear(): void {
    this.updateRoute([]);
    this.updatePins();
  }

  public setVisibility(visible: boolean): void {
    this.isVisible = visible;
    this.applyVisibility();
  }

  private applyVisibility(): void {
    if (!this.map || !this.isInitialized) return;
    const value = this.isVisible ? "visible" : "none";

    [MAP_LAYERS.ROUTE_CASING, MAP_LAYERS.ROUTE_LINE, MAP_LAYERS.ADDRESS_PINS].forEach((layerId) => {
      if (this.map?.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, "visibility", value);
      }
    });
  }

  public destroy(): void {
    this.map = null;
    this.isInitialized = false;
    this.currentCoordinates = [];
  }
}
