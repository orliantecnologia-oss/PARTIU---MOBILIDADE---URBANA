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
  Shield,
  ShieldCheck,
  Award,
  ChevronRight,
  Menu,
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
  Clock,
  RotateCcw,
  Bell,
  UserX,
  Percent,
  PiggyBank,
  TrendingUp,
  Wallet,
  Receipt,
  ArrowUpRight,
  Home,
  Route as RouteIcon,
  User,
} from "lucide-react";
import { PartiuLogo } from "@/components/common/PartiuLogo";
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
import { DriverHeader } from "@/components/driver/cockpit/DriverHeader";
import { DriverContextualBottomSheet } from "@/components/driver/cockpit/DriverContextualBottomSheet";
import { DriverAccessGuard } from "@/components/driver/DriverAccessGuard";
import { ChatBottomSheet } from "@/components/chat/ChatBottomSheet";
import { DriverPixWithdrawalModal } from "@/components/driver/DriverPixWithdrawalModal";
import { DriverDestinationModal } from "@/components/driver/DriverDestinationModal";
import { VirtualTaximeterModal } from "@/components/driver/VirtualTaximeterModal";
import { DriverWelcomeGate } from "@/components/driver/DriverWelcomeGate";
import { driverDestinationModeService, type DriverDestination } from "@/services/DriverDestinationModeService";
import { h3DispatchEngine, geofenceArrivalService } from "@/lib/spatial";
import { computePixCrc16 } from "@/services/payment/PaymentProviderAdapter";
import { chatRealtimeService } from "@/services/ChatRealtimeService";
import {
  DriverCancelBottomSheet,
  type DriverCancelReasonCode,
} from "@/components/driver/DriverCancelBottomSheet";
import { openExternalNavigation } from "@/utils/navigation-launcher";
import { driverConsecutiveRidesEngine } from "@/lib/driver/driver-consecutive-rides-engine";
import { supabaseAuthService } from "@/lib/auth/supabase-auth-service";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { DriverProfileSettings } from "@/components/driver/DriverProfileSettings";
import { NotificationCenterModal } from "@/components/notifications/NotificationCenterModal";
import { pushNotificationService } from "@/services/PushNotificationService";
import { registrarETransmitirAlertaSOS } from "@/lib/partiu-realtime-service";

function SirenIcon({ className = "w-5 h-5 text-brand-danger-red" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 12a5 5 0 0 1 10 0v4H7v-4z" />
      <path d="M5 20h14" />
      <path d="M12 4V2" />
      <path d="M4.93 6.93 3.51 5.51" />
      <path d="M19.07 6.93l1.42-1.42" />
      <path d="M2 13h2" />
      <path d="M20 13h2" />
    </svg>
  );
}

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
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem("partiu_driver_demo_mode") === "true" ||
      localStorage.getItem("partiu_driver_demo") === "true" ||
      localStorage.getItem("partiu_demo_user") === "true"
    );
  });

  const activeUser = typeof window !== "undefined" 
    ? (supabaseAuthService?.getCurrentUser?.() || supabaseAuthService?.getStoredSession?.() || null) 
    : null;
  const isRegisteredDriver = activeUser?.role === "MOTORISTA" || (typeof window !== "undefined" && Boolean(localStorage.getItem("partiu_motorista_ativo")));

  if (!isRegisteredDriver && !isDemo) {
    return (
      <DriverWelcomeGate
        onEnterDemo={() => {
          if (typeof window !== "undefined") {
            localStorage.setItem("partiu_driver_demo_mode", "true");
          }
          setIsDemo(true);
        }}
      />
    );
  }

  const effectiveDriverId = activeUser?.role === "MOTORISTA" ? activeUser.id : MOTORISTA_CONTA_PADRAO.id;

  return (
    <DriverAccessGuard driverId={effectiveDriverId}>
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

  const activeUser = typeof window !== "undefined" ? (supabaseAuthService?.getCurrentUser?.() || supabaseAuthService?.getStoredSession?.() || null) : null;
  const isDemoUser = typeof window !== "undefined" && (
    localStorage.getItem("partiu_demo_user") === "true" ||
    localStorage.getItem("partiu_driver_demo") === "true" ||
    localStorage.getItem("partiu_driver_demo_mode") === "true"
  );
  const effectiveDriverId = activeUser?.role === "MOTORISTA" ? activeUser.id : MOTORISTA_CONTA_PADRAO.id;

  // Status de Moderação Documental (Supabase Profiles & Realtime)
  const [driverApprovalStatus, setDriverApprovalStatus] = useState<string>(() => {
    if (isDemoUser) return "aprovado";
    if (activeUser?.role === "MOTORISTA") {
      return activeUser.driverApprovalStatus || "pendente";
    }
    return "aprovado";
  });

  // Supabase Realtime: Desbloqueia automaticamente quando aprovado pelo Admin
  useEffect(() => {
    if (!effectiveDriverId || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`driver_approval_live_${effectiveDriverId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${effectiveDriverId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.approval_status;
          if (newStatus) {
            setDriverApprovalStatus(newStatus);
            const current = supabaseAuthService.getStoredSession();
            if (current && current.id === effectiveDriverId) {
              current.driverApprovalStatus = newStatus as any;
              supabaseAuthService.saveStoredSession(current);
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [effectiveDriverId]);

  // Status de Disponibilidade & Trava de Diária Inteligente (SaaS Model)
  const [isOnline, setIsOnline] = useState(() => {
    if (activeUser?.role === "MOTORISTA" && activeUser.driverApprovalStatus === "pendente") {
      return false;
    }
    const isUnlocked = driverSubscriptionService.isDriverUnlocked(effectiveDriverId) ||
      driverSubscriptionService.isDriverUnlocked(MOTORISTA_CONTA_PADRAO.id);
    const isDemo = typeof window !== "undefined" && (
      localStorage.getItem("partiu_driver_demo_mode") === "true" ||
      localStorage.getItem("partiu_driver_demo") === "true" ||
      localStorage.getItem("partiu_demo_user") === "true"
    );
    return isUnlocked || isDemo;
  });

  // Perfil Operacional e Elegibilidade (Padrão 99/Uber)
  const [perfilMotorista, setPerfilMotorista] = useState<DriverProfileRecord>(() => {
    if (activeUser?.role === "MOTORISTA") {
      const cpfEfetivo = activeUser.cpf || (activeUser as any).pixKey || MOTORISTA_CONTA_PADRAO.cpf;
      return {
        ...MOTORISTA_CONTA_PADRAO,
        id: activeUser.id,
        nome: activeUser.name || MOTORISTA_CONTA_PADRAO.nome,
        telefone: activeUser.phone || MOTORISTA_CONTA_PADRAO.telefone,
        email: activeUser.email || MOTORISTA_CONTA_PADRAO.email,
        fotoUrl: activeUser.avatarUrl || MOTORISTA_CONTA_PADRAO.fotoUrl,
        cpf: cpfEfetivo,
        chavePix: cpfEfetivo,
      };
    }
    return MOTORISTA_CONTA_PADRAO;
  });
  const [modalPerfilMotorista, setModalPerfilMotorista] = useState(false);
  const [modalNotificacoesAberto, setModalNotificacoesAberto] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Escuta em tempo real a tabela notifications do Supabase para o sino funcional
  useEffect(() => {
    if (!perfilMotorista.id) return;
    const unsub = pushNotificationService.subscribeToUserNotifications(
      perfilMotorista.id,
      (list) => {
        const unread = list.filter((n) => !n.isRead).length;
        setUnreadNotificationsCount(unread);
      }
    );

    // Tenta registrar push notification se o usuário já tiver concedido permissão
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      void pushNotificationService.requestPermission(perfilMotorista.id, "DRIVER");
    }

    return () => {
      unsub();
    };
  }, [perfilMotorista.id]);

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
  const [modalSosAberto, setModalSosAberto] = useState(false);

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
  const [corridaSincronizada, setCorridaSincronizada] = useState<CorridaPartiu | null>(() => getCorridaAtiva());
  const [acionandoSos, setAcionandoSos] = useState(false);

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
  const [modalTaximetro, setModalTaximetro] = useState(false);
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

  const [tempoRegressivo, setTempoRegressivo] = useState(60);
  const [pinDigitado, setPinDigitado] = useState("");
  const [erroPin, setErroPin] = useState("");
  const [modoPinOpcional, setModoPinOpcional] = useState(false);
  const [modalSaquePix, setModalSaquePix] = useState(false);
  const [saqueConcluido, setSaqueConcluido] = useState(false);
  const [mensagemSaque, setMensagemSaque] = useState("");
  const [saquesRealizadosSemana, setSaquesRealizadosSemana] = useState(0);
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
        setTempoRegressivo(60);
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
      // 0. Bloqueio por Moderação Operacional
      if (!isDemoUser && driverApprovalStatus === "pendente") {
        setErroElegibilidade("Seu cadastro está em análise pela moderação operacional. Aguarde a aprovação dos documentos para ficar ONLINE.");
        return;
      }
      if (!isDemoUser && driverApprovalStatus === "rejeitado") {
        setErroElegibilidade("Seu cadastro foi reprovado pela moderação. Acesse o suporte para regularizar seus documentos.");
        return;
      }

      // 1. Validação da Trava de Diária Inteligente (SaaS Model)
      const unlocked = isDemoUser || driverSubscriptionService.isDriverUnlocked(perfilMotorista.id);
      if (!unlocked) {
        setErroElegibilidade("Acesso operacional bloqueado. Regularize sua assinatura via PIX para rodar.");
        return;
      }
      const currentSub = subscriptionEngine.getDriverSubscription(perfilMotorista.id);
      if (!isDemoUser && (currentSub.status === "SUSPENDED" || currentSub.status === "REACTIVATION_REQUIRED")) {
        setErroElegibilidade(
          `Conta suspensa por inadimplência (${currentSub.accumulatedDebtBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}). Regularize via PIX para voltar a rodar.`
        );
        setModalRegularizacaoAberto(true);
        return;
      }

      // Trava de Saldo Devedor de Comissão (Debt Cutoff)
      if (!isDemoUser) {
        const debtCheck = driverWalletEngine.checkDebtStatus(perfilMotorista.id);
        if (debtCheck.isBlocked) {
          setErroElegibilidade(debtCheck.message);
          setModalRegularizacaoAberto(true);
          return;
        }
        const check = driverEligibilityEngine.evaluateEligibility(perfilMotorista);
        if (!check.isEligible) {
          const mensagensAmigaveis = check.blockers.map((b) => {
            const msg = b.includes(": ") ? b.split(": ").slice(1).join(": ") : b;
            return msg;
          });
          setErroElegibilidade(mensagensAmigaveis.join(" • "));
          return;
        }
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
      {/* 2. DRIVER HEADER MINIMALISTA & OPERACIONAL                        */}
      {/* ================================================================= */}
      <DriverHeader
        isOnline={isOnline}
        somAtivo={somAtivo}
        onToggleSom={toggleSom}
        onOpenMenu={() => setModalPerfilMotorista(true)}
        onOpenProfile={() => setModalPerfilMotorista(true)}
        driverAvatarUrl={perfilMotorista.fotoUrl}
        driverName={perfilMotorista.nome}
        onOpenNotifications={() => setModalNotificacoesAberto(true)}
        unreadCount={unreadNotificationsCount}
      />

      {/* Alerta de Moderação Documental Pendente / Rejeitada */}
      {driverApprovalStatus === "pendente" && (
        <div className="absolute top-[4.5rem] inset-x-3 z-40 max-w-lg mx-auto p-3.5 rounded-2xl bg-amber-500 text-slate-950 text-xs font-semibold shadow-2xl flex items-start gap-3 border border-amber-400 animate-in slide-in-from-top duration-200">
          <Clock className="w-5 h-5 text-slate-950 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-xs uppercase tracking-tight block">
                Cadastro em Análise pela Moderação
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-semibold uppercase shrink-0">
                Pendente
              </span>
            </div>
            <p className="text-[11px] text-slate-900 mt-1 leading-snug font-medium">
              Sua documentação (CNH com EAR e CRLV) está sob auditoria da equipe operacional. O botão <strong>ONLINE</strong> será liberado instantaneamente assim que for aprovado.
            </p>
          </div>
        </div>
      )}

      {driverApprovalStatus === "rejeitado" && (
        <div className="absolute top-[4.5rem] inset-x-3 z-40 max-w-lg mx-auto p-3.5 rounded-2xl bg-rose-600 text-white text-xs font-semibold shadow-2xl flex items-start gap-3 border border-rose-500 animate-in slide-in-from-top duration-200">
          <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-xs uppercase tracking-tight block">
                Cadastro Reprovado na Auditoria
              </span>
              <span className="text-[10px] bg-white text-rose-700 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                Reprovado
              </span>
            </div>
            <p className="text-[11px] text-rose-100 mt-1 leading-snug font-medium">
              Houve inconsistências na sua documentação. Por favor, contate o suporte operacional para regularização.
            </p>
          </div>
        </div>
      )}

      {/* Alerta de Suspensão por Inadimplência (Fase 19) */}
      {(subscription.status === "SUSPENDED" || subscription.status === "REACTIVATION_REQUIRED") && (
        <div className="absolute top-[4.5rem] inset-x-3 z-40 max-w-md mx-auto p-3.5 rounded-2xl bg-rose-600 text-white text-xs font-semibold shadow-2xl flex items-center justify-between animate-in slide-in-from-top duration-200">
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
        <div className="absolute top-[4.5rem] inset-x-3 z-40 max-w-md mx-auto p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold shadow-lg flex items-center justify-between animate-in slide-in-from-top duration-200">
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
      {/* 3. CONTEXTUAL BOTTOM SHEET (DIRIGIDO PELO ESTADO OPERACIONAL)     */}
      {/* ================================================================= */}
      <DriverContextualBottomSheet
        isOnline={isOnline}
        estadoCockpit={estadoCockpit}
        ganhosHoje={ganhosHoje}
        corridasFeitas={corridasFeitas}
        destinoAtivo={destinoAtivo}
        remainingDestinationUses={driverDestinationModeService.getRemainingUses(perfilMotorista.id)}
        ofertaAtiva={ofertaAtiva}
        waitingTimerStatus={waitingTimerStatus}
        driverUnreadCount={driverUnreadCount}
        emDevolucao={emDevolucao}
        returnDetails={returnDetails}
        currentStopNumber={currentStopNumber}
        erroPin={erroPin}
        onToggleOnline={handleToggleOnline}
        onOpenProfile={() => setModalPerfilMotorista(true)}
        onOpenWallet={handleAbrirModalSaquePix}
        onOpenSaquePix={handleAbrirModalSaquePix}
        onOpenModoDestino={() => setModalModoDestino(true)}
        onClearDestino={() => {
          driverDestinationModeService.clearDestination(perfilMotorista.id);
          setDestinoAtivo(null);
        }}
        onOpenTaximetro={() => setModalTaximetro(true)}
        onOpenEconomia={() => setModalEconomiaAberto(true)}
        onOpenPlanos={() => setModalPlanosAberto(true)}
        onChegueiAoLocal={handleChegueiAoLocal}
        onConfirmarEmbarque={handleConfirmarEmbarqueSmart}
        onOpenPinNumpad={() => {
          setPinNumpadMode("PICKUP");
          setModalPinNumpadAberto(true);
        }}
        onOpenPinNumpadDropoff={() => {
          setPinNumpadMode("DROPOFF");
          setModalPinNumpadAberto(true);
        }}
        onOpenNoShowModal={() => setModalNoShowConfirmAberto(true)}
        onOpenCancelar={() => setModalCancelarAberto(true)}
        onConcluirCorrida={handleConcluirCorrida}
        onOpenDevolucao={handleAbrirModalDevolucao}
        onOpenReturnFinalizar={() => setModalReturnFinalizarAberto(true)}
        onOpenChat={() => setIsChatOpen(true)}
        onLigar={() => {
          const tel = ofertaAtiva?.telefone?.replace(/\D/g, "") || "22999605162";
          window.open(`tel:${tel}`, "_self");
        }}
        onNavegar={handleNavegarExterno}
      />

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
        chavePixPadrao={perfilMotorista.cpf || perfilMotorista.chavePix}
        driverCpf={perfilMotorista.cpf}
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
      {/* MODAL OFICIAL: TAXÍMETRO VIRTUAL INTELIGENTE ("CORRIDA DE RUA")     */}
      {/* =================================================================== */}
      <VirtualTaximeterModal
        isOpen={modalTaximetro}
        onClose={() => setModalTaximetro(false)}
        driverId={perfilMotorista.id}
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
                    const rawEmv = `00020126580014BR.GOV.BCB.PIX0136partiu-financeiro-recuperacao-502@pix.partiu.app520400005303986540${(subscription.accumulatedDebtBrl || 49.9).toFixed(2)}5802BR5925PARTIU MOBILIDADE BRASIL6009SAO PAULO62070503***6304`;
                    void navigator.clipboard.writeText(`${rawEmv}${computePixCrc16(rawEmv)}`);
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-300 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-brand-primary-deep">Passageiro Não Compareceu</h3>
                  <p className="text-xs text-slate-500 font-medium">Cobrança de taxa de carência</p>
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

      {/* ========================================================================= */}
      {/* BOTÕES FLUTUANTES NO MAPA (RECENTRALIZAR À ESQUERDA & SOS À DIREITA)       */}
      {/* ========================================================================= */}
      {/* 1. Botão Recenter (Inferior Esquerdo, posicionado acima do Bottom Sheet) */}
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("partiu:recenter-map"));
        }}
        className="fixed left-4 bottom-56 sm:bottom-64 z-20 w-13 h-13 rounded-full bg-white shadow-xl border border-slate-100 flex items-center justify-center text-brand-primary-vibrant hover:bg-slate-50 active:scale-95 transition pointer-events-auto cursor-pointer"
        title="Centralizar Minha Posição"
        aria-label="Centralizar no Mapa"
      >
        <Compass className="w-6 h-6 stroke-[2.2]" />
      </button>

      {/* 2. Botão SOS Emergência 190 (Inferior Direito, posicionado acima do Bottom Sheet) */}
      <div className="fixed bottom-56 sm:bottom-64 right-4 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={() => setModalSosAberto(true)}
          aria-label="Botão de Emergência e SOS Policial 190"
          className="w-14 h-14 rounded-full bg-white hover:bg-rose-50 active:scale-95 text-brand-danger-red flex flex-col items-center justify-center shadow-xl border-2 border-brand-danger-red transition-all cursor-pointer animate-pulse"
          title="Central de Emergência SOS 190"
        >
          <SirenIcon className="w-5 h-5 text-brand-danger-red" />
          <span className="text-[9px] font-extrabold tracking-wider leading-none mt-0.5 text-brand-danger-red">SOS</span>
        </button>
      </div>

      {/* MODAL DE CONFIRMAÇÃO SOS 190 */}
      {modalSosAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-brand-danger-red rounded-3xl p-5 sm:p-6 max-w-sm w-full text-slate-900 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-brand-danger-red flex items-center justify-center border border-brand-danger-red/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-brand-primary-deep">Emergência &amp; SOS 190</h3>
                <p className="text-xs text-slate-500 font-medium">Acionamento Policial PARTIU</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-700">
              <p className="leading-relaxed">
                Você está prestes a acionar a <strong>Central de Emergência 190</strong>.
              </p>
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-danger-red animate-ping shrink-0" />
                <span>Telemetria GPS enviada aos canais de apoio</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setAcionandoSos(true);
                  try {
                    const pos = driverLocationService.getCurrentPosition();
                    let coords = pos ? `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` : "";
                    if (!coords && typeof navigator !== "undefined" && navigator.geolocation) {
                      coords = await new Promise<string>((resolve) => {
                        navigator.geolocation.getCurrentPosition(
                          (p) => resolve(`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`),
                          () => resolve(""),
                          { timeout: 1200, maximumAge: 10000 }
                        );
                      });
                    }

                    await registrarETransmitirAlertaSOS({
                      tipo: "seguranca",
                      solicitanteNome: perfilMotorista?.nome || "Motorista Parceiro PARTIU",
                      solicitanteTelefone: perfilMotorista?.telefone || "+5582999999999",
                      motoristaNome: perfilMotorista?.nome || "Motorista Parceiro",
                      veiculoPlaca: (perfilMotorista as any)?.placa || "PARTIU",
                      rodovia: corridaSincronizada?.destino?.endereco || "Perímetro Urbano",
                      coordenadas: coords || undefined,
                      descricao: `Emergência SOS 190 acionada pelo motorista em rota. Corrida: ${corridaSincronizada?.id || "N/A"}`,
                      corridaId: corridaSincronizada?.id,
                      usuarioId: perfilMotorista?.id,
                    });
                  } catch (e) {
                    console.error("Erro ao registrar telemetria SOS motorista:", e);
                  } finally {
                    window.location.href = "tel:190";
                    setAcionandoSos(false);
                    setModalSosAberto(false);
                  }
                }}
                disabled={acionandoSos}
                className="w-full h-12 rounded-2xl bg-brand-danger-red hover:bg-red-600 text-white font-semibold text-xs shadow-md shadow-red-600/20 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                <Phone className="w-4 h-4" />
                <span>{acionandoSos ? "TRANSMITINDO TELEMETRIA..." : "LIGAR PARA POLÍCIA MILITAR (190)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setModalSosAberto(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GESTÃO DE PERFIL E VEÍCULO DO MOTORISTA                            */}
      {/* ========================================================================= */}
      {modalPerfilMotorista && (
        <DriverProfileSettings
          isOpen={modalPerfilMotorista}
          onClose={() => setModalPerfilMotorista(false)}
          driverProfile={perfilMotorista}
          onSave={(updated) => {
            setPerfilMotorista(updated);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: CENTRAL DE NOTIFICAÇÕES OPERACIONAIS                               */}
      {/* ========================================================================= */}
      {modalNotificacoesAberto && (
        <NotificationCenterModal
          isOpen={modalNotificacoesAberto}
          onClose={() => setModalNotificacoesAberto(false)}
          userId={perfilMotorista.id}
          userRole="DRIVER"
        />
      )}
    </div>
  );
}
