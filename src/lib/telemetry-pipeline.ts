/**
 * ==============================================================================
 * 🛰️ UNIVANS MULTI-VARIABLE TELEMETRY & SPATIAL ANOMALY ENGINE (v3.4)
 * Análise Multi-Vetorial (Velocidade, Aceleração, Precisão GPS, Regressão Temporal)
 * ==============================================================================
 */

import { DomainError, createDomainError } from "./domain-contracts";

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface TelemetryIngestionPayload {
  organizationId: string;
  vehicleId: string;
  deviceId: string;
  deviceStatus?:
    "ACTIVE" | "PROVISIONING" | "OFFLINE" | "SUSPENDED" | "REVOKED" | "RETIRED" | undefined;
  latitude: number;
  longitude: number;
  speedKmh: number;
  headingDegrees: number;
  altitudeMeters: number;
  gpsAccuracyMeters: number;
  batteryVolts: number;
  capturedAtTimestamp: number;
  sequenceNumber: number;
}

export interface TelemetryAnomalyDetail {
  severity: AnomalySeverity;
  reason: string;
  confidence: number;
  calculatedMetric: number;
  thresholdLimit: number;
}

export interface TelemetryIngestionResult {
  accepted: boolean;
  isAnomaly: boolean;
  severity?: AnomalySeverity | undefined;
  anomalies: TelemetryAnomalyDetail[];
  normalizedRecord?: NormalizedTelemetryRecord | undefined;
  error?: DomainError | undefined;
}

export interface NormalizedTelemetryRecord {
  id: string;
  organizationId: string;
  vehicleId: string;
  deviceId: string;
  pointGeoJson: { type: "Point"; coordinates: [number, number] };
  speedKmh: number;
  headingDegrees: number;
  altitudeMeters: number;
  gpsAccuracyMeters: number;
  batteryVolts: number;
  isSuspect: boolean;
  highestSeverity?: AnomalySeverity | undefined;
  capturedAtIso: string;
  ingestedAtIso: string;
}

interface LastKnownTelemetry {
  lat: number;
  lng: number;
  timestamp: number;
  speedKmh: number;
  sequence: number;
}

const LAST_KNOWN_POSITIONS = new Map<string, LastKnownTelemetry>();

function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

export function calcularDistanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return calcularDistanciaKm(lat1, lon1, lat2, lon2) * 1000;
}

/**
 * Filtro de Deadband Geográfico e Heartbeat Temporal (Protege o banco de dados contra saturação de escrita)
 * - Transmite se van se deslocou >= limiteMetros (ex: 20m)
 * - Transmite se tempo decorrido >= intervaloMaximoMs (ex: 15s)
 */
export function deveTransmitirGpsDeadband(
  ultimo: { lat: number; lng: number; timestamp: number } | null,
  atual: { lat: number; lng: number; timestamp: number },
  limiteMetros = 20,
  intervaloMaximoMs = 15000,
): boolean {
  if (!ultimo) return true;
  const tempoDecorridoMs = atual.timestamp - ultimo.timestamp;
  if (tempoDecorridoMs >= intervaloMaximoMs) return true;

  const distanciaMetros = calcularDistanciaMetros(ultimo.lat, ultimo.lng, atual.lat, atual.lng);
  return distanciaMetros >= limiteMetros;
}

/**
 * Análise Multi-Variável de Anomalias de Telemetria
 */
export function processarIngestaoTelemetria(
  payload: TelemetryIngestionPayload,
): TelemetryIngestionResult {
  const agoraIso = new Date().toISOString();
  const anomalies: TelemetryAnomalyDetail[] = [];

  // 1. Validar status de segurança do dispositivo
  if (payload.deviceStatus === "REVOKED" || payload.deviceStatus === "RETIRED") {
    return {
      accepted: false,
      isAnomaly: true,
      severity: "CRITICAL",
      anomalies: [
        {
          severity: "CRITICAL",
          reason: "DEVICE_REVOKED: Dispositivo revogado tentando transmitir telemetria.",
          confidence: 1.0,
          calculatedMetric: 0,
          thresholdLimit: 0,
        },
      ],
      error: createDomainError(
        "DEVICE_REVOKED",
        `Dispositivo '${payload.deviceId}' está revogado.`,
      ),
    };
  }

  // 2. Validar limites de coordenadas geográficas
  if (
    payload.latitude < -90 ||
    payload.latitude > 90 ||
    payload.longitude < -180 ||
    payload.longitude > 180
  ) {
    return {
      accepted: false,
      isAnomaly: true,
      severity: "CRITICAL",
      anomalies: [
        {
          severity: "CRITICAL",
          reason: "COORDINATES_OUT_OF_BOUNDS: Coordenadas fora do globo terrestre.",
          confidence: 1.0,
          calculatedMetric: payload.latitude,
          thresholdLimit: 90,
        },
      ],
      error: createDomainError(
        "GEOFENCE_VIOLATION",
        "Coordenadas fora dos limites do globo terrestre.",
      ),
    };
  }

  // 3. Avaliação da precisão do sensor GPS
  if (payload.gpsAccuracyMeters > 50) {
    anomalies.push({
      severity: "LOW",
      reason: `GPS_DEGRADED_ACCURACY: Precisão de ${payload.gpsAccuracyMeters.toFixed(1)}m muito degradada.`,
      confidence: 0.6,
      calculatedMetric: payload.gpsAccuracyMeters,
      thresholdLimit: 50,
    });
  }

  // 4. Análise Cinemática Temporal com Posição Anterior
  const lastPos = LAST_KNOWN_POSITIONS.get(payload.vehicleId);

  if (lastPos) {
    // 4.1. Regressão Temporal (Timestamp no passado)
    if (payload.capturedAtTimestamp < lastPos.timestamp) {
      anomalies.push({
        severity: "HIGH",
        reason:
          "TIMESTAMP_REGRESSION: Evento recebido com horário anterior ao último evento registrado.",
        confidence: 0.95,
        calculatedMetric: lastPos.timestamp - payload.capturedAtTimestamp,
        thresholdLimit: 0,
      });
    }

    const deltaSeconds = Math.max(0.1, (payload.capturedAtTimestamp - lastPos.timestamp) / 1000);
    const deltaHoras = deltaSeconds / 3600;
    const distanciaKm = calcularDistanciaKm(
      lastPos.lat,
      lastPos.lng,
      payload.latitude,
      payload.longitude,
    );
    const velocidadeCalculadaKmh = distanciaKm / deltaHoras;

    // 4.2. Salto Impossível / Teleporte (> 180 km/h)
    if (velocidadeCalculadaKmh > 180 && distanciaKm > 0.5) {
      anomalies.push({
        severity: "CRITICAL",
        reason: `IMPOSSIBLE_SPEED_TELEPORT: Deslocamento de ${distanciaKm.toFixed(1)} km em ${deltaSeconds.toFixed(1)}s (${velocidadeCalculadaKmh.toFixed(0)} km/h calculados).`,
        confidence: 0.99,
        calculatedMetric: velocidadeCalculadaKmh,
        thresholdLimit: 180,
      });
    }

    // 4.3. Aceleração Absurda (> 8 m/s² ~= 28.8 km/h por segundo)
    const deltaSpeedKmh = Math.abs(payload.speedKmh - lastPos.speedKmh);
    const aceleracaoKmhS = deltaSpeedKmh / deltaSeconds;
    if (aceleracaoKmhS > 35 && deltaSeconds < 5) {
      anomalies.push({
        severity: "MEDIUM",
        reason: `EXTREME_ACCELERATION: Variação de velocidade de ${deltaSpeedKmh} km/h em ${deltaSeconds.toFixed(1)}s.`,
        confidence: 0.85,
        calculatedMetric: aceleracaoKmhS,
        thresholdLimit: 35,
      });
    }
  }

  // Determinar severidade máxima encontrada
  let highestSeverity: AnomalySeverity | undefined = undefined;
  if (anomalies.some((a) => a.severity === "CRITICAL")) highestSeverity = "CRITICAL";
  else if (anomalies.some((a) => a.severity === "HIGH")) highestSeverity = "HIGH";
  else if (anomalies.some((a) => a.severity === "MEDIUM")) highestSeverity = "MEDIUM";
  else if (anomalies.some((a) => a.severity === "LOW")) highestSeverity = "LOW";

  const isSuspect = highestSeverity === "HIGH" || highestSeverity === "CRITICAL";

  // Só atualizar histórico de posição se não for salto impossível (para não corromper o cálculo seguinte)
  if (highestSeverity !== "CRITICAL") {
    LAST_KNOWN_POSITIONS.set(payload.vehicleId, {
      lat: payload.latitude,
      lng: payload.longitude,
      timestamp: payload.capturedAtTimestamp,
      speedKmh: payload.speedKmh,
      sequence: payload.sequenceNumber,
    });
  }

  const normalizedRecord: NormalizedTelemetryRecord = {
    id: "tel_" + Math.random().toString(36).substring(2, 12),
    organizationId: payload.organizationId,
    vehicleId: payload.vehicleId,
    deviceId: payload.deviceId,
    pointGeoJson: {
      type: "Point",
      coordinates: [payload.longitude, payload.latitude],
    },
    speedKmh: payload.speedKmh,
    headingDegrees: payload.headingDegrees,
    altitudeMeters: payload.altitudeMeters,
    gpsAccuracyMeters: payload.gpsAccuracyMeters,
    batteryVolts: payload.batteryVolts,
    isSuspect,
    highestSeverity,
    capturedAtIso: new Date(payload.capturedAtTimestamp).toISOString(),
    ingestedAtIso: agoraIso,
  };

  return {
    accepted: true,
    isAnomaly: anomalies.length > 0,
    severity: highestSeverity,
    anomalies,
    normalizedRecord,
  };
}

export function resetTelemetryState() {
  LAST_KNOWN_POSITIONS.clear();
}
