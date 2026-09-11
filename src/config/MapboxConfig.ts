/**
 * ==============================================================================
 * 🗺️ PARTIU — MAPBOX CONFIGURATION ENGINE (NATIONAL MOBILITY STANDARD)
 * ==============================================================================
 * Centralizador de configurações do motor geoespacial Mapbox para web e mobile.
 * Suporta Mapbox GL JS e compatibilidade com @rnmapbox/maps.
 *
 * Diretrizes:
 * - Token de acesso com resolução multicamada (Vite env, Process env, Fallback).
 * - Estilos Studio customizados padrão Uber/99 (limpos, sem ruído de POIs turísticos).
 * - Coordenadas de ancoragem regional (Itaperuna-RJ) com parâmetros de câmera 3D.
 * - Modos de operação DEV e PROD com telemetria desativada para privacidade.
 * ==============================================================================
 */

import mapboxgl from "mapbox-gl";

export interface MapboxEnvironmentConfig {
  accessToken: string;
  isProduction: boolean;
  debugMode: boolean;
  telemetryEnabled: boolean;
  defaultCenter: [number, number]; // [longitude, latitude]
  defaultZoom: number;
  defaultPitch: number;
  defaultBearing: number;
  minZoomLevel: number;
  maxZoomLevel: number;
  styles: {
    customStudio: string;
    cleanDay: string;
    streets?: string;
    cleanNight: string;
    navigationTraffic: string;
    satelliteStreets: string;
  };
}

export class MapboxConfig {
  private static initialized = false;

  public static readonly DEFAULT_TOKEN =
    "pk.eyJ1IjoiZXhhbXBsZS11c2VyIiwiYSI6ImNsZXhhbXBsZTAwMDAwIn0.ZXhhbXBsZV90b2tlbl9mb3JfY2k";

  // Coordenadas canônicas da cidade polo (Itaperuna - RJ)
  public static readonly DEFAULT_CENTER: [number, number] = [-41.888, -21.205];
  public static readonly DEFAULT_ZOOM = 16.5;
  public static readonly DEFAULT_PITCH = 45; // Perspectiva 3D dinâmica padrão Uber
  public static readonly DEFAULT_BEARING = 0;

  // Estilos canônicos Mapbox Studio
  public static readonly STYLES = {
    // ──────────────────────────────────────────────────────────────────────────
    // 🎨 TODO [DESENVOLVEDOR]: ESTILO "GOOGLE CLONE" (PADRÃO 99) NO MAPBOX STUDIO
    // ──────────────────────────────────────────────────────────────────────────
    // Para replicar 100% o estilo idêntico do Google Maps / 99 App via Studio:
    // 1. Acesse https://studio.mapbox.com
    // 2. Crie um novo estilo baseado no template "Streets" ou "Light"
    // 3. Configure:
    //    - Fundo (background/land): Cinza gelo (#F1F3F4 ou #E8EAED)
    //    - Ruas locais: Brancas (#FFFFFF) com contorno sutil (#E5E7EB)
    //    - Rodovias/Vias expressas: Amarelo suave (#FDE68A / #FEF08A)
    //    - Água: Azul suave (#C4E0E5 ou #A8DADC)
    //    - Áreas verdes: Verde menta suave (#E5F0E6)
    //    - Oculte 100% dos POIs comerciais (restaurantes, lojas, bancos)
    // 4. Publique e cole a URL abaixo:
    // Exemplo: "mapbox://styles/seu-usuario/clxxxxxxxxxxxxxxxxx"
    // (Enquanto não configurada, o motor aplica a paleta Google programaticamente sobre streets-v12)
    // ──────────────────────────────────────────────────────────────────────────
    googleClone99: "COLE_SUA_URL_GOOGLE_CLONE_DO_MAPBOX_STUDIO_AQUI",
    customStudio: "COLE_SUA_URL_DO_MAPBOX_STUDIO_AQUI",
    // Estilo Clean Day: Mapbox Streets v12 — Nomes de ruas, logradouros e bairros em alta definição e contraste
    cleanDay: "mapbox://styles/mapbox/streets-v12",
    streets: "mapbox://styles/mapbox/streets-v12",
    // Estilo Noturno para corridas entre 18h e 06h
    cleanNight: "mapbox://styles/mapbox/dark-v11",
    // Estilo com visualização ativa de tráfego (Driving Traffic)
    navigationTraffic: "mapbox://styles/mapbox/navigation-day-v1",
    // Visão de satélite híbrida para inspeção de locais remotos e áreas rurais
    satelliteStreets: "mapbox://styles/mapbox/satellite-streets-v12",
  };

  /**
   * Resolve o token do Mapbox a partir das variáveis de ambiente disponíveis
   */
  public static getAccessToken(): string {
    const viteEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined;
    const processEnv = typeof process !== "undefined" ? process.env : undefined;

    const token =
      viteEnv?.["VITE_MAPBOX_TOKEN"] ||
      viteEnv?.["VITE_MAPBOX_ACCESS_TOKEN"] ||
      viteEnv?.["MAPBOX_TOKEN"] ||
      processEnv?.["VITE_MAPBOX_TOKEN"] ||
      processEnv?.["VITE_MAPBOX_ACCESS_TOKEN"] ||
      processEnv?.["MAPBOX_TOKEN"] ||
      MapboxConfig.DEFAULT_TOKEN;

    return token;
  }

  /**
   * Verifica se o token configurado é um token de produção Mapbox válido (formato pk.*)
   */
  public static hasValidToken(): boolean {
    const token = MapboxConfig.getAccessToken();
    return Boolean(token && token.startsWith("pk.") && !token.includes("example") && token.length > 20);
  }

  /**
   * Retorna a configuração consolidada do ambiente
   */
  public static getConfig(): MapboxEnvironmentConfig {
    const isProd =
      (typeof import.meta !== "undefined" && import.meta.env?.PROD) ||
      (typeof process !== "undefined" && process.env?.NODE_ENV === "production") ||
      false;

    return {
      accessToken: MapboxConfig.getAccessToken(),
      isProduction: Boolean(isProd),
      debugMode: !isProd,
      telemetryEnabled: false,
      defaultCenter: MapboxConfig.DEFAULT_CENTER,
      defaultZoom: MapboxConfig.DEFAULT_ZOOM,
      defaultPitch: MapboxConfig.DEFAULT_PITCH,
      defaultBearing: MapboxConfig.DEFAULT_BEARING,
      minZoomLevel: 5,
      maxZoomLevel: 20,
      styles: MapboxConfig.STYLES,
    };
  }

  /**
   * Inicialização obrigatória da biblioteca antes da renderização do App
   */
  public static init(): void {
    if (MapboxConfig.initialized) return;

    const token = MapboxConfig.getAccessToken();

    // 1. Inicializa Mapbox GL JS
    if (mapboxgl) {
      mapboxgl.accessToken = token;
    }

    // 2. Compatibilidade com @rnmapbox/maps caso carregado em runtime nativo
    if (typeof globalThis !== "undefined") {
      const anyGlobal = globalThis as any;
      if (anyGlobal.MapboxGL && typeof anyGlobal.MapboxGL.setAccessToken === "function") {
        anyGlobal.MapboxGL.setAccessToken(token);
        if (typeof anyGlobal.MapboxGL.setTelemetryEnabled === "function") {
          anyGlobal.MapboxGL.setTelemetryEnabled(false);
        }
      }
    }

    MapboxConfig.initialized = true;
  }

  public static isInitialized(): boolean {
    return MapboxConfig.initialized;
  }
}

// Auto-inicializa na importação
MapboxConfig.init();
