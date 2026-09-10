/**
 * ==============================================================================
 * 🗺️ PARTIU — MAP LAYERS (GPU-ACCELERATED HIERARCHY & ZERO REACT OVERHEAD)
 * ==============================================================================
 * Configuração da hierarquia rigorosa de camadas vetoriais renderizadas
 * diretamente na GPU pelo WebGL/OpenGL.
 *
 * HIERARQUIA RIGOROSA:
 * 1. MapView
 * 2. Camera
 * 3. Images (Assets Nativos)
 * 4. Route Polyline (Casing + Line com lineCap e lineJoin round)
 * 5. Drivers Layer (SymbolLayer com icon-image e rotação + Clusters para 10.000 veículos)
 * 6. Address Pins (Pinos de Embarque e Destino)
 * 7. UserLocation (Ponto do Usuário)
 * ==============================================================================
 */

import { MAP_SOURCES, MAP_LAYERS, MAP_COLORS, MAP_ASSETS } from "./MapConstants";
import type mapboxgl from "mapbox-gl";

export class MapLayers {
  /**
   * Inicializa todas as fontes e camadas nativas no mapa na ordem estrita oficial
   */
  public static setupLayers(map: mapboxgl.Map): void {
    if (!map || !map.isStyleLoaded || !map.isStyleLoaded()) return;

    // ---------------------------------------------------------------------------
    // 4. CAMADA DA ROTA (ROUTE POLYLINE)
    // ---------------------------------------------------------------------------
    if (!map.getSource(MAP_SOURCES.ROUTE)) {
      map.addSource(MAP_SOURCES.ROUTE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    // 4.1 Borda de Contraste da Rota (Casing)
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
          "line-color": MAP_COLORS.ROUTE_CASING,
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 6, 16, 10],
          "line-opacity": 0.85,
        },
      });
    }

    // 4.2 Linha Principal da Rota (Azul Uber / 99)
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
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 4, 16, 6.5],
          "line-opacity": 1,
        },
      });
    }

    // ---------------------------------------------------------------------------
    // 5. CAMADA DE CONDUTORES (DRIVERS LAYER COM CLUSTERING NATIVO PARA 10.000 CONDUTORES)
    // ---------------------------------------------------------------------------
    if (!map.getSource(MAP_SOURCES.DRIVERS)) {
      map.addSource(MAP_SOURCES.DRIVERS, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14, // A partir do zoom 14 desagrega para veículos individuais
        clusterRadius: 45,
      });
    }

    // 5.1 Círculo do Cluster de Motoristas
    if (!map.getLayer(MAP_LAYERS.DRIVERS_CLUSTER)) {
      map.addLayer({
        id: MAP_LAYERS.DRIVERS_CLUSTER,
        type: "circle",
        source: MAP_SOURCES.DRIVERS,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            MAP_COLORS.CLUSTER_SMALL,
            10,
            MAP_COLORS.CLUSTER_MEDIUM,
            50,
            MAP_COLORS.CLUSTER_LARGE,
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 50, 30],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#FFFFFF",
        },
      });
    }

    // 5.2 Contador de Veículos no Cluster
    if (!map.getLayer(MAP_LAYERS.DRIVERS_CLUSTER_COUNT)) {
      map.addLayer({
        id: MAP_LAYERS.DRIVERS_CLUSTER_COUNT,
        type: "symbol",
        source: MAP_SOURCES.DRIVERS,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#FFFFFF",
        },
      });
    }

    // 5.3 Veículos Individuais (NÃO-AGRUPADOS) — 100% GPU SymbolLayer
    if (!map.getLayer(MAP_LAYERS.DRIVERS_SYMBOL)) {
      map.addLayer({
        id: MAP_LAYERS.DRIVERS_SYMBOL,
        type: "symbol",
        source: MAP_SOURCES.DRIVERS,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10, 0.08,
            12, 0.12,
            14, 0.16,
            16, 0.20,
            18, 0.25,
          ],
          "icon-anchor": "center",
          "icon-rotate": ["coalesce", ["get", "heading"], ["get", "bearing"], 0],
          "icon-rotation-alignment": "map", // Gira com o mapa e direção da rua
          "icon-pitch-alignment": "viewport", // BILLBOARDING 2.5D: Mantém o veículo em pé sem achatar
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
    }

    // ---------------------------------------------------------------------------
    // 6. PINOS DE ENDEREÇO (EMBARQUE E DESTINO)
    // ---------------------------------------------------------------------------
    if (!map.getSource(MAP_SOURCES.PINS)) {
      map.addSource(MAP_SOURCES.PINS, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getLayer(MAP_LAYERS.ADDRESS_PINS)) {
      map.addLayer({
        id: MAP_LAYERS.ADDRESS_PINS,
        type: "symbol",
        source: MAP_SOURCES.PINS,
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.85, 16, 1.15],
          "icon-anchor": "bottom",
          "icon-offset": [0, -15],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
    }

    // ---------------------------------------------------------------------------
    // 7. LOCALIZAÇÃO DO USUÁRIO (PASSAGEIRO)
    // ---------------------------------------------------------------------------
    if (!map.getSource(MAP_SOURCES.USER_LOCATION)) {
      map.addSource(MAP_SOURCES.USER_LOCATION, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    // 7.1 Pulso Externo
    if (!map.getLayer(MAP_LAYERS.USER_LOCATION_PULSE)) {
      map.addLayer({
        id: MAP_LAYERS.USER_LOCATION_PULSE,
        type: "circle",
        source: MAP_SOURCES.USER_LOCATION,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 10, 16, 20],
          "circle-color": "#3B82F6",
          "circle-opacity": 0.25,
        },
      });
    }

    // 7.2 Ponto Central Sólido
    if (!map.getLayer(MAP_LAYERS.USER_LOCATION_DOT)) {
      map.addLayer({
        id: MAP_LAYERS.USER_LOCATION_DOT,
        type: "circle",
        source: MAP_SOURCES.USER_LOCATION,
        paint: {
          "circle-radius": 6.5,
          "circle-color": "#2563EB",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#FFFFFF",
        },
      });
    }
  }
}
