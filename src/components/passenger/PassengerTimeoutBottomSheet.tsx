import React, { useEffect } from "react";
import {
  RotateCcw,
  X,
  Clock,
  Car,
  MapPin,
  Sparkles,
  Zap,
  Radio,
  ArrowRight,
} from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { hapticFeedback } from "@/lib/haptics/haptic-feedback";

/**
 * ==============================================================================
 * ⏱️ PARTIU TIMEOUT BOTTOM SHEET — UBER/99 PREMIUM EXPERIENCE
 * ==============================================================================
 * Tela de encerramento temporário de busca com ilustração vetorial amigável,
 * botão primário de reinício (Tentar Novamente), botão secundário de cancelamento
 * e banner dinâmico de Fast Recovery se um motorista entrar online durante o timeout.
 * ==============================================================================
 */
export function PassengerTimeoutBottomSheet() {
  const {
    origem,
    destino,
    cotacoes,
    categoriaVeiculo,
    progressiveSession,
    retrySearchAfterTimeout,
    cancelRideAfterTimeout,
  } = usePassengerRide();

  // Vibração de alerta tátil na abertura do timeout
  useEffect(() => {
    hapticFeedback.warning();
  }, []);

  const isFastRecovery = progressiveSession?.isFastRecoveryAvailable;
  const recoveryDriver = progressiveSession?.recoveryDriver;
  const cotacaoAtiva = categoriaVeiculo === "MOTO" ? cotacoes.moto : cotacoes.carro;

  return (
    <div
      data-hide-bottom-nav="true"
      className="w-full max-w-md mx-auto px-4 pb-6 z-30 animate-in slide-in-from-bottom duration-300 mt-auto select-none"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-6 space-y-4 text-center backdrop-blur-md">
        {/* BARRA SUPERIOR INDICADORA DE ARRASTE / DISPENSA */}
        <div
          onTouchStart={(e) => {
            (e.currentTarget as any)._startY = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            const startY = (e.currentTarget as any)._startY;
            if (startY && e.changedTouches[0].clientY - startY > 50) {
              hapticFeedback.light();
              cancelRideAfterTimeout();
            }
          }}
          className="w-full -mt-2 pb-1 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none group"
          aria-label="Deslize para baixo para fechar"
        >
          <div className="w-10 h-1.5 rounded-full bg-slate-300 group-hover:bg-slate-400 transition-colors" />
        </div>
        
        {/* BANNER DINÂMICO DE FAST RECOVERY (MOTORISTA DISPONÍVEL) */}
        {isFastRecovery && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-yellow-500/15 border border-amber-400/60 text-left flex items-center justify-between gap-3 animate-in zoom-in-95 duration-200 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                <Zap className="w-4 h-4 fill-slate-950" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-black text-slate-950 leading-tight flex items-center gap-1">
                  <span>Motorista encontrado por perto!</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h5>
                <p className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">
                  {recoveryDriver?.driverName ? `${recoveryDriver.driverName.split(" ")[0]} está a ${(recoveryDriver.distanceMeters / 1000).toFixed(1)} km` : "Deseja tentar novamente agora?"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticFeedback.success();
                retrySearchAfterTimeout();
              }}
              className="py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition shrink-0 flex items-center gap-1 shadow-md shadow-amber-400/30 cursor-pointer active:scale-95"
            >
              <span>Conectar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ILUSTRAÇÃO VETORIAL AMIGÁVEL */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          {/* Círculo de fundo pulsante */}
          <div className="absolute inset-0 rounded-full bg-amber-100/60 animate-pulse" />
          
          {/* Ilustração central */}
          <div className="relative w-18 h-18 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/25 border-2 border-white">
            <Car className="w-9 h-9 text-slate-950" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center border-2 border-white shadow-md">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
        </div>

        {/* TÍTULO E DESCRIÇÃO OFICIAL */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
            Poxa, estão todos ocupados no momento!
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
            Não encontramos motoristas disponíveis na sua região agora. Que tal tentar novamente em alguns minutos?
          </p>
        </div>

        {/* CARD RESUMO DO TRAJETO RECENTE */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-1 text-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="truncate max-w-[200px]">{origem}</span>
            <span>➔</span>
            <span className="truncate max-w-[140px] text-right">{destino}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 font-bold text-slate-800">
            <span>{cotacaoAtiva.nomeExibicao}</span>
            <span className="text-amber-600 font-black">
              R$ {cotacaoAtiva.precoBrl.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="space-y-2.5 pt-1">
          {/* Botão Primário: Tentar Novamente */}
          <button
            type="button"
            onClick={() => {
              hapticFeedback.heavy();
              retrySearchAfterTimeout();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-black transition active:scale-[0.98] shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 cursor-pointer border border-amber-300"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>

          {/* Botão Secundário: Cancelar Pedido */}
          <button
            type="button"
            onClick={() => {
              hapticFeedback.light();
              cancelRideAfterTimeout();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Cancelar Pedido</span>
          </button>
        </div>
      </div>
    </div>
  );
}
