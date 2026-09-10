/**
 * ==============================================================================
 * 🛰️ PARTIU DRIVER OS — TELEMETRY & WAITING ENGINE (v1.0)
 * ==============================================================================
 * Motor de telemetria em tempo real, geolocalização defensiva, deadband filter,
 * detecção de spoofing/saltos impossíveis e controle auditado de tempo de espera.
 * Padrão operacional 99 / Uber Driver.
 * ==============================================================================
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RawTelemetryPoint {
  driverId: string;
  lat: number;
  lng: number;
  speedKmh?: number | undefined;
  heading?: number | undefined;
  accuracyMeters?: number | undefined;
  timestamp: number;
}

export interface FilteredTelemetryPoint extends RawTelemetryPoint {
  isJitterFiltered: boolean;
  isSpeedSanityPassed: boolean;
  isStale: boolean;
  distanceDeltaMeters: number;
  bearingDeg: number;
}

export interface WaitingTimerStatus {
  driverId: string;
  rideId: string;
  arrivedAt: number;
  elapsedSeconds: number;
  gracePeriodSeconds: number; // Ex: 300s (5 min) de tolerância gratuita
  isGracePeriodActive: boolean;
  billableWaitingMinutes: number;
  accumulatedWaitingFeeCents: number;
  canDriverCancelWithoutPenalty: boolean;
  passengerNotified: boolean;
}

// Configurações operacionais
const GEOFENCE_ARRIVAL_RADIUS_METERS = 150;
const DEADBAND_MIN_DISTANCE_METERS = 15; // Filtra jitter GPS < 15m se estático
const MAX_REALISTIC_SPEED_KMH = 160;
const MAX_TELEPORTATION_SPEED_MPS = 45; // ~162 km/h
const STALE_COORDINATE_THRESHOLD_MS = 120_000; // 2 min
const DEFAULT_GRACE_PERIOD_SECONDS = 300; // 5 min
const WAITING_FEE_CENTS_PER_MINUTE = 45; // R$ 0,45 por minuto adicional após 5 min

export class DriverTelemetryEngine {
  private lastKnownPositions = new Map<string, RawTelemetryPoint>();
  private waitingSessions = new Map<string, WaitingTimerStatus>();

  /**
   * Calcula distância Haversine em metros entre dois pontos geográficos.
   */
  public calculateDistanceMeters(p1: LatLng, p2: LatLng): number {
    const R = 6371000; // Raio da Terra em metros
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Calcula o azimute/direção (bearing) em graus (0-360) entre dois pontos.
   */
  public calculateBearing(p1: LatLng, p2: LatLng): number {
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  }

  /**
   * Processa uma atualização de localização do motorista aplicando filtros defensivos:
   * 1. Detecção de dados obsoletos (stale)
   * 2. Deadband filter (ruído de GPS abaixo de 15m)
   * 3. Sanity check de velocidade / anti-teleporte
   */
  public processTelemetry(raw: RawTelemetryPoint): FilteredTelemetryPoint {
    const now = Date.now();
    const isStale = now - raw.timestamp > STALE_COORDINATE_THRESHOLD_MS;
    const previous = this.lastKnownPositions.get(raw.driverId);

    if (!previous) {
      this.lastKnownPositions.set(raw.driverId, raw);
      return {
        ...raw,
        isJitterFiltered: false,
        isSpeedSanityPassed: true,
        isStale,
        distanceDeltaMeters: 0,
        bearingDeg: raw.heading ?? 0,
      };
    }

    const distanceDelta = this.calculateDistanceMeters(
      { lat: previous.lat, lng: previous.lng },
      { lat: raw.lat, lng: raw.lng }
    );
    const timeDeltaSeconds = Math.max(1, (raw.timestamp - previous.timestamp) / 1000);
    const effectiveSpeedMps = distanceDelta / timeDeltaSeconds;
    const effectiveSpeedKmh = effectiveSpeedMps * 3.6;

    // 1. Sanity check de teletransporte e velocidade absurda (> 160 km/h)
    const isSpeedSanityPassed =
      effectiveSpeedKmh <= MAX_REALISTIC_SPEED_KMH &&
      effectiveSpeedMps <= MAX_TELEPORTATION_SPEED_MPS;

    // 2. Deadband filter: se moveu menos de 15 metros e não tem velocidade relatada alta, considera jitter
    const isJitterFiltered =
      distanceDelta < DEADBAND_MIN_DISTANCE_METERS &&
      (raw.speedKmh ?? effectiveSpeedKmh) < 5;

    const bearing =
      distanceDelta >= 5
        ? this.calculateBearing(
            { lat: previous.lat, lng: previous.lng },
            { lat: raw.lat, lng: raw.lng }
          )
        : raw.heading ?? previous.heading ?? 0;

    // Atualiza posição se passou nos critérios de sanidade
    if (isSpeedSanityPassed) {
      this.lastKnownPositions.set(raw.driverId, {
        ...raw,
        heading: bearing,
        speedKmh: Math.round(effectiveSpeedKmh),
      });
    }

    return {
      ...raw,
      speedKmh: isSpeedSanityPassed ? Math.round(effectiveSpeedKmh) : previous.speedKmh,
      heading: bearing,
      isJitterFiltered,
      isSpeedSanityPassed,
      isStale,
      distanceDeltaMeters: distanceDelta,
      bearingDeg: Math.round(bearing),
    };
  }

  /**
   * Verifica se o condutor está dentro do raio de chegada (geofence) do local de embarque ou entrega.
   */
  public isWithinArrivalGeofence(
    driverPos: LatLng,
    targetPos: LatLng,
    radiusMeters: number = GEOFENCE_ARRIVAL_RADIUS_METERS
  ): boolean {
    const distance = this.calculateDistanceMeters(driverPos, targetPos);
    return distance <= radiusMeters;
  }

  /**
   * Inicia a sessão de cronometragem de espera quando o motorista chega ao ponto de embarque.
   */
  public startWaitingTimer(
    driverId: string,
    rideId: string,
    gracePeriodSeconds: number = DEFAULT_GRACE_PERIOD_SECONDS
  ): WaitingTimerStatus {
    const now = Date.now();
    const status: WaitingTimerStatus = {
      driverId,
      rideId,
      arrivedAt: now,
      elapsedSeconds: 0,
      gracePeriodSeconds,
      isGracePeriodActive: true,
      billableWaitingMinutes: 0,
      accumulatedWaitingFeeCents: 0,
      canDriverCancelWithoutPenalty: false,
      passengerNotified: true,
    };
    this.waitingSessions.set(rideId, status);
    return status;
  }

  /**
   * Atualiza o cronômetro de espera e calcula cobranças/permissões de cancelamento.
   */
  public updateWaitingTimer(rideId: string): WaitingTimerStatus | null {
    const session = this.waitingSessions.get(rideId);
    if (!session) return null;

    const now = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((now - session.arrivedAt) / 1000));
    const isGracePeriodActive = elapsedSeconds < session.gracePeriodSeconds;

    let billableWaitingMinutes = 0;
    let accumulatedWaitingFeeCents = 0;

    if (!isGracePeriodActive) {
      const extraSeconds = elapsedSeconds - session.gracePeriodSeconds;
      billableWaitingMinutes = Math.ceil(extraSeconds / 60);
      accumulatedWaitingFeeCents = billableWaitingMinutes * WAITING_FEE_CENTS_PER_MINUTE;
    }

    // Motorista pode cancelar sem penalidade se esperou além da carência (ex: 5 min)
    const canDriverCancelWithoutPenalty = !isGracePeriodActive;

    const updated: WaitingTimerStatus = {
      ...session,
      elapsedSeconds,
      isGracePeriodActive,
      billableWaitingMinutes,
      accumulatedWaitingFeeCents,
      canDriverCancelWithoutPenalty,
    };

    this.waitingSessions.set(rideId, updated);
    return updated;
  }

  /**
   * Finaliza a sessão de espera (quando o passageiro embarca).
   */
  public stopWaitingTimer(rideId: string): WaitingTimerStatus | null {
    const finalStatus = this.updateWaitingTimer(rideId);
    this.waitingSessions.delete(rideId);
    return finalStatus;
  }

  /**
   * Retorna a última posição conhecida válida do condutor.
   */
  public getLastKnownPosition(driverId: string): RawTelemetryPoint | undefined {
    return this.lastKnownPositions.get(driverId);
  }

  /**
   * Limpa sessões de espera antigas (> 2 horas) para evitar vazamento em sessões longas
   */
  public purgeOldSessions(): number {
    const now = Date.now();
    let purged = 0;
    for (const [rideId, session] of this.waitingSessions.entries()) {
      if (now - session.arrivedAt > 2 * 60 * 60 * 1000) {
        this.waitingSessions.delete(rideId);
        purged++;
      }
    }
    return purged;
  }

  public clearAllSessions(): void {
    this.waitingSessions.clear();
    this.lastKnownPositions.clear();
  }
}

export const driverTelemetryEngine = new DriverTelemetryEngine();
