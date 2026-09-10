import React, { useMemo } from "react";
import { Zap } from "lucide-react";
import type { SenderType } from "@/services/ChatRealtimeService";

export interface SmartReplyChipsProps {
  userType: SenderType;
  rideStatus: string;
  onSelectReply: (replyText: string) => void;
  disabled?: boolean;
}

/**
 * Mapeamento dinâmico de sugestões contextuais por status da corrida e perfil do usuário
 */
export function getContextualReplies(userType: SenderType, rideStatus: string): string[] {
  const normStatus = (rideStatus || "").toUpperCase();

  // 1. Perfil MOTORISTA
  if (userType === "DRIVER") {
    if (normStatus === "A_CAMINHO" || normStatus === "ARRIVING" || normStatus === "ACEITA" || normStatus === "ACCEPTED") {
      return [
        "Estou chegando",
        "Trânsito intenso na via",
        "Chego em 2 minutos",
        "Aguarde no ponto",
      ];
    }
    if (normStatus === "CHEGOU" || normStatus === "WAITING") {
      return [
        "Estou no local",
        "Pisca-alerta ligado",
        "Pode vir com calma",
        "Em frente ao número",
        "Aguardando no portão",
      ];
    }
    if (normStatus === "EM_VIAGEM" || normStatus === "IN_PROGRESS") {
      return [
        "Rota calculada pelo app",
        "Ar-condicionado ligado",
        "Alguma preferência de caminho?",
        "Viagem tranquila!",
      ];
    }

    // Default Motorista
    return [
      "Estou chegando",
      "Estou no local",
      "Pode vir",
      "Trânsito intenso",
      "Aguarde 1 minuto",
    ];
  }

  // 2. Perfil PASSAGEIRO
  if (normStatus === "A_CAMINHO" || normStatus === "ARRIVING" || normStatus === "ACEITA" || normStatus === "ACCEPTED") {
    return [
      "Estou descendo",
      "Estou na portaria",
      "Camisa vermelha",
      "Aguardando na calçada",
      "Na esquina",
    ];
  }
  if (normStatus === "CHEGOU" || normStatus === "WAITING") {
    return [
      "Já estou saindo",
      "Estou no portão",
      "Avistei seu veículo!",
      "Aguarde 1 minuto, por favor",
      "Descendo o elevador",
    ];
  }
  if (normStatus === "EM_VIAGEM" || normStatus === "IN_PROGRESS") {
    return [
      "Tudo certo, obrigado!",
      "Pode ligar o ar, por favor?",
      "Pode seguir pelo mapa do app",
      "OK",
    ];
  }

  // Default Passageiro
  return [
    "Estou descendo",
    "Estou na portaria",
    "Camisa vermelha",
    "Já estou saindo",
    "OK",
  ];
}

export const SmartReplyChips: React.FC<SmartReplyChipsProps> = React.memo(
  ({ userType, rideStatus, onSelectReply, disabled = false }) => {
    const replies = useMemo(
      () => getContextualReplies(userType, rideStatus),
      [userType, rideStatus]
    );

    if (replies.length === 0) return null;

    return (
      <div className="w-full overflow-x-auto no-scrollbar py-2 px-3 border-t border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-1.5 min-w-max">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 pl-0.5 pr-1 select-none">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="hidden sm:inline">Rápidas:</span>
          </div>

          {replies.map((text, i) => (
            <button
              key={`${text}-${i}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelectReply(text)}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-800 hover:text-amber-950 text-xs font-semibold shadow-2xs active:scale-95 transition-all touch-manipulation whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    );
  }
);

SmartReplyChips.displayName = "SmartReplyChips";
