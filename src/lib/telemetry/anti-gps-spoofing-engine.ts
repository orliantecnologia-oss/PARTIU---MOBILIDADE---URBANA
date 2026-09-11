/**
 * ==============================================================================
 * 🛡️ PARTIU ANTI-GPS SPOOFING & KINEMATIC INTEGRITY ENGINE (v1.0)
 * ==============================================================================
 * Motor de blindagem contra falso GPS, teletransporte espacial e adulteração
 * de coordenadas por aplicativos maliciosos ("fake GPS") no aparelho do motorista.
 * Garante equidade nas filas do aeroporto, rodoviária e áreas de alta demanda.
 * ==============================================================================
 */

export interface TelemetryPing {
  lat: number;
  lng: number;
  speedKmh?: number;
  timestamp?: number;
  accuracy?: number;
  isMock?: boolean;
}

export interface SpoofAnalysisResult {
  isSpoofed: boolean;
  riskScore: number; // 0.0 a 1.0
  severity: "CLEAN" | "SUSPICIOUS" | "CRITICAL";
  reasons: string[];
}

interface DriverLastPing {
  lat: number;
  lng: number;
  speedKmh: number;
  timestamp: number;
  repeatedCount: number;
}

function haversineMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
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

export class AntiGpsSpoofingEngine {
  private static instance: AntiGpsSpoofingEngine;
  private history: Map<string, DriverLastPing> = new Map();
  private suspiciousDrivers: Map<string, { blockedUntil: number; reason: string }> = new Map();

  private constructor() {}

  public static getInstance(): AntiGpsSpoofingEngine {
    if (!AntiGpsSpoofingEngine.instance) {
      AntiGpsSpoofingEngine.instance = new AntiGpsSpoofingEngine();
    }
    return AntiGpsSpoofingEngine.instance;
  }

  /**
   * Avalia a integridade cinemática do ping de GPS
   */
  public evaluatePing(driverId: string, ping: TelemetryPing): SpoofAnalysisResult {
    const now = ping.timestamp || Date.now();
    const reasons: string[] = [];
    let riskScore = 0;

    // 1. Verificação de Flag de Mock Provider (Sensor OS)
    if (ping.isMock) {
      reasons.push("MOCK_PROVIDER_ACTIVE: Dispositivo reportou provedor simulador de localização ativado.");
      riskScore = 1.0;
    }

    // 2. Verificação de Precisão Absurda
    if (ping.accuracy !== undefined && (ping.accuracy <= 0.05 || ping.accuracy > 300)) {
      if (ping.accuracy <= 0.05) {
        reasons.push("ARTIFICIAL_PRECISION: Precisão milimétrica sintética não condizente com satélites GNSS civis.");
        riskScore += 0.4;
      }
    }

    const last = this.history.get(driverId);
    if (last) {
      const deltaSec = Math.max(0.2, (now - last.timestamp) / 1000);
      const deltaMetros = haversineMetros(last.lat, last.lng, ping.lat, ping.lng);
      const velocidadeCalculadaKmh = (deltaMetros / deltaSec) * 3.6;

      // 3. Detecção de Salto Espacial / Teletransporte (> 140 km/h em trecho urbano com distância > 300m)
      if (velocidadeCalculadaKmh > 140 && deltaMetros > 300) {
        reasons.push(
          `TELEPORT_ANOMALY: Salto de ${Math.round(deltaMetros)}m em ${deltaSec.toFixed(1)}s (${Math.round(velocidadeCalculadaKmh)} km/h calculados).`
        );
        riskScore += 0.9;
      }

      // 4. Detecção de Congelamento com Velocidade (Freeze)
      const isIdentico = Math.abs(ping.lat - last.lat) < 0.000001 && Math.abs(ping.lng - last.lng) < 0.000001;
      if (isIdentico && ping.speedKmh && ping.speedKmh > 15) {
        reasons.push("FROZEN_COORDINATE: Coordenadas exatamente idênticas enquanto veículo reporta velocidade em trânsito.");
        riskScore += 0.5;
      }

      // Atualiza repetições
      const repeatedCount = isIdentico ? last.repeatedCount + 1 : 0;
      this.history.set(driverId, {
        lat: ping.lat,
        lng: ping.lng,
        speedKmh: ping.speedKmh || 0,
        timestamp: now,
        repeatedCount,
      });
    } else {
      this.history.set(driverId, {
        lat: ping.lat,
        lng: ping.lng,
        speedKmh: ping.speedKmh || 0,
        timestamp: now,
        repeatedCount: 0,
      });
    }

    riskScore = Math.min(1.0, riskScore);

    const isSpoofed = riskScore >= 0.7;
    const severity = riskScore >= 0.7 ? "CRITICAL" : riskScore >= 0.4 ? "SUSPICIOUS" : "CLEAN";

    // Se detectada fraude crítica, suspende temporariamente por 5 minutos
    if (isSpoofed) {
      this.suspiciousDrivers.set(driverId, {
        blockedUntil: Date.now() + 5 * 60 * 1000,
        reason: reasons[0] || "Fraude de GPS detectada",
      });
    }

    return {
      isSpoofed,
      riskScore,
      severity,
      reasons,
    };
  }

  /**
   * Checa se o condutor está sob suspensão por inconsistência de GPS
   */
  public isDriverSuspended(driverId: string): boolean {
    const record = this.suspiciousDrivers.get(driverId);
    if (!record) return false;
    if (Date.now() > record.blockedUntil) {
      this.suspiciousDrivers.delete(driverId);
      return false;
    }
    return true;
  }

  public clearSuspension(driverId: string): void {
    this.suspiciousDrivers.delete(driverId);
  }

  public reset(): void {
    this.history.clear();
    this.suspiciousDrivers.clear();
  }
}

export const antiGpsSpoofingEngine = AntiGpsSpoofingEngine.getInstance();
