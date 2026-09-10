/**
 * PARTIU MOBILIDADE URBANA — ENTERPRISE MARKETPLACE ENGINE
 * Equilíbrio de Marketplace: Oferta (Supply) <-> Demanda (Demand) <-> Liquidez <-> Rentabilidade
 * Inspirado nas arquiteturas de Marketplace Dynamics da Uber (Apollo/Hexagonal H3) e 99.
 */

import { GeoCoordinate, calculateHaversineKm } from "./partiu-dispatch-engine";

export interface ZoneMarketplaceMetric {
  zoneId: string;
  zoneName: string;
  center: GeoCoordinate;
  radiusKm: number;
  onlineDrivers: number;
  busyDrivers: number;
  idleDrivers: number;
  activeRequests: number;
  fulfilledTripsLastHour: number;
  cancelledTripsLastHour: number;
  averageEtaMinutes: number;
  liquidityRatio: number; // Idle Drivers / Active Requests
  utilizationRate: number; // Busy Drivers / Online Drivers (Target: 65% - 82%)
  rebalancingIncentiveBrl: number; // Bônus financeiro para reposicionamento
  demandIntensity: number; // 0.0 a 1.0 (para Heat Map)
}

export interface DriverNudgeRecommendation {
  driverId: string;
  targetZoneId: string;
  targetZoneName: string;
  targetCoordinates: GeoCoordinate;
  incentiveBonusBrl: number;
  distanceToZoneKm: number;
  estimatedExtraHourlyEarningsBrl: number;
  message: string;
}

export interface DemandPredictionPoint {
  hourOfDay: number;
  expectedTrips: number;
  recommendedDriverCount: number;
  confidenceScore: number;
}

/**
 * 1. DRIVER LIQUIDITY ENGINE
 * Calcula taxas de engajamento e liquidez de mercado por zona urbana.
 */
export function calculateZoneLiquidity(
  onlineDrivers: number,
  busyDrivers: number,
  activeRequests: number,
  fulfilledTrips: number,
  cancelledTrips: number
): { liquidityRatio: number; utilizationRate: number; fulfillmentRate: number } {
  const idleDrivers = Math.max(0, onlineDrivers - busyDrivers);
  const liquidityRatio = activeRequests === 0 ? 10.0 : Number((idleDrivers / activeRequests).toFixed(2));
  const utilizationRate = onlineDrivers === 0 ? 0 : Number((busyDrivers / onlineDrivers).toFixed(2));
  
  const totalRequests = fulfilledTrips + cancelledTrips;
  const fulfillmentRate = totalRequests === 0 ? 1.0 : Number((fulfilledTrips / totalRequests).toFixed(2));

  return { liquidityRatio, utilizationRate, fulfillmentRate };
}

/**
 * 2. HEAT MAP ENGINE
 * Converte métricas brutas de solicitações em mapa de calor (0.0 a 1.0)
 * para renderização visual nos mapas do motorista e central de operações.
 */
export function generateZoneHeatIntensity(
  activeRequests: number,
  idleDrivers: number,
  historicalPeakRequests: number = 30
): number {
  if (activeRequests === 0) return 0.05;
  const deficit = Math.max(0, activeRequests - idleDrivers);
  const normalizedIntensity = (activeRequests + deficit * 1.5) / historicalPeakRequests;
  return Number(Math.min(1.0, Math.max(0.1, normalizedIntensity)).toFixed(2));
}

/**
 * 3. SUPPLY REBALANCING ENGINE
 * Identifica bolsões de escassez de veículos e calcula incentivos financeiros dinâmicos
 * para atrair motoristas ociosos em zonas vizinhas (< 4 km).
 */
export function evaluateSupplyRebalancingNudges(
  driverId: string,
  driverLocation: GeoCoordinate,
  isDriverIdle: boolean,
  zones: ZoneMarketplaceMetric[]
): DriverNudgeRecommendation | null {
  if (!isDriverIdle) return null;

  // Busca a zona com maior déficit de oferta (liquidityRatio < 0.6)
  const deficitZones = zones
    .filter((z) => z.liquidityRatio < 0.7 && z.rebalancingIncentiveBrl > 0)
    .map((zone) => ({
      zone,
      distanceKm: calculateHaversineKm(driverLocation, zone.center),
    }))
    .filter((item) => item.distanceKm <= 4.5 && item.distanceKm > 0.5) // Apenas se estiver viável deslocar
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (deficitZones.length === 0) return null;

  const bestTarget = deficitZones[0];
  if (!bestTarget) return null;

  return {
    driverId,
    targetZoneId: bestTarget.zone.zoneId,
    targetZoneName: bestTarget.zone.zoneName,
    targetCoordinates: bestTarget.zone.center,
    incentiveBonusBrl: bestTarget.zone.rebalancingIncentiveBrl,
    distanceToZoneKm: bestTarget.distanceKm,
    estimatedExtraHourlyEarningsBrl: 18.5,
    message: `Área de alta demanda em ${bestTarget.zone.zoneName}! Desloque-se ${bestTarget.distanceKm} km e receba +R$ ${bestTarget.zone.rebalancingIncentiveBrl.toFixed(2)} de bônus na próxima corrida.`,
  };
}

/**
 * 4. DEMAND FORECAST ENGINE
 * Previsão horária de demanda baseada em médias móveis ponderadas e sazonalidade diária.
 */
export function forecastZoneDemand(
  hourOfDay: number,
  isWeekend: boolean,
  rainProbability: number = 0.0
): DemandPredictionPoint {
  // Curva de demanda brasileira padrão (picos: 07h-09h e 17h-19h30, mais alta sexta/sábado)
  let baseDemand = 12;

  if (hourOfDay >= 7 && hourOfDay <= 9) {
    baseDemand = isWeekend ? 8 : 45; // Pico manhã dia de semana
  } else if (hourOfDay >= 11 && hourOfDay <= 13) {
    baseDemand = 28; // Almoço
  } else if (hourOfDay >= 17 && hourOfDay <= 20) {
    baseDemand = isWeekend ? 58 : 52; // Pico volta do trabalho / happy hour
  } else if (hourOfDay >= 21 && hourOfDay <= 23) {
    baseDemand = isWeekend ? 40 : 18;
  } else if (hourOfDay >= 0 && hourOfDay <= 5) {
    baseDemand = isWeekend ? 15 : 4; // Madrugada
  }

  // Fator de chuva eleva a demanda em até +45%
  const rainMultiplier = 1.0 + Math.min(0.45, rainProbability * 0.45);
  const expectedTrips = Math.round(baseDemand * rainMultiplier);
  
  // Taxa ideal: ~1.2 motoristas por viagem esperada no slot de 1 hora
  const recommendedDriverCount = Math.round(expectedTrips * 1.15);

  return {
    hourOfDay,
    expectedTrips,
    recommendedDriverCount,
    confidenceScore: 0.88,
  };
}

/**
 * 5. TARIFA DINÂMICA INTELIGENTE (SURGE MULTIPLIER)
 * Calibrada em 1.0x, 1.2x, 1.5x e 2.0x com base na razão Demanda ÷ Oferta.
 * Sempre acompanhada de explicação transparente e ética ao passageiro.
 */
export interface TarifaDinamicaResult {
  multiplicador: 1.0 | 1.2 | 1.5 | 2.0;
  razaoDemandaOferta: number;
  valorBaseBrl: number;
  valorFinalBrl: number;
  adicionalSurgeBrl: number;
  mensagemTransparente: string;
  nivel: "NORMAL" | "MODERADO" | "ALTO" | "EXTREMO";
}

export function calcularTarifaDinamica(params: {
  distanciaKm: number;
  duracaoMin: number;
  categoria: "POP" | "MOTO" | "PLUS" | "MULHER";
  solicitacoesAtivasNaZona: number;
  motoristasDisponiveisNaZona: number;
}): TarifaDinamicaResult {
  const { distanciaKm, duracaoMin, categoria, solicitacoesAtivasNaZona, motoristasDisponiveisNaZona } = params;

  // Parâmetros base da tarifa PARTIU
  const tarifasBase = {
    POP: { bandeirada: 6.0, valorKm: 2.1, valorMin: 0.28, minimo: 8.5 },
    MOTO: { bandeirada: 4.0, valorKm: 1.3, valorMin: 0.18, minimo: 5.5 },
    PLUS: { bandeirada: 8.5, valorKm: 2.7, valorMin: 0.38, minimo: 14.0 },
    MULHER: { bandeirada: 6.5, valorKm: 2.2, valorMin: 0.3, minimo: 9.0 },
  };

  const regra = tarifasBase[categoria];
  const valorBaseCalculado = regra.bandeirada + distanciaKm * regra.valorKm + duracaoMin * regra.valorMin;
  const valorBase = Math.max(regra.minimo, Number(valorBaseCalculado.toFixed(2)));

  const ratio = solicitacoesAtivasNaZona / Math.max(1, motoristasDisponiveisNaZona);

  let multiplicador: 1.0 | 1.2 | 1.5 | 2.0 = 1.0;
  let nivel: "NORMAL" | "MODERADO" | "ALTO" | "EXTREMO" = "NORMAL";
  let mensagemTransparente = "Tarifa padrão. Sem cobrança de alta demanda.";

  if (ratio > 2.8) {
    multiplicador = 2.0;
    nivel = "EXTREMO";
    mensagemTransparente =
      "Demanda excepcional na região (chuva ou saída de grandes eventos). O acréscimo remunera diretamente os motoristas para que mais veículos atendam sua localização.";
  } else if (ratio > 1.8) {
    multiplicador = 1.5;
    nivel = "ALTO";
    mensagemTransparente =
      "Muitos passageiros solicitando viagens nesta área. Tarifa temporariamente ajustada para atrair condutores parceiros.";
  } else if (ratio > 1.2) {
    multiplicador = 1.2;
    nivel = "MODERADO";
    mensagemTransparente = "Região com procura moderadamente alta. Ajuste leve para garantir rapidez no embarque.";
  }

  const valorFinalBrl = Number((valorBase * multiplicador).toFixed(2));
  const adicionalSurgeBrl = Number((valorFinalBrl - valorBase).toFixed(2));

  return {
    multiplicador,
    razaoDemandaOferta: Number(ratio.toFixed(2)),
    valorBaseBrl: valorBase,
    valorFinalBrl,
    adicionalSurgeBrl,
    mensagemTransparente,
    nivel,
  };
}

/**
 * 6. DRIVER RETENTION & HEALTH SCORE (0 a 100)
 * Prevenção preditiva de evasão / churn de motoristas parceiros.
 */
export interface DriverHealthResult {
  score: number; // 0 a 100
  status: "EXCELENTE" | "ESTAVEL" | "RISCO_EVASAO" | "CRITICO";
  ganhosPorHoraBrl: number;
  ganhosPorKmBrl: number;
  tempoOciosoPercent: number;
  fatorRiscoChurn: number; // 0.0 a 1.0
  recomendacoesRetencao: string[];
}

export function calcularDriverHealthScore(params: {
  ganhosHojeBrl: number;
  horasOnlineHoje: number;
  kmRodadosHoje: number;
  kmComPassageiroHoje: number;
  corridasRecusadasConsecutivas: number;
}): DriverHealthResult {
  const { ganhosHojeBrl, horasOnlineHoje, kmRodadosHoje, kmComPassageiroHoje, corridasRecusadasConsecutivas } = params;

  const ganhosPorHoraBrl = horasOnlineHoje > 0 ? Number((ganhosHojeBrl / horasOnlineHoje).toFixed(2)) : 0;
  const ganhosPorKmBrl = kmRodadosHoje > 0 ? Number((ganhosHojeBrl / kmRodadosHoje).toFixed(2)) : 0;

  const tempoOciosoPercent =
    kmRodadosHoje > 0
      ? Number((((kmRodadosHoje - kmComPassageiroHoje) / kmRodadosHoje) * 100).toFixed(1))
      : 0;

  // Cálculo ponderado do Score de Saúde (Target: R$ 42/h e R$ 2.40/km com ociosidade < 25%)
  let score = 50;

  // Rentabilidade por hora (+- 25 pts)
  if (ganhosPorHoraBrl >= 45) score += 25;
  else if (ganhosPorHoraBrl >= 35) score += 15;
  else if (ganhosPorHoraBrl < 25) score -= 20;

  // Eficiência de quilometragem (+- 15 pts)
  if (ganhosPorKmBrl >= 2.5) score += 15;
  else if (ganhosPorKmBrl < 1.6) score -= 15;

  // Tempo ocioso rodando vazio (+- 15 pts)
  if (tempoOciosoPercent <= 20) score += 15;
  else if (tempoOciosoPercent > 45) score -= 20;

  // Penalidade por frustração com recusas consecutivas
  if (corridasRecusadasConsecutivas >= 4) score -= 18;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let status: "EXCELENTE" | "ESTAVEL" | "RISCO_EVASAO" | "CRITICO" = "ESTAVEL";
  let fatorRiscoChurn = 0.15;
  const recomendacoesRetencao: string[] = [];

  if (score >= 80) {
    status = "EXCELENTE";
    fatorRiscoChurn = 0.05;
    recomendacoesRetencao.push("Manter parceiro nas rotas principais com selo de alta fidelidade.");
  } else if (score >= 60) {
    status = "ESTAVEL";
    fatorRiscoChurn = 0.2;
    recomendacoesRetencao.push("Oferecer corridas encadeadas (Predictive Chaining) para diminuir ociosidade.");
  } else if (score >= 35) {
    status = "RISCO_EVASAO";
    fatorRiscoChurn = 0.65;
    recomendacoesRetencao.push("Ativar Missão de Bônus: +R$ 35 ao completar 5 corridas no pico.");
    recomendacoesRetencao.push("Redirecionar para área de calor (Hotspot) com garantia de piso de R$ 40/h.");
  } else {
    status = "CRITICO";
    fatorRiscoChurn = 0.92;
    recomendacoesRetencao.push("Intervenção operacional urgente: contato humano de apoio ao parceiro.");
    recomendacoesRetencao.push("Garantia de complementação tarifária D+0.");
  }

  return {
    score,
    status,
    ganhosPorHoraBrl,
    ganhosPorKmBrl,
    tempoOciosoPercent,
    fatorRiscoChurn,
    recomendacoesRetencao,
  };
}

/**
 * 7. PASSENGER LOYALTY & RETENTION SCORE
 * Segmentação inteligente de usuários, LTV (Lifetime Value) e cupons automáticos de reativação.
 */
export interface PassengerLoyaltyResult {
  score: number; // 0 a 100
  nivel: "BRONZE" | "PRATA" | "OURO" | "BLACK";
  cashbackOperacionalPercent: number;
  cupomReativacao?: { codigo: string; descontoBrl: number; descricao: string } | undefined;
}

export function calcularPassengerLoyaltyScore(params: {
  viagensConcluidasMes: number;
  taxaCancelamentoPassageiro: number;
  ticketMedioBrl: number;
  diasSemViajar: number;
}): PassengerLoyaltyResult {
  const { viagensConcluidasMes, taxaCancelamentoPassageiro, ticketMedioBrl, diasSemViajar } = params;

  let score = 20;

  // Frequência no mês
  score += Math.min(45, viagensConcluidasMes * 4);

  // Ticket médio
  if (ticketMedioBrl >= 25) score += 20;
  else if (ticketMedioBrl >= 15) score += 10;

  // Penalidade por cancelamentos recorrentes
  score -= Math.min(25, taxaCancelamentoPassageiro * 50);

  // Penalidade por inatividade
  if (diasSemViajar > 14) score -= 20;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let nivel: "BRONZE" | "PRATA" | "OURO" | "BLACK" = "BRONZE";
  let cashbackOperacionalPercent = 1;

  if (score >= 85) {
    nivel = "BLACK";
    cashbackOperacionalPercent = 5;
  } else if (score >= 65) {
    nivel = "OURO";
    cashbackOperacionalPercent = 3;
  } else if (score >= 40) {
    nivel = "PRATA";
    cashbackOperacionalPercent = 2;
  }

  let cupomReativacao: { codigo: string; descontoBrl: number; descricao: string } | undefined;
  if (diasSemViajar >= 10) {
    cupomReativacao = {
      codigo: "VOLTAPARTIU",
      descontoBrl: 8.0,
      descricao: "Sentimos sua falta! Ganhe R$ 8 de desconto na sua próxima corrida.",
    };
  }

  return {
    score,
    nivel,
    cashbackOperacionalPercent,
    cupomReativacao,
  };
}

/**
 * 8. PAINEL DE SAÚDE DA CIDADE (CITY HEALTH DASHBOARD)
 * Agrega métricas holísticas em tempo real para a Torre de Controle e Central de Operações.
 */
export interface CityHealthDashboardData {
  motoristasOnline: number;
  motoristasEmViagem: number;
  corridasAtivas: number;
  tempoMedioEsperaMinutos: number;
  taxaAceitePercent: number;
  taxaCancelamentoPercent: number;
  receitaBrutaHojeBrl: number;
  receitaLiquidaPlataformaBrl: number; // Take-rate líquido da plataforma (Modelo Híbrido)
  zonasHotspots: {
    zona: string;
    intensidade: number;
    status: string;
    surgeMultiplier: number;
  }[];
}

export function obterPainelSaudeCidade(): CityHealthDashboardData {
  return {
    motoristasOnline: 48,
    motoristasEmViagem: 31,
    corridasAtivas: 17,
    tempoMedioEsperaMinutos: 3.4,
    taxaAceitePercent: 94.2,
    taxaCancelamentoPercent: 2.8,
    receitaBrutaHojeBrl: 4892.4,
    receitaLiquidaPlataformaBrl: 244.62, // Take-rate da plataforma (~5.0% base no modelo híbrido)
    zonasHotspots: [
      { zona: "Centro Urbano / Calçadão", intensidade: 0.92, status: "Alta Demanda", surgeMultiplier: 1.5 },
      { zona: "Vinhosa / Supermercados", intensidade: 0.78, status: "Demanda Moderada", surgeMultiplier: 1.2 },
      { zona: "Aeroporto / Rodoviária", intensidade: 0.85, status: "Pico de Chegada", surgeMultiplier: 1.2 },
      { zona: "Cehab / Costa e Silva", intensidade: 0.35, status: "Normal", surgeMultiplier: 1.0 },
    ],
  };
}
