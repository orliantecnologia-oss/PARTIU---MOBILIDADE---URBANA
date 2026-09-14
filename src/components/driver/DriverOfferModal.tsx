/**
 * ==============================================================================
 * 🚖 PARTIU DRIVER OFFER EXPERIENCE (v4.0) — LIGHT THEME ACCEPTANCE MODAL
 * ==============================================================================
 * Redesenhado segundo o padrão visual corporativo Azul Tech Premium (7.png).
 *
 * 1. Card container branco puro rounded-[32px] com borda sutil e sombra suave
 * 2. Temporizador circular SVG de 60 segundos com traço azul (#0088FF)
 * 3. Card "Seu ganho líquido" em azul suave (bg-blue-50/70) com valor em #003366
 * 4. 3 colunas de métricas equilibradas (Distância, Busca estimada, Avaliação)
 * 5. Chips de endereço com fundo neutro (#F8FAFC), pino verde e pino vermelho
 * 6. Botão de aceitação em degradê corporativo (#0088FF -> #003366)
 * ==============================================================================
 */

import React, { useEffect, useState, memo, useRef } from "react";
import { Star, MapPin, Navigation, X, Wallet, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import { callAlertService } from "@/services/CallAlertService";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export interface DriverOfferData {
  rideId: string;
  passageiro: string;
  passageiroAvaliacao?: number;
  valorLiquido: number;
  distanciaKm: number;
  duracaoMin: number;
  origem: string;
  destino: string;
  modalidadeTag?: string;
  distanciaAteEmbarqueKm?: number;
  tempoAteEmbarqueMin?: number;
  ganhoPorKm?: number;
}

interface DriverOfferModalProps {
  oferta: DriverOfferData;
  onAceitar: () => void;
  onRecusar: () => void;
  countdownSeconds?: number;
}

export const DriverOfferModal = memo(function DriverOfferModal({
  oferta,
  onAceitar,
  onRecusar,
  countdownSeconds = 60,
}: DriverOfferModalProps) {
  const { corPrimaria } = useBrandTheme();
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds);
  const [accepted, setAccepted] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Alerta sonoro contínuo, vibração e wake lock enquanto o modal estiver aberto
  useEffect(() => {
    void callAlertService.startAlert();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          callAlertService.stopAlert();
          onRecusar();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      callAlertService.stopAlert();
    };
  }, [onRecusar]);

  // Cálculo do progresso circular (Raio = 18, Perímetro ≈ 113.1)
  const circleRadius = 18;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (secondsRemaining / countdownSeconds) * circumference;

  // Formatação resumida dos bairros/locais
  const origemResumida = oferta.origem.split(",")[0]?.split("-")[0]?.trim() || "Local de Embarque";
  const destinoResumido = oferta.destino.split(",")[0]?.split("-")[0]?.trim() || "Destino";
  const notaFormatada = (oferta.passageiroAvaliacao || 4.95).toFixed(2);

  // Formatação de Pickup ETA e Distância
  const distanciaEmbarqueKm = oferta.distanciaAteEmbarqueKm ?? 0.85;
  const tempoEmbarqueMin = oferta.tempoAteEmbarqueMin ?? 8;
  const distanciaViagemTexto = `${oferta.distanciaKm.toFixed(1).replace(".", ",")} km`;

  const ganhoPorKmValor =
    oferta.ganhoPorKm ??
    (oferta.distanciaKm > 0 ? oferta.valorLiquido / oferta.distanciaKm : 3.6);
  const ganhoPorKmTexto = `R$ ${ganhoPorKmValor.toFixed(2).replace(".", ",")}/km`;

  const handleAccept = () => {
    if (accepted) return;
    setAccepted(true);
    callAlertService.stopAlert();
    onAceitar();
  };

  // Suporte a deslizamento interativo (Slide to Accept)
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current || !sliderRef.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const rect = sliderRef.current.getBoundingClientRect();
    const maxSlide = rect.width - 56;
    const currentOffset = Math.max(0, Math.min(clientX - rect.left - 24, maxSlide));
    setSliderPosition(currentOffset);

    if (currentOffset >= maxSlide * 0.85) {
      isDragging.current = false;
      setSliderPosition(maxSlide);
      handleAccept();
    }
  };

  const handleTouchEnd = () => {
    if (!accepted && sliderPosition < 100) {
      setSliderPosition(0);
    }
    isDragging.current = false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[32px] p-5 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-100 text-slate-900 animate-in slide-in-from-bottom duration-300 select-none">
        {/* Barra tátil de puxar */}
        <div className="w-12 h-1 rounded-full bg-slate-200 mx-auto mb-4" />

        {/* CABEÇALHO COM TEMPORIZADOR CIRCULAR SVG (PADRÃO 7.PNG) */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Temporizador circular regressivo */}
            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r={circleRadius}
                  className="stroke-slate-100"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={circleRadius}
                  stroke="#0088FF"
                  strokeWidth="3.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute text-xs font-semibold text-[#003366]">
                {secondsRemaining}s
              </span>
            </div>

            {/* Título & Contexto */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-[#003366] leading-tight">
                Nova corrida disponível!
              </h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                O passageiro está aguardando confirmação.
              </p>
            </div>
          </div>

          {/* Botão Fechar/Recusar Rápido */}
          <button
            type="button"
            onClick={() => {
              callAlertService.stopAlert();
              onRecusar();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition active:scale-90 cursor-pointer shrink-0"
            title="Recusar corrida"
            aria-label="Recusar corrida"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CARD "SEU GANHO LÍQUIDO" (AZUL SUAVE COM VALOR EM #003366) */}
        <div className="bg-blue-50/70 border border-blue-100/80 rounded-2xl p-4 flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-blue-100 text-[#0088FF] flex items-center justify-center shrink-0 shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">
                Seu ganho líquido
              </span>
              <div className="text-2xl sm:text-3xl font-semibold text-[#003366] tracking-tight leading-tight">
                {oferta.valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-blue-100 text-[#0088FF] shadow-xs">
              <span>⚡</span>
              <span>{ganhoPorKmTexto}</span>
            </span>
            <span className="block text-[10px] text-slate-400 font-medium mt-1">
              D+0 PIX Automático
            </span>
          </div>
        </div>

        {/* 3 COLUNAS DE MÉTRICAS EQUILIBRADAS (DISTÂNCIA, BUSCA, AVALIAÇÃO) */}
        <div className="grid grid-cols-3 gap-2 py-3 px-2 bg-slate-50/70 rounded-2xl border border-slate-100/90 text-center divide-x divide-slate-200/60 mb-3.5">
          {/* Coluna 1: Distância */}
          <div className="px-1">
            <div className="text-sm font-semibold text-[#003366] leading-snug">
              {distanciaViagemTexto}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Distância
            </div>
          </div>

          {/* Coluna 2: Busca estimada */}
          <div className="px-1">
            <div className="text-sm font-semibold text-[#003366] leading-snug">
              {tempoEmbarqueMin} min
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Busca estimada
            </div>
          </div>

          {/* Coluna 3: Avaliação do passageiro */}
          <div className="px-1">
            <div className="text-sm font-semibold text-[#003366] leading-snug flex items-center justify-center gap-0.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{notaFormatada}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
              {oferta.passageiro.split(" ")[0]}
            </div>
          </div>
        </div>

        {/* CHIPS DE ENDEREÇO (EMBARQUE E DESTINO COM FUNDO #F1F5F9) */}
        <div className="bg-[#F1F5F9] rounded-2xl border border-slate-100 p-3.5 space-y-2 mb-4">
          {/* Ponto de Embarque */}
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shrink-0 ring-4 ring-emerald-50" />
            <div className="min-w-0 flex-1 truncate">
              <span className="text-[10px] uppercase font-medium text-slate-400 block leading-tight">
                Embarque
              </span>
              <span className="text-xs font-semibold text-slate-800 truncate block">
                {origemResumida}
              </span>
            </div>
          </div>

          {/* Linha conectora pontilhada */}
          <div className="w-0.5 h-2.5 border-l-2 border-dotted border-slate-300 ml-1" />

          {/* Ponto de Destino */}
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0 ring-4 ring-rose-50" />
            <div className="min-w-0 flex-1 truncate">
              <span className="text-[10px] uppercase font-medium text-slate-400 block leading-tight">
                Destino
              </span>
              <span className="text-xs font-semibold text-slate-800 truncate block">
                {destinoResumido}
              </span>
            </div>
          </div>
        </div>

        {/* BOTÃO SLIDER DE CONFIRMAÇÃO (DESLIZAR PARA ACEITAR / 1-TAP) */}
        <div
          ref={sliderRef}
          onMouseMove={handleTouchMove}
          onTouchMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onTouchEnd={handleTouchEnd}
          style={{
            background: "linear-gradient(180deg, #0088FF 0%, #003366 100%)",
          }}
          className="relative w-full h-[60px] rounded-2xl p-1.5 flex items-center justify-center shadow-[0_10px_25px_rgba(0,136,255,0.3)] select-none cursor-pointer overflow-hidden transition active:scale-[0.99]"
          onClick={handleAccept}
        >
          {/* Rótulo Central */}
          <span className="font-semibold text-sm sm:text-base text-white tracking-wide pl-8">
            {accepted ? "Corrida Aceita!" : "Deslizar para Aceitar Corrida"}
          </span>

          {/* Botão Deslizante Branco com Seta Azul */}
          <div
            onMouseDown={() => {
              isDragging.current = true;
            }}
            onTouchStart={() => {
              isDragging.current = true;
            }}
            style={{
              transform: `translateX(${sliderPosition}px)`,
              transition: isDragging.current ? "none" : "transform 0.2s ease-out",
            }}
            className="absolute left-1.5 top-1.5 bottom-1.5 w-12 rounded-xl bg-white text-[#0088FF] flex items-center justify-center shadow-md active:scale-95 transition"
          >
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Ação de Recusa Suave */}
        <div className="text-center mt-3">
          <button
            type="button"
            onClick={() => {
              callAlertService.stopAlert();
              onRecusar();
            }}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 transition py-1"
          >
            Recusar esta corrida
          </button>
        </div>
      </div>
    </div>
  );
});
