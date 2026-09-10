/**
 * ==============================================================================
 * 🛰️ PARTIU ENTERPRISE REALTIME DRIVERS HOOK (v5.0 — 100% REAL PRODUCTION)
 * ==============================================================================
 * Conecta o frontend de mobilidade ao Supabase Realtime para transmissão contínua
 * de telemetria de motoristas REAIS:
 * - Consulta direta na tabela PostGIS `driver_locations` com filtro de 30 segundos
 * - Escuta CDC postgres_changes (INSERT, UPDATE, DELETE) em tempo real
 * - Pruning automático de condutores ociosos ou com ping defasado (> 30s)
 * - PROIBIDA qualquer injeção de SEED_DRIVERS ou veículos fantasma em produção
 * - Throttle de 250ms para manter 60 FPS estáveis na GPU
 * ==============================================================================
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { isMockForbidden } from "@/config/environment";

export interface LiveDriver {
  id: string;
  latitude: number;
  longitude: number;
  heading: number;
  status: string;
  category?: "MOTO" | "CARRO" | string;
  vehicleModel?: string;
  licensePlate?: string;
  updatedAt?: number;
}

interface UseLiveDriversOptions {
  categoryFilter?: "MOTO" | "CARRO" | "ALL";
  centerCoords?: [number, number];
  maxRadiusKm?: number;
}

export function useLiveDrivers(options: UseLiveDriversOptions = {}) {
  const { categoryFilter = "ALL" } = options;

  const [driversMap, setDriversMap] = useState<Map<string, LiveDriver>>(() => new Map());
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const pendingUpdatesRef = useRef<Map<string, LiveDriver>>(new Map());
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Despacha as atualizações acumuladas em lote (Throttle de 250ms)
  const flushUpdates = useCallback(() => {
    if (!isMountedRef.current) return;
    if (pendingUpdatesRef.current.size === 0) return;

    setDriversMap((prev) => {
      const next = new Map(prev);
      pendingUpdatesRef.current.forEach((val, key) => {
        if (val.status === "OFFLINE" || val.status === "DELETED") {
          next.delete(key);
        } else {
          next.set(key, val);
        }
      });
      pendingUpdatesRef.current.clear();
      return next;
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (throttleTimerRef.current) return;
    throttleTimerRef.current = setTimeout(() => {
      throttleTimerRef.current = null;
      flushUpdates();
    }, 250);
  }, [flushUpdates]);

  useEffect(() => {
    isMountedRef.current = true;

    // 1. CONSULTA DE PRODUÇÃO: Busca apenas condutores com telemetria nos últimos 30 segundos
    const fetchInitialActiveDrivers = async () => {
      if (!isSupabaseConfigured()) {
        return;
      }

      try {
        const cutoffTime = new Date(Date.now() - 30 * 1000).toISOString();
        const { data, error } = await (supabase as any)
          .from("driver_locations")
          .select("*")
          .gt("updated_at", cutoffTime)
          .in("status", [
            "AVAILABLE",
            "ONLINE",
            "ONLINE_IDLE",
            "ONLINE_MOVING",
            "HEADING_TO_PICKUP",
            "WAITING_PASSENGER",
            "ON_TRIP",
          ]);

        if (error) {
          console.warn("[useLiveDrivers] Aviso na consulta inicial de motoristas:", error.message);
          return;
        }

        if (Array.isArray(data) && isMountedRef.current) {
          const freshMap = new Map<string, LiveDriver>();
          data.forEach((row: any) => {
            const driverId = String(row.driver_id || row.id || "");
            const lat = Number(row.latitude || row.lat);
            const lng = Number(row.longitude || row.lng);
            const heading = Number(row.heading || row.bearing || 0);
            const status = String(row.status || "AVAILABLE");
            const cat = row.category || (row.vehicle_type === "MOTO" ? "MOTO" : "CARRO");
            const updatedTime = row.updated_at ? new Date(row.updated_at).getTime() : Date.now();

            if (driverId && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
              freshMap.set(driverId, {
                id: driverId,
                latitude: lat,
                longitude: lng,
                heading,
                status,
                category: cat,
                vehicleModel: row.vehicle_model,
                licensePlate: row.license_plate,
                updatedAt: updatedTime,
              });
            }
          });
          setDriversMap(freshMap);
        }
      } catch (err) {
        console.warn("[useLiveDrivers] Falha ao carregar motoristas:", err);
      }
    };

    void fetchInitialActiveDrivers();

    // 2. CONEXÃO COM SUPABASE REALTIME (Tabela canônica driver_locations)
    let channel: any = null;

    if (isSupabaseConfigured()) {
      try {
        channel = (supabase as any)
          .channel("realtime-driver-locations-feed")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "driver_locations",
            },
            (payload: any) => {
              const { eventType, new: newRecord, old: oldRecord } = payload;

              if (eventType === "DELETE") {
                const driverId = oldRecord?.driver_id || oldRecord?.id;
                if (driverId) {
                  pendingUpdatesRef.current.set(driverId, {
                    id: driverId,
                    latitude: 0,
                    longitude: 0,
                    heading: 0,
                    status: "DELETED",
                  });
                  scheduleFlush();
                }
                return;
              }

              if (newRecord) {
                const driverId = String(newRecord.driver_id || newRecord.id || "");
                const lat = Number(newRecord.latitude || newRecord.lat || newRecord.current_lat);
                const lng = Number(newRecord.longitude || newRecord.lng || newRecord.current_lng);
                const heading = Number(newRecord.heading || newRecord.bearing || 0);
                const status = String(newRecord.status || "DISPONIVEL");
                const cat = newRecord.category || (newRecord.vehicle_type === "MOTO" ? "MOTO" : "CARRO");

                if (driverId && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                  pendingUpdatesRef.current.set(driverId, {
                    id: driverId,
                    latitude: lat,
                    longitude: lng,
                    heading,
                    status,
                    category: cat,
                    vehicleModel: newRecord.vehicle_model || newRecord.vehicleModel,
                    licensePlate: newRecord.license_plate || newRecord.licensePlate,
                    updatedAt: Date.now(),
                  });
                  scheduleFlush();
                }
              }
            }
          )
          .subscribe((status: string) => {
            if (status === "SUBSCRIBED") {
              setIsConnected(true);
            } else if (status === "CLOSED" || status === "TIMED_OUT") {
              setIsConnected(false);
            }
          });
      } catch (err) {
        console.warn("[useLiveDrivers] Falha ao iniciar canal Supabase Realtime:", err);
      }
    }

    // 3. PRUNING AUTOMÁTICO DE STALE DRIVERS (Descarta pings com mais de 30 segundos)
    const pruneInterval = setInterval(() => {
      if (!isMountedRef.current) return;
      const now = Date.now();
      const cutoff = now - 30 * 1000;

      setDriversMap((prev) => {
        let hasExpired = false;
        prev.forEach((val) => {
          if ((val.updatedAt || 0) < cutoff) {
            hasExpired = true;
          }
        });

        if (!hasExpired) return prev;

        const next = new Map<string, LiveDriver>();
        prev.forEach((val, key) => {
          if ((val.updatedAt || 0) >= cutoff) {
            next.set(key, val);
          }
        });
        return next;
      });
    }, 10000);

    return () => {
      isMountedRef.current = false;
      clearInterval(pruneInterval);
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      if (channel) {
        try {
          (supabase as any).removeChannel(channel);
        } catch (_) {}
      }
    };
  }, [scheduleFlush]);

  // Lista memoizada filtrada
  const liveDrivers = useMemo<LiveDriver[]>(() => {
    const list = Array.from(driversMap.values());
    if (categoryFilter === "ALL") return list;
    return list.filter((d) => !d.category || d.category === categoryFilter);
  }, [driversMap, categoryFilter]);

  return {
    liveDrivers,
    totalDrivers: liveDrivers.length,
    isConnected,
    isSearchingDrivers: liveDrivers.length === 0,
  };
}
