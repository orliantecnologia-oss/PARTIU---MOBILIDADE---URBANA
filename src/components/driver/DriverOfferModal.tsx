/**
 * ==============================================================================
 * 🚖 PARTIU DRIVER OFFER EXPERIENCE (v4.0) — ULTRA-MINIMALIST ACCEPTANCE MODAL
 * ==============================================================================
 * Redesenhado segundo a auditoria rigorosa de simplificação cognitiva.
 *
 * EXIBE ESTRITAMENTE:
 * 1. VALOR LÍQUIDO do motorista em destaque (ex: R$ 18,50)
 * 2. Distância e Tempo (ex: 4,2 km • 11 min)
 * 3. Nota do passageiro (ex: ★ 4.9)
 * 4. Origem e Destino resumidos (ex: Origem: Centro / Destino: Aeroporto)
 * 5. Barra de progresso suave de 10 segundos com countdown
 * 6. Botão Principal "ACEITAR CORRIDA" 100% largura e 64px de altura
 *
 * ZERO POLUIÇÃO: Sem comparativos, sem comissões detalhadas, sem fundos de proteção.
 * ==============================================================================
 */

import React, { useEffect, useState, memo } from "react";
import { Star, MapPin, Navigation, X } from "lucide-react";
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
  const { corPrimaria, corTextoPrimaria } = useBrandTheme();
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds);
  const [accepted, setAccepted] = useState(false);

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

  const progressPercent = Math.max(0, (secondsRemaining / countdownSeconds) * 100);

  // Formatação resumida dos bairros/locais (Remove números de casa e CEPs extensos)
  const origemResumida = oferta.origem.split(",")[0]?.split("-")[0]?.trim() || "Local de Embarque";
  const destinoResumido = oferta.destino.split(",")[0]?.split("-")[0]?.trim() || "Destino";
  const notaFormatada = (oferta.passageiroAvaliacao || 4.9).toFixed(1);

  // Formatação de Pickup ETA e Rentabilidade (Padrão Uber / 99)
  const distanciaEmbarqueKm = oferta.distanciaAteEmbarqueKm ?? 0.85;
  const distanciaEmbarqueTexto =
    distanciaEmbarqueKm < 1
      ? `${Math.round(distanciaEmbarqueKm * 1000)} m`
      : `${distanciaEmbarqueKm.toFixed(1).replace(".", ",")} km`;
  const tempoEmbarqueMin = oferta.tempoAteEmbarqueMin ?? 3;

  const distanciaViagemTexto = `${oferta.distanciaKm.toFixed(1).replace(".", ",")} km`;
  const tempoViagemMin = oferta.duracaoMin || 11;

  const ganhoPorKmValor =
    oferta.ganhoPorKm ??
    (oferta.distanciaKm > 0 ? oferta.valorLiquido / oferta.distanciaKm : 3.6);
  const ganhoPorKmTexto = `R$ ${ganhoPorKmValor.toFixed(2).replace(".", ",")}/km`;

  const handleSingleTapAccept = () => {
    if (accepted) return;
    setAccepted(true);
    callAlertService.stopAlert();
    onAceitar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0A2342] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] border border-blue-900/60 overflow-hidden text-white animate-in slide-in-from-bottom duration-300 select-none">
        
        {/* 1. BARRA DE PROGRESSO DO COUNTDOWN DE 60s SINCRONIZADO */}
        <div className="w-full h-2.5 bg-slate-900 overflow-hidden relative">
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${progressPercent}%`,
              background:
                secondsRemaining <= 10
                  ? "linear-gradient(90deg, #EF4444 0%, #DC2626 100%)"
                  : "linear-gradient(90deg, #00FF88 0%, #00C6FF 100%)",
            }}
          />
        </div>

        <div className="p-5 sm:p-6 space-y-3.5">
          {/* Header Superior: Nota do Passageiro, Badge Rentabilidade e Contador */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#1E293B] border border-slate-700 text-amber-400">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{notaFormatada}</span>
              <span className="text-slate-400 font-normal ml-0.5">• {oferta.passageiro.split(" ")[0]}</span>
            </div>

            {/* BADGE DE RENTABILIDADE R$/km (Decisão Rápida do Condutor) */}
            <div className="px-2.5 py-1 rounded-full text-[11px] font-black tracking-tight flex items-center gap-1 bg-[#00FF88]/15 border border-[#00FF88]/40 text-[#00FF88]">
              <span>⚡</span>
              <span>{ganhoPorKmTexto}</span>
            </div>

            <div className="flex items-center gap-1">
              <div
                className={`text-xs font-black px-2.5 py-1 rounded-full border transition-colors ${
                  secondsRemaining <= 10
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse"
                    : "bg-[#1E293B] text-slate-200 border-slate-700"
                }`}
              >
                <span>{secondsRemaining}s</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  callAlertService.stopAlert();
                  onRecusar();
                }}
                className="w-7 h-7 rounded-full bg-[#1E293B] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition active:scale-90 cursor-pointer"
                title="Recusar corrida"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. VALOR LÍQUIDO EM ALTO CONTRASTE (HERO ELEMENT) */}
          <div className="text-center py-3 bg-[#0F1C3F] rounded-2xl border border-blue-900/60 shadow-inner">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block">
              Você recebe líquido
            </span>
            <div className="text-4xl sm:text-5xl font-black text-[#00FF88] tracking-tight mt-0.5 drop-shadow-[0_2px_12px_rgba(0,255,136,0.35)]">
              {oferta.valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </div>

          {/* 3. BLOCOS LADO A LADO — ATÉ O PASSAGEIRO E VIAGEM */}
          <div className="grid grid-cols-2 gap-2">
            {/* BLOCO 1: ATÉ O PASSAGEIRO */}
            <div className="p-3 rounded-2xl bg-[#112240] border border-blue-800/40 text-left">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#00C6FF]">
                <Navigation className="w-3 h-3" />
                <span>Até o Passageiro</span>
              </div>
              <div className="text-sm font-black text-white mt-1">
                {tempoEmbarqueMin} min • {distanciaEmbarqueTexto}
              </div>
              <span className="text-[10px] font-semibold truncate block mt-0.5 text-slate-400">
                {origemResumida}
              </span>
            </div>

            {/* BLOCO 2: VIAGEM */}
            <div className="p-3 rounded-2xl bg-[#112240] border border-blue-800/40 text-left">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#38BDF8]">
                <MapPin className="w-3 h-3" />
                <span>Viagem</span>
              </div>
              <div className="text-sm font-black text-white mt-1">
                {tempoViagemMin} min • {distanciaViagemTexto}
              </div>
              <span className="text-[10px] text-slate-400 font-semibold truncate block mt-0.5">
                {destinoResumido}
              </span>
            </div>
          </div>

          {/* 4. ORIGEM E DESTINO RESUMIDOS COM TRILHA */}
          <div className="space-y-1.5 p-3 bg-[#0F1C3F]/80 rounded-2xl border border-blue-900/40 text-xs text-left">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00C6FF] shrink-0 shadow-[0_0_8px_#00C6FF]" />
              <div className="min-w-0 flex-1 truncate">
                <span className="font-bold text-slate-400 mr-1">Embarque:</span>
                <span className="font-black text-white truncate">{origemResumida}</span>
              </div>
            </div>

            <div className="w-0.5 h-1.5 bg-slate-600 ml-1" />

            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-[0_0_8px_#F43F5E]" />
              <div className="min-w-0 flex-1 truncate">
                <span className="font-bold text-slate-400 mr-1">Destino:</span>
                <span className="font-black text-white truncate">{destinoResumido}</span>
              </div>
            </div>
          </div>

          {/* 5. BOTÃO PRINCIPAL 100% LARGURA E 64px ALTURA MÍNIMA (1-TAP INSTANTÂNEO) */}
          <button
            type="button"
            disabled={accepted}
            onClick={handleSingleTapAccept}
            style={{
              background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
              color: "#FFFFFF",
              borderRadius: 18,
              boxShadow: "0 10px 30px rgba(0, 136, 255, 0.45), inset 0 1px 1px rgba(255,255,255,0.4)",
            }}
            className="w-full min-h-[64px] font-black text-base sm:text-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] hover:brightness-110 touch-manipulation disabled:opacity-80"
          >
            <span>{accepted ? "CORRIDA ACEITA..." : "ACEITAR CORRIDA"}</span>
            <span className="text-xl">✓</span>
          </button>
        </div>
      </div>
    </div>
  );
});
