/**
 * ==============================================================================
 * 🛰️ PARTIU DRIVER LOCATION ENGINE (v4.0) — PRODUCTION REAL-TIME CORE
 * ==============================================================================
 * Responsável por:
 * 1. Captura GPS contínua e econômica via Web Geolocation / WatchPosition.
 * 2. Controle adaptativo de frequência para máxima eficiência energética:
 *    - ONLINE_MOVING: a cada 5 segundos ou 30 metros percorridos.
 *    - ONLINE_IDLE (< 3 km/h): reduz para 15 segundos.
 *    - ON_TRIP: atualização de alta fidelidade a cada 3 segundos.
 * 3. Supressão de telemetria para condutores suspensos, bloqueados ou offline.
 * 4. Transmissão resiliente para a tabela active_drivers no Supabase.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { silentCatchWarn } from "@/lib/structured-logger";
import {
  enqueueDurableOfflineEvent,
  syncDurableQueueWithServer,
} from "@/lib/offline-durable-queue";

export type DriverOperationalState =
  | "OFFLINE"
  | "ONLINE"
  | "AVAILABLE"
  | "HEADING_TO_PICKUP"
  | "WAITING_PASSENGER"
  | "IN_PROGRESS"
  | "ONLINE_IDLE"
  | "ONLINE_MOVING"
  | "ON_TRIP";

export interface DriverProfileContext {
  driverId: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  vehicleModel?: string;
  licensePlate?: string;
  category: string;
  subscriptionPlan: "OURO" | "PRATA" | "BRONZE" | "FREE";
  isBlocked?: boolean;
  isSuspended?: boolean;
  hasDebtBlocked?: boolean;
  tenantId?: string;
}

export interface LocationTelemetryPayload {
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
  accuracy: number;
  timestamp: number;
  state: DriverOperationalState;
}

export class DriverLocationService {
  private static instance: DriverLocationService;

  private state: DriverOperationalState = "OFFLINE";
  private profile: DriverProfileContext | null = null;
  private watchId: number | null = null;
  private timerInterval: NodeJS.Timeout | null = null;

  private lastTransmittedPosition: { lat: number; lng: number; time: number } | null = null;
  private currentRawPosition: { lat: number; lng: number; heading: number; speedKmh: number; accuracy: number } | null = null;

  private listeners: Set<(payload: LocationTelemetryPayload) => void> = new Set();
  private wakeLockSentinel: any = null;
  private audioContext: any = null;
  private isKeepAliveAudioActive = false;
  private offlineTelemetryCount = 0;

  private constructor() {
    this.setupLifecycleHooks();
  }

  public static getInstance(): DriverLocationService {
    if (!DriverLocationService.instance) {
      DriverLocationService.instance = new DriverLocationService();
    }
    return DriverLocationService.instance;
  }

  /**
   * Configura o perfil do motorista para despacho
   */
  public setProfile(profile: DriverProfileContext): void {
    this.profile = profile;
  }

  public getProfile(): DriverProfileContext | null {
    return this.profile;
  }

  public getState(): DriverOperationalState {
    return this.state;
  }

  /**
   * Conecta ouvintes locais de telemetria
   */
  public onLocationUpdate(listener: (payload: LocationTelemetryPayload) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Inicia o serviço de localização no estado especificado
   */
  public async goOnline(initialState: "ONLINE_IDLE" | "ONLINE_MOVING" | "ON_TRIP" = "ONLINE_IDLE"): Promise<boolean> {
    if (!this.canTransmit()) {
      console.warn("[DriverLocationService] Bloqueado: Motorista não elegível para ficar online.");
      return false;
    }

    this.state = initialState;
    this.startGpsTracking();
    this.scheduleTransmissionLoop();
    void this.solicitarWakeLock();
    this.iniciarKeepAliveAudio();
    return true;
  }

  /**
   * Desativa o rastreamento e coloca o condutor em OFFLINE
   */
  public goOffline(): void {
    this.state = "OFFLINE";
    this.stopGpsTracking();
    this.liberarWakeLock();
    this.pararKeepAliveAudio();

    if (this.profile) {
      void this.syncToSupabase({
        lat: this.currentRawPosition?.lat ?? 0,
        lng: this.currentRawPosition?.lng ?? 0,
        heading: 0,
        speedKmh: 0,
        accuracy: 0,
        timestamp: Date.now(),
        state: "OFFLINE",
      });
    }
  }

  /**
   * Screen Wake Lock API — Impede a tela do celular de desligar enquanto o motorista trabalha
   */
  public async solicitarWakeLock(): Promise<boolean> {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return false;
    try {
      this.wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
      this.wakeLockSentinel.addEventListener("release", () => {
        this.wakeLockSentinel = null;
      });
      return true;
    } catch {
      return false;
    }
  }

  public liberarWakeLock(): void {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch (err) { silentCatchWarn("DriverLocationService", err); }
      this.wakeLockSentinel = null;
    }
  }

  /**
   * Background Keep-Alive Audio + MediaSession
   * Mantém o processo JS e o GPS ativos no Android/iOS quando o condutor minimiza o app (Waze/Google Maps/WhatsApp)
   */
  public iniciarKeepAliveAudio(): void {
    if (this.isKeepAliveAudioActive) return;
    this.isKeepAliveAudioActive = true;

    if (typeof window === "undefined") return;
    try {
      if (typeof navigator !== "undefined" && "mediaSession" in navigator && typeof (globalThis as any).MediaMetadata !== "undefined") {
        navigator.mediaSession.metadata = new (globalThis as any).MediaMetadata({
          title: "PARTIU — Condutor em Rota",
          artist: `${this.profile?.name || "Motorista Parceiro"} • GPS Contínuo`,
          album: "Rede de Mobilidade PARTIU",
        });
        navigator.mediaSession.playbackState = "playing";
      }

      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate, this.audioContext.sampleRate);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.0001; // inaudível
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(0);

        if (this.audioContext.state === "suspended") {
          this.audioContext.resume().catch(() => {});
        }
      }
    } catch (err) {
      console.warn("[DriverLocationService] Keep-alive áudio não inicializado:", err);
    }
  }

  public pararKeepAliveAudio(): void {
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (err) { silentCatchWarn("DriverLocationService", err); }
      this.audioContext = null;
    }
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
    }
    this.isKeepAliveAudioActive = false;
  }

  public isBackgroundKeepAliveActive(): boolean {
    return this.isKeepAliveAudioActive;
  }

  public getOfflineQueueCount(): number {
    return this.offlineTelemetryCount;
  }

  public async flushOfflineQueue(): Promise<{ attempted: number; acknowledged: number }> {
    try {
      const result = await syncDurableQueueWithServer();
      if (result.acknowledged > 0) {
        this.offlineTelemetryCount = Math.max(0, this.offlineTelemetryCount - result.acknowledged);
      }
      return result;
    } catch {
      return { attempted: 0, acknowledged: 0 };
    }
  }

  /**
   * Altera dinamicamente o estado da corrida (ex: passageiro embarcou -> ON_TRIP)
   */
  public setOperationalState(newState: DriverOperationalState): void {
    if (this.state === newState) return;
    this.state = newState;
    if (newState === "OFFLINE") {
      this.goOffline();
    } else {
      this.scheduleTransmissionLoop();
    }
  }

  public setOperatingState(newState: DriverOperationalState): void {
    this.setOperationalState(newState);
  }

  public getOperatingState(): DriverOperationalState {
    return this.state;
  }

  public async startTracking(driverId?: string): Promise<boolean> {
    if (driverId && !this.profile) {
      this.profile = {
        driverId,
        name: "Motorista Parceiro",
        category: "POP",
        subscriptionPlan: "OURO",
      };
    }
    return this.goOnline("ONLINE_IDLE");
  }

  public stopTracking(): void {
    this.goOffline();
  }

  public getTransmissionIntervalMs(state: DriverOperationalState, batteryLevel = 100): number {
    if (batteryLevel <= 15) return 30000;
    switch (state) {
      case "ON_TRIP":
      case "HEADING_TO_PICKUP":
      case "IN_PROGRESS":
        return 3000; // Corrida ativa: 3 segundos
      case "ONLINE_MOVING":
      case "ONLINE":
        return 5000; // Baixa velocidade / movimento: 5 segundos
      case "WAITING_PASSENGER":
      case "AVAILABLE":
      case "ONLINE_IDLE":
      default:
        return 15000; // Parado: 15 segundos
    }
  }

  /**
   * Injeta telemetria manual (para testes e contingência)
   */
  public manualUpdatePosition(lat: number, lng: number, heading = 0, speedKmh = 0): void {
    this.currentRawPosition = { lat, lng, heading, speedKmh, accuracy: 10 };
    this.evaluateAndTransmit();
  }

  /**
   * Inicia captura contínua via navigator.geolocation
   */
  private startGpsTracking(): void {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const speedKmh = pos.coords.speed !== null && pos.coords.speed >= 0 ? Math.round(pos.coords.speed * 3.6) : 0;
        const heading = pos.coords.heading !== null && !isNaN(pos.coords.heading) ? pos.coords.heading : 0;

        this.currentRawPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading,
          speedKmh,
          accuracy: pos.coords.accuracy || 10,
        };

        // Transição automática entre IDLE e MOVING se não estiver em viagem
        const isEmViagem = this.state === "ON_TRIP" || this.state === "HEADING_TO_PICKUP" || this.state === "IN_PROGRESS";
        if (!isEmViagem) {
          if (speedKmh >= 3 && this.state !== "ONLINE_MOVING") {
            this.state = "ONLINE_MOVING";
            this.scheduleTransmissionLoop();
          } else if (speedKmh < 3 && this.state !== "ONLINE_IDLE" && this.state !== "AVAILABLE") {
            this.state = "ONLINE_IDLE";
            this.scheduleTransmissionLoop();
          }
        }

        this.evaluateAndTransmit();
      },
      (err) => {
        console.warn("[DriverLocationService] Erro de GPS:", err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 15000,
      }
    );
  }

  private stopGpsTracking(): void {
    if (this.watchId !== null && typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Agenda loop de tempo com base na frequência inteligente
   */
  private scheduleTransmissionLoop(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.state === "OFFLINE") return;

    // Frequência Adaptativa Oficial (Padrão Uber/99):
    // Corrida ativa (ON_TRIP, HEADING_TO_PICKUP, IN_PROGRESS): 3 segundos
    // Baixa velocidade / movimento (ONLINE_MOVING, ONLINE): 5 segundos
    // Parado (ONLINE_IDLE, AVAILABLE, WAITING_PASSENGER): 15 segundos
    const intervalMs = this.getTransmissionIntervalMs(this.state);

    this.timerInterval = setInterval(() => {
      this.evaluateAndTransmit(true);
    }, intervalMs);
  }

  /**
   * Avalia regras de transmissão (tempo decorrido ou 30m percorridos)
   */
  private evaluateAndTransmit(forceByTimer = false): void {
    if (!this.currentRawPosition || !this.canTransmit()) return;

    const now = Date.now();
    let shouldTransmit = forceByTimer;

    if (!shouldTransmit && this.lastTransmittedPosition) {
      // Verifica distância percorrida desde a última transmissão
      const distMeters = this.calculateDistanceMeters(
        this.lastTransmittedPosition.lat,
        this.lastTransmittedPosition.lng,
        this.currentRawPosition.lat,
        this.currentRawPosition.lng
      );

      // Regra: se em movimento e percorreu >= 30 metros, transmite imediatamente
      if (this.state === "ONLINE_MOVING" && distMeters >= 30) {
        shouldTransmit = true;
      } else if (this.state === "ON_TRIP" && distMeters >= 15) {
        shouldTransmit = true;
      }
    } else if (!this.lastTransmittedPosition) {
      shouldTransmit = true;
    }

    if (shouldTransmit) {
      const payload: LocationTelemetryPayload = {
        lat: this.currentRawPosition.lat,
        lng: this.currentRawPosition.lng,
        heading: this.currentRawPosition.heading,
        speedKmh: this.currentRawPosition.speedKmh,
        accuracy: this.currentRawPosition.accuracy,
        timestamp: now,
        state: this.state,
      };

      this.lastTransmittedPosition = {
        lat: payload.lat,
        lng: payload.lng,
        time: now,
      };

      // Notifica ouvintes locais (UI e Mapa do Motorista)
      this.listeners.forEach((fn) => fn(payload));

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("partiu:driver_location_updated", {
            detail: { coords: [payload.lng, payload.lat], heading: payload.heading, speed: payload.speedKmh },
          })
        );
      }

      // Sincroniza com o Supabase
      void this.syncToSupabase(payload);
    }
  }

  /**
   * Envia atualização ao PostgreSQL / Supabase Realtime com fallback para fila durável offline
   */
  private async syncToSupabase(payload: LocationTelemetryPayload): Promise<void> {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    // Se estiver offline ou sem Supabase configurado, enfileira duravelmente com hash chain
    if (!isOnline || !isSupabaseConfigured() || !this.profile?.driverId) {
      enqueueDurableOfflineEvent(
        `drv_${this.profile?.driverId || "offline_driver"}`,
        "VEHICLE_PRIMARY",
        "ACTIVE_TRIP",
        "GPS_TELEMETRY",
        payload
      );
      this.offlineTelemetryCount++;
      return;
    }

    try {
      await (supabase as any).rpc("upsert_driver_location", {
        p_driver_id: this.profile.driverId,
        p_lat: payload.lat,
        p_lng: payload.lng,
        p_heading: payload.heading,
        p_speed: payload.speedKmh,
        p_status: payload.state,
        p_category: this.profile.category || "PARTIU_CARRO",
        p_subscription_plan: this.profile.subscriptionPlan || "FREE",
        p_tenant_id: this.profile.tenantId || "00000000-0000-0000-0000-000000000000",
      });
    } catch (err) {
      // Em caso de falha transitória (timeout, troca de torre 4G), persiste na fila durável
      console.warn("[DriverLocationService] Sincronização Supabase em contingência, salvando na fila offline:", err);
      enqueueDurableOfflineEvent(
        `drv_${this.profile.driverId}`,
        "VEHICLE_PRIMARY",
        "ACTIVE_TRIP",
        "GPS_TELEMETRY",
        payload
      );
      this.offlineTelemetryCount++;
    }
  }

  /**
   * Regras estritas de supressão energética e de compliance
   */
  public canTransmit(): boolean {
    if (this.state === "OFFLINE") return false;
    if (!this.profile) return true; // Permite em modo dev/anônimo

    if (this.profile.isBlocked || this.profile.isSuspended || this.profile.hasDebtBlocked) {
      return false;
    }
    return true;
  }

  /**
   * Cálculo de distância Haversine em metros para o filtro de deadband
   */
  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  private setupLifecycleHooks(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("[DriverLocationService] Conexão restabelecida, descarregando telemetria offline.");
        void this.flushOfflineQueue();
      });
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          if (this.state === "ON_TRIP" || this.state === "ONLINE_MOVING") {
            // Garante keep-alive ao mudar para Waze/Google Maps/WhatsApp
            this.iniciarKeepAliveAudio();
          } else if (this.state === "ONLINE_IDLE") {
            this.scheduleTransmissionLoop();
          }
        } else if (document.visibilityState === "visible" && this.state !== "OFFLINE") {
          // Ao voltar para primeiro plano, re-adquire wake lock e força leitura instantânea
          void this.solicitarWakeLock();
          if (this.audioContext && this.audioContext.state === "suspended") {
            this.audioContext.resume().catch(() => {});
          }
          if (typeof navigator !== "undefined" && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                this.currentRawPosition = {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  heading: pos.coords.heading || 0,
                  speedKmh: pos.coords.speed !== null && pos.coords.speed >= 0 ? Math.round(pos.coords.speed * 3.6) : 0,
                  accuracy: pos.coords.accuracy || 10,
                };
                this.evaluateAndTransmit(true);
              },
              () => {},
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 }
            );
          }
        }
      });
    }
  }
}

export const driverLocationService = DriverLocationService.getInstance();
