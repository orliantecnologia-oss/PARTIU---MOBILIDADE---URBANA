import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import {
  Compass,
  MapPin,
  Radio,
  Wifi,
  Locate,
  Sun,
  Moon,
  Globe,
  Gauge,
  Check,
  ChevronRight,
} from "lucide-react";
import { getPontosEmbarqueConfig, type PontoEmbarqueConfig } from "@/lib/pontos-embarque-store";
import type { TelemetriaVeiculo } from "@/lib/superadmin-config";

const MAPBOX_TOKEN =
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.["VITE_MAPBOX_TOKEN"] ||
      import.meta.env?.["VITE_MAPBOX_ACCESS_TOKEN"] ||
      import.meta.env?.["MAPBOX_TOKEN"])) ||
  (typeof process !== "undefined" &&
    (process.env?.["VITE_MAPBOX_TOKEN"] ||
      process.env?.["VITE_MAPBOX_ACCESS_TOKEN"] ||
      process.env?.["MAPBOX_TOKEN"])) ||
  "";

const ROTA_COORDS: [number, number][] = [
  [-36.6565, -10.1279], // Igreja Nova
  [-36.58, -10.29], // Trevo Penedo
  [-36.1756, -10.1256], // Coruripe
  [-35.908, -9.831], // Barra de São Miguel
  [-35.84, -9.7], // Praia do Francês
  [-35.75, -9.6], // Tabuleiro do Martins
  [-35.7255, -9.6459], // Maceió Centro
];

interface VanLive {
  id: string;
  placa: string;
  motorista: string;
  fotoMotorista: string;
  modelo: string;
  velocidadeKmH: number;
  previsaoMin: number;
  coords: [number, number];
  sentido: string;
}

export interface MapboxLiveMapProps {
  className?: string | undefined;
  altura?: string | undefined;
  modo?: "vans" | "pontos" | "todos" | undefined;
  veiculos?: TelemetriaVeiculo[] | undefined;
  vanSelecionadaId?: string | null | undefined;
  pontoSelecionadoId?: string | null | undefined;
  onSelecionarVan?: ((vanId: string) => void) | undefined;
  onSelecionarPonto?: ((pontoId: string) => void) | undefined;
  mostrarCardInferior?: boolean | undefined;
}

export function MapboxLiveMap({
  className = "",
  altura = "h-[460px]",
  modo = "todos",
  veiculos,
  vanSelecionadaId,
  pontoSelecionadoId,
  onSelecionarVan,
  onSelecionarPonto,
  mostrarCardInferior = true,
}: MapboxLiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [estiloMapa, setEstiloMapa] = useState<"night" | "satellite" | "light">("night");
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Mapear veículos reais vindos do Supabase com useMemo
  const vansParaExibir: VanLive[] = useMemo(() => {
    if (!veiculos || veiculos.length === 0) return [];
    return veiculos
      .filter((v) => v.lat && v.lng)
      .map((v) => ({
        id: v.id,
        placa: v.placa,
        motorista: v.motorista || "Motorista Cooperado",
        fotoMotorista:
          v.fotoMotorista ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        modelo: v.modelo,
        velocidadeKmH: v.velocidadeKmH,
        previsaoMin: v.previsaoChegadaMin || 15,
        coords: [v.lng, v.lat] as [number, number],
        sentido: v.linhaDestino ? `Sentido ${v.linhaDestino}` : "Em rota",
      }));
  }, [veiculos]);

  const [vanAtiva, setVanAtiva] = useState<VanLive | null>(() => vansParaExibir[0] ?? null);
  const [is3D, setIs3D] = useState(true);
  const [falhaMapa, setFalhaMapa] = useState(!MAPBOX_TOKEN);

  // Sincronizar vanAtiva quando os veículos do banco carregarem
  useEffect(() => {
    if (vansParaExibir.length > 0) {
      if (vanSelecionadaId) {
        const encontrada = vansParaExibir.find((v) => v.id === vanSelecionadaId);
        if (encontrada) setVanAtiva(encontrada);
      } else {
        setVanAtiva((prev) => prev ?? vansParaExibir[0] ?? null);
      }
    } else {
      setVanAtiva(null);
    }
  }, [vansParaExibir, vanSelecionadaId]);

  const mapStyles = {
    night: "mapbox://styles/mapbox/navigation-night-v1",
    satellite: "mapbox://styles/mapbox/satellite-streets-v12",
    light: "mapbox://styles/mapbox/navigation-day-v1",
  };

  useEffect(() => {
    if (!mapContainer.current) return;
    if (!MAPBOX_TOKEN) {
      setFalhaMapa(true);
      return;
    }

    let mapInstance: mapboxgl.Map;
    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyles[estiloMapa],
        center: [-35.85, -9.75],
        zoom: 9.6,
        pitch: is3D ? 48 : 0,
        bearing: is3D ? -15 : 0,
        attributionControl: false,
      });

      map.current = mapInstance;
    } catch (err) {
      console.warn("[Mapbox] Falha ao inicializar Mapbox GL:", err);
      setFalhaMapa(true);
      return;
    }

    mapInstance.on("load", () => {
      mapInstance.addSource("rota-coop", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: ROTA_COORDS,
          },
        },
      });

      mapInstance.addLayer({
        id: "rota-glow-outer",
        type: "line",
        source: "rota-coop",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#10b981",
          "line-width": 12,
          "line-opacity": 0.25,
          "line-blur": 6,
        },
      });

      mapInstance.addLayer({
        id: "rota-core",
        type: "line",
        source: "rota-coop",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#0d5930",
          "line-width": 3.5,
        },
      });

      const pontos = getPontosEmbarqueConfig().filter((p) => p.ativo);
      pontos.forEach((ponto: PontoEmbarqueConfig) => {
        if (!ponto.lat || !ponto.lng) return;

        const el = document.createElement("div");
        el.className = "ponto-embarque-marker cursor-pointer transition-transform";
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute h-4 w-4 rounded-full bg-primary-600 opacity-75"></span>
            <div class="h-8 w-8 rounded-2xl bg-gradient-to-tr from-[#0b2046] via-[#0d5930] to-emerald-600 border-2 border-primary-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/60 hover:scale-125 transition-transform">
              <span class="text-xs">🚏</span>
            </div>
          </div>
        `;

        el.addEventListener("click", () => {
          if (onSelecionarPonto) onSelecionarPonto(ponto.id);
          mapInstance.flyTo({
            center: [ponto.lng!, ponto.lat!],
            zoom: 13,
            speed: 1.2,
            pitch: 50,
          });
        });

        new mapboxgl.Marker(el).setLngLat([ponto.lng, ponto.lat]).addTo(mapInstance);
      });

      // Limpar marcadores anteriores
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      vansParaExibir.forEach((van) => {
        const el = document.createElement("div");
        el.className = "van-live-marker cursor-pointer relative group";
        el.innerHTML = `
          <div class="relative flex flex-col items-center justify-center">
            <span class="animate-ping absolute -inset-1 rounded-full bg-emerald-400 opacity-60"></span>
            <div class="relative flex items-center gap-1.5 bg-gradient-to-r from-[#0d5930] to-[#0b2046] text-white px-2 py-1 rounded-xl shadow-xl border border-primary-500 group-hover:scale-110 transition-transform">
              <div class="h-5 w-5 rounded-lg overflow-hidden shrink-0 ring-1 ring-white/50">
                <img src="${van.fotoMotorista}" class="h-full w-full object-cover" />
              </div>
              <div class="flex flex-col text-left leading-none">
                <span class="text-[9px] font-black text-primary-500">${van.placa}</span>
                <span class="text-[9px] font-bold text-white">${van.velocidadeKmH} km/h</span>
              </div>
            </div>
          </div>
        `;

        el.addEventListener("click", () => {
          setVanAtiva(van);
          if (onSelecionarVan) onSelecionarVan(van.id);
          mapInstance.flyTo({
            center: van.coords,
            zoom: 13,
            speed: 1.2,
            pitch: 55,
          });
        });

        const marker = new mapboxgl.Marker(el).setLngLat(van.coords).addTo(mapInstance);
        markersRef.current.push(marker);
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapInstance.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estiloMapa, is3D, veiculos]);

  useEffect(() => {
    if (!map.current || !pontoSelecionadoId) return;
    const pontos = getPontosEmbarqueConfig();
    const ponto = pontos.find((p) => p.id === pontoSelecionadoId);
    if (ponto?.lat && ponto?.lng) {
      map.current.flyTo({
        center: [ponto.lng, ponto.lat],
        zoom: 13,
        speed: 1.2,
        pitch: 50,
      });
    }
  }, [pontoSelecionadoId]);

  useEffect(() => {
    if (!map.current || !vanSelecionadaId) return;
    const van = vansParaExibir.find((v) => v.id === vanSelecionadaId);
    if (van) {
      setVanAtiva(van);
      map.current.flyTo({
        center: van.coords,
        zoom: 13,
        speed: 1.2,
        pitch: 55,
      });
    }
  }, [vanSelecionadaId, vansParaExibir]);

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-slate-950 ${altura} ${className}`}
    >
      {falhaMapa ? (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-4 text-center overflow-hidden">
          {/* Fundo Aeroespacial & Radar */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d593018_1px,transparent_1px),linear-gradient(to_bottom,#0d593018_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          <div className="absolute h-64 w-64 rounded-full border border-emerald-500/20 animate-ping opacity-20 pointer-events-none" />
          <div className="absolute h-48 w-48 rounded-full border border-emerald-500/30 pointer-events-none" />
          <div className="absolute h-32 w-32 rounded-full border border-emerald-500/40 pointer-events-none" />
          <div className="absolute h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] pointer-events-none" />

          <div className="relative z-10 space-y-3 max-w-sm w-full">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Radar Satelital Starlink Ativo
            </div>

            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-white">Telemetria da Frota em Tempo Real</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Vans monitoradas no corredor Alagoas ➔ Pernambuco via coordenadas GPS.
              </p>
            </div>

            {/* Listagem rápida de vans ativas */}
            {vansParaExibir.length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-left pt-1">
                {vansParaExibir.slice(0, 2).map((van) => (
                  <div
                    key={van.id}
                    onClick={() => {
                      setVanAtiva(van);
                      onSelecionarVan?.(van.id);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      vanAtiva?.id === van.id
                        ? "bg-emerald-950/80 border-emerald-500/60 text-white shadow-sm"
                        : "bg-slate-900/80 border-white/10 text-slate-300 hover:border-emerald-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-primary-500">{van.placa}</span>
                      <span className="text-[9px] font-bold text-emerald-400">
                        {van.velocidadeKmH} km/h
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-300 truncate mt-0.5">
                      {van.motorista}
                    </p>
                    <span className="text-[9px] text-slate-400 block truncate">{van.sentido}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <span>Para mapa 3D: adicione</span>
              <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-white/10 font-mono">
                VITE_MAPBOX_TOKEN
              </code>
            </div>
          </div>
        </div>
      ) : (
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      )}

      {/* Controles Flutuantes Direita: Temas & 3D (Touch target acessível >= 36px) */}
      {!falhaMapa && (
        <div className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-20 flex flex-col gap-2 items-center pointer-events-auto">
          <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-950/90 backdrop-blur-md p-1.5 border border-white/20 shadow-xl">
            <button
              type="button"
              onClick={() => setEstiloMapa("night")}
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-all ${
                estiloMapa === "night"
                  ? "bg-emerald-600 text-white shadow-xs scale-105"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Noturno VIP"
              aria-label="Mapa Noturno"
            >
              <Moon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setEstiloMapa("satellite")}
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-all ${
                estiloMapa === "satellite"
                  ? "bg-emerald-600 text-white shadow-xs scale-105"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Satélite HD"
              aria-label="Mapa Satélite"
            >
              <Globe className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setEstiloMapa("light")}
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-all ${
                estiloMapa === "light"
                  ? "bg-emerald-600 text-white shadow-xs scale-105"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Modo Claro"
              aria-label="Mapa Claro"
            >
              <Sun className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIs3D((prev) => !prev)}
            className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl backdrop-blur-md shadow-lg border transition-all ${
              is3D
                ? "bg-[#0d5930] text-emerald-200 border-emerald-400 scale-105"
                : "bg-slate-950/85 text-slate-300 border-white/10"
            }`}
            title="Alternar 3D"
            aria-label="Alternar Perspectiva 3D"
          >
            <Compass className="h-4.5 w-4.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (map.current && vanAtiva) {
                map.current.flyTo({
                  center: vanAtiva.coords,
                  zoom: 13,
                  speed: 1.2,
                  pitch: is3D ? 55 : 0,
                });
              }
            }}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-950/85 backdrop-blur-md text-emerald-400 shadow-lg border border-white/10 hover:scale-105 active:scale-95 transition-all"
            title="Centralizar na Van"
            aria-label="Centralizar na Van"
          >
            <Locate className="h-4.5 w-4.5" />
          </button>
        </div>
      )}

      {mostrarCardInferior && vanAtiva && (
        <div className="absolute bottom-2.5 inset-x-2.5 z-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-950/90 backdrop-blur-xl px-3 py-2 border border-white/15 shadow-2xl text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative h-8 w-8 shrink-0 rounded-xl overflow-hidden ring-1 ring-emerald-400/50 shadow-xs">
                <img
                  src={vanAtiva.fotoMotorista}
                  alt={vanAtiva.motorista}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <strong className="text-xs font-black text-white truncate block">
                    {vanAtiva.motorista}
                  </strong>
                  <span className="text-[10px] text-primary-500 font-bold">{vanAtiva.placa}</span>
                </div>
                <span className="text-[10px] text-slate-300 truncate block">
                  {vanAtiva.sentido} • {vanAtiva.velocidadeKmH} km/h
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
