import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";
import type { TelemetriaVeiculo } from "@/lib/superadmin-config";

// Lazy load assíncrono do Mapbox GL (elimina 2.4 MB do bundle inicial da aplicação)
const MapboxLiveMap = lazy(() =>
  import("./MapboxLiveMap").then((m) => ({ default: m.MapboxLiveMap })),
);

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("[MapErrorBoundary] Interceptou falha no mapa:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface UniversalMapViewProps {
  className?: string | undefined;
  altura?: string | undefined;
  modo?: "vans" | "pontos" | "todos" | undefined;
  veiculos?: TelemetriaVeiculo[] | undefined;
  veiculoSelecionadoId?: string | null | undefined;
  pontoSelecionadoId?: string | null | undefined;
  onSelecionarVeiculo?: ((id: string) => void) | undefined;
  onSelecionarPonto?: ((id: string) => void) | undefined;
  mostrarControles?: boolean | undefined;
  mostrarCardInferior?: boolean | undefined;
}

function MapboxRadarSkeleton({
  altura = "h-full min-h-[240px]",
  className = "",
}: {
  altura?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full ${altura} ${className} rounded-3xl bg-slate-950 overflow-hidden flex flex-col items-center justify-center border border-slate-800/80 shadow-inner`}
    >
      {/* Círculos concêntricos do radar aeroespacial */}
      <div className="absolute h-56 w-56 rounded-full border border-emerald-500/20 animate-ping opacity-25" />
      <div className="absolute h-44 w-44 rounded-full border border-emerald-500/30" />
      <div className="absolute h-28 w-28 rounded-full border border-emerald-500/40" />

      {/* Ponto central pulsante */}
      <div className="relative flex items-center justify-center">
        <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.9)] animate-pulse" />
      </div>

      <div className="mt-4 text-center z-10 space-y-0.5 px-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
          Radar Satelital Starlink Ativo
        </p>
        <p className="text-[10px] text-slate-400 font-medium">
          Monitoramento e telemetria orbital
        </p>
      </div>
    </div>
  );
}

export function UniversalMapView({
  className = "",
  altura = "h-full min-h-[240px]",
  modo = "todos",
  veiculos,
  veiculoSelecionadoId,
  pontoSelecionadoId,
  onSelecionarVeiculo,
  onSelecionarPonto,
  mostrarCardInferior = true,
}: UniversalMapViewProps) {
  const fallback = <MapboxRadarSkeleton altura={altura} className={className} />;

  return (
    <MapErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <MapboxLiveMap
          className={className}
          altura={altura}
          modo={modo}
          veiculos={veiculos}
          vanSelecionadaId={veiculoSelecionadoId}
          pontoSelecionadoId={pontoSelecionadoId}
          onSelecionarVan={onSelecionarVeiculo}
          onSelecionarPonto={onSelecionarPonto}
          mostrarCardInferior={mostrarCardInferior}
        />
      </Suspense>
    </MapErrorBoundary>
  );
}
