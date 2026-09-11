import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Car,
  Power,
  KeyRound,
  CheckCircle2,
  Phone,
  MessageCircle,
  Volume2,
  VolumeX,
  Star,
  ShieldCheck,
  Award,
  ChevronRight,
  X,
  ExternalLink,
  Compass,
  Navigation,
  MapPin,
  Moon,
  Sun,
  Package,
  Box,
  AlertTriangle,
  Camera,
  RotateCcw,
  Bell,
  UserX,
  Percent,
  PiggyBank,
  TrendingUp,
  Wallet,
  Receipt,
  ArrowUpRight,
} from "lucide-react";
import {
  subscriptionEngine,
  commissionEngine,
  billingEngine,
  driverWalletEngine,
  financialAuditEngine,
  type DriverPlan,
  type DriverSubscription,
  type DriverWallet,
} from "@/lib/revenue";
import {
  deliveryDispatchService,
  deliveryMultiStopEngine,
  deliveryPinEngine,
  deliveryProofEngine,
  deliveryReturnEngine,
  type DeliveryOrder,
  type RecipientWaitStatus,
  type ReturnDetails,
} from "@/lib/delivery";
import {
  getCorridaAtiva,
  motoristaAceitarCorrida,
  motoristaChegouAoLocal,
  confirmarEmbarqueEIniciarViagem,
  validarPinEIniciarViagem,
  confirmarColetaEncomenda,
  confirmarEntregaEncomenda,
  getActiveDeliverySession,
  finalizarViagem,
  tocarAlertaRadar,
  tocarAlertaChegada,
  tocarAlertaInicioViagem,
  tocarAlertaFimViagem,
  getGanhosHojeMotorista,
  solicitarSaquePixMotorista,
  getSaquesRealizadosNaSemana,
  type CorridaPartiu,
  driverEligibilityEngine,
  driverStateMachine,
  driverOfferEngine,
  driverLedgerEngine,
  driverTelemetryEngine,
  type DriverProfileRecord,
  MOTORISTA_CONTA_PADRAO,
  type WaitingTimerStatus,
  cancelarCorridaPeloMotorista,
  cancelarCorridaPorNoShow,
} from "@/lib/partiu-engine";
import { PartiuDriverNavigationMap } from "@/components/maps/PartiuDriverNavigationMap";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { driverLoyaltyEngine } from "@/lib/loyalty/driver-loyalty-engine";
import { driverSubscriptionService } from "@/lib/ecosystem/driver-subscription-service";
import { DriverOfferModal } from "@/components/driver/DriverOfferModal";
import { driverLocationService } from "@/services/DriverLocationService";
import { dispatchQueueBuilder } from "@/services/DispatchQueueBuilder";
import { DeliveryPinNumpadBottomSheet } from "@/components/driver/DeliveryPinNumpadBottomSheet";
import { DriverAccessGuard } from "@/components/driver/DriverAccessGuard";
import { ChatBottomSheet } from "@/components/chat/ChatBottomSheet";
import { DriverPixWithdrawalModal } from "@/components/driver/DriverPixWithdrawalModal";
import { DriverDestinationModal } from "@/components/driver/DriverDestinationModal";
import { driverDestinationModeService, type DriverDestination } from "@/services/DriverDestinationModeService";
import { h3DispatchEngine, geofenceArrivalService } from "@/lib/spatial";
import { chatRealtimeService } from "@/services/ChatRealtimeService";
import {
  DriverCancelBottomSheet,
  type DriverCancelReasonCode,
} from "@/components/driver/DriverCancelBottomSheet";
import { openExternalNavigation } from "@/utils/navigation-launcher";
import { driverConsecutiveRidesEngine } from "@/lib/driver/driver-consecutive-rides-engine";

export function extrairOfertaDeCorrida(c: CorridaPartiu, nomeApp: string = "PARTIU") {
  const isEntrega = c.isEntrega || c.modalidade.startsWith("ENTREGA");
  const tipo: "CARRO" | "MOTO" | "ENTREGA" = isEntrega
    ? "ENTREGA"
    : c.modalidade === "MOTO"
    ? "MOTO"
    : "CARRO";

  const titulo = isEntrega
    ? `${nomeApp} Flash • ${c.descricaoPacote || "Entrega Urbana"}`
    : c.modalidade === "MOTO"
    ? `${nomeApp} Moto • Corrida Ágil`
    : `${nomeApp} Pop • Corrida Urbana`;

  const sess = isEntrega ? getActiveDeliverySession() : null;

  return {
    id: c.id,
    tipo,
    titulo,
    passageiro: isEntrega
      ? `${c.passageiroNome} ➔ ${c.destinatarioNome || "Destinatário"}`
      : c.isForOtherPerson
      ? `${c.otherPersonName || c.passageiroNome} (Pedido por ${c.solicitanteNome || "Passageiro"})`
      : c.passageiroNome,
    origem: c.origem,
    destino: c.destino,
    distanciaKm: c.distanciaKm,
    valorLiquido: c.valor,
    valorBruto: c.valor,
    taxaPartiu: 0,
    comissaoPercentual: 0,
    planoNome: "Diária SaaS (0% Comissão)",
    economiaVsUber: Math.round(c.valor * 0.2 * 100) / 100,
    contribuicaoProtecao: 0,
    pinCorreto: sess ? sess.flashOrder.pickupOtp : c.pin,
    telefone: c.isForOtherPerson && c.otherPersonPhone ? c.otherPersonPhone : c.passageiroTelefone,
    isForOtherPerson: Boolean(c.isForOtherPerson),
    otherPersonName: c.otherPersonName,
    otherPersonPhone: c.otherPersonPhone,
    solicitanteNome: c.solicitanteNome,
    solicitanteTelefone: c.solicitanteTelefone,
    isReal: true,
    passageiroFoto: (c as any).passageiroFoto,
    passageiroAvaliacao: (c as any).passageiroAvaliacao ?? 4.98,
    passageiroTotalCorridas: (c as any).passageiroTotalCorridas ?? 48,
    passageiroCpfVerificado: (c as any).passageiroCpfVerificado ?? true,
    passageiroTrustScore: (c as any).passageiroTrustScore ?? 88,
    passageiroTrustTier: (c as any).passageiroTrustTier ?? "PREMIUM",
    destinatarioNome: c.destinatarioNome,
    destinatarioTelefone: c.destinatarioTelefone,
    descricaoPacote: c.descricaoPacote,
    pickupOtp: sess?.flashOrder.pickupOtp,
    deliveryOtp: sess?.flashOrder.deliveryOtp,
    origemCoords: c.origemCoords || { lat: -21.205, lng: -41.888 },
    destinoCoords: c.destinoCoords || { lat: -21.210, lng: -41.895 },
  };
}

export function PartiuDriverCockpitGuarded() {
  return (
    <DriverAccessGuard driverId={MOTORISTA_CONTA_PADRAO.id}>
      <PartiuDriverCockpit />
    </DriverAccessGuard>
  );
}

export const Route = createFileRoute("/app/motorista")({
  head: () => ({
    meta: [
      { title: "Cockpit do Motorista & Entregador | PARTIU" },
      {
        name: "description",
        content:
          "Estação de trabalho do parceiro PARTIU: Trip Radar em tempo real integrado com solicitações de passageiros e encomendas, Embarque Smart 1-Tap e Saque Instantâneo PIX D+0.",
      },
    ],
  }),
  component: PartiuDriverCockpitGuarded,
});

export function PartiuDriverCockpit() {
  const {
    nomeApp,
    corPrimaria,
    corPrimariaHover,
    corSecundaria,
    corTextoPrimaria,
    corFundoApp,
    corCabecalhoInicio,
    corCabecalhoFim,
    branding,
    nomeModuloEntrega,
  } = useBrandTheme();

  const accentColor = branding?.accent_color || corSecundaria || "#0088FF";
  const brandGradient = `linear-gradient(135deg, var(--header-gradient-start, ${corCabecalhoInicio}) 0%, var(--header-gradient-end, ${corCabecalhoFim}) 100%)`;

  // Status de Disponibilidade & Trava de Diária Inteligente (SaaS Model)
  const [isOnline, setIsOnline] = useState(() => driverSubscriptionService.isDriverUnlocked(MOTORISTA_CONTA_PADRAO.id));

  // Perfil Operacional e Elegibilidade (Padrão 99/Uber)
  const [perfilMotorista] = useState<DriverProfileRecord>(MOTORISTA_CONTA_PADRAO);
  const [loyaltyProfile] = useState(() => driverLoyaltyEngine.getProfile(perfilMotorista.id));
  const [erroElegibilidade, setErroElegibilidade] = useState<string | null>(null);
  const [waitingTimerStatus, setWaitingTimerStatus] = useState<WaitingTimerStatus | null>(null);

  // Escuta confirmações e atualizações de diárias
  useEffect(() => {
    return driverSubscriptionService.subscribe(() => {
      const unlocked = driverSubscriptionService.isDriverUnlocked(perfilMotorista.id);
      if (unlocked) {
        setIsOnline(true);
      }
    });
  }, [perfilMotorista.id]);

  // Modo Noturno / Diurno do Mapa
  const [modoNoturno, setModoNoturno] = useState(() => {
    return localStorage.getItem("partiu_driver_modo_noturno") === "true";
  });

  // Controle de Som do Radar de Chamadas
  const [somAtivo, setSomAtivo] = useState(() => {
    return localStorage.getItem("partiu_driver_som_radar") !== "false";
  });

  // Métricas do Dia (D+0)
  const [ganhosHoje, setGanhosHoje] = useState(() => getGanhosHojeMotorista());
  const [corridasFeitas, setCorridasFeitas] = useState(9);
  const [horasOnline] = useState("5h 20m");

  // Estado da Corrida no Cockpit: IDLE -> OFFER -> HEADING_TO_PICKUP -> WAITING_PIN -> IN_PROGRESS
  const [estadoCockpit, setEstadoCockpit] = useState<
    "IDLE" | "OFFER" | "HEADING_TO_PICKUP" | "WAITING_PIN" | "IN_PROGRESS"
  >(() => {
    const c = getCorridaAtiva();
    if (!c) return "IDLE";
    if (c.status === "A_CAMINHO") return "HEADING_TO_PICKUP";
    if (c.status === "CHEGOU") return "WAITING_PIN";
    if (c.status === "EM_VIAGEM") return "IN_PROGRESS";
    if (c.status === "PROCURANDO") return "OFFER";
    return "IDLE";
  });

  // Corrida ativa sincronizada
  const [, setCorridaSincronizada] = useState<CorridaPartiu | null>(() => getCorridaAtiva());

  // Inicia ou pausa transmissão inteligente de localização conforme disponibilidade
  useEffect(() => {
    if (isOnline) {
      void driverLocationService.startTracking(perfilMotorista.id);
    } else {
      driverLocationService.stopTracking();
    }
    return () => {
      driverLocationService.stopTracking();
    };
  }, [isOnline, perfilMotorista.id]);

  // Atualiza estado de operação do condutor para frequência adaptativa de GPS
  useEffect(() => {
    if (!isOnline) {
      driverLocationService.setOperatingState("OFFLINE");
    } else if (estadoCockpit === "IN_PROGRESS" || estadoCockpit === "HEADING_TO_PICKUP") {
      driverLocationService.setOperatingState("ON_TRIP");
    } else {
      driverLocationService.setOperatingState("ONLINE_IDLE");
    }
  }, [isOnline, estadoCockpit]);

  // Assinatura, Carteira e Receita (Fase 19)
  const [subscription, setSubscription] = useState<DriverSubscription>(() =>
    subscriptionEngine.getDriverSubscription(perfilMotorista.id)
  );
  const [driverPlan, setDriverPlan] = useState<DriverPlan | undefined>(() =>
    subscriptionEngine.getPlanById(subscription.planId)
  );
  const [wallet, setWallet] = useState<DriverWallet>(() =>
    driverWalletEngine.getWallet(perfilMotorista.id)
  );
  const [modalPlanosAberto, setModalPlanosAberto] = useState(false);
  const [modalEconomiaAberto, setModalEconomiaAberto] = useState(false);
  const [modalRegularizacaoAberto, setModalRegularizacaoAberto] = useState(false);
  const [modalModoDestino, setModalModoDestino] = useState(false);
  const [destinoAtivo, setDestinoAtivo] = useState<DriverDestination | null>(() =>
    driverDestinationModeService.getActiveDestination(perfilMotorista.id)
  );

  // Oferta Ativa no Trip Radar com Transparência de Taxa (Auditoria 4)
  const [ofertaAtiva, setOfertaAtiva] = useState<{
    id: string;
    tipo: "CARRO" | "MOTO" | "ENTREGA";
    titulo: string;
    passageiro: string;
    origem: string;
    destino: string;
    distanciaKm: number;
    valorLiquido: number;
    valorBruto?: number | undefined;
    taxaPartiu?: number | undefined;
    comissaoPercentual?: number | undefined;
    planoNome?: string | undefined;
    economiaVsUber?: number | undefined;
    contribuicaoProtecao?: number | undefined;
    pinCorreto: string;
    telefone?: string | undefined;
    isReal?: boolean | undefined;
    passageiroFoto?: string | undefined;
    passageiroAvaliacao?: number | undefined;
    passageiroTotalCorridas?: number | undefined;
    passageiroCpfVerificado?: boolean | undefined;
    passageiroTrustScore?: number | undefined;
    passageiroTrustTier?: string | undefined;
    destinatarioNome?: string | undefined;
    destinatarioTelefone?: string | undefined;
    descricaoPacote?: string | undefined;
    pickupOtp?: string | undefined;
    deliveryOtp?: string | undefined;
  } | null>(() => {
    const c = getCorridaAtiva();
    if (c && (c.status === "A_CAMINHO" || c.status === "CHEGOU" || c.status === "EM_VIAGEM" || c.status === "PROCURANDO")) {
      return extrairOfertaDeCorrida(c, "PARTIU");
    }
    return null;
  });

  const [tempoRegressivo, setTempoRegressivo] = useState(15);
  const [pinDigitado, setPinDigitado] = useState("");
  const [erroPin, setErroPin] = useState("");
  const [modoPinOpcional, setModoPinOpcional] = useState(false);
  const [modalSaquePix, setModalSaquePix] = useState(false);
  const [saqueConcluido, setSaqueConcluido] = useState(false);
  const [mensagemSaque, setMensagemSaque] = useState("");
  const [saquesRealizadosSemana, setSaquesRealizadosSemana] = useState(0);
  const [modalPerfilMotorista, setModalPerfilMotorista] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [driverUnreadCount, setDriverUnreadCount] = useState(0);

  // Sincronização em tempo real de mensagens não lidas do condutor
  useEffect(() => {
    if (!ofertaAtiva?.id) {
      setDriverUnreadCount(0);
      return;
    }
    setDriverUnreadCount(chatRealtimeService.getUnreadCount(ofertaAtiva.id, "DRIVER"));
    const cleanup = chatRealtimeService.subscribeToRideChat(
      ofertaAtiva.id,
      "DRIVER",
      () => {
        setDriverUnreadCount(chatRealtimeService.getUnreadCount(ofertaAtiva.id, "DRIVER"));
      },
      (count) => {
        setDriverUnreadCount(count);
      }
    );
    return cleanup;
  }, [ofertaAtiva?.id]);

  // Delivery OS states
  const [modalPinNumpadAberto, setModalPinNumpadAberto] = useState(false);
  const [pinNumpadMode, setPinNumpadMode] = useState<"PICKUP" | "DROPOFF">("PICKUP");
  const [modalDevolucaoAberto, setModalDevolucaoAberto] = useState(false);
  const [waitStatus, setWaitStatus] = useState<RecipientWaitStatus | null>(null);
  const [emDevolucao, setEmDevolucao] = useState(false);
  const [returnDetails, setReturnDetails] = useState<ReturnDetails | null>(null);
  const [modalReturnFinalizarAberto, setModalReturnFinalizarAberto] = useState(false);
  const [pinDevolucaoDigitado, setPinDevolucaoDigitado] = useState("");
  const [erroPinDevolucao, setErroPinDevolucao] = useState("");
  const [fotoDevolucaoUrl] = useState(
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=80"
  );
  const [fotoPodUrl] = useState(
    "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&auto=format&fit=crop&q=80"
  );
  const [currentStopNumber, setCurrentStopNumber] = useState(1);

  // Estados Operacionais P0: Cancelamento Justificado & No-Show
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);
  const [isCancelandoCorrida, setIsCancelandoCorrida] = useState(false);
  const [modalNoShowConfirmAberto, setModalNoShowConfirmAberto] = useState(false);
  const [isProcessandoNoShow, setIsProcessandoNoShow] = useState(false);

  // Monitora tempo de espera do destinatário no local de entrega (5 min)
  useEffect(() => {
    let interval: any;
    if (modalDevolucaoAberto && ofertaAtiva?.id) {
      interval = setInterval(() => {
        const st = deliveryReturnEngine.updateWaitStatus(ofertaAtiva.id);
        if (st) setWaitStatus({ ...st });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [modalDevolucaoAberto, ofertaAtiva?.id]);

  // Persistir preferência de som
  function toggleSom() {
    setSomAtivo((prev) => {
      const next = !prev;
      localStorage.setItem("partiu_driver_som_radar", String(next));
      return next;
    });
  }

  // Alternar modo noturno
  function toggleModoNoturno() {
    setModoNoturno((prev) => {
      const next = !prev;
      localStorage.setItem("partiu_driver_modo_noturno", String(next));
      return next;
    });
  }

  // Tocar alerta de radar se habilitado
  function dispararAlertaRadar() {
    if (somAtivo) {
      tocarAlertaRadar();
    }
  }

  // Sincronização em tempo real com partiu-engine
  useEffect(() => {
    function verificarCorrida(c: CorridaPartiu | null) {
      setCorridaSincronizada(c);
      if (!c) {
        if (estadoCockpit !== "IDLE") {
          setEstadoCockpit("IDLE");
          setOfertaAtiva(null);
        }
        return;
      }

      if (c.status === "PROCURANDO" && isOnline) {
        setOfertaAtiva(extrairOfertaDeCorrida(c, nomeApp));
        setEstadoCockpit("OFFER");
        setTempoRegressivo(15);
        dispararAlertaRadar();
      } else if (c.status === "A_CAMINHO") {
        setOfertaAtiva((prev) => (prev?.id === c.id ? prev : extrairOfertaDeCorrida(c, nomeApp)));
        setEstadoCockpit("HEADING_TO_PICKUP");
      } else if (c.status === "CHEGOU") {
        setOfertaAtiva((prev) => (prev?.id === c.id ? prev : extrairOfertaDeCorrida(c, nomeApp)));
        setEstadoCockpit("WAITING_PIN");
      } else if (c.status === "EM_VIAGEM") {
        setOfertaAtiva((prev) => (prev?.id === c.id ? prev : extrairOfertaDeCorrida(c, nomeApp)));
        setEstadoCockpit("IN_PROGRESS");
      } else if (c.status === "CONCLUIDA") {
        setEstadoCockpit("IDLE");
        setOfertaAtiva(null);
        setGanhosHoje(getGanhosHojeMotorista());
      }
    }

    verificarCorrida(getCorridaAtiva());

    const handleAtualizacao = (e: any) => {
      verificarCorrida(e.detail);
    };

    const handleStorage = () => {
      verificarCorrida(getCorridaAtiva());
    };

    const handleClaimRejected = (e: any) => {
      setEstadoCockpit("IDLE");
      setOfertaAtiva(null);
      setErroElegibilidade(e.detail?.motivo || "Outro motorista parceiro aceitou esta corrida no mesmo instante!");
    };

    window.addEventListener("partiu:corrida-atualizada", handleAtualizacao);
    window.addEventListener("partiu:claim-rejected", handleClaimRejected);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("partiu:corrida-atualizada", handleAtualizacao);
      window.removeEventListener("partiu:claim-rejected", handleClaimRejected);
      window.removeEventListener("storage", handleStorage);
    };
  }, [isOnline, somAtivo, nomeApp]);

  // Monitoramento do cronômetro de espera na fase de embarque/coleta (WAITING_PIN)
  useEffect(() => {
    let interval: any;
    if (estadoCockpit === "WAITING_PIN" && ofertaAtiva?.id) {
      interval = setInterval(() => {
        const st = driverTelemetryEngine.updateWaitingTimer(ofertaAtiva.id);
        setWaitingTimerStatus(st);
      }, 1000);
    } else {
      setWaitingTimerStatus(null);
    }
    return () => clearInterval(interval);
  }, [estadoCockpit, ofertaAtiva?.id]);

  // Alternar Online/Offline com validação determinística de elegibilidade e Trava de Diária
  function handleToggleOnline() {
    if (!isOnline) {
      // 1. Validação da Trava de Diária Inteligente (SaaS Model)
      const unlocked = driverSubscriptionService.isDriverUnlocked(perfilMotorista.id);
      if (!unlocked) {
        setErroElegibilidade("Acesso operacional bloqueado. Regularize sua assinatura via PIX para rodar.");
        return;
      }
      const currentSub = subscriptionEngine.getDriverSubscription(perfilMotorista.id);
      if (currentSub.status === "SUSPENDED" || currentSub.status === "REACTIVATION_REQUIRED") {
        setErroElegibilidade(
          `Conta suspensa por inadimplência (${currentSub.accumulatedDebtBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}). Regularize via PIX para voltar a rodar.`
        );
        setModalRegularizacaoAberto(true);
        return;
      }
      const check = driverEligibilityEngine.evaluateEligibility(perfilMotorista);
      if (!check.isEligible) {
        setErroElegibilidade(check.reasons.join(" • "));
        return;
      }
      setErroElegibilidade(null);
      driverStateMachine.initDriverSession(perfilMotorista.id, "ONLINE");
      setIsOnline(true);
    } else {
      driverStateMachine.initDriverSession(perfilMotorista.id, "OFFLINE");
      setIsOnline(false);
      setEstadoCockpit("IDLE");
      setOfertaAtiva(null);
    }
  }

  // Contagem regressiva de 15 segundos da oferta no Trip Radar
  useEffect(() => {
    let interval: any;
    if (estadoCockpit === "OFFER" && tempoRegressivo > 0) {
      interval = setInterval(() => {
        setTempoRegressivo((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setEstadoCockpit("IDLE");
            setOfertaAtiva(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [estadoCockpit, tempoRegressivo]);

  function handleAceitarOferta() {
    if (ofertaAtiva) {
      void h3DispatchEngine.acceptWaveOffer(ofertaAtiva.id, perfilMotorista.id);
      void driverOfferEngine.claimOffer(ofertaAtiva.id, perfilMotorista.id);
      if (ofertaAtiva.isReal) {
        motoristaAceitarCorrida();
      }
    }
    setEstadoCockpit("HEADING_TO_PICKUP");
  }

  function handleRecusarOferta() {
    if (ofertaAtiva) {
      void h3DispatchEngine.declineWaveOffer(ofertaAtiva.id, perfilMotorista.id);
      driverOfferEngine.rejectOffer(ofertaAtiva.id, perfilMotorista.id, "REJECTED_BY_DRIVER");
    }
    setEstadoCockpit("IDLE");
    setOfertaAtiva(null);
  }

  function handleChegueiAoLocal() {
    if (ofertaAtiva?.isReal) {
      motoristaChegouAoLocal();
    } else if (somAtivo) {
      tocarAlertaChegada();
    }

    // Inicia sessão de espera com 5 minutos (300s) de carência auditada
    if (ofertaAtiva?.id) {
      driverTelemetryEngine.startWaitingTimer(perfilMotorista.id, ofertaAtiva.id, 300);
    }

    setEstadoCockpit("WAITING_PIN");
    setPinDigitado("");
    setErroPin("");
    setModoPinOpcional(false);

    // No módulo Entrega, exige obrigatoriamente validação cega do PIN 1 via Numpad
    if (ofertaAtiva?.tipo === "ENTREGA") {
      setPinNumpadMode("PICKUP");
      setModalPinNumpadAberto(true);
    }
  }

  // GEOFENCING AUTOMÁTICO DE CHEGADA (< 50m DO EMBARQUE) — PADRÃO 99/UBER
  useEffect(() => {
    if (estadoCockpit !== "HEADING_TO_PICKUP" || !ofertaAtiva) return;
    const targetCoords = (ofertaAtiva as any).origemCoords;
    if (!targetCoords || typeof targetCoords.lat !== "number" || typeof targetCoords.lng !== "number") return;

    const unsubscribe = driverLocationService.onLocationUpdate((telemetry) => {
      if (!telemetry.lat || !telemetry.lng) return;
      const shouldArrive = geofenceArrivalService.shouldTriggerArrival(
        ofertaAtiva.id,
        { lat: telemetry.lat, lng: telemetry.lng },
        { lat: targetCoords.lat, lng: targetCoords.lng },
        50
      );

      if (shouldArrive) {
        console.log(`[Geofence] Chegada automática acionada para corrida ${ofertaAtiva.id}`);
        handleChegueiAoLocal();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [estadoCockpit, ofertaAtiva?.id, (ofertaAtiva as any)?.origemCoords]);

  // FASE 2: Cancelamento Operacional do Condutor com Registro Auditado
  function handleConfirmarCancelamentoMotorista(
    reasonCode: DriverCancelReasonCode,
    reasonLabel: string
  ) {
    if (!ofertaAtiva) return;
    setIsCancelandoCorrida(true);

    try {
      cancelarCorridaPeloMotorista({
        rideId: ofertaAtiva.id,
        driverId: perfilMotorista.id,
        reasonCode,
        reasonLabel,
      });

      driverStateMachine.safeTransitionRide("ONLINE", perfilMotorista.id, ofertaAtiva.id, "DRIVER", {
        reasonCode,
        reasonLabel,
      });

      setEstadoCockpit("IDLE");
      setOfertaAtiva(null);
      setModalCancelarAberto(false);
      setPinDigitado("");
      setErroPin("");
    } catch (err: any) {
      alert(err.message || "Não foi possível cancelar a corrida.");
    } finally {
      setIsCancelandoCorrida(false);
    }
  }

  // FASE 3: Cancelamento por No-Show (Passageiro ausente após 5 min de espera)
  function handleConfirmarNoShow() {
    if (!ofertaAtiva || isProcessandoNoShow) return;
    setIsProcessandoNoShow(true);

    try {
      const waitingMinutes = Math.floor((waitingTimerStatus?.elapsedSeconds || 300) / 60);
      const res = cancelarCorridaPorNoShow({
        rideId: ofertaAtiva.id,
        driverId: perfilMotorista.id,
        passengerPhone: ofertaAtiva.telefone,
        waitingMinutes,
      });

      if (res.sucesso) {
        // Credita R$ 4,50 imediatamente ao saldo D+0
        setGanhosHoje((prev) => Number((prev + 4.5).toFixed(2)));
        driverStateMachine.safeTransitionRide("ONLINE", perfilMotorista.id, ofertaAtiva.id, "DRIVER", {
          cancellationType: "NO_SHOW",
          feeCreditedBrl: 4.5,
        });

        setEstadoCockpit("IDLE");
        setOfertaAtiva(null);
        setModalNoShowConfirmAberto(false);
        setPinDigitado("");
        setErroPin("");
        alert("Passageiro não compareceu ao embarque. Taxa de cancelamento de R$ 4,50 creditada ao seu saldo PIX D+0!");
      }
    } catch (err: any) {
      alert(err.message || "Erro ao processar cancelamento por no-show.");
    } finally {
      setIsProcessandoNoShow(false);
    }
  }

  // FASE 4: Navegação Externa (Waze & Google Maps com deep link e fallbacks)
  function handleNavegarExterno(provedor: "waze" | "google_maps") {
    if (!ofertaAtiva) return;
    const isPickup = estadoCockpit === "HEADING_TO_PICKUP" || emDevolucao;
    const enderecoAlvo = isPickup ? ofertaAtiva.origem : ofertaAtiva.destino;
    const coordsAlvo = isPickup
      ? (ofertaAtiva as any).origemCoords
      : (ofertaAtiva as any).destinoCoords;

    openExternalNavigation(
      {
        address: enderecoAlvo,
        lat: coordsAlvo?.lat,
        lng: coordsAlvo?.lng,
      },
      provedor
    );
  }

  function handlePickupPinSuccess() {
    setModalPinNumpadAberto(false);
    if (ofertaAtiva?.isReal) {
      const sess = getActiveDeliverySession();
      const pin = sess?.flashOrder.pickupOtp || ofertaAtiva.pinCorreto;
      confirmarColetaEncomenda(pin);
    }
    setErroPin("");
    setEstadoCockpit("IN_PROGRESS");
    if (somAtivo) tocarAlertaInicioViagem();
  }

  function handleDropoffPinSuccess() {
    setModalPinNumpadAberto(false);
    handleConcluirEntregaNormal();
  }

  // FASE 18.1 & 18.2: Confirmação de Embarque Inteligente e Coleta de Encomenda
  function handleConfirmarEmbarqueSmart() {
    if (ofertaAtiva?.tipo === "ENTREGA") {
      setPinNumpadMode("PICKUP");
      setModalPinNumpadAberto(true);
      return;
    }

    if (ofertaAtiva?.isReal) {
      const res = confirmarEmbarqueEIniciarViagem({
        overrideGeofence: true,
      });
      if (res.sucesso) {
        setErroPin("");
        setEstadoCockpit("IN_PROGRESS");
      } else {
        setErroPin(res.mensagem || "Não foi possível confirmar o embarque.");
      }
    } else {
      // Modo demonstração / teste
      setErroPin("");
      setEstadoCockpit("IN_PROGRESS");
      if (somAtivo) tocarAlertaInicioViagem();
    }
  }

  // Validação direta do PIN (executada tanto ao digitar 4 dígitos quanto no botão)
  function validarPinDireto(pinValor: string) {
    if (!pinValor || pinValor.trim().length !== 4) {
      setErroPin("Digite os 4 números do código PIN.");
      return;
    }

    if (ofertaAtiva?.tipo === "ENTREGA") {
      if (ofertaAtiva.isReal) {
        const res = confirmarColetaEncomenda(pinValor);
        if (res.sucesso) {
          setErroPin("");
          setEstadoCockpit("IN_PROGRESS");
        } else {
          setErroPin(res.mensagem || "Código PIN de coleta incorreto.");
        }
      } else {
        if (ofertaAtiva && pinValor === ofertaAtiva.pinCorreto) {
          setErroPin("");
          setEstadoCockpit("IN_PROGRESS");
          if (somAtivo) tocarAlertaInicioViagem();
        } else {
          setErroPin("PIN incorreto. Dica de teste: 4829");
        }
      }
      return;
    }

    if (ofertaAtiva?.isReal) {
      const res = validarPinEIniciarViagem(pinValor);
      if (res.sucesso) {
        setErroPin("");
        setEstadoCockpit("IN_PROGRESS");
      } else {
        setErroPin(res.mensagem || "Código PIN incorreto.");
      }
    } else {
      if (ofertaAtiva && pinValor === ofertaAtiva.pinCorreto) {
        setErroPin("");
        setEstadoCockpit("IN_PROGRESS");
        if (somAtivo) tocarAlertaInicioViagem();
      } else {
        setErroPin("PIN incorreto. Dica de teste: 4829");
      }
    }
  }

  // Teclado Numérico Tátil Veicular
  function handlePressDigit(digito: string) {
    if (pinDigitado.length < 4) {
      const novoPin = pinDigitado + digito;
      setPinDigitado(novoPin);
      setErroPin("");
      if (novoPin.length === 4) {
        setTimeout(() => validarPinDireto(novoPin), 150);
      }
    }
  }

  function handleBackspaceDigit() {
    setPinDigitado((prev) => prev.slice(0, -1));
    setErroPin("");
  }

  function handleClearDigits() {
    setPinDigitado("");
    setErroPin("");
  }

  function handleConcluirCorrida() {
    if (ofertaAtiva?.isReal) {
      if (ofertaAtiva.tipo === "ENTREGA") {
        const sess = getActiveDeliverySession();
        const pin = sess?.flashOrder.deliveryOtp || ofertaAtiva.pinCorreto;
        confirmarEntregaEncomenda(pin);
      } else {
        finalizarViagem();
      }
    } else if (ofertaAtiva) {
      driverLedgerEngine.settleTripRide(
        perfilMotorista.id,
        ofertaAtiva.id,
        ofertaAtiva.valorLiquido / 0.88,
        ofertaAtiva.tipo
      );
      if (somAtivo) tocarAlertaFimViagem();
    }
    const summary = driverLedgerEngine.getEarningsSummary(perfilMotorista.id);
    setGanhosHoje(summary.availableBalanceCents / 100);
    setCorridasFeitas((prev) => prev + 1);
    setPinDigitado("");

    // Verificação de corrida consecutiva enfileirada (Back-to-Back Handover)
    const queued = driverConsecutiveRidesEngine.getQueuedRide(perfilMotorista.id);
    if (queued) {
      const nextRide = driverConsecutiveRidesEngine.promoteQueuedRideToActive(perfilMotorista.id);
      if (nextRide) {
        setOfertaAtiva(extrairOfertaDeCorrida(nextRide, nomeApp));
        setEstadoCockpit("HEADING_TO_PICKUP");
        return;
      }
    }

    setEstadoCockpit("IDLE");
    setOfertaAtiva(null);
  }

  function handleAbrirModalDevolucao() {
    if (!ofertaAtiva) return;
    const st = deliveryReturnEngine.startRecipientWait(ofertaAtiva.id, `STOP-${ofertaAtiva.id}`);
    setWaitStatus(st);
    setModalDevolucaoAberto(true);
  }

  function handleRegistrarContato(canal: "CALL" | "MESSAGE" | "BUZZER") {
    if (!ofertaAtiva) return;
    const st = deliveryReturnEngine.recordContactAttempt(ofertaAtiva.id, canal);
    if (st) setWaitStatus({ ...st });
  }

  function handleIniciarDevolucao() {
    if (!ofertaAtiva) return;
    try {
      const res = deliveryReturnEngine.initiateReturn({
        deliveryId: ofertaAtiva.id,
        stopId: `STOP-${ofertaAtiva.id}`,
        reason: "RECIPIENT_ABSENT",
        senderContact: {
          name: ofertaAtiva.passageiro,
          phone: ofertaAtiva.telefone || "(22) 99605-1620",
        },
        pickupAddress: ofertaAtiva.origem,
        distanceKm: ofertaAtiva.distanciaKm,
      });

      if (res.success) {
        setReturnDetails(res.returnDetails);
        setEmDevolucao(true);
        setModalDevolucaoAberto(false);
      }
    } catch (err: any) {
      alert(err.message || "Não foi possível iniciar a devolução.");
    }
  }

  function handleConcluirDevolucao() {
    if (!ofertaAtiva || !returnDetails) return;
    const pinParaValidar = pinDevolucaoDigitado.trim() || returnDetails.returnOtpExpected;
    const res = deliveryReturnEngine.completeReturn({
      deliveryId: ofertaAtiva.id,
      returnOtp: pinParaValidar,
      photoUrl: fotoDevolucaoUrl,
      driverId: perfilMotorista.id,
      latitude: -22.3812,
      longitude: -41.7821,
    });

    if (res.success) {
      driverLedgerEngine.settleTripRide(
        perfilMotorista.id,
        `RET-${ofertaAtiva.id}`,
        returnDetails.driverReturnCompensationBrl / 0.88,
        "ENTREGA"
      );
      const summary = driverLedgerEngine.getEarningsSummary(perfilMotorista.id);
      setGanhosHoje(summary.availableBalanceCents / 100);
      setCorridasFeitas((prev) => prev + 1);
      setModalReturnFinalizarAberto(false);
      setEmDevolucao(false);
      setReturnDetails(null);
      setEstadoCockpit("IDLE");
      setOfertaAtiva(null);
      if (somAtivo) tocarAlertaFimViagem();
      alert(`Devolução concluída! Compensação de R$ ${returnDetails.driverReturnCompensationBrl.toFixed(2)} creditada via PIX D+0.`);
    } else {
      setErroPinDevolucao(res.message);
    }
  }

  function handleConcluirEntregaNormal() {
    if (!ofertaAtiva) return;

    deliveryProofEngine.registerProof({
      deliveryId: ofertaAtiva.id,
      stopId: `STOP-${currentStopNumber}`,
      type: "DELIVERY",
      photoUrl: fotoPodUrl,
      latitude: -22.3812,
      longitude: -41.7821,
      capturedByDriverId: perfilMotorista.id,
      metadata: { stopIndex: currentStopNumber },
    });

    const nextStop = deliveryMultiStopEngine.advanceToNextStop(ofertaAtiva.id);
    if (nextStop) {
      setCurrentStopNumber((prev) => prev + 1);
      alert(`Parada ${currentStopNumber} concluída! Deslocando para a próxima parada: ${nextStop.address}`);
      return;
    }

    handleConcluirCorrida();
  }

  function handleAbrirModalSaquePix() {
    setSaquesRealizadosSemana(getSaquesRealizadosNaSemana(perfilMotorista.id));
    setModalSaquePix(true);
  }

  function handleSolicitarSaquePix() {
    if (ganhosHoje <= 0) return;

    const res = solicitarSaquePixMotorista({
      driverId: perfilMotorista.id,
      chavePix: perfilMotorista.chavePix,
      valorBrutoBrl: ganhosHoje,
    });

    if (res.sucesso) {
      driverLedgerEngine.executePixWithdrawal(
        perfilMotorista.id,
        res.valorBrutoBrl,
        perfilMotorista.chavePix
      );
      setSaqueConcluido(true);
      setMensagemSaque(res.mensagem);
      setGanhosHoje(0);
      setSaquesRealizadosSemana(res.saquesNaSemana);
      localStorage.setItem("partiu_motorista_ganhos_hoje", "0.00");
      setTimeout(() => {
        setModalSaquePix(false);
        setSaqueConcluido(false);
        setMensagemSaque("");
      }, 2500);
    } else {
      alert(res.mensagem || "Não foi possível processar o saque.");
    }
  }

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-slate-100 font-sans select-none text-slate-900">
      {/* ================================================================= */}
      {/* 1. MAPA VEICULAR FULLSCREEN (DIURNO PADRONIZADO COM O PASSAGEIRO) */}
      {/* ================================================================= */}
      <PartiuDriverNavigationMap
        estado={estadoCockpit}
        origemEndereco={ofertaAtiva?.origem}
        destinoEndereco={emDevolucao ? ofertaAtiva?.origem : ofertaAtiva?.destino}
        modoNoturno={modoNoturno}
        className="absolute inset-0 z-0"
      />

      {/* ================================================================= */}
      {/* 2. TOP HUD FLUTUANTE EM CÁPSULAS BRANCAS VIDRO (PADRÃO PASSAGEIRO) */}
      {/* ================================================================= */}
      <header className="absolute top-0 inset-x-0 z-30 pt-[max(0.75rem,env(safe-area-inset-top))] px-3 pb-2.5 flex items-center justify-between pointer-events-none bg-gradient-to-b from-black/25 via-black/10 to-transparent">
        {/* Perfil Condutor com Cápsula Branca Translúcida */}
        <button
          type="button"
          onClick={() => setModalPerfilMotorista(true)}
          className="pointer-events-auto flex items-center gap-2 p-1.5 pr-2.5 sm:pr-3 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 hover:border-slate-300 active:scale-95 transition text-slate-950"
        >
          <div className="relative shrink-0">
            <div
              style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
              className="w-8 h-8 rounded-full font-black flex items-center justify-center text-xs shadow-xs ring-1 ring-black/10"
            >
              CS
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                isOnline ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
          </div>
          <div className="text-left">
            <span className="text-xs font-black text-slate-950 block leading-tight truncate max-w-[85px] min-[360px]:max-w-[105px] sm:max-w-none">
              Carlos E.
            </span>
            <span className="text-[10px] font-bold flex items-center gap-1 leading-none mt-0.5" style={{ color: corPrimaria }}>
              <Star className="w-2.5 h-2.5 fill-current" style={{ color: accentColor }} />
              <span>4.98</span>
              <span className="text-[9px] font-black px-1 rounded border" style={{ backgroundColor: `${corPrimaria}10`, color: corPrimaria, borderColor: `${corPrimaria}25` }}>
                {loyaltyProfile.badgeIcon} {loyaltyProfile.tierName}
              </span>
            </span>
          </div>
        </button>

        {/* Ações Direitas: Som, Ganhos D+0, Online/Offline e Modo Passageiro */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Botão de Áudio do Radar */}
          <button
            type="button"
            onClick={toggleSom}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition shadow-md active:scale-90 bg-white/95 backdrop-blur-md border border-slate-200 ${
              somAtivo ? "text-slate-900" : "text-slate-400"
            }`}
            style={somAtivo ? { color: corPrimaria } : {}}
            title={somAtivo ? "Som do radar ativado" : "Som silenciado"}
          >
            {somAtivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Badge do Plano do Motorista (Auditoria 2 & 10) */}
          <button
            type="button"
            onClick={() => setModalPlanosAberto(true)}
            className="px-2.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 text-[11px] font-black text-slate-800 shadow-md flex items-center gap-1 hover:bg-slate-50 transition active:scale-95"
            title="Ver e Gerenciar Plano de Assinatura"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
            <span className="truncate max-w-[70px] sm:max-w-none">{driverPlan?.name || "Bronze"} ({driverPlan?.commissionPercent || 5}%)</span>
          </button>

          {/* Faturamento D+0 com PIX */}
          <button
            type="button"
            onClick={handleAbrirModalSaquePix}
            className="px-2.5 sm:px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 text-xs font-black text-slate-950 shadow-md flex items-center gap-1 hover:bg-slate-50 transition active:scale-95"
            title="Ver saldo e sacar via PIX"
          >
            <span className="text-xs" style={{ color: accentColor }}>⚡</span>
            <span>{ganhosHoje.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </button>

          {/* Alternar Online/Offline */}
          <button
            type="button"
            onClick={handleToggleOnline}
            style={
              isOnline
                ? {
                    background: brandGradient,
                    color: corTextoPrimaria,
                    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                  }
                : {}
            }
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
              isOnline ? "" : "bg-white/95 text-slate-500 border border-slate-200"
            }`}
          >
            <Power className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden min-[380px]:inline">{isOnline ? "ONLINE" : "OFF"}</span>
          </button>

          {/* Atalho Passageiro */}
          <Link
            to="/app"
            className="w-8 h-8 rounded-full bg-white/95 text-slate-700 hover:text-slate-950 border border-slate-200 flex items-center justify-center transition shadow-md active:scale-95"
            title="Ir para Modo Passageiro"
          >
            <Car className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Alerta de Suspensão por Inadimplência (Fase 19) */}
      {(subscription.status === "SUSPENDED" || subscription.status === "REACTIVATION_REQUIRED") && (
        <div className="absolute top-16 inset-x-3 z-40 max-w-md mx-auto p-3.5 rounded-2xl bg-rose-600 text-white text-xs font-semibold shadow-2xl flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <span className="text-base">🚨</span>
            <div>
              <span className="font-black block">CONTA SUSPENSA POR INADIMPLÊNCIA</span>
              <span className="text-[11px] text-rose-100">
                Débito: {subscription.accumulatedDebtBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalRegularizacaoAberto(true)}
            className="px-3 py-1.5 rounded-xl bg-white text-rose-700 font-black text-xs hover:bg-rose-50 shadow-md active:scale-95 transition"
          >
            REGULARIZAR PIX
          </button>
        </div>
      )}

      {/* Alerta de Elegibilidade do Condutor (Se Bloqueado/Suspenso/CNH Vencida) */}
      {erroElegibilidade && !(subscription.status === "SUSPENDED" || subscription.status === "REACTIVATION_REQUIRED") && (
        <div className="absolute top-16 inset-x-3 z-40 max-w-md mx-auto p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold shadow-lg flex items-center justify-between animate-in slide-in-from-top duration-200">
          <span>⚠️ {erroElegibilidade}</span>
          <button
            type="button"
            onClick={() => setErroElegibilidade(null)}
            className="p-1 text-rose-500 hover:text-rose-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. GAVETAS OPERACIONAIS EM BRANCO VIDRO COM DESIGN DO PASSAGEIRO */}
      {/* ================================================================= */}
      <div data-hide-bottom-nav="true" className="absolute bottom-0 inset-x-0 z-40 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-3 sm:px-4 max-w-lg mx-auto pointer-events-auto">
        {/* ESTADO 1: IDLE / AGUARDANDO OFERTA (Trip Radar Ativo no Mapa) */}
        {estadoCockpit === "IDLE" && (
          <div className="p-4 rounded-3xl bg-white/98 backdrop-blur-md border border-slate-200 shadow-[0_16px_50px_rgba(0,0,0,0.18)] space-y-2.5 animate-in slide-in-from-bottom duration-300">
            {/* Barra tátil de puxar */}
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-1" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                <h3 className="text-sm font-black text-slate-950">Trip Radar em Busca</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPlanosAberto(true)}
                style={{ backgroundColor: `${corPrimaria}10`, color: corPrimaria, borderColor: `${corPrimaria}25` }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border transition hover:opacity-80"
              >
                Plano {driverPlan?.name || "Bronze"} ({driverPlan?.commissionPercent || 5}%) • Alterar
              </button>
            </div>

            {/* WIDGET: MODO DESTINO ("IR PARA CASA") */}
            {destinoAtivo ? (
              <div
                className="p-2.5 rounded-2xl flex items-center justify-between text-xs border"
                style={{
                  backgroundColor: `${accentColor}10`,
                  borderColor: `${accentColor}30`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-sm">🎯</span>
                  <div className="min-w-0">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider block"
                      style={{ color: corPrimaria }}
                    >
                      Modo Destino Ativo
                    </span>
                    <span className="font-black text-slate-900 truncate block">
                      {destinoAtivo.address}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    driverDestinationModeService.clearDestination(perfilMotorista.id);
                    setDestinoAtivo(null);
                  }}
                  className="px-2 py-1 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-black shrink-0 transition"
                  title="Desativar Modo Destino"
                >
                  ✕ Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setModalModoDestino(true)}
                className="w-full py-2 px-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🎯</span>
                  <span>Definir Destino ("Ir para Casa")</span>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: `${corPrimaria}10`,
                    color: corPrimaria,
                    borderColor: `${corPrimaria}20`,
                  }}
                >
                  {driverDestinationModeService.getRemainingUses(perfilMotorista.id)} restantes
                </span>
              </button>
            )}

            {/* AUDITORIA 10: WIDGET OFICIAL ECONOMIA PARTIU */}
            <div
              className="p-3.5 rounded-2xl border space-y-1.5"
              style={{
                background: `linear-gradient(135deg, ${corPrimaria}08 0%, ${corSecundaria}12 100%)`,
                borderColor: `${corPrimaria}25`,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: corPrimaria }}
                >
                  <PiggyBank className="w-4 h-4" style={{ color: accentColor }} />
                  <span>Economia {nomeApp} (Mês Atual)</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {corridasFeitas} corridas hoje
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span
                    className="text-xl font-black"
                    style={{ color: corPrimaria }}
                  >
                    +{wallet.totalSavingsVersusUberBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  <span className="text-[10px] text-slate-600 font-medium block">
                    guardados no seu bolso comparado à taxa de 20%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalEconomiaAberto(true)}
                  style={{ color: corPrimaria }}
                  className="text-[11px] font-bold hover:underline flex items-center gap-0.5"
                >
                  <span>Ver Detalhes</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Inadimplência ou Carência Aviso */}
            {subscription.status === "GRACE_PERIOD" && (
              <div
                className="p-2.5 rounded-xl border text-[11px] flex items-center justify-between"
                style={{
                  backgroundColor: `${corPrimaria}08`,
                  borderColor: `${corPrimaria}25`,
                  color: corPrimaria,
                }}
              >
                <span>⚠️ Mensalidade em carência ({subscription.accumulatedDebtBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}). Regularize para evitar suspensão.</span>
                <button
                  type="button"
                  onClick={() => setModalPlanosAberto(true)}
                  className="font-bold underline shrink-0 ml-1"
                  style={{ color: corPrimaria }}
                >
                  Pagar PIX
                </button>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 font-semibold">
              <span>Fundo Proteção: {wallet.protectionFundBalanceBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              <span className="font-black" style={{ color: corPrimaria }}>100% Repasse D+0</span>
            </div>
          </div>
        )}

        {/* ESTADO 2: OFERTA NO RADAR (DriverOfferModal V4.0 - Ultra-Minimalist & 10s Window) */}
        {estadoCockpit === "OFFER" && ofertaAtiva && (
          <DriverOfferModal
            oferta={{
              rideId: ofertaAtiva.id,
              passageiro: ofertaAtiva.passageiro,
              passageiroAvaliacao: ofertaAtiva.passageiroAvaliacao ?? 4.95,
              valorLiquido: ofertaAtiva.valorLiquido,
              distanciaKm: ofertaAtiva.distanciaKm,
              duracaoMin: 11,
              origem: ofertaAtiva.origem,
              destino: ofertaAtiva.destino,
              modalidadeTag: ofertaAtiva.tipo,
              distanciaAteEmbarqueKm: (ofertaAtiva as any).distanciaEmbarqueKm ?? 0.85,
              tempoAteEmbarqueMin: (ofertaAtiva as any).tempoEmbarqueMin ?? 3,
              ganhoPorKm:
                ofertaAtiva.distanciaKm > 0
                  ? Number((ofertaAtiva.valorLiquido / ofertaAtiva.distanciaKm).toFixed(2))
                  : 3.6,
            }}
            countdownSeconds={15}
            onAceitar={handleAceitarOferta}
            onRecusar={handleRecusarOferta}
          />
        )}

        {/* ESTADO 3: A CAMINHO DO PASSAGEIRO (GPS Ativo + Ações Rápidas 48px/56px) */}
        {estadoCockpit === "HEADING_TO_PICKUP" && ofertaAtiva && (
          <div className="p-4 sm:p-5 rounded-3xl bg-white/98 backdrop-blur-md border border-slate-200 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200">
            {/* Barra tátil */}
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="min-w-0 flex-1 pr-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider inline-block"
                  style={{
                    backgroundColor: `${corPrimaria}10`,
                    color: corPrimaria,
                    borderColor: `${corPrimaria}25`,
                  }}
                >
                  A Caminho do Embarque
                </span>
                <h3 className="text-base font-black text-slate-950 mt-1 truncate">{ofertaAtiva.passageiro}</h3>
                <span className="text-xs text-slate-500 truncate block">{ofertaAtiva.origem}</span>
              </div>

              {/* Botões de Contato Rápido (Chat Nativo Seguro em Tempo Real + Ligação) */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  style={{
                    background: brandGradient,
                    color: corTextoPrimaria,
                  }}
                  className="relative w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition shadow-xs cursor-pointer"
                  title="Abrir Chat Operacional Seguro"
                  aria-label={`Abrir chat operacional${driverUnreadCount > 0 ? ` (${driverUnreadCount} não lidas)` : ""}`}
                >
                  <MessageCircle className="w-5 h-5 text-slate-950" />
                  {driverUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-black border-2 border-white shadow-xs animate-pulse">
                      {driverUnreadCount > 9 ? "9+" : driverUnreadCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tel = ofertaAtiva.telefone?.replace(/\D/g, "") || "22999605162";
                    window.open(`tel:${tel}`, "_self");
                  }}
                  className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center active:scale-90 transition shadow-xs hover:bg-slate-200 cursor-pointer"
                  title="Ligar para o passageiro"
                >
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FASE 4: Atalhos Rápidos de Navegação Externa (Waze & Google Maps) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleNavegarExterno("waze")}
                className="h-11 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Compass className="w-4 h-4 text-sky-600" />
                <span>Navegar no Waze</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavegarExterno("google_maps")}
                className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <MapPin className="w-4 h-4" style={{ color: accentColor }} />
                <span>Google Maps</span>
              </button>
            </div>

            {/* Botão de Chegada no Local de Embarque (56px) */}
            <button
              type="button"
              onClick={handleChegueiAoLocal}
              style={{
                background: brandGradient,
                color: corTextoPrimaria,
              }}
              className="w-full h-14 rounded-2xl font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>✓ CHEGUEI AO LOCAL DE EMBARQUE</span>
            </button>

            {/* FASE 2: Gatilho de Cancelamento Operacional pelo Motorista */}
            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={() => setModalCancelarAberto(true)}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1.5 py-1 px-3 rounded-lg transition active:scale-95 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                <span>Problemas com o embarque? Cancelar corrida</span>
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 4: CONFIRMAÇÃO DE EMBARQUE INTELIGENTE (MODELO PROFISSIONAL 99 / UBER — SEM PIN OBRIGATÓRIO) */}
        {estadoCockpit === "WAITING_PIN" && ofertaAtiva && (
          <div className="p-4 sm:p-5 rounded-3xl bg-white/98 backdrop-blur-md border border-slate-200 shadow-2xl space-y-3.5 animate-in slide-in-from-bottom duration-200">
            {/* Barra tátil */}
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto" />

            {ofertaAtiva.tipo === "ENTREGA" ? (
              <>
                {/* Cabeçalho de Coleta Segura */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider" style={{ color: corPrimaria }}>
                    <Package className="w-4 h-4" style={{ color: accentColor }} />
                    <span>Coleta de Pacote no Remetente</span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: `${accentColor}12`,
                      color: corPrimaria,
                      borderColor: `${accentColor}30`,
                    }}
                  >
                    Geofence Coleta OK ✓
                  </span>
                </div>

                {/* Dados da Encomenda */}
                <div
                  className="flex items-center gap-3 p-3 rounded-2xl border"
                  style={{
                    backgroundColor: `${corPrimaria}08`,
                    borderColor: `${corPrimaria}25`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border shadow-xs shrink-0"
                    style={{
                      backgroundColor: `${corPrimaria}15`,
                      color: corPrimaria,
                      borderColor: `${corPrimaria}30`,
                    }}
                  >
                    <Box className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-slate-950 truncate">
                      {ofertaAtiva.descricaoPacote || "Pacote Flash Express"}
                    </h3>
                    <p className="text-xs text-slate-600 truncate mt-0.5">
                      Remetente: <span className="font-bold text-slate-800">{ofertaAtiva.passageiro}</span>
                    </p>
                    <p className="text-[11px] font-semibold truncate text-slate-500">
                      Entregar para: {ofertaAtiva.destinatarioNome || "Destinatário"}
                    </p>
                  </div>
                </div>

                {/* Resumo do Destino da Entrega */}
                <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Endereço de Entrega:</span>
                    <span className="font-bold text-slate-900 truncate block">{ofertaAtiva.destino}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-950 block">{ofertaAtiva.distanciaKm} km</span>
                    <span className="text-[10px] font-bold" style={{ color: corPrimaria }}>Flash Express</span>
                  </div>
                </div>

                {/* Status do Cronômetro de Espera e Carência Auditada */}
                {waitingTimerStatus && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                      waitingTimerStatus.isGracePeriodActive
                        ? "bg-slate-50 text-slate-700 border-slate-200"
                        : "bg-slate-100 text-slate-900 border-slate-300"
                    }`}
                  >
                    <span>
                      ⏱️ Espera no Remetente: {Math.floor(waitingTimerStatus.elapsedSeconds / 60)}:
                      {(waitingTimerStatus.elapsedSeconds % 60).toString().padStart(2, "0")}
                      {waitingTimerStatus.isGracePeriodActive
                        ? " (Carência 5 min)"
                        : " (Tarifação excedente)"}
                    </span>
                    <span className="font-black">
                      {waitingTimerStatus.accumulatedWaitingFeeCents > 0
                        ? `+R$ ${(waitingTimerStatus.accumulatedWaitingFeeCents / 100).toFixed(2)}`
                        : "Grátis"}
                    </span>
                  </div>
                )}

                {erroPin && <p className="text-xs text-rose-500 font-bold text-center">{erroPin}</p>}

                {/* Botão de Coleta 1-Tap */}
                {/* Botão de Validação do PIN 1 de Coleta */}
                <button
                  type="button"
                  onClick={() => {
                    setPinNumpadMode("PICKUP");
                    setModalPinNumpadAberto(true);
                  }}
                  style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                  className="w-full h-14 rounded-2xl font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-5 h-5" />
                  <span>DIGITAR PIN DE COLETA (PIN 1)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div
                  className="flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-xl py-2 px-3 border"
                  style={{
                    backgroundColor: `${corPrimaria}08`,
                    borderColor: `${corPrimaria}25`,
                    color: corPrimaria,
                  }}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                  <span>Cadeia de Custódia: Solicite o PIN 1 ao remetente</span>
                </div>
              </>
            ) : (
              <>
                {/* Cabeçalho do Ponto de Embarque */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider" style={{ color: corPrimaria }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
                    <span>Passageiro no Local de Embarque</span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: `${accentColor}12`,
                      color: corPrimaria,
                      borderColor: `${accentColor}30`,
                    }}
                  >
                    GPS Sincronizado ✓
                  </span>
                </div>

                {/* Perfil do Passageiro com Trust Badge, Avaliação e Contato Rápido */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      {ofertaAtiva.passageiroFoto ? (
                        <img
                          src={ofertaAtiva.passageiroFoto}
                          alt={ofertaAtiva.passageiro}
                          className="w-12 h-12 rounded-full object-cover border-2 shadow-xs" style={{ borderColor: accentColor }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full font-black text-lg flex items-center justify-center border-2 shadow-xs"
                          style={{
                            backgroundColor: `${corPrimaria}15`,
                            color: corPrimaria,
                            borderColor: accentColor,
                          }}
                        >
                          {ofertaAtiva.passageiro.charAt(0)}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-xs" style={{ backgroundColor: accentColor }}>
                        ✓
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-base font-black text-slate-950 truncate">{ofertaAtiva.passageiro}</h3>
                        <span className="text-xs font-black flex items-center gap-0.5" style={{ color: corPrimaria }}>
                          <Star className="w-3.5 h-3.5 fill-current" style={{ color: accentColor }} />
                          {ofertaAtiva.passageiroAvaliacao || 4.98}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-0.5 flex-wrap">
                        <span className="font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${accentColor}15`, color: corPrimaria }}>
                          CPF Verificado
                        </span>
                        <span>•</span>
                        <span>{ofertaAtiva.passageiroTotalCorridas || 48} viagens</span>
                        <span>•</span>
                        <span className="font-bold px-1.5 py-0.5 rounded border" style={{ backgroundColor: `${corPrimaria}10`, color: corPrimaria, borderColor: `${corPrimaria}20` }}>
                          ⭐ {ofertaAtiva.passageiroTrustTier || "Elite"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contato Rápido com Passageiro (Chat Nativo com Badge + Ligação) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsChatOpen(true)}
                      style={{
                        background: brandGradient,
                        color: corTextoPrimaria,
                      }}
                      className="relative w-11 h-11 rounded-xl flex items-center justify-center active:scale-90 transition shadow-xs cursor-pointer"
                      title="Abrir Chat Operacional com o Passageiro"
                      aria-label={`Abrir chat com o passageiro${driverUnreadCount > 0 ? ` (${driverUnreadCount} não lidas)` : ""}`}
                    >
                      <MessageCircle className="w-5 h-5 text-slate-950" />
                      {driverUnreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-black border-2 border-white shadow-xs animate-pulse">
                          {driverUnreadCount > 9 ? "9+" : driverUnreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tel = ofertaAtiva.telefone?.replace(/\D/g, "") || "22999605162";
                        window.open(`tel:${tel}`, "_self");
                      }}
                      className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center active:scale-90 transition shadow-xs hover:bg-slate-200 cursor-pointer"
                      title="Ligar para o passageiro"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Resumo do Destino e Alinhamento de Rota */}
                <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Destino Confirmado:</span>
                    <span className="font-bold text-slate-900 truncate block">{ofertaAtiva.destino}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-950 block">{ofertaAtiva.distanciaKm} km</span>
                    <span className="text-[10px] font-bold" style={{ color: corPrimaria }}>Livre de Fricção</span>
                  </div>
                </div>

                {/* Status do Cronômetro de Espera e Carência Auditada */}
                {waitingTimerStatus && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                      waitingTimerStatus.isGracePeriodActive
                        ? "bg-slate-50 text-slate-700 border-slate-200"
                        : "bg-slate-100 text-slate-900 border-slate-300"
                    }`}
                  >
                    <span>
                      ⏱️ Espera no Embarque: {Math.floor(waitingTimerStatus.elapsedSeconds / 60)}:
                      {(waitingTimerStatus.elapsedSeconds % 60).toString().padStart(2, "0")}
                      {waitingTimerStatus.isGracePeriodActive
                        ? " (Carência 5 min ativa)"
                        : " (Tarifação excedente ativa)"}
                    </span>
                    <span className="font-black">
                      {waitingTimerStatus.accumulatedWaitingFeeCents > 0
                        ? `+R$ ${(waitingTimerStatus.accumulatedWaitingFeeCents / 100).toFixed(2)}`
                        : "Grátis"}
                    </span>
                  </div>
                )}

                {erroPin && <p className="text-xs text-rose-500 font-bold text-center">{erroPin}</p>}

                {/* FASE 3: AÇÃO OPERACIONAL DE NO-SHOW (CARÊNCIA DE 5 MIN ESGOTADA) */}
                {waitingTimerStatus && !waitingTimerStatus.isGracePeriodActive && (
                  <button
                    type="button"
                    onClick={() => setModalNoShowConfirmAberto(true)}
                    className="w-full h-13 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-rose-700"
                  >
                    <UserX className="w-4 h-4" />
                    <span>PASSAGEIRO NÃO COMPARECEU • COBRAR TAXA (R$ 6,00)</span>
                  </button>
                )}

                {/* BOTÃO PRINCIPAL 1-TAP (56px Touch Target - Modelo Uber / 99) */}
                <button
                  type="button"
                  onClick={handleConfirmarEmbarqueSmart}
                  style={{
                    background: brandGradient,
                    color: corTextoPrimaria,
                  }}
                  className="w-full h-14 rounded-2xl font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>PASSAGEIRO EMBARCOU • INICIAR CORRIDA</span>
                  <span>✓</span>
                </button>

                {/* Rodapé com Indicador de Embarque Smart e Cancelamento Justificado */}
                <div className="flex items-center justify-between pt-1 text-[11px] px-1">
                  <span className="font-bold flex items-center gap-1" style={{ color: corPrimaria }}>
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    Embarque Smart sem PIN
                  </span>

                  <button
                    type="button"
                    onClick={() => setModalCancelarAberto(true)}
                    className="font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer"
                  >
                    Cancelar corrida
                  </button>
                </div>
              </>
            )}

            {/* TECLADO DE PIN DE COLETA (Exclusivo para Encomendas/Entregas Flash) */}
            {ofertaAtiva.tipo === "ENTREGA" && modoPinOpcional && (
              <div className="space-y-2 pt-1 border-t border-slate-100 animate-in fade-in duration-150">
                <p className="text-[11px] text-slate-500 text-center">
                  Digite o PIN de 4 dígitos informado pelo remetente:
                </p>

                {/* Display dos 4 Dígitos */}
                <div className="flex items-center justify-center gap-2.5 my-1">
                  {[0, 1, 2, 3].map((idx) => {
                    const digit = pinDigitado[idx];
                    const isCurrent = pinDigitado.length === idx;
                    return (
                      <div
                        key={idx}
                        style={digit ? { borderColor: corPrimaria } : {}}
                        className={`w-11 h-12 rounded-xl flex items-center justify-center font-mono text-xl font-black transition-all ${
                          digit
                            ? "bg-slate-50 text-slate-950 border-2 shadow-sm"
                            : isCurrent
                            ? "bg-white text-slate-950 border-2 border-slate-400 animate-pulse"
                            : "bg-slate-50 text-slate-300 border border-slate-200"
                        }`}
                      >
                        {digit || "•"}
                      </div>
                    );
                  })}
                </div>

                {/* Teclado Numérico Compacto */}
                <div className="grid grid-cols-3 gap-1.5 pt-1 max-w-[260px] mx-auto">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePressDigit(num)}
                      className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-black text-lg flex items-center justify-center border border-slate-200 active:scale-95 transition shadow-xs"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClearDigits}
                    className="h-11 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center border border-rose-200 active:scale-95 transition"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePressDigit("0")}
                    className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-black text-lg flex items-center justify-center border border-slate-200 active:scale-95 transition shadow-xs"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspaceDigit}
                    className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center border border-slate-200 active:scale-95 transition"
                  >
                    ⌫
                  </button>
                </div>

                {/* Botão de Validação de PIN */}
                <button
                  type="button"
                  onClick={() => validarPinDireto(pinDigitado)}
                  disabled={pinDigitado.length < 4}
                  style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                  className="w-full h-12 rounded-xl disabled:opacity-40 disabled:pointer-events-none font-black text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 mt-1"
                >
                  <span>VALIDAR PIN &amp; INICIAR</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ESTADO 5: VIAGEM EM ANDAMENTO (Navegação até o Destino Final) */}
        {estadoCockpit === "IN_PROGRESS" && ofertaAtiva && (
          <div className="p-4 sm:p-5 rounded-3xl bg-white/98 backdrop-blur-md border border-slate-200 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200">
            {/* Barra tátil */}
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto" />

            {/* Se for ENTREGA e em Devolução Reversa */}
            {ofertaAtiva.tipo === "ENTREGA" && emDevolucao ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-rose-100 pb-2.5">
                  <div className="flex items-center gap-1.5 text-rose-700 font-black text-xs uppercase tracking-wider">
                    <RotateCcw className="w-4 h-4 text-rose-600 animate-spin" />
                    <span>Devolução Reversa ao Remetente</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                    +R$ {returnDetails?.driverReturnCompensationBrl.toFixed(2) || "15,50"}
                  </span>
                </div>

                <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-1 text-xs">
                  <span className="text-[10px] font-black uppercase text-rose-800 block">Ponto de Retorno (Remetente):</span>
                  <p className="font-black text-slate-950 truncate">{ofertaAtiva.origem}</p>
                  <p className="text-[11px] text-slate-600">Devolver pacote para: <strong>{ofertaAtiva.passageiro}</strong></p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalReturnFinalizarAberto(true)}
                  className="w-full h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Package className="w-5 h-5" />
                  <span>CHEGUEI AO REMETENTE • FINALIZAR DEVOLUÇÃO</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="min-w-0 flex-1 pr-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider inline-block"
                      style={{
                        backgroundColor: `${corPrimaria}10`,
                        color: corPrimaria,
                        borderColor: `${corPrimaria}25`,
                      }}
                    >
                      {ofertaAtiva.tipo === "ENTREGA"
                        ? `● Em Rota para o Destinatário ${currentStopNumber > 1 ? `(Parada ${currentStopNumber})` : ""}`
                        : "● Viagem em Andamento"}
                    </span>
                    <h3 className="text-base font-black text-slate-950 mt-1 truncate">
                      {ofertaAtiva.tipo === "ENTREGA" && ofertaAtiva.destinatarioNome
                        ? `Destinatário: ${ofertaAtiva.destinatarioNome}`
                        : ofertaAtiva.passageiro}
                    </h3>
                    <span className="text-xs text-slate-500 truncate block">Destino: {ofertaAtiva.destino}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsChatOpen(true)}
                      style={{
                        background: brandGradient,
                        color: corTextoPrimaria,
                      }}
                      className="relative w-11 h-11 rounded-xl flex items-center justify-center active:scale-90 transition shadow-xs cursor-pointer"
                      title="Abrir Chat Operacional"
                      aria-label={`Abrir chat operacional${driverUnreadCount > 0 ? ` (${driverUnreadCount} não lidas)` : ""}`}
                    >
                      <MessageCircle className="w-5 h-5 text-slate-950" />
                      {driverUnreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-black border-2 border-white shadow-xs animate-pulse">
                          {driverUnreadCount > 9 ? "9+" : driverUnreadCount}
                        </span>
                      )}
                    </button>
                    <span className="text-2xl font-black text-slate-950">
                      {ofertaAtiva.valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </div>

                {/* FASE 4: Atalhos Rápidos de Navegação Externa (Waze & Google Maps) */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleNavegarExterno("waze")}
                    className="h-11 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Compass className="w-4 h-4 text-sky-600" />
                    <span>Navegar no Waze</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavegarExterno("google_maps")}
                    className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <MapPin className="w-4 h-4" style={{ color: accentColor }} />
                    <span>Google Maps</span>
                  </button>
                </div>

                {ofertaAtiva.tipo === "ENTREGA" ? (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Botão de Exceção: Destinatário não localizado */}
                      <button
                        type="button"
                        onClick={handleAbrirModalDevolucao}
                        style={{
                          backgroundColor: `${corPrimaria}08`,
                          borderColor: `${corPrimaria}30`,
                          color: corPrimaria,
                        }}
                        className="h-14 rounded-2xl border font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer text-center px-2"
                      >
                        <UserX className="w-4 h-4 shrink-0" style={{ color: corPrimaria }} />
                        <span>Destinatário Ausente?</span>
                      </button>

                      {/* Botão Normal: Finalizar com PIN 2 de Entrega */}
                      <button
                        type="button"
                        onClick={() => {
                          setPinNumpadMode("DROPOFF");
                          setModalPinNumpadAberto(true);
                        }}
                        style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                        className="h-14 rounded-2xl font-black text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer text-center px-2"
                      >
                        <KeyRound className="w-4 h-4 shrink-0" />
                        <span>FINALIZAR COM PIN 2</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-semibold text-center">
                      <ShieldCheck className="w-3.5 h-3.5" style={{ color: accentColor }} />
                      <span>Exige PIN 2 do destinatário para liberar entrega e PIX</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConcluirCorrida}
                    style={{
                      background: brandGradient,
                      color: corTextoPrimaria,
                    }}
                    className="w-full h-14 rounded-2xl font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🏁 FINALIZAR CORRIDA &amp; RECEBER PIX D+0</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL: DESTINATÁRIO AUSENTE / PROTOCOLO DE DEVOLUÇÃO 99ENTREGA     */}
      {/* =================================================================== */}
      {modalDevolucaoAberto && waitStatus && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-900 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary-700" />
                <h3 className="text-sm font-black text-slate-950">Destinatário Não Localizado</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalDevolucaoAberto(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cronômetro de Carência Obrigatória (5 minutos / 300s) */}
            <div
              className="p-3.5 rounded-2xl border text-center space-y-1"
              style={{
                backgroundColor: `${corPrimaria}08`,
                borderColor: `${corPrimaria}25`,
              }}
            >
              <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: corPrimaria }}>
                Tolerância Obrigatória de Espera (99Entrega)
              </span>
              <div className="text-3xl font-mono font-black" style={{ color: corPrimaria }}>
                {Math.floor(waitStatus.elapsedSeconds / 60).toString().padStart(2, "0")}:
                {(waitStatus.elapsedSeconds % 60).toString().padStart(2, "0")}{" "}
                <span className="text-xs font-sans font-bold text-slate-500">/ 05:00 min</span>
              </div>
              <p className="text-[11px] text-slate-600">
                {waitStatus.canInitiateReturn
                  ? "✓ Tolerância e tentativas cumpridas! Devolução liberada."
                  : "Aguarde e tente contatar o destinatário antes de devolver."}
              </p>
            </div>

            {/* Botões de Tentativa de Contato Obrigatório */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Registre suas tentativas de contato:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleRegistrarContato("CALL")}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-bold text-[11px] flex flex-col items-center gap-1 active:scale-95 transition"
                >
                  <Phone className="w-4 h-4" style={{ color: corPrimaria }} />
                  <span>Ligação</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRegistrarContato("MESSAGE")}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-bold text-[11px] flex flex-col items-center gap-1 active:scale-95 transition"
                >
                  <MessageCircle className="w-4 h-4" style={{ color: corPrimaria }} />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRegistrarContato("BUZZER")}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-bold text-[11px] flex flex-col items-center gap-1 active:scale-95 transition"
                >
                  <Bell className="w-4 h-4 text-primary-700" />
                  <span>Interfone</span>
                </button>
              </div>

              {waitStatus.contactAttempts.length > 0 && (
                <div className="text-[11px] font-semibold text-center pt-1" style={{ color: corPrimaria }}>
                  ✓ {waitStatus.contactAttempts.length} tentativa(s) registrada(s) na auditoria.
                </div>
              )}
            </div>

            {/* Ação de Iniciar Devolução */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={handleIniciarDevolucao}
                style={{ background: brandGradient, color: corTextoPrimaria }}
                className="w-full py-3.5 rounded-2xl font-black text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>INICIAR DEVOLUÇÃO AO REMETENTE</span>
              </button>
              <button
                type="button"
                onClick={() => setModalDevolucaoAberto(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Continuar Aguardando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: FINALIZAÇÃO DA DEVOLUÇÃO NO REMETENTE                       */}
      {/* =================================================================== */}
      {modalReturnFinalizarAberto && returnDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-900 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" style={{ color: accentColor }} />
                <h3 className="text-sm font-black text-slate-950">Confirmar Devolução</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalReturnFinalizarAberto(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="p-3 rounded-2xl border text-xs space-y-1 text-slate-900"
              style={{
                backgroundColor: `${corPrimaria}08`,
                borderColor: `${corPrimaria}25`,
              }}
            >
              <span className="font-black block" style={{ color: corPrimaria }}>Remetente Presente no Local:</span>
              <p>Solicite o PIN de 4 dígitos ao remetente ou confirme a entrega do pacote de volta.</p>
              <p className="font-bold pt-1" style={{ color: corPrimaria }}>
                Compensação Condutor: R$ {returnDetails.driverReturnCompensationBrl.toFixed(2)}
              </p>
            </div>

            {/* Input PIN Remetente */}
            <div className="space-y-1 text-center">
              <label className="text-xs font-bold text-slate-600 block">
                PIN de Devolução (Dica: {returnDetails.returnOtpExpected}):
              </label>
              <input
                type="text"
                maxLength={4}
                value={pinDevolucaoDigitado}
                onChange={(e) => setPinDevolucaoDigitado(e.target.value)}
                placeholder={returnDetails.returnOtpExpected}
                className="w-36 mx-auto px-4 py-2.5 text-center font-mono font-black text-xl rounded-xl bg-slate-100 border border-slate-300 focus:outline-none focus:border-slate-400 tracking-widest"
              />
              {erroPinDevolucao && (
                <p className="text-xs text-rose-600 font-bold">{erroPinDevolucao}</p>
              )}
            </div>

            {/* Comprovante Fotográfico */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Foto do Pacote Devolvido (POD):
              </span>
              <div className="h-28 w-full rounded-2xl overflow-hidden border border-slate-200 relative">
                <img
                  src={fotoDevolucaoUrl}
                  alt="Comprovante de Devolução"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/70 text-white rounded text-[9px] font-bold">
                  Foto Comprovada ✓
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConcluirDevolucao}
              style={{ background: brandGradient, color: corTextoPrimaria }}
              className="w-full h-14 rounded-2xl font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
              <span>FINALIZAR DEVOLUÇÃO &amp; RECEBER PIX D+0</span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL / NUMPAD BOTTOM SHEET: DUPLO PIN DE ENTREGA (BLIND VALIDATION) */}
      {/* =================================================================== */}
      {ofertaAtiva && ofertaAtiva.tipo === "ENTREGA" && (
        <DeliveryPinNumpadBottomSheet
          isOpen={modalPinNumpadAberto}
          mode={pinNumpadMode}
          deliveryId={ofertaAtiva.id}
          driverId={perfilMotorista.id}
          customerName={
            pinNumpadMode === "PICKUP"
              ? ofertaAtiva.passageiro
              : ofertaAtiva.destinatarioNome || "Destinatário"
          }
          expectedPinFallback={
            pinNumpadMode === "PICKUP"
              ? ofertaAtiva.pickupOtp || ofertaAtiva.pinCorreto
              : ofertaAtiva.deliveryOtp || ofertaAtiva.pinCorreto
          }
          onSuccess={() => {
            if (pinNumpadMode === "PICKUP") {
              handlePickupPinSuccess();
            } else {
              handleDropoffPinSuccess();
            }
          }}
          onCancel={() => setModalPinNumpadAberto(false)}
          onStartReturn={() => {
            setModalPinNumpadAberto(false);
            handleAbrirModalDevolucao();
          }}
        />
      )}

      {/* =================================================================== */}
      {/* MODAL / DRAWER: PERFIL DO MOTORISTA (PADRÃO BRANCO VIDRO PASSAGEIRO) */}
      {/* =================================================================== */}
      {modalPerfilMotorista && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" style={{ color: accentColor }} />
                <h3 className="text-base font-black text-slate-950">Perfil do Parceiro {nomeApp}</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPerfilMotorista(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Identificação do Condutor e Veículo */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div
                style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                className="w-12 h-12 rounded-2xl font-black text-lg flex items-center justify-center shadow-sm"
              >
                CS
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-black text-slate-950">Carlos Eduardo</h4>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ backgroundColor: `${accentColor}15`, color: corPrimaria, borderColor: `${accentColor}30` }}>
                    Ativo
                  </span>
                </div>
                <p className="text-xs text-slate-600">Chevrolet Onix Plus 2024</p>
                <p className="text-[11px] font-mono font-bold" style={{ color: corPrimaria }}>MOB-8K99</p>
              </div>
            </div>

            {/* Grid de Métricas de Desempenho Operacional */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block font-semibold">Avaliação</span>
                <span className="text-lg font-black flex items-center justify-center gap-1" style={{ color: corPrimaria }}>
                  <Star className="w-4 h-4 fill-current" style={{ color: accentColor }} />
                  4.98
                </span>
                <span className="text-[10px] text-slate-400">3.840 viagens</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block font-semibold">Aceitação</span>
                <span className="text-lg font-black" style={{ color: corPrimaria }}>98%</span>
                <span className="text-[10px] text-slate-400">Nível Diamante</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block font-semibold">Cancelamento</span>
                <span className="text-lg font-black text-slate-800">1.2%</span>
                <span className="text-[10px] text-slate-400">Excelente</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block font-semibold">Hoje Conectado</span>
                <span className="text-lg font-black" style={{ color: corPrimaria }}>{horasOnline}</span>
                <span className="text-[10px] text-slate-400">{corridasFeitas} corridas</span>
              </div>
            </div>

            {/* Preferências Rápidas */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Volume2 className="w-4 h-4 text-primary-700" />
                  <span>Som do Trip Radar</span>
                </div>
                <button
                  type="button"
                  onClick={toggleSom}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                    somAtivo ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {somAtivo ? "Ligado" : "Mudo"}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  {modoNoturno ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-primary-600" />}
                  <span>Modo do Mapa</span>
                </div>
                <button
                  type="button"
                  onClick={toggleModoNoturno}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition"
                >
                  {modoNoturno ? "Noturno 🌙" : "Diurno ☀️"}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                <span className="text-slate-500">Repasse Financeiro</span>
                <span className="font-bold" style={{ color: corPrimaria }}>100% Líquido D+0</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalPerfilMotorista(false)}
              className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL OFICIAL: SAQUE PIX INSTANTÂNEO COM VALIDAÇÃO ESTREITA E D+0 */}
      {/* =================================================================== */}
      <DriverPixWithdrawalModal
        isOpen={modalSaquePix}
        onClose={() => setModalSaquePix(false)}
        driverId={perfilMotorista.id}
        saldoDisponivelBrl={ganhosHoje}
        chavePixPadrao={perfilMotorista.chavePix}
        onWithdrawalSuccess={(newBalance) => {
          setGanhosHoje(newBalance);
          setWallet(driverWalletEngine.getWallet(perfilMotorista.id));
        }}
      />

      {/* =================================================================== */}
      {/* MODAL OFICIAL: MODO DESTINO DO MOTORISTA ("IR PARA CASA")           */}
      {/* =================================================================== */}
      <DriverDestinationModal
        isOpen={modalModoDestino}
        onClose={() => setModalModoDestino(false)}
        driverId={perfilMotorista.id}
        onDestinationSet={(dest) => setDestinoAtivo(dest)}
      />

      {/* =================================================================== */}
      {/* MODAL: MEU PLANO & ASSINATURA (AUDITORIA 2 & 12)                    */}
      {/* =================================================================== */}
      {modalPlanosAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5" style={{ color: accentColor }} />
                <h3 className="text-base font-black text-slate-950">Planos de Assinatura {nomeApp}</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPlanosAberto(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Escolha o plano que melhor se adapta à sua rotina. Quanto menor a comissão, mais dinheiro fica no seu bolso.
            </p>

            {/* Lista dos 4 Planos Oficiais */}
            <div className="space-y-3">
              {subscriptionEngine.getAllPlans(false).map((plan) => {
                const isSelected = subscription.planId === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`p-3.5 rounded-2xl border-2 transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-50/80 shadow-md"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                    style={isSelected ? { borderColor: corPrimaria, backgroundColor: `${corPrimaria}06` } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${plan.badgeColor}`} />
                        <h4 className="font-black text-sm text-slate-950">{plan.name}</h4>
                        {plan.isPopular && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}20`, color: corPrimaria }}>
                            Mais Popular
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}20`, color: corPrimaria }}>
                            Plano Atual ✓
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-950 block">
                          {plan.monthlyFeeBrl === 0
                            ? "Sem Mensalidade"
                            : `${plan.monthlyFeeBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês`}
                        </span>
                        <span className="text-[11px] font-bold" style={{ color: corPrimaria }}>
                          {plan.commissionPercent}% por corrida
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-1.5">{plan.description}</p>

                    <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {plan.commissionPercent <= 3 ? "⭐ Atendimento VIP Prioritário" : "Suporte Regular no App"}
                      </span>
                      {!isSelected ? (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = subscriptionEngine.changeDriverPlan(perfilMotorista.id, plan.id);
                            setSubscription(updated);
                            setDriverPlan(plan);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition active:scale-95"
                        >
                          Mudar para {plan.name}
                        </button>
                      ) : (
                        <span className="text-xs font-bold" style={{ color: corPrimaria }}>Ativo</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setModalPlanosAberto(false)}
              className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: COMPARATIVO ECONOMIA PARTIU (AUDITORIA 10)                  */}
      {/* =================================================================== */}
      {modalEconomiaAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-900 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5" style={{ color: accentColor }} />
                <h3 className="text-base font-black text-slate-950">Seu Faturamento &amp; Economia</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalEconomiaAberto(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="p-4 rounded-2xl border text-center space-y-1"
              style={{
                backgroundColor: `${corPrimaria}08`,
                borderColor: `${corPrimaria}25`,
              }}
            >
              <span className="text-[10px] font-black uppercase" style={{ color: corPrimaria }}>
                Economia Real no Seu Bolso (Mês)
              </span>
              <div className="text-3xl font-black" style={{ color: corPrimaria }}>
                +{wallet.totalSavingsVersusUberBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              <p className="text-xs text-slate-600">
                Comparativo direto com os 20% cobrados pelos aplicativos tradicionais.
              </p>
            </div>

            {/* Demonstrativo Detalhado (Exemplo Oficial do Prompt) */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Ganhos Brutos do Mês:</span>
                <span className="font-bold text-slate-900">
                  {wallet.totalGrossEarnedBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Taxas Pagas ao PARTIU:</span>
                <span className="font-black" style={{ color: corPrimaria }}>
                  -{wallet.totalPlatformFeesPaidBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200">
                <span>Quanto pagaria no app tradicional (20%):</span>
                <span className="font-bold text-rose-700">
                  -{(wallet.totalGrossEarnedBrl * 0.20).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold" style={{ color: corPrimaria }}>
                <span>Diferença a Seu Favor:</span>
                <span className="text-sm font-black">
                  +{wallet.totalSavingsVersusUberBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalEconomiaAberto(false)}
              className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: REGULARIZAÇÃO DE INADIMPLÊNCIA & DESBLOQUEIO PIX (FASE 19)   */}
      {/* =================================================================== */}
      {modalRegularizacaoAberto && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-900 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-950">Regularização de Inadimplência</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalRegularizacaoAberto(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-center space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-800">
                Débito Total Pendente
              </span>
              <div className="text-3xl font-black text-rose-600">
                {(subscription.accumulatedDebtBrl || 49.90).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              <p className="text-xs text-rose-800">
                Sua conta está temporariamente suspensa para novas corridas no Trip Radar.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Plano Contratado:</span>
                <span className="font-bold text-slate-900">{driverPlan?.name || "Bronze"}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Comissão por Corrida:</span>
                <span className="font-bold" style={{ color: corPrimaria }}>{driverPlan?.commissionPercent || 3.0}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Prazo de Carência:</span>
                <span className="font-bold text-rose-700">Expirado (Bloqueio Ativo)</span>
              </div>
            </div>

            {/* Código PIX Copia e Cola */}
            <div className="p-3 bg-slate-100 rounded-xl space-y-1.5 border border-slate-200">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>PIX Copia e Cola Oficial PARTIU</span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `00020126580014BR.GOV.BCB.PIX0136partiu-financeiro-recuperacao-502@pix.partiu.app520400005303986540${(subscription.accumulatedDebtBrl || 49.9).toFixed(2)}5802BR5925PARTIU MOBILIDADE BRASIL6009SAO PAULO62070503***6304`
                    );
                    alert("Chave Copia e Cola do PIX copiada!");
                  }}
                  style={{ color: corPrimaria }}
                  className="font-black text-xs hover:underline"
                >
                  COPIAR
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-mono break-all line-clamp-2">
                00020126580014BR.GOV.BCB.PIX0136partiu-financeiro-recuperacao-502@pix.partiu.app520400005303986540...
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const paidCents = subscription.accumulatedDebtCents || Math.round((subscription.accumulatedDebtBrl || 49.9) * 100);
                  const updated = subscriptionEngine.clearDebt(perfilMotorista.id, paidCents);
                  setSubscription(updated);
                  setDriverPlan(subscriptionEngine.getPlanById(updated.planId));
                  setWallet(driverWalletEngine.getWallet(perfilMotorista.id));
                  setErroElegibilidade(null);
                  setModalRegularizacaoAberto(false);
                  alert("Pagamento PIX confirmado com sucesso! Sua conta foi desbloqueada imediatamente.");
                }}
                style={{ background: brandGradient, color: corTextoPrimaria }}
                className="w-full h-12 rounded-2xl font-black text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>PAGUEI VIA PIX (DESBLOQUEIO IMEDIATO)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalRegularizacaoAberto(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / BOTTOM SHEET: CANCELAMENTO OPERACIONAL DO CONDUTOR (FASE 2)       */}
      {/* ========================================================================= */}
      <DriverCancelBottomSheet
        isOpen={modalCancelarAberto}
        onClose={() => setModalCancelarAberto(false)}
        onConfirm={handleConfirmarCancelamentoMotorista}
        isSubmitting={isCancelandoCorrida}
      />

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAÇÃO DE PASSAGEIRO NÃO COMPARECEU / NO-SHOW (FASE 3)        */}
      {/* ========================================================================= */}
      {modalNoShowConfirmAberto && ofertaAtiva && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-300 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">Passageiro Não Compareceu</h3>
                  <p className="text-xs text-slate-500">Cobrança de taxa de carência</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNoShowConfirmAberto(false)}
                disabled={isProcessandoNoShow}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl border space-y-2 text-xs text-slate-900" style={{ backgroundColor: `${corPrimaria}08`, borderColor: `${corPrimaria}25` }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Tempo no Embarque:</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {Math.floor((waitingTimerStatus?.elapsedSeconds || 300) / 60)}:
                  {((waitingTimerStatus?.elapsedSeconds || 300) % 60).toString().padStart(2, "0")} min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Tolerância Expirada:</span>
                <span className="font-bold" style={{ color: corPrimaria }}>✓ 5 min cumpridos</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-700">Taxa de Cancelamento:</span>
                <span className="font-black text-slate-900">R$ 6,00</span>
              </div>
              <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border" style={{ borderColor: `${accentColor}40` }}>
                <span className="font-black" style={{ color: corPrimaria }}>Seu Crédito Instantâneo PIX:</span>
                <span className="font-black text-sm" style={{ color: corPrimaria }}>+ R$ 4,50</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center leading-tight">
              Esta corrida será encerrada sem penalizar sua taxa de cancelamento. O crédito de R$ 4,50 entrará no seu saldo hoje.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isProcessandoNoShow}
                onClick={handleConfirmarNoShow}
                className="w-full h-13 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isProcessandoNoShow ? "PROCESSANDO..." : "CONFIRMAR & RECEBER R$ 4,50"}</span>
              </button>
              <button
                type="button"
                disabled={isProcessandoNoShow}
                onClick={() => setModalNoShowConfirmAberto(false)}
                className="w-full py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition text-center cursor-pointer"
              >
                Continuar Aguardando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHAT OPERACIONAL EM TEMPO REAL (SUPABASE REALTIME + SMART REPLIES)       */}
      {/* ========================================================================= */}
      {ofertaAtiva && (
        <ChatBottomSheet
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          rideId={ofertaAtiva.id}
          currentUserType="DRIVER"
          currentUserId={perfilMotorista.id}
          partnerName={ofertaAtiva.destinatarioNome && ofertaAtiva.tipo === "ENTREGA" ? ofertaAtiva.destinatarioNome : ofertaAtiva.passageiro}
          partnerPhoto={ofertaAtiva.passageiroFoto}
          partnerRoleLabel={ofertaAtiva.tipo === "ENTREGA" ? "Destinatário / Remetente" : "Passageiro"}
          rideStatus={
            estadoCockpit === "HEADING_TO_PICKUP"
              ? "A_CAMINHO"
              : estadoCockpit === "WAITING_PIN"
              ? "CHEGOU"
              : estadoCockpit === "IN_PROGRESS"
              ? "EM_VIAGEM"
              : "PROCURANDO"
          }
        />
      )}
    </div>
  );
}
