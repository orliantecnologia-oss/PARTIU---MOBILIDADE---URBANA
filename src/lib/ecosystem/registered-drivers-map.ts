/**
 * ==============================================================================
 * 🚘 PARTIU ECOSYSTEM — REGISTERED DRIVERS MAP SERVICE
 * ==============================================================================
 * Conecta o mapa de mobilidade à frota de motoristas e veículos REAIS cadastrados
 * no aplicativo:
 * - Supabase PostgreSQL (`partiu_motoristas`, `partiu_driver_status`)
 * - Cadastros recentes via `/cadastro-motorista` (`partiu_motoristas_store`)
 * - Frota ativa de `driverFleetService` e dados do painel administrativo
 * - Projeção de alta fidelidade em vias urbanas reais com rotação (bearing)
 * ==============================================================================
 */

import { driverFleetService } from "./driver-fleet-service";
import { isMockForbidden } from "@/config/environment";

export interface RegisteredDriverMapFeature {
  id: string;
  coords: [number, number]; // [lng, lat]
  modalidade: "CARRO" | "MOTO";
  nome: string;
  veiculo: string;
  placa: string;
  cor?: string | undefined;
  bearing: number;
  rating?: number | undefined;
  status: "DISPONIVEL" | "EM_RONDA" | "OCUPADO";
}

// Waypoints de vias reais no centro operacional (Itaperuna, RJ) para posicionamento
// determinístico de condutores cadastrados que aguardam telemetria de primeiro GPS
const REAL_STREET_OFFSETS: Array<{
  dLng: number;
  dLat: number;
  bearing: number;
  streetName: string;
}> = [
  { dLng: 0.0018, dLat: 0.0012, bearing: 42, streetName: "Av. Cardoso Moreira" },
  { dLng: -0.0022, dLat: -0.0018, bearing: 184, streetName: "Rua Dez de Maio" },
  { dLng: -0.0035, dLat: 0.0019, bearing: 275, streetName: "Rua Buarque de Nazareth" },
  { dLng: 0.0024, dLat: -0.0015, bearing: 96, streetName: "Rua Assis Ribeiro" },
  { dLng: -0.0012, dLat: 0.0034, bearing: 320, streetName: "Rua Cel. José Bastos" },
  { dLng: 0.0038, dLat: 0.0028, bearing: 135, streetName: "Av. Prefeito Franklin Rolim" },
  { dLng: -0.0028, dLat: 0.0008, bearing: 220, streetName: "Rua Sátiro Garibaldi" },
  { dLng: 0.0012, dLat: -0.0032, bearing: 175, streetName: "Rua Major Porfírio Henriques" },
  { dLng: -0.0042, dLat: -0.0025, bearing: 60, streetName: "Av. Zulamith Bittencourt" },
  { dLng: 0.0045, dLat: -0.0005, bearing: 88, streetName: "Rua Lenira C. Henriques" },
];

class RegisteredDriversMapService {
  private static instance: RegisteredDriversMapService;
  private listeners: Set<(drivers: RegisteredDriverMapFeature[]) => void> = new Set();
  private lastCenter: [number, number] = [-41.8875, -21.2045];
  private isListening = false;

  private constructor() {
    if (typeof window !== "undefined") {
      this.initListeners();
    }
  }

  public static getInstance(): RegisteredDriversMapService {
    if (!RegisteredDriversMapService.instance) {
      RegisteredDriversMapService.instance = new RegisteredDriversMapService();
    }
    return RegisteredDriversMapService.instance;
  }

  private initListeners() {
    if (this.isListening) return;
    this.isListening = true;

    // Escuta atualizações da frota em tempo real
    driverFleetService.subscribe(() => {
      this.notifyListeners();
    });

    // Escuta eventos de cadastro realizados na sessão
    window.addEventListener("storage", (e) => {
      if (
        e.key === "partiu_motoristas_store" ||
        e.key === "partiu_driver_fleet_store" ||
        e.key === "partiu_motorista_ativo"
      ) {
        this.notifyListeners();
      }
    });

    window.addEventListener("partiu:driver_registered", () => {
      this.notifyListeners();
    });
  }

  /**
   * Lê todos os motoristas e veículos reais cadastrados nas diversas fontes do app
   */
  private getRawRegisteredDrivers(): Array<{
    id: string;
    nome: string;
    veiculo: string;
    placa: string;
    cor?: string | undefined;
    modalidade: "CARRO" | "MOTO";
    current_lat?: number | undefined;
    current_lng?: number | undefined;
    rating?: number | undefined;
  }> {
    const list: Array<{
      id: string;
      nome: string;
      veiculo: string;
      placa: string;
      cor?: string | undefined;
      modalidade: "CARRO" | "MOTO";
      current_lat?: number | undefined;
      current_lng?: number | undefined;
      rating?: number | undefined;
    }> = [];

    const seenPlates = new Set<string>();

    // 1. Condutores registrados no driverFleetService (Supabase + SEED_DRIVERS)
    const fleet = driverFleetService.getAllDrivers();
    fleet.forEach((d) => {
      const plate = (d.license_plate || "SEM-PLACA").toUpperCase().trim();
      if (!seenPlates.has(plate)) {
        seenPlates.add(plate);
        list.push({
          id: d.id,
          nome: d.name,
          veiculo: d.vehicle_model || (d.vehicle_type === "MOTO" ? "Honda CG 160" : "Chevrolet Onix"),
          placa: plate,
          cor: d.vehicle_color || undefined,
          modalidade: d.vehicle_type === "MOTO" ? "MOTO" : "CARRO",
          current_lat: typeof d.current_lat === "number" ? d.current_lat : undefined,
          current_lng: typeof d.current_lng === "number" ? d.current_lng : undefined,
          rating: 4.95,
        });
      }
    });

    // 2. Condutores cadastrados pelo formulário `/cadastro-motorista` (localStorage)
    if (typeof window !== "undefined") {
      try {
        const rawStore = localStorage.getItem("partiu_motoristas_store");
        if (rawStore) {
          const parsed = JSON.parse(rawStore);
          if (Array.isArray(parsed)) {
            parsed.forEach((m: any) => {
              const plate = (m.placa || m.veiculoPlaca || "CAD-0000").toUpperCase().trim();
              if (!seenPlates.has(plate)) {
                seenPlates.add(plate);
                const isMoto = m.tipoVeiculo === "moto" || m.categoria_veiculo === "MOTO";
                list.push({
                  id: m.id || `mot_${plate}`,
                  nome: m.nome || "Novo Parceiro",
                  veiculo: m.modelo || m.veiculoModelo || (isMoto ? "Honda Fan 160" : "Fiat Mobi 1.0"),
                  placa: plate,
                  cor: m.cor || m.veiculoCor || undefined,
                  modalidade: isMoto ? "MOTO" : "CARRO",
                  rating: 5.0,
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn("[RegisteredDriversMapService] Falha ao ler partiu_motoristas_store:", err);
      }
    }

    return list;
  }

  /**
   * Constrói os pontos de mapa da frota com coordenadas viárias e ângulos realistas
   */
  public getDriversForMap(centerCoords: [number, number] = this.lastCenter): RegisteredDriverMapFeature[] {
    this.lastCenter = centerCoords;
    const rawDrivers = this.getRawRegisteredDrivers();

    // FILTRAGEM RIGOROSA DE PRODUÇÃO (PADRÃO UBER/99):
    // Apenas condutores com coordenadas GPS físicas reais ativas são projetados no mapa.
    // Proibida qualquer injeção de veículos fantasma ou posições sintéticas sobre a cidade.
    return rawDrivers
      .filter((driver) => (
        typeof driver.current_lat === "number" &&
        typeof driver.current_lng === "number" &&
        !isNaN(driver.current_lat) &&
        !isNaN(driver.current_lng) &&
        !(driver.current_lat === 0 && driver.current_lng === 0)
      ))
      .map((driver, index): RegisteredDriverMapFeature => {
        return {
          id: driver.id,
          coords: [driver.current_lng!, driver.current_lat!],
          modalidade: driver.modalidade,
          nome: driver.nome,
          veiculo: driver.veiculo,
          placa: driver.placa,
          cor: driver.cor,
          bearing: (driver as any).heading || 0,
          rating: driver.rating ?? 4.9,
          status: "DISPONIVEL",
        };
      });
  }

  /**
   * Retorna os veículos como GeoJSON FeatureCollection para alimentação direta no Mapbox GL
   */
  public getGeoJsonForMap(centerCoords?: [number, number]) {
    const drivers = this.getDriversForMap(centerCoords);

    return {
      type: "FeatureCollection" as const,
      features: drivers.map((d) => ({
        type: "Feature" as const,
        properties: {
          id: d.id,
          nome: d.nome,
          veiculo: d.veiculo,
          placa: d.placa,
          cor: d.cor,
          modalidade: d.modalidade,
          icon: d.modalidade === "MOTO" ? "moto-icon" : "car-icon",
          bearing: d.bearing,
          rating: d.rating,
          status: d.status,
        },
        geometry: {
          type: "Point" as const,
          coordinates: d.coords,
        },
      })),
    };
  }

  public subscribe(listener: (drivers: RegisteredDriverMapFeature[]) => void): () => void {
    this.listeners.add(listener);
    // Dispara imediatamente para o novo listener
    listener(this.getDriversForMap(this.lastCenter));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const drivers = this.getDriversForMap(this.lastCenter);
    this.listeners.forEach((l) => {
      try {
        l(drivers);
      } catch (e) {
        console.error("[RegisteredDriversMapService] Erro no listener:", e);
      }
    });
  }
}

export const registeredDriversMapService = RegisteredDriversMapService.getInstance();
