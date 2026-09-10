import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { AppDrawer } from "@/components/navigation/AppDrawer";
import { NotificacoesPushModal } from "@/components/modals/NotificacoesPushModal";
import { getStatusPermissaoPush } from "@/lib/push-notifications";
import { useScrollInterpolation } from "@/hooks/useScrollInterpolation";

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
  console.log("[MAP TEST RELOAD]");
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
            ? "from-amber-400 via-amber-500 to-yellow-500 text-slate-950"
            : "from-slate-900 via-slate-800 to-slate-950 text-white",
        tagCor: idx % 2 === 0 ? "bg-black text-amber-300" : "bg-yellow-400 text-slate-950",
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
                ? "from-amber-400 via-amber-500 to-yellow-500 text-slate-950"
                : "from-slate-900 via-slate-800 to-slate-950 text-white",
            tagCor: idx % 2 === 0 ? "bg-black text-amber-300" : "bg-yellow-400 text-slate-950",
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

    return undefined;
  }, [isSearching, mapStatus, activeSheetHeight]);

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] bg-slate-100 overflow-hidden font-sans select-none">
      {/* BANNER DE RESILIÊNCIA DE REDE & TOAST FLUTUANTE DE RINGING */}
      <NetworkReconnectionBanner />
      <LiveRingingToast />
      <GpsPermissionModal />

      {/* ========================================================================= */}
      {/* CAMADA 0 (FUNDO / BACKGROUND): MAPA EM TELA CHEIA FIXO (POSITION: ABSOLUTE) */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-0 w-full h-full pointer-events-auto">
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
        />
      </div>

      {state === "IDLE" ? (
        <>
          {/* ========================================================================= */}
          {/* CAMADA 1 (ELEMENTO FIXO TOPO): CABEÇALHO DINÂMICO                         */}
          {/* ========================================================================= */}
          <AnimatedWaveHeader
            userName={userName}
            onOpenDrawer={() => setDrawerAberto(true)}
            onOpenNotifications={() => setModalPushAberto(true)}
            hasUnreadNotifications={!pushAtivo}
            waveRadius={waveRadius}
            isScrolled={isScrolled}
          />

          {/* ========================================================================= */}
          {/* CAMADA 2: BOTTOM SHEET ANCORADO COM ESPAÇAMENTO UNIFORME (CARD + BANNERS + RODAPÉ) */}
          {/* ========================================================================= */}
          <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none flex flex-col justify-end w-full">
            {/* Wrapper Agrupado: Card "Para onde vamos?" e Carrossel de Banners com o mesmo gap (mb-2.5) para o rodapé */}
            <div className="w-[92%] max-w-lg mx-auto space-y-2.5 pointer-events-auto flex flex-col justify-end mb-2.5">
              {/* Card 1 - "Para onde vamos?" com margens laterais mínimas (92% width) */}
              <DestinationCard
                onSearchClick={startSearch}
                onEditPickupClick={startEditingPickup}
                onAdjustPinOnMap={proceedToConfirmPickup}
                onSelectAddress={(item) => selectDestination(item.endereco, item.coords)}
                currentAddress={origem}
                userAccuracyMeters={userAccuracyMeters}
                recentAddresses={recentAddresses}
              />

              {/* Card 2 - Carrossel de Banners Promocionais (gap idêntico de 10px / 2.5 acima do rodapé) */}
              {activeBanners && activeBanners.length > 0 && (
                <PromoCarousel
                  banners={activeBanners}
                  autoPlayIntervalMs={3000}
                />
              )}
            </div>

            {/* Barra de Navegação Inferior Fixa (Rodapé) */}
            <div className="w-full pointer-events-auto">
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

              {/* D3. BOTTOM SHEET DE TIMEOUT PREMIUM (ESTÃO TODOS OCUPADOS + FAST RECOVERY) */}
              {state === "TIMEOUT" && <PassengerTimeoutBottomSheet />}

              {/* E. MOTORISTA ATRIBUÍDO OU EM VIAGEM (CARD ~35% ALTURA COM MERCOSUL E TRUST CENTER) */}
              {(state === "DRIVER_ASSIGNED" ||
                state === "DRIVER_ARRIVING" ||
                (state as string) === "ACCEPTED" ||
                (state as string) === "DRIVER_EN_ROUTE" ||
                (state as string) === "DRIVER_ARRIVED" ||
                state === "ON_TRIP" ||
                state === "IN_PROGRESS" ||
                state === "COMPLETED") && (
                <DriverEnRouteSheet />
              )}
            </div>
          </main>
        </>
      )}

      {/* MODAL DE NOTIFICAÇÕES PUSH NATIVAS */}
      <NotificacoesPushModal
        aberto={modalPushAberto}
        onFechar={() => {
          setModalPushAberto(false);
          setPushStatus(getStatusPermissaoPush());
        }}
      />

      {/* GAVETA LATERAL DE NAVEGAÇÃO */}
      <AppDrawer open={drawerAberto} onClose={() => setDrawerAberto(false)} />
    </div>
  );
}
