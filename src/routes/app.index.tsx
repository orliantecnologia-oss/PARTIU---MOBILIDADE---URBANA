import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { Check } from "lucide-react";
import {
  PassengerRideProvider,
  usePassengerRide,
} from "@/contexts/PassengerRideContext";
import {
  DestinationCard,
  PromoCarousel,
  HomeBottomNav,
  AnimatedWaveHeader,
  RECENT_SEARCH_MOCKS,
  RecentAddressItem,
  PROMO_BANNERS_MOCK,
  PromoBannerItem,
} from "@/components/home";
import { bannerService } from "@/lib/ecosystem/banner-service";
import { PassengerSearchDestinationSheet } from "@/components/passenger/PassengerSearchDestinationSheet";
import { PassengerReviewRouteSheet } from "@/components/passenger/PassengerReviewRouteSheet";
import { PassengerConfirmPickupPin } from "@/components/passenger/PassengerConfirmPickupPin";
import { PassengerConfirmDestinationPin } from "@/components/passenger/PassengerConfirmDestinationPin";
import { PassengerFindingDriverRadar } from "@/components/passenger/PassengerFindingDriverRadar";
import { PassengerTimeoutBottomSheet } from "@/components/passenger/PassengerTimeoutBottomSheet";
import { PassengerActiveRideCard } from "@/components/passenger/PassengerActiveRideCard";
import { DriverEnRouteSheet } from "@/components/passenger/DriverEnRouteSheet";
import { LiveRingingToast } from "@/components/passenger/LiveRingingToast";
import { NetworkReconnectionBanner } from "@/components/passenger/NetworkReconnectionBanner";
import { GpsPermissionModal } from "@/components/passenger/GpsPermissionModal";
import { PartiuRideMap } from "@/components/maps/PartiuRideMap";
import { getStatusPermissaoPush } from "@/lib/push-notifications";
import { useScrollInterpolation } from "@/hooks/useScrollInterpolation";

// Lazy loading sob demanda para componentes pesados secundários (TTI acelerado)
const AppDrawer = lazy(() =>
  import("@/components/navigation/AppDrawer").then((m) => ({ default: m.AppDrawer }))
);
const NotificacoesPushModal = lazy(() =>
  import("@/components/modals/NotificacoesPushModal").then((m) => ({ default: m.NotificacoesPushModal }))
);

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "PARTIU — Corridas Expressas de Carro e Moto" },
      {
        name: "description",
        content:
          "Solicite carros e motos para transporte urbano com tarifa transparente e agilidade em Itaperuna, RJ.",
      },
    ],
  }),
  component: PartiuPassengerHomeRoot,
});

function PartiuPassengerHomeRoot() {
  return (
    <PassengerRideProvider>
      <PartiuPassengerHomeContent />
    </PassengerRideProvider>
  );
}

function PartiuPassengerHomeContent() {
  const {
    state,
    categoriaVeiculo,
    origem,
    origemCoords,
    destino,
    destinoCoords,
    driverCoords,
    activeRide,
    startSearch,
    startEditingPickup,
    proceedToConfirmPickup,
    selectDestination,
    smartPickups,
    selectStrategicPickup,
    updatePickupLocationFromMap,
    updateDestinationLocationFromMap,
    userAccuracyMeters,
  } = usePassengerRide();

  const [drawerAberto, setDrawerAberto] = useState(false);
  const [modalPushAberto, setModalPushAberto] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>("default");
  const [userName, setUserName] = useState("Rodrigo");
  const [modalCamadasAberto, setModalCamadasAberto] = useState(false);
  const [estiloMapaAtivo, setEstiloMapaAtivo] = useState<"streets" | "traffic" | "satellite">("streets");

  // Callbacks memorizados para garantir Pure Rendering e zero re-renders nas camadas filhas
  const handleOpenDrawer = useCallback(() => setDrawerAberto(true), []);
  const handleCloseDrawer = useCallback(() => setDrawerAberto(false), []);
  const handleOpenNotifications = useCallback(() => setModalPushAberto(true), []);
  const handleCloseNotifications = useCallback(() => {
    setModalPushAberto(false);
    setPushStatus(getStatusPermissaoPush());
  }, []);
  const handleOpenLayersModal = useCallback(() => setModalCamadasAberto(true), []);
  const handleCloseLayersModal = useCallback(() => setModalCamadasAberto(false), []);
  const handleSelectMapStyle = useCallback((style: "streets" | "traffic" | "satellite") => {
    setEstiloMapaAtivo(style);
    setModalCamadasAberto(false);
  }, []);
  const handleSelectAddressItem = useCallback(
    (item: RecentAddressItem) => {
      selectDestination(item.endereco, item.coords);
    },
    [selectDestination]
  );

  // Histórico de destinos recentes do passageiro
  const [recentAddresses, setRecentAddresses] = useState<RecentAddressItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const salvo = localStorage.getItem("partiu_recent_destinations_v1");
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 2).map((item: any) => ({
            id: item.id,
            titulo: item.label || item.titulo || "Recente",
            endereco: item.endereco,
            coords: item.coords || [-41.886, -21.2065],
          }));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Banners Ativos do Ecossistema (Backend/Database)
  const [activeBanners, setActiveBanners] = useState<PromoBannerItem[]>(() => {
    const fromService = bannerService.getActiveBanners("PASSENGER");
    if (fromService.length > 0) {
      return fromService.map((b, idx) => ({
        id: b.id,
        badge: b.badge || "DESTAQUE",
        titulo: b.title,
        subtitulo: b.subtitle || "",
        imagemUrl: b.image_url,
        acaoUrl: b.link_url,
        corGradiente:
          idx % 2 === 0
            ? "from-primary-600 via-primary-600 to-yellow-500 text-slate-950"
            : "from-slate-900 via-slate-800 to-slate-950 text-white",
        tagCor: idx % 2 === 0 ? "bg-black text-primary-500" : "bg-primary-600 text-slate-950",
      }));
    }
    return PROMO_BANNERS_MOCK;
  });

  // Hook desacoplado de UX Motion para interpolação de scroll (0 a 28px no raio da onda)
  const { scrollRef, waveRadius, isScrolled, onScroll } = useScrollInterpolation({
    maxRadius: 28,
    threshold: 80,
  });

  useEffect(() => {
    setPushStatus(getStatusPermissaoPush());
    const salvo =
      localStorage.getItem("partiu_user_nome") ||
      localStorage.getItem("univans_user_nome");
    if (salvo) setUserName(salvo);

    const carregarRecentes = () => {
      try {
        const salvoRec = localStorage.getItem("partiu_recent_destinations_v1");
        if (salvoRec) {
          const parsed = JSON.parse(salvoRec);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecentAddresses(
              parsed.slice(0, 2).map((item: any) => ({
                id: item.id,
                titulo: item.label || item.titulo || "Recente",
                endereco: item.endereco,
                coords: item.coords || [-41.886, -21.2065],
              }))
            );
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", carregarRecentes);

    // Inscrição reativa para alterações de banners no Admin
    const unsubBanner = bannerService.subscribe((all) => {
      const passengerBanners = all.filter((b) => b.is_active && (b.category === "PASSENGER" || b.category === "ALL"));
      if (passengerBanners.length > 0) {
        setActiveBanners(
          passengerBanners.map((b, idx) => ({
            id: b.id,
            badge: b.badge || "DESTAQUE",
            titulo: b.title,
            subtitulo: b.subtitle || "",
            imagemUrl: b.image_url,
            acaoUrl: b.link_url,
            corGradiente:
              idx % 2 === 0
                ? "from-primary-600 via-primary-600 to-yellow-500 text-slate-950"
                : "from-slate-900 via-slate-800 to-slate-950 text-white",
            tagCor: idx % 2 === 0 ? "bg-black text-primary-500" : "bg-primary-600 text-slate-950",
          }))
        );
      } else {
        setActiveBanners([]);
      }
    });

    return () => {
      window.removeEventListener("storage", carregarRecentes);
      unsubBanner();
    };
  }, []);

  const pushAtivo = pushStatus === "granted";

  // Referência e medição dinâmica de altura do Sheet ativo para Camera Padding Forense
  const [activeSheetHeight, setActiveSheetHeight] = useState<number>(0);
  const sheetObserverRef = useRef<ResizeObserver | null>(null);

  const sheetContainerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (sheetObserverRef.current) {
      sheetObserverRef.current.disconnect();
      sheetObserverRef.current = null;
    }
    if (node) {
      setActiveSheetHeight(node.offsetHeight);
      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const h = Math.round(entry.contentRect.height);
            if (h > 0) setActiveSheetHeight(h);
          }
        });
        ro.observe(node);
        sheetObserverRef.current = ro;
      }
    }
  }, []);

  // Referência de GPS para Deadband Inteligente e Throttle Anti-Render-Storm
  const lastGpsUpdateRef = useRef<{ coords: [number, number]; timestamp: number } | null>(null);

  const handleUserLocationChange = useCallback(
    (coords: [number, number]) => {
      if (state !== "IDLE") return;

      const now = Date.now();
      const last = lastGpsUpdateRef.current;

      if (last) {
        const deltaLng = Math.abs(last.coords[0] - coords[0]);
        const deltaLat = Math.abs(last.coords[1] - coords[1]);
        const timeDelta = now - last.timestamp;

        // Deadband de ~8 metros (~0.00008 graus) e throttle temporal de 2500ms
        if (deltaLng < 0.00008 && deltaLat < 0.00008 && timeDelta < 2500) {
          return;
        }
      }

      lastGpsUpdateRef.current = { coords, timestamp: now };
      updatePickupLocationFromMap(coords);
    },
    [state, updatePickupLocationFromMap]
  );

  // Mapeamento de estado para o mapa
  const isSearching =
    state === "FINDING_DRIVER" ||
    state === "REQUESTED" ||
    state === "SEARCHING_R1" ||
    state === "SEARCHING_R2" ||
    state === "SEARCHING_R3";

  const mapStatus =
    isSearching
      ? "PROCURANDO"
      : state === "DRIVER_ASSIGNED" ||
        state === "DRIVER_ARRIVING" ||
        (state as string) === "ACCEPTED" ||
        (state as string) === "DRIVER_EN_ROUTE" ||
        (state as string) === "DRIVER_ARRIVED"
      ? "A_CAMINHO"
      : state === "ON_TRIP" || state === "IN_PROGRESS"
      ? "EM_VIAGEM"
      : state === "COMPLETED"
      ? "CONCLUIDA"
      : state === "CONFIRMING_PICKUP"
      ? "CONFIRMING_PICKUP"
      : state === "CONFIRMING_DESTINATION_MAP"
      ? "CONFIRMING_DESTINATION_MAP"
      : state === "REVIEWING_ROUTE"
      ? "REVIEWING_ROUTE"
      : state === "SELECTING_DESTINATION"
      ? "SELECTING_DESTINATION"
      : state === "EDITING_PICKUP"
      ? "EDITING_PICKUP"
      : state === "SEARCHING_DESTINATION"
      ? "SEARCHING_DESTINATION"
      : "IDLE";

  const dynamicCameraPadding = useMemo(() => {
    if (typeof window === "undefined") return undefined;

    const vh = window.innerHeight;
    const safeSheetH = activeSheetHeight > 0 ? activeSheetHeight : Math.round(vh * 0.52);

    if (isSearching) {
      return {
        top: Math.round(vh * 0.06),
        bottom: Math.max(320, safeSheetH + 24),
        left: 24,
        right: 24,
      };
    }

    if (mapStatus === "REVIEWING_ROUTE") {
      return {
        top: Math.max(70, Math.round(vh * 0.10)),
        bottom: Math.max(380, safeSheetH + 28),
        left: 48,
        right: 48,
      };
    }

    if (mapStatus === "A_CAMINHO") {
      return {
        top: 80,
        bottom: Math.max(360, safeSheetH + 24),
        left: 64,
        right: 64,
      };
    }

    if (mapStatus === "EM_VIAGEM") {
      return {
        top: 80,
        bottom: Math.max(300, safeSheetH + 20),
        left: 48,
        right: 48,
      };
    }

    if (mapStatus === "IDLE") {
      return {
        top: 80,
        bottom: 220,
        left: 32,
        right: 32,
      };
    }

    return undefined;
  }, [isSearching, mapStatus, activeSheetHeight]);

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] bg-[#f1f3f4] overflow-hidden font-sans select-none flex flex-col">
      {/* BANNER DE RESILIÊNCIA DE REDE & TOAST FLUTUANTE DE RINGING */}
      <NetworkReconnectionBanner />
      <LiveRingingToast />
      <GpsPermissionModal />

      {/* ========================================================================= */}
      {/* SEÇÃO DO MAPA: TELA CHEIA EM TODOS OS ESTADOS (FUNDO TOTALMENTE VISÍVEL)  */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-0 h-full w-full pointer-events-auto">
        <PartiuRideMap
          status={mapStatus}
          modalidade={categoriaVeiculo === "MOTO" ? "MOTO" : "POP"}
          origemEndereco={origem}
          origemCoords={origemCoords}
          destinoEndereco={destino || undefined}
          destinoCoords={
            state !== "SEARCHING_DESTINATION" &&
            state !== "SELECTING_DESTINATION" &&
            state !== "EDITING_PICKUP" &&
            state !== "CONFIRMING_DESTINATION_MAP"
              ? destinoCoords
              : undefined
          }
          motorista={activeRide?.motorista || undefined}
          driverCoords={driverCoords}
          strategicPickups={smartPickups}
          onSelectStrategicPickup={selectStrategicPickup}
          onMapCenterChange={
            state === "CONFIRMING_DESTINATION_MAP"
              ? updateDestinationLocationFromMap
              : updatePickupLocationFromMap
          }
          onUserLocationChange={handleUserLocationChange}
          hideRecenter={false}
          userAccuracyMeters={userAccuracyMeters}
          cameraPadding={dynamicCameraPadding}
          activeMapStyle={estiloMapaAtivo}
          onSelectMapStyle={handleSelectMapStyle}
          onOpenLayersModal={handleOpenLayersModal}
        />
      </div>

      {state === "IDLE" ? (
        <>
          {/* ========================================================================= */}
          {/* CABEÇALHO FLUTUANTE SOBRE O TOPO DO MAPA                                 */}
          {/* ========================================================================= */}
          <AnimatedWaveHeader
            userName={userName}
            onOpenDrawer={handleOpenDrawer}
            onOpenNotifications={handleOpenNotifications}
            hasUnreadNotifications={!pushAtivo}
            waveRadius={waveRadius}
            isScrolled={isScrolled}
          />

          {/* ========================================================================= */}
          {/* PAINEL INFERIOR FLUTUANTE SOBRE O MAPA (SEM FUNDO PRETO / MAPA VISÍVEL)  */}
          {/* ========================================================================= */}
          <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none flex flex-col justify-end w-full max-w-lg mx-auto pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-2">
            {/* BLOCO 1 (DESTINO): Card flutuante "Para onde vamos?" + Histórico */}
            <div className="w-full px-3.5 pointer-events-auto">
              <DestinationCard
                onSearchClick={startSearch}
                onEditPickupClick={startEditingPickup}
                onAdjustPinOnMap={proceedToConfirmPickup}
                onSelectAddress={handleSelectAddressItem}
                currentAddress={origem}
                userAccuracyMeters={userAccuracyMeters}
                recentAddresses={recentAddresses}
              />
            </div>

            {/* BLOCO 2 (BANNERS): Carrossel de Banners Promocionais Flutuante */}
            {activeBanners && activeBanners.length > 0 && (
              <div className="w-full px-3.5 overflow-hidden pointer-events-auto">
                <PromoCarousel
                  banners={activeBanners}
                  autoPlayIntervalMs={3000}
                />
              </div>
            )}

            {/* RODAPÉ: Barra de Navegação Flutuante Sem Fundo Preto */}
            <div className="w-full px-3.5 pointer-events-auto">
              <HomeBottomNav activeTab="corridas" />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* PAINÉIS FLUTUANTES DA MÁQUINA DE ESTADOS DA CORRIDA QUANDO NÃO IDLE */}
          <main
            data-hide-bottom-nav="true"
            className="absolute inset-x-0 bottom-0 z-50 pointer-events-none flex flex-col justify-end w-full max-w-lg mx-auto pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all"
            style={{ zIndex: 100, ...({ elevation: 10 } as React.CSSProperties) }}
          >
            <div ref={sheetContainerCallbackRef} className="w-full pointer-events-auto">
              {/* B. BUSCA DE DESTINO (BOTTOM SHEET COM AUTOCOMPLETE E RECENTES) */}
              {(state === "SEARCHING_DESTINATION" ||
                state === "SELECTING_DESTINATION" ||
                state === "EDITING_PICKUP") && <PassengerSearchDestinationSheet />}

              {/* C. REVISÃO DE ROTA (SELETOR EXCLUSIVO PARTIU MOTO / PARTIU CARRO + PIX/DINHEIRO) */}
              {state === "REVIEWING_ROUTE" && <PassengerReviewRouteSheet />}

              {/* D1. AJUSTE FINO DO PINO CENTRAL DE EMBARQUE OU DESTINO */}
              {state === "CONFIRMING_PICKUP" && <PassengerConfirmPickupPin />}
              {state === "CONFIRMING_DESTINATION_MAP" && <PassengerConfirmDestinationPin />}

              {/* D2. RADAR DE BUSCA PROGRESSIVO EM ONDAS (R1 2km -> R2 4km -> R3 6km) */}
              {(state === "FINDING_DRIVER" ||
                state === "REQUESTED" ||
                state === "SEARCHING_R1" ||
                state === "SEARCHING_R2" ||
                state === "SEARCHING_R3") && <PassengerFindingDriverRadar />}

              {/* D3. TIMEOUT DE BUSCA SEM MOTORISTAS DISPONÍVEIS */}
              {(state === "TIMEOUT" || (state as string) === "SEARCH_TIMEOUT") && <PassengerTimeoutBottomSheet />}

              {/* E. CORRIDA EM ANDAMENTO */}
              {state === "DRIVER_ASSIGNED" && <PassengerActiveRideCard />}
              {(state === "DRIVER_ARRIVING" ||
                state === "DRIVER_EN_ROUTE" ||
                state === "DRIVER_ARRIVED" ||
                state === "ACCEPTED" ||
                state === "ON_TRIP" ||
                state === "IN_PROGRESS" ||
                state === "COMPLETED") && (
                <DriverEnRouteSheet />
              )}
            </div>
          </main>
        </>
      )}

      {/* MODAL DE NOTIFICAÇÕES PUSH NATIVAS (LAZY LOADED SOB DEMANDA) */}
      {modalPushAberto && (
        <Suspense fallback={null}>
          <NotificacoesPushModal
            aberto={modalPushAberto}
            onFechar={handleCloseNotifications}
          />
        </Suspense>
      )}

      {/* GAVETA LATERAL DE NAVEGAÇÃO (LAZY LOADED SOB DEMANDA) */}
      {drawerAberto && (
        <Suspense fallback={null}>
          <AppDrawer open={drawerAberto} onClose={handleCloseDrawer} />
        </Suspense>
      )}

      {/* ========================================================================= */}
      {/* MODAL RAIZ: SELETOR DE ESTILO DE MAPA (RUAS, TRÂNSITO, SATÉLITE)          */}
      {/* Z-INDEX 9999 + ELEVATION 99 - LIVRE DE QUALQUER OVERFLOW HIDDEN          */}
      {/* ========================================================================= */}
      {modalCamadasAberto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          style={{ zIndex: 9999, ...({ elevation: 99 } as React.CSSProperties) }}
          onClick={handleCloseLayersModal}
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
                onClick={handleCloseLayersModal}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs cursor-pointer transition-colors"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleSelectMapStyle("streets")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                  estiloMapaAtivo === "streets"
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
                {estiloMapaAtivo === "streets" && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectMapStyle("traffic")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                  estiloMapaAtivo === "traffic"
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
                {estiloMapaAtivo === "traffic" && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectMapStyle("satellite")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                  estiloMapaAtivo === "satellite"
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
                {estiloMapaAtivo === "satellite" && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
