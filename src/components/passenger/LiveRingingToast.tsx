import React, { memo } from "react";
import { Star, MapPin, Eye, PhoneCall, RefreshCw, Clock } from "lucide-react";
import { useDriverSearchRealtime } from "@/hooks/useDriverSearchRealtime";

/**
 * ==============================================================================
 * 🔔 PARTIU LIVE RINGING TOAST (FASE 7) — 99/UBER DYNAMIC TOP MODAL
 * ==============================================================================
 * Floating card no topo da tela acionado quando um condutor específico recebe a chamada.
 * Totalmente desacoplado e conectado ao hook useDriverSearchRealtime:
 * - Exibe foto, primeiro nome, nota, veículo, ETA e micro-status em tempo real
 * - Transição suave entre condutores (sem flickering nem reload visual)
 * - Camada forense garantida: zIndex 9999 + elevation 40
 * ==============================================================================
 */
export const LiveRingingToast = memo(function LiveRingingToast() {
  const { isSearching, currentDriver, isTransitioning, hasActiveDriver } = useDriverSearchRealtime();

  if (!isSearching || !hasActiveDriver || !currentDriver) return null;

  const {
    firstName,
    avatarUrl,
    rating,
    distanceKm,
    etaMinutes,
    vehicleModel,
    dispatchStatus,
    cascadeSecondsRemaining,
  } = currentDriver;

  let statusText = `${firstName} está analisando seu pedido...`;
  let statusIcon = <PhoneCall className="w-3.5 h-3.5 text-amber-400 animate-pulse" />;
  let badgeColor = "bg-amber-500/20 text-amber-300 border-amber-400/30";

  if (dispatchStatus === "DRIVER_VIEWING") {
    statusText = `${firstName} está verificando a rota...`;
    statusIcon = <Eye className="w-3.5 h-3.5 text-sky-400 animate-pulse" />;
    badgeColor = "bg-sky-500/20 text-sky-300 border-sky-400/30";
  } else if (dispatchStatus === "DRIVER_DECLINED") {
    statusText = "Buscando outro motorista disponível...";
    statusIcon = <RefreshCw className="w-3.5 h-3.5 text-rose-400 animate-spin" />;
    badgeColor = "bg-rose-500/20 text-rose-300 border-rose-400/30";
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 16px)",
        zIndex: 9999,
        elevation: 40,
      } as React.CSSProperties}
      className={`inset-x-0 max-w-sm mx-auto px-3 pointer-events-none transition-all duration-300 ${
        isTransitioning ? "opacity-75 scale-[0.98]" : "opacity-100 scale-100"
      }`}
    >
      <div className="w-full bg-slate-950/95 text-white rounded-2xl shadow-2xl border border-amber-400/60 p-3 backdrop-blur-md flex items-center justify-between gap-3 pointer-events-auto select-none ring-1 ring-black/40">
        {/* Foto do Motorista com Indicador Radar */}
        <div className="relative shrink-0">
          <img
            src={avatarUrl}
            alt={firstName}
            className="w-11 h-11 rounded-xl object-cover border border-white/20 shadow-sm"
          />
          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400 border border-slate-900" />
          </span>
        </div>

        {/* Informações Centrais */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-black text-white leading-tight truncate">
              {firstName}
            </h4>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1 rounded flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-amber-300" />
              {rating.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold truncate flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5 text-amber-400" />
              ~{etaMinutes} min
            </span>
          </div>

          <p className="text-[11px] font-bold text-amber-200 mt-0.5 truncate flex items-center gap-1">
            {statusIcon}
            <span>{statusText}</span>
          </p>

          <span className="text-[9.5px] text-slate-400 block truncate mt-0.5">
            {vehicleModel} • {distanceKm} km
          </span>
        </div>

        {/* Timer da Cascata */}
        <div className="shrink-0 text-right">
          <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${badgeColor}`}>
            {cascadeSecondsRemaining}s
          </span>
        </div>
      </div>
    </div>
  );
});

