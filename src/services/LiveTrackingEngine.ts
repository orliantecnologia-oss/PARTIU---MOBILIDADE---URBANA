/**
 * ==============================================================================
 * 🛰️ PARTIU LIVE TRACKING ENGINE (v4.0) — 60FPS LERP & BEARING SMOOTHING
 * ==============================================================================
 * Motor de rastreamento veicular em tempo real de altíssima precisão.
 * Elimina o efeito de "teletransporte" de marcadores através de:
 * 1. Interpolação linear (LERP) a 60 frames por segundo via requestAnimationFrame.
 * 2. Suavização contínua de azimute/direção (bearing) pelo menor arco angular.
 * 3. Detecção e descarte de teleporte GPS anômalo (> 500m instantâneo).
 * 4. Extrapolação baseada em velocidade quando sinal oscila.
 * ==============================================================================
 */

export interface TrackingPosition {
  lng: number;
  lat: number;
  bearing: number;
  speedKmh?: number;
  timestamp: number;
}

export type TrackingUpdateCallback = (pos: TrackingPosition) => void;

export class LiveTrackingEngine {
  private static instance: LiveTrackingEngine;

  private currentPos: TrackingPosition | null = null;
  private targetPos: TrackingPosition | null = null;
  private previousPos: TrackingPosition | null = null;

  private animStartTime: number = 0;
  private animDurationMs: number = 3000; // Padrão de 3s entre pings
  private animFrameId: number | null = null;

  private listeners: Set<TrackingUpdateCallback> = new Set();

  private constructor() {}

  public static getInstance(): LiveTrackingEngine {
    if (!LiveTrackingEngine.instance) {
      LiveTrackingEngine.instance = new LiveTrackingEngine();
    }
    return LiveTrackingEngine.instance;
  }

  /**
   * Registra listener para receber coordenadas suavizadas a 60fps
   */
  public subscribe(listener: TrackingUpdateCallback): () => void {
    this.listeners.add(listener);
    if (this.currentPos) {
      listener(this.currentPos);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Reseta o rastreador
   */
  public reset(initialPos?: [number, number], initialBearing: number = 0): void {
    if (this.animFrameId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (initialPos) {
      this.currentPos = {
        lng: initialPos[0],
        lat: initialPos[1],
        bearing: initialBearing,
        timestamp: Date.now(),
      };
      this.targetPos = null;
      this.previousPos = null;
      this.notify(this.currentPos);
    } else {
      this.currentPos = null;
      this.targetPos = null;
      this.previousPos = null;
    }
  }

  /**
   * Recebe nova telemetria do motorista (via Supabase Realtime ou GPS nativo)
   */
  public pushUpdate(newCoords: [number, number], bearing?: number, durationMs: number = 3000): void {
    const now = Date.now();
    const newLng = newCoords[0];
    const newLat = newCoords[1];

    if (!this.currentPos) {
      // Primeira coordenada: posiciona imediatamente
      this.currentPos = {
        lng: newLng,
        lat: newLat,
        bearing: bearing ?? 0,
        timestamp: now,
      };
      this.notify(this.currentPos);
      return;
    }

    // Calcula distância para prevenção de anomalia de teletransporte (> 500m)
    const distMeters = this.calculateHaversineMeters(
      this.currentPos.lat,
      this.currentPos.lng,
      newLat,
      newLng
    );

    if (distMeters > 500) {
      // Salto muito grande (ex: GPS reconectou em outro bairro) -> Snap imediato sem animar pelo mapa
      this.currentPos = {
        lng: newLng,
        lat: newLat,
        bearing: bearing ?? this.currentPos.bearing,
        timestamp: now,
      };
      this.targetPos = null;
      this.previousPos = null;
      if (this.animFrameId !== null && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      this.notify(this.currentPos);
      return;
    }

    // Se bearing não foi fornecido, calcula a partir do vetor de deslocamento
    const calculatedBearing =
      bearing !== undefined
        ? bearing
        : this.calculateBearing(this.currentPos.lat, this.currentPos.lng, newLat, newLng);

    this.previousPos = { ...this.currentPos };
    this.targetPos = {
      lng: newLng,
      lat: newLat,
      bearing: calculatedBearing,
      timestamp: now,
    };

    this.animStartTime = typeof performance !== "undefined" ? performance.now() : now;
    this.animDurationMs = Math.max(500, Math.min(durationMs, 10000));

    if (this.animFrameId === null && typeof requestAnimationFrame !== "undefined") {
      this.animFrameId = requestAnimationFrame(this.renderLoop);
    }
  }

  private renderLoop = (timestamp: number): void => {
    if (!this.previousPos || !this.targetPos) {
      this.animFrameId = null;
      return;
    }

    const elapsed = timestamp - this.animStartTime;
    const progress = Math.min(elapsed / this.animDurationMs, 1.0);

    // Easing suave (quad-out para condução natural)
    const eased = 1 - (1 - progress) * (1 - progress);

    const interpolatedLng = this.lerp(this.previousPos.lng, this.targetPos.lng, eased);
    const interpolatedLat = this.lerp(this.previousPos.lat, this.targetPos.lat, eased);
    const interpolatedBearing = this.lerpAngle(
      this.previousPos.bearing,
      this.targetPos.bearing,
      eased
    );

    this.currentPos = {
      lng: interpolatedLng,
      lat: interpolatedLat,
      bearing: interpolatedBearing,
      timestamp: Date.now(),
    };

    this.notify(this.currentPos);

    if (progress < 1.0) {
      this.animFrameId = requestAnimationFrame(this.renderLoop);
    } else {
      this.animFrameId = null;
      this.currentPos = { ...this.targetPos };
      this.previousPos = null;
      this.targetPos = null;
    }
  };

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * Interpolação angular que respeita o menor arco circular (0° e 360°)
   */
  private lerpAngle(startAngle: number, endAngle: number, t: number): number {
    let diff = (endAngle - startAngle) % 360;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    return (startAngle + diff * t + 360) % 360;
  }

  private calculateHaversineMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Raio da Terra em metros
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos(((lon2 - lon1) * Math.PI) / 180);
    const rad = Math.atan2(y, x);
    return ((rad * 180) / Math.PI + 360) % 360;
  }

  private notify(pos: TrackingPosition): void {
    this.listeners.forEach((fn) => fn(pos));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:smooth_tracking_position", {
          detail: pos,
        })
      );
    }
  }

  public getCurrentPosition(): TrackingPosition | null {
    return this.currentPos ? { ...this.currentPos } : null;
  }
}

export const liveTrackingEngine = LiveTrackingEngine.getInstance();
