import React, { memo, useState, useEffect, useMemo, Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import {
  Phone,
  MessageCircle,
  X,
  Star,
  Clock,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Shield,
  WifiOff,
  ChevronUp,
  ChevronDown,
  Car,
  Bike,
} from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { ChatBottomSheet } from "@/components/chat";
import { chatRealtimeService } from "@/services/ChatRealtimeService";
import { cancellationPolicyService } from "@/services/CancellationPolicyService";
import { SafetyCenterModal } from "./SafetyCenterModal";
import { VehiclePerspectiveGraphic } from "./VehiclePerspectiveGraphic";
import { useBottomSheetGesture } from "@/hooks/useBottomSheetGesture";
import { hapticFeedback } from "@/lib/haptics/haptic-feedback";
import { DriverProfileSkeleton } from "@/components/ui/skeleton";

// Lazy-loaded para otimização de bundle e TTI de 60fps
const DriverProfileModal = lazy(() =>
  import("./DriverProfileModal").then((m) => ({ default: m.DriverProfileModal }))
);

/**
 * ==============================================================================
 * 🚗 PARTIU DRIVER EN ROUTE EXPERIENCE — UBER / 99 / LYFT GOLD STANDARD
 * ==============================================================================
 * Experiência instantânea "Motorista a Caminho" ativada imediatamente após aceite:
 * - O passageiro compreende em < 2 segundos:
 *   1. Quem aceitou a corrida (Foto, Nome, Nota, Avaliações)
 *   2. Qual veículo está vindo (Placa Mercosul Gigante + Modelo + Cor + Ícone)
 *   3. Quanto tempo falta (⚡ Chega em X min • Y km)
 *   4. Onde o motorista está (Live tracking integrado)
 *   5. Como entrar em contato (Chat com badge de não lidas + Ligação direta)
 *   6. Política de cancelamento inteligente (Tolerância dinâmica com carência)
 *   7. Central de Segurança (Compartilhar corrida, Polícia 190, Central 24h)
 * ==============================================================================
 */
export const DriverEnRouteSheet = memo(function DriverEnRouteSheet() {
  const {
    state,
    activeRide,
    categoriaVeiculo,
    destino,
    distanciaKm,
    etaCalculado,
    requestCancel,
    isCancelModalOpen,
    confirmCancel,
    dismissCancel,
    resetToIdle,
    progressiveSession,
    retrySearchAfterTimeout,
  } = usePassengerRide();

  // Estados dos Modais
  const [isTrustCenterOpen, setIsTrustCenterOpen] = useState(false);
  const [isSafetyCenterOpen, setIsSafetyCenterOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Hook Gestual com Física de Mola e Snap Points (COLLAPSED 36% / EXPANDED 60%)
  const { currentHeight, isDragging, handlers, activeSnapKey, snapTo } = useBottomSheetGesture({
    snapPoints: [
      { key: "COLLAPSED", height: 0.36 },
      { key: "EXPANDED", height: 0.60 },
    ],
    initialSnapKey: "COLLAPSED",
  });

  const isExpanded = activeSnapKey === "EXPANDED";

  const toggleExpanded = () => {
    hapticFeedback.selection();
    snapTo(isExpanded ? "COLLAPSED" : "EXPANDED");
  };

  // Feedback tátil comemorativo de motorista confirmado na montagem
  useEffect(() => {
    hapticFeedback.success();
  }, []);

  // Estados de Resiliência de Rede
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [driverSignalWarning, setDriverSignalWarning] = useState(false);

  // Monitoramento de conectividade de rede
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const currentRideId = activeRide?.id || progressiveSession?.rideId || "ride-ativa";

  // Monitora mensagens não lidas no chat em tempo real
  useEffect(() => {
    setUnreadCount(chatRealtimeService.getUnreadCount(currentRideId, "PASSENGER"));

    return chatRealtimeService.subscribeToRideChat(
      currentRideId,
      "PASSENGER",
      () => setUnreadCount(chatRealtimeService.getUnreadCount(currentRideId, "PASSENGER")),
      (count) => setUnreadCount(count)
    );
  }, [currentRideId]);

  // Monitora pulso de GPS do motorista para detectar perda de sinal (> 30s)
  useEffect(() => {
    let lastPulse = Date.now();
    const handleDriverLocation = () => {
      lastPulse = Date.now();
      setDriverSignalWarning(false);
    };

    window.addEventListener("partiu:driver_location_updated", handleDriverLocation);
    const checkInterval = setInterval(() => {
      if (Date.now() - lastPulse > 35000 && (state === "DRIVER_ASSIGNED" || state === "DRIVER_ARRIVING" || (state as string) === "ACCEPTED" || (state as string) === "DRIVER_EN_ROUTE")) {
        setDriverSignalWarning(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener("partiu:driver_location_updated", handleDriverLocation);
      clearInterval(checkInterval);
    };
  }, [state]);

  // Perfil unificado do condutor
  const trustProfile = progressiveSession?.trustProfile;
  const isMoto = categoriaVeiculo === "MOTO";

  const driverName =
    activeRide?.motorista?.nome ||
    trustProfile?.fullName ||
    (isMoto ? "Lucas Fernandes" : "Carlos Eduardo Silva");

  const firstName =
    driverName.split(" ")[0] ?? (isMoto ? "Lucas" : "Carlos");

  const avatarUrl =
    activeRide?.motorista?.foto ||
    trustProfile?.avatarUrl ||
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80";

  const rating =
    activeRide?.motorista?.avaliacao ||
    trustProfile?.rating ||
    4.98;

  const totalRides =
    activeRide?.motorista?.totalViagens ||
    trustProfile?.totalRides ||
    1284;

  const vehicleModel =
    trustProfile?.vehicleModel ||
    (isMoto ? "Honda CG 160 Titan" : "Chevrolet Onix Plus");

  const vehicleColor =
    trustProfile?.vehicleColor || (isMoto ? "Preta" : "Prata");

  const licensePlate = (
    activeRide?.motorista?.placa ||
    trustProfile?.licensePlate ||
    (isMoto ? "MOT7B99" : "ABC1D23")
  ).toUpperCase();

  const phone =
    activeRide?.motorista?.telefone ||
    trustProfile?.phone ||
    "(22) 99876-5432";

  // Estados de progresso da corrida
  const isEmViagem = state === "ON_TRIP" || state === "IN_PROGRESS" || activeRide?.status === "EM_VIAGEM";
  const isConcluida = state === "COMPLETED" || activeRide?.status === "CONCLUIDA";
  const isChegou = activeRide?.status === "CHEGOU" || (state as string) === "DRIVER_ARRIVED";
  const isDriverCancelled = activeRide?.status === "CANCELADA" && state !== "CANCELLED";

  // ETA e Distância dinâmicos
  const etaText =
    typeof etaCalculado === "string"
      ? etaCalculado
      : etaCalculado?.textoResumido || "3 min";

  const etaLabel = isConcluida
    ? "Concluída"
    : isEmViagem
    ? "Em viagem"
    : isChegou
    ? "No local"
    : etaText;

  const distanciaKmText = distanciaKm ? `${distanciaKm.toFixed(1).replace(".", ",")} km` : "0,7 km";

  const statusTitle = isConcluida
    ? "Viagem finalizada"
    : isEmViagem
    ? "Em viagem até o destino"
    : isChegou
    ? `${firstName} chegou ao local de embarque!`
    : `${firstName} está a caminho`;

  // Política dinâmica de cancelamento
  const acceptedAtTimestamp = activeRide?.criadoEm || progressiveSession?.startedAt || null;
  const cancellationPolicy = useMemo(() => {
    return cancellationPolicyService.evaluatePolicy(acceptedAtTimestamp);
  }, [acceptedAtTimestamp]);

  const cancellationNotice = useMemo(() => {
    return cancellationPolicyService.getCancellationNoticeText(cancellationPolicy);
  }, [cancellationPolicy]);

  // Se o motorista cancelou a corrida, exibe sheet de recuperação rápida
  if (isDriverCancelled) {
    return (
      <div
        data-hide-bottom-nav="true"
        className="w-full max-w-md mx-auto px-3 pb-3 z-30 animate-in slide-in-from-bottom-4 duration-300 mt-auto select-none"
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 p-5 space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-100">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              O motorista precisou cancelar
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Imprevistos acontecem. Deseja que a PARTIU localize outro motorista parceiro imediatamente sem custo adicional?
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={retrySearchAfterTimeout}
              className="w-full h-12 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all touch-manipulation cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Procurar Outro Motorista</span>
            </button>

            <button
              type="button"
              onClick={resetToIdle}
              className="w-full h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all touch-manipulation"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. BOTTOM SHEET DO MOTORISTA A CAMINHO (~320px / SNAP POINTS 30% - 45%)   */}
      {/* ========================================================================= */}
      <div
        data-hide-bottom-nav="true"
        className="w-full max-w-md mx-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,12px))] z-30 animate-in slide-in-from-bottom-4 duration-300 mt-auto select-none"
      >
        <div
          role="region"
          aria-label="Informações do motorista a caminho"
          style={{
            height: currentHeight > 0 ? `${currentHeight}px` : undefined,
            transition: isDragging
              ? "none"
              : "height 260ms cubic-bezier(0.32, 0.72, 0, 1)",
            willChange: isDragging ? "height" : "auto",
          }}
          className={`bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/90 p-4 flex flex-col justify-between overflow-hidden select-none ${
            isExpanded ? "space-y-3.5" : "space-y-2.5"
          }`}
        >
          {/* DRAG HANDLE GESTUAL COM SPRING */}
          <div
            {...handlers}
            onClick={toggleExpanded}
            className="w-full flex flex-col items-center justify-center pt-0.5 pb-2 cursor-grab active:cursor-grabbing touch-none select-none group shrink-0"
            aria-label={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
          >
            <div
              className={`h-1.5 rounded-full transition-all duration-200 ${
                isDragging ? "bg-emerald-500 w-12" : "bg-slate-300 w-10 group-hover:bg-slate-400"
              }`}
            />
          </div>

          {/* BANNER DE OFFLINE OU SINAL INSTÁVEL (RESILIÊNCIA DE REDE) */}
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold animate-pulse">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span className="truncate">Sem conexão de internet. Reconectando...</span>
            </div>
          )}

          {driverSignalWarning && isOnline && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Sinal de GPS do motorista oscilando...</span>
            </div>
          )}

          {/* CABEÇALHO COM ETA E STATUS DE CHEGADA (< 2s RECOGNITION) */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-slate-900 truncate">
                  {statusTitle}
                </h3>
                <p className="text-[13px] font-black text-emerald-600 flex items-center gap-1">
                  <span>⚡</span>
                  <span>Chega em {etaLabel}</span>
                  <span className="text-slate-400 font-normal">•</span>
                  <span className="text-slate-500 font-bold">{distanciaKmText}</span>
                </p>
              </div>
            </div>

            {/* BOTÃO EXPANDIR/RECOLHER */}
            <button
              type="button"
              onClick={toggleExpanded}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 transition-all touch-manipulation cursor-pointer"
              aria-label={isExpanded ? "Recolher painel" : "Expandir painel"}
            >
              {isExpanded ? <ChevronDown className="w-5 h-5 stroke-[2.2]" /> : <ChevronUp className="w-5 h-5 stroke-[2.2]" />}
            </button>
          </div>

          {/* CARD HERO DO VEÍCULO: PADRÃO UBER / 99 COM RENDER 3D REALISTA */}
          <div className="flex items-center justify-between gap-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 shadow-2xs">
            {/* Bloco de Identificação do Veículo */}
            <div className="min-w-0 flex-1 space-y-1">
              {/* Badge Categoria */}
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-900 text-xs font-black uppercase tracking-wider">
                {isMoto ? "Moto" : "Carro"}
              </div>

              {/* Placa em Grande Destaque */}
              <div className="font-mono font-black text-2xl sm:text-3xl text-slate-950 tracking-wider leading-none">
                {licensePlate}
              </div>

              {/* Modelo e Cor do Veículo */}
              <p className="text-xs font-bold text-slate-700 truncate">
                {vehicleModel} • {vehicleColor}
              </p>
            </div>

            {/* Ilustração / Render 3D do Veículo */}
            <div className="shrink-0 flex items-center justify-center">
              <VehiclePerspectiveGraphic
                category={isMoto ? "MOTO" : "CARRO"}
                className="w-24 h-16 object-contain drop-shadow-sm"
              />
            </div>
          </div>

          {/* AVISO CONTEXTUAL DA POLÍTICA DE CANCELAMENTO DINÂMICA */}
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
              cancellationPolicy.isGracePeriodActive
                ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                : "bg-amber-50 text-amber-950 border-amber-300"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Clock className="w-3.5 h-3.5 shrink-0 text-current" />
              <span className="truncate">{cancellationNotice}</span>
            </div>
            {cancellationPolicy.isGracePeriodActive && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase">
                Grátis
              </span>
            )}
          </div>

          {/* CARD DO MOTORISTA CLICÁVEL (ABRE LAZY DRIVER TRUST CENTER) */}
          <button
            type="button"
            onClick={() => {
              hapticFeedback.light();
              setIsTrustCenterOpen(true);
            }}
            aria-label="Ver perfil completo e credenciais de segurança do motorista"
            className="w-full text-left p-2 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] transition-all border border-slate-200/70 flex items-center justify-between gap-3 group touch-manipulation cursor-pointer"
          >
            {/* Foto com Selo Verificado */}
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt={driverName}
                className="w-11 h-11 rounded-2xl object-cover border-2 border-amber-400 shadow-xs"
              />
              <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full border border-white">
                <ShieldCheck className="w-2.5 h-2.5" />
              </span>
            </div>

            {/* Nome, Rating e Corridas */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                  {driverName}
                </h4>
                <span className="text-xs font-bold text-amber-950 bg-amber-400/30 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  {Number(rating).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold truncate mt-0.5 flex items-center gap-1">
                <span>{totalRides}+ viagens</span>
                <span>•</span>
                <span className="text-amber-700 font-bold">Ver perfil e avaliações</span>
              </p>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
          </button>

          {/* BOTÕES DE AÇÃO RÁPIDA (TOUCH TARGETS MÍNIMOS DE 48PX - WCAG AA) */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Botão Central de Segurança */}
            <button
              type="button"
              onClick={() => {
                hapticFeedback.light();
                setIsSafetyCenterOpen(true);
              }}
              aria-label="Abrir Central de Segurança PARTIU"
              className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center border border-slate-200 active:scale-95 transition-all touch-manipulation cursor-pointer shrink-0"
              title="Central de Segurança"
            >
              <Shield className="w-5 h-5 text-emerald-600" />
            </button>

            {/* Botão Ligar */}
            <a
              href={`tel:${phone.replace(/\D/g, "")}`}
              onClick={() => hapticFeedback.light()}
              aria-label="Ligar para o motorista parceiro"
              className="flex-1 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 active:scale-95 transition-all touch-manipulation"
            >
              <Phone className="w-4 h-4 text-slate-700" />
              <span>Ligar</span>
            </a>

            {/* Botão Mensagem (Chat Nativo em Tempo Real com Badge) */}
            <button
              type="button"
              onClick={() => {
                hapticFeedback.light();
                setIsChatOpen(true);
              }}
              aria-label={`Abrir chat com o motorista${unreadCount > 0 ? ` (${unreadCount} mensagens não lidas)` : ""}`}
              className="relative flex-1 h-12 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all touch-manipulation cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-slate-950" />
              <span>Mensagem</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[10px] shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Botão Cancelar (Com validação de taxa e tolerância) */}
            {!isConcluida && (
              <button
                type="button"
                onClick={() => {
                  hapticFeedback.warning();
                  requestCancel();
                }}
                aria-label="Cancelar corrida"
                className="w-12 h-12 shrink-0 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200 active:scale-95 transition-all touch-manipulation cursor-pointer"
                title="Cancelar corrida"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Botão Nova Corrida (Se concluída) */}
            {isConcluida && (
              <button
                type="button"
                onClick={resetToIdle}
                className="flex-1 h-12 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all touch-manipulation cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Nova Corrida</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CHAT BOTTOM SHEET NATIVO (EFÊMERO & SEGURO LGPD)                       */}
      {/* ========================================================================= */}
      <ChatBottomSheet
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        rideId={currentRideId}
        currentUserType="PASSENGER"
        currentUserId={activeRide?.passageiroTelefone || "passageiro_app"}
        partnerName={driverName}
        partnerPhoto={avatarUrl}
        partnerVehicle={`${vehicleModel} • ${licensePlate}`}
        partnerPlate={licensePlate}
        partnerRoleLabel="Motorista Parceiro"
        rideStatus={state}
      />

      {/* ========================================================================= */}
      {/* 3. DRIVER TRUST CENTER MODAL (LAZY-LOADED SOB DEMANDA)                    */}
      {/* ========================================================================= */}
      <Suspense fallback={null}>
        {isTrustCenterOpen && (
          <DriverProfileModal
            isOpen={isTrustCenterOpen}
            onClose={() => setIsTrustCenterOpen(false)}
            profile={trustProfile}
          />
        )}
      </Suspense>

      {/* ========================================================================= */}
      {/* 4. CENTRAL DE SEGURANÇA PARTIU (COMPARTILHAR CORRIDA, POLÍCIA 190)         */}
      {/* ========================================================================= */}
      <SafetyCenterModal
        isOpen={isSafetyCenterOpen}
        onClose={() => setIsSafetyCenterOpen(false)}
        driverName={driverName}
        driverPlate={licensePlate}
        destination={destino || "Destino informado"}
        rideId={currentRideId}
      />

      {/* ========================================================================= */}
      {/* 5. MODAL DE CANCELAMENTO INTELIGENTE (PORTAL LIVRE DE STACKING TRAP)       */}
      {/* ========================================================================= */}
      {isCancelModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="alertdialog"
            aria-modal="true"
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 pointer-events-auto"
          >
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-center space-y-3.5 animate-in zoom-in-95 duration-200 pointer-events-auto">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                  cancellationPolicy.shouldChargeFee
                    ? "bg-rose-100 text-rose-600"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-base font-black text-slate-900">
                  {cancellationPolicy.shouldChargeFee
                    ? "Taxa de Cancelamento Aplicável"
                    : "Deseja cancelar esta corrida?"}
                </h4>

                <p className="text-xs text-slate-600 mt-1">
                  {cancellationPolicy.shouldChargeFee ? (
                    <span>
                      A tolerância de cancelamento gratuito expirou às{" "}
                      <strong>
                        {cancellationPolicyService.formatFreeUntilTime(
                          cancellationPolicy.freeCancellationUntil
                        )}
                      </strong>
                      . Uma taxa de{" "}
                      <strong className="text-rose-600">
                        {cancellationPolicy.cancellationFee.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </strong>{" "}
                      será cobrada para compensar o deslocamento de {firstName}.
                    </span>
                  ) : (
                    <span>
                      O condutor {firstName} já foi alocado e está a caminho do ponto de embarque.
                      Você ainda está no período de carência (cancelamento gratuito).
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={dismissCancel}
                  className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition-colors touch-manipulation cursor-pointer"
                >
                  Manter Corrida
                </button>

                <button
                  type="button"
                  onClick={confirmCancel}
                  className={`flex-1 h-12 rounded-2xl text-white font-black text-xs transition-colors shadow-md touch-manipulation cursor-pointer ${
                    cancellationPolicy.shouldChargeFee
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {cancellationPolicy.shouldChargeFee ? "Confirmar e Pagar" : "Sim, Cancelar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
});
