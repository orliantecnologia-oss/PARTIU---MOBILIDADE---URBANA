/**
 * ==============================================================================
 * 🛰️ PARTIU — HOOK USE LOCATION (REACTIVE GPS TELEMETRY)
 * ==============================================================================
 * Hook reativo de geolocalização com inicialização instantânea (0ms de latência
 * através de lastKnownLocation), monitoramento contínuo adaptativo e permissões.
 * ==============================================================================
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  locationService,
  type LocationData,
  type LocationOperationalMode,
} from "@/services/LocationService";

export interface UseLocationResult {
  location: [number, number] | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  isLoading: boolean;
  permissionStatus: "prompt" | "granted" | "denied";
  refreshLocation: () => Promise<LocationData>;
  setMode: (mode: LocationOperationalMode) => void;
}

export function useLocation(
  initialMode: LocationOperationalMode = "PASSENGER_IDLE"
): UseLocationResult {
  const initialLoc = useRef(locationService.getLastKnownLocation());

  const [locationData, setLocationData] = useState<LocationData | null>(initialLoc.current);
  const [isLoading, setIsLoading] = useState<boolean>(!initialLoc.current);
  const [permissionStatus, setPermissionStatus] = useState<"prompt" | "granted" | "denied">("granted");

  // Atualização de modo operacional
  const setMode = useCallback((mode: LocationOperationalMode) => {
    locationService.setOperationalMode(mode);
  }, []);

  // Força atualização manual pontual
  const refreshLocation = useCallback(async (): Promise<LocationData> => {
    setIsLoading(true);
    try {
      const loc = await locationService.getCurrentPosition();
      setLocationData(loc);
      setPermissionStatus("granted");
      return loc;
    } catch (err) {
      setPermissionStatus("denied");
      const fallback = locationService.getFallbackLocation();
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Inicia escuta reativa contínua
    const unsubscribe = locationService.watchPositionAsync(
      (newLoc) => {
        setLocationData(newLoc);
        setIsLoading(false);
        setPermissionStatus("granted");
      },
      { mode: initialMode }
    );

    return () => {
      unsubscribe();
    };
  }, [initialMode]);

  return {
    location: locationData ? locationData.coords : null,
    latitude: locationData ? locationData.latitude : null,
    longitude: locationData ? locationData.longitude : null,
    accuracy: locationData ? locationData.accuracy : null,
    heading: locationData ? locationData.heading : null,
    speed: locationData ? locationData.speed : null,
    isLoading,
    permissionStatus,
    refreshLocation,
    setMode,
  };
}
