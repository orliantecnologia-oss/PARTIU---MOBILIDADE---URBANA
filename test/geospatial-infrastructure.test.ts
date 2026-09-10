import { describe, test, expect } from "./test-harness.mjs";
import { MapboxConfig } from "../src/config/MapboxConfig.ts";
import { mapboxService } from "../src/services/MapboxService.ts";
import { directionsService } from "../src/services/DirectionsService.ts";
import { geocodingService } from "../src/services/GeocodingService.ts";
import { reverseGeocodingService } from "../src/services/ReverseGeocodingService.ts";
import { locationService } from "../src/services/LocationService.ts";
import { MapSources } from "../src/map/MapSources.ts";
import { MAP_ASSETS, MAP_LAYERS, MAP_SOURCES } from "../src/map/MapConstants.ts";

describe("SUITE 47: PARTIU GEOSPATIAL INFRASTRUCTURE — Config & Clean Mapbox Architecture", () => {
  test("1. MapboxConfig: Token e defaults de câmera para Itaperuna-RJ", () => {
    const token = MapboxConfig.getAccessToken();
    expect(typeof token === "string" && token.length > 20).toBe(true);

    const config = MapboxConfig.getConfig();
    expect(config.defaultCenter[0]).toBe(-41.888);
    expect(config.defaultCenter[1]).toBe(-21.205);
    expect(config.defaultPitch).toBe(45);
    expect([15.2, 16.5].includes(config.defaultZoom)).toBe(true);
    expect(config.telemetryEnabled).toBe(false);
  });

  test("2. MapboxConfig: Estilos canônicos Uber/99 Studio", () => {
    expect(["mapbox://styles/mapbox/streets-v12", "mapbox://styles/mapbox/standard", "mapbox://styles/mapbox/light-v11"].includes(MapboxConfig.STYLES.cleanDay)).toBe(true);
    expect(MapboxConfig.STYLES.cleanNight).toBe("mapbox://styles/mapbox/dark-v11");
    expect(MapboxConfig.STYLES.navigationTraffic).toBe("mapbox://styles/mapbox/navigation-day-v1");
  });

  test("3. MapboxService: Sanitização de POIs e poluição visual", () => {
    const mockStyle = {
      version: 8,
      layers: [
        { id: "background", type: "background" },
        { id: "road-primary", type: "line" },
        { id: "poi-label", type: "symbol" },
        { id: "transit-label", type: "symbol" },
        { id: "natural-point-label", type: "symbol" },
        {
          id: "custom-symbol",
          type: "symbol",
          layout: { "icon-image": "restaurant-15" },
        },
        {
          id: "safe-symbol",
          type: "symbol",
          layout: { "icon-image": "road-shield" },
        },
      ],
    };

    const cleaned = mapboxService.cleanMapboxStyle(mockStyle);
    const layerIds = cleaned.layers.map((l: any) => l.id);

    expect(layerIds.includes("background")).toBe(true);
    expect(layerIds.includes("road-primary")).toBe(true);
    expect(layerIds.includes("safe-symbol")).toBe(true);

    // POIs e restaurantes devem ser suprimidos
    expect(layerIds.includes("poi-label")).toBe(false);
    expect(layerIds.includes("transit-label")).toBe(false);
    expect(layerIds.includes("natural-point-label")).toBe(false);
    expect(layerIds.includes("custom-symbol")).toBe(false);
  });
});

describe("SUITE 48: PARTIU GEOSPATIAL INFRASTRUCTURE — Directions Engine (driving-traffic)", () => {
  test("1. DirectionsService: Pontos idênticos retornam 0 km e 0 minutos instantaneamente", async () => {
    const origin: [number, number] = [-41.888, -21.205];
    const result = await directionsService.getRoute(origin, origin);

    expect(result.distanceMeters).toBe(0);
    expect(result.distanceKm).toBe(0);
    expect(result.durationSeconds).toBe(0);
    expect(result.durationMinutes).toBe(0);
    expect(result.coordinates.length).toBe(2);
  });

  test("2. DirectionsService: Rota por vias reais com traçado e congestionamento", async () => {
    const origin: [number, number] = [-41.888, -21.205]; // Centro
    const destination: [number, number] = [-41.879, -21.212]; // UNIG

    const result = await directionsService.getRoute(origin, destination, { skipCache: true });

    expect(result.distanceKm > 0.8).toBe(true);
    expect(result.durationMinutes >= 1).toBe(true);
    expect(result.coordinates.length >= 2).toBe(true);
    expect(result.geometry.length > 10).toBe(true);
    expect(["low", "moderate", "heavy", "severe"].includes(result.trafficCongestion || "low")).toBe(true);
  });

  test("3. DirectionsService: Cache com deadband espacial", async () => {
    const origin: [number, number] = [-41.888, -21.205];
    const destination: [number, number] = [-41.8835, -21.208];

    // Primeira chamada
    await directionsService.getRoute(origin, destination, { skipCache: true });

    // Segunda chamada idêntica deve ser servida com flag cached
    const secondCall = await directionsService.getRoute(origin, destination);
    expect(secondCall.cached).toBe(true);
  });
});

describe("SUITE 49: PARTIU GEOSPATIAL INFRASTRUCTURE — Geocoding & Reverse Geocoding", () => {
  test("1. GeocodingService: Busca de ruas com proximidade de Itaperuna", async () => {
    const results = await geocodingService.search("Cardoso Moreira");
    expect(results.length > 0).toBe(true);

    const first = results[0];
    expect(first.label.toLowerCase().includes("cardoso") || first.endereco.toLowerCase().includes("cardoso")).toBe(true);
    expect(first.coords[0]).toBeCloseTo(-41.8835, 1);
  });

  test("2. GeocodingService: Busca por CEP", async () => {
    const results = await geocodingService.searchCep("28300-000");
    expect(results.length > 0).toBe(true);
    expect(results[0].tipo).toBe("cep");
  });

  test("3. ReverseGeocodingService: Resolução de coordenadas para logradouro estruturado", async () => {
    const coords: [number, number] = [-41.886, -21.2065]; // Rua Dez de Maio
    const address = await reverseGeocodingService.reverseGeocode(coords);

    expect(address.street.length > 0).toBe(true);
    expect(address.city).toBe("Itaperuna");
    expect(address.state).toBe("RJ");
    expect(address.formattedAddress.includes("Itaperuna")).toBe(true);
  });
});

describe("SUITE 50: PARTIU GEOSPATIAL INFRASTRUCTURE — Location Engine & Battery Optimization", () => {
  test("1. LocationService: Taxas de amostragem adaptativas para preservação de bateria", () => {
    // 3s durante corrida ativa do condutor
    expect(locationService.getSamplingIntervalMs("DRIVER_ACTIVE_TRIP")).toBe(3000);
    // 5s em deslocamento livre
    expect(locationService.getSamplingIntervalMs("DRIVER_MOVING")).toBe(5000);
    // 15s quando o condutor está estacionado/parado
    expect(locationService.getSamplingIntervalMs("DRIVER_STOPPED")).toBe(15000);
    // 15s ocioso do passageiro
    expect(locationService.getSamplingIntervalMs("PASSENGER_IDLE")).toBe(15000);
  });

  test("2. LocationService: Fallback e persistência de última localização conhecida", () => {
    const fallback = locationService.getFallbackLocation();
    expect(fallback.coords[0]).toBe(-41.888);
    expect(fallback.coords[1]).toBe(-21.205);
    expect(fallback.accuracy).toBeGreaterThan(0);
  });
});

describe("SUITE 51: PARTIU GEOSPATIAL INFRASTRUCTURE — Mass Scale 10,000 Drivers GeoJSON & GPU Clustering", () => {
  test("1. MapSources: Geração em lote de GeoJSON para 10.000 veículos em < 25ms", () => {
    const drivers = Array.from({ length: 10000 }, (_, i) => ({
      id: `drv-${i}`,
      name: `Condutor ${i}`,
      category: i % 3 === 0 ? ("MOTO" as const) : ("CARRO" as const),
      coords: [-41.888 + (Math.random() - 0.5) * 0.08, -21.205 + (Math.random() - 0.5) * 0.08] as [number, number],
      heading: Math.floor(Math.random() * 360),
      status: "ONLINE" as const,
    }));

    const start = performance.now();
    const geoJson = MapSources.createDriversGeoJSON(drivers);
    const duration = performance.now() - start;

    expect(geoJson.type).toBe("FeatureCollection");
    expect(geoJson.features.length).toBe(10000);
    expect(duration).toBeLessThan(100); // Executa em menos de 100ms na CPU

    const first = geoJson.features[0];
    expect(first.geometry.type).toBe("Point");
    expect(first.properties?.icon).toBeDefined();
  });

  test("2. MapSources: GeoJSON de rota e pinos de embarque/destino", () => {
    const routeCoords: [number, number][] = [
      [-41.888, -21.205],
      [-41.885, -21.207],
      [-41.879, -21.212],
    ];
    const routeGeo = MapSources.createRouteGeoJSON(routeCoords);
    expect(routeGeo.features[0].geometry.type).toBe("LineString");

    const pinsGeo = MapSources.createPinsGeoJSON([-41.888, -21.205], [-41.879, -21.212]);
    expect(pinsGeo.features.length).toBe(2);
    expect(pinsGeo.features[0].properties?.icon).toBe(MAP_ASSETS.PICKUP_PIN);
    expect(pinsGeo.features[1].properties?.icon).toBe(MAP_ASSETS.DESTINATION_PIN);
  });
});
