import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  const [modalCamadasAberto, setModalCamadasAberto] = useState(false);
  const [estiloMapaAtivo, setEstiloMapaAtivo] = useState<"streets" | "traffic" | "satellite">("streets");

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

    return undefined;
  }, [isSearching, mapStatus, activeSheetHeight]);

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] bg-slate-100 overflow-hidden font-sans select-none flex flex-col">
      {/* BANNER DE RESILIÊNCIA DE REDE & TOAST FLUTUANTE DE RINGING */}
      <NetworkReconnectionBanner />
      <LiveRingingToast />
      <GpsPermissionModal />

      {/* ========================================================================= */}
      {/* SEÇÃO DO MAPA: HALF-MAP (43dvh) NO ESTADO IDLE / TELA CHEIA NOS DEMAIS    */}
      {/* ========================================================================= */}
      <div
        className={`w-full transition-[height] duration-300 ease-out pointer-events-auto ${
          state === "IDLE"
            ? "relative h-[43dvh] shrink-0 z-0"
            : "absolute inset-0 z-0 h-full"
        }`}
      >
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
          onSelectMapStyle={setEstiloMapaAtivo}
          onOpenLayersModal={() => setModalCamadasAberto(true)}
        />
      </div>

      {state === "IDLE" ? (
        <>
          {/* ========================================================================= */}
          {/* CABEÇALHO FLUTUANTE SOBRE O TOPO DO MAPA                                 */}
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
          {/* CONTÊINER BRANCO INFERIOR (PADRÃO 99): BORDA ARREDONDADA E OVERLAP       */}
          {/* ========================================================================= */}
          <div className="relative flex-1 bg-white rounded-t-[28px] -mt-6 z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col justify-between overflow-hidden">
            {/* Indicador de Arrasto / Pílula Central Cinza 99 */}
            <div className="w-full pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* BLOCO 1 (DESTINO): Card "Para onde vamos?" + Histórico de 2 endereços */}
            <div className="w-full max-w-lg mx-auto px-4 shrink-0 mb-1.5">
              <DestinationCard
                onSearchClick={startSearch}
                onEditPickupClick={startEditingPickup}
                onAdjustPinOnMap={proceedToConfirmPickup}
                onSelectAddress={(item) => selectDestination(item.endereco, item.coords)}
                currentAddress={origem}
                userAccuracyMeters={userAccuracyMeters}
                recentAddresses={recentAddresses}
              />
            </div>

            {/* BLOCO 2 (BANNERS): Carrossel de Banners Promocionais (Apenas Scroll Horizontal) */}
            {activeBanners && activeBanners.length > 0 && (
              <div className="w-full max-w-lg mx-auto px-4 flex-1 min-h-0 flex flex-col justify-center overflow-hidden">
                <PromoCarousel
                  banners={activeBanners}
                  autoPlayIntervalMs={3000}
                />
              </div>
            )}

            {/* RODAPÉ: Barra de Navegação Inferior Fixa Ancorada na Base */}
            <div className="w-full shrink-0 bg-[#020617]">
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
          onClick={() => setModalCamadasAberto(false)}
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
                onClick={() => setModalCamadasAberto(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs cursor-pointer transition-colors"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setEstiloMapaAtivo("streets");
                  setModalCamadasAberto(false);
                }}
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
                onClick={() => {
                  setEstiloMapaAtivo("traffic");
                  setModalCamadasAberto(false);
                }}
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
                onClick={() => {
                  setEstiloMapaAtivo("satellite");
                  setModalCamadasAberto(false);
                }}
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
