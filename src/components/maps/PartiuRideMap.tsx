import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";
import { Navigation, Compass, LocateFixed, Layers, Check } from "lucide-react";
import type { MotoristaInfo, ModalidadePartiu } from "@/lib/partiu-engine";
import type { StrategicPickupPoint } from "@/lib/passenger/smart-pickups";
import { routingService } from "@/services/RoutingService";
import { liveTrackingEngine } from "@/services/LiveTrackingEngine";
import { useLiveDrivers } from "@/hooks/useLiveDrivers";
import { useLiveDriversGeoJson } from "@/hooks/useLiveDriversGeoJson";
import { MapboxConfig } from "@/config/MapboxConfig";
import { mapboxService } from "@/services/MapboxService";
import { registerAllMapAssets } from "@/map/MapAssets";
import { silentCatchWarn } from "@/lib/structured-logger";

const MAPBOX_TOKEN = MapboxConfig.getAccessToken();

// Coordenadas padrão da cidade polo
const DEFAULT_CENTER: [number, number] = [-41.888, -21.205];

/**
 * Calcula o azimute (bearing em graus 0-360) entre duas coordenadas geográficas
 */
function calculateBearing(start: [number, number], end: [number, number]): number {
  const startLng = (start[0] * Math.PI) / 180;
  const startLat = (start[1] * Math.PI) / 180;
  const endLng = (end[0] * Math.PI) / 180;
  const endLat = (end[1] * Math.PI) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Tipos e funções matemáticas de Interpolação Linear (LERP) a 60 FPS
 * para garantir deslizamento contínuo dos veículos sem teleporte (Padrão 99)
 */
interface VehicleAnimState {
  id: string;
  fromLng: number;
  fromLat: number;
  fromBearing: number;
  toLng: number;
  toLat: number;
  toBearing: number;
  currentLng: number;
  currentLat: number;
  currentBearing: number;
  startTime: number;
  duration: number;
  properties: Record<string, any>;
}

function lerpCoord(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function lerpBearing(start: number, end: number, t: number): number {
  const diff = ((end - start + 540) % 360) - 180;
  return (start + diff * t + 360) % 360;
}

export interface PartiuRideMapProps {
  status:
    | "IDLE"
    | "SELECTING_DESTINATION"
    | "SEARCHING_DESTINATION"
    | "EDITING_PICKUP"
    | "REVIEWING_ROUTE"
    | "CONFIRMING_PICKUP"
    | "CONFIRMING_DESTINATION_MAP"
    | "PROCURANDO"
    | "OFERTADA"
    | "A_CAMINHO"
    | "CHEGOU"
    | "EM_VIAGEM"
    | "CONCLUIDA"
    | "CANCELADA";
  modalidade?: ModalidadePartiu | undefined;
  origemEndereco?: string | undefined;
  destinoEndereco?: string | undefined;
  origemCoords?: [number, number] | undefined;
  destinoCoords?: [number, number] | undefined;
  driverCoords?: [number, number] | undefined;
  motorista?: MotoristaInfo | null | undefined;
  className?: string | undefined;
  hideRecenter?: boolean | undefined;
  strategicPickups?: StrategicPickupPoint[] | undefined;
  onSelectStrategicPickup?: ((point: StrategicPickupPoint) => void) | undefined;
  onMapCenterChange?: ((coords: [number, number]) => void) | undefined;
  userAccuracyMeters?: number | null | undefined;
  cameraPadding?: { top?: number; bottom?: number; left?: number; right?: number } | undefined;
  onUserLocationChange?: ((coords: [number, number], heading?: number) => void) | undefined;
  onLocationPermissionDenied?: (() => void) | undefined;
  activeMapStyle?: "streets" | "traffic" | "satellite" | undefined;
  onSelectMapStyle?: ((style: "streets" | "traffic" | "satellite") => void) | undefined;
  onOpenLayersModal?: (() => void) | undefined;
}

export function PartiuRideMap({
  status,
  modalidade = "POP",
  origemCoords = DEFAULT_CENTER,
  destinoCoords,
  driverCoords,
  motorista,
  className = "",
  hideRecenter = false,
  userAccuracyMeters,
  strategicPickups,
  onSelectStrategicPickup,
  onMapCenterChange,
  cameraPadding,
  onUserLocationChange,
  onLocationPermissionDenied,
  activeMapStyle,
  onSelectMapStyle,
  onOpenLayersModal,
}: PartiuRideMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [activeStyleKey, setActiveStyleKey] = useState<"streets" | "traffic" | "satellite">("streets");

  // Marcador HTML para o badge flutuante de ETA do motorista
  const driverBadgeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const strategicMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const lastIdleCenterRef = useRef<[number, number] | null>(null);

  // Frota em tempo real alimentada pelo Supabase Realtime (driver_locations)
  const { liveDrivers, totalDrivers } = useLiveDrivers({
    categoryFilter: modalidade === "MOTO" ? "MOTO" : modalidade === "POP" ? "CARRO" : "ALL",
    centerCoords: origemCoords,
  });
  const liveDriversGeoJson = useLiveDriversGeoJson(liveDrivers);

  // Motor de Interpolação Linear (60 FPS LERP) para deslizamento suave dos carros parceiros (Padrão 99)
  const vehiclesAnimMapRef = useRef<Map<string, VehicleAnimState>>(new Map());
  const vehicleAnimRafRef = useRef<number | null>(null);

  // 1. INICIALIZAÇÃO DO MAPBOX E REGISTRO DE ASSETS VETORIAIS HD
  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapboxService.getStyleUrl("streets"),
        center: origemCoords,
        zoom: 16.5,
        pitch: status === "A_CAMINHO" || status === "EM_VIAGEM" ? 60 : 35,
        bearing: 0,
        attributionControl: false,
        precompilePrograms: false,
      } as any);

      map.on("load", async () => {
        // Aplica a paleta limpa estilo Google Maps (fundo #F1F3F4, ruas brancas, zero POIs comerciais)
        mapboxService.applyGoogleMapsPalette(map);
        // Registra assets nativos para SymbolLayers e marcadores
        await registerAllMapAssets(map);
        // await registerAllMapboxMarkers(map);

        setMapLoaded(true);
        mapRef.current = map;
        map.resize();

        // --------------------------------------------------------------------
        // A. FONTE E CAMADA: ROTA POLYLINE (LINHA DA CORRIDA)
        // --------------------------------------------------------------------
        map.addSource("route-source", {
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

        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#FFFFFF",
            "line-width": 7.5,
            "line-opacity": 1.0,
          },
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#1A1A1A",
            "line-width": 4.8,
            "line-opacity": 1.0,
          },
        });

        // --------------------------------------------------------------------
        // B. FONTE E CAMADAS: USER LOCATION (EXATO PONTO AZUL PADRÃO 99)
        // --------------------------------------------------------------------
        map.addSource("user-location-source", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: origemCoords,
            },
          },
        });

        // Camada 1: Halo Concêntrico Azul Claro Suave (w-12 h-12 = 48px -> raio 24px)
        map.addLayer({
          id: "user-location-pulse-ring",
          type: "circle",
          source: "user-location-source",
          paint: {
            "circle-radius": 24,
            "circle-color": "#3B82F6",
            "circle-opacity": 0.20,
          },
        });

        // Camada 2: Ponto Central Sólido 99 (w-4 h-4 = 16px -> raio 8px) com borda branca 2.5px
        map.addLayer({
          id: "user-location-dot-core",
          type: "circle",
          source: "user-location-source",
          paint: {
            "circle-radius": 8,
            "circle-color": "#2563EB",
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 2.5,
          },
        });

        // --------------------------------------------------------------------
        // C. FONTE E CAMADA: MOTORISTAS OCIOSOS REAIS (FROTA CADASTRADA)
        // --------------------------------------------------------------------
        map.addSource("idle-drivers-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "idle-drivers-layer",
          type: "symbol",
          source: "idle-drivers-source",
          layout: {
            "icon-image": ["get", "icon"],
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10, 0.08,
              12, 0.12,
              14, 0.16,
              16, 0.20,
              18, 0.25,
            ],
            "icon-anchor": "center",
            "icon-rotate": ["coalesce", ["get", "heading"], ["get", "bearing"], 0],
            "icon-rotation-alignment": "map",
            "icon-pitch-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });

        // Popup interativo ao clicar em um veículo parceiro real no mapa
        map.on("click", "idle-drivers-layer", (e) => {
          const feature = e.features?.[0] as any;
          if (!feature || !feature.properties) return;
          const props = feature.properties;
          const coords = (feature.geometry?.coordinates || []).slice();

          new mapboxgl.Popup({ offset: 14, closeButton: false, className: "partiu-vehicle-popup" })
            .setLngLat(coords)
            .setHTML(`
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 4px 6px; min-width: 140px;">
                <div style="font-weight: 800; font-size: 11px; color: #0F172A; display: flex; align-items: center; gap: 4px;">
                  <span>${props.modalidade === "MOTO" ? "🏍️" : "🚗"}</span>
                  <span>${props.nome || "Motorista Parceiro"}</span>
                </div>
                <div style="font-size: 10px; color: #475569; margin-top: 2px; font-weight: 600;">
                  ${props.veiculo || "Veículo"}
                </div>
                <div style="margin-top: 4px; display: flex; align-items: center; justify-content: space-between; font-size: 9px;">
                  <span style="background: #FEF08A; color: #854D0E; font-weight: 900; padding: 1px 5px; border-radius: 4px; border: 1px solid #FACC15;">
                    ${props.placa || "PARTIU"}
                  </span>
                  <span style="color: #059669; font-weight: 700;">● Disponível</span>
                </div>
              </div>
            `)
            .addTo(map);
        });

        map.on("mouseenter", "idle-drivers-layer", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "idle-drivers-layer", () => {
          map.getCanvas().style.cursor = "";
        });

        // --------------------------------------------------------------------
        // D. FONTE E CAMADA: MOTORISTA ATIVO (SMOOTH TRACKING COM ROTAÇÃO)
        // --------------------------------------------------------------------
        map.addSource("active-driver-source", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {
              id: "active-driver",
              icon: modalidade === "MOTO" ? "moto-icon" : "car-icon",
              bearing: 0,
            },
            geometry: {
              type: "Point",
              coordinates: driverCoords || origemCoords,
            },
          },
        });

        // --------------------------------------------------------------------
        // E. FONTE E CAMADA: PINO DE EMBARQUE (ORIGEM)
        // --------------------------------------------------------------------
        const shouldShowOriginPinInitial =
          status === "CONFIRMING_PICKUP" ||
          status === "EDITING_PICKUP" ||
          status === "REVIEWING_ROUTE" ||
          status === "A_CAMINHO" ||
          status === "EM_VIAGEM";

        map.addSource("origin-pin-source", {
          type: "geojson",
          data: shouldShowOriginPinInitial
            ? {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Point",
                  coordinates: origemCoords,
                },
              }
            : {
                type: "FeatureCollection",
                features: [],
              },
        });

        // --------------------------------------------------------------------
        // F. FONTE E CAMADA: PINO DE DESTINO (CHEGADA)
        // --------------------------------------------------------------------
        map.addSource("destination-pin-source", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: destinoCoords || origemCoords,
            },
          },
        });

        map.addLayer({
          id: "active-driver-layer",
          type: "symbol",
          source: "active-driver-source",
          layout: {
            "icon-image": ["get", "icon"],
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10, 0.08,
              12, 0.12,
              14, 0.16,
              16, 0.20,
              18, 0.25,
            ],
            "icon-anchor": "center",
            "icon-rotate": ["coalesce", ["get", "heading"], ["get", "bearing"], 0],
            "icon-rotation-alignment": "map",
            "icon-pitch-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });

        map.addLayer({
          id: "origin-pin-layer",
          type: "symbol",
          source: "origin-pin-source",
          layout: {
            "icon-image": "origin-pin",
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              11, 0.65,
              14, 0.90,
              16, 1.15,
              18, 1.40,
            ],
            "icon-anchor": "bottom",
            "icon-offset": [0, -15],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });

        map.addLayer({
          id: "destination-pin-layer",
          type: "symbol",
          source: "destination-pin-source",
          layout: {
            "icon-image": "destination-pin",
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              11, 0.65,
              14, 0.90,
              16, 1.15,
              18, 1.40,
            ],
            "icon-anchor": "bottom",
            "icon-offset": [0, -15],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });

        // --------------------------------------------------------------------
        // G. GEOLOCALIZAÇÃO NATIVA EM TEMPO REAL (HARDWARE GPS ENGINE)
        // --------------------------------------------------------------------
        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
          showUserHeading: true,
          showUserLocation: false, // Gerenciado de forma ultra-precisa e estável pelas camadas WebGL GPU dedicadas do Partiu
          showAccuracyCircle: false, // Evita duplicação do círculo nativo
        });

        geolocate.on("geolocate", (e: any) => {
          if (e.coords) {
            const nextCoords: [number, number] = [e.coords.longitude, e.coords.latitude];
            onUserLocationChange?.(nextCoords, e.coords.heading);
          }
        });

        geolocate.on("error", (err: any) => {
          console.warn("[PartiuRideMap] Erro de geolocalização nativa:", err);
          if (err.code === 1) {
            // PERMISSION_DENIED
            onLocationPermissionDenied?.();
          }
        });

        map.addControl(geolocate, "top-right");
        geolocateControlRef.current = geolocate;

        // Dispara o tracking nativo assim que o mapa estiver pronto
        setTimeout(() => {
          try {
            geolocate.trigger();
          } catch (err) { silentCatchWarn("PartiuRideMap", err); }
        }, 350);
      });

      map.on("error", () => {
        setMapError(true);
      });

      mapRef.current = map;
    } catch {
      setMapError(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 1.1 OBSERVADOR DE REDIMENSIONAMENTO (RESIZEOBSERVER) — COMPATIBILIDADE HALF-MAP
  useEffect(() => {
    if (!mapContainer.current) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, [mapLoaded]);

  // 2. ATUALIZAÇÃO DA COORDENADA DO PASSAGEIRO (EXATO PONTO AZUL 99 & ORIGIN PIN)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const userSource = map.getSource("user-location-source") as mapboxgl.GeoJSONSource | undefined;
    if (userSource) {
      userSource.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: origemCoords,
        },
      });
    }

    const originSource = map.getSource("origin-pin-source") as mapboxgl.GeoJSONSource | undefined;
    if (originSource) {
      // Limpeza do Pino de Origem: No estado IDLE ou busca inicial de destino,
      // suprimimos o pino verde para não conflitar com a localização atual (UserLocation)
      const shouldShowOriginPin =
        status === "CONFIRMING_PICKUP" ||
        status === "EDITING_PICKUP" ||
        status === "REVIEWING_ROUTE" ||
        status === "A_CAMINHO" ||
        status === "EM_VIAGEM";

      if (shouldShowOriginPin) {
        originSource.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: origemCoords,
          },
        });
      } else {
        originSource.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }
  }, [mapLoaded, origemCoords, status]);

  // 3. ATUALIZAÇÃO DA COORDENADA DO DESTINO (DESTINATION PIN)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const destSource = map.getSource("destination-pin-source") as mapboxgl.GeoJSONSource | undefined;
    if (destSource) {
      if (destinoCoords) {
        destSource.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: destinoCoords,
          },
        });
      } else {
        destSource.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }
  }, [mapLoaded, destinoCoords]);

  // 4. CONTROLE DE CÂMERA INTELIGENTE CONFORME ESTADO DA VIAGEM
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (
      status === "SELECTING_DESTINATION" ||
      status === "SEARCHING_DESTINATION" ||
      status === "EDITING_PICKUP"
    ) {
      map.easeTo({
        center: origemCoords,
        zoom: 14.1,
        duration: 800,
      });
    } else if (status === "CONFIRMING_PICKUP") {
      map.easeTo({
        center: origemCoords,
        zoom: 16.2,
        duration: 600,
      });
    } else if (status === "CONFIRMING_DESTINATION_MAP") {
      map.easeTo({
        center: destinoCoords || origemCoords,
        zoom: 15.8,
        duration: 600,
      });
    } else if (status === "REVIEWING_ROUTE" && destinoCoords) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(origemCoords);
      bounds.extend(destinoCoords);
      const reviewingPadding = cameraPadding || {
        top: typeof window !== "undefined" ? Math.max(70, Math.round(window.innerHeight * 0.10)) : 80,
        bottom: typeof window !== "undefined" ? Math.max(380, Math.round(window.innerHeight * 0.54)) : 420,
        left: 48,
        right: 48,
      };
      map.fitBounds(bounds, {
        padding: reviewingPadding,
        maxZoom: 16,
        duration: 800,
      });
    } else if (status === "PROCURANDO") {
      const defaultProcurandoPadding = {
        top: 0,
        bottom: typeof window !== "undefined" ? Math.max(300, Math.round(window.innerHeight * 0.42)) : 340,
        left: 0,
        right: 0,
      };

      map.easeTo({
        center: origemCoords,
        zoom: 15.8,
        padding: cameraPadding || defaultProcurandoPadding,
        duration: 700,
      });
    } else if (status === "IDLE") {
      const last = lastIdleCenterRef.current;
      const movedSignificantly =
        !last ||
        Math.abs(last[0] - origemCoords[0]) > 0.00010 ||
        Math.abs(last[1] - origemCoords[1]) > 0.00010;

      if (movedSignificantly) {
        lastIdleCenterRef.current = origemCoords;
        const defaultIdlePadding = {
          top: 65,
          bottom: typeof window !== "undefined" ? Math.max(360, Math.round(window.innerHeight * 0.52)) : 420,
          left: 0,
          right: 0,
        };

        map.easeTo({
          center: origemCoords,
          zoom: 16.5,
          padding: cameraPadding || defaultIdlePadding,
          duration: 700,
        });
      }
    } else {
      lastIdleCenterRef.current = null;
    }
  }, [mapLoaded, status, origemCoords, destinoCoords, cameraPadding]);

  // 5. AJUSTE DE PINO CENTRAL PELO ARRASTO DO USUÁRIO
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !onMapCenterChange) return;

    const isPinMode = status === "CONFIRMING_PICKUP" || status === "CONFIRMING_DESTINATION_MAP";
    if (!isPinMode) return;

    const handleDragEnd = () => {
      const center = map.getCenter();
      onMapCenterChange([center.lng, center.lat]);
    };

    map.on("dragend", handleDragEnd);
    return () => {
      map.off("dragend", handleDragEnd);
    };
  }, [mapLoaded, status, onMapCenterChange]);

  // 6. PONTOS ESTRATÉGICOS DE EMBARQUE (SMART PICKUPS)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    strategicMarkersRef.current.forEach((m) => m.remove());
    strategicMarkersRef.current = [];

    const isEditingOrSelecting =
      status === "EDITING_PICKUP" ||
      status === "SELECTING_DESTINATION" ||
      status === "SEARCHING_DESTINATION" ||
      status === "CONFIRMING_PICKUP";

    if (isEditingOrSelecting && strategicPickups && strategicPickups.length > 0) {
      strategicPickups.forEach((point) => {
        const el = document.createElement("div");
        el.className =
          "group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110 active:scale-95 z-20 select-none";
        el.innerHTML = `
          <div class="px-2 py-0.5 mb-1 rounded-md bg-slate-950/90 text-[#FFDE00] text-[10px] font-black tracking-tight shadow-md border border-white/10 whitespace-nowrap pointer-events-none opacity-90 group-hover:opacity-100 flex items-center gap-1">
            <span>📍</span>
            <span>${point.nome.split(" x ")[0] || point.nome}</span>
          </div>
          <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white ring-4 ring-emerald-400/30 group-hover:ring-emerald-400/60 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
        `;

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          map.flyTo({ center: point.coords, zoom: 16.2, duration: 600 });
          onSelectStrategicPickup?.(point);
        });

        const marker = new mapboxgl.Marker({ element: el }).setLngLat(point.coords).addTo(map);
        strategicMarkersRef.current.push(marker);
      });
    }
  }, [mapLoaded, status, strategicPickups, onSelectStrategicPickup]);

  // 7. LIVE TRACKING ENGINE (60FPS LERP & SMOOTH BEARING)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    return liveTrackingEngine.subscribe((pos) => {
      const activeSource = map.getSource("active-driver-source") as mapboxgl.GeoJSONSource | undefined;
      if (activeSource) {
        activeSource.setData({
          type: "Feature",
          properties: {
            id: "active-driver",
            icon: modalidade === "MOTO" ? "moto-icon" : "car-icon",
            bearing: pos.bearing,
          },
          geometry: {
            type: "Point",
            coordinates: [pos.lng, pos.lat],
          },
        });
      }

      // Atualiza a posição do badge flutuante de ETA
      if (driverBadgeMarkerRef.current) {
        driverBadgeMarkerRef.current.setLngLat([pos.lng, pos.lat]);
      }
    });
  }, [mapLoaded, modalidade]);

  // 9. ATUALIZAÇÃO DA ROTA REAL E SINCRONIZAÇÃO DO VEÍCULO (TELEMETRIA 100% REAL)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const routeSource = map.getSource("route-source") as mapboxgl.GeoJSONSource | undefined;
    const idleSource = map.getSource("idle-drivers-source") as mapboxgl.GeoJSONSource | undefined;
    const activeDriverSource = map.getSource("active-driver-source") as mapboxgl.GeoJSONSource | undefined;

    let active = true;

    // A. MODO REVISÃO DE ROTA: Calcula e renderiza a rota completa em vias reais
    if (status === "REVIEWING_ROUTE" && destinoCoords) {
      routingService
        .getRoute(origemCoords, destinoCoords)
        .then((route) => {
          if (!active || !mapRef.current) return;
          const curRouteSource = mapRef.current.getSource("route-source") as mapboxgl.GeoJSONSource | undefined;
          if (curRouteSource && route.coordinates && route.coordinates.length > 0) {
            curRouteSource.setData({
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: route.coordinates,
              },
            });
          }
        })
        .catch((err) => {
          console.warn("[PartiuRideMap] Erro ao carregar rota:", err);
        });

      if (idleSource) {
        idleSource.setData({ type: "FeatureCollection", features: [] });
      }
      if (activeDriverSource) {
        activeDriverSource.setData({ type: "FeatureCollection", features: [] });
      }
      if (driverBadgeMarkerRef.current) {
        driverBadgeMarkerRef.current.remove();
        driverBadgeMarkerRef.current = null;
      }
    } else if (status === "A_CAMINHO") {
      // B. MODO A CAMINHO: Rastreamento real do motorista até o ponto de embarque
      const currentCoord = driverCoords || origemCoords;
      const heading = driverCoords ? calculateBearing(driverCoords, origemCoords) : 0;

      if (driverCoords) {
        liveTrackingEngine.pushUpdate(driverCoords, heading, 3000);
      }

      // Calcula traçado real por vias da posição do condutor até o embarque
      if (driverCoords) {
        routingService
          .getRoute(driverCoords, origemCoords)
          .then((route) => {
            if (!active || !mapRef.current) return;
            const curRouteSource = mapRef.current.getSource("route-source") as mapboxgl.GeoJSONSource | undefined;
            if (curRouteSource && route.coordinates && route.coordinates.length > 0) {
              curRouteSource.setData({
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: route.coordinates,
                },
              });
            }

            // Badge flutuante de ETA real (Mapbox driving-traffic)
            if (!driverBadgeMarkerRef.current && mapRef.current) {
              const badgeEl = document.createElement("div");
              badgeEl.className =
                "px-2.5 py-0.5 mb-8 rounded-full bg-slate-950/95 text-[#FFDE00] text-[10px] font-black border border-[#FFDE00] shadow-xl flex items-center gap-1 -translate-y-4 pointer-events-none select-none";
              badgeEl.innerHTML = `
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>~${route.durationMinutes} min</span>
              `;
              driverBadgeMarkerRef.current = new mapboxgl.Marker({
                element: badgeEl,
                anchor: "bottom",
              })
                .setLngLat(currentCoord)
                .addTo(mapRef.current);
            }
          })
          .catch((err) => {
            console.warn("[PartiuRideMap] Erro ao obter rota de aproximação:", err);
          });
      }

      // Enquadra passageiro e motorista na câmera com padding estrito
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(currentCoord);
      bounds.extend(origemCoords);
      const enRoutePadding = cameraPadding || {
        top: 100,
        bottom: 380,
        left: 80,
        right: 80,
      };
      map.fitBounds(bounds, {
        padding: enRoutePadding,
        maxZoom: 16.5,
        duration: 1200,
      });
    } else if (status === "EM_VIAGEM") {
      // C. MODO EM VIAGEM: Trajeto real em andamento até o destino final
      const currentCoord = driverCoords || origemCoords;
      const targetDestino = destinoCoords || origemCoords;
      const heading = driverCoords && destinoCoords ? calculateBearing(driverCoords, destinoCoords) : 0;

      if (driverCoords) {
        liveTrackingEngine.pushUpdate(driverCoords, heading, 3000);
      }

      if (driverCoords && destinoCoords) {
        routingService
          .getRoute(driverCoords, destinoCoords)
          .then((route) => {
            if (!active || !mapRef.current) return;
            const curRouteSource = mapRef.current.getSource("route-source") as mapboxgl.GeoJSONSource | undefined;
            if (curRouteSource && route.coordinates && route.coordinates.length > 0) {
              curRouteSource.setData({
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: route.coordinates,
                },
              });
            }
          })
          .catch((err) => {
            console.warn("[PartiuRideMap] Erro ao obter rota em viagem:", err);
          });
      }

      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(currentCoord);
      bounds.extend(targetDestino);
      const tripPadding = cameraPadding || {
        top: 100,
        bottom: typeof window !== "undefined" ? Math.max(300, Math.round(window.innerHeight * 0.40)) : 320,
        left: 60,
        right: 60,
      };
      map.fitBounds(bounds, {
        padding: tripPadding,
        maxZoom: 16,
        duration: 1000,
      });
    } else {
      // D. MODO IDLE: Limpa rota ativa e exibe frotas parceiras reais do Realtime
      if (routeSource) {
        routeSource.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        });
      }

      if (activeDriverSource) {
        activeDriverSource.setData({ type: "FeatureCollection", features: [] });
      }

      if (idleSource) {
        idleSource.setData(liveDriversGeoJson as any);
      }

      if (driverBadgeMarkerRef.current) {
        driverBadgeMarkerRef.current.remove();
        driverBadgeMarkerRef.current = null;
      }
    }

    return () => {
      active = false;
    };
  }, [mapLoaded, status, origemCoords, destinoCoords, driverCoords, modalidade, cameraPadding]);

  // 10. SINCRONIZAÇÃO REATIVA COM A FROTA DE MOTORISTAS EM TEMPO REAL (60FPS LERP - PADRÃO 99)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const idleSource = map.getSource("idle-drivers-source") as mapboxgl.GeoJSONSource | undefined;
    if (!idleSource) return;

    if (
      status === "REVIEWING_ROUTE" ||
      status === "A_CAMINHO" ||
      status === "EM_VIAGEM"
    ) {
      if (vehicleAnimRafRef.current) {
        cancelAnimationFrame(vehicleAnimRafRef.current);
        vehicleAnimRafRef.current = null;
      }
      vehiclesAnimMapRef.current.clear();
      idleSource.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const now = performance.now();
    const incomingFeatures = liveDriversGeoJson?.features || [];
    const activeIds = new Set<string>();

    incomingFeatures.forEach((feat: any, idx: number) => {
      const id = String(feat.id || feat.properties?.id || idx);
      activeIds.add(id);
      const coords = feat.geometry?.coordinates;
      if (!coords || coords.length < 2) return;
      const [tLng, tLat] = coords;
      const tBearing = Number(feat.properties?.heading ?? feat.properties?.bearing ?? 0);

      const existing = vehiclesAnimMapRef.current.get(id);
      if (!existing) {
        // Veículo novo: entra instantaneamente na posição atual
        vehiclesAnimMapRef.current.set(id, {
          id,
          fromLng: tLng,
          fromLat: tLat,
          fromBearing: tBearing,
          toLng: tLng,
          toLat: tLat,
          toBearing: tBearing,
          currentLng: tLng,
          currentLat: tLat,
          currentBearing: tBearing,
          startTime: now,
          duration: 0,
          properties: feat.properties || {},
        });
      } else {
        // Veículo existente: interpolação suave contínua a 60 FPS
        const hasMoved =
          Math.abs(existing.toLng - tLng) > 0.000005 ||
          Math.abs(existing.toLat - tLat) > 0.000005;

        if (hasMoved) {
          existing.fromLng = existing.currentLng;
          existing.fromLat = existing.currentLat;
          existing.fromBearing = existing.currentBearing;
          existing.toLng = tLng;
          existing.toLat = tLat;

          existing.toBearing =
            tBearing !== 0
              ? tBearing
              : calculateBearing([existing.fromLng, existing.fromLat], [tLng, tLat]);

          existing.startTime = now;
          existing.duration = 1500; // Deslizamento suave ao longo de 1.5 segundos
          existing.properties = feat.properties || existing.properties;
        } else {
          existing.properties = feat.properties || existing.properties;
        }
      }
    });

    // Remove veículos que ficaram offline ou saíram da área visível
    for (const key of vehiclesAnimMapRef.current.keys()) {
      if (!activeIds.has(key)) {
        vehiclesAnimMapRef.current.delete(key);
      }
    }

    const step = () => {
      const curTime = performance.now();
      let isStillMoving = false;
      const features: any[] = [];

      for (const v of vehiclesAnimMapRef.current.values()) {
        const elapsed = curTime - v.startTime;
        const progress = v.duration > 0 ? Math.min(1, elapsed / v.duration) : 1;

        v.currentLng = lerpCoord(v.fromLng, v.toLng, progress);
        v.currentLat = lerpCoord(v.fromLat, v.toLat, progress);
        v.currentBearing = lerpBearing(v.fromBearing, v.toBearing, progress);

        if (progress < 1) {
          isStillMoving = true;
        }

        features.push({
          type: "Feature",
          id: v.id,
          properties: {
            ...v.properties,
            heading: v.currentBearing,
            bearing: v.currentBearing,
          },
          geometry: {
            type: "Point",
            coordinates: [v.currentLng, v.currentLat],
          },
        });
      }

      const source = mapRef.current?.getSource("idle-drivers-source") as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features,
        });
      }

      if (isStillMoving) {
        vehicleAnimRafRef.current = requestAnimationFrame(step);
      } else {
        vehicleAnimRafRef.current = null;
      }
    };

    if (!vehicleAnimRafRef.current) {
      vehicleAnimRafRef.current = requestAnimationFrame(step);
    }
  }, [mapLoaded, status, liveDriversGeoJson]);


  // Função para recentralizar o mapa no usuário com máxima precisão GNSS e fallback de rede
  async function handleRecenter() {
    const defaultIdlePadding = {
      top: 65,
      bottom: typeof window !== "undefined" ? Math.max(360, Math.round(window.innerHeight * 0.52)) : 420,
      left: 0,
      right: 0,
    };

    const flyToCoords = (coords: [number, number], heading?: number | null) => {
      onUserLocationChange?.(coords, heading ?? undefined);
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: coords,
          zoom: 16.5,
          padding: cameraPadding || (status === "IDLE" ? defaultIdlePadding : { top: 0, bottom: 0, left: 0, right: 0 }),
          duration: 800,
        });
      }
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      const queryPos = (opts: PositionOptions): Promise<GeolocationPosition> => {
        return new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, opts));
      };

      try {
        // Nível 1: GNSS Alta Precisão
        const pos = await queryPos({ enableHighAccuracy: true, timeout: 3500, maximumAge: 0 });
        flyToCoords([pos.coords.longitude, pos.coords.latitude], pos.coords.heading);
        return;
      } catch {
        try {
          // Nível 2: Rede / Wi-Fi (Instantâneo no PC)
          const pos2 = await queryPos({ enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 });
          flyToCoords([pos2.coords.longitude, pos2.coords.latitude], pos2.coords.heading);
          return;
        } catch {
          // GNSS/Wi-Fi indisponíveis. PROIBIDO o uso de geolocalização por IP.
          console.warn("[PartiuRideMap] Sinal GNSS/Wi-Fi indisponível. Orientando usuário a buscar por endereço.");
          onLocationPermissionDenied?.();
        }
      }
    }

    if (geolocateControlRef.current) {
      try {
        geolocateControlRef.current.trigger();
      } catch (err) { silentCatchWarn("PartiuRideMap", err); }
    }
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: origemCoords,
      zoom: 16.5,
      duration: 800,
    });
  }

  const recenterBottomStyle =
    cameraPadding?.bottom && cameraPadding.bottom > 100
      ? { bottom: `${cameraPadding.bottom + 16}px` }
      : undefined;

  const layersMenuStyle =
    cameraPadding?.bottom && cameraPadding.bottom > 100
      ? { bottom: `${cameraPadding.bottom + 76}px` }
      : undefined;

  useEffect(() => {
    if (activeMapStyle && activeMapStyle !== activeStyleKey) {
      handleSelectStyle(activeMapStyle);
    }
  }, [activeMapStyle]);

  const handleSelectStyle = async (newStyle: "streets" | "traffic" | "satellite") => {
    setActiveStyleKey(newStyle);
    onSelectMapStyle?.(newStyle);
    setShowLayersMenu(false);
    const map = mapRef.current;
    if (!map) return;

    const url =
      newStyle === "traffic"
        ? MapboxConfig.STYLES.navigationTraffic
        : newStyle === "satellite"
        ? MapboxConfig.STYLES.satelliteStreets
        : MapboxConfig.STYLES.streets || "mapbox://styles/mapbox/streets-v12";

    map.setStyle(url);
    map.once("style.load", async () => {
      mapboxService.applyGoogleMapsPalette(map);
      await registerAllMapAssets(map);

      if (!map.getSource("route-source")) {
        map.addSource("route-source", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [] },
          },
        });
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#FFFFFF", "line-width": 7.5, "line-opacity": 1.0 },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#1A1A1A", "line-width": 4.8, "line-opacity": 1.0 },
        });
      }

      if (!map.getSource("user-location-source")) {
        map.addSource("user-location-source", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: origemCoords },
          },
        });
        // Camada 1: Halo Concêntrico Azul Claro Suave (w-12 h-12 = 48px -> raio 24px)
        map.addLayer({
          id: "user-location-pulse-ring",
          type: "circle",
          source: "user-location-source",
          paint: {
            "circle-radius": 24,
            "circle-color": "#3B82F6",
            "circle-opacity": 0.20,
          },
        });
        // Camada 2: Ponto Central Sólido 99 (w-4 h-4 = 16px -> raio 8px) com borda branca 2.5px
        map.addLayer({
          id: "user-location-dot-core",
          type: "circle",
          source: "user-location-source",
          paint: {
            "circle-radius": 8,
            "circle-color": "#2563EB",
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 2.5,
          },
        });
      }

      if (!map.getSource("idle-drivers-source")) {
        map.addSource("idle-drivers-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });
        map.addLayer({
          id: "idle-drivers-layer",
          type: "symbol",
          source: "idle-drivers-source",
          layout: {
            "icon-image": ["get", "icon"],
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10, 0.08,
              12, 0.12,
              14, 0.16,
              16, 0.20,
              18, 0.25,
            ],
            "icon-anchor": "center",
            "icon-rotate": ["coalesce", ["get", "heading"], ["get", "bearing"], 0],
            "icon-rotation-alignment": "map",
            "icon-pitch-alignment": "viewport",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
      }
    });
  };

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-900 ${className}`}>
      {/* Canvas WebGL do Mapbox */}
      <div ref={mapContainer} className="w-full h-full" />


      {/* Fallback de rede / WebGL */}
      {mapError && (
        <div className="absolute inset-0 bg-[#e5e3df] flex items-center justify-center p-6 text-center">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-slate-200 max-w-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 mx-auto flex items-center justify-center">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-slate-900">Modo GPS Simplificado</h3>
            <p className="text-xs text-slate-600">
              Conexão com Mapbox em fallback. Exibindo telemetria por coordenadas reais.
            </p>
          </div>
        </div>
      )}

      {/* Botão Flutuante: Alternar Modelo de Mapa (Ruas / Trânsito / Satélite) */}
      <div
        style={layersMenuStyle}
        className={`absolute right-4 z-20 flex flex-col items-end gap-2 ${
          !layersMenuStyle ? "bottom-20" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (onOpenLayersModal) {
              onOpenLayersModal();
            } else {
              setShowLayersMenu((prev) => !prev);
            }
          }}
          className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-md text-slate-800 shadow-xl border border-slate-200/80 flex items-center justify-center hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-black/5"
          title="Alternar estilo do mapa (Nomes de Ruas, Trânsito, Satélite)"
        >
          <Layers className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Modal Fallback de Camadas via Portal (Renderizado na raiz caso não gerenciado pelo pai) */}
      {showLayersMenu &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            style={{ zIndex: 9999, ...({ elevation: 99 } as React.CSSProperties) }}
            onClick={() => setShowLayersMenu(false)}
          >
            <div
              className="bg-white/98 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xs p-4 space-y-3 animate-in zoom-in-95 duration-200 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h4 className="text-sm font-black text-slate-900">Estilo do Mapa</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Escolha a visualização que preferir</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLayersMenu(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectStyle("streets")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeStyleKey === "streets"
                      ? "bg-blue-50 text-blue-800 font-extrabold border border-blue-200 ring-2 ring-blue-500/20"
                      : "text-slate-700 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🗺️</span>
                    <div>
                      <div className="font-bold text-slate-900">Nomes das Ruas</div>
                      <div className="text-[10px] text-slate-400 font-normal">Padrão Google Maps limpo</div>
                    </div>
                  </div>
                  {activeStyleKey === "streets" && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectStyle("traffic")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeStyleKey === "traffic"
                      ? "bg-blue-50 text-blue-800 font-extrabold border border-blue-200 ring-2 ring-blue-500/20"
                      : "text-slate-700 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🚗</span>
                    <div>
                      <div className="font-bold text-slate-900">Trânsito & Vias</div>
                      <div className="text-[10px] text-slate-400 font-normal">Linhas com fluxo em tempo real</div>
                    </div>
                  </div>
                  {activeStyleKey === "traffic" && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectStyle("satellite")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeStyleKey === "satellite"
                      ? "bg-blue-50 text-blue-800 font-extrabold border border-blue-200 ring-2 ring-blue-500/20"
                      : "text-slate-700 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🛰️</span>
                    <div>
                      <div className="font-bold text-slate-900">Satélite Real</div>
                      <div className="text-[10px] text-slate-400 font-normal">Imagens aéreas de alta definição</div>
                    </div>
                  </div>
                  {activeStyleKey === "satellite" && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Botão Flutuante: Centralizar no Passageiro (Estilo 99 / Uber) */}
      {!hideRecenter && (
        <button
          type="button"
          onClick={handleRecenter}
          style={recenterBottomStyle}
          className={`absolute right-4 z-20 w-11 h-11 rounded-full bg-white/95 backdrop-blur-md text-slate-800 shadow-xl border border-slate-200/80 flex items-center justify-center hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-black/5 ${
            !recenterBottomStyle ? "bottom-6" : ""
          }`}
          title="Centralizar no meu local exato"
        >
          <LocateFixed className="w-5 h-5 text-blue-600" />
        </button>
      )}


    </div>
  );
}
