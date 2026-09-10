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
    variant: "googleClone99" | "customStudio" | "cleanDay" | "streets" | "cleanNight" | "navigationTraffic" | "satelliteStreets" = "streets"
  ): string {
    const url = (MapboxConfig.STYLES as any)[variant];
    if (variant === "googleClone99") {
      if (url && url !== "COLE_SUA_URL_GOOGLE_CLONE_DO_MAPBOX_STUDIO_AQUI" && url.startsWith("mapbox://")) {
        return url;
      }
      // Fallback para streets-v12 com aplicação programática da paleta Google Maps (99)
      return MapboxConfig.STYLES.cleanDay;
    }
    // Se o usuário ainda não colou a URL do Mapbox Studio, retorna o fallback cleanDay
    if (variant === "customStudio" && (!url || url === "COLE_SUA_URL_DO_MAPBOX_STUDIO_AQUI" || !url.startsWith("mapbox://"))) {
      return MapboxConfig.STYLES.cleanDay;
    }
    return url || MapboxConfig.STYLES.cleanDay;
  }

  /**
   * Mimetiza a paleta visual exata do Google Maps (utilizada pelo app 99):
   * - Fundo cinza gelo (#F1F3F4 / #E8EAED)
   * - Água em azul pastel suave (#C2E0FF)
   * - Áreas verdes em menta suave (#CEEAD6)
   * - Asfalto e vias urbanas em branco puro (#FFFFFF) com contorno cinza suave (#E5E7EB / #D1D5DB)
   * - Prédios em cinza sutil (#E8EAED)
   * - Tipografia de logradouros em grafite (#3C4043) com halo branco nítido
   * - Zero poluição de ícones de POIs comerciais
   */
  public applyGoogleMapsPalette(map: mapboxgl.Map): void {
    if (!map || !map.getStyle) return;
    this.applyUberCleanFilters(map);

    try {
      const style = map.getStyle();
      if (!style || !style.layers) return;

      for (const layer of style.layers) {
        const id = (layer.id || "").toLowerCase();
        const type = layer.type;

        if (!map.getLayer(layer.id)) continue;

        try {
          // ── 1. TERRENO E PLANO DE FUNDO CINZA-GELO (GOOGLE MAPS) ──
          if (id === "background" || id === "land") {
            map.setPaintProperty(layer.id, "background-color", "#F1F3F4");
          }

          // ── 2. ÁREAS VERDES E PARQUES PASTEL (#CEEAD6) ─────────────
          if (
            (id.includes("park") ||
              id.includes("green") ||
              id.includes("grass") ||
              id.includes("landcover") ||
              id.includes("national-park") ||
              id.includes("wood")) &&
            (type === "fill" || type === "background")
          ) {
            map.setPaintProperty(layer.id, "fill-color", "#CEEAD6");
            map.setPaintProperty(layer.id, "fill-opacity", 0.75);
          } else if (id.includes("landuse") && type === "fill") {
            if (id.includes("residential") || id.includes("commercial")) {
              map.setPaintProperty(layer.id, "fill-color", "#EDEDEE");
              map.setPaintProperty(layer.id, "fill-opacity", 0.45);
            }
          }

          // ── 3. CORPOS D'ÁGUA EM AZUL PASTEL GOOGLE (#C2E0FF) ───────
          if ((id.includes("water") && type === "fill") || id === "water") {
            map.setPaintProperty(layer.id, "fill-color", "#C2E0FF");
          }

          // ── 4. MALHA VIÁRIA: RUAS BRANCAS (#FFFFFF) COM CASING CINZA ──
          if (type === "line" && id.includes("road")) {
            const isCasing = id.includes("case") || id.includes("casing");

            // Rodovias e vias expressas (brancas ou leve tom marfim, com borda sutil)
            if (id.includes("motorway") || id.includes("trunk") || id.includes("primary")) {
              if (isCasing) {
                map.setPaintProperty(layer.id, "line-color", "#D1D5DB");
                map.setPaintProperty(layer.id, "line-opacity", 0.85);
              } else {
                map.setPaintProperty(layer.id, "line-color", "#FFFFFF");
                map.setPaintProperty(layer.id, "line-opacity", 1.0);
              }
            }
            // Vias secundárias e terciárias
            else if (id.includes("secondary") || id.includes("tertiary")) {
              if (isCasing) {
                map.setPaintProperty(layer.id, "line-color", "#E5E7EB");
              } else {
                map.setPaintProperty(layer.id, "line-color", "#FFFFFF");
                map.setPaintProperty(layer.id, "line-opacity", 1.0);
              }
            }
            // Vias residenciais e locais
            else if (
              id.includes("street") ||
              id.includes("local") ||
              id.includes("minor") ||
              id.includes("service")
            ) {
              if (isCasing) {
                map.setPaintProperty(layer.id, "line-color", "#E5E7EB");
              } else {
                map.setPaintProperty(layer.id, "line-color", "#FFFFFF");
                map.setPaintProperty(layer.id, "line-opacity", 0.95);
              }
            }
          }

          // ── 5. EDIFICAÇÕES E PRÉDIOS EM CINZA SUAVE ────────────────
          if (type === "fill" && (id.includes("building") || id === "building")) {
            map.setPaintProperty(layer.id, "fill-color", "#E8EAED");
            map.setPaintProperty(layer.id, "fill-opacity", 0.6);
          }

          // ── 6. NOMES DE RUAS E LOGRADOUROS (ALTA LEGIBILIDADE) ──────
          if (type === "symbol" && id.includes("road") && id.includes("label")) {
            map.setPaintProperty(layer.id, "text-color", "#3C4043");
            map.setPaintProperty(layer.id, "text-halo-color", "#FFFFFF");
            map.setPaintProperty(layer.id, "text-halo-width", 2.0);
          }

          // ── 7. NOMES DE BAIRROS E CIDADES ─────────────────────────
          if (type === "symbol" && (id.includes("place") || id.includes("settlement"))) {
            map.setPaintProperty(layer.id, "text-color", "#5F6368");
            map.setPaintProperty(layer.id, "text-halo-color", "#FFFFFF");
            map.setPaintProperty(layer.id, "text-halo-width", 1.8);
          }
        } catch (_) {
          // Algumas camadas podem não aceitar propriedades específicas
        }
      }
    } catch (_) {}
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
