// @ts-nocheck
/**
 * ==============================================================================
 * 📱 PARTIU MOBILIDADE — COMPONENTE MAPBOX GL PARA REACT NATIVE (@rnmapbox/maps)
 * ==============================================================================
 * Arquitetura de Alto Desempenho (60 FPS / GPU Nativa) para iOS e Android:
 * 1. Estilo Custom Studio: 'COLE_SUA_URL_DO_MAPBOX_STUDIO_AQUI' (fallback: light-v11)
 * 2. Veículos 3D com escala destacada (iconSize: 1.35) e 'pitch-alignment: map'
 * 3. Localização Nativa <MapboxGL.UserLocation> Blue Dot 99 (#00A3E0) sem pino duplicado
 * 4. Pino de Embarque (Origem) ancorado na base com offset [0, -15], oculto no modo IDLE
 * 5. Supressão total de camadas de POIs desnecessárias (restaurantes, lojas, atrações)
 * ==============================================================================
 */

import React, { useMemo, useRef } from "react";
import { StyleSheet, View, Platform } from "react-native";
// Tipagens e componentes do @rnmapbox/maps para projetos React Native
// @ts-ignore - Dependência nativa instalada no runtime mobile do app
import MapboxGL from "@rnmapbox/maps";
import { PulsingUserDot } from "./PulsingUserDot";

export type RideStatus =
  | "IDLE"
  | "SELECTING_DESTINATION"
  | "SEARCHING_DESTINATION"
  | "CONFIRMING_PICKUP"
  | "EDITING_PICKUP"
  | "CONFIRMING_DESTINATION_MAP"
  | "REVIEWING_ROUTE"
  | "PROCURANDO"
  | "ACCEPTED"
  | "A_CAMINHO"
  | "DRIVER_EN_ROUTE"
  | "DRIVER_ARRIVED"
  | "IN_PROGRESS"
  | "EM_VIAGEM"
  | "COMPLETED"
  | "CANCELLED";

export interface DriverMarkerData {
  id: string;
  latitude: number;
  longitude: number;
  heading: number; // 0-360° para rotação suave no asfalto
  modalidade: "CARRO" | "MOTO";
}

export interface PartiuReactNativeMapProps {
  rideStatus: RideStatus;
  userCoords: [number, number]; // [longitude, latitude]
  pickupCoords?: [number, number] | undefined; // [longitude, latitude]
  destinationCoords?: [number, number] | undefined; // [longitude, latitude]
  nearbyDrivers?: DriverMarkerData[] | undefined;
  routeCoordinates?: [number, number][] | undefined; // Traçado real das vias
  onRegionChange?: ((feature: any) => void) | undefined;
  onUserLocationUpdate?: ((location: any) => void) | undefined;
}

export function PartiuReactNativeMap({
  rideStatus,
  userCoords,
  pickupCoords,
  destinationCoords,
  nearbyDrivers = [],
  routeCoordinates = [],
  onRegionChange,
  onUserLocationUpdate,
}: PartiuReactNativeMapProps) {
  const cameraRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  /**
   * 🧹 SUPRESSÃO DE RUÍDO VISUAL (UBER/99 STANDARD):
   * Oculta camadas de estabelecimentos comerciais, paradas de transporte público
   * e subdivisões urbanas densas em tempo de execução para foco 100% nas vias.
   */
  const handleDidFinishLoadingStyle = () => {
    if (!mapRef.current) return;
    try {
      mapRef.current.setLayerProperties?.("poi-label", { visibility: "none" });
      mapRef.current.setLayerProperties?.("transit-label", { visibility: "none" });
      mapRef.current.setLayerProperties?.("settlement-subdivision-label", { visibility: "none" });
    } catch (_) {}
  };

  // 1. GEOJSON DA FROTA DE VEÍCULOS (Alimentação em lote 100% GPU)
  const driversGeoJSON = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: nearbyDrivers.map((driver) => {
        const rawHeading = Number(driver.heading ?? (driver as any).bearing ?? 0);
        const normalizedHeading = ((rawHeading % 360) + 360) % 360;

        return {
          type: "Feature" as const,
          id: driver.id,
          properties: {
            id: driver.id,
            heading: normalizedHeading,
            bearing: normalizedHeading,
            // Seleciona asset 3D registrado no <MapboxGL.Images>
            icon: driver.modalidade === "MOTO" ? "moto-premium" : "car-premium",
          },
          geometry: {
            type: "Point" as const,
            coordinates: [driver.longitude, driver.latitude],
          },
        };
      }),
    };
  }, [nearbyDrivers]);

  // 2. GEOJSON DO PINO DE ORIGEM (EMBARQUE)
  // Limpeza Visual: Oculto no estado IDLE para não poluir nem colidir com a UserLocation
  const originPinGeoJSON = useMemo(() => {
    const shouldShow =
      rideStatus === "CONFIRMING_PICKUP" ||
      rideStatus === "EDITING_PICKUP" ||
      rideStatus === "REVIEWING_ROUTE" ||
      rideStatus === "ACCEPTED" ||
      rideStatus === "A_CAMINHO" ||
      rideStatus === "DRIVER_EN_ROUTE" ||
      rideStatus === "EM_VIAGEM" ||
      rideStatus === "IN_PROGRESS";

    if (!shouldShow || !pickupCoords) {
      return { type: "FeatureCollection" as const, features: [] };
    }

    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { id: "origin-pickup" },
          geometry: {
            type: "Point" as const,
            coordinates: pickupCoords,
          },
        },
      ],
    };
  }, [rideStatus, pickupCoords]);

  // 3. GEOJSON DO PINO DE DESTINO (CHEGADA)
  const destinationPinGeoJSON = useMemo(() => {
    if (!destinationCoords) {
      return { type: "FeatureCollection" as const, features: [] };
    }

    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { id: "destination-arrival" },
          geometry: {
            type: "Point" as const,
            coordinates: destinationCoords,
          },
        },
      ],
    };
  }, [destinationCoords]);

  // 4. GEOJSON DA ROTA POR VIAS REAIS (POLYLINE)
  const routeGeoJSON = useMemo(() => {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      return { type: "FeatureCollection" as const, features: [] };
    }

    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: routeCoordinates,
      },
    };
  }, [routeCoordinates]);

  // Inclinação 3D da câmera em corrida ativa:
  // Pitch = 60 força a perspectiva 3D profunda de navegação (padrão Uber/Waze),
  // fazendo a malha viária se estender até o horizonte e valorizando o efeito volumétrico.
  const cameraPitch =
    rideStatus === "A_CAMINHO" ||
    rideStatus === "DRIVER_EN_ROUTE" ||
    rideStatus === "IN_PROGRESS" ||
    rideStatus === "EM_VIAGEM"
      ? 60
      : 35;

  return (
    <View style={styles.container}>
      {/* 
        ========================================================================
        1. MAPVIEW ULTRA-MINIMALISTA MONOCROMÁTICO (LIGHT-V11 PADRÃO UBER/99)
        ========================================================================
        - Fundo limpo em tons de cinza claro, branco e gelo sem poluição visual.
        - Supressão em tempo de execução de POIs comerciais (poi-label), paradas
          de transporte (transit-label) e subdivisões urbanas densas.
        - Para máxima performance no Mapbox Studio: clonar Light v11, desativar
          a pasta POIs na interface e gerar styleURL dedicada.
      */}
      {/*
        ──────────────────────────────────────────────────────────────────────
        🎨 ESTILO MAPBOX STUDIO — TONS FRIOS (PADRÃO 99 APP)
        Substitua 'COLE_SUA_URL_DO_MAPBOX_STUDIO_AQUI' no styleURL abaixo
        pela URL do seu estilo personalizado criado no Mapbox Studio
        (exemplo: "mapbox://styles/usuario/clxxx...").
        Enquanto não substituir, o fallback light-v11 será usado.
        ──────────────────────────────────────────────────────────────────────
      */}
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={'COLE_SUA_URL_DO_MAPBOX_STUDIO_AQUI'.startsWith('mapbox://') ? 'COLE_SUA_URL_DO_MAPBOX_STUDIO_AQUI' : 'mapbox://styles/mapbox/standard'}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        surfaceView={Platform.OS === "android"}
        onRegionDidChange={onRegionChange}
        onDidFinishLoadingStyle={handleDidFinishLoadingStyle}
      >
        {/* 
          ======================================================================
          2. CÂMERA INTELIGENTE COM PITCH 3D FORÇADO (60°)
          ======================================================================
        */}
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={userCoords}
          zoomLevel={15.4}
          pitch={cameraPitch}
          animationMode="easeTo"
          animationDuration={800}
        />

        {/* 
          ======================================================================
          3. REGISTRO DE ASSETS NATIVOS 3D NA GPU (MAPBOX IMAGES)
          ======================================================================
          Elimina pontes de re-render do React. Renderização 100% direta no WebGL/Metal.
        */}
        <MapboxGL.Images
          images={{
            "car-premium": require("@/assets/car-premium-upright.png"),
            "moto-premium": require("@/assets/moto-premium.png"),
            "origin-pin": require("@/assets/origin-pin.png"),
            "destination-pin": require("@/assets/destination-pin.png"),
          }}
        />

        {/* 
          ======================================================================
          4. PRÉDIOS 3D SUBTIS (PROFUNDIDADE VOLUMÉTRICA SEM POLUIÇÃO)
          ======================================================================
          Extrusão ultra suave de construções em cinza claro translúcido (opacity 0.3)
        */}
        <MapboxGL.FillExtrusionLayer
          id="partiu-3d-buildings"
          sourceLayerID="building"
          sourceID="composite"
          minZoomLevel={15}
          filter={["==", "extrude", "true"]}
          style={{
            fillExtrusionColor: "#E2E8F0", // Cinza gelo suave
            fillExtrusionHeight: ["get", "height"],
            fillExtrusionBase: ["get", "min_height"],
            fillExtrusionOpacity: 0.3, // Discreto para não sobrecarregar os veículos
          }}
        />

        {/* 
          ======================================================================
          5. LOCALIZAÇÃO DO USUÁRIO: MARCADOR CUSTOMIZADO PULSANTE (UBER-LIKE)
          ======================================================================
          Interceptação do MapboxGL.UserLocation passando PulsingUserDot como filho.
          O Mapbox fixa o marcador automaticamente nas coordenadas do GPS em tempo real.
        */}
        <MapboxGL.UserLocation
          visible={true}
          animated={true}
          showsUserHeadingIndicator={true}
          renderMode="normal"
          onUpdate={onUserLocationUpdate}
        >
          <PulsingUserDot />
        </MapboxGL.UserLocation>

        {/* 
          ======================================================================
          6. ROTA TRAÇADA PELAS VIAS (LINHA PRETA PROFUNDA + CASING BRANCO UBER)
          ======================================================================
          - Casing branco de 7.5px garante contraste absoluto sobre o asfalto cinza.
          - Linha principal preta de 4.8px com pontas e curvas perfeitamente arredondadas.
        */}
        {routeCoordinates.length >= 2 && (
          <MapboxGL.ShapeSource id="partiu-route-source" shape={routeGeoJSON}>
            {/* Casing / Borda Branca de Alto Contraste (por baixo) */}
            <MapboxGL.LineLayer
              id="partiu-route-casing"
              style={{
                lineColor: "#FFFFFF",
                lineWidth: 7.5,
                lineOpacity: 1.0,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
            {/* Linha Principal Preto Profundo / Chumbo Escuro Uber */}
            <MapboxGL.LineLayer
              id="partiu-route-line"
              style={{
                lineColor: "#1A1A1A",
                lineWidth: 4.8,
                lineOpacity: 1.0,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* 
          ======================================================================
          6. CAMADA DE VEÍCULOS — ABORDAGEM 2: EFEITO BILLBOARDING 2.5D (PNG)
          ======================================================================
          - iconPitchAlignment: 'viewport' (O SEGREDO: mantém o ícone "em pé" em
            relação à tela do celular, eliminando 100% da distorção por achatamento).
          - iconRotationAlignment: 'map' (mantém o veículo alinhado com as curvas da via).
          - iconRotate: ['get', 'heading'] (rotação inteligente sincronizada ao asfalto).
          - iconSize: 0.05 a 0.15 (escala ultra compacta e proporcional ao zoom).
        */}
        <MapboxGL.ShapeSource id="partiu-drivers-source" shape={driversGeoJSON}>
          <MapboxGL.SymbolLayer
            id="partiu-drivers-layer"
            style={{
              iconImage: ["get", "icon"],
              iconSize: [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 0.08,
                12, 0.12,
                14, 0.16,
                16, 0.20,
                18, 0.25,
              ],
              iconAnchor: "center",
              iconRotate: ["coalesce", ["get", "heading"], ["get", "bearing"], 0],
              iconRotationAlignment: "map", // Obrigatório: Gira no plano da rua e curvas
              iconPitchAlignment: "viewport", // BILLBOARDING 2.5D: Mantém em pé sem achatar
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
            }}
          />

          {/*
            ====================================================================
            ABORDAGEM 1: MODELOS 3D NATIVOS GLB (MAPBOX V10+ MODELLAYER)
            ====================================================================
            Quando os arquivos 'carro.glb' e 'moto.glb' estiverem compilados:
            Substitua ou comute o SymbolLayer acima pelo ModelLayer nativo abaixo:

            <MapboxGL.ModelLayer
              id="partiu-drivers-3d-model-layer"
              style={{
                modelId: ["match", ["get", "icon"], "moto-premium", "moto-3d-model", "carro-3d-model"],
                modelScale: [1.5, 1.5, 1.5],
                modelRotation: [0, 0, ["get", "heading"]], // Rotação dinâmica no eixo Z
                modelTranslation: [0, 0, 0],
                modelOpacity: 1,
              }}
            />
            ====================================================================
          */}
        </MapboxGL.ShapeSource>

        {/* 
          ======================================================================
          7. PINO DE EMBARQUE (ORIGEM) — EXIBIDO APENAS QUANDO NECESSÁRIO
          ======================================================================
          - iconAnchor: 'bottom' (a ponta do pino encosta na coordenada exata)
          - iconOffset: [0, -15] (elevação para efeito 3D sem descolar do GPS)
        */}
        <MapboxGL.ShapeSource id="partiu-origin-source" shape={originPinGeoJSON}>
          <MapboxGL.SymbolLayer
            id="partiu-origin-layer"
            style={{
              iconImage: "origin-pin",
              iconSize: [
                "interpolate",
                ["linear"],
                ["zoom"],
                11, 0.65,
                14, 0.90,
                16, 1.15,
                18, 1.40,
              ],
              iconAnchor: "bottom", // Garante que a ponta inferior encosta no solo
              iconOffset: [0, -15], // Ajuste vertical milimétrico de sombra/ponto
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* 
          ======================================================================
          8. PINO DE DESTINO (CHEGADA)
          ======================================================================
        */}
        {destinationCoords && (
          <MapboxGL.ShapeSource id="partiu-destination-source" shape={destinationPinGeoJSON}>
            <MapboxGL.SymbolLayer
              id="partiu-destination-layer"
              style={{
                iconImage: "destination-pin",
                iconSize: [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  11, 0.65,
                  14, 0.90,
                  16, 1.15,
                  18, 1.40,
                ],
                iconAnchor: "bottom",
                iconOffset: [0, -15],
                iconAllowOverlap: true,
                iconIgnorePlacement: true,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F0F0", // Cinza claro durante carregamento (padrão 99 App)
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
