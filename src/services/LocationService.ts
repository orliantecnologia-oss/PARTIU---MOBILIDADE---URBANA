/**
 * ==============================================================================
 * 🛰️ PARTIU — LOCATION SERVICE (GPS TELEMETRY & BATTERY OPTIMIZATION ENGINE)
 * ==============================================================================
 * Motor central de telemetria geoespacial, permissões e economia inteligente
 * de bateria para passageiros e motoristas. Padrão Uber/99.
 *
 * Taxas Adaptativas de Amostragem:
 * - Passageiro / Ocioso: Sob demanda ou 15 segundos
 * - Motorista Parado: 15 segundos (com deadband < 15m)
 * - Motorista em Movimento: 5 segundos
 * - Motorista em Viagem Ativa: 3 segundos (alta precisão)
 *
 * Persistência imediata de lastKnownLocation para renderização instantânea do mapa.
 * ==============================================================================
 */

import { MapboxConfig } from "@/config/MapboxConfig";

export interface LocationData {
  coords: [number, number]; // [lng, lat]
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export type LocationOperationalMode =
  | "PASSENGER_IDLE"
  | "PASSENGER_ACTIVE"
  | "DRIVER_STOPPED"
  | "DRIVER_MOVING"
  | "DRIVER_ACTIVE_TRIP";

export interface LocationWatchOptions {
  mode?: LocationOperationalMode;
  enableHighAccuracy?: boolean;
  distanceFilterMeters?: number;
}

const STORAGE_KEY_LAST_LOCATION = "partiu_last_known_location";

export class LocationService {
  private static instance: LocationService;

  private activeWatchId: number | null = null;
  private currentMode: LocationOperationalMode = "PASSENGER_IDLE";
  private lastLocation: LocationData | null = null;
  private listeners: Set<(location: LocationData) => void> = new Set();
  private throttleTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.loadLastKnownLocation();
  }

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Intervalo dinâmico de amostragem em milissegundos conforme o modo operacional
   */
  public getSamplingIntervalMs(mode: LocationOperationalMode = this.currentMode): number {
    switch (mode) {
      case "DRIVER_ACTIVE_TRIP":
        return 3000; // 3s em corrida ativa
      case "DRIVER_MOVING":
        return 5000; // 5s em deslocamento livre
      case "DRIVER_STOPPED":
        return 15000; // 15s quando o motorista está estacionado
      case "PASSENGER_ACTIVE":
        return 5000;
      case "PASSENGER_IDLE":
      default:
        return 15000;
    }
  }

  /**
   * Carrega a última coordenada conhecida do armazenamento persistente
   */
  public getLastKnownLocation(): LocationData | null {
    if (this.lastLocation) return this.lastLocation;
    this.loadLastKnownLocation();
    return this.lastLocation;
  }

  private loadLastKnownLocation(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LAST_LOCATION);
      if (stored) {
        this.lastLocation = JSON.parse(stored);
      }
    } catch (_) {}
  }

  private saveLastKnownLocation(loc: LocationData): void {
    this.lastLocation = loc;
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY_LAST_LOCATION, JSON.stringify(loc));
    } catch (_) {}
  }

  /**
   * Obtém a localização pontual com prioridade Highest / BestForNavigation
   */
  public async getCurrentPosition(
    options?: PositionOptions
  ): Promise<LocationData> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        const fallback = this.getFallbackLocation();
        resolve(fallback);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: LocationData = {
            coords: [pos.coords.longitude, pos.coords.latitude],
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          };
          this.saveLastKnownLocation(loc);
          resolve(loc);
        },
        () => {
          const fallback = this.getLastKnownLocation() || this.getFallbackLocation();
          resolve(fallback);
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 5000,
          ...options,
        }
      );
    });
  }

  /**
   * Monitoramento contínuo otimizado com descarte de ruído e taxa adaptativa
   */
  public watchPositionAsync(
    callback: (location: LocationData) => void,
    options: LocationWatchOptions = {}
  ): () => void {
    if (options.mode) {
      this.currentMode = options.mode;
    }

    this.listeners.add(callback);

    // Se já tivermos última coordenada conhecida, dispara imediatamente para 0ms de delay
    const immediate = this.getLastKnownLocation();
    if (immediate) {
      callback(immediate);
    }

    if (this.activeWatchId === null && typeof navigator !== "undefined" && navigator.geolocation) {
      this.startNativeWatcher(options);
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.stopNativeWatcher();
      }
    };
  }

  private startNativeWatcher(options: LocationWatchOptions): void {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let lastDispatchedTimestamp = 0;

    this.activeWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const interval = this.getSamplingIntervalMs();

        // Throttling por economia de bateria
        if (now - lastDispatchedTimestamp < interval) {
          return;
        }

        lastDispatchedTimestamp = now;

        const loc: LocationData = {
          coords: [pos.coords.longitude, pos.coords.latitude],
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        };

        this.saveLastKnownLocation(loc);

        // Notifica ouvintes
        this.listeners.forEach((fn) => {
          try {
            fn(loc);
          } catch (_) {}
        });
      },
      (err) => {
        console.warn("[LocationService] Aviso de telemetria GPS:", err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );
  }

  private stopNativeWatcher(): void {
    if (this.activeWatchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.activeWatchId);
      this.activeWatchId = null;
    }
  }

  public setOperationalMode(mode: LocationOperationalMode): void {
    this.currentMode = mode;
  }

  public getFallbackLocation(): LocationData {
    return {
      coords: MapboxConfig.DEFAULT_CENTER,
      latitude: MapboxConfig.DEFAULT_CENTER[1],
      longitude: MapboxConfig.DEFAULT_CENTER[0],
      accuracy: 10,
      heading: 0,
      speed: 0,
      timestamp: Date.now(),
    };
  }
}

export const locationService = LocationService.getInstance();
