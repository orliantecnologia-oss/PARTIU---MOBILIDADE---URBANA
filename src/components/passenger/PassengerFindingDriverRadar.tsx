import React, { useMemo, memo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  AlertTriangle,
  Bike,
  Car,
  Clock,
  Compass,
  QrCode,
  Banknote,
  Radar,
  Radio,
  Users,
} from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { CurrentSearchStatus } from "./CurrentSearchStatus";

/**
 * ==============================================================================
 * 📡 PARTIU RADAR ENGINE V4 (60 FPS GPU-ACCELERATED)
 * ==============================================================================
 * Visual progressivo de alta fidelidade com 3 ondas concêntricas animadas,
 * pino de ancoragem de embarque central, feedback em tempo real de expansão
 * de raio PostGIS (R1 2km -> R2 4km -> R3 6km) e redução ativa de ansiedade.
 * Padrão Uber/99.
 * ==============================================================================
 */
export const PassengerFindingDriverRadar = memo(function PassengerFindingDriverRadar() {
  const {
    state,
    categoriaVeiculo,
    cotacoes,
    origem,
    formaPagamento,
    progressiveSession,
    isCancelModalOpen,
    requestCancel,
    dismissCancel,
    confirmCancel,
  } = usePassengerRide();

  // Determina onda atual (1, 2 ou 3) com fallback do estado
  const currentWave = useMemo(() => {
    if (progressiveSession?.currentWave) return progressiveSession.currentWave;
    if (state === "SEARCHING_R2") return 2;
    if (state === "SEARCHING_R3") return 3;
    return 1;
  }, [progressiveSession?.currentWave, state]);

  // Mensagem e Raio dinâmicos da onda ativa sincronizados com o motor de 60s
  const waveDetails = useMemo(() => {
    switch (currentWave) {
      case 2:
        return {
          title: "Ampliando a busca",
          message: progressiveSession?.waveMessage || "Ampliando a busca na região...",
          radiusLabel: "Raio: 4 km",
          secondsRemaining: progressiveSession?.waveSecondsRemaining ?? 20,
          totalSeconds: progressiveSession?.waveDurationSeconds ?? 20,
          themeColor: "blue",
          ringBorder: "border-blue-500",
          ringBg: "bg-blue-500/15",
          badgeBg: "bg-blue-50 text-blue-900 border-blue-300",
        };
      case 3:
        return {
          title: "Busca metropolitana",
          message: progressiveSession?.waveMessage || "Procurando em bairros vizinhos...",
          radiusLabel: progressiveSession?.currentRadiusMeters
            ? `Raio: ${(progressiveSession.currentRadiusMeters / 1000).toFixed(0)} km`
            : "Raio: 6 km",
          secondsRemaining: progressiveSession?.waveSecondsRemaining ?? 20,
          totalSeconds: progressiveSession?.waveDurationSeconds ?? 20,
          themeColor: "indigo",
          ringBorder: "border-indigo-500",
          ringBg: "bg-indigo-500/15",
          badgeBg: "bg-indigo-50 text-indigo-900 border-indigo-300",
        };
      case 1:
      default:
        return {
          title: "Buscando condutores",
          message: progressiveSession?.waveMessage || "Buscando motoristas próximos...",
          radiusLabel: "Raio: 2 km",
          secondsRemaining: progressiveSession?.waveSecondsRemaining ?? 20,
          totalSeconds: progressiveSession?.waveDurationSeconds ?? 20,
          themeColor: "cyan",
          ringBorder: "border-cyan-500",
          ringBg: "bg-cyan-500/15",
          badgeBg: "bg-cyan-50 text-cyan-900 border-cyan-300",
        };
    }
  }, [currentWave, progressiveSession]);

  const cotacaoAtiva = categoriaVeiculo === "MOTO" ? cotacoes.moto : cotacoes.carro;

  // Progresso percentual da onda ativa
  const progressPercent = Math.min(
    100,
    Math.max(
      5,
      ((waveDetails.totalSeconds - waveDetails.secondsRemaining) / waveDetails.totalSeconds) * 100
    )
  );

  // Contagem regressiva unificada de 60s (3 ondas de 20s)
  const totalSecondsRemaining = Math.max(
    1,
    (3 - currentWave) * 20 + waveDetails.secondsRemaining
  );
  const totalCountdownPercent = (totalSecondsRemaining / 60) * 100;

  return (
    <>
      {/* ========================================================================= */}
      {/* TOP BANNER FLUTUANTE DE DESPACHO PROGRESSIVO (LEALT RECOMENDADO/5.PNG)    */}
      {/* ========================================================================= */}
      <div className="fixed top-18 inset-x-3 z-40 max-w-sm mx-auto pointer-events-auto animate-in slide-in-from-top duration-300">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-slate-200/90 flex items-center gap-3 text-left">
          {/* Ícone circular azul com pino */}
          <div className="w-10 h-10 rounded-full bg-[#0088FF] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Compass className="w-5 h-5 animate-spin duration-3000 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-xs sm:text-[13px] font-bold text-slate-900 truncate block">
              Busca Metropolitana • Onda {currentWave}/3 ({waveDetails.radiusLabel})
            </span>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-[#0088FF] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Ícone de grupo de motoristas */}
          <Users className="w-5 h-5 text-slate-500 shrink-0" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. RADAR CENTRAL EM 60 FPS (ONDAS DE BUSCA CONCÊNTRICAS EM #00C6FF)       */}
      {/* ========================================================================= */}
      <div
        className="fixed inset-0 pointer-events-none flex items-center justify-center select-none"
        style={{ zIndex: 10, pointerEvents: "none", transform: "translateY(calc(-21vh - 25px))" }}
      >
        <div className="relative flex items-center justify-center">
          {/* Anel Concêntrico 1 (Pulso Rápido em #00C6FF) */}
          <div
            className="absolute w-48 h-48 rounded-full border-2 border-[#00C6FF] bg-[#00C6FF]/15 animate-ping duration-1000 will-change-transform"
            style={{ animationDuration: "1400ms" }}
          />

          {/* Anel Concêntrico 2 (Pulso Médio Expansivo em #00C6FF) */}
          <div
            className="absolute w-72 h-72 rounded-full border border-[#00C6FF] bg-[#00C6FF]/10 opacity-70 animate-pulse duration-1000 will-change-transform"
            style={{ animationDuration: "1800ms" }}
          />

          {/* Anel Concêntrico 3 (Expansão Máxima com Fade Out) */}
          <div
            className="absolute w-96 h-96 rounded-full border border-dashed border-[#00C6FF] bg-[#00C6FF]/5 opacity-40 animate-ping duration-1000 will-change-transform"
            style={{ animationDuration: "2400ms" }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GAVETA INFERIOR DE BUSCA PROGRESSIVA (LEALT RECOMENDADO/5.PNG)         */}
      {/* ========================================================================= */}
      <div
        data-hide-bottom-nav="true"
        className="w-full max-w-md mx-auto z-50 animate-in slide-in-from-bottom duration-300 mt-auto relative"
        style={{ zIndex: 100, ...({ elevation: 10 } as React.CSSProperties) }}
      >
        <div className="bg-white rounded-t-[32px] shadow-2xl border-t border-slate-100 pt-3 pb-6 px-6 flex flex-col items-center text-center select-none">
          {/* DRAG HANDLE BAR */}
          <div className="w-12 h-1.5 rounded-full bg-slate-300 mb-4" />

          {/* ALVO CENTRAL DE MIRA COM PINO AZUL #0088FF (PADRÃO 5.PNG) */}
          <div className="w-20 h-20 rounded-full bg-[#F0F7FF] flex items-center justify-center relative mb-3">
            <div className="w-14 h-14 rounded-full bg-[#D8EDFF] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
                  fill="#0088FF"
                />
                <circle cx="12" cy="9" r="3" fill="#FFFFFF" />
              </svg>
            </div>
          </div>

          {/* TÍTULO E SUBTÍTULO OFICIAIS */}
          <h3 className="text-lg sm:text-xl font-bold text-brand-primary-deep leading-tight">
            Buscando motoristas próximos...
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1 mb-4 max-w-xs leading-relaxed">
            Estamos conectando você com os melhores motoristas da região. Aguarde um instante!
          </p>

          {/* TEMPORIZADOR CIRCULAR REGRESSIVO DE 60s (PADRÃO 5.PNG) */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center my-1">
            <svg className="w-16 h-16 -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="26"
                className="stroke-slate-100"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="var(--brand-primary-vibrant, #0088FF)"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="163.3"
                strokeDashoffset={163.3 - (totalCountdownPercent / 100) * 163.3}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-slate-900 leading-none">
                {totalSecondsRemaining}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                s
              </span>
            </div>
          </div>

          {/* BOTÃO OUTLINE VERMELHO DE CANCELAR BUSCA (PADRÃO 5.PNG) */}
          <button
            type="button"
            onClick={requestCancel}
            className="w-full h-14 mt-5 rounded-full border-2 border-brand-danger-red bg-white text-brand-danger-red hover:bg-rose-50 font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer shadow-xs"
          >
            <X className="w-5 h-5 stroke-[2.4]" />
            <span>Cancelar busca</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL DE CONFIRMAÇÃO DE CANCELAMENTO (PORTAL LIVRE DE STACKING TRAP)     */}
      {/* ========================================================================= */}
      {isCancelModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 pointer-events-auto"
          >
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-4 text-center animate-in zoom-in-95 duration-200 pointer-events-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-semibold text-brand-primary-deep">
                  Deseja cancelar a busca?
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Já estamos na Onda {currentWave} ({waveDetails.radiusLabel}), procurando os melhores motoristas próximos de você.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => confirmCancel()}
                  className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition active:scale-95 cursor-pointer shadow-md shadow-rose-600/20 touch-manipulation"
                >
                  Sim, Cancelar Corrida
                </button>

                <button
                  type="button"
                  onClick={dismissCancel}
                  className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition cursor-pointer touch-manipulation"
                >
                  Continuar Aguardando
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
});
