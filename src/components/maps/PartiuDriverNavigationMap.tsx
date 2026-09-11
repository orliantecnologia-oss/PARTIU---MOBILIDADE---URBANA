import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Navigation, Compass, ExternalLink, MapPin, Gauge, Flame } from "lucide-react";
import { mapboxService } from "@/services/MapboxService";
import { directionsService } from "@/services/DirectionsService";
import { calculateBearing } from "@/utils/gis-interpolation";
import { silentCatchWarn } from "@/lib/structured-logger";
import { DriverLocationService } from "@/services/DriverLocationService";
import { MapboxConfig } from "@/config/MapboxConfig";
import { h3DemandHeatmapEngine } from "@/lib/spatial";

const MAPBOX_TOKEN = MapboxConfig.getAccessToken();

export interface PartiuDriverNavigationMapProps {
  estado:
    | "IDLE"
    | "OFFER"
    | "HEADING_TO_PICKUP"
    | "ACCEPTED"
    | "WAITING_PIN"
    | "IN_PROGRESS"
    | "IN_TRANSIT";
  origemEndereco?: string | undefined;
  destinoEndereco?: string | undefined;
  driverCoords?: [number, number] | undefined;
  pickupCoords?: [number, number] | undefined;
  destinationCoords?: [number, number] | undefined;
  routeCoordinates?: [number, number][] | undefined;
  modoNoturno?: boolean | undefined;
  className?: string | undefined;
}

export function PartiuDriverNavigationMap({
  estado,
  origemEndereco = "Local de Embarque",
  destinoEndereco = "Destino do Passageiro",
  driverCoords,
  pickupCoords,
  destinationCoords,
  routeCoordinates,
  modoNoturno = false,
  className = "",
}: PartiuDriverNavigationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const targetMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Telemetria física real do motorista
  const [currentDriverPos, setCurrentDriverPos] = useState<[number, number]>(() => driverCoords || [0, 0]);
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);

  // Rota ativa calculada pela Mapbox Directions API
  const [activeRouteCoords, setActiveRouteCoords] = useState<[number, number][]>([]);

  // 1. SINCRONIZAÇÃO DE COORDENADAS REAIS DO MOTORISTA VIA DRIVERLOCATIONSERVICE & PROPS
  useEffect(() => {
    if (driverCoords && (driverCoords[0] !== 0 || driverCoords[1] !== 0)) {
      setCurrentDriverPos(driverCoords);
    }
  }, [driverCoords]);

  useEffect(() => {
    const driverLocService = DriverLocationService.getInstance();
    const unsubscribe = driverLocService.onLocationUpdate((payload) => {
      if (payload.lng && payload.lat && (payload.lng !== 0 || payload.lat !== 0)) {
        setCurrentDriverPos([payload.lng, payload.lat]);
        if (typeof payload.heading === "number") {
          setCurrentHeading(payload.heading);
        }
        if (typeof payload.speedKmh === "number") {
          setCurrentSpeed(payload.speedKmh);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 2. INICIALIZAR MAPBOX VEICULAR 3D
  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      const hasValidToken = MapboxConfig.hasValidToken();
      if (hasValidToken && MAPBOX_TOKEN) {
        mapboxgl.accessToken = MAPBOX_TOKEN;
      }

      const initialCenter: [number, number] =
        currentDriverPos[0] !== 0 && currentDriverPos[1] !== 0
          ? currentDriverPos
          : MapboxConfig.DEFAULT_CENTER;

      const initialStyle = hasValidToken
        ? (modoNoturno ? "mapbox://styles/mapbox/dark-v11" : mapboxService.getStyleUrl("streets"))
        : mapboxService.getOpenStreetMapStyle();

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: initialStyle,
        center: initialCenter,
        zoom: 16.5,
        pitch: estado === "HEADING_TO_PICKUP" || estado === "IN_PROGRESS" ? 55 : 0,
        bearing: currentHeading || 0,
        attributionControl: false,
      });

      map.on("load", () => {
        if (hasValidToken) {
          mapboxService.applyUberCleanFilters(map);
        }
        setMapLoaded(true);
        mapRef.current = map;

        // Camada GeoJSON da Rota de Navegação
        map.addSource("driver-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [],
            },
          },
        });

        // Contorno da linha de navegação
        map.addLayer({
          id: "driver-route-border",
          type: "line",
          source: "driver-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#000000",
            "line-width": 9,
            "line-opacity": 0.4,
          },
        });

        // Linha interna de navegação (Verde GPS / Amarelo)
        map.addLayer({
          id: "driver-route-active",
          type: "line",
          source: "driver-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#10B981",
            "line-width": 6,
            "line-opacity": 0.95,
          },
        });

        // Camada Térmica de Demanda Hexagonal H3 (Resolução 8)
        try {
          const demandGeoJson = h3DemandHeatmapEngine.generateDemandHeatmapGeoJson();
          map.addSource("h3-demand-source", {
            type: "geojson",
            data: demandGeoJson,
          });

          map.addLayer({
            id: "h3-demand-fill",
            type: "fill",
            source: "h3-demand-source",
            paint: {
              "fill-color": ["get", "fillColor"],
              "fill-opacity": ["get", "fillOpacity"],
            },
          });

          map.addLayer({
            id: "h3-demand-outline",
            type: "line",
            source: "h3-demand-source",
            paint: {
              "line-color": ["get", "fillColor"],
              "line-width": 1.5,
              "line-opacity": 0.8,
            },
          });
        } catch (err) {
          silentCatchWarn("PartiuDriverNavigationMap.h3Demand", err);
        }
      });
    } catch (e) {
      console.warn("[PartiuDriverMap] Erro de inicialização do Mapbox:", e);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 3. MARCADOR VEICULAR 3D DO MOTORISTA (ATUALIZADO POR SATÉLITE REAL)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (currentDriverPos[0] === 0 && currentDriverPos[1] === 0) return;

    if (!driverMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "flex items-center justify-center transition-transform duration-300";
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-12 h-12 rounded-full bg-emerald-500/20 animate-ping absolute"></div>
          <div class="w-10 h-10 rounded-2xl bg-[#0088FF] text-slate-950 border-2 border-white shadow-2xl flex items-center justify-center transform rotate-45">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
        </div>
      `;

      driverMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(currentDriverPos)
        .addTo(map);
    } else {
      driverMarkerRef.current.setLngLat(currentDriverPos);
    }
  }, [mapLoaded, currentDriverPos]);

  // 4. OBTENÇÃO DA ROTA REAL MAPBOX (driving-traffic) SEM DADOS SINTÉTICOS
  useEffect(() => {
    let cancel = false;
    const isHeading = estado === "HEADING_TO_PICKUP" || estado === "ACCEPTED" || estado === "WAITING_PIN";
    const isInTrip = estado === "IN_PROGRESS" || estado === "IN_TRANSIT";

    const validDriverCoords = currentDriverPos[0] !== 0 && currentDriverPos[1] !== 0 ? currentDriverPos : undefined;

    if (isHeading && validDriverCoords && pickupCoords) {
      directionsService
        .getRoute(validDriverCoords, pickupCoords)
        .then((res) => {
          if (!cancel && res.coordinates && res.coordinates.length >= 2) {
            setActiveRouteCoords(res.coordinates);
          }
        })
        .catch(() => {});
    } else if (isInTrip) {
      if (routeCoordinates && routeCoordinates.length >= 2) {
        setActiveRouteCoords(routeCoordinates);
      } else if (validDriverCoords && destinationCoords) {
        directionsService
          .getRoute(validDriverCoords, destinationCoords)
          .then((res) => {
            if (!cancel && res.coordinates && res.coordinates.length >= 2) {
              setActiveRouteCoords(res.coordinates);
            }
          })
          .catch(() => {});
      }
    } else {
      setActiveRouteCoords([]);
    }

    return () => {
      cancel = true;
    };
  }, [estado, currentDriverPos, pickupCoords, destinationCoords, routeCoordinates]);

  // 5. ATUALIZAÇÃO REATIVA DE CÂMERA 3D E LINHA DE NAVEGAÇÃO
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const routeSource = map.getSource("driver-route") as mapboxgl.GeoJSONSource | undefined;
    const isHeading = estado === "HEADING_TO_PICKUP" || estado === "ACCEPTED" || estado === "WAITING_PIN";
    const isInTrip = estado === "IN_PROGRESS" || estado === "IN_TRANSIT";

    if (isHeading) {
      try {
        map.setPaintProperty("driver-route-active", "line-color", "#10B981");
      } catch (err) { silentCatchWarn("PartiuDriverNavigationMap", err); }

      if (routeSource && activeRouteCoords.length >= 2) {
        routeSource.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: activeRouteCoords },
        });
      }

      // Marcador de Embarque
      if (pickupCoords) {
        if (!targetMarkerRef.current) {
          const el = document.createElement("div");
          el.className =
            "px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl border-2 border-white flex items-center gap-1 select-none";
          el.innerHTML = `<span>👤 Embarque</span>`;
          targetMarkerRef.current = new mapboxgl.Marker({ element: el })
            .setLngLat(pickupCoords)
            .addTo(map);
        } else {
          targetMarkerRef.current.setLngLat(pickupCoords);
        }
      }

      if (currentDriverPos[0] !== 0 && currentDriverPos[1] !== 0) {
        map.easeTo({
          center: currentDriverPos,
          zoom: 16.5,
          pitch: 55,
          bearing: currentHeading,
          duration: 600,
        });
      }
    } else if (isInTrip) {
      try {
        map.setPaintProperty("driver-route-active", "line-color", "#2563EB");
      } catch (err) { silentCatchWarn("PartiuDriverNavigationMap", err); }

      if (routeSource && activeRouteCoords.length >= 2) {
        routeSource.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: activeRouteCoords },
        });
      }

      // Marcador de Destino
      if (destinationCoords) {
        if (!targetMarkerRef.current) {
          const el = document.createElement("div");
          el.className =
            "px-2.5 py-1 rounded-xl bg-blue-600 text-white font-black text-xs shadow-2xl border-2 border-white flex items-center gap-1 select-none";
          el.innerHTML = `<span>🏁 Destino</span>`;
          targetMarkerRef.current = new mapboxgl.Marker({ element: el })
            .setLngLat(destinationCoords)
            .addTo(map);
        } else {
          targetMarkerRef.current.setLngLat(destinationCoords);
        }
      }

      if (currentDriverPos[0] !== 0 && currentDriverPos[1] !== 0) {
        map.easeTo({
          center: currentDriverPos,
          zoom: 16.5,
          pitch: 55,
          bearing: currentHeading,
          duration: 600,
        });
      }
    } else if (estado === "OFFER" && activeRouteCoords.length >= 2) {
      if (routeSource) {
        routeSource.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: activeRouteCoords,
          },
        });
      }

      const bounds = new mapboxgl.LngLatBounds();
      activeRouteCoords.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 260, left: 50, right: 50 },
        duration: 1000,
      });
    } else {
      // Modo IDLE
      if (targetMarkerRef.current) {
        targetMarkerRef.current.remove();
        targetMarkerRef.current = null;
      }
      if (routeSource) {
        routeSource.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        });
      }

      if (currentDriverPos[0] !== 0 && currentDriverPos[1] !== 0) {
        map.easeTo({
          center: currentDriverPos,
          zoom: 16.5,
          pitch: 0,
          bearing: 0,
          duration: 800,
        });
      }
    }
  }, [mapLoaded, estado, activeRouteCoords, currentDriverPos, currentHeading, pickupCoords, destinationCoords]);

  // 3.1 VISIBILIDADE DO HEATMAP DE DEMANDA H3 (ATIVO EM IDLE / BUSCA DE CORRIDA)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const isDemandVisible = estado === "IDLE" || estado === "OFFER";
    try {
      if (map.getLayer("h3-demand-fill")) {
        map.setLayoutProperty("h3-demand-fill", "visibility", isDemandVisible ? "visible" : "none");
      }
      if (map.getLayer("h3-demand-outline")) {
        map.setLayoutProperty("h3-demand-outline", "visibility", isDemandVisible ? "visible" : "none");
      }
    } catch (err) {
      silentCatchWarn("PartiuDriverNavigationMap.h3Visibility", err);
    }
  }, [mapLoaded, estado]);

  // Abertura nativa no Waze com coordenadas reais da corrida
  function handleAbrirWaze() {
    const target = pickupCoords || destinationCoords;
    if (!target) return;
    window.open(`https://waze.com/ul?ll=${target[1]},${target[0]}&navigate=yes`, "_blank");
  }

  // Abertura nativa no Google Maps com coordenadas reais da corrida
  function handleAbrirGoogleMaps() {
    const target = pickupCoords || destinationCoords;
    if (!target) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${target[1]},${target[0]}`, "_blank");
  }

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-950 ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* BADGE FLUTUANTE DE DEMANDA HEXAGONAL H3 (MODO IDLE) */}
      {estado === "IDLE" && (
        <div className="absolute top-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] left-3 z-30 animate-in fade-in duration-300">
          <div className="px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-amber-500/40 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xl">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span>Zonas de Demanda H3 Ativas</span>
            <span className="text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded-full font-bold">
              Até 2.0x
            </span>
          </div>
        </div>
      )}

      {/* BANNER SUPERIOR DE NAVEGAÇÃO TURN-BY-TURN (Estilo Waze/Uber) */}
      {(estado === "HEADING_TO_PICKUP" || estado === "IN_PROGRESS") && (
        <div className="absolute top-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] inset-x-3 sm:inset-x-4 max-w-md mx-auto z-30 animate-in slide-in-from-top duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 border border-emerald-500/40 shadow-2xl flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                <Navigation className="w-4 h-4 sm:w-5 sm:h-5 -rotate-45" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  {estado === "HEADING_TO_PICKUP" ? "A Caminho da Coleta" : "Corrida em Andamento"}
                </div>
                <div className="text-xs sm:text-sm font-black truncate">
                  {estado === "HEADING_TO_PICKUP" ? origemEndereco : destinoEndereco}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleAbrirWaze}
                className="p-2 rounded-xl bg-slate-800 text-cyan-400 hover:bg-slate-700 transition-colors"
                title="Abrir no Waze"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleAbrirGoogleMaps}
                className="p-2 rounded-xl bg-slate-800 text-primary-600 hover:bg-slate-700 transition-colors"
                title="Abrir no Google Maps"
              >
                <Compass className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VELOCÍMETRO DIGITAL HUD (Satelite Real) */}
      <div className="absolute bottom-6 left-4 z-20 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/10 text-white shadow-xl">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-white leading-none">{currentSpeed}</span>
            <span className="text-[10px] font-bold text-slate-400">km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
