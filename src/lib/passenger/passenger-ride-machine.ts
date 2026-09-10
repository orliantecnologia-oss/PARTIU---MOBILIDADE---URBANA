/**
 * ==============================================================================
 * 🚗 PARTIU PASSENGER RIDE OS — STATE MACHINE & PRICING ENGINE (v1.0)
 * ==============================================================================
 * Gerenciamento de estado, rotas e precificação para o módulo de passageiros.
 *
 * REGRA CRÍTICA DE NEGÓCIO:
 * Operação EXCLUSIVAMENTE com duas categorias: "MOTO" e "CARRO".
 * Proibida qualquer lógica de negociação de tarifas, leilão ou categorias complexas.
 *
 * Coordenadas de referência: Itaperuna, RJ [-41.8880, -21.2050]
 * ==============================================================================
 */

import { appSettingsService } from "@/lib/ecosystem/app-settings-service";
import { pricingService } from "@/services/PricingService";

export type PassengerRideState =
  | "IDLE"                  // A. Tela Inicial com mapa e card "Para onde vamos?"
  | "SEARCHING_DESTINATION" // B. Tela de busca de destino (legado compatível)
  | "SELECTING_DESTINATION" // B. Modal de roteamento duplo (Origem / Destino)
  | "CONFIRMING_DESTINATION_MAP" // B3. Seleção de destino por pino central no mapa livre
  | "EDITING_PICKUP"        // B2. Modo de sugestão de embarque estratégico (Smart Pickups)
  | "REVIEWING_ROUTE"       // C. Tela de revisão (Partiu Moto / Partiu Carro + pagamento)
  | "CONFIRMING_PICKUP"     // D1. Ajuste fino do pino de embarque central no mapa
  | "FINDING_DRIVER"        // D2. Radar de busca geral (retrocompatibilidade)
  | "REQUESTED"             // D2.1. Corrida solicitada, inicializando fila
  | "SEARCHING_R1"          // D2.2. Onda 1: Raio 2 km (15s)
  | "SEARCHING_R2"          // D2.3. Onda 2: Raio 4 km (15s)
  | "SEARCHING_R3"          // D2.4. Onda 3: Raio 6-10 km (20s)
  | "DRIVER_ASSIGNED"       // Motorista aceitou a corrida
  | "ACCEPTED"              // Motorista aceitou a corrida (Canônico Supabase rides.status)
  | "DRIVER_ARRIVING"       // Motorista a caminho do local de embarque
  | "DRIVER_EN_ROUTE"       // Motorista a caminho (Canônico Supabase rides.status)
  | "DRIVER_ARRIVED"        // Motorista chegou ao ponto de embarque (Canônico Supabase)
  | "ON_TRIP"               // Viagem em andamento
  | "IN_PROGRESS"           // Viagem em andamento (canônico)
  | "COMPLETED"             // Viagem finalizada
  | "TIMEOUT"               // Busca esgotada sem motoristas disponíveis
  | "CANCELLED";            // Corrida cancelada

export const PASSENGER_RIDE_TRANSITIONS: Record<PassengerRideState, PassengerRideState[]> = {
  IDLE: ["SELECTING_DESTINATION", "SEARCHING_DESTINATION", "REVIEWING_ROUTE", "CONFIRMING_DESTINATION_MAP"],
  SELECTING_DESTINATION: ["IDLE", "EDITING_PICKUP", "CONFIRMING_DESTINATION_MAP", "REVIEWING_ROUTE", "SEARCHING_DESTINATION"],
  SEARCHING_DESTINATION: ["IDLE", "REVIEWING_ROUTE", "SELECTING_DESTINATION", "CONFIRMING_DESTINATION_MAP"],
  CONFIRMING_DESTINATION_MAP: ["SELECTING_DESTINATION", "REVIEWING_ROUTE", "IDLE"],
  EDITING_PICKUP: ["SELECTING_DESTINATION", "REVIEWING_ROUTE", "IDLE"],
  REVIEWING_ROUTE: ["IDLE", "SELECTING_DESTINATION", "CONFIRMING_PICKUP", "CONFIRMING_DESTINATION_MAP", "FINDING_DRIVER", "REQUESTED", "SEARCHING_R1"],
  CONFIRMING_PICKUP: ["REVIEWING_ROUTE", "FINDING_DRIVER", "REQUESTED", "SEARCHING_R1", "IDLE"],
  FINDING_DRIVER: ["REQUESTED", "SEARCHING_R1", "SEARCHING_R2", "SEARCHING_R3", "DRIVER_ASSIGNED", "ACCEPTED", "TIMEOUT", "CANCELLED", "IDLE"],
  REQUESTED: ["SEARCHING_R1", "CANCELLED", "IDLE"],
  SEARCHING_R1: ["SEARCHING_R2", "DRIVER_ASSIGNED", "ACCEPTED", "CANCELLED", "IDLE"],
  SEARCHING_R2: ["SEARCHING_R3", "DRIVER_ASSIGNED", "ACCEPTED", "CANCELLED", "IDLE"],
  SEARCHING_R3: ["TIMEOUT", "DRIVER_ASSIGNED", "ACCEPTED", "CANCELLED", "IDLE"],
  DRIVER_ASSIGNED: ["DRIVER_ARRIVING", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "ON_TRIP", "IN_PROGRESS", "CANCELLED"],
  ACCEPTED: ["DRIVER_ARRIVING", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "ON_TRIP", "IN_PROGRESS", "CANCELLED"],
  DRIVER_ARRIVING: ["DRIVER_ARRIVED", "ON_TRIP", "IN_PROGRESS", "CANCELLED"],
  DRIVER_EN_ROUTE: ["DRIVER_ARRIVED", "ON_TRIP", "IN_PROGRESS", "CANCELLED"],
  DRIVER_ARRIVED: ["ON_TRIP", "IN_PROGRESS", "CANCELLED"],
  ON_TRIP: ["COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["IDLE"],
  TIMEOUT: ["REQUESTED", "SEARCHING_R1", "FINDING_DRIVER", "IDLE", "CANCELLED"],
  CANCELLED: ["IDLE"],
};

export type PassengerVehicleCategory =
  | "MOTO"
  | "CARRO"
  | "EXECUTIVO"
  | "FLASH"
  | "ENTREGA"
  | "TURISMO"
  | "VAN";

export type PaymentMethod = "pix" | "dinheiro";

export interface SavedLocation {
  id: string;
  label: string;
  sublabel: string;
  endereco: string;
  coords: [number, number];
  icone: "home" | "work" | "cart" | "clock";
}

export interface RideQuote {
  categoria: PassengerVehicleCategory;
  nomeExibicao: string;
  descricao: string;
  precoBrl: number;
  duracaoMin: number;
  distanciaKm: number;
  capacidadePassageiros: number;
}

// Coordenadas padrão de Itaperuna, RJ
export const ITAPERUNA_CENTER: [number, number] = [-41.8880, -21.2050];

// Endereço e Coordenadas de Origem Padrão (Itaperuna, RJ)
export const DEFAULT_ORIGIN = {
  endereco: "Rua Amadeu Tinoco Lacerda, 492 - Centro",
  cidade: "Itaperuna, RJ",
  coords: ITAPERUNA_CENTER,
};

// Endereços salvos com acesso rápido de 1 toque (Conforme especificado no item 2.A)
export const SAVED_LOCATIONS: SavedLocation[] = [
  {
    id: "loc-casa",
    label: "Casa",
    sublabel: "Rua Dez de Maio, 188 - Centro",
    endereco: "Rua Dez de Maio, 188 - Centro, Itaperuna - RJ",
    coords: [-41.8860, -21.2065],
    icone: "home",
  },
  {
    id: "loc-trabalho",
    label: "Trabalho",
    sublabel: "Av. Cardoso Moreira, 310 - Centro",
    endereco: "Av. Cardoso Moreira, 310 - Centro, Itaperuna - RJ",
    coords: [-41.8835, -21.2080],
    icone: "work",
  },
  {
    id: "loc-mercado",
    label: "Mercado",
    sublabel: "Supermercados Fluminense 03 - Av. Vinhosa",
    endereco: "Av. Vinhosa, 780 - Vinhosa, Itaperuna - RJ",
    coords: [-41.8910, -21.2025],
    icone: "cart",
  },
];

// Lista para simulação de busca e autocompletar recente
export const RECENT_SEARCH_SUGGESTIONS: SavedLocation[] = [
  ...SAVED_LOCATIONS,
  {
    id: "sug-1",
    label: "Hospital São José do Avaí",
    sublabel: "Rua Cel. Luiz Ferraz, 397 - Centro",
    endereco: "Rua Cel. Luiz Ferraz, 397 - Centro, Itaperuna - RJ",
    coords: [-41.8895, -21.2038],
    icone: "clock",
  },
  {
    id: "sug-2",
    label: "Terminal Rodoviário Urbano",
    sublabel: "Praça Barão do Rio Branco, s/n - Centro",
    endereco: "Praça Barão do Rio Branco, s/n - Centro, Itaperuna - RJ",
    coords: [-41.8940, -21.2005],
    icone: "clock",
  },
  {
    id: "sug-3",
    label: "UniRedentor / AFYA",
    sublabel: "Av. Pres. Dutra, s/n - Cidade Nova",
    endereco: "Av. Pres. Dutra, s/n - Cidade Nova, Itaperuna - RJ",
    coords: [-41.8790, -21.2120],
    icone: "clock",
  },
];

/**
 * Calcula cotação transparente conectada ao PricingService V4.
 * Os valores de base, km e minuto são dinâmicos e garantem piso mínimo de receita.
 */
export function calcularCotacoesPassageiro(
  distanciaKm = 4.8,
  duracaoMin = 12
): { moto: RideQuote; carro: RideQuote } {
  return pricingService.calculateLegacyPairQuotes(distanciaKm, duracaoMin);
}
