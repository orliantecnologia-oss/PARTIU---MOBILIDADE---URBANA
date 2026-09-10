/**
 * ==============================================================================
 * 🛰️ PARTIU — HOOK USE DRIVER TRACKING (LIVE SMOOTH TRACKING & SNAP TO ROUTE)
 * ==============================================================================
 * Rastreamento de alta fidelidade para o App Passageiro:
 * 1. Escuta atualizações de GPS transmitidas a cada 5s via Supabase Realtime.
 * 2. Snap to Route: projeta as coordenadas sobre a polyline da via real.
 * 3. Smooth Marker: animação fluída com interpolação linear sem teleportes.
 * 4. Alinhamento de rotação do veículo com o asfalto (iconRotationAlignment="map").
 * ==============================================================================
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { supabaseService } from "@/services/SupabaseService";
import type { DriverLocationUpdate } from "@/types/core-ride-logistics";
import {
  snapPointToPolyline,
  calculateBearing,
  haversineDistanceMeters,
  calculateRemainingRouteDistance,
} from "@/utils/gis-interpolation";

export interface UseDriverTrackingOptions {
  driverId?: string | null;
  rideId?: string | null;
  routeCoordinates?: [number, number][]; // Polyline ativa da corrida
  enableSnapToRoute?: boolean;
  interpolationDurationMs?: number; // Padrão: 4500ms (para broadcast a cada 5s)
}

export interface UseDriverTrackingResult {
  currentCoords: [number, number] | null; // Coordenada interpolada e projetada na rua
  rawCoords: [number, number] | null; // Coordenada pura do satélite
  heading: number; // Ângulo tangencial da via (0° a 360°)
  speedKmh: number;
  isMoving: boolean;
  distanceRemainingMeters: number;
  etaMinutes: number;
  lastUpdateTimestamp: number;
  telemetry: DriverLocationUpdate | null;
}

export function useDriverTracking(
  options: UseDriverTrackingOptions = {}
): UseDriverTrackingResult {
  const {
    driverId,
    routeCoordinates,
    enableSnapToRoute = true,
    interpolationDurationMs = 4500,
  } = options;

  const [rawCoords, setRawCoords] = useState<[number, number] | null>(null);
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());
  const [telemetry, setTelemetry] = useState<DriverLocationUpdate | null>(null);

  // Estados de interpolação
  const animStartCoordsRef = useRef<[number, number] | null>(null);
  const animTargetCoordsRef = useRef<[number, number] | null>(null);
  const animStartTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  const prevHeadingRef = useRef<number>(0);

  // Normaliza transição angular mais curta (ex: 355° para 5°)
  const interpolateAngle = (from: number, to: number, t: number): number => {
    let diff = (to - from) % 360;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    return (from + diff * t + 360) % 360;
  };

  // Loop de animação suave via requestAnimationFrame (ou timer em Node/testes)
  const stepAnimation = useCallback(() => {
    if (!animStartCoordsRef.current || !animTargetCoordsRef.current) return;

    const now = Date.now();
    const elapsed = now - animStartTimeRef.current;
    const progress = Math.min(1.0, elapsed / interpolationDurationMs);

    // Easing linear constante (velocidade constante do veículo)
    const start = animStartCoordsRef.current;
    const target = animTargetCoordsRef.current;

    const interpolated: [number, number] = [
      start[0] + (target[0] - start[0]) * progress,
      start[1] + (target[1] - start[1]) * progress,
    ];

    setCurrentCoords(interpolated);

    if (progress < 1.0) {
      if (typeof requestAnimationFrame !== "undefined") {
        animFrameIdRef.current = requestAnimationFrame(stepAnimation);
      }
    }
  }, [interpolationDurationMs]);

  // Handler de novas coordenadas vindas do Supabase Realtime / WebSocket
  const handleLocationUpdate = useCallback(
    (update: DriverLocationUpdate) => {
      setTelemetry(update);
      setLastUpdateTimestamp(update.timestamp);
      setSpeedKmh(update.speed_kmh);

      const raw = update.coords;
      setRawCoords(raw);

      let targetPos: [number, number] = raw;
      let targetHeading: number = update.heading;

      // 1. SNAP TO ROUTE: Se tiver rota ativa, projeta a posição na rua
      if (enableSnapToRoute && routeCoordinates && routeCoordinates.length >= 2) {
        const snap = snapPointToPolyline(raw, routeCoordinates);
        targetPos = snap.snappedCoords;
        targetHeading = snap.bearing;
      } else if (!targetHeading && currentCoords) {
        targetHeading = calculateBearing(currentCoords, targetPos);
      }

      // Suaviza o heading
      const smoothHeading = interpolateAngle(prevHeadingRef.current, targetHeading, 0.7);
      prevHeadingRef.current = smoothHeading;
      setHeading(smoothHeading);

      // 2. Inicia interpolação suave da posição antiga para a nova
      if (!currentCoords) {
        setCurrentCoords(targetPos);
        animStartCoordsRef.current = targetPos;
        animTargetCoordsRef.current = targetPos;
      } else {
        animStartCoordsRef.current = currentCoords;
        animTargetCoordsRef.current = targetPos;
        animStartTimeRef.current = Date.now();

        if (animFrameIdRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
          cancelAnimationFrame(animFrameIdRef.current);
        }

        if (typeof requestAnimationFrame !== "undefined") {
          animFrameIdRef.current = requestAnimationFrame(stepAnimation);
        } else {
          // Fallback síncrono para testes unitários
          setCurrentCoords(targetPos);
        }
      }
    },
    [enableSnapToRoute, routeCoordinates, currentCoords, stepAnimation]
  );

  // Conexão com Supabase Realtime
  useEffect(() => {
    if (!driverId) return;

    const unsubscribe = supabaseService.subscribeToDriverLocation(
      driverId,
      handleLocationUpdate
    );

    return () => {
      unsubscribe();
      if (animFrameIdRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [driverId, handleLocationUpdate]);

  // Distância e ETA restantes calculados ao longo da polyline viária real
  const { distanceRemainingMeters, etaMinutes } = (() => {
    if (!currentCoords || !routeCoordinates || routeCoordinates.length < 2) {
      return { distanceRemainingMeters: 0, etaMinutes: 0 };
    }
    const remainingMeters = calculateRemainingRouteDistance(currentCoords, routeCoordinates);
    // Velocidade de tráfego dinâmico ponderada (média urbana 25 km/h se parado/lento em semáforo)
    const effectiveSpeed = Math.max(22, speedKmh);
    const mins = Math.max(1, Math.round((remainingMeters / 1000 / effectiveSpeed) * 60));
    return { distanceRemainingMeters: remainingMeters, etaMinutes: mins };
  })();

  const isMoving = speedKmh > 3;

  return {
    currentCoords,
    rawCoords,
    heading,
    speedKmh,
    isMoving,
    distanceRemainingMeters,
    etaMinutes,
    lastUpdateTimestamp,
    telemetry,
  };
}
