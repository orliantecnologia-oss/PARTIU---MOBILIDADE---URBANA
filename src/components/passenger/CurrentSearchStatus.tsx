import React, { memo } from "react";
import { CheckCircle2, Loader2, Bell } from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";

/**
 * ==============================================================================
 * 🎯 PARTIU CURRENT SEARCH STATUS (SINGLE DYNAMIC ROW)
 * ==============================================================================
 * Bloco único, enxuto e reativo de feedback da busca.
 * Substitui steppers verticais extensos exibindo apenas o estado ATUAL da busca:
 * - Estado 1 (Inicialização): Pedido criado com sucesso / Iniciando radar...
 * - Estado 2 (Busca Ativa): Procurando motoristas próximos / Analisando localização e disponibilidade...
 * - Estado 3 (Notificando): Notificando condutores elegíveis / Aguardando alocação do condutor...
 * ==============================================================================
 */
export const CurrentSearchStatus = memo(function CurrentSearchStatus() {
  const { state, progressiveSession } = usePassengerRide();

  const candidate = progressiveSession?.currentCandidate;
  const dispatchStatus = progressiveSession?.dispatchStatus;
  const firstName = candidate ? (candidate.name.split(" ")[0] ?? "Motorista") : null;

  // Estado 1: Inicialização (REQUESTED ou primeiros 2s da Onda 1 sem candidato)
  const isInitializing =
    state === "REQUESTED" ||
    (progressiveSession?.currentWave === 1 &&
      (progressiveSession?.waveSecondsRemaining ?? 20) >= 18 &&
      !candidate);

  // Estado 3: Notificando condutor específico
  const isNotifying =
    Boolean(candidate) ||
    dispatchStatus === "DRIVER_NOTIFIED" ||
    dispatchStatus === "DRIVER_VIEWING";

  // Determina conteúdo de acordo com o estado
  let icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
  let iconBg = "bg-emerald-50 text-emerald-600 border-emerald-200/80";
  let title = "Pedido criado com sucesso";
  let subtitle = "Iniciando radar...";
  let badgeRight: React.ReactNode = null;

  if (isNotifying) {
    // Estado 3: Notificando condutor elegível
    icon = <Bell className="w-5 h-5 text-sky-600 animate-pulse" />;
    iconBg = "bg-sky-50 text-sky-600 border-sky-200/80";
    title = firstName
      ? `${firstName} recebeu seu pedido`
      : "Notificando condutores elegíveis";
    subtitle =
      dispatchStatus === "DRIVER_VIEWING" && firstName
        ? `${firstName} está verificando a rota...`
        : "Aguardando alocação do condutor...";

    if (progressiveSession?.cascadeSecondsRemaining !== undefined) {
      badgeRight = (
        <span className="shrink-0 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-black border border-sky-200 shadow-2xs">
          {progressiveSession.cascadeSecondsRemaining}s
        </span>
      );
    }
  } else if (!isInitializing) {
    // Estado 2: Busca Ativa (status padrão durante as ondas de varredura)
    icon = <Loader2 className="w-5 h-5 text-primary-700 animate-spin" />;
    iconBg = "bg-primary-50 text-primary-700 border-amber-200/80";
    title = "Procurando motoristas próximos";
    subtitle = "Analisando localização e disponibilidade...";
  }

  return (
    <div className="w-full p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-3 animate-in fade-in duration-200 select-none">
      {/* Ícone de Status Dinâmico */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${iconBg}`}
        >
          {icon}
        </div>

        {/* Título e Subtítulo */}
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-black text-slate-900 leading-tight truncate">
            {title}
          </h4>
          <p className="text-[11px] text-slate-600 font-medium leading-tight truncate mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Badge Lateral Opcional (timer regressivo do condutor atual) */}
      {badgeRight}
    </div>
  );
});
