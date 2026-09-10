/**
 * ==============================================================================
 * 🗺️ PARTIU — MAP CONSTANTS & CANONICAL LAYER DEFINITIONS
 * ==============================================================================
 * Constantes oficiais para fontes GeoJSON, IDs de camadas, hierarquia de renderização
 * e especificações de estilo padrão Uber/99.
 * ==============================================================================
 */

export const MAP_SOURCES = {
  ROUTE: "partiu-source-route",
  DRIVERS: "partiu-source-drivers",
  PINS: "partiu-source-pins",
  USER_LOCATION: "partiu-source-user-location",
  HEATMAP_DEMAND: "partiu-source-demand-heatmap",
  GEOFENCE_ZONES: "partiu-source-geofence-zones",
} as const;

export const MAP_LAYERS = {
  // 4. Linha da Rota (Polyline)
  ROUTE_CASING: "partiu-layer-route-casing",
  ROUTE_LINE: "partiu-layer-route-line",

  // 5. Camada de Condutores (10.000+ com Clustering Nativo)
  DRIVERS_CLUSTER: "partiu-layer-drivers-cluster",
  DRIVERS_CLUSTER_COUNT: "partiu-layer-drivers-cluster-count",
  DRIVERS_SYMBOL: "partiu-layer-drivers-symbol",

  // 6. Pinos de Endereço (Embarque e Destino)
  ADDRESS_PINS: "partiu-layer-address-pins",

  // 7. Localização do Usuário (Passageiro)
  USER_LOCATION_PULSE: "partiu-layer-user-location-pulse",
  USER_LOCATION_DOT: "partiu-layer-user-location-dot",
} as const;

export const MAP_ASSETS = {
  CARRO: "carro",
  MOTO: "moto",
  DRIVER_ONLINE: "driver-online",
  DRIVER_BUSY: "driver-busy",
  PICKUP_PIN: "pickup-pin",
  DESTINATION_PIN: "destination-pin",
} as const;

export const MAP_COLORS = {
  // Linha da Rota padrão Uber / 99
  ROUTE_LINE: "#276EF1",       // Azul Uber oficial
  ROUTE_CASING: "#0A1B39",     // Borda escura para contraste em qualquer mapa
  ROUTE_ALTERNATE: "#8FA8D4",  // Rotas alternativas

  // Pinos de ancoragem
  PICKUP_PIN_BG: "#000000",
  PICKUP_PIN_BORDER: "#FFFFFF",
  DESTINATION_PIN_BG: "#EF4444",
  DESTINATION_PIN_BORDER: "#FFFFFF",

  // Clusters de motoristas
  CLUSTER_SMALL: "#F59E0B",    // 2-9 motoristas (Âmbar)
  CLUSTER_MEDIUM: "#10B981",   // 10-49 motoristas (Esmeralda)
  CLUSTER_LARGE: "#2563EB",    // 50+ motoristas (Azul)

  // Status de motoristas
  DRIVER_AVAILABLE: "#10B981", // Verde
  DRIVER_BUSY: "#6B7280",      // Cinza neutro
} as const;

export const MAP_HIERARCHY = {
  LAYER_ORDER: [
    "MapView",
    "Camera",
    "Images",
    "Route Polyline",
    "Drivers Layer",
    "Address Pins",
    "UserLocation",
  ],
} as const;
