/**
 * ==============================================================================
 * 🗺️ PARTIU — MAPBOX SERVICE (UBER/99 CLEAN MAP ARCHITECTURE)
 * ==============================================================================
 * Serviço responsável pelo gerenciamento de estilos limpos, sanitização de POIs,
 * fornecimento de tokens autenticados e parâmetros de visualização.
 * ==============================================================================
 */

import { MapboxConfig } from "@/config/MapboxConfig";
import type mapboxgl from "mapbox-gl";

export class MapboxService {
  private static instance: MapboxService;

  private constructor() {
    MapboxConfig.init();
  }

  public static getInstance(): MapboxService {
    if (!MapboxService.instance) {
      MapboxService.instance = new MapboxService();
    }
    return MapboxService.instance;
  }

  public getAccessToken(): string {
    return MapboxConfig.getAccessToken();
  }

  public getStyleUrl(
    variant: "customStudio" | "cleanDay" | "streets" | "cleanNight" | "navigationTraffic" | "satelliteStreets" = "streets"
  ): string {
    const url = (MapboxConfig.STYLES as any)[variant] || MapboxConfig.STYLES.cleanDay;
    // Se o usuário ainda não colou a URL do Mapbox Studio, retorna o fallback cleanDay
    if (variant === "customStudio" && (!url || url === "COLE_SUA_URL_DO_MAPBOX_STUDIO_AQUI" || !url.startsWith("mapbox://"))) {
      return MapboxConfig.STYLES.cleanDay;
    }
    return url;
  }

  public getDefaultCenter(): [number, number] {
    return MapboxConfig.DEFAULT_CENTER;
  }

  public getDefaultZoom(): number {
    return MapboxConfig.DEFAULT_ZOOM;
  }

  public getDefaultPitch(): number {
    return MapboxConfig.DEFAULT_PITCH;
  }

  public getDefaultBearing(): number {
    return MapboxConfig.DEFAULT_BEARING;
  }

  /**
   * Sanitiza e purifica dinamicamente qualquer estilo Mapbox,
   * removendo poluição visual (restaurantes, hotéis, ícones turísticos)
   * mantendo apenas a malha viária crítica, bairros e limites municipais.
   */
  public cleanMapboxStyle(styleJson: any): any {
    if (!styleJson || !Array.isArray(styleJson.layers)) {
      return styleJson;
    }

    const POI_LAYER_PREFIXES = [
      "poi-",
      "poi_scalerank",
      "transit-",
      "transit_label",
      "airport-label",
      "natural-point-label",
    ];

    const cleanedLayers = styleJson.layers.filter((layer: any) => {
      const id = (layer.id || "").toLowerCase();
      // Remove camadas de POIs não essenciais
      const isPoi = POI_LAYER_PREFIXES.some((prefix) => id.startsWith(prefix));
      if (isPoi) return false;

      // Se for camada de símbolo, filtra ícones de restaurantes, lojas e entretenimento
      if (layer.type === "symbol" && layer.layout) {
        const iconImage = layer.layout["icon-image"];
        if (typeof iconImage === "string" && (
          iconImage.includes("restaurant") ||
          iconImage.includes("cafe") ||
          iconImage.includes("bar") ||
          iconImage.includes("fast-food") ||
          iconImage.includes("clothing-store") ||
          iconImage.includes("cinema") ||
          iconImage.includes("attraction")
        )) {
          return false;
        }
      }

      return true;
    });

    return {
      ...styleJson,
      layers: cleanedLayers,
    };
  }

  /**
   * Aplica filtros diretamente em um objeto mapboxgl.Map carregado,
   * ocultando agressivamente todas as camadas de ruído visual (POIs, comércio, trânsito)
   * para deixar apenas o asfalto, quarteirões, água e áreas verdes em alto contraste.
   *
   * Compatível com Mapbox Standard (setConfigProperty API) e estilos legacy (setLayoutProperty).
   */
  public applyUberCleanFilters(map: mapboxgl.Map): void {
    if (!map || !map.getStyle) return;

    try {
      // ── MAPBOX STANDARD STYLE ─────────────────────────────────────────────
      // O estilo Standard usa setConfigProperty para controle de visibilidade
      // de POIs, trânsito e lugares de forma granular.
      const mapAny = map as any;
      if (typeof mapAny.setConfigProperty === "function") {
        try {
          // Ocultar POIs (restaurantes, lojas, atrações)
          mapAny.setConfigProperty("basemap", "showPointOfInterestLabels", false);
          // Ocultar labels de trânsito (estações, paradas)
          mapAny.setConfigProperty("basemap", "showTransitLabels", false);
          // Manter labels de ruas e bairros visíveis para navegação
          mapAny.setConfigProperty("basemap", "showRoadLabels", true);
          mapAny.setConfigProperty("basemap", "showPlaceLabels", true);
        } catch (_) {}
      }

      // ── ESTILOS LEGACY (light-v11, streets-v12, etc.) ─────────────────────
      const style = map.getStyle();
      if (!style || !style.layers) return;

      const knownLayersToHide = [
        "poi-label",
        "transit-label",
        "airport-label",
        "natural-point-label",
        "poi-scalerank",
        "poi-level-1",
        "poi-level-2",
        "poi-level-3",
        "poi-parks-scalerank",
        "transit-stop",
        "transit-stop-label",
        "transit-route-label",
        "amenity-label",
        "road-exit-shield",
      ];

      knownLayersToHide.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", "none");
        }
      });

      // Varredura profunda em todas as camadas de símbolo do estilo
      style.layers.forEach((layer: any) => {
        const id = (layer.id || "").toLowerCase();
        const sourceLayer = (layer["source-layer"] || "").toLowerCase();

        // ── 1. GARANTIA ABSOLUTA DE VISIBILIDADE DOS NOMES DE RUAS, AVENIDAS E LUGARES
        const isRoadOrPlace =
          id.includes("road") ||
          id.includes("street") ||
          id.includes("highway") ||
          id.includes("avenue") ||
          id.includes("settlement") ||
          id.includes("place-label") ||
          sourceLayer === "road_label" ||
          sourceLayer === "road" ||
          sourceLayer === "place_label";

        if (isRoadOrPlace && map.getLayer(layer.id)) {
          try {
            map.setLayoutProperty(layer.id, "visibility", "visible");
            if (layer.type === "symbol") {
              map.setPaintProperty(layer.id, "text-color", "#0F172A");
              map.setPaintProperty(layer.id, "text-halo-color", "#FFFFFF");
              map.setPaintProperty(layer.id, "text-halo-width", 2.2);
            }
          } catch (_) {}
          return;
        }

        // ── 2. FILTRO DE POLUIÇÃO VISUAL NÃO-ESSENCIAL (POIs, comércio, atrações)
        const isPoiNoise =
          id.includes("poi") ||
          id.includes("transit") ||
          id.includes("amenity") ||
          id.includes("natural-point") ||
          id.includes("airport") ||
          sourceLayer === "poi_label" ||
          sourceLayer === "transit_stop_label" ||
          sourceLayer === "transit_route_label";

        if (isPoiNoise && map.getLayer(layer.id)) {
          try {
            map.setLayoutProperty(layer.id, "visibility", "none");
          } catch (_) {}
        }
      });
    } catch (_) {}
  }

  /**
   * ========================================================================
   * 🎨 CONTRASTE FRIO PADRÃO 99 APP (COOL-TONE HIGH CONTRAST)
   * ========================================================================
   * Aplica modificações de cor em tempo de execução nas camadas do mapa
   * para produzir visual de alto contraste em tons frios:
   *
   * - Terreno: cinza gelo suave (#E8ECF0)
   * - Água: azul frio profundo (#B8D4E8)
   * - Estradas principais: grafite escuro (#3A3F47)
   * - Estradas secundárias: cinza médio com casings brancos
   * - Labels de rua: escurecidos para legibilidade
   * - Parques/áreas verdes: verde-água dessaturado (#C8DDD0)
   * - Prédios: cinza neutro frio (#D5DAE0)
   * ========================================================================
   */
  public applyCoolToneContrast(map: mapboxgl.Map): void {
    if (!map || !map.getStyle) return;

    try {
      const style = map.getStyle();
      if (!style || !style.layers) return;

      for (const layer of style.layers) {
        const id = (layer.id || "").toLowerCase();
        const type = layer.type;

        if (!map.getLayer(layer.id)) continue;

        try {
          // ── TERRENO / BACKGROUND ──────────────────────────────────
          if (id === "background" || id === "land") {
            map.setPaintProperty(layer.id, "background-color", "#E8ECF0");
          }

          if (id.includes("landuse") && type === "fill") {
            // Parques e áreas verdes: verde-água dessaturado (frio)
            if (id.includes("park") || id.includes("green") || id.includes("grass")) {
              map.setPaintProperty(layer.id, "fill-color", "#C8DDD0");
              map.setPaintProperty(layer.id, "fill-opacity", 0.7);
            }
            // Áreas residenciais/comerciais: cinza gelo
            else {
              map.setPaintProperty(layer.id, "fill-color", "#E2E6EB");
              map.setPaintProperty(layer.id, "fill-opacity", 0.5);
            }
          }

          // ── ÁGUA ──────────────────────────────────────────────────
          if ((id.includes("water") && type === "fill") || id === "water") {
            map.setPaintProperty(layer.id, "fill-color", "#B8D4E8");
          }

          // ── ESTRADAS ──────────────────────────────────────────────
          if (type === "line" && id.includes("road")) {
            // Rodovias e vias principais: grafite escuro alto contraste
            if (id.includes("motorway") || id.includes("trunk") || id.includes("primary")) {
              if (id.includes("case") || id.includes("casing")) {
                map.setPaintProperty(layer.id, "line-color", "#2C3038");
                map.setPaintProperty(layer.id, "line-opacity", 0.9);
              } else {
                map.setPaintProperty(layer.id, "line-color", "#3A3F47");
                map.setPaintProperty(layer.id, "line-opacity", 1.0);
              }
            }
            // Vias secundárias: cinza médio
            else if (id.includes("secondary") || id.includes("tertiary")) {
              if (id.includes("case") || id.includes("casing")) {
                map.setPaintProperty(layer.id, "line-color", "#C5CBD3");
              } else {
                map.setPaintProperty(layer.id, "line-color", "#8B939E");
                map.setPaintProperty(layer.id, "line-opacity", 0.9);
              }
            }
            // Ruas locais e residenciais: cinza claro visível
            else if (id.includes("street") || id.includes("local") || id.includes("minor") || id.includes("service")) {
              if (id.includes("case") || id.includes("casing")) {
                map.setPaintProperty(layer.id, "line-color", "#D8DCE2");
              } else {
                map.setPaintProperty(layer.id, "line-color", "#A8AEB8");
                map.setPaintProperty(layer.id, "line-opacity", 0.8);
              }
            }
          }

          // ── PRÉDIOS ───────────────────────────────────────────────
          if (type === "fill" && (id.includes("building") || id === "building")) {
            map.setPaintProperty(layer.id, "fill-color", "#D5DAE0");
            map.setPaintProperty(layer.id, "fill-opacity", 0.6);
          }

          // ── LABELS DE RUAS ────────────────────────────────────────
          if (type === "symbol" && id.includes("road") && id.includes("label")) {
            map.setPaintProperty(layer.id, "text-color", "#3A3F47");
            map.setPaintProperty(layer.id, "text-halo-color", "#F0F2F5");
            map.setPaintProperty(layer.id, "text-halo-width", 1.5);
          }

          // ── LABELS DE BAIRROS E LOCAIS ────────────────────────────
          if (type === "symbol" && (id.includes("place") || id.includes("settlement"))) {
            map.setPaintProperty(layer.id, "text-color", "#4A5060");
            map.setPaintProperty(layer.id, "text-halo-color", "#EAECF0");
            map.setPaintProperty(layer.id, "text-halo-width", 1.2);
          }

        } catch (_) {
          // Camadas individuais podem não suportar a propriedade — silencia
        }
      }
    } catch (_) {}
  }
}

export const mapboxService = MapboxService.getInstance();
