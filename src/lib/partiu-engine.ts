/**
 * PARTIU MOBILIDADE URBANA & ENTREGAS — CORE ENGINE
 * Integração dos motores Enterprise: Despacho, Marketplace Dynamics, FinOps, Segurança, B2B, Flash e Realtime Distribuído.
 */

import {
  inicializarPartiuRealtime,
  broadcastEventoCorrida,
  criarCorridaDistribuida,
  aceitarCorridaDistribuida,
  atualizarStatusCorridaDistribuida,
  finalizarCorridaDistribuida,
  cancelarCorridaDistribuida,
} from "./partiu-realtime-service";
import { smartPassengerBoardingEngine } from "./boarding/boarding-engine";
import {
  createDeliverySession,
  courierHeadingToPickup,
  courierArrivedAtPickup,
  confirmPickup,
  courierHeadingToDelivery,
  courierArrivedAtDelivery,
  confirmDelivery,
  cancelDeliverySession,
  getActiveDeliverySession,
} from "./delivery";
import {
  driverEligibilityEngine,
  driverStateMachine,
  driverOfferEngine,
  driverLedgerEngine,
  driverTelemetryEngine,
} from "./driver";
import {
  processarCancelamentoComMulta,
  type CancellationFeeSettlement,
} from "./partiu-financial-engine";
import { atomicMatchingEngine } from "./dispatch-atomic";
import { redisLuaEngine } from "./spatial";
import { silentCatchWarn } from "@/lib/structured-logger";


export * from "./partiu-dispatch-engine";
export * from "./partiu-marketplace-engine";
export * from "./partiu-financial-engine";
export * from "./partiu-security-risk-engine";
export * from "./partiu-b2b-engine";
export * from "./partiu-flash-engine";
export * from "./partiu-realtime-service";
export * from "./partiu-city-os";
export * from "./partiu-digital-twin";
export * from "./partiu-risk-prediction-engine";
export * from "./partiu-autonomous-actions";
export * from "./partiu-observability";
export * from "./partiu-incident-engine";
export * from "./partiu-h3-engine";
export * from "./partiu-control-tower";
export * from "./partiu-scale-benchmark";
export * from "./ml/partiu-feature-store";
export * from "./ml/partiu-ml-platform";
export * from "./ml/partiu-deep-eta";
export * from "./ml/partiu-rl-dispatch";
export * from "./ml/partiu-surge-ai";
export * from "./ml/partiu-demand-forecast";
export * from "./ml/partiu-driver-churn";
export * from "./ml/partiu-passenger-ltv";
export * from "./ml/partiu-fraud-ai";
export * from "./ml/partiu-model-observability";
export * from "./ml/partiu-marketplace-simulator";
export * from "./ml/partiu-national-ai";
export * from "./ai/partiu-foundation-model";
export * from "./ai/agents/agent-contract";
export * from "./ai/agents/dispatch-agent";
export * from "./ai/agents/revenue-agent";
export * from "./ai/agents/supply-agent";
export * from "./ai/agents/demand-agent";
export * from "./ai/agents/fraud-agent";
export * from "./ai/agents/expansion-agent";
export * from "./ai/executive-board";
export * from "./ai/explainability-engine";
export * from "./ai/simulation-lab";
export * from "./ai/city-copilot";
export * from "./ai/city-expansion-engine";
export * from "./ai/governance-engine";
export * from "./ai/partiu-command-center";
export * from "./ai/extreme-scale-benchmark";
export * from "./economy/partiu-market-economy";
export * from "./economy/strategic-engine";
export * from "./economy/city-profitability";
export * from "./economy/experimentation-engine";
export * from "./economy/marketplace-simulator-v2";
export * from "./economy/driver-economics";
export * from "./economy/passenger-economics";
export * from "./economy/finops-engine";
export * from "./economy/national-strategy-engine";
export * from "./economy/autonomous-board";
export * from "./economy/fuel-stabilization-fund";
export * from "./finance/partiu-wallet";
export * from "./finance/pix-engine";
export * from "./finance/driver-credit-engine";
export * from "./finance/national-treasury";
export * from "./finance/capital-allocation-engine";
export * from "./distributed/state-mesh";
export * from "./distributed/edge-decision-engine";
export * from "./graph/graph-routing-engine";
export * from "./graph/congestion-ai";
export * from "./governance/policy-engine";
export * from "./multimodal/multimodal-network-engine";
export * from "./multimodal/intercity-dispatch-engine";
export * from "./multimodal/smart-cargo-engine";
export * from "./multimodal/logistics-marketplace";
export * from "./multimodal/route-consolidation-engine";
export * from "./graph/intercity-graph-engine";
export * from "./logistics/autonomous-freight-ai";
export * from "./logistics/hub-intelligence";
export * from "./whatsapp/whatsapp-session";
export * from "./whatsapp/whatsapp-booking";
export * from "./whatsapp/whatsapp-dispatch";
export * from "./whatsapp/whatsapp-webhook";
export * from "./whatsapp/whatsapp-ride-engine";
export * from "./corporate/corporate-engine";
export * from "./corporate/cost-center-engine";
export * from "./corporate/travel-policy-engine";
export * from "./corporate/approval-engine";
export * from "./corporate/billing-engine";
export * from "./franchise/franchise-engine";
export * from "./franchise/franchise-finance";
export * from "./franchise/franchise-royalties";
export * from "./franchise/franchise-governance";
export * from "./franchise/franchise-dashboard";
export * from "./trust/behavior-analysis";
export * from "./trust/reputation-engine";
export * from "./trust/trust-score";
export * from "./trust/passenger-trust-engine";
export * from "./ads/ads-auction-engine";
export * from "./ads/ads-targeting-engine";
export * from "./ads/ads-billing-engine";
export * from "./ads/ads-analytics";
export * from "./ads/ads-marketplace";
export * from "./regional-os/regional-growth-engine";
export * from "./regional-os/regional-economy-engine";
export * from "./regional-os/regional-operating-system";
export * from "./civic/civic-contracts";
export * from "./civic/civic-vouchers";
export * from "./civic/civic-transport";
export * from "./civic/civic-analytics";
export * from "./civic/civic-engine";
export * from "./smart-city/urban-metrics";
export * from "./smart-city/city-heatmap";
export * from "./smart-city/city-alerts";
export * from "./smart-city/urban-health-engine";
export * from "./smart-city/smart-city-engine";
export * from "./education/student-pass";
export * from "./education/campus-routing";
export * from "./education/education-analytics";
export * from "./education/university-engine";
export * from "./health/medical-rides";
export * from "./health/patient-routing";
export * from "./health/hospital-dispatch";
export * from "./health/health-mobility";
export * from "./tourism/city-tour-pass";
export * from "./tourism/events-engine";
export * from "./tourism/visitor-routing";
export * from "./tourism/tourism-engine";
export * from "./transit/van-network";
export * from "./transit/bus-network";
export * from "./transit/route-optimizer";
export * from "./transit/multimodal-engine";
export * from "./commerce/merchant-network";
export * from "./commerce/coupon-engine";
export * from "./commerce/cashback-engine";
export * from "./commerce/commerce-engine";
export * from "./identity/citizen-profile";
export * from "./identity/business-profile";
export * from "./identity/trust-verification";
export * from "./identity/identity-engine";
export * from "./data-exchange/data-hub";
export * from "./data-exchange/event-bus";
export * from "./data-exchange/stream-processor";
export * from "./data-exchange/regional-analytics";
export * from "./regional-os-v2/regional-brain";
export * from "./regional-os-v2/regional-economy";
export * from "./regional-os-v2/regional-health";
export * from "./regional-os-v2/regional-strategy";
export * from "./regional-os-v2/regional-orchestrator";
export * from "./governance/regional-board-v3";
export * from "./security";
export * from "./fintech-hardened";
export * from "./dispatch-atomic";
export * from "./spatial-sharding";
export * from "./events";
export * from "./observability";
export * from "./chaos";
export * from "./boarding";
export * from "./delivery";
export * from "./driver";
export * from "./revenue";

export type ModalidadePartiu =
  | "POP"
  | "MOTO"
  | "CARRO"
  | "EXECUTIVO"
  | "FLASH"
  | "ENTREGA"
  | "TURISMO"
  | "VAN"
  | "PLUS"
  | "NEGOCIA"
  | "MULHER"
  | "ENTREGA_MOTO"
  | "ENTREGA_CARRO";

export type StatusCorrida =
  | "IDLE"
  | "PROCURANDO"
  | "A_CAMINHO"
  | "CHEGOU"
  | "EM_VIAGEM"
  | "CONCLUIDA"
  | "CANCELADA";

export interface MotoristaInfo {
  id: string;
  nome: string;
  foto: string;
  avaliacao: number;
  totalViagens: number;
  veiculo: string;
  placa: string;
  telefone: string;
}

export interface CorridaPartiu {
  id: string;
  modalidade: ModalidadePartiu;
  origem: string;
  destino: string;
  detalhesDestino?: string | undefined;
  passageiroNome: string;
  passageiroTelefone: string;
  valor: number;
  distanciaKm: number;
  duracaoMin: number;
  formaPagamento: "pix" | "cartao" | "dinheiro";
  pin: string; // PIN de 4 dígitos (ex: 4829)
  status: StatusCorrida;
  motorista?: MotoristaInfo | undefined;
  criadoEm: number;
  aceitoEm?: number | undefined;
  isEntrega?: boolean | undefined;
  destinatarioNome?: string | undefined;
  destinatarioTelefone?: string | undefined;
  descricaoPacote?: string | undefined;
  avaliacaoPassageiro?: number | undefined;
  comentarioPassageiro?: string | undefined;
  tagsPassageiro?: string[] | undefined;
  isFemaleOnly?: boolean | undefined;
  origemCoords?: { lat: number; lng: number } | undefined;
  destinoCoords?: { lat: number; lng: number } | undefined;
  isForOtherPerson?: boolean | undefined;
  otherPersonName?: string | undefined;
  otherPersonPhone?: string | undefined;
  solicitanteNome?: string | undefined;
  solicitanteTelefone?: string | undefined;
}

const STORAGE_KEY_CORRIDA = "partiu_corrida_ativa";
const STORAGE_KEY_HISTORICO = "partiu_historico_viagens";
const STORAGE_KEY_GANHOS_MOTORISTA = "partiu_motorista_ganhos_hoje";

export const MOTORISTA_PADRAO: MotoristaInfo = {
  id: "mot-1",
  nome: "Carlos Eduardo Silva",
  foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  avaliacao: 4.97,
  totalViagens: 3840,
  veiculo: "Chevrolet Onix Plus 2024 (Prata)",
  placa: "MOB-8K99",
  telefone: "(22) 99876-5432",
};

export const MOTOBOY_PADRAO: MotoristaInfo = {
  id: "mot-2",
  nome: "Lucas Fernandes",
  foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
  avaliacao: 4.95,
  totalViagens: 1920,
  veiculo: "Honda CG 160 Titan (Preta)",
  placa: "MOT-7799",
  telefone: "(22) 99765-4321",
};

// Inicialização automática do Realtime no ambiente do navegador
if (typeof window !== "undefined") {
  inicializarPartiuRealtime((corrida) => {
    if (corrida) {
      localStorage.setItem(STORAGE_KEY_CORRIDA, JSON.stringify(corrida));
    } else {
      localStorage.removeItem(STORAGE_KEY_CORRIDA);
    }
  });
}

// Emite eventos de sincronização em tempo real
function notificarMudanca(corrida: CorridaPartiu | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("partiu:corrida-atualizada", { detail: corrida }));
}

// Toca bip de radar ou alerta (estilo 99)
export function tocarAlertaRadar() {
  if (typeof window === "undefined") return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (err) { silentCatchWarn("partiu-engine", err); }
}

// Toca sino harmônico quando o motorista chega ao local de embarque (estilo Uber/99)
export function tocarAlertaChegada() {
  if (typeof window === "undefined") return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const agora = audioCtx.currentTime;

    // Primeiro tom (C5 = 523Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, agora);
    gain1.gain.setValueAtTime(0.25, agora);
    gain1.gain.exponentialRampToValueAtTime(0.01, agora + 0.25);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(agora);
    osc1.stop(agora + 0.25);

    // Segundo tom mais agudo (E5 = 659Hz)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, agora + 0.12);
    gain2.gain.setValueAtTime(0.25, agora + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, agora + 0.4);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(agora + 0.12);
    osc2.stop(agora + 0.4);
  } catch (err) { silentCatchWarn("partiu-engine", err); }
}

// Toca acorde ascendente ao confirmar o PIN e iniciar a viagem
export function tocarAlertaInicioViagem() {
  if (typeof window === "undefined") return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const agora = audioCtx.currentTime;
    const notas = [523.25, 659.25, 783.99]; // C5, E5, G5

    notas.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, agora + idx * 0.08);
      gain.gain.setValueAtTime(0.2, agora + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, agora + idx * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(agora + idx * 0.08);
      osc.stop(agora + idx * 0.08 + 0.2);
    });
  } catch (err) { silentCatchWarn("partiu-engine", err); }
}

// Toca acorde suave de finalização de viagem
export function tocarAlertaFimViagem() {
  if (typeof window === "undefined") return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const agora = audioCtx.currentTime;
    const notas = [659.25, 783.99, 1046.5]; // E5, G5, C6

    notas.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, agora + idx * 0.1);
      gain.gain.setValueAtTime(0.2, agora + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, agora + idx * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(agora + idx * 0.1);
      osc.stop(agora + idx * 0.1 + 0.35);
    });
  } catch (err) { silentCatchWarn("partiu-engine", err); }
}

// 1. Obter corrida ativa (Cache local sincronizado com Supabase)
export function getCorridaAtiva(): CorridaPartiu | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY_CORRIDA);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// 2. Solicitar nova corrida (Passageiro) com Realtime Broadcast Distribuído
export function criarNovaCorrida(params: {
  modalidade: ModalidadePartiu;
  origem: string;
  destino: string;
  detalhesDestino?: string | undefined;
  passageiroNome: string;
  passageiroTelefone: string;
  valor: number;
  distanciaKm: number;
  duracaoMin: number;
  formaPagamento: "pix" | "cartao" | "dinheiro";
  isEntrega?: boolean | undefined;
  destinatarioNome?: string | undefined;
  destinatarioTelefone?: string | undefined;
  descricaoPacote?: string | undefined;
  isFemaleOnly?: boolean | undefined;
  origemCoords?: { lat: number; lng: number } | undefined;
  destinoCoords?: { lat: number; lng: number } | undefined;
  isForOtherPerson?: boolean | undefined;
  otherPersonName?: string | undefined;
  otherPersonPhone?: string | undefined;
  solicitanteNome?: string | undefined;
  solicitanteTelefone?: string | undefined;
}): CorridaPartiu {
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  const id = `COR-${Date.now().toString().slice(-6)}`;

  const corrida: CorridaPartiu = {
    id,
    modalidade: params.modalidade,
    origem: params.origem,
    destino: params.destino,
    detalhesDestino: params.detalhesDestino,
    passageiroNome: params.passageiroNome || "Rodrigo",
    passageiroTelefone: params.passageiroTelefone || "(22) 99999-0000",
    valor: params.valor,
    distanciaKm: params.distanciaKm,
    duracaoMin: params.duracaoMin,
    formaPagamento: params.formaPagamento,
    pin,
    status: "PROCURANDO",
    criadoEm: Date.now(),
    isEntrega: params.isEntrega,
    destinatarioNome: params.destinatarioNome,
    destinatarioTelefone: params.destinatarioTelefone,
    descricaoPacote: params.descricaoPacote,
    isFemaleOnly: params.isFemaleOnly,
    origemCoords: params.origemCoords,
    destinoCoords: params.destinoCoords,
    isForOtherPerson: params.isForOtherPerson,
    otherPersonName: params.otherPersonName,
    otherPersonPhone: params.otherPersonPhone,
    solicitanteNome: params.solicitanteNome,
    solicitanteTelefone: params.solicitanteTelefone,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_CORRIDA, JSON.stringify(corrida));
  }

  // FASE 18.2: Inicializa orquestrador de entrega se for entrega
  if (params.isEntrega || params.modalidade.startsWith("ENTREGA")) {
    createDeliverySession({
      corridaId: id,
      senderName: params.passageiroNome,
      senderPhone: params.passageiroTelefone,
      senderAddress: params.origem,
      recipientName: params.destinatarioNome || "Destinatário",
      recipientPhone: params.destinatarioTelefone || "(22) 99876-0000",
      recipientAddress: params.destino,
      packageSize: params.modalidade === "ENTREGA_MOTO" ? "PEQUENO" : "MEDIO",
      description: params.descricaoPacote || "Pacote Flash",
      declaredValueBrl: 50,
      hasInsurance: true,
    });
  }

  // Disparo distribuído em tempo real para todos os condutores conectados
  void criarCorridaDistribuida(params);
  notificarMudanca(corrida);
  tocarAlertaRadar();
  return corrida;
}

// 3. Motorista aceita a corrida no Trip Radar (Distribuído com Broadcast)
export function motoristaAceitarCorrida(motorista?: MotoristaInfo): CorridaPartiu | null {
  const atual = getCorridaAtiva();
  if (!atual) return null;

  const condutor =
    motorista ||
    (atual.modalidade === "MOTO" || atual.modalidade === "ENTREGA_MOTO"
      ? MOTOBOY_PADRAO
      : MOTORISTA_PADRAO);

  const atualizada: CorridaPartiu = {
    ...atual,
    status: "A_CAMINHO",
    motorista: condutor,
    aceitoEm: Date.now(),
  };

  // PARTIU DRIVER OS: Registra transição na FSM do condutor
  try {
    driverStateMachine.initDriverSession(condutor.id, "ONLINE");
    driverStateMachine.transitionRide(condutor.id, atual.id, "OFFER_RECEIVED", "DRIVER");
    driverStateMachine.transitionRide(condutor.id, atual.id, "OFFER_ACCEPTED", "DRIVER");
    driverStateMachine.transitionRide(condutor.id, atual.id, "HEADING_TO_PICKUP", "DRIVER");
    void redisLuaEngine.assignAndEvict(condutor.id);
  } catch (err) { silentCatchWarn("partiu-engine", err); }

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_CORRIDA, JSON.stringify(atualizada));
  }

  // FASE 18.2: Sincroniza status do entregador a caminho da coleta
  if (atual.isEntrega || atual.modalidade.startsWith("ENTREGA")) {
    courierHeadingToPickup(condutor.id, condutor.nome);
  }

  void aceitarCorridaDistribuida(atual, condutor).then((res) => {
    if (!res.sucesso) {
      // Lock atômico rejeitado: reverte estado local e notifica UI
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_CORRIDA, JSON.stringify(atual));
      }
      notificarMudanca(atual);
    }
  });
  notificarMudanca(atualizada);
  return atualizada;
}

// 4. Motorista avisa que chegou ao local de embarque
export function motoristaChegouAoLocal(): CorridaPartiu | null {
  const atual = getCorridaAtiva();
  if (!atual) return null;

  const atualizada: CorridaPartiu = {
    ...atual,
    status: "CHEGOU",
  };

  // PARTIU DRIVER OS: Registra chegada e inicia cronômetro de espera auditado
  if (atual.motorista?.id) {
    try {
      driverStateMachine.transitionRide(atual.motorista.id, atual.id, "ARRIVED", "DRIVER");
      driverStateMachine.transitionRide(atual.motorista.id, atual.id, "WAITING", "DRIVER");
      driverTelemetryEngine.startWaitingTimer(atual.motorista.id, atual.id);
    } catch (err) { silentCatchWarn("partiu-engine", err); }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_CORRIDA, JSON.stringify(atualizada));
  }

  // FASE 18.2: Sincroniza chegada ao local de coleta
  if (atual.isEntrega || atual.modalidade.startsWith("ENTREGA")) {
    courierArrivedAtPickup();
  }

  void atualizarStatusCorridaDistribuida(atualizada, "CHEGOU");
  notificarMudanca(atualizada);
  tocarAlertaChegada();
  return atualizada;
}

// 5. Smart Passenger Boarding (Modelo Profissional 99 / Uber — Sem PIN Obrigatório)
export function confirmarEmbarqueEIniciarViagem(params?: {
  overrideGeofence?: boolean | undefined;
  pinOpcional?: string | undefined;
} | undefined): { sucesso: boolean; mensagem?: string; corrida?: CorridaPartiu } {
  const atual = getCorridaAtiva();
  if (!atual) return { sucesso: false, mensagem: "Nenhuma corrida ativa no momento." };

  const res = smartPassengerBoardingEngine.confirmBoardingAndStartTrip({
    rideId: atual.id,
    driverId: atual.motorista?.id || "mot-1",
    passengerId: (atual as any).passageiroId || `pass-${atual.id}`,
    currentRideStatus: atual.status,
    isManualOverride: params?.overrideGeofence ?? true,
    pinProvided: params?.pinOpcional,
    expectedPin: atual.pin,
    passengerInput: {
      name: atual.passageiroNome,
      cpfVerified: (atual as any).passageiroCpfVerificado ?? true,
      rating: (atual as any).passageiroAvaliacao ?? 4.96,
      totalCompletedRides: (atual as any).passageiroTotalCorridas ?? 42,
    },
  });

  if (!res.success) {
    return { sucesso: false, mensagem: res.message };
  }

  const driverId = atual.motorista?.id || "mot-1";
  driverTelemetryEngine.stopWaitingTimer(atual.id);
  try {
    driverStateMachine.transitionRide(driverId, atual.id, "BOARDING", "DRIVER");
    driverStateMachine.transitionRide(driverId, atual.id, "IN_TRIP", "DRIVER");
  } catch (err) { silentCatchWarn("partiu-engine", err); }

  const atualizada: CorridaPartiu = {
    ...atual,
    status: "EM_VIAGEM",
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_CORRIDA, JSON.stringify(atualizada));
  }

  void atualizarStatusCorridaDistribuida(atualizada, "EM_VIAGEM");
  notificarMudanca(atualizada);
  tocarAlertaInicioViagem();
  return { sucesso: true, corrida: atualizada };
}

// 5.1 Validação de PIN de 4 dígitos no embarque (Modo Legado / Opcional)
export function validarPinEIniciarViagem(pinDigitado: string): { sucesso: boolean; mensagem?: string } {
  return confirmarEmbarqueEIniciarViagem({
    pinOpcional: pinDigitado,
  });
}

// 5.2 Validação de Coleta de Encomenda (PIN de Coleta + Foto + Geofence)
export function confirmarColetaEncomenda(
  pinColeta: string,
  fotoUrl?: string | undefined,
): { sucesso: boolean; mensagem?: string | undefined } {
  const res = confirmPickup(pinColeta, fotoUrl);
  if (!res.success) {
    return { sucesso: false, mensagem: res.message };
  }

  const atual = getCorridaAtiva();
  if (atual) {
    const atualizada: CorridaPartiu = {
      ...atual,
      status: "EM_VIAGEM",
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_CORRIDA, JSON.stringify(atualizada));
    }
    void atualizarStatusCorridaDistribuida(atualizada, "EM_VIAGEM");
    notificarMudanca(atualizada);
    tocarAlertaInicioViagem();
  }

  return { sucesso: true, mensagem: res.message };
}

// 5.3 Iniciar Rota de Entrega até o Destinatário
export function iniciarRotaDestinatario(): { sucesso: boolean } {
  courierHeadingToDelivery();
  return { sucesso: true };
}

// 5.4 Entregador Chegou ao Destinatário
export function entregadorChegouAoDestinatario(): { sucesso: boolean } {
  courierArrivedAtDelivery();
  return { sucesso: true };
}

// 5.5 Validação de Entrega com PIN do Destinatário (POD) + Finalização
export function confirmarEntregaEncomenda(
  pinEntrega: string,
  fotoUrl?: string | undefined,
): { sucesso: boolean; mensagem?: string | undefined } {
  const res = confirmDelivery(pinEntrega, fotoUrl);
  if (!res.success) {
    return { sucesso: false, mensagem: res.message };
  }

  finalizarViagem();
  return { sucesso: true, mensagem: "Entrega concluída com sucesso!" };
}

// 6. Finalização de Viagem e Crédito D+0 (Split Dinâmico por Plano de Assinatura no Ledger de Dupla-Entrada)
export function finalizarViagem(): CorridaPartiu | null {
  const atual = getCorridaAtiva();
  if (!atual) return null;

  const condutorId = atual.motorista?.id || "mot-1";

  // Transiciona FSM do condutor
  try {
    driverStateMachine.transitionRide(condutorId, atual.id, "COMPLETING", "DRIVER");
    driverStateMachine.transitionRide(condutorId, atual.id, "COMPLETED", "DRIVER");
    void redisLuaEngine.releaseToCell(condutorId);
  } catch (err) { silentCatchWarn("partiu-engine", err); }

  // Executa liquidação imutável no ledger financeiro (centavos / minor units)
  driverLedgerEngine.settleTripRide(
    condutorId,
    atual.id,
    atual.valor,
    atual.modalidade
  );

  const summary = driverLedgerEngine.getEarningsSummary(condutorId);

  const atualizada: CorridaPartiu = {
    ...atual,
    status: "CONCLUIDA",
  };

  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_CORRIDA);

    const historicoRaw = localStorage.getItem(STORAGE_KEY_HISTORICO);
    const historico = historicoRaw ? JSON.parse(historicoRaw) : [];
    historico.unshift(atualizada);
    localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(historico));

    // Persiste saldo auditado do ledger (convertido de centavos para reais)
    localStorage.setItem(
      STORAGE_KEY_GANHOS_MOTORISTA,
      (summary.availableBalanceCents / 100).toFixed(2)
    );
  }

  void finalizarCorridaDistribuida(atualizada);
  notificarMudanca(null);
  tocarAlertaFimViagem();
  return atualizada;
}

// 7. Cancelar corrida / entrega (com auditoria de taxa de cancelamento tardio)
export function cancelarCorrida(): CancellationFeeSettlement | null {
  const atual = getCorridaAtiva();
  let feeSettlement: CancellationFeeSettlement | null = null;

  if (atual && atual.motorista?.id) {
    void redisLuaEngine.releaseToCell(atual.motorista.id);
    const elapsedSeconds = atual.aceitoEm
      ? (Date.now() - atual.aceitoEm) / 1000
      : (Date.now() - atual.criadoEm) / 1000;

    const isLateCancellation =
      (atual.status === "A_CAMINHO" && elapsedSeconds > 180) ||
      atual.status === "CHEGOU";

    if (isLateCancellation) {
      feeSettlement = processarCancelamentoComMulta(
        atual.id,
        atual.passageiroTelefone || "passageiro-default",
        atual.motorista.id
      );
    }
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_CORRIDA);
  }
  cancelDeliverySession("Cancelado pelo usuário");
  void cancelarCorridaDistribuida();
  notificarMudanca(null);
  return feeSettlement;
}

// 7.1 Cancelamento justificado operacional pelo motorista
export interface DriverCancellationParams {
  rideId: string;
  driverId: string;
  reasonCode: string;
  reasonLabel: string;
  coords?: { lat: number; lng: number } | undefined;
}

export function cancelarCorridaPeloMotorista(params: DriverCancellationParams): {
  sucesso: boolean;
  mensagem: string;
} {
  const timestamp = Date.now();
  const cancelRecord = {
    rideId: params.rideId,
    driverId: params.driverId,
    reasonCode: params.reasonCode,
    reasonLabel: params.reasonLabel,
    cancelledBy: "DRIVER" as const,
    timestamp,
    coords: params.coords,
  };

  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_CORRIDA);

    try {
      const existingCancels = JSON.parse(localStorage.getItem("partiu_driver_cancellations") || "[]");
      existingCancels.unshift(cancelRecord);
      localStorage.setItem("partiu_driver_cancellations", JSON.stringify(existingCancels));
    } catch (err) { silentCatchWarn("partiu-engine", err); }

    window.dispatchEvent(
      new CustomEvent("partiu:corrida-cancelada", {
        detail: {
          rideId: params.rideId,
          reason: params.reasonLabel,
          reasonCode: params.reasonCode,
          cancelledBy: "DRIVER",
          timestamp,
        },
      })
    );
  }

  try {
    atomicMatchingEngine.releaseRide(params.rideId, params.driverId);
  } catch (err) { silentCatchWarn("partiu-engine", err); }

  cancelDeliverySession(`Cancelado pelo condutor: ${params.reasonLabel}`);
  void cancelarCorridaDistribuida();
  notificarMudanca(null);

  return {
    sucesso: true,
    mensagem: `Corrida cancelada: ${params.reasonLabel}`,
  };
}

// 7.2 Cancelamento com cobrança de No-Show (Passageiro não compareceu após carência de 5 min)
export function cancelarCorridaPorNoShow(params: {
  rideId: string;
  driverId: string;
  passengerPhone?: string | undefined;
  waitingMinutes: number;
}): {
  sucesso: boolean;
  settlement: CancellationFeeSettlement | null;
  mensagem: string;
} {
  const atual = getCorridaAtiva();
  const passengerPhone = params.passengerPhone || atual?.passageiroTelefone || "passageiro-default";

  // Processa taxa de R$ 6,00 (creditando R$ 4,50 diretamente ao condutor no ledger)
  const settlement = processarCancelamentoComMulta(
    params.rideId,
    passengerPhone,
    params.driverId
  );

  const timestamp = Date.now();
  const noShowRecord = {
    rideId: params.rideId,
    driverId: params.driverId,
    reasonCode: "PASSENGER_NO_SHOW",
    reasonLabel: "Passageiro não compareceu ao embarque (espera > 5 min)",
    cancelledBy: "DRIVER_NO_SHOW",
    waitingMinutes: params.waitingMinutes,
    settlement,
    timestamp,
  };

  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_CORRIDA);

    try {
      const existingNoShows = JSON.parse(localStorage.getItem("partiu_no_show_records") || "[]");
      existingNoShows.unshift(noShowRecord);
      localStorage.setItem("partiu_no_show_records", JSON.stringify(existingNoShows));
    } catch (err) { silentCatchWarn("partiu-engine", err); }

    window.dispatchEvent(
      new CustomEvent("partiu:corrida-cancelada", {
        detail: {
          rideId: params.rideId,
          reason: "Passageiro não compareceu ao embarque",
          reasonCode: "PASSENGER_NO_SHOW",
          feeCharged: true,
          settlement,
          timestamp,
        },
      })
    );
  }

  try {
    atomicMatchingEngine.releaseRide(params.rideId, params.driverId);
  } catch (err) { silentCatchWarn("partiu-engine", err); }

  cancelDeliverySession("Passageiro ausente no local de embarque");
  void cancelarCorridaDistribuida();
  notificarMudanca(null);

  return {
    sucesso: true,
    settlement,
    mensagem: "Corrida cancelada por não comparecimento. Taxa de cancelamento creditada via PIX D+0.",
  };
}

// 7.1 Prévia e cálculo da taxa de cancelamento para confirmação na UI do passageiro
export function calcularTaxaCancelamentoPassageiro(): {
  aplicaTaxa: boolean;
  valorTaxaBrl: number;
  motivo: string;
} {
  const atual = getCorridaAtiva();
  if (!atual || !atual.motorista?.id) {
    return {
      aplicaTaxa: false,
      valorTaxaBrl: 0,
      motivo: "Cancelamento gratuito sem motorista atribuído.",
    };
  }

  if (atual.status === "CHEGOU") {
    return {
      aplicaTaxa: true,
      valorTaxaBrl: 6.0,
      motivo: "Motorista já chegou no ponto de encontro. Taxa de R$ 6,00 aplicável para ressarcimento do condutor.",
    };
  }

  if (atual.status === "A_CAMINHO") {
    const elapsedSeconds = atual.aceitoEm
      ? (Date.now() - atual.aceitoEm) / 1000
      : (Date.now() - atual.criadoEm) / 1000;

    if (elapsedSeconds > 180) {
      return {
        aplicaTaxa: true,
        valorTaxaBrl: 6.0,
        motivo: "Cancelamento após 3 minutos de corrida aceita. Taxa de R$ 6,00 aplicável para compensação de deslocamento.",
      };
    }
  }

  return {
    aplicaTaxa: false,
    valorTaxaBrl: 0,
    motivo: "Cancelamento gratuito dentro da tolerância operacional.",
  };
}

// 8. Obter histórico de viagens
export function getHistoricoViagens(): CorridaPartiu[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY_HISTORICO);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// 9. Ganhos do motorista no dia
export function getGanhosHojeMotorista(): number {
  if (typeof window === "undefined") return 284.5;
  const raw = localStorage.getItem(STORAGE_KEY_GANHOS_MOTORISTA);
  return raw ? parseFloat(raw) : 284.5;
}

// 10. Avaliação 5 Estrelas pelo Passageiro (Persistência no Histórico & Motorista)
export function avaliarCorrida(
  corridaId?: string | undefined,
  nota: number = 5,
  tags: string[] = [],
  comentario?: string | undefined
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORICO);
    if (!raw) return false;
    const historico: CorridaPartiu[] = JSON.parse(raw);
    if (historico.length === 0) return false;

    const idx = corridaId ? historico.findIndex((h) => h.id === corridaId) : 0;
    if (idx >= 0 && historico[idx]) {
      historico[idx] = {
        ...historico[idx],
        avaliacaoPassageiro: nota,
        tagsPassageiro: tags,
        comentarioPassageiro: comentario,
      };
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(historico));

      // Atualiza também se a corrida ativa for a mesma
      const ativa = getCorridaAtiva();
      if (ativa && (!corridaId || ativa.id === corridaId)) {
        const ativaAtualizada = {
          ...ativa,
          avaliacaoPassageiro: nota,
          tagsPassageiro: tags,
          comentarioPassageiro: comentario,
        };
        localStorage.setItem(STORAGE_KEY_CORRIDA, JSON.stringify(ativaAtualizada));
      }

      window.dispatchEvent(new CustomEvent("partiu:historico-atualizado", { detail: historico }));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
