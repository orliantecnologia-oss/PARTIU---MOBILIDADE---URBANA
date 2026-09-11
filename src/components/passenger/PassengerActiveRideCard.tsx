import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Bike,
  Car,
  Phone,
  MessageCircle,
  Share2,
  CheckCircle2,
  Navigation,
  ShieldCheck,
  RotateCcw,
  X,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { ChatBottomSheet } from "@/components/chat/ChatBottomSheet";
import { chatRealtimeService } from "@/services/ChatRealtimeService";
import { RideCancellationModal } from "@/components/modals/RideCancellationModal";
import { rideLiveTrackingService } from "@/lib/tracking/ride-live-tracking-service";

export function PassengerActiveRideCard() {
  const {
    state,
    activeRide,
    categoriaVeiculo,
    destino,
    etaCalculado,
    requestCancel,
    isCancelModalOpen,
    confirmCancel,
    dismissCancel,
    resetToIdle,
  } = usePassengerRide();

  const { corPrimaria, corTextoPrimaria } = useBrandTheme();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!activeRide?.id) {
      setUnreadCount(0);
      return;
    }
    setUnreadCount(chatRealtimeService.getUnreadCount(activeRide.id, "PASSENGER"));
    const cleanup = chatRealtimeService.subscribeToRideChat(
      activeRide.id,
      "PASSENGER",
      () => {
        setUnreadCount(chatRealtimeService.getUnreadCount(activeRide.id, "PASSENGER"));
      },
      (count) => {
        setUnreadCount(count);
      }
    );
    return cleanup;
  }, [activeRide?.id]);

  if (!activeRide) return null;

  const motorista = activeRide.motorista || {
    id: "mot-1",
    nome: categoriaVeiculo === "MOTO" ? "Lucas Fernandes" : "Carlos Eduardo Silva",
    foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    avaliacao: 4.97,
    totalViagens: 3840,
    veiculo: categoriaVeiculo === "MOTO" ? "Honda CG 160 Titan (Preta)" : "Chevrolet Onix Plus 2024 (Prata)",
    placa: categoriaVeiculo === "MOTO" ? "MOT-7799" : "MOB-8K99",
    telefone: "(22) 99876-5432",
  };

  const isEmViagem = state === "ON_TRIP" || activeRide.status === "EM_VIAGEM";
  const isConcluida = state === "COMPLETED" || activeRide.status === "CONCLUIDA";
  const isChegou = activeRide.status === "CHEGOU";

  return (
    <>
      <div
        data-hide-bottom-nav="true"
        className="w-full max-w-md mx-auto px-4 pb-5 z-20 animate-in slide-in-from-bottom duration-300 mt-auto"
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 text-left backdrop-blur-md">
          
          {/* Status Header & ETA Compacto Conectado ao Mapa (Estilo 99/Uber) */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="space-y-1 min-w-0">
              <span
                className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isChegou ? "text-emerald-700" : isConcluida ? "text-slate-700" : "text-amber-700"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isChegou
                      ? "bg-emerald-500 animate-ping"
                      : isConcluida
                      ? "bg-slate-400"
                      : "bg-emerald-500 animate-pulse"
                  }`}
                />
                {isConcluida
                  ? "Viagem Finalizada"
                  : isEmViagem
                  ? "Em Viagem"
                  : isChegou
                  ? "Motorista Chegou!"
                  : "Motorista a Caminho"}
              </span>

              <h3 className="text-sm font-black text-slate-900 leading-tight truncate">
                {isConcluida
                  ? "Você chegou ao seu destino!"
                  : isEmViagem
                  ? `Destino: ${destino || "Local selecionado"}`
                  : isChegou
                  ? `${motorista.nome.split(" ")[0]} está aguardando você`
                  : `${motorista.nome.split(" ")[0]} está a caminho`}
              </h3>

              {/* Badge Compacto de Estimativa Real Ligado à Posição do Veículo */}
              {!isConcluida && (
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-xs border ${
                    isChegou
                      ? "bg-emerald-50 text-emerald-950 border-emerald-200"
                      : "bg-primary-50 text-slate-800 border-amber-200/80"
                  }`}
                >
                  <Clock
                    className={`w-3 h-3 shrink-0 ${
                      isChegou ? "text-emerald-600" : "text-primary-700"
                    }`}
                  />
                  <span>
                    {isChegou
                      ? "No local de embarque • Dirija-se ao veículo"
                      : isEmViagem
                      ? `Desembarque às ${etaCalculado.horarioEstimadoChegada} (${etaCalculado.textoResumido})`
                      : `Chega às ${etaCalculado.horarioEstimadoChegada} (${etaCalculado.textoResumido})`}
                  </span>
                </div>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl block">
                R$ {activeRide.valor.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                {categoriaVeiculo === "MOTO" ? "Partiu Moto" : "Partiu Carro"}
              </span>
            </div>
          </div>

          {/* Dados do Condutor e Veículo (Exclusivamente Moto ou Carro) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={motorista.foto}
                  alt={motorista.nome}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm ring-1 ring-black/10"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary-600 text-slate-950 flex items-center justify-center text-[10px] font-bold shadow-xs">
                  {categoriaVeiculo === "MOTO" ? <Bike className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-black text-slate-900 leading-tight">
                    {motorista.nome}
                  </h4>
                  <span className="text-[10px] font-bold text-amber-700 bg-primary-50 px-1.5 py-0.2 rounded-md">
                    ★ {motorista.avaliacao.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  {motorista.veiculo}
                </p>
                <div className="mt-0.5">
                  <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-md ${
                    isChegou
                      ? "bg-primary-50 text-amber-950 ring-1 ring-amber-300 shadow-2xs"
                      : "text-slate-800 bg-slate-100"
                  }`}>
                    {motorista.placa}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (activeRide?.trackingToken) {
                    const msg = rideLiveTrackingService.buildShareMessage(
                      activeRide.trackingToken,
                      motorista.veiculo,
                      motorista.placa
                    );
                    if (typeof navigator !== "undefined" && navigator.share) {
                      navigator
                        .share({
                          title: "Siga Minha Viagem — PARTIU",
                          text: msg,
                          url: rideLiveTrackingService.buildShareUrl(activeRide.trackingToken),
                        })
                        .catch(() => {});
                      return;
                    }
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                  }
                }}
                className="w-10 h-10 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs border border-emerald-200"
                title="Compartilhar Trajeto (Siga Minha Viagem)"
                aria-label="Compartilhar Trajeto"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <a
                href={`tel:${motorista.telefone.replace(/\D/g, "")}`}
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
                aria-label="Ligar para o condutor"
              >
                <Phone className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="relative w-10 h-10 rounded-2xl bg-primary-600 hover:bg-amber-500 text-slate-950 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
                aria-label={`Abrir chat operacional${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
              >
                <MessageCircle className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-black border border-white shadow-xs animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Botões de Ação */}
          {isConcluida ? (
            <button
              type="button"
              onClick={resetToIdle}
              style={{
                backgroundColor: corPrimaria,
                color: corTextoPrimaria,
              }}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Pedir Nova Corrida</span>
            </button>
          ) : (
            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px] flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Viagem Monitorada
              </span>

              <button
                type="button"
                onClick={requestCancel}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Cancelar Corrida
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cancelamento de Viagem Inteligente com Motivos e Tolerância */}
      <RideCancellationModal
        open={isCancelModalOpen}
        onClose={dismissCancel}
        onConfirmCancel={(reason) => confirmCancel(reason)}
        acceptedAt={activeRide?.aceitoEm}
      />

      {/* CHAT OPERACIONAL EM TEMPO REAL COM O MOTORISTA */}
      {activeRide && (
        <ChatBottomSheet
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          rideId={activeRide.id}
          currentUserType="PASSENGER"
          currentUserId="passenger-current"
          partnerName={motorista.nome}
          partnerPhoto={motorista.foto}
          partnerVehicle={motorista.veiculo}
          partnerPlate={motorista.placa}
          partnerRoleLabel="Motorista Parceiro"
          rideStatus={activeRide.status}
        />
      )}
    </>
  );
}
