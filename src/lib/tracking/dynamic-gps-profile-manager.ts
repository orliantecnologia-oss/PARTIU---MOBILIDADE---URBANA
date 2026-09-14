/**
 * ==============================================================================
 * 🛰️ PARTIU DYNAMIC GPS PROFILE MANAGER (v1.0)
 * ==============================================================================
 * Gerenciador Adaptativo de Perfis de Amostragem de GPS para Motoristas.
 * Inspirado no subsistema mobile_config do projeto de referência (99/Uber):
 *
 * 1. IN_TRIP: Alta precisão (1.0 Hz, deadband 15m, heartbeat 10s, alta acurácia).
 * 2. IDLE_CRUISING: Modo cruzeiro aguardando chamada (0.2 Hz, deadband 35m, heartbeat 25s).
 * 3. BATTERY_SAVER: Economia de energia quando bateria < 15% (0.1 Hz, deadband 50m).
 * 4. EMERGENCY_SOS: Rastreamento crítico contínuo (2.0 Hz, deadband 5m, heartbeat 5s).
 *
 * Inclui detecção automática do status da bateria (Battery API) e aplicação
 * de perfis remotos do operador sem necessidade de republicação do app.
 * ==============================================================================
 */

import { silentCatchWarn } from "@/lib/structured-logger";

export type GpsProfileMode = "IN_TRIP" | "IDLE_CRUISING" | "BATTERY_SAVER" | "EMERGENCY_SOS";

export interface GpsSamplingProfile {
  mode: GpsProfileMode;
  samplingFrequencyHz: number;
  minDistanceMeters: number;
  heartbeatIntervalMs: number;
  highAccuracy: boolean;
  wakeLockRequired: boolean;
  audioKeepAlive: boolean;
  ttlSec: number;
}

export const DEFAULT_GPS_PROFILES: Record<GpsProfileMode, GpsSamplingProfile> = {
  IN_TRIP: {
    mode: "IN_TRIP",
    samplingFrequencyHz: 1.0,
    minDistanceMeters: 15,
    heartbeatIntervalMs: 10000,
    highAccuracy: true,
    wakeLockRequired: true,
    audioKeepAlive: true,
    ttlSec: 60,
  },
  IDLE_CRUISING: {
    mode: "IDLE_CRUISING",
    samplingFrequencyHz: 0.2,
    minDistanceMeters: 35,
    heartbeatIntervalMs: 25000,
    highAccuracy: false,
    wakeLockRequired: false,
    audioKeepAlive: false,
    ttlSec: 120,
  },
  BATTERY_SAVER: {
    mode: "BATTERY_SAVER",
    samplingFrequencyHz: 0.1,
    minDistanceMeters: 50,
    heartbeatIntervalMs: 60000,
    highAccuracy: false,
    wakeLockRequired: false,
    audioKeepAlive: false,
    ttlSec: 300,
  },
  EMERGENCY_SOS: {
    mode: "EMERGENCY_SOS",
    samplingFrequencyHz: 2.0,
    minDistanceMeters: 5,
    heartbeatIntervalMs: 5000,
    highAccuracy: true,
    wakeLockRequired: true,
    audioKeepAlive: true,
    ttlSec: 30,
  },
};

export type GpsProfileListener = (profile: GpsSamplingProfile) => void;

export class DynamicGpsProfileManager {
  private static instance: DynamicGpsProfileManager;
  private currentMode: GpsProfileMode = "IDLE_CRUISING";
  private customProfiles: Map<GpsProfileMode, GpsSamplingProfile> = new Map();
  private listeners: Set<GpsProfileListener> = new Set();
  private batteryWatcherRegistered = false;
  private isLowBattery = false;

  private constructor() {
    this.initBatteryMonitoring();
  }

  public static getInstance(): DynamicGpsProfileManager {
    if (!DynamicGpsProfileManager.instance) {
      DynamicGpsProfileManager.instance = new DynamicGpsProfileManager();
    }
    return DynamicGpsProfileManager.instance;
  }

  /**
   * Retorna o perfil ativo consolidado
   */
  public getActiveProfile(): GpsSamplingProfile {
    if (this.currentMode === "EMERGENCY_SOS") {
      return this.getProfile("EMERGENCY_SOS");
    }

    if (this.isLowBattery && this.currentMode !== "IN_TRIP") {
      return this.getProfile("BATTERY_SAVER");
    }

    return this.getProfile(this.currentMode);
  }

  public getProfile(mode: GpsProfileMode): GpsSamplingProfile {
    return this.customProfiles.get(mode) || DEFAULT_GPS_PROFILES[mode];
  }

  /**
   * Altera o modo operacional (ex: motorista aceitou corrida -> IN_TRIP)
   */
  public setMode(newMode: GpsProfileMode): void {
    if (this.currentMode !== newMode) {
      this.currentMode = newMode;
      this.notifyListeners();
    }
  }

  /**
   * Sobrescreve um perfil remotamente (via config administrativa)
   */
  public overrideProfile(mode: GpsProfileMode, overrides: Partial<GpsSamplingProfile>): void {
    const base = this.getProfile(mode);
    const updated: GpsSamplingProfile = {
      ...base,
      ...overrides,
      mode,
    };
    this.customProfiles.set(mode, updated);

    if (this.currentMode === mode) {
      this.notifyListeners();
    }
  }

  /**
   * Registra listener para reagir a mudanças no perfil de amostragem
   */
  public subscribe(listener: GpsProfileListener): () => void {
    this.listeners.add(listener);
    listener(this.getActiveProfile());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const active = this.getActiveProfile();
    this.listeners.forEach((fn) => {
      try {
        fn(active);
      } catch (err) {
        silentCatchWarn("DynamicGpsProfileManager.notifyListeners", err);
      }
    });
  }

  /**
   * Monitora a bateria do dispositivo via Battery Status API quando disponível
   */
  private async initBatteryMonitoring(): Promise<void> {
    if (typeof navigator === "undefined" || !("getBattery" in navigator)) {
      return;
    }

    try {
      const battery = await (navigator as any).getBattery();
      if (!battery) return;

      const evaluateBattery = () => {
        const low = battery.level <= 0.15 && !battery.charging;
        if (this.isLowBattery !== low) {
          this.isLowBattery = low;
          this.notifyListeners();
        }
      };

      evaluateBattery();

      if (!this.batteryWatcherRegistered) {
        battery.addEventListener("levelchange", evaluateBattery);
        battery.addEventListener("chargingchange", evaluateBattery);
        this.batteryWatcherRegistered = true;
      }
    } catch {
      // API não suportada ou permissão restrita
    }
  }

  /**
   * Reinicia configurações para defaults de fábrica (usado em testes)
   */
  public resetToDefaults(): void {
    this.currentMode = "IDLE_CRUISING";
    this.isLowBattery = false;
    this.customProfiles.clear();
    this.notifyListeners();
  }
}

export const dynamicGpsProfileManager = DynamicGpsProfileManager.getInstance();
