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

import React, { useEffect, useState } from "react";
import { Star, MapPin, Navigation, X } from "lucide-react";
import { callAlertService } from "@/services/CallAlertService";

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

export function DriverOfferModal({
  oferta,
  onAceitar,
  onRecusar,
  countdownSeconds = 10,
}: DriverOfferModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds);

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

  // FASE 1: Formatação de Pickup ETA e Rentabilidade (Padrão Uber / 99)
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.4)] border border-slate-200 overflow-hidden text-slate-900 animate-in slide-in-from-bottom duration-300">
        
        {/* 1. BARRA DE PROGRESSO DO COUNTDOWN DE 10s */}
        <div className="w-full h-2 bg-slate-100 overflow-hidden relative">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              secondsRemaining <= 3 ? "bg-red-500" : secondsRemaining <= 6 ? "bg-primary-600" : "bg-emerald-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="p-5 sm:p-6 space-y-3.5">
          {/* Header Superior: Nota do Passageiro, Badge Rentabilidade e Contador */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary-50 border border-amber-200 rounded-full text-amber-900 text-xs font-black">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-primary-600" />
              <span>{notaFormatada}</span>
              <span className="text-slate-400 font-normal ml-0.5">• {oferta.passageiro.split(" ")[0]}</span>
            </div>

            {/* BADGE DE RENTABILIDADE R$/km (Decisão Rápida do Condutor) */}
            <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-full text-emerald-800 text-[11px] font-black tracking-tight flex items-center gap-1">
              <span>⚡</span>
              <span>{ganhoPorKmTexto}</span>
            </div>

            <div className="flex items-center gap-1">
              <div className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                <span>{secondsRemaining}s</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  callAlertService.stopAlert();
                  onRecusar();
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition active:scale-90 cursor-pointer"
                title="Recusar corrida"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. VALOR LÍQUIDO EM DESTAQUE ABSOLUTO */}
          <div className="text-center py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Você recebe líquido
            </span>
            <div className="text-4xl sm:text-5xl font-black text-slate-950 tracking-tight mt-0.5">
              {oferta.valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </div>

          {/* FASE 1: BLOCOS 1 E 2 — ATÉ O PASSAGEIRO E VIAGEM */}
          <div className="grid grid-cols-2 gap-2">
            {/* BLOCO 1: ATÉ O PASSAGEIRO */}
            <div className="p-3 bg-primary-50/70 border border-amber-200/80 rounded-2xl">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-900">
                <Navigation className="w-3 h-3 text-primary-700" />
                <span>Até o Passageiro</span>
              </div>
              <div className="text-sm font-black text-slate-950 mt-1">
                {tempoEmbarqueMin} min • {distanciaEmbarqueTexto}
              </div>
              <span className="text-[10px] text-amber-800 font-semibold truncate block mt-0.5">
                {origemResumida}
              </span>
            </div>

            {/* BLOCO 2: VIAGEM */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>Viagem</span>
              </div>
              <div className="text-sm font-black text-slate-950 mt-1">
                {tempoViagemMin} min • {distanciaViagemTexto}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold truncate block mt-0.5">
                {destinoResumido}
              </span>
            </div>
          </div>

          {/* 3. ORIGEM E DESTINO RESUMIDOS COM TRILHA */}
          <div className="space-y-1.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0 flex-1 truncate">
                <span className="font-bold text-slate-400 mr-1">Embarque:</span>
                <span className="font-black text-slate-900 truncate">{origemResumida}</span>
              </div>
            </div>

            <div className="w-0.5 h-1.5 bg-slate-300 ml-1" />

            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <div className="min-w-0 flex-1 truncate">
                <span className="font-bold text-slate-400 mr-1">Destino:</span>
                <span className="font-black text-slate-900 truncate">{destinoResumido}</span>
              </div>
            </div>
          </div>

          {/* 4. BOTÃO PRINCIPAL 100% LARGURA E 64px ALTURA MÍNIMA */}
            <button
              type="button"
              onClick={() => {
                callAlertService.stopAlert();
                onAceitar();
              }}
              style={{
                background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
                color: "#FFFFFF",
                borderRadius: 16,
                boxShadow: "0 10px 28px -4px rgba(0, 51, 102, 0.4), 0 4px 12px -2px rgba(0, 136, 255, 0.3)",
              }}
              className="w-full min-h-[64px] font-bold text-base sm:text-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] hover:brightness-105"
            >
              <span>ACEITAR CORRIDA</span>
              <span className="text-xl">✓</span>
            </button>
        </div>
      </div>
    </div>
  );
}
