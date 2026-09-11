import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  type PassengerRideState,
  type PassengerVehicleCategory,
  type PaymentMethod,
  type RideQuote,
  DEFAULT_ORIGIN,
  calcularCotacoesPassageiro,
} from "@/lib/passenger/passenger-ride-machine";
import {
  calcularEtaDinamico,
  formatarHorarioChegada,
  type CalculatedEta,
} from "@/lib/passenger/eta-service";
import {
  criarNovaCorrida,
  getCorridaAtiva,
  cancelarCorrida,
  motoristaAceitarCorrida,
  type CorridaPartiu,
} from "@/lib/partiu-engine";
import {
  getStrategicPickupPoints,
  type StrategicPickupPoint,
} from "@/lib/passenger/smart-pickups";
import {
  geocodingService,
  LUGARES_CURADOS_ITAPERUNA,
} from "@/lib/passenger/geocoding-service";
import { routingService, type RouteMetrics } from "@/services/RoutingService";
import {
  pricingService,
  OFFICIAL_CATEGORIES,
  type SupportedVehicleCategory,
  type ItemizedQuote,
  type CategoryPricingConfig,
} from "@/services/PricingService";
import { antifraudService } from "@/services/AntifraudService";
import { dispatchQueueBuilder } from "@/services/DispatchQueueBuilder";
import { silentCatchWarn } from "@/lib/structured-logger";
import {
  progressiveDispatchEngine,
  type ProgressiveDispatchSession,
} from "@/services/ProgressiveDispatchEngine";

export interface PassengerPreferences {
  arCondicionado: boolean;
  viagemSilenciosa: boolean;
  bagagemPortaMalas: boolean;
  isFemaleOnly: boolean;
}

export interface ParadaItem {
  id: string;
  endereco: string;
  coords?: { lat: number; lng: number };
}

interface PassengerRideContextValue {
  state: PassengerRideState;
  categoriaVeiculo: PassengerVehicleCategory;
  formaPagamento: PaymentMethod;
  origem: string;
  origemCoords: [number, number];
  destino: string;
  destinoCoords: [number, number];
  distanciaKm: number;
  duracaoMin: number;
  cotacoes: { moto: RideQuote; carro: RideQuote };
  routeMetrics: RouteMetrics | null;
  multiCategoryQuotes: Record<SupportedVehicleCategory, ItemizedQuote>;
  categoriesList: CategoryPricingConfig[];
  activeQuote: ItemizedQuote;
  activeRide: CorridaPartiu | null;
  isCancelModalOpen: boolean;

  // Recursos Inteligentes Estilo 99
  preferences: PassengerPreferences;
  togglePreference: (key: keyof PassengerPreferences) => void;
  precisaTroco: string;
  setPrecisaTroco: (valor: string) => void;
  pagamentoNaMaquininha: boolean;
  setPagamentoNaMaquininha: (val: boolean) => void;
  viajanteOutraPessoa: boolean;
  nomeOutroPassageiro: string;
  telefoneOutroPassageiro: string;
  setViajanteOutraPessoa: (val: boolean) => void;
  setNomeOutroPassageiro: (nome: string) => void;
  setTelefoneOutroPassageiro: (tel: string) => void;
  paradas: ParadaItem[];
  adicionarParada: (endereco: string, coords?: { lat: number; lng: number }) => void;
  removerParada: (id: string) => void;
  paradaIntermediaria: string | null;
  setParadaIntermediaria: (parada: string | null) => void;
  horarioDesembarquePrevisto: string;

  // ETA e Rota em Tempo Real Conectados ao Mapa
  etaCalculado: CalculatedEta;
  driverCoords: [number, number];
  setDriverCoords: (coords: [number, number]) => void;

  // Pontos Estratégicos de Embarque (Smart Pickups)
  smartPickups: StrategicPickupPoint[];
  startEditingPickup: () => void;
  selectStrategicPickup: (point: StrategicPickupPoint) => void;
  backToSelectingDestination: () => void;
  updatePickupLocationFromMap: (coords: [number, number], endereco?: string) => void;
  confirmPickupPin: () => void;
  isResolvingAddress: boolean;

  // Ações da Máquina de Estados
  startSearch: () => void;
  cancelSearch: () => void;
  selectDestination: (destinoTexto: string, coords?: [number, number]) => void;
  selectDestinationOnMap: () => void;
  backFromDestinationMapPin: () => void;
  confirmDestinationPin: (coords: [number, number], endereco?: string) => void;
  updateDestinationLocationFromMap: (coords: [number, number], endereco?: string) => void;
  setOrigemEndereco: (origemTexto: string, coords?: [number, number]) => void;
  swapOrigemDestino: () => void;
  selectVehicle: (cat: PassengerVehicleCategory) => void;
  selectPaymentMethod: (method: PaymentMethod) => void;
  proceedToConfirmPickup: () => void;
  backToReviewRoute: () => void;
  confirmPickupAndFindDriver: () => void;
  requestCancel: () => void;
  dismissCancel: () => void;
  confirmCancel: (reason?: { code?: string; label?: string }) => void;
  resetToIdle: () => void;
  progressiveSession: ProgressiveDispatchSession | null;
  retrySearchAfterTimeout: () => void;
  cancelRideAfterTimeout: () => void;

  // Gestão de Geolocalização Real e Permissões de Hardware OS
  gpsState: PassengerGpsState;
  gpsPermissionStatus: "prompt" | "granted" | "denied";
  hasRealGpsFix: boolean;
  userAccuracyMeters: number | null;
  userHeading: number | null;
  recenterCount: number;
  forcarCentralizarUsuario: () => void;
  isGpsPermissionModalOpen: boolean;
  closeGpsPermissionModal: () => void;
  solicitarPermissaoGps: () => Promise<boolean>;
}

export type PassengerGpsState = "GPS_READY" | "GPS_SEARCHING" | "GPS_WEAK_SIGNAL" | "GPS_DISABLED";

const PassengerRideContext = createContext<PassengerRideContextValue | null>(null);

export function PassengerRideProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PassengerRideState>("IDLE");
  const [categoriaVeiculo, setCategoriaVeiculo] = useState<PassengerVehicleCategory>(() => {
    try {
      const saved = localStorage.getItem("partiu_preferred_category");
      if (saved === "MOTO" || saved === "CARRO") return saved;
    } catch (err) { silentCatchWarn("PassengerRideContext", err); }
    return "MOTO";
  });
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>(() => {
    try {
      const saved = localStorage.getItem("partiu_preferred_payment");
      if (saved === "pix" || saved === "dinheiro") return saved;
    } catch (err) { silentCatchWarn("PassengerRideContext", err); }
    return "pix";
  });

  const [origem, setOrigem] = useState(() => {
    try {
      const saved = localStorage.getItem("partiu_saved_origin_address");
      if (saved && saved.trim() && saved !== "Meu Local Atual") return saved;
    } catch {}
    return "Meu Local Atual";
  });
  const [origemCoords, setOrigemCoords] = useState<[number, number]>(() => {
    try {
      const saved = localStorage.getItem("partiu_saved_origin_coords");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2 && !isNaN(parsed[0]) && !isNaN(parsed[1])) {
          return parsed as [number, number];
        }
      }
    } catch {}
    return DEFAULT_ORIGIN.coords;
  });
  const origemCoordsRef = useRef<[number, number]>(DEFAULT_ORIGIN.coords);

  useEffect(() => {
    origemCoordsRef.current = origemCoords;
  }, [origemCoords]);

  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [progressiveSession, setProgressiveSession] = useState<ProgressiveDispatchSession | null>(null);

  // 1. Gestão de Geolocalização Real (Hardware Puro) & Estados do GPS
  const [gpsState, setGpsState] = useState<PassengerGpsState>("GPS_SEARCHING");
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<"prompt" | "granted" | "denied">(() => {
    if (typeof window !== "undefined" && localStorage.getItem("partiu_gps_permission") === "denied") {
      return "denied";
    }
    return "prompt";
  });
  const [hasRealGpsFix, setHasRealGpsFix] = useState(false);
  const [userAccuracyMeters, setUserAccuracyMeters] = useState<number | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [recenterCount, setRecenterCount] = useState<number>(0);
  const [isGpsPermissionModalOpen, setIsGpsPermissionModalOpen] = useState(false);

  const closeGpsPermissionModal = useCallback(() => {
    setIsGpsPermissionModalOpen(false);
  }, []);

  // Validação estrita de coordenadas físicas terrestres (exclui 0,0 e anomalias)
  const isValidCoordinate = useCallback((lng: number, lat: number): boolean => {
    return (
      typeof lng === "number" &&
      typeof lat === "number" &&
      !isNaN(lng) &&
      !isNaN(lat) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001)
    );
  }, []);

  const aplicarCoordenadasGps = useCallback(
    (longitude: number, latitude: number, accuracy: number, heading: number | null | undefined): boolean => {
      if (!isValidCoordinate(longitude, latitude)) return false;

      const isLowAccuracy = accuracy > 50;
      const isLocked = typeof window !== "undefined" && localStorage.getItem("partiu_origin_user_locked") === "true";

      if (isLocked && isLowAccuracy) {
        setUserAccuracyMeters(accuracy);
        setUserHeading(heading ?? null);
        setGpsPermissionStatus("granted");
        setHasRealGpsFix(true);
        setGpsState("GPS_READY");
        setIsGpsPermissionModalOpen(false);
        return true;
      }

      const realCoords: [number, number] = [longitude, latitude];
      setOrigemCoords(realCoords);
      setUserAccuracyMeters(accuracy || 15);
      setUserHeading(heading ?? null);
      setGpsPermissionStatus("granted");
      setHasRealGpsFix(true);
      setGpsState(isLowAccuracy ? "GPS_WEAK_SIGNAL" : "GPS_READY");
      setIsGpsPermissionModalOpen(false);

      if (isLowAccuracy && !isLocked) {
        console.warn(`[Partiu GPS Real] Sinal impreciso (${Math.round(accuracy)}m > 50m). Solicitando confirmação de endereço.`);
        setState((curr) => (curr === "IDLE" ? "EDITING_PICKUP" : curr));
      }

      try {
        localStorage.setItem("partiu_gps_permission", "granted");
      } catch (err) { silentCatchWarn("PassengerRideContext", err); }

      geocodingService
        .geocodificarReverso(realCoords)
        .then((nomeVia) => {
          if (nomeVia) {
            setOrigem(nomeVia);
            try {
              localStorage.setItem("partiu_saved_origin_address", nomeVia);
            } catch (_) {}
          }
        })
        .catch(() => {});

      return true;
    },
    [isValidCoordinate]
  );

  const solicitarPermissaoGps = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsPermissionStatus("denied");
      setGpsState("GPS_DISABLED");
      return false;
    }

    setGpsState("GPS_SEARCHING");

    const queryPosition = (opts: PositionOptions): Promise<GeolocationPosition> => {
      return new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, opts);
      });
    };

    try {
      // Nível 1: Hardware GNSS Direto (Satélite de Alta Precisão)
      const pos = await queryPosition({
        enableHighAccuracy: true,
        timeout: 4000,
        maximumAge: 0,
      });

      return aplicarCoordenadasGps(
        pos.coords.longitude,
        pos.coords.latitude,
        pos.coords.accuracy,
        pos.coords.heading
      );
    } catch (err: any) {
      if (err?.code === 1) {
        // Usuário negou permissão explicitamente no navegador
        setGpsPermissionStatus("denied");
        setGpsState("GPS_DISABLED");
        try {
          localStorage.setItem("partiu_gps_permission", "denied");
        } catch (e) { silentCatchWarn("PassengerRideContext", e); }
        return false;
      }

      console.warn("[Partiu GPS Nível 1 expirou/falhou]:", err?.message, "-> Chaveando para Nível 2 (Wi-Fi/Torres)");

      try {
        // Nível 2: Rede / Wi-Fi / Provedor do Windows/Mobile (Instantâneo em Desktop/PC)
        const pos2 = await queryPosition({
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 30000,
        });

        return aplicarCoordenadasGps(
          pos2.coords.longitude,
          pos2.coords.latitude,
          pos2.coords.accuracy,
          pos2.coords.heading
        );
      } catch (err2: any) {
        console.warn("[Partiu GPS Nível 2 falhou]:", err2?.message, "-> GPS Físico indisponível. PROIBIDO o uso de IP.");
        setGpsState("GPS_WEAK_SIGNAL");

        // Regra de Produção Padrão Uber/99:
        // Se o sinal for fraco, inexistente ou estiver em ambiente Desktop,
        // NÃO tenta adivinhar localização via IP do provedor.
        // Abre o fluxo de confirmação/busca de endereço.
        const userHasLockedOrigin =
          typeof window !== "undefined" &&
          (localStorage.getItem("partiu_origin_user_locked") === "true" ||
            Boolean(localStorage.getItem("partiu_saved_origin_coords")));

        if (userHasLockedOrigin) {
          setGpsPermissionStatus("granted");
          setGpsState("GPS_READY");
          return true;
        }

        // Solicita confirmação de endereço
        setState((curr) => (curr === "IDLE" ? "EDITING_PICKUP" : curr));
        return false;
      }
    }
  }, [aplicarCoordenadasGps]);

  const forcarCentralizarUsuario = useCallback(() => {
    setRecenterCount((c) => c + 1);
    void solicitarPermissaoGps();
  }, [solicitarPermissaoGps]);

  // 2. Rastreamento Contínuo em Primeiro Plano (Live GPS Tracking com Deadband Anti-Jitter)
  const lastResolvedCoordsRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsState("GPS_DISABLED");
      return;
    }

    // Solicita permissão e fix inicial multi-nível
    void solicitarPermissaoGps();

    // Watchdog de GPS: se após 15 segundos não houver fix confirmado, alerta sinal fraco
    const watchdogTimer = setTimeout(() => {
      setGpsState((curr) => (curr === "GPS_SEARCHING" ? "GPS_WEAK_SIGNAL" : curr));
    }, 15000);

    let activeWatchId: number | null = null;

    const onPosSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy, heading } = position.coords;
      if (!isValidCoordinate(longitude, latitude)) return;

      setGpsPermissionStatus("granted");
      setHasRealGpsFix(true);
      setUserAccuracyMeters(accuracy || 15);
      setUserHeading(heading ?? null);
      setGpsState(accuracy <= 60 ? "GPS_READY" : "GPS_WEAK_SIGNAL");

      setOrigemCoords((prev) => {
        // Deadband de micro-oscilação do GPS (~8 metros)
        if (
          prev &&
          Math.abs(prev[0] - longitude) < 0.00008 &&
          Math.abs(prev[1] - latitude) < 0.00008
        ) {
          return prev;
        }

        const nextCoords: [number, number] = [longitude, latitude];

        const last = lastResolvedCoordsRef.current;
        if (
          !last ||
          Math.abs(last[0] - longitude) > 0.00025 ||
          Math.abs(last[1] - latitude) > 0.00025
        ) {
          lastResolvedCoordsRef.current = nextCoords;
          geocodingService
            .geocodificarReverso(nextCoords)
            .then((nomeVia) => {
              if (nomeVia) {
                setOrigem((curr) => {
                  if (!curr || curr === DEFAULT_ORIGIN.endereco || curr === "Meu Local Atual") {
                    return nomeVia;
                  }
                  return curr;
                });
              }
            })
            .catch(() => {});
        }

        return nextCoords;
      });
    };

    activeWatchId = navigator.geolocation.watchPosition(
      onPosSuccess,
      (error) => {
        console.warn("[Partiu GPS Watch GNSS]:", error.message);
        // Em caso de falha de GNSS físico (Desktop/PC/interiores), migra para watcher balanceado de rede
        if (error.code !== 1 && activeWatchId !== null) {
          navigator.geolocation.clearWatch(activeWatchId);
          activeWatchId = navigator.geolocation.watchPosition(
            onPosSuccess,
            (err2) => {
              console.warn("[Partiu GPS Watch Rede]:", err2.message);
              setGpsState("GPS_WEAK_SIGNAL");
            },
            { enableHighAccuracy: false, timeout: 12000, maximumAge: 30000 }
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );

    return () => {
      if (activeWatchId !== null) {
        navigator.geolocation.clearWatch(activeWatchId);
      }
      clearTimeout(watchdogTimer);
    };
  }, [solicitarPermissaoGps, isValidCoordinate]);

  // Pontos Estratégicos de Embarque (Smart Pickups) calculados a partir da localização do passageiro
  const smartPickups = useMemo(() => {
    return getStrategicPickupPoints(origemCoords);
  }, [origemCoords]);

  const [destino, setDestino] = useState("");
  const [destinoCoords, setDestinoCoords] = useState<[number, number]>(() => origemCoords);

  const [distanciaKm, setDistanciaKm] = useState(0);
  const [duracaoMin, setDuracaoMin] = useState(0);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [activeRide, setActiveRide] = useState<CorridaPartiu | null>(() => getCorridaAtiva());

  // Recursos Inteligentes Estilo 99
  const [preferences, setPreferences] = useState<PassengerPreferences>({
    arCondicionado: false,
    viagemSilenciosa: false,
    bagagemPortaMalas: false,
    isFemaleOnly: false,
  });
  const [precisaTroco, setPrecisaTroco] = useState("nao");
  const [pagamentoNaMaquininha, setPagamentoNaMaquininha] = useState(false);
  const [viajanteOutraPessoa, setViajanteOutraPessoa] = useState(false);
  const [nomeOutroPassageiro, setNomeOutroPassageiro] = useState("");
  const [telefoneOutroPassageiro, setTelefoneOutroPassageiro] = useState("");
  const [paradas, setParadas] = useState<ParadaItem[]>([]);
  const [paradaIntermediaria, setParadaIntermediaria] = useState<string | null>(null);

  const adicionarParada = useCallback((endereco: string, coords?: { lat: number; lng: number }) => {
    if (!endereco.trim()) return;
    setParadas((prev) => {
      if (prev.length >= 2) return prev;
      const nova: ParadaItem = {
        id: `parada_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        endereco: endereco.trim(),
        coords,
      };
      const updated = [...prev, nova];
      setParadaIntermediaria(updated[0]?.endereco || null);
      return updated;
    });
  }, []);

  const removerParada = useCallback((id: string) => {
    setParadas((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      setParadaIntermediaria(updated[0]?.endereco || null);
      return updated;
    });
  }, []);

  const handleSetParadaIntermediaria = useCallback((val: string | null) => {
    setParadaIntermediaria(val);
    if (val && val.trim()) {
      setParadas([
        {
          id: `parada_${Date.now()}`,
          endereco: val.trim(),
        },
      ]);
    } else {
      setParadas([]);
    }
  }, []);

  // Coordenadas do condutor em rota (alimentadas pelo realtime oficial de motoristas)
  const [driverCoords, setDriverCoords] = useState<[number, number]>(() => origemCoords);

  const togglePreference = useCallback((key: keyof PassengerPreferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);

  // Recálculo da rota real pela RoutingService (Mapbox Directions com trânsito ao vivo + Multi-Waypoints)
  useEffect(() => {
    if (!destinoCoords || !origemCoords || !destino) return;
    let cancel = false;
    const waypointsCoords: [number, number][] = paradas
      .filter((p) => p.coords?.lng !== undefined && p.coords?.lat !== undefined)
      .map((p) => [p.coords!.lng, p.coords!.lat]);

    routingService
      .getRoute(origemCoords, destinoCoords, {
        trafficAware: true,
        waypoints: waypointsCoords.length > 0 ? waypointsCoords : undefined,
      })
      .then((metrics) => {
        if (!cancel && metrics) {
          setRouteMetrics(metrics);
          setDistanciaKm(metrics.distanceKm);
          setDuracaoMin(metrics.trafficDurationMinutes || metrics.durationMinutes);
        }
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [origemCoords[0], origemCoords[1], destinoCoords[0], destinoCoords[1], destino, paradas]);

  // Cotações recalculadas de forma reativa (compatibilidade legada)
  const cotacoes = useMemo(() => {
    return calcularCotacoesPassageiro(distanciaKm, duracaoMin);
  }, [distanciaKm, duracaoMin]);

  // Cotações oficiais para as 7 categorias (incluindo taxa de multi-paradas)
  const multiCategoryQuotes = useMemo(() => {
    const dummyMetrics: RouteMetrics = routeMetrics || {
      distanceMeters: Math.round(distanciaKm * 1000),
      distanceKm: distanciaKm,
      durationSeconds: Math.round(duracaoMin * 60),
      durationMinutes: duracaoMin,
      encodedPolyline: "",
      startAddress: origem,
      endAddress: destino,
      provider: "calibrated_urban_network",
    };
    return pricingService.calculateMultiCategoryQuotes(dummyMetrics, {}, paradas.length);
  }, [routeMetrics, distanciaKm, duracaoMin, origem, destino, paradas.length]);

  const activeQuote = useMemo(() => {
    let key: SupportedVehicleCategory = "PARTIU_CARRO";
    if (categoriaVeiculo === "MOTO") key = "PARTIU_MOTO";
    else if (categoriaVeiculo === "CARRO") key = "PARTIU_CARRO";
    else if (categoriaVeiculo === "EXECUTIVO") key = "PARTIU_EXECUTIVO";
    else if (categoriaVeiculo === "FLASH") key = "PARTIU_FLASH";
    else if (categoriaVeiculo === "ENTREGA") key = "PARTIU_ENTREGA";
    else if (categoriaVeiculo === "TURISMO") key = "PARTIU_TURISMO";
    else if (categoriaVeiculo === "VAN") key = "PARTIU_VAN";
    return multiCategoryQuotes[key] || multiCategoryQuotes.PARTIU_CARRO;
  }, [multiCategoryQuotes, categoriaVeiculo]);

  // ETA dinâmico em tempo real calculado entre o condutor e o ponto de embarque
  const etaCalculado = useMemo(() => {
    const mod = categoriaVeiculo === "MOTO" ? "MOTO" : "CARRO";
    return calcularEtaDinamico(driverCoords, origemCoords, mod);
  }, [driverCoords, origemCoords, categoriaVeiculo]);

  // Horário previsto para término da corrida no destino
  const horarioDesembarquePrevisto = useMemo(() => {
    const duracaoViagem = activeQuote.tripDurationMinutes || duracaoMin;
    return formatarHorarioChegada(duracaoViagem);
  }, [activeQuote, duracaoMin]);

  // Sincronização com o motor geral de corridas e eventos de telemetria
  useEffect(() => {
    const corridaSalva = getCorridaAtiva();
    if (corridaSalva && !corridaSalva.isEntrega) {
      setActiveRide(corridaSalva);
      if (corridaSalva.status === "PROCURANDO") {
        setState("FINDING_DRIVER");
      } else if (corridaSalva.status === "A_CAMINHO" || corridaSalva.status === "CHEGOU") {
        setState("DRIVER_ASSIGNED");
      } else if (corridaSalva.status === "EM_VIAGEM") {
        setState("ON_TRIP");
      }
    }

    const handleMudanca = (e: any) => {
      const c: CorridaPartiu | null = e.detail;
      if (c && !c.isEntrega) {
        setActiveRide(c);
        if (c.status === "PROCURANDO") {
          setState("FINDING_DRIVER");
        } else if (c.status === "A_CAMINHO" || c.status === "CHEGOU") {
          setState("DRIVER_ASSIGNED");
        } else if (c.status === "EM_VIAGEM") {
          setState("ON_TRIP");
        } else if (c.status === "CONCLUIDA") {
          setState("COMPLETED");
        }
      } else if (!c) {
        setActiveRide(null);
      }
    };

    const handleDriverMove = (e: any) => {
      if (e.detail?.coords && Array.isArray(e.detail.coords) && e.detail.coords.length === 2) {
        setDriverCoords(e.detail.coords as [number, number]);
      }
    };

    window.addEventListener("partiu:corrida_atualizada", handleMudanca);
    window.addEventListener("partiu:driver_location_updated", handleDriverMove);
    return () => {
      window.removeEventListener("partiu:corrida_atualizada", handleMudanca);
      window.removeEventListener("partiu:driver_location_updated", handleDriverMove);
    };
  }, []);

  // 1. Iniciar busca de destino (Transição IDLE -> SELECTING_DESTINATION)
  const startSearch = useCallback(() => {
    // Garante que o GPS seja resolvido para o endereço de rua atual do usuário
    if (!origem || origem === "Meu Local Atual" || origem === DEFAULT_ORIGIN.endereco) {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
            setOrigemCoords(coords);
            try {
              const nomeVia = await geocodingService.geocodificarReverso(coords);
              if (nomeVia) setOrigem(nomeVia);
            } catch (err) { silentCatchWarn("PassengerRideContext", err); }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }
    setState("SELECTING_DESTINATION");
  }, [origem]);

  // 1.1 Iniciar modo de edição de ponto de embarque (Transição SELECTING_DESTINATION -> EDITING_PICKUP)
  const startEditingPickup = useCallback(() => {
    setState("EDITING_PICKUP");
  }, []);

  // 1.2 Selecionar ponto estratégico de embarque
  const selectStrategicPickup = useCallback(
    (point: StrategicPickupPoint) => {
      setOrigem(point.nome);
      setOrigemCoords(point.coords);
      if (destinoCoords) {
        const eta = calcularEtaDinamico(point.coords, destinoCoords, categoriaVeiculo);
        setDistanciaKm(Math.max(1.2, eta.distanciaKm));
        setDuracaoMin(Math.max(3, eta.duracaoMinutos));
      }
      setState((prev) => (prev === "CONFIRMING_PICKUP" ? "CONFIRMING_PICKUP" : "SELECTING_DESTINATION"));
    },
    [destinoCoords, categoriaVeiculo]
  );

  // 1.3 Voltar para a seleção de destino
  const backToSelectingDestination = useCallback(() => {
    setState("SELECTING_DESTINATION");
  }, []);

  // 1.4 Cancelar busca e retornar ao IDLE
  const cancelSearch = useCallback(() => {
    setState("IDLE");
  }, []);

  // 1.5 Atualizar Ponto de Embarque diretamente pelo arraste do Mapa ou GPS
  const updatePickupLocationFromMap = useCallback(
    async (coords: [number, number], enderecoCustom?: string) => {
      // Deadband anti-churn: se não for endereço manual/customizado e estiver a menos de 20m, silencia
      if (!enderecoCustom && origemCoordsRef.current) {
        const deltaLng = Math.abs(origemCoordsRef.current[0] - coords[0]);
        const deltaLat = Math.abs(origemCoordsRef.current[1] - coords[1]);
        if (deltaLng < 0.00018 && deltaLat < 0.00018) {
          return;
        }
      }

      setOrigemCoords(coords);
      origemCoordsRef.current = coords;
      try {
        localStorage.setItem("partiu_saved_origin_coords", JSON.stringify(coords));
        localStorage.setItem("partiu_origin_user_locked", "true");
      } catch (_) {}

      if (enderecoCustom) {
        setOrigem(enderecoCustom);
        try {
          localStorage.setItem("partiu_saved_origin_address", enderecoCustom);
        } catch (_) {}
      } else {
        setIsResolvingAddress(true);
        try {
          const nomeVia = await geocodingService.geocodificarReverso(coords);
          setOrigem(nomeVia);
          try {
            localStorage.setItem("partiu_saved_origin_address", nomeVia);
          } catch (_) {}
        } catch {
          setOrigem("Ponto selecionado no mapa");
        } finally {
          setIsResolvingAddress(false);
        }
      }

      if (destinoCoords) {
        const eta = calcularEtaDinamico(coords, destinoCoords, categoriaVeiculo);
        setDistanciaKm(Math.max(1.2, eta.distanciaKm));
        setDuracaoMin(Math.max(3, eta.duracaoMinutos));
      }
    },
    [destinoCoords, categoriaVeiculo]
  );

  // 1.6 Confirmar Pino de Embarque e retornar à tela adequada (Home ou Revisão de Rota)
  const confirmPickupPin = useCallback(() => {
    if (origemCoordsRef.current) {
      try {
        localStorage.setItem("partiu_saved_origin_coords", JSON.stringify(origemCoordsRef.current));
        localStorage.setItem("partiu_origin_user_locked", "true");
        if (origem && origem !== "Meu Local Atual") {
          localStorage.setItem("partiu_saved_origin_address", origem);
        }
      } catch (_) {}
    }
    setState((prev) => (destino ? "REVIEWING_ROUTE" : "IDLE"));
  }, [destino, origem]);

  // 2. Selecionar Destino (Transição SEARCHING_DESTINATION -> REVIEWING_ROUTE) com cálculo determinístico
  const selectDestination = useCallback(
    (destinoTexto: string, coords?: [number, number]) => {
      setDestino(destinoTexto);
      let coordsFinal: [number, number] = coords || destinoCoords;
      if (!coords) {
        const encontrado = LUGARES_CURADOS_ITAPERUNA.find(
          (l) =>
            l.label.toLowerCase() === destinoTexto.toLowerCase() ||
            l.endereco.toLowerCase() === destinoTexto.toLowerCase()
        );
        if (encontrado) {
          coordsFinal = encontrado.coords;
        }
      }
      setDestinoCoords(coordsFinal);

      // Cálculo determinístico e transparente via serviço de mobilidade
      const eta = calcularEtaDinamico(origemCoords, coordsFinal, categoriaVeiculo);
      const dist = Math.max(1.2, eta.distanciaKm);
      setDistanciaKm(dist);
      setDuracaoMin(Math.max(3, eta.duracaoMinutos));
      setState("REVIEWING_ROUTE");
    },
    [origemCoords, destinoCoords, categoriaVeiculo]
  );

  const setOrigemEndereco = useCallback((origemTexto: string, coords?: [number, number]) => {
    setOrigem(origemTexto);
    try {
      localStorage.setItem("partiu_saved_origin_address", origemTexto);
      localStorage.setItem("partiu_origin_user_locked", "true");
    } catch (_) {}
    if (coords) {
      setOrigemCoords(coords);
      origemCoordsRef.current = coords;
      try {
        localStorage.setItem("partiu_saved_origin_coords", JSON.stringify(coords));
      } catch (_) {}
    }
  }, []);

  const swapOrigemDestino = useCallback(() => {
    if (!destino) return;
    const prevOrigem = origem;
    const prevOrigemCoords = origemCoords;
    setOrigem(destino);
    setOrigemCoords(destinoCoords);
    setDestino(prevOrigem);
    setDestinoCoords(prevOrigemCoords);
    if (prevOrigemCoords && destinoCoords) {
      const eta = calcularEtaDinamico(destinoCoords, prevOrigemCoords, categoriaVeiculo);
      setDistanciaKm(Math.max(1.2, eta.distanciaKm));
      setDuracaoMin(Math.max(3, eta.duracaoMinutos));
    }
  }, [origem, origemCoords, destino, destinoCoords, categoriaVeiculo]);

  const selectDestinationOnMap = useCallback(() => {
    setState("CONFIRMING_DESTINATION_MAP");
  }, []);

  const backFromDestinationMapPin = useCallback(() => {
    setState("SELECTING_DESTINATION");
  }, []);

  const updateDestinationLocationFromMap = useCallback(
    async (coords: [number, number], enderecoCustom?: string) => {
      setDestinoCoords(coords);
      if (enderecoCustom) {
        setDestino(enderecoCustom);
      } else {
        setIsResolvingAddress(true);
        try {
          const nomeVia = await geocodingService.geocodificarReverso(coords);
          setDestino(nomeVia || "Ponto selecionado no mapa");
        } catch {
          setDestino("Ponto selecionado no mapa");
        } finally {
          setIsResolvingAddress(false);
        }
      }

      if (origemCoords) {
        const eta = calcularEtaDinamico(origemCoords, coords, categoriaVeiculo);
        setDistanciaKm(Math.max(1.2, eta.distanciaKm));
        setDuracaoMin(Math.max(3, eta.duracaoMinutos));
      }
    },
    [origemCoords, categoriaVeiculo]
  );

  const confirmDestinationPin = useCallback(
    (coords: [number, number], endereco?: string) => {
      setDestinoCoords(coords);
      if (endereco) setDestino(endereco);
      if (origemCoords) {
        const eta = calcularEtaDinamico(origemCoords, coords, categoriaVeiculo);
        setDistanciaKm(Math.max(1.2, eta.distanciaKm));
        setDuracaoMin(Math.max(3, eta.duracaoMinutos));
      }
      setState("REVIEWING_ROUTE");
    },
    [origemCoords, categoriaVeiculo]
  );

  // 3. Seleção de veículo com persistência preditiva (suporte total às 7 categorias)
  const selectVehicle = useCallback((cat: PassengerVehicleCategory) => {
    setCategoriaVeiculo(cat);
    try {
      localStorage.setItem("partiu_preferred_category", cat);
    } catch (err) { silentCatchWarn("PassengerRideContext", err); }
  }, []);

  // 4. Seleção de pagamento (PIX ou Dinheiro) com persistência preditiva
  const selectPaymentMethod = useCallback((method: PaymentMethod) => {
    setFormaPagamento(method);
    try {
      localStorage.setItem("partiu_preferred_payment", method);
    } catch (err) { silentCatchWarn("PassengerRideContext", err); }
  }, []);

  // 5. Avançar para Confirmação do Pino de Embarque (Transição REVIEWING_ROUTE -> CONFIRMING_PICKUP)
  const proceedToConfirmPickup = useCallback(() => {
    setState("CONFIRMING_PICKUP");
  }, []);

  // 5.1 Voltar para revisão de rota a partir do pino (ou Home se não houver destino)
  const backToReviewRoute = useCallback(() => {
    setState((prev) => (destino ? "REVIEWING_ROUTE" : "IDLE"));
  }, [destino]);

  // 6. Confirmar Pino e Iniciar Radar de Busca (Transição CONFIRMING_PICKUP -> SEARCHING_R1)
  const confirmPickupAndFindDriver = useCallback(() => {
    // Bloqueia a criação do pedido se o usuário tiver negado a permissão do GPS
    if (gpsPermissionStatus === "denied") {
      setIsGpsPermissionModalOpen(true);
      return;
    }

    setState("SEARCHING_R1");

    const valorCobrado = activeQuote.priceBrl;

    // Blindagem Antifraude com auditoria in-process e servidor
    antifraudService
      .verifyAndAuthorizeRide({
        pickupCoordinates: origemCoords,
        destinationCoordinates: destinoCoords,
        category: categoriaVeiculo,
        clientClaimedFare: valorCobrado,
      })
      .then((audit) => {
        if (!audit.isApproved) {
          console.warn("[Antifraud Shield] Auditoria de corrida:", audit.rejectionReason);
        }
      })
      .catch(() => {});

    const modalidadeEnvio =
      categoriaVeiculo === "MOTO" ? "MOTO" : categoriaVeiculo === "CARRO" ? "POP" : categoriaVeiculo;

    const isOutraPessoa = viajanteOutraPessoa && Boolean(nomeOutroPassageiro.trim());
    const telPassageiro = isOutraPessoa && telefoneOutroPassageiro.trim() ? telefoneOutroPassageiro.trim() : "(22) 99876-5432";

    const novaCorrida = criarNovaCorrida({
      origem,
      destino,
      modalidade: modalidadeEnvio as any,
      valor: valorCobrado,
      distanciaKm,
      duracaoMin: activeQuote.tripDurationMinutes || duracaoMin,
      formaPagamento: formaPagamento === "pix" ? "pix" : "dinheiro",
      passageiroNome: isOutraPessoa ? nomeOutroPassageiro.trim() : "Rodrigo Gomes",
      passageiroTelefone: telPassageiro,
      isFemaleOnly: preferences.isFemaleOnly,
      origemCoords: { lat: origemCoords[1], lng: origemCoords[0] },
      destinoCoords: { lat: destinoCoords[1], lng: destinoCoords[0] },
      isForOtherPerson: isOutraPessoa,
      otherPersonName: isOutraPessoa ? nomeOutroPassageiro.trim() : undefined,
      otherPersonPhone: isOutraPessoa ? telPassageiro : undefined,
      solicitanteNome: "Rodrigo Gomes",
      solicitanteTelefone: "(22) 99876-5432",
      paradas: paradas.map((p) => ({
        id: p.id,
        endereco: p.endereco,
        coords: p.coords,
        concluida: false,
      })),
    });

    setActiveRide(novaCorrida);

    // Inicia Despacho em Ondas Progressivas PostGIS V4 com Coordenadas Reais do Hardware GPS
    void progressiveDispatchEngine.startProgressiveDispatch({
      rideId: novaCorrida.id,
      category: modalidadeEnvio,
      pickupCoords: origemCoords,
      destinationCoords: destinoCoords,
      fareBrl: valorCobrado,
    });

    // Mantém compatibilidade com a cascata legada usando coordenadas reais
    void dispatchQueueBuilder.startCascadeDispatch({
      rideId: novaCorrida.id,
      category: modalidadeEnvio,
      pickupCoords: origemCoords,
      destinationCoords: destinoCoords,
      fareBrl: valorCobrado,
    });
  }, [
    gpsPermissionStatus,
    categoriaVeiculo,
    activeQuote,
    origem,
    origemCoords,
    destino,
    destinoCoords,
    distanciaKm,
    duracaoMin,
    formaPagamento,
    viajanteOutraPessoa,
    nomeOutroPassageiro,
    telefoneOutroPassageiro,
    preferences.isFemaleOnly,
    paradas,
  ]);

  // Escuta eventos de despacho progressivo em tempo real e aceite
  useEffect(() => {
    const handleProgressiveUpdate = (e: any) => {
      const session: ProgressiveDispatchSession = e.detail;
      if (!session) return;
      if (session.status === "CANCELLED") {
        setProgressiveSession(null);
        return;
      }
      const currentActiveId = activeRide?.id || getCorridaAtiva()?.id;
      if (currentActiveId && session.rideId !== currentActiveId) {
        return;
      }
      setProgressiveSession(session);
      if (
        session.status === "SEARCHING_R1" ||
        session.status === "SEARCHING_R2" ||
        session.status === "SEARCHING_R3" ||
        session.status === "TIMEOUT"
      ) {
        setState(session.status);
      }
    };

    const handleRideAccepted = (e: any) => {
      const { session, driver } = e.detail || {};
      const currentActive = activeRide || getCorridaAtiva();
      if (currentActive && session?.rideId === currentActive.id) {
        const customMotorista = driver
          ? {
              id: driver.driverId || "drv-1",
              nome: driver.name || "Motorista Parceiro",
              foto: driver.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
              avaliacao: Number(driver.rating) || 4.9,
              totalViagens: 120,
              veiculo: driver.vehicleModel || (categoriaVeiculo === "MOTO" ? "Honda CG 160 Titan" : "Chevrolet Onix"),
              placa: driver.licensePlate || "BRA-4X99",
              telefone: driver.phone || "(22) 99876-5432",
            }
          : undefined;

        const aceita = motoristaAceitarCorrida(customMotorista);
        if (aceita) {
          setActiveRide(aceita);
          setState("DRIVER_ASSIGNED");
        }
      }
    };

    const handleTimeout = (e: any) => {
      const { rideId } = e.detail || {};
      const currentActive = activeRide || getCorridaAtiva();
      if (currentActive && rideId === currentActive.id) {
        setState("TIMEOUT");
      }
    };

    window.addEventListener("partiu:progressive_dispatch_updated", handleProgressiveUpdate);
    window.addEventListener("partiu:dispatch_ride_accepted", handleRideAccepted);
    window.addEventListener("partiu:dispatch_ride_timeout", handleTimeout);

    return () => {
      window.removeEventListener("partiu:progressive_dispatch_updated", handleProgressiveUpdate);
      window.removeEventListener("partiu:dispatch_ride_accepted", handleRideAccepted);
      window.removeEventListener("partiu:dispatch_ride_timeout", handleTimeout);
    };
  }, [activeRide, categoriaVeiculo]);

  // 7. Cancelamento de Corrida com Modal
  const requestCancel = useCallback(() => {
    setIsCancelModalOpen(true);
  }, []);

  const dismissCancel = useCallback(() => {
    setIsCancelModalOpen(false);
  }, []);

  const confirmCancel = useCallback((reason?: { code?: string; label?: string }) => {
    const currentActive = activeRide || getCorridaAtiva();
    const rideId = currentActive?.id || progressiveSession?.rideId;

    if (rideId) {
      try {
        dispatchQueueBuilder.cancelCascade(rideId);
      } catch (err) {
        console.warn("[PassengerRideContext] Erro ao cancelar dispatchQueueBuilder:", err);
      }
      try {
        progressiveDispatchEngine.cancelDispatch(rideId, reason?.code || "PASSENGER_CONFIRMED_CANCEL");
      } catch (err) {
        console.warn("[PassengerRideContext] Erro ao cancelar progressiveDispatchEngine:", err);
      }
    }

    try {
      cancelarCorrida({
        reasonCode: reason?.code || "PASSENGER_CONFIRMED_CANCEL",
        reasonLabel: reason?.label || "Cancelamento confirmado pelo passageiro",
      });
    } catch (err) {
      console.warn("[PassengerRideContext] Erro ao cancelar corrida:", err);
    }

    setIsCancelModalOpen(false);
    setActiveRide(null);
    setProgressiveSession(null);
    setState("IDLE");
  }, [activeRide, progressiveSession]);

  // 7.1 Tentar novamente após Timeout (Reinicia o ciclo em SEARCHING_R1)
  const retrySearchAfterTimeout = useCallback(() => {
    const currentActive = activeRide || getCorridaAtiva();
    if (currentActive) {
      setState("SEARCHING_R1");
      void progressiveDispatchEngine.retrySearch(currentActive.id);
    } else {
      confirmPickupAndFindDriver();
    }
  }, [activeRide, confirmPickupAndFindDriver]);

  // 7.2 Cancelar busca após Timeout (Retorna ao mapa IDLE)
  const cancelRideAfterTimeout = useCallback(() => {
    const currentActive = activeRide || getCorridaAtiva();
    const rideId = currentActive?.id || progressiveSession?.rideId;

    if (rideId) {
      try {
        dispatchQueueBuilder.cancelCascade(rideId);
      } catch (_) {}
      try {
        progressiveDispatchEngine.cancelDispatch(rideId, "PASSENGER_TIMEOUT_CANCEL");
      } catch (_) {}
    }

    try {
      cancelarCorrida();
    } catch (_) {}

    setActiveRide(null);
    setProgressiveSession(null);
    setIsCancelModalOpen(false);
    setState("IDLE");
  }, [activeRide, progressiveSession]);


  // 8. Reiniciar fluxo completo para IDLE
  const resetToIdle = useCallback(() => {
    setState("IDLE");
    setActiveRide(null);
    setDestino("");
    setParadas([]);
    setParadaIntermediaria(null);
    setIsCancelModalOpen(false);
  }, []);

  const value = useMemo<PassengerRideContextValue>(
    () => ({
      state,
      categoriaVeiculo,
      formaPagamento,
      origem,
      origemCoords,
      destino,
      destinoCoords,
      distanciaKm,
      duracaoMin,
      cotacoes,
      routeMetrics,
      multiCategoryQuotes,
      categoriesList: OFFICIAL_CATEGORIES,
      activeQuote,
      activeRide,
      isCancelModalOpen,
      preferences,
      togglePreference,
      precisaTroco,
      setPrecisaTroco,
      pagamentoNaMaquininha,
      setPagamentoNaMaquininha,
      viajanteOutraPessoa,
      nomeOutroPassageiro,
      telefoneOutroPassageiro,
      setViajanteOutraPessoa,
      setNomeOutroPassageiro,
      setTelefoneOutroPassageiro,
      paradas,
      adicionarParada,
      removerParada,
      paradaIntermediaria,
      setParadaIntermediaria: handleSetParadaIntermediaria,
      horarioDesembarquePrevisto,
      etaCalculado,
      driverCoords,
      setDriverCoords,
      smartPickups,
      startEditingPickup,
      selectStrategicPickup,
      backToSelectingDestination,
      updatePickupLocationFromMap,
      confirmPickupPin,
      isResolvingAddress,
      startSearch,
      cancelSearch,
      selectDestination,
      selectDestinationOnMap,
      backFromDestinationMapPin,
      confirmDestinationPin,
      updateDestinationLocationFromMap,
      setOrigemEndereco,
      swapOrigemDestino,
      selectVehicle,
      selectPaymentMethod,
      proceedToConfirmPickup,
      backToReviewRoute,
      confirmPickupAndFindDriver,
      requestCancel,
      dismissCancel,
      confirmCancel,
      resetToIdle,
      progressiveSession,
      retrySearchAfterTimeout,
      cancelRideAfterTimeout,
      gpsState,
      gpsPermissionStatus,
      hasRealGpsFix,
      userAccuracyMeters,
      userHeading,
      recenterCount,
      forcarCentralizarUsuario,
      isGpsPermissionModalOpen,
      closeGpsPermissionModal,
      solicitarPermissaoGps,
    }),
    [
      state,
      categoriaVeiculo,
      formaPagamento,
      origem,
      origemCoords,
      destino,
      destinoCoords,
      distanciaKm,
      duracaoMin,
      cotacoes,
      routeMetrics,
      multiCategoryQuotes,
      activeQuote,
      activeRide,
      isCancelModalOpen,
      preferences,
      togglePreference,
      precisaTroco,
      pagamentoNaMaquininha,
      viajanteOutraPessoa,
      nomeOutroPassageiro,
      telefoneOutroPassageiro,
      paradas,
      adicionarParada,
      removerParada,
      paradaIntermediaria,
      handleSetParadaIntermediaria,
      horarioDesembarquePrevisto,
      etaCalculado,
      driverCoords,
      smartPickups,
      startEditingPickup,
      selectStrategicPickup,
      backToSelectingDestination,
      updatePickupLocationFromMap,
      confirmPickupPin,
      isResolvingAddress,
      startSearch,
      cancelSearch,
      selectDestination,
      selectDestinationOnMap,
      backFromDestinationMapPin,
      confirmDestinationPin,
      updateDestinationLocationFromMap,
      setOrigemEndereco,
      swapOrigemDestino,
      selectVehicle,
      selectPaymentMethod,
      proceedToConfirmPickup,
      backToReviewRoute,
      confirmPickupAndFindDriver,
      requestCancel,
      dismissCancel,
      confirmCancel,
      resetToIdle,
      progressiveSession,
      retrySearchAfterTimeout,
      cancelRideAfterTimeout,
      gpsState,
      gpsPermissionStatus,
      hasRealGpsFix,
      userAccuracyMeters,
      userHeading,
      recenterCount,
      forcarCentralizarUsuario,
      isGpsPermissionModalOpen,
      closeGpsPermissionModal,
      solicitarPermissaoGps,
    ]
  );

  return (
    <PassengerRideContext.Provider value={value}>
      {children}
    </PassengerRideContext.Provider>
  );
}

export function usePassengerRide(): PassengerRideContextValue {
  const ctx = useContext(PassengerRideContext);
  if (!ctx) {
    throw new Error("usePassengerRide deve ser utilizado dentro de PassengerRideProvider.");
  }
  return ctx;
}
