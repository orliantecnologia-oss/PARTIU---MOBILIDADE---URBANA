import React, { memo, useState, useEffect, useMemo, Suspense, lazy } from "react";
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
  Share2,
  Lock,
  MapPin,
  Check,
  ArrowRight,
} from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { ChatBottomSheet } from "@/components/chat";
import { chatRealtimeService } from "@/services/ChatRealtimeService";
import { cancellationPolicyService } from "@/services/CancellationPolicyService";
import { SafetyCenterModal } from "./SafetyCenterModal";
import { VehiclePerspectiveGraphic } from "./VehiclePerspectiveGraphic";
import { hapticFeedback } from "@/lib/haptics/haptic-feedback";
import { RideCancellationModal } from "@/components/modals/RideCancellationModal";

// Lazy-loaded para otimização de bundle e TTI de 60fps
const DriverProfileModal = lazy(() =>
  import("./DriverProfileModal").then((m) => ({ default: m.DriverProfileModal }))
);

/**
 * Ícone estilizado de sirene de emergência SOS
 */
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

/**
 * Ícone diamante do PIX D+0 em verde esmeralda (#10B981)
 */
function PixDiamondIcon({ className = "w-6 h-6 text-brand-status-green" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.9 7.1a2 2 0 0 0-2.8 0l-2.1 2.1-2.1-2.1a2 2 0 0 0-2.8 2.8l2.1 2.1-2.1 2.1a2 2 0 0 0 2.8 2.8l2.1-2.1 2.1 2.1a2 2 0 0 0 2.8-2.8l-2.1-2.1 2.1-2.1a2 2 0 0 0 0-2.8z" />
    </svg>
  );
}

/**
 * ==============================================================================
 * 🚗 PARTIU DRIVER EN ROUTE EXPERIENCE — UBER / 99 / LYFT GOLD STANDARD
 * ==============================================================================
 * Alinhado 100% com o padrão visual "Azul Tech Light" dos mockups oficiais:
 * - 6.png: Motorista a Caminho (Top Card + PIN de 4 dígitos + PIX + SOS)
 * - 7.png: Em Viagem (Top Card Trajeto + Partiu Pop R$ 24,90 + Compartilhar + SOS)
 * - 8.png: Viagem Concluída (Avaliação 5 estrelas + Gorjeta R$ 2/5/10 + Concluir)
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
    formaPagamento,
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

  // Estados de avaliação pós-viagem (8.png)
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);

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
      if (
        Date.now() - lastPulse > 35000 &&
        (state === "DRIVER_ASSIGNED" ||
          state === "DRIVER_ARRIVING" ||
          (state as string) === "ACCEPTED" ||
          (state as string) === "DRIVER_EN_ROUTE")
      ) {
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
    (isMoto ? "Lucas Silva" : "Carlos Silva");

  const firstName = driverName.split(" ")[0] ?? (isMoto ? "Lucas" : "Carlos");

  const avatarUrl =
    activeRide?.motorista?.foto ||
    trustProfile?.avatarUrl ||
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80";

  const rating =
    activeRide?.motorista?.avaliacao ||
    trustProfile?.rating ||
    4.98;

  const vehicleModel =
    trustProfile?.vehicleModel ||
    (isMoto ? "Honda CG 160 Titan" : "Chevrolet Onix");

  const vehicleColor =
    trustProfile?.vehicleColor || (isMoto ? "Azul" : "Prata");

  const licensePlate = (
    activeRide?.motorista?.placa ||
    trustProfile?.licensePlate ||
    (isMoto ? "ABC-1234" : "ABC-1234")
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

  const distanciaKmText = distanciaKm ? `${distanciaKm.toFixed(1).replace(".", ",")} km` : "4.2 km";
  const valorCorridaFormatado = (activeRide?.valor || 24.9).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // PIN de 4 dígitos (padrão 6.png: 4 8 2 1)
  const pinDigits = useMemo(() => {
    const rawPin = String(activeRide?.pin || (activeRide as any)?.codigoConfirmacao || "4821");
    return (rawPin.slice(0, 4).padEnd(4, "0")).split("");
  }, [activeRide?.pin]);

  // Política dinâmica de cancelamento
  const acceptedAtTimestamp = activeRide?.criadoEm || progressiveSession?.startedAt || null;
  const cancellationPolicy = useMemo(() => {
    return cancellationPolicyService.evaluatePolicy(acceptedAtTimestamp);
  }, [acceptedAtTimestamp]);

  const cancellationNotice = useMemo(() => {
    return cancellationPolicyService.getCancellationNoticeText(cancellationPolicy);
  }, [cancellationPolicy]);

  // Handler de conclusão da avaliação (8.png)
  const handleConcluirAvaliacao = () => {
    hapticFeedback.success();
    resetToIdle();
  };

  // Se o motorista cancelou a corrida, exibe card de recuperação rápida
  if (isDriverCancelled) {
    return (
      <div
        data-hide-bottom-nav="true"
        className="w-full max-w-md mx-auto px-4 pb-6 z-30 animate-in slide-in-from-bottom-4 duration-300 mt-auto select-none"
      >
        <div className="bg-white rounded-[32px] shadow-2xl border border-rose-200 p-6 space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-100">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-brand-primary-deep">
              O motorista precisou cancelar
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Imprevistos acontecem. Deseja que a PARTIU localize outro motorista parceiro imediatamente sem custo adicional?
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={retrySearchAfterTimeout}
              className="w-full h-14 rounded-full bg-gradient-to-r from-brand-primary-vibrant to-brand-primary-deep text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all touch-manipulation cursor-pointer hover:brightness-105"
            >
              <RotateCcw className="w-4 h-4 text-white" />
              <span>Procurar Outro Motorista</span>
            </button>

            <button
              type="button"
              onClick={resetToIdle}
              className="w-full h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all touch-manipulation cursor-pointer"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TELA 8.PNG: VIAGEM CONCLUÍDA & AVALIAÇÃO COM GORJETA
  // =========================================================================
  if (isConcluida) {
    return (
      <>
        <div
          data-hide-bottom-nav="true"
          className="fixed inset-x-0 bottom-0 top-14 z-30 overflow-y-auto bg-white/95 backdrop-blur-md px-4 py-6 animate-in slide-in-from-bottom duration-300 select-none flex flex-col justify-between max-w-md mx-auto"
        >
          <div className="space-y-5 text-center">
            {/* Ícone de Sucesso com Raios Verdes (8.png) */}
            <div className="relative inline-flex items-center justify-center mx-auto mt-2">
              <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-brand-primary-deep">Viagem concluída!</h2>
              <p className="text-sm text-slate-500 mt-1">Obrigado por viajar com a gente!</p>
            </div>

            {/* Card Detalhes da Rota & Valor (8.png) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-primary-vibrant shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 font-medium uppercase block">Origem</span>
                      <span className="text-xs font-semibold text-slate-800 truncate block">Centro, Itaperuna - RJ</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-brand-primary-vibrant shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 font-medium uppercase block">Destino</span>
                      <span className="text-xs font-semibold text-slate-800 truncate block">{destino || "Hospital São José"}</span>
                    </div>
                  </div>
                </div>

                <div className="border-l border-slate-100 pl-4 text-right shrink-0">
                  <span className="text-[11px] text-slate-500 font-medium block">Valor da corrida</span>
                  <div className="text-2xl font-bold text-brand-primary-deep leading-tight">
                    {valorCorridaFormatado}
                  </div>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                    <PixDiamondIcon className="w-3 h-3" />
                    <span>Pago via PIX D+0</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Card do Motorista (8.png) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={avatarUrl}
                  alt={driverName}
                  className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-slate-100 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-brand-primary-deep truncate">{driverName}</h4>
                  <div className="flex items-center gap-1 text-xs text-slate-700 font-semibold mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span>{Number(rating).toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                    {vehicleModel} {vehicleColor} • {licensePlate}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <VehiclePerspectiveGraphic
                  category={isMoto ? "MOTO" : "POP"}
                  className="w-20 h-12 object-contain"
                />
              </div>
            </div>

            {/* Seletor de Avaliação 5 Estrelas (8.png) */}
            <div className="space-y-2 pt-1">
              <h3 className="text-base font-bold text-brand-primary-deep">Como foi sua experiência?</h3>
              <p className="text-xs text-slate-500">Sua avaliação ajuda a melhorar o nosso serviço.</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      hapticFeedback.light();
                      setSelectedRating(star);
                    }}
                    className="p-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-9 h-9 ${
                        star <= selectedRating
                          ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                          : "fill-slate-100 text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Sugestão de Gorjeta Opcional (8.png) */}
            <div className="bg-brand-soft rounded-2xl p-4 border border-brand-border-active text-left space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-primary-vibrant text-white flex items-center justify-center font-bold text-xs shrink-0">
                  $
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-primary-deep">Gostaria de dar uma gorjeta?</h4>
                  <p className="text-[11px] text-slate-500">É opcional, mas faz toda a diferença!</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[2, 5, 10].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      hapticFeedback.light();
                      setSelectedTip(selectedTip === val ? null : val);
                    }}
                    className={`h-11 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      selectedTip === val
                        ? "bg-brand-primary-vibrant text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                    }`}
                  >
                    R$ {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Botão de Finalização (8.png) */}
          <div className="pt-5 space-y-3">
            <button
              type="button"
              onClick={handleConcluirAvaliacao}
              className="w-full h-14 rounded-full bg-gradient-to-r from-brand-primary-vibrant to-brand-primary-deep text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all touch-manipulation cursor-pointer hover:brightness-105"
            >
              <span>Concluir Avaliação</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={resetToIdle}
              className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors py-1 cursor-pointer"
            >
              Voltar para o início
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* TOP FLOATING CARD: DINÂMICO CONFORME MOCKUPS 6.PNG E 7.PNG               */}
      {/* ========================================================================= */}
      <div className="fixed top-16 inset-x-3 z-30 max-w-md mx-auto pointer-events-auto animate-in slide-in-from-top duration-300 select-none">
        {/* Banner de conexão instável se offline */}
        {!isOnline && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold animate-pulse shadow-md">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span className="truncate">Sem conexão de internet. Reconectando...</span>
          </div>
        )}

        {driverSignalWarning && isOnline && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Sinal de GPS do motorista oscilando...</span>
          </div>
        )}

        {/* MOCKUP 7.PNG: EM VIAGEM (TOP CARD COM DESTINO E TEMPO RESTANTE) */}
        {isEmViagem ? (
          <div className="bg-white rounded-2xl p-3.5 shadow-lg border border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-brand-primary-vibrant text-white flex items-center justify-center shrink-0 shadow-sm">
                <MapPin className="w-5 h-5 fill-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-brand-primary-deep leading-tight">
                  Chegada em {etaLabel}
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {distanciaKmText} restantes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 border-l border-slate-100 pl-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-medium uppercase block">Status</span>
                <span className="text-xs font-semibold text-brand-primary-deep block">Em andamento</span>
              </div>
            </div>
          </div>
        ) : (
          /* MOCKUP 6.PNG: MOTORISTA A CAMINHO (TOP CARD DO MOTORISTA + VEÍCULO + ETA) */
          <div className="bg-white rounded-2xl p-3 shadow-lg border border-slate-100 flex items-center justify-between gap-2.5">
            {/* Foto e Dados do Motorista */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={avatarUrl}
                  alt={driverName}
                  className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-xs"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-bold text-brand-primary-deep truncate">{driverName}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-700 font-semibold mt-0.2">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  <span>{Number(rating).toFixed(2)}</span>
                </div>
                <p className="text-[10.5px] font-medium text-slate-500 truncate mt-0.2">
                  {vehicleModel} {vehicleColor} • {licensePlate}
                </p>
              </div>
            </div>

            {/* Imagem do Veículo e Bloco ETA (6.png) */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden xs:block">
                <VehiclePerspectiveGraphic
                  category={isMoto ? "MOTO" : "POP"}
                  className="w-16 h-10 object-contain"
                />
              </div>

              <div className="border-l border-slate-100 pl-2 text-right">
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-medium">
                  <Clock className="w-3 h-3 text-brand-primary-vibrant" />
                  <span>Chegando em</span>
                </div>
                <div className="text-base font-extrabold text-brand-primary-deep leading-tight">
                  {etaLabel}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET: MOCKUP 6.PNG (A CAMINHO) OU MOCKUP 7.PNG (EM VIAGEM)         */}
      {/* ========================================================================= */}
      <div
        data-hide-bottom-nav="true"
        className="w-full max-w-md mx-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,12px))] z-30 animate-in slide-in-from-bottom-4 duration-300 mt-auto select-none pointer-events-auto"
      >
        <div className="bg-white rounded-t-[32px] rounded-b-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4">
          {/* Drag Handle Centralizado */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />

          {/* =================================================================== */}
          {/* CASO 1: EM VIAGEM (7.PNG)                                           */}
          {/* =================================================================== */}
          {isEmViagem ? (
            <div className="space-y-4">
              {/* Card do Motorista (7.png) */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={avatarUrl}
                    alt={driverName}
                    className="w-12 h-12 rounded-full object-cover shadow-sm ring-1 ring-slate-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-brand-primary-deep truncate">{driverName}</h4>
                    <div className="flex items-center gap-1 text-xs text-slate-700 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                      <span>{Number(rating).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {vehicleModel} {vehicleColor} • {licensePlate}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <VehiclePerspectiveGraphic
                    category={isMoto ? "MOTO" : "POP"}
                    className="w-20 h-12 object-contain"
                  />
                </div>
              </div>

              {/* Card Categoria & Preço Estimado (7.png) */}
              <div className="bg-brand-soft rounded-2xl p-4 border border-brand-border-active flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary-vibrant text-white flex items-center justify-center shrink-0">
                    <span className="text-lg">🚗</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-brand-primary-deep">Partiu Pop</h4>
                    <p className="text-xs text-slate-500">Viagem econômica</p>
                  </div>
                </div>

                <div className="border-l border-brand-border-active pl-4 text-right">
                  <span className="text-[10px] text-slate-400 font-medium uppercase block">Valor estimado</span>
                  <div className="text-xl font-bold text-brand-primary-deep leading-tight">
                    {valorCorridaFormatado}
                  </div>
                </div>
              </div>

              {/* Linha de Destino e Chegada (7.png) */}
              <div className="flex items-center justify-between py-2 border-y border-slate-100 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-500 block text-[10px]">Chegada em</span>
                    <span className="font-semibold text-slate-800">{distanciaKmText} restantes</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 min-w-0 pl-3 border-l border-slate-100">
                  <MapPin className="w-4 h-4 text-brand-primary-vibrant shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-500 block text-[10px]">Destino</span>
                    <span className="font-semibold text-slate-800 truncate block">{destino || "Hospital São José"}</span>
                  </div>
                </div>
              </div>

              {/* Botões Duplos de Ação (7.png) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Compartilhar Trajeto */}
                <button
                  type="button"
                  onClick={() => {
                    hapticFeedback.light();
                    const shareText = `Estou a caminho no PARTIU com ${driverName} (${licensePlate}).`;
                    if (typeof navigator !== "undefined" && navigator.share) {
                      navigator
                        .share({
                          title: "Acompanhe minha rota PARTIU",
                          text: shareText,
                          url: window.location.href,
                        })
                        .catch(() => {});
                    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
                    }
                  }}
                  className="h-14 rounded-full border-2 border-brand-primary-vibrant text-brand-primary-vibrant hover:bg-blue-50 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartilhar trajeto</span>
                </button>

                {/* SOS Central de Segurança */}
                <button
                  type="button"
                  onClick={() => {
                    hapticFeedback.warning();
                    setIsSafetyCenterOpen(true);
                  }}
                  className="h-14 rounded-full border-2 border-brand-danger-red text-brand-danger-red hover:bg-rose-50 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <SirenIcon className="w-4 h-4 text-brand-danger-red" />
                  <span>SOS Central</span>
                </button>
              </div>
            </div>
          ) : (
            /* =================================================================== */
            /* CASO 2: MOTORISTA A CAMINHO (6.PNG)                                 */
            /* =================================================================== */
            <div className="space-y-4">
              {/* Header do PIN de Segurança (6.png) */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary-vibrant text-white flex items-center justify-center shadow-md shadow-brand-primary-vibrant/20 shrink-0">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-primary-deep leading-tight">
                    Seu PIN de segurança
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                    Informe este código ao motorista
                  </p>
                </div>
              </div>

              {/* 4 Caixas Grandes de PIN (6.png: 4 8 2 1) */}
              <div className="grid grid-cols-4 gap-3">
                {pinDigits.map((digit, idx) => (
                  <div
                    key={idx}
                    className="h-16 rounded-2xl bg-brand-surface-highlight border border-brand-border-active flex items-center justify-center text-3xl font-extrabold text-brand-primary-deep shadow-xs"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              {/* Linha de Forma de Pagamento PIX D+0 (6.png) */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <PixDiamondIcon className="w-7 h-7 text-brand-status-green" />
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                       Forma de pagamento
                    </span>
                    <span className="text-sm font-bold text-brand-primary-deep block">
                      {formaPagamento === "dinheiro" ? "Dinheiro" : "PIX D+0"}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>

              {/* Botão de Emergência Central de Segurança / SOS (6.png) */}
              <button
                type="button"
                onClick={() => {
                  hapticFeedback.warning();
                  setIsSafetyCenterOpen(true);
                }}
                className="w-full h-14 rounded-full border-2 border-brand-danger-red text-brand-danger-red hover:bg-rose-50 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <SirenIcon className="w-5 h-5 text-brand-danger-red" />
                <span>Central de Segurança / SOS</span>
              </button>

              {/* Barra de Ações Rápidas do Passageiro (Ligar, Chat, Cancelar) */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                {/* Ligar */}
                <a
                  href={`tel:${phone.replace(/\D/g, "")}`}
                  onClick={() => hapticFeedback.light()}
                  className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span>Ligar</span>
                </a>

                {/* Mensagem / Chat */}
                <button
                  type="button"
                  onClick={() => {
                    hapticFeedback.light();
                    setIsChatOpen(true);
                  }}
                  className="flex-1 h-11 rounded-xl bg-brand-primary-vibrant hover:brightness-105 text-white font-semibold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition relative cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                  <span>Mensagem</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-bold text-[10px] animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Compartilhar */}
                <button
                  type="button"
                  onClick={() => {
                    hapticFeedback.light();
                    const shareText = `Estou a caminho no PARTIU com ${driverName} (${licensePlate}). PIN: ${pinDigits.join("")}`;
                    if (typeof navigator !== "undefined" && navigator.share) {
                      navigator
                        .share({
                          title: "Minha viagem PARTIU",
                          text: shareText,
                          url: window.location.href,
                        })
                        .catch(() => {});
                    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
                    }
                  }}
                  className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0"
                  title="Compartilhar"
                >
                  <Share2 className="w-4 h-4 text-slate-600" />
                </button>

                {/* Cancelar */}
                <button
                  type="button"
                  onClick={() => {
                    hapticFeedback.warning();
                    requestCancel();
                  }}
                  className="w-11 h-11 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0"
                  title="Cancelar corrida"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Informação sobre cancelamento gratuito */}
              {cancellationPolicy.isGracePeriodActive && (
                <p className="text-[11px] text-slate-400 text-center font-medium">
                  {cancellationNotice} • <span className="text-emerald-600 font-bold">Grátis</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAIS: CHAT, TRUST CENTER, SEGURANÇA E CANCELAMENTO                     */}
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

      <Suspense fallback={null}>
        {isTrustCenterOpen && (
          <DriverProfileModal
            isOpen={isTrustCenterOpen}
            onClose={() => setIsTrustCenterOpen(false)}
            profile={trustProfile}
          />
        )}
      </Suspense>

      <SafetyCenterModal
        isOpen={isSafetyCenterOpen}
        onClose={() => setIsSafetyCenterOpen(false)}
        driverName={driverName}
        driverPlate={licensePlate}
        destination={destino || "Destino informado"}
        rideId={currentRideId}
      />

      <RideCancellationModal
        open={isCancelModalOpen}
        onClose={dismissCancel}
        onConfirmCancel={(reason) => confirmCancel(reason)}
        acceptedAt={acceptedAtTimestamp}
      />
    </>
  );
});
