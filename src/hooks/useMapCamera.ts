/**
 * ==============================================================================
 * 🎥 PARTIU — HOOK USE MAP CAMERA (SMART VIEWPORT & FOLLOW MODE ENGINE)
 * ==============================================================================
 * Controle avançado de câmera e enquadramento inteligente padrão Uber/99.
 *
 * Recursos:
 * - fitBounds(): Enquadra múltiplos pontos com padding dinâmico.
 * - flyTo(): Voo cinematográfico 3D com pitch e bearing dinâmicos.
 * - moveTo() / zoomTo(): Navegação precisa sem saltos de tela.
 * - Follow Mode:
 *   - Modo Embarque: Mantém Motorista + Passageiro visíveis.
 *   - Modo Viagem: Mantém Motorista + Destino visíveis.
 * ==============================================================================
 */

import { useCallback, useRef } from "react";
import type mapboxgl from "mapbox-gl";

export interface CameraPadding {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface FitBoundsOptions {
  padding?: CameraPadding;
  duration?: number;
  maxZoom?: number;
  linear?: boolean;
}

export interface FlyToOptions {
  zoom?: number;
  pitch?: number;
  bearing?: number;
  duration?: number;
}

export function useMapCamera(mapRef: React.RefObject<mapboxgl.Map | null>) {
  const isFollowingRef = useRef<boolean>(false);

  /**
   * Enquadra múltiplos pontos na viewport respeitando paddings de bottom sheets
   */
  const fitBounds = useCallback(
    (
      bounds: [[number, number], [number, number]],
      options: FitBoundsOptions = {}
    ) => {
      const map = mapRef.current;
      if (!map || !bounds) return;

      const padding = options.padding || { top: 80, bottom: 280, left: 60, right: 60 };
      const duration = options.duration ?? 1200;
      const maxZoom = options.maxZoom ?? 17;

      try {
        map.fitBounds(bounds, {
          padding: {
            top: padding.top || 80,
            bottom: padding.bottom || 280,
            left: padding.left || 60,
            right: padding.right || 60,
          },
          duration,
          maxZoom,
          linear: options.linear || false,
        });
      } catch (_) {}
    },
    [mapRef]
  );

  /**
   * Transição fluída em voo 3D
   */
  const flyTo = useCallback(
    (coords: [number, number], options: FlyToOptions = {}) => {
      const map = mapRef.current;
      if (!map || !coords) return;

      try {
        map.flyTo({
          center: coords,
          zoom: options.zoom ?? 16,
          pitch: options.pitch ?? 45,
          bearing: options.bearing ?? 0,
          duration: options.duration ?? 1000,
          essential: true,
        });
      } catch (_) {}
    },
    [mapRef]
  );

  /**
   * Movimento direto suave
   */
  const moveTo = useCallback(
    (coords: [number, number], zoom?: number) => {
      const map = mapRef.current;
      if (!map || !coords) return;

      try {
        map.easeTo({
          center: coords,
          zoom: zoom ?? map.getZoom(),
          duration: 600,
        });
      } catch (_) {}
    },
    [mapRef]
  );

  /**
   * Ajuste de nível de zoom
   */
  const zoomTo = useCallback(
    (zoom: number, duration = 500) => {
      const map = mapRef.current;
      if (!map) return;

      try {
        map.zoomTo(zoom, { duration });
      } catch (_) {}
    },
    [mapRef]
  );

  /**
   * Follow Mode de Embarque: Enquadra Motorista e Passageiro simultaneamente
   */
  const followPickupMode = useCallback(
    (
      driverCoords: [number, number],
      passengerCoords: [number, number],
      padding?: CameraPadding
    ) => {
      if (!driverCoords || !passengerCoords) return;

      const minLng = Math.min(driverCoords[0], passengerCoords[0]);
      const maxLng = Math.max(driverCoords[0], passengerCoords[0]);
      const minLat = Math.min(driverCoords[1], passengerCoords[1]);
      const maxLat = Math.max(driverCoords[1], passengerCoords[1]);

      fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: padding || { top: 100, bottom: 380, left: 80, right: 80 },
          duration: 900,
          maxZoom: 16.5,
        }
      );
    },
    [fitBounds]
  );

  /**
   * Follow Mode de Viagem: Enquadra Motorista e Ponto de Destino
   */
  const followTripMode = useCallback(
    (
      driverCoords: [number, number],
      destinationCoords: [number, number],
      padding?: CameraPadding
    ) => {
      if (!driverCoords || !destinationCoords) return;

      const minLng = Math.min(driverCoords[0], destinationCoords[0]);
      const maxLng = Math.max(driverCoords[0], destinationCoords[0]);
      const minLat = Math.min(driverCoords[1], destinationCoords[1]);
      const maxLat = Math.max(driverCoords[1], destinationCoords[1]);

      fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: padding || { top: 80, bottom: 350, left: 70, right: 70 },
          duration: 900,
          maxZoom: 16,
        }
      );
    },
    [fitBounds]
  );

  return {
    fitBounds,
    flyTo,
    moveTo,
    zoomTo,
    followPickupMode,
    followTripMode,
    isFollowingRef,
  };
}
