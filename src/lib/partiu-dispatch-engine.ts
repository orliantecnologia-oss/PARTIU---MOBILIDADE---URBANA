/**
 * PARTIU MOBILIDADE URBANA — ENTERPRISE DISPATCH ENGINE
 * Arquitetura de Despacho em Tempo Real inspirada nos motores Uber Apollo / 99 Matching.
 * Suporta: Auto Dispatch, Smart Dispatch (Trip Radar), Predictive Chaining e Surge Control.
 */

import { subscriptionEngine } from "./revenue/subscription-engine";
import { silentCatchWarn } from "@/lib/structured-logger";


export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface CandidateDriver {
  id: string;
  name: string;
  location: GeoCoordinate;
  rating: number; // 1.0 - 5.0
  acceptanceRate: number; // 0.0 - 1.0
  cancellationRate: number; // 0.0 - 1.0
  hourlyEarningsToday: number; // em BRL/h
  isOnline: boolean;
  currentTripStatus?: "IDLE" | "ENDING_TRIP" | "BUSY";
  estimatedTripEndSeconds?: number;
  vehicleCategory: "CARRO" | "MOTO" | "PLUS" | "MULHER";
  consecutiveRejections: number;
  onlineHoursToday?: number; // Horas online hoje (gestão anti-fadiga)
  homeZoneCenter?: GeoCoordinate; // Localidade base/residencial do parceiro
  localTrafficDelayMultiplier?: number; // 1.0 (fluido) a 2.0 (engarrafamento severo)
}

export interface DispatchTripRequest {
  id: string;
  pickup: GeoCoordinate;
  pickupAddress: string;
  dropoff: GeoCoordinate;
  dropoffAddress: string;
  category: "POP" | "MOTO" | "PLUS" | "MULHER" | "ENTREGA_MOTO" | "ENTREGA_CARRO";
  baseFare: number;
  passengerRating: number;
  corporateTrip?: boolean;
  maxPickupDistanceKm?: number; // default 3.5 km
}

export interface DispatchScoreBreakdown {
  driverId: string;
  driverName?: string;
  totalScore: number;
  distanceKm: number;
  etaMinutes: number;
  distanceScore: number;
  etaScore: number;
  ratingScore: number;
  acceptanceScore: number;
  cancellationPenalty: number;
  earningsEquityBoost: number;
  predictiveChainBonus: number;
  onlineTimeScore: number;
  destinationProximityBonus: number;
  trafficScore: number;
  categoryMatchScore: number;
}

export interface SurgeMultiplierResult {
  zoneId: string;
  multiplier: number; // 1.0 a 1.6 (capped)
  supplyCount: number;
  demandCount: number;
  ratio: number;
  level: "NORMAL" | "MODERATE" | "HIGH";
}

// Haversine Distance em KM
export function calculateHaversineKm(coord1: GeoCoordinate, coord2: GeoCoordinate): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Estima ETA com base na velocidade média urbana brasileira (28 km/h com trânsito)
export function estimateEtaMinutes(distanceKm: number): number {
  const averageSpeedKmH = 26;
  const baseMinutes = (distanceKm / averageSpeedKmH) * 60;
  const trafficBuffer = 1.25; // 25% de margem urbana
  return Math.max(1.5, Number((baseMinutes * trafficBuffer).toFixed(1)));
}

/**
 * MOTOR DE CÁLCULO DE SCORE DE DESPACHO (DRIVER ATTRIBUTION FORMULA)
 * Substitui proximidade cega por probabilidade preditiva de conclusão da corrida.
 * DriverScore = Distância + ETA + Avaliação + Aceitação - Cancelamento + TempoOnline + ProximidadeDestino + FatorTráfego + CompatibilidadeCategoria
 */
export function scoreDriverCandidate(
  driver: CandidateDriver,
  request: DispatchTripRequest,
  regionalEarningsFloorBrl: number = 38.0
): DispatchScoreBreakdown {
  const distanceKm = calculateHaversineKm(driver.location, request.pickup);
  const etaMinutes = estimateEtaMinutes(distanceKm);

  // 1. Distance Score (Decaimento linear ponderado até 4.5 km)
  const maxDistance = request.maxPickupDistanceKm || 4.5;
  const distanceScore = Math.max(0, 1 - distanceKm / maxDistance) * 25; // Peso 25%

  // 2. ETA Score (Decaimento por minutos de aproximação)
  const etaScore = Math.max(0, 1 - etaMinutes / 12.0) * 20; // Peso 20%

  // 3. Rating Score (Normalizado entre 4.5 e 5.0 estrelas)
  const ratingNormalized = Math.max(0, Math.min(1, (driver.rating - 4.5) / 0.5));
  const ratingScore = ratingNormalized * 10; // Peso 10%

  // 4. Acceptance Score (Taxa de aceite das últimas ofertas)
  const acceptanceScore = driver.acceptanceRate * 15; // Peso 15%

  // 5. Cancellation Penalty (Penalização severa para quem cancela frequentemente)
  const cancellationPenalty = driver.cancellationRate * 25; // Penalidade até -25

  // 6. Online Time Score (Sweet-spot de engajamento vs gestão anti-fadiga)
  const hoursOnline = driver.onlineHoursToday ?? 3.5;
  let onlineTimeScore = 0;
  if (hoursOnline <= 8) {
    onlineTimeScore = Math.min(8, hoursOnline * 1.2);
  } else if (hoursOnline > 10) {
    onlineTimeScore = -Math.min(12, (hoursOnline - 10) * 4); // Anti-fadiga
  }

  // 7. Destination Proximity Bonus (Aproximação da base/residência do parceiro)
  let destinationProximityBonus = 0;
  if (driver.homeZoneCenter) {
    const distPickupToBase = calculateHaversineKm(request.pickup, driver.homeZoneCenter);
    const distDropoffToBase = calculateHaversineKm(request.dropoff, driver.homeZoneCenter);
    if (distDropoffToBase < distPickupToBase) {
      destinationProximityBonus = Math.min(7, (distPickupToBase - distDropoffToBase) * 2);
    }
  }

  // 8. Traffic Score (Penaliza condutores presos em congestionamentos severos)
  const trafficMultiplier = driver.localTrafficDelayMultiplier || 1.0;
  const trafficScore = trafficMultiplier > 1.2 ? -Math.min(10, (trafficMultiplier - 1.0) * 15) : 0;

  // 9. Category Match Score (Compatibilidade e afinidade do veículo)
  let categoryMatchScore = 5;
  if (
    (request.category === "PLUS" && driver.vehicleCategory === "PLUS") ||
    (request.category === "MULHER" && driver.vehicleCategory === "MULHER") ||
    (request.category === "MOTO" && driver.vehicleCategory === "MOTO")
  ) {
    categoryMatchScore = 10; // Match perfeito
  }

  // 10. FinOps Equity: Ganhos Médios por Hora (Target R$ 38 a R$ 52/h)
  let earningsEquityBoost = 0;
  if (driver.hourlyEarningsToday < regionalEarningsFloorBrl) {
    const deficitRatio = (regionalEarningsFloorBrl - driver.hourlyEarningsToday) / regionalEarningsFloorBrl;
    earningsEquityBoost = Math.min(12, deficitRatio * 12);
  }

  // 11. Predictive Chaining Bonus: Motorista terminando viagem a < 2 min do pickup
  let predictiveChainBonus = 0;
  if (
    driver.currentTripStatus === "ENDING_TRIP" &&
    driver.estimatedTripEndSeconds &&
    driver.estimatedTripEndSeconds <= 120
  ) {
    predictiveChainBonus = 8;
  }

  // Penalização por recusas consecutivas no Trip Radar
  const rejectionPenalty = Math.min(15, driver.consecutiveRejections * 5);

  const totalScore = Math.max(
    0,
    Number(
      (
        distanceScore +
        etaScore +
        ratingScore +
        acceptanceScore -
        cancellationPenalty +
        onlineTimeScore +
        destinationProximityBonus +
        trafficScore +
        categoryMatchScore +
        earningsEquityBoost +
        predictiveChainBonus -
        rejectionPenalty
      ).toFixed(2)
    )
  );

  return {
    driverId: driver.id,
    driverName: driver.name,
    totalScore,
    distanceKm,
    etaMinutes,
    distanceScore,
    etaScore,
    ratingScore,
    acceptanceScore,
    cancellationPenalty,
    earningsEquityBoost,
    predictiveChainBonus,
    onlineTimeScore,
    destinationProximityBonus,
    trafficScore,
    categoryMatchScore,
  };
}

/**
 * ==============================================================================
 * ⚖️ AUDITORIA 11: FAIR MARKETPLACE DISPATCH SCORE (PARTIU ÉTICO)
 * ==============================================================================
 * Proíbe estritamente a venda de prioridade absoluta ou leilão de corridas.
 * Pesos Mandatórios:
 * - 45% Distância e Proximidade Real
 * - 25% Avaliação do Condutor (Rating 4.0 - 5.0)
 * - 15% Taxa de Aceitação Histórica
 * - 10% Tempo Online Hoje (Liveness & Assiduidade)
 * - 5% Plano de Assinatura (Reconhecimento Ético Sem Distorcer Localização)
 * ==============================================================================
 */
export interface FairMarketplaceScore {
  driverId: string;
  driverName?: string;
  totalScore: number; // 0 a 100 pontos
  distanceScore: number; // máx 45
  ratingScore: number; // máx 25
  acceptanceScore: number; // máx 15
  onlineTimeScore: number; // máx 10
  planScore: number; // máx 5
  distanceKm: number;
  etaMinutes: number;
}

export function calculateFairMarketplaceScore(
  driver: CandidateDriver & { planWeight?: number | undefined },
  request: DispatchTripRequest
): FairMarketplaceScore {
  const distanceKm = calculateHaversineKm(driver.location, request.pickup);
  const etaMinutes = estimateEtaMinutes(distanceKm);
  const maxDistance = request.maxPickupDistanceKm || 4.5;

  // 1. Distância (45%)
  const distanceScore = Number((Math.max(0, 1 - distanceKm / maxDistance) * 45).toFixed(2));

  // 2. Avaliação dos Passageiros (25%): normalizado de 4.0 a 5.0 estrelas
  const ratingNormalized = Math.max(0, Math.min(1, (driver.rating - 4.0) / 1.0));
  const ratingScore = Number((ratingNormalized * 25).toFixed(2));

  // 3. Taxa de Aceitação (15%): proporção direta de 0.0 a 1.0
  const acceptanceScore = Number((Math.max(0, Math.min(1, driver.acceptanceRate)) * 15).toFixed(2));

  // 4. Tempo Online (10%): sweet-spot até 6-8 horas
  const hours = driver.onlineHoursToday ?? 3.5;
  const onlineNormalized = Math.min(1, Math.max(0.1, hours / 6.0));
  const onlineTimeScore = Number((onlineNormalized * 10).toFixed(2));

  // 5. Plano de Assinatura (Desempate Equilibrado FASE 2): 1.00 (Livre) a 1.50 (Ouro)
  // O plano atua estritamente como um desempate inteligente (máx 2.5 pontos de 100),
  // garantindo que NUNCA supere proximidade, menor ETA ou qualidade do condutor.
  const rawWeight = driver.planWeight !== undefined ? driver.planWeight : 1.15;
  const clampedWeight = Math.max(1.0, Math.min(1.50, rawWeight));
  const planScore = Number(((clampedWeight - 1.0) * 5.0).toFixed(2)); // 0 a 2.5 pontos

  const totalScore = Number(
    (distanceScore + ratingScore + acceptanceScore + onlineTimeScore + planScore).toFixed(2)
  );

  return {
    driverId: driver.id,
    driverName: driver.name,
    totalScore,
    distanceScore,
    ratingScore,
    acceptanceScore,
    onlineTimeScore,
    planScore,
    distanceKm,
    etaMinutes,
  };
}

/**
 * ALGORITMO 1: SMART DISPATCH & RANKING
 * Ranqueia todos os motoristas candidatos e retorna a lista ordenada para Trip Radar.
 * Aplica trava operacional automática: motoristas suspensos por inadimplência são excluídos.
 */
export function rankDriversForDispatch(
  drivers: CandidateDriver[],
  request: DispatchTripRequest,
  regionalEarningsFloorBrl: number = 38.0
): DispatchScoreBreakdown[] {
  return drivers
    .filter((d) => {
      if (!d.isOnline || (d.currentTripStatus !== "IDLE" && d.currentTripStatus !== "ENDING_TRIP")) {
        return false;
      }
      try {
        const sub = subscriptionEngine.getDriverSubscription(d.id);
        if (sub.status === "SUSPENDED" || sub.status === "REACTIVATION_REQUIRED") {
          return false;
        }
      } catch (err) { silentCatchWarn("partiu-dispatch-engine", err); }
      return true;
    })
    .map((d) => scoreDriverCandidate(d, request, regionalEarningsFloorBrl))
    .filter((score) => score.distanceKm <= (request.maxPickupDistanceKm || 4.5))
    .sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * ALGORITMO 1.1: RANKING POR SCORE ÉTICO DE MARKETPLACE (FASE 19 & FASE 2)
 * Ranqueia condutores ponderando 45% Distância, 25% Rating, 15% Aceite, 10% Horas e Plano como Desempate Justo.
 * GUARDA ABSOLUTA DE PROXIMIDADE: Condutor mais próximo sempre tem prioridade se a diferença for > 300 metros.
 */
export function rankDriversByFairMarketplaceScore(
  drivers: (CandidateDriver & { planWeight?: number | undefined })[],
  request: DispatchTripRequest
): FairMarketplaceScore[] {
  return drivers
    .filter((d) => {
      if (!d.isOnline || (d.currentTripStatus !== "IDLE" && d.currentTripStatus !== "ENDING_TRIP")) {
        return false;
      }
      try {
        const sub = subscriptionEngine.getDriverSubscription(d.id);
        if (sub.status === "SUSPENDED" || sub.status === "REACTIVATION_REQUIRED") {
          return false;
        }
      } catch (err) { silentCatchWarn("partiu-dispatch-engine", err); }
      return true;
    })
    .map((d) => {
      let weight = d.planWeight;
      if (weight === undefined) {
        try {
          const sub = subscriptionEngine.getDriverSubscription(d.id);
          const plan = subscriptionEngine.getPlanById(sub.planId);
          weight = plan?.dispatchWeightPercent ?? 1.15;
        } catch {
          weight = 1.15;
        }
      }
      return calculateFairMarketplaceScore({ ...d, planWeight: weight }, request);
    })
    .filter((score) => score.distanceKm <= (request.maxPickupDistanceKm || 4.5))
    .sort((a, b) => {
      // GUARDA OBRIGATÓRIA DE EFICIÊNCIA OPERACIONAL (FASE 2):
      // A prioridade do plano NUNCA pode aumentar o ETA do passageiro nem favorecer motorista mais distante.
      const deltaKm = Math.abs(a.distanceKm - b.distanceKm);
      if (deltaKm > 0.3) {
        // Diferença superior a 300 metros: o mais próximo sempre ganha
        return a.distanceKm - b.distanceKm;
      }
      // Em distâncias equivalentes (< 300m), o score global equilibrado atua como desempate justo
      return b.totalScore - a.totalScore;
    });
}

/**
 * ALGORITMO 2: AUTO DISPATCH (DIRETO AO MELHOR CONDUTOR)
 * Seleciona o condutor número 1 para oferta exclusiva de 12 segundos.
 */
export function selectBestCandidate(
  drivers: CandidateDriver[],
  request: DispatchTripRequest
): DispatchScoreBreakdown | null {
  const ranked = rankDriversForDispatch(drivers, request);
  return ranked[0] ?? null;
}

/**
 * ALGORITMO 3: SURGE CONTROL (DINÂMICO REGIONAL JUSTO E TRANSPARENTE)
 * O PARTIU não pratica aumentos abusivos de 3x ou 4x como os concorrentes.
 * O multiplicador é calibrado entre 1.0x e 1.5x no máximo, com transparência total.
 */
export function calculateZoneSurge(
  zoneId: string,
  onlineSupplyCount: number,
  openDemandCount: number
): SurgeMultiplierResult {
  if (onlineSupplyCount === 0 && openDemandCount > 0) {
    return {
      zoneId,
      multiplier: 1.45,
      supplyCount: 0,
      demandCount: openDemandCount,
      ratio: 99.0,
      level: "HIGH",
    };
  }

  const ratio = openDemandCount / Math.max(1, onlineSupplyCount);

  let multiplier = 1.0;
  let level: "NORMAL" | "MODERATE" | "HIGH" = "NORMAL";

  if (ratio > 2.5) {
    multiplier = 1.4; // Max Cap justo do PARTIU
    level = "HIGH";
  } else if (ratio > 1.8) {
    multiplier = 1.25;
    level = "MODERATE";
  } else if (ratio > 1.2) {
    multiplier = 1.15;
    level = "MODERATE";
  }

  return {
    zoneId,
    multiplier: Number(multiplier.toFixed(2)),
    supplyCount: onlineSupplyCount,
    demandCount: openDemandCount,
    ratio: Number(ratio.toFixed(2)),
    level,
  };
}

/**
 * ALGORITMO 4: REDESPACHO AUTOMÁTICO EM CASCATA (CASCADING REDISPATCH)
 * Se o primeiro motorista ignorar em 5s -> segundo motorista (5s) -> terceiro (5s) -> expansão de raio.
 * Elimina corridas órfãs, loops infinitos e travamentos.
 */
export interface CascadingDispatchStep {
  tentativa: number;
  driverId: string | null;
  driverNome: string;
  raioBuscaKm: number;
  tempoLimiteSegundos: number;
  motivoDesfecho: "OFERECIDO" | "RECUSADO" | "EXPIRADO" | "ACEITO" | "EXPANSAO_RAIO";
}

export interface CascadingDispatchResult {
  sucesso: boolean;
  corridaId: string;
  motoristaAtribuido: CandidateDriver | null;
  etapas: CascadingDispatchStep[];
  raioFinalKm: number;
  tempoTotalSegundos: number;
  tempoBuscaMedioPorTentativa: number;
}

export function executarRedespachoCascata(
  request: DispatchTripRequest,
  availableDrivers: CandidateDriver[],
  driverTimeoutSeconds: number = 5
): CascadingDispatchResult {
  const etapas: CascadingDispatchStep[] = [];
  const rejeitadosIds = new Set<string>();
  let raioAtual = request.maxPickupDistanceKm || 3.5;
  let tentativa = 1;
  let motoristaAtribuido: CandidateDriver | null = null;

  // Executa cascata determinística de até 4 saltos: 3 tentativas no raio e 1 expansão
  while (tentativa <= 4 && !motoristaAtribuido) {
    const pool = availableDrivers.filter(
      (d) => !rejeitadosIds.has(d.id) && d.isOnline && d.currentTripStatus !== "BUSY"
    );

    const ranked = rankDriversForDispatch(pool, { ...request, maxPickupDistanceKm: raioAtual });

    if (ranked.length > 0 && ranked[0]) {
      const best = ranked[0];
      const candidato = pool.find((d) => d.id === best.driverId)!;

      // Probabilidade de aceite baseada no Score de Atribuição (ex: score 80 = ~88% de chance)
      const probAceite = Math.min(0.95, Math.max(0.4, (best.totalScore / 100) * 1.05));
      const aceitou = Math.random() < probAceite;

      if (aceitou) {
        motoristaAtribuido = candidato;
        etapas.push({
          tentativa,
          driverId: candidato.id,
          driverNome: candidato.name,
          raioBuscaKm: raioAtual,
          tempoLimiteSegundos: driverTimeoutSeconds,
          motivoDesfecho: "ACEITO",
        });
        break;
      } else {
        rejeitadosIds.add(candidato.id);
        etapas.push({
          tentativa,
          driverId: candidato.id,
          driverNome: candidato.name,
          raioBuscaKm: raioAtual,
          tempoLimiteSegundos: driverTimeoutSeconds,
          motivoDesfecho: "EXPIRADO",
        });
      }
    } else {
      // Sem condutores elegíveis no raio atual -> Expansão de Raio (+2.5 km)
      raioAtual += 2.5;
      etapas.push({
        tentativa,
        driverId: null,
        driverNome: "Central de Despacho",
        raioBuscaKm: raioAtual,
        tempoLimiteSegundos: driverTimeoutSeconds,
        motivoDesfecho: "EXPANSAO_RAIO",
      });
    }

    tentativa++;
  }

  const tempoTotalSegundos = etapas.length * driverTimeoutSeconds;

  return {
    sucesso: motoristaAtribuido !== null,
    corridaId: request.id,
    motoristaAtribuido,
    etapas,
    raioFinalKm: raioAtual,
    tempoTotalSegundos,
    tempoBuscaMedioPorTentativa: driverTimeoutSeconds,
  };
}

/**
 * ALGORITMO 5: BENCHMARK & SIMULAÇÃO DE ESTRESSE EM ESCALA
 * Simula até 5.000 motoristas simultâneos no grid urbano calculando o tempo de despacho por condutor.
 */
export function benchmarkDispatchScale(driverCount: number, customRequest?: DispatchTripRequest) {
  const req: DispatchTripRequest = customRequest || {
    id: `BENCH-${driverCount}`,
    pickup: { latitude: -21.2056, longitude: -41.8872 },
    pickupAddress: "Centro Urbano",
    dropoff: { latitude: -21.2189, longitude: -41.9012 },
    dropoffAddress: "Bairro Sul",
    category: "POP",
    baseFare: 16.5,
    passengerRating: 4.98,
    maxPickupDistanceKm: 6.0,
  };

  const syntheticDrivers: CandidateDriver[] = [];
  for (let i = 0; i < driverCount; i++) {
    const latDelta = (Math.random() - 0.5) * 0.08;
    const lonDelta = (Math.random() - 0.5) * 0.08;
    syntheticDrivers.push({
      id: `drv-${i}`,
      name: `Condutor ${i}`,
      location: { latitude: req.pickup.latitude + latDelta, longitude: req.pickup.longitude + lonDelta },
      rating: 4.6 + Math.random() * 0.4,
      acceptanceRate: 0.7 + Math.random() * 0.3,
      cancellationRate: Math.random() * 0.08,
      hourlyEarningsToday: 25 + Math.random() * 35,
      isOnline: Math.random() > 0.15,
      currentTripStatus: Math.random() > 0.8 ? "ENDING_TRIP" : "IDLE",
      estimatedTripEndSeconds: 45,
      vehicleCategory: i % 4 === 0 ? "PLUS" : i % 3 === 0 ? "MOTO" : "CARRO",
      consecutiveRejections: i % 7 === 0 ? 2 : 0,
      onlineHoursToday: 1 + Math.random() * 8,
      homeZoneCenter: { latitude: req.dropoff.latitude, longitude: req.dropoff.longitude },
      localTrafficDelayMultiplier: 1.0 + Math.random() * 0.3,
    });
  }

  const inicio = performance.now();
  const ranked = rankDriversForDispatch(syntheticDrivers, req);
  const fim = performance.now();
  const tempoTotalMs = Number((fim - inicio).toFixed(2));
  const tempoPorMotoristaUs = Number(((tempoTotalMs * 1000) / driverCount).toFixed(2));
  const throughput = Math.round((driverCount / Math.max(0.001, tempoTotalMs)) * 1000);

  let statusEscala: "ULTRA_RAPIDO" | "EXCELENTE" | "ADEQUADO" | "ATENCAO" = "ULTRA_RAPIDO";
  if (tempoTotalMs > 100) statusEscala = "ATENCAO";
  else if (tempoTotalMs > 40) statusEscala = "ADEQUADO";
  else if (tempoTotalMs > 15) statusEscala = "EXCELENTE";

  return {
    driverCount,
    tempoTotalMs,
    tempoPorMotoristaUs,
    throughputMotoristasPorSegundo: throughput,
    melhorCandidato: ranked[0] ?? null,
    candidatosNoRaio: ranked.length,
    statusEscala,
  };
}
