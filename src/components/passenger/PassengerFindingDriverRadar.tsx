import React, { useMemo, memo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  AlertTriangle,
  Clock,
  Compass,
  Radar,
  Users,
  Star,
  Eye,
  PhoneCall,
} from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { useDriverSearchRealtime } from "@/hooks/useDriverSearchRealtime";
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

  const { currentDriver, isTransitioning, hasActiveDriver } = useDriverSearchRealtime();

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
      {/* 2. GAVETA INFERIOR DE BUSCA PROGRESSIVA COMPACTA & LIMPA (PADRÃO 99/UBER) */}
      {/* ========================================================================= */}
      <div
        data-hide-bottom-nav="true"
        className="w-full max-w-md mx-auto z-50 animate-in slide-in-from-bottom duration-300 mt-auto relative"
        style={{ zIndex: 100, ...({ elevation: 10 } as React.CSSProperties) }}
      >
        <div className="bg-white rounded-t-[28px] shadow-2xl border-t border-slate-100/90 pt-2.5 pb-5 px-5 flex flex-col select-none">
          {/* DRAG HANDLE BAR */}
          <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-3" />

          {/* CABEÇALHO LIMPO DA ONDA & BARRA DE PROGRESSO INTEGRADOS NO MODAL */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0088FF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0088FF]" />
              </span>
              <span className="text-xs font-bold text-slate-800 truncate">
                Busca Metropolitana • Onda {currentWave}/3
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">
              {waveDetails.radiusLabel}
            </span>
          </div>

          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-[#0088FF] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* CONTAINER DA BUSCA / NOTIFICAÇÃO DO MOTORISTA COM CONTAGEM REGRESSIVA */}
          {hasActiveDriver && currentDriver ? (
            /* ESTADO 1: MOTORISTA ANALISANDO / VISUALIZANDO (CARD COMPACTO E ELEGANTE) */
            <div
              className={`w-full bg-slate-900 text-white rounded-2xl p-3 shadow-md border border-blue-500/40 flex items-center justify-between gap-3 mb-3 transition-all duration-300 ${
                isTransitioning ? "opacity-75 scale-[0.98]" : "opacity-100 scale-100"
              }`}
            >
              {/* Foto com badge radar */}
              <div className="relative shrink-0">
                <img
                  src={currentDriver.avatarUrl}
                  alt={currentDriver.firstName}
                  className="w-11 h-11 rounded-xl object-cover border border-white/20 shadow-xs"
                />
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0088FF] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0088FF] border-2 border-slate-900" />
                </span>
              </div>

              {/* Dados do Motorista & Status da Análise */}
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-black text-white leading-tight truncate">
                    {currentDriver.firstName}
                  </h4>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-1 rounded flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                    {typeof currentDriver.rating === "number" ? currentDriver.rating.toFixed(2) : "4.95"}
                  </span>
                  <span className="text-[10px] text-slate-300 font-semibold truncate flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5 text-blue-400" />
                    ~{currentDriver.etaMinutes} min
                  </span>
                </div>

                <p className="text-[11px] font-bold text-blue-300 mt-0.5 truncate flex items-center gap-1">
                  {currentDriver.dispatchStatus === "DRIVER_VIEWING" ? (
                    <Eye className="w-3.5 h-3.5 text-sky-300 shrink-0 animate-pulse" />
                  ) : (
                    <PhoneCall className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />
                  )}
                  <span>
                    {currentDriver.dispatchStatus === "DRIVER_VIEWING"
                      ? `${currentDriver.firstName} está verificando a rota...`
                      : `${currentDriver.firstName} está analisando seu pedido...`}
                  </span>
                </p>

                <span className="text-[10px] text-slate-400 block truncate">
                  {currentDriver.vehicleModel} • {currentDriver.distanceKm} km
                </span>
              </div>

              {/* Timer Circular Regressivo Compacto do Motorista */}
              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                <svg className="w-12 h-12 -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="19"
                    className="stroke-slate-800"
                    strokeWidth="3"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="19"
                    stroke="#0088FF"
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray="119.38"
                    strokeDashoffset={
                      119.38 -
                      ((currentDriver.cascadeSecondsRemaining || 1) / 15) * 119.38
                    }
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-sm font-bold font-mono text-white leading-none">
                    {currentDriver.cascadeSecondsRemaining}
                  </span>
                  <span className="text-[8px] font-bold text-blue-400 leading-none">s</span>
                </div>
              </div>
            </div>
          ) : (
            /* ESTADO 2: BUSCANDO MOTORISTAS PRÓXIMOS (LAYOUT LIMPO E COMPACTO) */
            <div className="w-full bg-slate-50/90 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0088FF] border border-blue-200/80 flex items-center justify-center shrink-0">
                  <Radar className="w-5 h-5 animate-spin duration-3000 text-[#0088FF]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
                    Buscando motoristas próximos...
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight truncate mt-0.5">
                    {waveDetails.message}
                  </p>
                </div>
              </div>

              {/* Timer Circular Regressivo Geral de 60s */}
              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                <svg className="w-12 h-12 -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="19"
                    className="stroke-slate-200"
                    strokeWidth="3"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="19"
                    stroke="#0088FF"
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray="119.38"
                    strokeDashoffset={119.38 - (totalCountdownPercent / 100) * 119.38}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-sm font-bold text-slate-900 leading-none">
                    {totalSecondsRemaining}
                  </span>
                  <span className="text-[8px] font-semibold text-slate-400 leading-none">s</span>
                </div>
              </div>
            </div>
          )}

          {/* BOTÃO COMPACTO CANCELAR BUSCA */}
          <button
            type="button"
            onClick={requestCancel}
            className="w-full h-11 rounded-full border border-rose-300 bg-white text-rose-600 hover:bg-rose-50 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all cursor-pointer shadow-2xs"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
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
