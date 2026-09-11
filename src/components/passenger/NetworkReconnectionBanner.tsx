import React, { memo, useEffect, useState } from "react";
import { Loader2, CheckCircle2, WifiOff, RefreshCw } from "lucide-react";
import { RealtimeConnectionManager, type ConnectionState } from "@/services/RealtimeConnectionManager";

/**
 * ==============================================================================
 * 📶 PARTIU NETWORK RECONNECTION BANNER (FASE 7) — ZERO ANXIETY RESILIENCE
 * ==============================================================================
 * Banner flutuante inteligente de resiliência de rede:
 * - Se desconectado/recarregando: "Reconectando... Sua busca continua ativa."
 * - Ao restabelecer a conexão: "Conectado com sucesso" (verde, dura 2s e desaparece)
 * - Mantém todo o estado local de busca e corrida intacto.
 * ==============================================================================
 */
export const NetworkReconnectionBanner = memo(function NetworkReconnectionBanner() {
  const [connState, setConnState] = useState<ConnectionState>("CONNECTED");
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    const manager = RealtimeConnectionManager.getInstance();

    const unsubscribe = manager.onStateChange((state) => {
      setConnState((prev) => {
        if ((prev === "RECONNECTING" || prev === "DISCONNECTED" || prev === "ERROR") && state === "CONNECTED") {
          setShowRestored(true);
          setTimeout(() => setShowRestored(false), 2000);
        }
        return state;
      });
    });

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  // Dispara o alerta de reconexão apenas se o dispositivo estiver genuinamente sem conexão física/dados
  const isDisconnected = !isOnline;

  // Não exibe nada se a conexão estiver normal e não estiver mostrando o banner de "restaurado"
  if (!isDisconnected && !showRestored) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        zIndex: 9999,
        elevation: 40,
      } as React.CSSProperties}
      className="inset-x-0 max-w-xs mx-auto px-2 pointer-events-none animate-in slide-in-from-top-2 fade-in duration-200 select-none"
    >
      {isDisconnected ? (
        <div className="w-full bg-primary-600 text-slate-950 font-black text-xs rounded-2xl shadow-xl border border-amber-600/40 px-3.5 py-2 flex items-center justify-between gap-2.5 backdrop-blur-md pointer-events-auto">
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin text-slate-950 shrink-0" />
            <span className="truncate text-[11px]">
              Reconectando... Sua busca continua ativa.
            </span>
          </div>
          <WifiOff className="w-3.5 h-3.5 text-slate-900/80 shrink-0" />
        </div>
      ) : (
        <div className="w-full bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-xl border border-emerald-500/50 px-3.5 py-2 flex items-center justify-center gap-2 backdrop-blur-md pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span className="text-[11px] tracking-wide">Conexão restabelecida</span>
        </div>
      )}
    </div>
  );
});
