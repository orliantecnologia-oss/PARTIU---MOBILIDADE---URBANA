/**
 * ==============================================================================
 * 🗄️ PARTIU — SUPABASE SERVICE (POSTGIS RIDE & DRIVER LOGISTICS ORCHESTRATOR)
 * ==============================================================================
 * Centraliza a orquestração entre o Frontend, as tabelas do Supabase (PostgreSQL),
 * os tipos espaciais Geography(Point, 4326) e o Realtime de alta escala.
 *
 * Responsabilidades:
 * 1. INSERT INTO rides com formato PostGIS e Polyline imutável gerada pelo Mapbox.
 * 2. UPDATE active_drivers a cada 5 segundos com telemetria GPS.
 * 3. Assinatura Realtime para o App Passageiro (WebSocket stream).
 * 4. Consulta de Matching Espacial ST_DWithin para ondas de 2km, 4km e 6km.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { RideRequestPayload, DriverLocationUpdate } from "@/types/core-ride-logistics";
import { toPostGISPoint } from "@/utils/gis-interpolation";
import { matchingEngine, type CandidateDriverProfile } from "./MatchingEngine";

export class SupabaseService {
  private static instance: SupabaseService;

  // Armazenamento em memória para contingência offline e testes unitários
  private localRides = new Map<string, RideRequestPayload>();
  private localDrivers = new Map<string, DriverLocationUpdate>();
  private activeSubscriptions = new Map<string, Set<(update: DriverLocationUpdate) => void>>();

  private constructor() {
    this.setupWindowListeners();
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  private setupWindowListeners(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("partiu:driver_location_updated", (e: any) => {
        const detail = e.detail;
        if (!detail) return;
        const update: DriverLocationUpdate = {
          driver_id: detail.driverId || "drv-default",
          coords: detail.coords,
          longitude: detail.coords[0],
          latitude: detail.coords[1],
          heading: detail.heading || 0,
          speed_kmh: detail.speed || 0,
          accuracy: detail.accuracy || 5,
          timestamp: Date.now(),
          status: "ON_TRIP",
          ride_id: detail.rideId || null,
        };
        this.notifySubscribers(update.driver_id, update);
      });
    }
  }

  /**
   * 1. CRIAÇÃO DE CORRIDA COM POSTGIS (INSERT INTO rides)
   * As coordenadas geradas pelo Mapbox são convertidas para Geography(Point, 4326)
   * e acompanhadas da Polyline encriptada original.
   */
  public async createRideRequest(payload: RideRequestPayload): Promise<{ success: boolean; ride: RideRequestPayload; error?: string }> {
    const rideId = payload.id || `ride_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Tradução Espacial para WKT PostGIS
    const originWkt = payload.origin_geography || toPostGISPoint(payload.origin_coords);
    const destinationWkt = payload.destination_geography || toPostGISPoint(payload.destination_coords);

    const enrichedPayload: RideRequestPayload = {
      ...payload,
      id: rideId,
      origin_geography: originWkt,
      destination_geography: destinationWkt,
      status: payload.status || "REQUESTED",
      created_at: payload.created_at || new Date().toISOString(),
    };

    // Armazena localmente para contingência
    this.localRides.set(rideId, enrichedPayload);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("rides")
          .insert({
            id: enrichedPayload.id,
            passenger_id: enrichedPayload.passenger_id || null,
            category: enrichedPayload.category,
            origin_address: enrichedPayload.origin_address,
            origin_coords: enrichedPayload.origin_coords,
            destination_address: enrichedPayload.destination_address,
            destination_coords: enrichedPayload.destination_coords,
            distance_km: enrichedPayload.distance_km,
            estimated_time_mins: enrichedPayload.estimated_time_mins,
            calculated_price: enrichedPayload.calculated_price,
            encoded_polyline: enrichedPayload.encoded_polyline,
            payment_method: enrichedPayload.payment_method,
            status: enrichedPayload.status,
            tenant_id: enrichedPayload.tenant_id || "00000000-0000-0000-0000-000000000000",
          } as any)
          .select()
          .single();

        if (error) {
          console.warn("[SupabaseService] Erro ao persistir ride no Supabase, mantendo buffer local:", error.message);
        } else if (data) {
          return { success: true, ride: { ...enrichedPayload, ...(data as any) } };
        }
      } catch (err: any) {
        console.warn("[SupabaseService] Falha na rede Supabase ao criar corrida:", err.message);
      }
    }

    return { success: true, ride: enrichedPayload };
  }

  /**
   * 2. TRANSMISSÃO DE LOCALIZAÇÃO DO CONDUTOR (UPDATE active_drivers a cada 5s)
   */
  public async updateDriverLocation(telemetry: DriverLocationUpdate): Promise<boolean> {
    this.localDrivers.set(telemetry.driver_id, telemetry);
    this.notifySubscribers(telemetry.driver_id, telemetry);

    if (isSupabaseConfigured()) {
      try {
        // Invoca a RPC PostGIS que faz o ST_SetSRID(ST_MakePoint(lng, lat), 4326)
        await (supabase as any).rpc("upsert_driver_location", {
          p_driver_id: telemetry.driver_id,
          p_lat: telemetry.latitude,
          p_lng: telemetry.longitude,
          p_heading: telemetry.heading,
          p_speed: telemetry.speed_kmh,
          p_status: telemetry.status,
          p_category: "PARTIU_CARRO",
          p_subscription_plan: "OURO",
          p_tenant_id: "00000000-0000-0000-0000-000000000000",
        });
        return true;
      } catch (err) {
        console.warn("[SupabaseService] Erro ao sincronizar active_drivers no Supabase:", err);
      }
    }

    return true;
  }

  /**
   * 3. RECEPÇÃO VIA SUPABASE REALTIME (Websocket para o App Passageiro)
   */
  public subscribeToDriverLocation(
    driverId: string,
    onUpdate: (update: DriverLocationUpdate) => void
  ): () => void {
    if (!this.activeSubscriptions.has(driverId)) {
      this.activeSubscriptions.set(driverId, new Set());
    }
    this.activeSubscriptions.get(driverId)!.add(onUpdate);

    // Se já tiver uma localização prévia em cache, entrega imediatamente
    const cached = this.localDrivers.get(driverId);
    if (cached) {
      onUpdate(cached);
    }

    let channel: any = null;

    if (isSupabaseConfigured()) {
      try {
        channel = supabase
          .channel(`driver-location-${driverId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "driver_locations",
              filter: `driver_id=eq.${driverId}`,
            },
            (payload: any) => {
              const row = payload.new;
              if (row) {
                const lat = Number(row.latitude ?? row.lat);
                const lng = Number(row.longitude ?? row.lng);
                if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)) {
                  const update: DriverLocationUpdate = {
                    driver_id: row.driver_id,
                    coords: [lng, lat],
                    latitude: lat,
                    longitude: lng,
                    heading: Number(row.heading) || 0,
                    speed_kmh: Number(row.speed) || 0,
                    accuracy: Number(row.accuracy) || 5,
                    timestamp: Date.now(),
                    status: row.status,
                    ride_id: row.current_ride_id || null,
                  };
                  this.notifySubscribers(driverId, update);
                }
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn("[SupabaseService] Erro ao abrir canal realtime Supabase:", err);
      }
    }

    return () => {
      const subs = this.activeSubscriptions.get(driverId);
      if (subs) {
        subs.delete(onUpdate);
        if (subs.size === 0) {
          this.activeSubscriptions.delete(driverId);
        }
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }

  private notifySubscribers(driverId: string, update: DriverLocationUpdate): void {
    const subs = this.activeSubscriptions.get(driverId);
    if (subs) {
      subs.forEach((fn) => {
        try {
          fn(update);
        } catch (e) {
          console.error("[SupabaseService] Erro no listener de telemetria:", e);
        }
      });
    }
  }

  /**
   * 4. MOTOR DE DESPACHO ESPACIAL POSTGIS (ST_DWithin em ondas expansivas)
   * Onda 1: ST_DWithin(driver_location, origin, 2000) (2km)
   * Onda 2: ST_DWithin(driver_location, origin, 4000) (4km)
   * Onda 3: ST_DWithin(driver_location, origin, 6000) (6km)
   */
  public async matchNearbyDriversPostGIS(
    origin: [number, number],
    radiusMeters: number,
    category = "PARTIU_CARRO",
    tenantId = "00000000-0000-0000-0000-000000000000"
  ): Promise<CandidateDriverProfile[]> {
    return matchingEngine.findBestDrivers({
      passengerLng: origin[0],
      passengerLat: origin[1],
      pickupCoords: origin,
      category,
      radiusMeters,
      tenantId,
      limit: 10,
    });
  }

  public getRideById(rideId: string): RideRequestPayload | null {
    return this.localRides.get(rideId) || null;
  }
}

export const supabaseService = SupabaseService.getInstance();
