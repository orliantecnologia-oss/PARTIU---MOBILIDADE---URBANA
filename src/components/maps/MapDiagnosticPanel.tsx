/**
 * ==============================================================================
 * 📊 PARTIU — MAP DIAGNOSTIC & OBSERVABILITY PANEL (ETAPA 9)
 * ==============================================================================
 * Painel técnico de observabilidade em tempo real de infraestrutura de mobilidade:
 * - GPS Accuracy (m)
 * - Drivers Online (Total) & Drivers no Viewport (Renderizados)
 * - Status do WebSocket Supabase Realtime
 * - Medição real de FPS via requestAnimationFrame
 * - Contador de requisições de mapas / rotas
 * - Latência do último evento de telemetria recebido
 * - Consumo de memória JS Heap
 * ==============================================================================
 */

import { useState, useEffect, useRef, memo } from "react";
import { Activity, X, ChevronDown, ChevronUp, Radio, Cpu, Gauge, Navigation } from "lucide-react";

export interface MapDiagnosticPanelProps {
  gpsAccuracyMeters?: number | null;
  driversOnlineCount?: number;
  driversInViewportCount?: number;
  websocketStatus?: "CONNECTED" | "CONNECTING" | "DISCONNECTED";
  lastRealtimeEventTimestamp?: number;
  mapboxRequestCount?: number;
  className?: string;
}

export const MapDiagnosticPanel = memo(function MapDiagnosticPanel({
  gpsAccuracyMeters = 8,
  driversOnlineCount = 0,
  driversInViewportCount = 0,
  websocketStatus = "CONNECTED",
  lastRealtimeEventTimestamp,
  mapboxRequestCount = 0,
  className = "",
}: MapDiagnosticPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fps, setFps] = useState(60);
  const [memoryMb, setMemoryMb] = useState<number | null>(null);
  const [lastEventAgoMs, setLastEventAgoMs] = useState<number>(0);

  // 1. MEDIDOR PRECISO DE FPS (requestAnimationFrame)
  const frameCountRef = useRef(0);
  const lastFpsCheckRef = useRef(performance.now());

  useEffect(() => {
    let animId: number;

    const measureFps = (now: number) => {
      frameCountRef.current++;
      const delta = now - lastFpsCheckRef.current;

      if (delta >= 1000) {
        const measuredFps = Math.round((frameCountRef.current * 1000) / delta);
        setFps(measuredFps);
        frameCountRef.current = 0;
        lastFpsCheckRef.current = now;

        // Mede JS Heap se suportado pelo navegador (Chrome/Edge/Blink)
        if (typeof window !== "undefined" && (window.performance as any)?.memory) {
          const heap = (window.performance as any).memory.usedJSHeapSize;
          if (heap) {
            setMemoryMb(Math.round(heap / (1024 * 1024)));
          }
        }
      }

      animId = requestAnimationFrame(measureFps);
    };

    animId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 2. CÁLCULO DO TEMPO DESDE O ÚLTIMO EVENTO REALTIME
  useEffect(() => {
    const iv = setInterval(() => {
      if (lastRealtimeEventTimestamp) {
        setLastEventAgoMs(Math.max(0, Date.now() - lastRealtimeEventTimestamp));
      }
    }, 500);
    return () => clearInterval(iv);
  }, [lastRealtimeEventTimestamp]);

  const getGpsQuality = (acc: number | null | undefined) => {
    if (acc === null || acc === undefined) return { label: "N/A", color: "text-slate-400" };
    if (acc <= 10) return { label: `±${acc.toFixed(1)}m (Excelente)`, color: "text-emerald-400" };
    if (acc <= 25) return { label: `±${acc.toFixed(1)}m (Bom)`, color: "text-blue-400" };
    return { label: `±${acc.toFixed(1)}m (Baixo)`, color: "text-amber-400" };
  };

  const gpsInfo = getGpsQuality(gpsAccuracyMeters);

  const getFpsColor = (val: number) => {
    if (val >= 55) return "text-emerald-400";
    if (val >= 40) return "text-amber-400";
    return "text-rose-500";
  };

  return (
    <div className={`fixed bottom-24 left-4 z-40 select-none ${className}`}>
      {/* BOTÃO FLUTUANTE RECOLHIDO */}
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white shadow-xl hover:bg-slate-900 active:scale-95 transition-all text-xs font-mono font-bold"
          title="Abrir Diagnóstico do Motor de Mapa"
        >
          <Activity className="w-3.5 h-3.5 text-[#0088FF] animate-pulse" />
          <span className={getFpsColor(fps)}>{fps} FPS</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400">{driversInViewportCount} carros</span>
        </button>
      ) : (
        /* PAINEL TÉCNICO EXPANDIDO */
        <div className="w-72 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 p-3.5 shadow-2xl text-white font-mono text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800/90">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#0088FF]" />
              <span className="font-black text-slate-100 tracking-wider text-[11px]">
                DIAGNÓSTICO GEOESPACIAL
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {/* FPS & WebGL */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-slate-500" />
                WebGL Framerate:
              </span>
              <span className={`font-black ${getFpsColor(fps)}`}>
                {fps} FPS {fps >= 55 ? "⚡" : "⚠️"}
              </span>
            </div>

            {/* GPS Accuracy */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-slate-500" />
                Acurácia GPS:
              </span>
              <span className={`font-bold ${gpsInfo.color}`}>{gpsInfo.label}</span>
            </div>

            {/* Drivers Online / Viewport */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Frota (Viewport / Total):</span>
              <span className="font-bold text-slate-200">
                <span className="text-emerald-400">{driversInViewportCount}</span> /{" "}
                {driversOnlineCount}
              </span>
            </div>

            {/* WebSocket Status */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-slate-500" />
                Realtime Channel:
              </span>
              <span
                className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                  websocketStatus === "CONNECTED"
                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-700/50"
                    : websocketStatus === "CONNECTING"
                    ? "bg-amber-950/80 text-amber-400 border border-amber-700/50"
                    : "bg-rose-950/80 text-rose-400 border border-rose-700/50"
                }`}
              >
                {websocketStatus}
              </span>
            </div>

            {/* Último Evento Realtime */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Último Ping Recebido:</span>
              <span className="text-slate-300">
                {lastRealtimeEventTimestamp
                  ? lastEventAgoMs < 1000
                    ? `${lastEventAgoMs}ms atrás`
                    : `${(lastEventAgoMs / 1000).toFixed(1)}s atrás`
                  : "Aguardando"}
              </span>
            </div>

            {/* Mapbox Requests */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Mapbox Requests:</span>
              <span className="text-slate-300">{mapboxRequestCount} ops</span>
            </div>

            {/* Consumo de Memória JS Heap */}
            {memoryMb !== null && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 text-[10px] flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-slate-500" />
                  JS Heap Memory:
                </span>
                <span className="text-slate-300 font-bold">{memoryMb} MB</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
