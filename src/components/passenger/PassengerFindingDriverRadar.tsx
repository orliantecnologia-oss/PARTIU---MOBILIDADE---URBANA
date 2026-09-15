import React, { useMemo, memo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  AlertTriangle,
  Clock,
  Star,
} from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { useDriverSearchRealtime } from "@/hooks/useDriverSearchRealtime";

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
    destino,
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
      {/* 1. RADAR CENTRAL NO MAPA (RESPONSIVO, SEM NÚMEROS MÁGICOS OU TRANSLATE-Y) */}
      {/* ========================================================================= */}
      <div
        className="fixed inset-x-0 top-16 bottom-[340px] pointer-events-none flex items-center justify-center select-none"
        style={{ zIndex: 10 }}
        aria-hidden="true"
      >
        <div className="relative flex items-center justify-center">
          {/* Anel Concêntrico 1 (Pulso Rápido) */}
          <div
            className="absolute w-44 h-44 rounded-full border-2 border-[#0088FF] bg-[#0088FF]/10 animate-ping duration-1000 will-change-transform"
            style={{ animationDuration: "1400ms" }}
          />

          {/* Anel Concêntrico 2 (Pulso Médio Expansivo) */}
          <div
            className="absolute w-64 h-64 rounded-full border border-[#0088FF] bg-[#0088FF]/10 opacity-70 animate-pulse duration-1000 will-change-transform"
            style={{ animationDuration: "1800ms" }}
          />

          {/* Anel Concêntrico 3 (Expansão Máxima) */}
          <div
            className="absolute w-88 h-88 rounded-full border border-dashed border-[#0088FF]/40 bg-[#0088FF]/5 opacity-40 will-change-transform"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GAVETA INFERIOR UNIFICADA DE BUSCA (PADRÃO ENTERPRISE UBER / STRIPE)   */}
      {/* ETAPA 1 & 3: SUPERFÍCIE ÚNICA, ZERO FRATURA, ZERO CARD FLUTUANTE SOLTO   */}
      {/* ========================================================================= */}
      <div
        data-hide-bottom-nav="true"
        className="w-full max-w-md mx-auto z-50 animate-in slide-in-from-bottom duration-300 mt-auto relative select-none"
        style={{ zIndex: 100 }}
      >
        <div className="bg-white rounded-t-[32px] shadow-2xl border-t border-slate-100/90 pt-3.5 pb-5 px-5 flex flex-col space-y-3.5">
          {/* DRAG HANDLE BAR MINIMALISTA */}
          <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto" />

          {/* 1. STATUS PRINCIPAL DA BUSCA & CRONÔMETRO TABULAR (WCAG 2.2 AA) */}
          <div className="flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0088FF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0088FF]" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
                  Buscando motoristas próximos
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-tight truncate mt-0.5">
                  {currentWave === 1
                    ? "Conectando aos condutores no seu bairro (2 km)"
                    : currentWave === 2
                    ? "Ampliando busca para a região (4 km)"
                    : "Busca metropolitana expandida (6 km)"}
                </p>
              </div>
            </div>

            {/* Cronômetro Tabular Elegante (Padrão Revolut/Stripe) */}
            <div
              role="timer"
              aria-live="polite"
              aria-label={`${totalSecondsRemaining} segundos restantes`}
              className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/80 flex items-center gap-1.5 shrink-0 shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600 stroke-[2.2]" />
              <span className="text-xs font-mono font-bold text-slate-800 tabular-nums">
                {totalSecondsRemaining}s
              </span>
            </div>
          </div>

          {/* 2. BARRA DE PROGRESSO TRIFÁSICA DA ONDA (ACESSIBILIDADE COMPLETA) */}
          <div className="space-y-1">
            <div
              role="progressbar"
              aria-label="Progresso da busca em ondas"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1"
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  currentWave >= 1 ? "bg-[#0088FF]" : "bg-slate-200"
                }`}
                style={{ width: currentWave === 1 ? `${progressPercent}%` : "100%" }}
              />
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  currentWave >= 2 ? "bg-[#0088FF]" : "bg-slate-200"
                }`}
                style={{
                  width: currentWave === 2 ? `${progressPercent}%` : currentWave > 2 ? "100%" : "0%",
                }}
              />
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  currentWave >= 3 ? "bg-[#0088FF]" : "bg-slate-200"
                }`}
                style={{ width: currentWave === 3 ? `${progressPercent}%` : "0%" }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-0.5">
              <span>Onda {currentWave} de 3</span>
              <span>{waveDetails.radiusLabel}</span>
            </div>
          </div>

          {/* 3. CONDUTOR EM ANÁLISE (QUANDO HOUVER: DISCRETO, LIMPO, INTEGRADO AO SHEET) */}
          {hasActiveDriver && currentDriver && (
            <div
              role="status"
              className={`w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 flex items-center justify-between gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-1 ${
                isTransitioning ? "opacity-75 scale-[0.99]" : "opacity-100 scale-100"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                <div className="relative shrink-0">
                  <img
                    src={currentDriver.avatarUrl}
                    alt={currentDriver.firstName}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0088FF] border border-white" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {currentDriver.firstName}
                    </span>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-1 rounded flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      {typeof currentDriver.rating === "number" ? currentDriver.rating.toFixed(2) : "4.95"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      • {currentDriver.distanceKm} km
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                    {currentDriver.firstName} está verificando a rota...
                  </p>
                </div>
              </div>

              {/* Mini contador discreto do condutor */}
              <div className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-700 shrink-0">
                {currentDriver.cascadeSecondsRemaining}s
              </div>
            </div>
          )}

          {/* 4. RESUMO PERMANENTE DA CORRIDA (ETAPA 6: O USUÁRIO NUNCA PERDE O CONTEXTO) */}
          <div className="w-full bg-slate-50/90 border border-slate-200/80 rounded-2xl p-2.5 flex items-center justify-between gap-3 text-left">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate">
                <span className="w-2 h-2 rounded-full bg-[#0088FF] shrink-0" />
                <span className="truncate">{origem ? origem.split(",")[0] : "Local de Embarque"}</span>
                <span className="text-slate-400">➔</span>
                <span className="truncate text-slate-700">{destino ? destino.split(",")[0] : "Destino"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                <span>{categoriaVeiculo === "MOTO" ? "Partiu Moto" : "Partiu Carro"}</span>
                <span>•</span>
                <span>
                  {formaPagamento === "PIX"
                    ? "PIX"
                    : formaPagamento === "DINHEIRO"
                    ? "Dinheiro"
                    : formaPagamento === "CARTAO_APP"
                    ? "Cartão no App"
                    : "Maquininha"}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-sm font-extrabold text-slate-900 block leading-tight">
                {cotacaoAtiva?.precoBrl ? `R$ ${cotacaoAtiva.precoBrl.toFixed(2).replace(".", ",")}` : "R$ 14,90"}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                Tarifa Fixada
              </span>
            </div>
          </div>

          {/* 5. AÇÃO SECUNDÁRIA: CANCELAR BUSCA (ETAPA 5: NEUTRO, SEM VERMELHO AGRESSIVO) */}
          <button
            type="button"
            onClick={requestCancel}
            className="w-full h-11 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer shadow-2xs"
            aria-label="Cancelar busca de motorista"
          >
            <X className="w-4 h-4 stroke-[2.2] text-slate-500" />
            <span>Cancelar busca</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL DE CONFIRMAÇÃO DE CANCELAMENTO (PORTAL Z-50 COM TOUCH TARGET 44PX) */}
      {/* ========================================================================= */}
      {isCancelModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 pointer-events-auto"
          >
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-4 text-center animate-in zoom-in-95 duration-200 pointer-events-auto border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-slate-900">
                  Deseja cancelar a busca?
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Já estamos na Onda {currentWave} ({waveDetails.radiusLabel}), conectando com os condutores mais próximos de você.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => confirmCancel()}
                  className="w-full min-h-[44px] py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition active:scale-[0.98] cursor-pointer shadow-md shadow-rose-600/20"
                >
                  Sim, Cancelar Corrida
                </button>

                <button
                  type="button"
                  onClick={dismissCancel}
                  className="w-full min-h-[44px] py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-semibold transition cursor-pointer"
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
