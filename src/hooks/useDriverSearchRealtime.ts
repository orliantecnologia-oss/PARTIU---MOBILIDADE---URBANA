/**
 * ==============================================================================
 * 🎯 USE DRIVER SEARCH REALTIME (TOP MODAL DINÂMICO v4.0)
 * ==============================================================================
 * Gerencia em tempo real os condutores candidatos contatados durante o despacho:
 * - Escuta eventos Supabase Realtime e delta updates do ProgressiveDispatchEngine
 * - Busca e resolve perfis de motoristas parceiros (foto, nome, nota, categoria, ETA)
 * - Controla transição animada fluida entre condutores sem layout shifts nem flickering
 * - Cleanup automático de ouvintes e canais
 * ==============================================================================
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export interface ContactedDriver {
  id: string;
  name: string;
  firstName: string;
  avatarUrl: string;
  rating: number;
  category: string;
  vehicleModel: string;
  licensePlate: string;
  distanceKm: number;
  etaMinutes: number;
  dispatchStatus: string;
  cascadeSecondsRemaining: number;
}

export function useDriverSearchRealtime() {
  const { state, progressiveSession, categoriaVeiculo } = usePassengerRide();

  const [currentDriver, setCurrentDriver] = useState<ContactedDriver | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const previousDriverIdRef = useRef<string | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isSearching =
    state === "FINDING_DRIVER" ||
    state === "REQUESTED" ||
    state === "SEARCHING_R1" ||
    state === "SEARCHING_R2" ||
    state === "SEARCHING_R3";

  // Resolve os dados do condutor ativo atual a partir da sessão ou delta update
  const resolveCandidateData = useCallback(
    (candidate: any, trustProfile?: any, cascadeSeconds?: number, status?: string): ContactedDriver | null => {
      if (!candidate && !trustProfile) return null;

      const id = candidate?.driverId || (candidate as any)?.id || trustProfile?.driverId || "drv-unknown";
      const fullName = trustProfile?.fullName || candidate?.name || "Motorista Parceiro";
      const firstName = trustProfile?.firstName || fullName.split(" ")[0] || "Motorista";
      const avatarUrl =
        trustProfile?.avatarUrl ||
        candidate?.avatarUrl ||
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80";
      const rating = Number(trustProfile?.rating || candidate?.rating || 4.95);
      const vehicleModel =
        trustProfile?.vehicleModel ||
        candidate?.vehicleModel ||
        (categoriaVeiculo === "MOTO" ? "Honda CG 160" : "Chevrolet Onix");
      const licensePlate =
        trustProfile?.licensePlate || candidate?.licensePlate || (categoriaVeiculo === "MOTO" ? "MOT-7B99" : "BRA-4X99");
      const category = trustProfile?.category || (categoriaVeiculo === "MOTO" ? "Partiu Moto" : "Partiu Carro");
      const distanceMeters = candidate?.distanceMeters || 650;
      const distanceKm = Number((distanceMeters / 1000).toFixed(1));
      const etaMinutes = candidate?.etaMinutes || Math.max(1, Math.round(distanceKm * 2.5));

      return {
        id,
        name: fullName,
        firstName,
        avatarUrl,
        rating,
        category,
        vehicleModel,
        licensePlate,
        distanceKm,
        etaMinutes,
        dispatchStatus: status || "DRIVER_NOTIFIED",
        cascadeSecondsRemaining: cascadeSeconds ?? 12,
      };
    },
    [categoriaVeiculo]
  );

  // Efeito principal de sincronização reativa com transições suaves
  useEffect(() => {
    if (!isSearching || !progressiveSession) {
      setCurrentDriver(null);
      previousDriverIdRef.current = null;
      return;
    }

    const candidate = progressiveSession.currentCandidate;
    const trustProfile = progressiveSession.trustProfile;
    const cascadeSeconds = progressiveSession.cascadeSecondsRemaining;
    const status = progressiveSession.dispatchStatus;

    if (!candidate && !trustProfile) {
      if (status !== "DRIVER_DECLINED") {
        setCurrentDriver(null);
        previousDriverIdRef.current = null;
      }
      return;
    }

    const candidateId = candidate?.driverId || (candidate as any)?.id || trustProfile?.driverId || null;

    // Se houve troca de condutor, dispara animação suave de crossfade
    if (candidateId && candidateId !== previousDriverIdRef.current) {
      previousDriverIdRef.current = candidateId;
      setIsTransitioning(true);

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }

    const resolved = resolveCandidateData(candidate, trustProfile, cascadeSeconds, status);
    if (resolved) {
      setCurrentDriver(resolved);
    }
  }, [isSearching, progressiveSession, resolveCandidateData]);

  // Escuta delta updates do Live Ringing Engine para feedback ultra-rápido (sub-50ms)
  useEffect(() => {
    const handleDelta = (e: any) => {
      const delta = e.detail;
      if (!delta) return;

      if (delta.candidate || delta.trustProfile) {
        const resolved = resolveCandidateData(
          delta.candidate,
          delta.trustProfile,
          undefined,
          delta.dispatchStatus
        );
        if (resolved) {
          setCurrentDriver(resolved);
        }
      }
    };

    window.addEventListener("partiu:live_ringing_delta", handleDelta);
    return () => {
      window.removeEventListener("partiu:live_ringing_delta", handleDelta);
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [resolveCandidateData]);

  return {
    isSearching,
    currentDriver,
    isTransitioning,
    hasActiveDriver: Boolean(currentDriver),
  };
}
