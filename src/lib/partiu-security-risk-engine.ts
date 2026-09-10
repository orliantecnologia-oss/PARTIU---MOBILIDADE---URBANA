/**
 * PARTIU MOBILIDADE URBANA — ENTERPRISE TRUST, SAFETY & RISK ENGINE
 * Motor de Avaliação de Risco, Detecção de GPS Spoofing, Prevenção de Fraudes
 * e Matriz de Incidentes Críticos SOS 190 com SLA < 30 segundos.
 */

import { GeoCoordinate, calculateHaversineKm } from "./partiu-dispatch-engine";

export interface TelemetryPoint {
  coordinate: GeoCoordinate;
  timestamp: number; // ms
  speedKmh?: number;
  accuracyMeters?: number;
  isMocked?: boolean;
}

export interface RiskScoreResult {
  entityId: string;
  entityType: "PASSAGEIRO" | "MOTORISTA" | "CORRIDA" | "ENTREGA";
  riskScore: number; // 0 (Seguro) a 100 (Risco Crítico)
  riskLevel: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
  riskFactors: string[];
  actionRequired: "NENHUMA" | "EXIGIR_PIN" | "VALIDAR_SELFIE" | "BLOQUEIO_TEMPORARIO" | "ALERTA_NOC";
}

export interface GpsSpoofingReport {
  isSpoofed: boolean;
  confidencePercent: number;
  reasons: string[];
  calculatedSpeedKmh: number;
}

export interface SosIncidentEvent {
  id: string;
  tripId: string;
  triggerSource: "PASSAGEIRO" | "MOTORISTA" | "SISTEMA_COLISAO";
  location: GeoCoordinate;
  timestamp: number;
  driverPhone: string;
  riderPhone: string;
  status: "DISPARADO" | "EM_ATENDIMENTO" | "ENCAMINHADO_190" | "RESOLVIDO" | "ALARME_FALSO";
  slaCountdownSeconds: number; // SLA 30s
}

/**
 * 1. DETECTOR DE GPS SPOOFING E TELETRANSPORTE
 * Detecta aplicativos de Fake GPS, salto temporal e velocidades anômalas (> 160 km/h em perímetro urbano).
 */
export function detectGpsSpoofing(
  previousPoint: TelemetryPoint | null,
  currentPoint: TelemetryPoint
): GpsSpoofingReport {
  const reasons: string[] = [];

  // 1. Mock location provider ativado no Android/iOS
  if (currentPoint.isMocked) {
    reasons.push("Provedor de localização simulada (Mock Location Provider) detectado no dispositivo.");
  }

  if (!previousPoint) {
    return {
      isSpoofed: reasons.length > 0,
      confidencePercent: reasons.length > 0 ? 95 : 0,
      reasons,
      calculatedSpeedKmh: 0,
    };
  }

  // 2. Velocidade de salto vetorial entre pontos (Teletransporte)
  const distanceKm = calculateHaversineKm(previousPoint.coordinate, currentPoint.coordinate);
  const timeDeltaHours = Math.max(0.0001, (currentPoint.timestamp - previousPoint.timestamp) / (1000 * 3600));
  const calculatedSpeedKmh = distanceKm / timeDeltaHours;

  if (calculatedSpeedKmh > 165) {
    reasons.push(
      `Velocidade de deslocamento impossível detectada: ${calculatedSpeedKmh.toFixed(0)} km/h (salto vetorial).`
    );
  }

  // 3. Imobilidade suspeita com precisão perfeita (0.00m)
  if (currentPoint.accuracyMeters !== undefined && currentPoint.accuracyMeters < 0.1) {
    reasons.push("Precisão de GPS estática artificial (jitter zero).");
  }

  const isSpoofed = reasons.length > 0;
  return {
    isSpoofed,
    confidencePercent: isSpoofed ? (reasons.length >= 2 ? 98 : 85) : 0,
    reasons,
    calculatedSpeedKmh: Number(calculatedSpeedKmh.toFixed(1)),
  };
}

/**
 * 2. ACCOUNT & TRIP RISK ENGINE
 * Avalia o risco de segurança em 4 dimensões: Passageiro, Motorista, Corrida e Entrega.
 */
export function evaluateTripRisk(params: {
  tripId: string;
  riderRating: number;
  riderCompletedTrips: number;
  isNightTime: boolean; // 22h às 05h
  paymentMethod: "pix" | "cartao" | "dinheiro";
  destinationRiskZone: boolean;
  driverRating: number;
  isEntrega?: boolean;
}): RiskScoreResult {
  let score = 5; // Base segura
  const factors: string[] = [];

  // Horário Noturno
  if (params.isNightTime) {
    score += 15;
    factors.push("Viagem noturna (período de alta sensibilidade de segurança).");
  }

  // Conta do passageiro muito nova
  if (params.riderCompletedTrips < 3) {
    score += 18;
    factors.push("Passageiro recém-cadastrado com poucas viagens no histórico.");
  }

  // Pagamento em dinheiro vivo (maior risco de golpe/assalto)
  if (params.paymentMethod === "dinheiro") {
    score += 20;
    factors.push("Pagamento em espécie / dinheiro em mãos.");
  }

  // Zona de risco ou perímetro de pouca iluminação
  if (params.destinationRiskZone) {
    score += 25;
    factors.push("Destino em perímetro sensível mapeado pelas forças de segurança.");
  }

  // Avaliação baixa do usuário
  if (params.riderRating < 4.5) {
    score += 15;
    factors.push(`Avaliação do passageiro abaixo da média (${params.riderRating.toFixed(2)}).`);
  }

  // Clamp 0 a 100
  const finalScore = Math.min(100, Math.max(0, score));

  let riskLevel: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO" = "BAIXO";
  let actionRequired: "NENHUMA" | "EXIGIR_PIN" | "VALIDAR_SELFIE" | "BLOQUEIO_TEMPORARIO" | "ALERTA_NOC" =
    "NENHUMA";

  if (finalScore >= 75) {
    riskLevel = "CRITICO";
    actionRequired = "ALERTA_NOC";
  } else if (finalScore >= 50) {
    riskLevel = "ALTO";
    actionRequired = "EXIGIR_PIN";
  } else if (finalScore >= 30) {
    riskLevel = "MEDIO";
    actionRequired = "EXIGIR_PIN";
  }

  return {
    entityId: params.tripId,
    entityType: params.isEntrega ? "ENTREGA" : "CORRIDA",
    riskScore: finalScore,
    riskLevel,
    riskFactors: factors,
    actionRequired,
  };
}

/**
 * 3. DISPARO E GERENCIAMENTO DE SOS 190 (SLA < 30 SEGUNDOS)
 */
export function createSosIncident(
  tripId: string,
  source: "PASSAGEIRO" | "MOTORISTA",
  location: GeoCoordinate,
  driverPhone: string,
  riderPhone: string
): SosIncidentEvent {
  const incident: SosIncidentEvent = {
    id: `SOS-${Date.now().toString().slice(-6)}`,
    tripId,
    triggerSource: source,
    location,
    timestamp: Date.now(),
    driverPhone,
    riderPhone,
    status: "DISPARADO",
    slaCountdownSeconds: 30,
  };

  if (typeof window !== "undefined") {
    // Alerta no storage e dispara evento global
    localStorage.setItem("partiu_active_sos", JSON.stringify(incident));
    window.dispatchEvent(new CustomEvent("partiu:sos-triggered", { detail: incident }));
  }

  return incident;
}

/**
 * 4. MOTOR AVANÇADO ANTI-FRAUDE & ANÁLISE DE COMPORTAMENTO
 * Detecta: Corridas fantasmas, GPS Fake, conluio motorista-passageiro e cancelamentos em massa.
 */
export interface FraudAnalysisParams {
  userId: string;
  userType: "PASSAGEIRO" | "MOTORISTA";
  tripId?: string;
  cancelamentosUltimos10Min: number;
  mesmoDispositivoParaAmbos?: boolean;
  minutosParadoEmViagem?: number;
  isMockLocationActive?: boolean;
  reclamacoesSegurancaUltimos30Dias?: number;
  valorCorridaBrl?: number;
}

export interface FraudAnalysisResult {
  userId: string;
  userType: "PASSAGEIRO" | "MOTORISTA";
  riskScore: number; // 0 a 100
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  motivosDeteccao: string[];
  bloqueioAutomatico: boolean;
  tempoBloqueioMinutos?: number | undefined;
  acaoMitigacao: "NENHUMA" | "EXIGIR_SELFIE" | "BLOQUEIO_30_MIN" | "BANIMENTO_PREVENTIVO" | "EXIGIR_PIX";
}

export function analisarPadroesFraude(params: FraudAnalysisParams): FraudAnalysisResult {
  const motivos: string[] = [];
  let score = 0;

  // 1. Mock location provider / GPS fake
  if (params.isMockLocationActive) {
    score += 45;
    motivos.push("Uso de aplicativo de simulação de localização (Fake GPS).");
  }

  // 2. Conluio: passageiro e motorista no mesmo aparelho ou IP/device token idêntico
  if (params.mesmoDispositivoParaAmbos) {
    score += 65;
    motivos.push("Conluio detectado: conta de motorista e passageiro compartilhando mesmo identificador de hardware.");
  }

  // 3. Cancelamentos em massa (Brute Cancelling)
  if (params.cancelamentosUltimos10Min >= 4) {
    score += 35;
    motivos.push(`Comportamento abusivo de cancelamentos em série (${params.cancelamentosUltimos10Min} em 10 min).`);
  } else if (params.cancelamentosUltimos10Min >= 2) {
    score += 15;
    motivos.push("Múltiplos cancelamentos consecutivos.");
  }

  // 4. Ghost Riding: Veículo parado com corrida em andamento para inflacionar tempo/taxa
  if (params.minutosParadoEmViagem && params.minutosParadoEmViagem > 12) {
    score += 40;
    motivos.push(`Veículo imobilizado propositalmente por ${params.minutosParadoEmViagem} min durante viagem.`);
  }

  // 5. Histórico de queixas graves
  if (params.reclamacoesSegurancaUltimos30Dias && params.reclamacoesSegurancaUltimos30Dias >= 2) {
    score += 30;
    motivos.push("Reincidência em denúncias de conduta ou segurança.");
  }

  score = Math.min(100, Math.max(0, score));

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  let bloqueioAutomatico = false;
  let tempoBloqueioMinutos: number | undefined;
  let acaoMitigacao: "NENHUMA" | "EXIGIR_SELFIE" | "BLOQUEIO_30_MIN" | "BANIMENTO_PREVENTIVO" | "EXIGIR_PIX" =
    "NENHUMA";

  if (score >= 80) {
    riskLevel = "CRITICAL";
    bloqueioAutomatico = true;
    tempoBloqueioMinutos = 1440; // 24h
    acaoMitigacao = "BANIMENTO_PREVENTIVO";
  } else if (score >= 55) {
    riskLevel = "HIGH";
    bloqueioAutomatico = true;
    tempoBloqueioMinutos = 30;
    acaoMitigacao = "BLOQUEIO_30_MIN";
  } else if (score >= 30) {
    riskLevel = "MEDIUM";
    acaoMitigacao = params.userType === "MOTORISTA" ? "EXIGIR_SELFIE" : "EXIGIR_PIX";
  }

  return {
    userId: params.userId,
    userType: params.userType,
    riskScore: score,
    riskLevel,
    motivosDeteccao: motivos,
    bloqueioAutomatico,
    tempoBloqueioMinutos,
    acaoMitigacao,
  };
}
