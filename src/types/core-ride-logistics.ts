/**
 * ==============================================================================
 * 📦 PARTIU — CORE RIDE LOGISTICS API CONTRACTS (TYPINGS)
 * ==============================================================================
 * Contratos centrais de dados entre Mapbox, PostGIS (Supabase) e Mobile Apps
 * (Passageiro e Motorista) — Padrão Uber/99.
 * ==============================================================================
 */

/**
 * 1. Tipagem Estrita da Resposta da Mapbox Directions API (v5 driving-traffic)
 */
export interface MapboxDirectionsResponse {
  routes: Array<{
    distance: number; // Distância total da rota em metros
    duration: number; // Duração total em segundos (considerando tráfego vivo)
    geometry:
      | {
          type: "LineString";
          coordinates: [number, number][]; // [longitude, latitude][]
        }
      | string; // Polyline codificada (se overview=simplified ou geometries=polyline)
    weight: number;
    weight_name: string;
    legs: Array<{
      distance: number; // Distância deste trecho em metros
      duration: number; // Duração deste trecho em segundos
      summary: string;
      steps: Array<{
        distance: number;
        duration: number;
        geometry: string | { type: "LineString"; coordinates: [number, number][] };
        name: string;
        mode: string;
        maneuver: {
          location: [number, number]; // [lng, lat]
          bearing_before: number;
          bearing_after: number;
          instruction: string;
          type: string;
          modifier?: string;
        };
      }>;
      annotation?: {
        congestion?: Array<"low" | "moderate" | "heavy" | "severe" | "unknown">;
        distance?: number[];
        duration?: number[];
        speed?: number[];
      };
    }>;
  }>;
  waypoints: Array<{
    distance: number;
    name: string;
    location: [number, number]; // [lng, lat]
  }>;
  code: string;
  uuid?: string;
}

/**
 * 2. Payload de Criação e Despacho de Corrida (INSERT INTO rides)
 * Garante que a rota percorrida pelo motorista seja a mesma rota calculada na precificação.
 */
export interface RideRequestPayload {
  id?: string;
  passenger_id?: string;
  passenger_name?: string;
  passenger_phone?: string;
  
  // Categoria de veículo solicitada
  category:
    | "PARTIU_MOTO"
    | "PARTIU_CARRO"
    | "PARTIU_EXECUTIVO"
    | "PARTIU_FLASH"
    | "PARTIU_ENTREGA"
    | "PARTIU_TURISMO"
    | "PARTIU_VAN"
    | string;

  // Origem (Embarque)
  origin_address: string;
  origin_coords: [number, number]; // [longitude, latitude]
  origin_geography?: string; // Formato PostGIS: POINT(lng lat) com SRID 4326

  // Destino (Desembarque)
  destination_address: string;
  destination_coords: [number, number]; // [longitude, latitude]
  destination_geography?: string; // Formato PostGIS: POINT(lng lat) com SRID 4326

  // Métricas do Traçado Mapbox (Zero Linha Reta)
  distance_km: number;
  estimated_time_mins: number;
  calculated_price: number;
  
  // Polyline encriptada gerada pelo Mapbox para traçado imutável
  encoded_polyline: string;
  route_coordinates?: [number, number][];

  // Método de pagamento
  payment_method: "PIX" | "DINHEIRO" | "CARTAO" | string;
  
  // Estado da corrida
  status?:
    | "REQUESTED"
    | "SEARCHING_R1"
    | "SEARCHING_R2"
    | "SEARCHING_R3"
    | "ACCEPTED"
    | "IN_TRANSIT"
    | "COMPLETED"
    | "CANCELLED";

  tenant_id?: string;
  created_at?: string;
}

/**
 * 3. Payload de Telemetria de Localização do Condutor (Websocket / Realtime)
 * Transmitido a cada 5 segundos pelo App do Motorista para a tabela active_drivers.
 */
export interface DriverLocationUpdate {
  driver_id: string;
  coords: [number, number]; // [longitude, latitude]
  latitude: number;
  longitude: number;
  heading: number; // Azimute 0° a 360°
  speed_kmh: number;
  accuracy: number; // Precisão do GPS em metros
  timestamp: number;
  status: "ONLINE_IDLE" | "ONLINE_MOVING" | "ON_TRIP" | "OFFLINE";
  ride_id?: string | null;
  battery_level?: number;
}
