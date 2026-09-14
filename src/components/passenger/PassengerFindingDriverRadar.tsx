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
      {/* TOP BANNER FLUTUANTE DE DESPACHO PROGRESSIVO                              */}
      {/* ========================================================================= */}
      <div className="fixed top-20 inset-x-3 z-40 max-w-sm mx-auto pointer-events-auto animate-in slide-in-from-top duration-300">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-slate-200/90 text-left space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C6FF] animate-ping" />
              <span className="text-xs font-semibold text-[#003366]">
                {waveDetails.title} • Onda {currentWave}/3
              </span>
            </div>
            <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#0088FF] border border-slate-200">
              {waveDetails.radiusLabel}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0088FF] via-[#00C6FF] to-[#003366] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
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
      {/* 2. CARD INFERIOR FLUTUANTE DE STATUS DE BUSCA PROGRESSIVA               */}
      {/* ========================================================================= */}
      <div
        data-hide-bottom-nav="true"
        className="w-full max-w-md mx-auto px-4 pb-5 z-50 animate-in slide-in-from-bottom duration-300 mt-auto relative h-fit"
        style={{ zIndex: 100, ...({ elevation: 10 } as React.CSSProperties) }}
      >
        {/* ÍCONE FLUTUANTE EM MEIA-LUA NA BORDA SUPERIOR (AVATAR OVERLAY COMPACTO) */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="relative w-12 h-12 rounded-full bg-white border-2 border-[#00C6FF] shadow-md flex items-center justify-center text-[#0088FF]">
            {categoriaVeiculo === "MOTO" ? (
              <Bike className="w-6 h-6 text-[#0088FF]" />
            ) : (
              <Car className="w-6 h-6 text-[#0088FF]" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] border border-slate-200/90 pt-8 p-4 sm:p-5 space-y-3 text-left">
          
          {/* Header de Status com Radar e Badge da Onda */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-cyan-50 text-[#0088FF] flex items-center justify-center shrink-0 shadow-inner">
                <Compass className="w-4 h-4 animate-spin duration-3000 text-[#0088FF]" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#003366] leading-tight">
                    {waveDetails.title}
                  </h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-[#F1F5F9] text-[#003366] border-slate-200">
                    Onda {currentWave}/3
                  </span>
                </div>
                <p className="text-xs text-[#64748B] font-normal mt-0.5 truncate transition-all duration-300">
                  {waveDetails.message}
                </p>
              </div>
            </div>

            {/* Badge com Raio Ativo PostGIS */}
            <div className="text-right shrink-0">
              <span className="inline-block px-2.5 py-0.5 rounded-xl bg-[#F1F5F9] text-[#334155] text-[10.5px] font-medium border border-slate-200 shadow-xs">
                {waveDetails.radiusLabel}
              </span>
            </div>
          </div>

          {/* STATUS COM INDICADOR DE PULSO E TEMPORIZADOR CIRCULAR SINCRONIZADO (60s) */}
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-3 h-3 flex items-center justify-center shrink-0">
                <span className="absolute w-3 h-3 rounded-full bg-[#0088FF] animate-ping opacity-75" />
                <span className="relative w-2 h-2 rounded-full bg-[#0088FF]" />
              </div>
              <span className="text-xs font-medium text-[#334155] truncate">
                Procurando motoristas próximos...
              </span>
            </div>

            {/* Temporizador Circular Regressivo de 60s */}
            <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
              <svg className="w-10 h-10 -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  className="stroke-slate-200"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  stroke="#0088FF"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray="94.2"
                  strokeDashoffset={94.2 - (totalCountdownPercent / 100) * 94.2}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute text-[10.5px] font-semibold text-[#003366]">
                {totalSecondsRemaining}s
              </span>
            </div>
          </div>

          {/* BLOCO ÚNICO DE FEEDBACK DINÂMICO (SINGLE DYNAMIC ROW) */}
          <CurrentSearchStatus />

          {/* Resumo da Corrida e Pagamento */}
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
            <span className="font-semibold text-[#003366]">
              {cotacaoAtiva.nomeExibicao} • R$ {cotacaoAtiva.precoBrl.toFixed(2).replace(".", ",")}
            </span>

            <span className="font-medium text-slate-600 flex items-center gap-1.5">
              {formaPagamento === "pix" ? (
                <>
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PIX</span>
                </>
              ) : (
                <>
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dinheiro</span>
                </>
              )}
            </span>
          </div>

          {/* Botão Secundário de Cancelamento Estilizado em Outline com Borda #EF4444 */}
          <button
            type="button"
            onClick={requestCancel}
            className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-rose-50/50 text-[#EF4444] text-xs font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-[#EF4444] shadow-xs"
          >
            <X className="w-4 h-4 text-[#EF4444]" />
            <span>Cancelar Corrida</span>
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
                <h4 className="text-base font-semibold text-[#003366]">
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
