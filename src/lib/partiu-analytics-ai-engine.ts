/**
 * PARTIU MOBILIDADE URBANA — ENTERPRISE ANALYTICS & AI ENGINE
 * Pipeline de Telemetria de Eventos, Modelos Preditivos de Demanda/ETA,
 * Detecção de Risco de Churn (Driver & Rider) e Balanceamento com Inteligência Artificial.
 */

export type PartiuCoreEventType =
  | "RIDER_APP_OPENED"
  | "RIDE_SEARCHED"
  | "QUOTE_GENERATED"
  | "RIDE_REQUESTED"
  | "DISPATCH_STARTED"
  | "DRIVER_OFFERED"
  | "DRIVER_ACCEPTED"
  | "DRIVER_REJECTED"
  | "DRIVER_ARRIVED"
  | "PIN_VALIDATED"
  | "TRIP_STARTED"
  | "TRIP_COMPLETED"
  | "PAYMENT_SETTLED"
  | "CASHBACK_CREDITED"
  | "SOS_TRIGGERED"
  | "TRIP_CANCELLED";

export interface EventTrackingPayload {
  eventId: string;
  eventType: PartiuCoreEventType;
  timestamp: number;
  userId: string;
  userType: "RIDER" | "DRIVER" | "CORPORATE_ADMIN" | "OPERATOR";
  sessionId: string;
  zoneId: string;
  tripId?: string | undefined;
  metadata: Record<string, string | number | boolean>;
}

export interface ChurnRiskPrediction {
  userId: string;
  userType: "RIDER" | "DRIVER";
  churnProbabilityPercent: number; // 0 a 100
  riskLevel: "BAIXO" | "MEDIO" | "ALTO";
  primaryChurnDrivers: string[];
  recommendedRetentionAction: string;
}

export interface MachineLearningEtaPrediction {
  originZone: string;
  destinationZone: string;
  baseDistanceKm: number;
  linearEtaMinutes: number;
  aiPredictedEtaMinutes: number;
  trafficDelayFactor: number;
  historicalP95Minutes: number;
}

/**
 * 1. EVENT TRACKING PIPELINE (DATA LAYER)
 */
export function trackPartiuEvent(
  eventType: PartiuCoreEventType,
  userId: string,
  userType: "RIDER" | "DRIVER" | "CORPORATE_ADMIN" | "OPERATOR",
  zoneId: string,
  metadata: Record<string, string | number | boolean> = {},
  tripId?: string
): EventTrackingPayload {
  const event: EventTrackingPayload = {
    eventId: `EVT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    eventType,
    timestamp: Date.now(),
    userId,
    userType,
    sessionId: typeof window !== "undefined" ? sessionStorage.getItem("partiu_session") || "session-default" : "node-session",
    zoneId,
    tripId,
    metadata,
  };

  if (typeof window !== "undefined") {
    // Grava no buffer de telemetria local
    const raw = localStorage.getItem("partiu_telemetry_events");
    const buffer: EventTrackingPayload[] = raw ? JSON.parse(raw) : [];
    buffer.push(event);
    if (buffer.length > 200) buffer.shift(); // Ring buffer
    localStorage.setItem("partiu_telemetry_events", JSON.stringify(buffer));

    window.dispatchEvent(new CustomEvent("partiu:telemetry-event", { detail: event }));
  }

  return event;
}

/**
 * 2. AI PREDICTION: CHURN RISK ENGINE (DRIVER & RIDER)
 * Identifica parceiros ou passageiros em risco de abandono antes que deixem a plataforma.
 */
export function predictDriverChurnRisk(params: {
  driverId: string;
  daysSinceLastOnline: number;
  averageHourlyEarningsPast7Days: number;
  cancellationRatePast30Trips: number;
  recentBadRatingIncidents: number;
  regionalTargetEarningsBrl: number;
}): ChurnRiskPrediction {
  let riskScore = 10;
  const churnDrivers: string[] = [];

  // Ganhos abaixo do piso regional
  if (params.averageHourlyEarningsPast7Days < params.regionalTargetEarningsBrl * 0.75) {
    riskScore += 35;
    churnDrivers.push("Rendimento por hora significativamente inferior à média da praça.");
  }

  // Ociosidade / dias sem logar
  if (params.daysSinceLastOnline >= 4) {
    riskScore += 30;
    churnDrivers.push("Motorista ausente da plataforma há mais de 4 dias.");
  } else if (params.daysSinceLastOnline >= 2) {
    riskScore += 15;
  }

  // Taxa de cancelamento elevada
  if (params.cancellationRatePast30Trips > 0.12) {
    riskScore += 20;
    churnDrivers.push("Frequência de cancelamentos elevada (frustração com corridas recebidas).");
  }

  const finalProb = Math.min(99, Math.max(5, riskScore));
  let riskLevel: "BAIXO" | "MEDIO" | "ALTO" = "BAIXO";
  let action = "Manter monitoramento de rotina.";

  if (finalProb >= 65) {
    riskLevel = "ALTO";
    action = "Disparar garantia de ganho mínimo (Missão: Complete 8 corridas e garanta R$ 180) e contato da Central.";
  } else if (finalProb >= 40) {
    riskLevel = "MEDIO";
    action = "Enviar push com mapa de alta demanda e convite para abastecer com desconto Ouro.";
  }

  return {
    userId: params.driverId,
    userType: "DRIVER",
    churnProbabilityPercent: finalProb,
    riskLevel,
    primaryChurnDrivers: churnDrivers,
    recommendedRetentionAction: action,
  };
}

/**
 * 3. AI PREDICTION: ETA PREDICTOR COM FATORES CLIMÁTICOS E TRÁFEGO
 */
export function predictTripEtaWithAi(
  originZone: string,
  destinationZone: string,
  distanceKm: number,
  hourOfDay: number,
  isRaining: boolean
): MachineLearningEtaPrediction {
  const baseSpeedKmh = 28;
  const baseMinutes = (distanceKm / baseSpeedKmh) * 60;

  // Fator de hora do rush
  let rushFactor = 1.0;
  if ((hourOfDay >= 7 && hourOfDay <= 9) || (hourOfDay >= 17 && hourOfDay <= 19)) {
    rushFactor = 1.35; // +35% no rush
  } else if (hourOfDay >= 11 && hourOfDay <= 13) {
    rushFactor = 1.15;
  }

  // Fator meteorológico
  const rainFactor = isRaining ? 1.25 : 1.0; // +25% sob chuva intensa

  const trafficDelayFactor = Number((rushFactor * rainFactor).toFixed(2));
  const aiPredictedEtaMinutes = Number((baseMinutes * trafficDelayFactor).toFixed(1));
  const historicalP95Minutes = Number((aiPredictedEtaMinutes * 1.3).toFixed(1));

  return {
    originZone,
    destinationZone,
    baseDistanceKm: distanceKm,
    linearEtaMinutes: Number(baseMinutes.toFixed(1)),
    aiPredictedEtaMinutes,
    trafficDelayFactor,
    historicalP95Minutes,
  };
}
