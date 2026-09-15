/**
 * ==============================================================================
 * 🚖 PARTIU DRIVER OFFER EXPERIENCE — LIGHT THEME ACCEPTANCE MODAL
 * ==============================================================================
 * 100% fiel ao padrão visual oficial Azul Tech Light (12.png):
 * - Topo com grande temporizador circular regressivo de 60s centralizado
 * - "Ganhos líquidos do motorista" + R$ 28,50 em fonte text-5xl (#003366)
 * - 3 cards de métricas em #F0F7FF (7.4 km total, 3 min até embarque, Passageiro 4.95 ★)
 * - Cards de Embarque (borda lateral verde #10B981) e Destino (borda lateral vermelha #EF4444)
 * - Botão interativo deslizante "Deslizar para Aceitar Corrida" em degradê azul
 * ==============================================================================
 */

import React, { useEffect, useState, memo, useRef } from "react";
import { Star, MapPin, Clock, ArrowRight, User, ChevronRight, X } from "lucide-react";
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

  // Cálculo do progresso circular SVG grande (Raio = 40, Perímetro ≈ 251.3)
  const circleRadius = 40;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (secondsRemaining / countdownSeconds) * circumference;

  // Formatação dos dados da corrida
  const notaFormatada = (oferta.passageiroAvaliacao || 4.95).toFixed(2);
  const tempoEmbarqueMin = oferta.tempoAteEmbarqueMin ?? 3;
  const distanciaViagemTexto = `${oferta.distanciaKm ? oferta.distanciaKm.toFixed(1).replace(".", ",") : "7,4"} km`;

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
    const maxSlide = rect.width - 64;
    const currentOffset = Math.max(0, Math.min(clientX - rect.left - 28, maxSlide));
    setSliderPosition(currentOffset);

    if (currentOffset >= maxSlide * 0.85) {
      isDragging.current = false;
      setSliderPosition(maxSlide);
      handleAccept();
    }
  };

  const handleTouchEnd = () => {
    if (!accepted && sliderPosition < 120) {
      setSliderPosition(0);
    }
    isDragging.current = false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[32px] p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-slate-100 text-slate-900 animate-in slide-in-from-bottom duration-300 select-none text-center">
        {/* Barra tátil de puxar */}
        <div className="w-12 h-1.5 rounded-full bg-slate-200 mx-auto mb-3" />

        {/* 1. GRANDE TEMPORIZADOR CIRCULAR REGRESSIVO (12.png) */}
        <div className="relative w-24 h-24 mx-auto mb-2 flex items-center justify-center">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r={circleRadius}
              className="stroke-blue-50"
              strokeWidth="5"
              fill="transparent"
            />
            <circle
              cx="48"
              cy="48"
              r={circleRadius}
              stroke="#0088FF"
              strokeWidth="5.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-extrabold text-[#0088FF] leading-none tracking-tight">
              {secondsRemaining}
            </span>
            <span className="text-xs font-bold text-[#0088FF] -mt-0.5">seg</span>
          </div>
        </div>

        {/* 2. GANHOS LÍQUIDOS DO MOTORISTA (12.png) */}
        <div className="mb-4">
          <span className="text-sm text-slate-500 font-medium block">
            Ganhos líquidos do motorista
          </span>
          <div className="text-4xl sm:text-5xl font-black text-[#003366] tracking-tight leading-tight my-1">
            {oferta.valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>

        {/* 3. 3 CARDS DE MÉTRICAS EM #F0F7FF (12.png: TOTAL, EMBARQUE, PASSAGEIRO) */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {/* Card 1: Distância Total */}
          <div className="bg-[#F0F7FF] rounded-2xl p-3 border border-[#D0E6FF]/60 text-center">
            <MapPin className="w-5 h-5 mx-auto mb-1 text-[#0088FF] fill-[#0088FF]/10" />
            <div className="text-sm sm:text-base font-bold text-[#003366] leading-tight">
              {distanciaViagemTexto}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              total
            </div>
          </div>

          {/* Card 2: Tempo até embarque */}
          <div className="bg-[#F0F7FF] rounded-2xl p-3 border border-[#D0E6FF]/60 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-[#0088FF]" />
            <div className="text-sm sm:text-base font-bold text-[#003366] leading-tight">
              {tempoEmbarqueMin} min
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              até embarque
            </div>
          </div>

          {/* Card 3: Nota do Passageiro */}
          <div className="bg-[#F0F7FF] rounded-2xl p-3 border border-[#D0E6FF]/60 text-center">
            <Star className="w-5 h-5 mx-auto mb-1 text-[#0088FF] fill-[#0088FF]" />
            <div className="text-[11px] text-slate-500 font-medium truncate">
              Passageiro
            </div>
            <div className="text-sm sm:text-base font-bold text-[#003366] leading-tight mt-0.5 flex items-center justify-center gap-0.5">
              <span>{notaFormatada}</span>
              <span className="text-amber-500">★</span>
            </div>
          </div>
        </div>

        {/* 4. CARDS DE ENDEREÇO (12.png: LOCAL DE EMBARQUE & DESTINO) */}
        <div className="space-y-2.5 mb-5 text-left">
          {/* Local de Embarque (Borda Lateral Verde #10B981) */}
          <div className="bg-[#F8FAFC] rounded-2xl p-3.5 flex items-center justify-between gap-3 border-l-4 border-[#10B981] shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#003366] block leading-tight">
                  Local de embarque
                </span>
                <span className="text-xs text-slate-500 truncate block mt-0.5">
                  {oferta.origem}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </div>

          {/* Destino (Borda Lateral Vermelha #EF4444) */}
          <div className="bg-[#F8FAFC] rounded-2xl p-3.5 flex items-center justify-between gap-3 border-l-4 border-[#EF4444] shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#EF4444] text-white flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 fill-white" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#003366] block leading-tight">
                  Destino
                </span>
                <span className="text-xs text-slate-500 truncate block mt-0.5">
                  {oferta.destino}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </div>
        </div>

        {/* 5. SLIDER DE CONFIRMAÇÃO (12.png: DESLIZAR PARA ACEITAR CORRIDA) */}
        <div
          ref={sliderRef}
          onMouseMove={handleTouchMove}
          onTouchMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onTouchEnd={handleTouchEnd}
          style={{
            background: "linear-gradient(90deg, #0088FF 0%, #003366 100%)",
          }}
          className="relative w-full h-16 rounded-full p-2 flex items-center justify-center shadow-lg shadow-blue-500/25 select-none cursor-pointer overflow-hidden transition active:scale-[0.99]"
          onClick={handleAccept}
        >
          {/* Rótulo Central */}
          <span className="font-bold text-sm sm:text-base text-white tracking-wide pl-8">
            {accepted ? "Corrida Aceita!" : "Deslizar para Aceitar Corrida"}
          </span>

          {/* Botão Deslizante Branco com Seta Azul (12.png) */}
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
            className="absolute left-2 top-2 bottom-2 w-12 rounded-full bg-white text-[#0088FF] flex items-center justify-center shadow-md active:scale-95 transition"
          >
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Ação de Recusa Suave */}
        <div className="text-center mt-2.5">
          <button
            type="button"
            onClick={() => {
              callAlertService.stopAlert();
              onRecusar();
            }}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 transition py-1 cursor-pointer"
          >
            Recusar esta corrida
          </button>
        </div>
      </div>
    </div>
  );
});
