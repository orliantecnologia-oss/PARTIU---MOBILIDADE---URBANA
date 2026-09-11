import React, { memo } from "react";
import { CheckCircle2, Loader2, Radio, UserCheck, Clock } from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";

/**
 * ==============================================================================
 * ⏱️ PARTIU EXPERIENCE TIMELINE (FASE 3) — UBER / 99 STANDARD
 * ==============================================================================
 * Linha do tempo visual no card de busca com estados vivos e transições:
 * 1. Pedido criado (Check verde constante)
 * 2. Procurando motoristas (Check ou Spinner animado)
 * 3. [Nome] recebeu seu pedido (Indicador vivo de notificação e análise)
 * 4. [Nome] aceitou a corrida (Check de confirmação imediata)
 * ==============================================================================
 */
export const ExperienceTimeline = memo(function ExperienceTimeline() {
  const { state, progressiveSession } = usePassengerRide();

  const candidate = progressiveSession?.currentCandidate;
  const dispatchStatus = progressiveSession?.dispatchStatus;
  const firstName = candidate ? (candidate.name.split(" ")[0] ?? null) : null;

  const isAccepted =
    state === "DRIVER_ASSIGNED" ||
    state === "DRIVER_ARRIVING" ||
    state === "ON_TRIP" ||
    dispatchStatus === "ACCEPTED";
  const isNotified = Boolean(candidate) || dispatchStatus === "DRIVER_NOTIFIED" || dispatchStatus === "DRIVER_VIEWING";

  return (
    <div className="w-full py-2 px-1 text-left select-none">
      <div className="relative flex flex-col space-y-3">
        {/* Linha vertical conectora de fundo */}
        <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-slate-200" />

        {/* PASSO 1: Pedido Criado */}
        <div className="relative flex items-center gap-3">
          <div className="relative z-10 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 leading-tight">
              Pedido criado com sucesso
            </p>
            <span className="text-[10px] text-slate-600 font-medium">
              Rota e tarifa confirmadas
            </span>
          </div>
        </div>

        {/* PASSO 2: Procurando Motoristas */}
        <div className="relative flex items-center gap-3">
          <div
            className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shadow-xs transition-colors duration-300 ${
              isNotified || isAccepted
                ? "bg-emerald-500 text-white"
                : "bg-primary-600 text-slate-950 ring-4 ring-primary-600/20"
            }`}
          >
            {isNotified || isAccepted ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 leading-tight">
              Procurando motoristas próximos
            </p>
            <span className="text-[10px] text-slate-600 font-medium">
              {isNotified || isAccepted
                ? "Varredura de proximidade concluída"
                : "Analisando localização e disponibilidade..."}
            </span>
          </div>
        </div>

        {/* PASSO 3: Notificação do Motorista */}
        <div className="relative flex items-center gap-3">
          <div
            className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shadow-xs transition-colors duration-300 ${
              isAccepted
                ? "bg-emerald-500 text-white"
                : isNotified
                ? "bg-sky-500 text-white ring-4 ring-sky-400/30 animate-pulse"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {isAccepted ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : isNotified ? (
              <Radio className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-xs font-bold leading-tight ${
                isNotified || isAccepted ? "text-slate-800" : "text-slate-600"
              }`}
            >
              {firstName
                ? `${firstName} recebeu seu pedido`
                : "Notificando condutores elegíveis"}
            </p>
            <span className="text-[10px] text-slate-600 font-medium">
              {dispatchStatus === "DRIVER_VIEWING"
                ? `${firstName} está visualizando a rota e o destino...`
                : isNotified
                ? "Aguardando confirmação do motorista no radar..."
                : "Aguardando alocação do condutor mais próximo"}
            </span>
          </div>
        </div>

        {/* PASSO 4: Aceite do Motorista */}
        <div className="relative flex items-center gap-3">
          <div
            className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shadow-xs transition-colors duration-300 ${
              isAccepted
                ? "bg-emerald-500 text-white ring-4 ring-emerald-400/30 animate-bounce"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {isAccepted ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-xs font-bold leading-tight ${
                isAccepted ? "text-emerald-950 font-black" : "text-slate-600"
              }`}
            >
              {isAccepted
                ? firstName
                  ? `${firstName} aceitou sua corrida!`
                  : "Motorista a caminho!"
                : "Motorista confirmado"}
            </p>
            <span className="text-[10px] text-slate-600 font-medium">
              {isAccepted
                ? "Deslocando-se até o ponto de embarque"
                : "Aguardando confirmação final"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
