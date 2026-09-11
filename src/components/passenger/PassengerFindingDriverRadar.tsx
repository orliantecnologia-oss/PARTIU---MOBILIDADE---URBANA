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
          themeColor: "amber",
          ringBorder: "border-primary-600",
          ringBg: "bg-primary-600/10",
          badgeBg: "bg-primary-600/10 text-amber-900 border-primary-600/30",
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
          themeColor: "blue",
          ringBorder: "border-sky-400",
          ringBg: "bg-sky-400/10",
          badgeBg: "bg-sky-500/10 text-sky-900 border-sky-400/30",
        };
      case 1:
      default:
        return {
          title: "Buscando condutores",
          message: progressiveSession?.waveMessage || "Buscando motoristas próximos...",
          radiusLabel: "Raio: 2 km",
          secondsRemaining: progressiveSession?.waveSecondsRemaining ?? 20,
          totalSeconds: progressiveSession?.waveDurationSeconds ?? 20,
          themeColor: "emerald",
          ringBorder: "border-emerald-400",
          ringBg: "bg-emerald-400/10",
          badgeBg: "bg-emerald-500/10 text-emerald-900 border-emerald-400/30",
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

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. RADAR CENTRAL EM 60 FPS (ONDAS DE BUSCA AO REDOR DO PINO REAL NO MAPA) */}
      {/* ========================================================================= */}
      <div
        className="fixed inset-0 pointer-events-none flex items-center justify-center select-none"
        style={{ zIndex: 1, pointerEvents: "none", transform: "translateY(calc(-21vh - 25px))" }}
      >
        <div className="relative flex items-center justify-center">
          {/* Anel Concêntrico 1 (Pulso Rápido) */}
          <div
            className={`absolute w-48 h-48 rounded-full border-2 ${waveDetails.ringBorder} ${waveDetails.ringBg} animate-ping duration-1000 will-change-transform`}
            style={{ animationDuration: "1400ms" }}
          />

          {/* Anel Concêntrico 2 (Pulso Médio Expansivo) */}
          <div
            className={`absolute w-72 h-72 rounded-full border ${waveDetails.ringBorder} opacity-60 animate-pulse duration-1000 will-change-transform`}
            style={{ animationDuration: "1800ms" }}
          />

          {/* Anel Concêntrico 3 (Expansão Máxima 0 -> 3x com fade out) */}
          <div
            className={`absolute w-96 h-96 rounded-full border border-dashed ${waveDetails.ringBorder} opacity-40 animate-ping duration-1000 will-change-transform`}
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
          <div className="relative w-12 h-12 rounded-full bg-slate-950 border-[3px] border-primary-600 shadow-xl flex items-center justify-center text-white">
            {categoriaVeiculo === "MOTO" ? (
              <Bike className="w-6 h-6 text-primary-600" />
            ) : (
              <Car className="w-6 h-6 text-primary-600" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 pt-8 p-4 sm:p-5 space-y-3 text-left">
          
          {/* Header de Status com Radar e Badge da Onda */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary-50 text-amber-800 flex items-center justify-center shrink-0 shadow-inner">
                <Compass className="w-4 h-4 animate-spin duration-3000" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    {waveDetails.title}
                  </h3>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${waveDetails.badgeBg}`}>
                    Onda {currentWave}/3
                  </span>
                </div>
                <p className="text-xs text-amber-900 font-semibold mt-0.5 truncate transition-all duration-300">
                  {waveDetails.message}
                </p>
              </div>
            </div>

            {/* Badge com Raio Ativo PostGIS */}
            <div className="text-right shrink-0">
              <span className="inline-block px-2 py-0.5 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200/80 shadow-xs">
                {waveDetails.radiusLabel}
              </span>
            </div>
          </div>

          {/* Barra de Progresso Contínua Fluida */}
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-600 via-amber-300 to-primary-800 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold px-0.5">
              <span>Varrendo motoristas elegíveis...</span>
              <span>{waveDetails.secondsRemaining}s</span>
            </div>
          </div>

          {/* BLOCO ÚNICO DE FEEDBACK DINÂMICO (SINGLE DYNAMIC ROW) */}
          <CurrentSearchStatus />

          {/* Resumo da Corrida e Pagamento */}
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              {cotacaoAtiva.nomeExibicao} • R$ {cotacaoAtiva.precoBrl.toFixed(2).replace(".", ",")}
            </span>

            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
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

          {/* Botão de Cancelamento de Corrida */}
          <button
            type="button"
            onClick={requestCancel}
            className="w-full py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-rose-200/80"
          >
            <X className="w-4 h-4" />
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
                <h4 className="text-base font-black text-slate-900">
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
                  className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition active:scale-95 cursor-pointer shadow-md shadow-rose-600/20 touch-manipulation"
                >
                  Sim, Cancelar Corrida
                </button>

                <button
                  type="button"
                  onClick={dismissCancel}
                  className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer touch-manipulation"
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
