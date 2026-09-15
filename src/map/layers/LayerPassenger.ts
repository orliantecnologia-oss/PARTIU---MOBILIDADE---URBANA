/**
 * ==============================================================================
 * 📍 PARTIU — LAYER PASSENGER (WEBGL HARDWARE-ACCELERATED USER PUCK)
 * ==============================================================================
 * Camada independente da localização do passageiro renderizada na GPU:
 * 1. Ponto central de alta precisão (#2563EB) com contorno branco (#FFFFFF).
 * 2. Halo concêntrico de acurácia em metros com fading suave.
 * 3. Zero manipulação de nós HTML/DOM na thread principal.
 * ==============================================================================
 */

import type mapboxgl from "mapbox-gl";
import { MAP_SOURCES, MAP_LAYERS } from "../MapConstants";

export class LayerPassenger {
  private map: mapboxgl.Map | null = null;
  private isInitialized = false;
  private isVisible = true;
  private currentCoords: [number, number] | null = null;

  public init(map: mapboxgl.Map): void {
    this.map = map;

    if (!map.getSource(MAP_SOURCES.USER_LOCATION)) {
      map.addSource(MAP_SOURCES.USER_LOCATION, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
    }

    // 1. Halo de Pulsação e Acurácia (Circle Layer WebGL)
    if (!map.getLayer(MAP_LAYERS.USER_LOCATION_PULSE)) {
      map.addLayer({
        id: MAP_LAYERS.USER_LOCATION_PULSE,
        type: "circle",
        source: MAP_SOURCES.USER_LOCATION,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12, 16,
            16, 26,
            18, 36,
          ],
          "circle-color": "#3B82F6",
          "circle-opacity": 0.20,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#60A5FA",
          "circle-stroke-opacity": 0.45,
        },
      });
    }

    // 2. Núcleo Sólido do Ponto do Passageiro (Azul Uber/99)
    if (!map.getLayer(MAP_LAYERS.USER_LOCATION_DOT)) {
      map.addLayer({
        id: MAP_LAYERS.USER_LOCATION_DOT,
        type: "circle",
        source: MAP_SOURCES.USER_LOCATION,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12, 6,
            16, 8,
            18, 10,
          ],
          "circle-color": "#0088FF",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#FFFFFF",
          "circle-opacity": 1.0,
        },
      });
    }

    this.isInitialized = true;
    this.applyVisibility();
  }

  public updateLocation(coords: [number, number], accuracyMeters = 15): void {
    this.currentCoords = coords;
    if (!this.map || !this.isInitialized) return;

    const source = this.map.getSource(MAP_SOURCES.USER_LOCATION) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              accuracy: accuracyMeters,
            },
            geometry: {
              type: "Point",
              coordinates: coords,
            },
          },
        ],
      });
    }
  }

  public setVisibility(visible: boolean): void {
    this.isVisible = visible;
    this.applyVisibility();
  }

  private applyVisibility(): void {
    if (!this.map || !this.isInitialized) return;
    const value = this.isVisible ? "visible" : "none";

    [MAP_LAYERS.USER_LOCATION_PULSE, MAP_LAYERS.USER_LOCATION_DOT].forEach((layerId) => {
      if (this.map?.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, "visibility", value);
      }
    });
  }

  public destroy(): void {
    this.map = null;
    this.isInitialized = false;
    this.currentCoords = null;
  }
}
