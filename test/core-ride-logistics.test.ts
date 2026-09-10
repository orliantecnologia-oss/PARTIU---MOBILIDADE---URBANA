import { describe, test, expect } from "./test-harness.mjs";
import { directionsService } from "../src/services/DirectionsService.ts";
import { pricingService } from "../src/services/PricingService.ts";
import { supabaseService } from "../src/services/SupabaseService.ts";
import { matchingEngine } from "../src/services/MatchingEngine.ts";
import {
  toPostGISPoint,
  fromPostGISPoint,
  haversineDistanceMeters,
  calculateBearing,
  snapPointToPolyline,
  interpolateAlongPolyline,
  calculatePolylineLength,
} from "../src/utils/gis-interpolation.ts";
import type {
  MapboxDirectionsResponse,
  RideRequestPayload,
  DriverLocationUpdate,
} from "../src/types/core-ride-logistics.ts";

describe("SUITE 52: CORE RIDE LOGISTICS — Pre-Ride, Mapbox driving-traffic & PricingService", () => {
  test("1. MapboxDirectionsResponse: Tipagem e validação de schema JSON", () => {
    const mockMapboxResponse: MapboxDirectionsResponse = {
      routes: [
        {
          distance: 4250, // 4.25 km em metros
          duration: 630, // 10.5 min em segundos
          geometry: {
            type: "LineString",
            coordinates: [
              [-41.888, -21.205],
              [-41.885, -21.207],
              [-41.881, -21.209],
              [-41.879, -21.212],
            ],
          },
          weight: 710,
          weight_name: "routability",
          legs: [
            {
              distance: 4250,
              duration: 630,
              summary: "Av. Cardoso Moreira",
              steps: [
                {
                  distance: 1200,
                  duration: 180,
                  geometry: {
                    type: "LineString",
                    coordinates: [
                      [-41.888, -21.205],
                      [-41.885, -21.207],
                    ],
                  },
                  name: "Avenida Cardoso Moreira",
                  mode: "driving",
                  maneuver: {
                    location: [-41.888, -21.205],
                    bearing_before: 0,
                    bearing_after: 45,
                    instruction: "Siga em frente na Av. Cardoso Moreira",
                    type: "depart",
                  },
                },
              ],
              annotation: {
                congestion: ["low", "low", "moderate"],
              },
            },
          ],
        },
      ],
      waypoints: [
        { distance: 0, name: "Centro", location: [-41.888, -21.205] },
        { distance: 0, name: "UNIG", location: [-41.879, -21.212] },
      ],
      code: "Ok",
    };

    expect(mockMapboxResponse.code).toBe("Ok");
    expect(mockMapboxResponse.routes[0].distance).toBe(4250);
    expect(mockMapboxResponse.routes[0].legs[0].summary).toBe("Av. Cardoso Moreira");
  });

  test("2. DirectionsService: Proibição de linha reta — cálculo real por vias com polyline encriptada", async () => {
    const origin: [number, number] = [-41.888, -21.205]; // Centro
    const destination: [number, number] = [-41.879, -21.212]; // UNIG

    const route = await directionsService.getRoute(origin, destination, { skipCache: true });

    // Distância linear pura em linha reta seria ~1.2 km. A rota real por vias é maior
    expect(route.distanceMeters).toBeGreaterThan(1300);
    expect(route.distanceKm).toBeGreaterThan(1.3);
    expect(route.durationMinutes).toBeGreaterThanOrEqual(2);
    expect(typeof route.encodedPolyline === "string" && route.encodedPolyline.length > 5).toBe(true);
    expect(route.coordinates.length).toBeGreaterThan(2);
    expect(route.source === "mapbox_driving_traffic" || route.source === "calibrated_urban_network").toBe(true);
  });

  test("3. PricingService: Injeção de RouteMetrics reais e cálculo de preço fixo multicategoria", () => {
    const routeMetrics = {
      distanceMeters: 4500,
      distanceKm: 4.5,
      durationSeconds: 600,
      durationMinutes: 10,
      trafficDurationMinutes: 12,
      encodedPolyline: "mock_enc_polyline_12345",
      coordinates: [[-41.888, -21.205], [-41.879, -21.212]] as [number, number][],
      startAddress: "Centro, Itaperuna - RJ",
      endAddress: "UNIG, Itaperuna - RJ",
      provider: "mapbox_directions" as const,
    };

    const quotes = pricingService.calculateMultiCategoryQuotes(routeMetrics);

    expect(quotes.PARTIU_MOTO).toBeDefined();
    expect(quotes.PARTIU_CARRO).toBeDefined();
    expect(quotes.PARTIU_EXECUTIVO).toBeDefined();

    // Moto é mais barata que Carro
    expect(quotes.PARTIU_MOTO.priceBrl).toBeLessThan(quotes.PARTIU_CARRO.priceBrl);
    // Executivo é mais caro que Carro
    expect(quotes.PARTIU_EXECUTIVO.priceBrl).toBeGreaterThan(quotes.PARTIU_CARRO.priceBrl);

    // Preço respeita tarifa mínima
    expect(quotes.PARTIU_CARRO.priceBrl).toBeGreaterThanOrEqual(8.0);
  });

  test("4. RideRequestPayload: Criação de pedido com polyline imutável e Geography Point PostGIS", async () => {
    const origin: [number, number] = [-41.888, -21.205];
    const destination: [number, number] = [-41.879, -21.212];
    const route = await directionsService.getRoute(origin, destination);

    const payload: RideRequestPayload = {
      category: "PARTIU_CARRO",
      origin_address: "Rua Amadeu Tinoco Lacerda, 492",
      origin_coords: origin,
      destination_address: "BR-356, Km 02 - UNIG",
      destination_coords: destination,
      distance_km: route.distanceKm,
      estimated_time_mins: route.durationMinutes,
      calculated_price: 18.5,
      encoded_polyline: route.encodedPolyline,
      route_coordinates: route.coordinates,
      payment_method: "PIX",
      status: "REQUESTED",
    };

    const result = await supabaseService.createRideRequest(payload);
    expect(result.success).toBe(true);
    expect(result.ride.origin_geography).toBe("POINT(-41.888 -21.205)");
    expect(result.ride.destination_geography).toBe("POINT(-41.879 -21.212)");
    expect(result.ride.encoded_polyline).toBe(route.encodedPolyline);
  });
});

describe("SUITE 53: CORE RIDE LOGISTICS — PostGIS Dispatch & Expanding Waves (ST_DWithin)", () => {
  test("1. Tradução Espacial: toPostGISPoint e fromPostGISPoint", () => {
    const coords: [number, number] = [-41.888123, -21.205456];
    const wkt = toPostGISPoint(coords);
    expect(wkt).toBe("POINT(-41.888123 -21.205456)");

    const parsed = fromPostGISPoint(wkt);
    expect(parsed !== null).toBe(true);
    expect(parsed![0]).toBeCloseTo(-41.888123, 5);
    expect(parsed![1]).toBeCloseTo(-21.205456, 5);
  });

  test("2. Raio Expansivo PostGIS: Ondas 2km, 4km e 6km com ST_DWithin", async () => {
    const center: [number, number] = [-41.888, -21.205];

    // Onda 1: Raio estrito de 2000 metros (2km)
    const wave1 = await supabaseService.matchNearbyDriversPostGIS(center, 2000, "PARTIU_CARRO");
    expect(Array.isArray(wave1)).toBe(true);
    for (const driver of wave1) {
      expect(driver.distanceMeters).toBeLessThanOrEqual(2000);
    }

    // Onda 2: Expansão para 4000 metros (4km)
    const wave2 = await supabaseService.matchNearbyDriversPostGIS(center, 4000, "PARTIU_CARRO");
    expect(wave2.length).toBeGreaterThanOrEqual(wave1.length);
    for (const driver of wave2) {
      expect(driver.distanceMeters).toBeLessThanOrEqual(4000);
    }

    // Onda 3: Expansão final para 6000 metros (6km)
    const wave3 = await supabaseService.matchNearbyDriversPostGIS(center, 6000, "PARTIU_CARRO");
    expect(wave3.length).toBeGreaterThanOrEqual(wave2.length);
    for (const driver of wave3) {
      expect(driver.distanceMeters).toBeLessThanOrEqual(6000);
    }
  });

  test("3. DispatchScore: Ordenação justa (Distância 40%, ETA 25%, Plano 15%)", () => {
    const driverClose = {
      distanceMeters: 500,
      etaMinutes: 2,
      subscriptionPlan: "OURO" as const,
      acceptanceRate: 99,
      rating: 4.95,
      cancellationRate: 1,
    };

    const driverFar = {
      distanceMeters: 4500,
      etaMinutes: 12,
      subscriptionPlan: "FREE" as const,
      acceptanceRate: 85,
      rating: 4.6,
      cancellationRate: 8,
    };

    const scoreClose = matchingEngine.calculateScore(driverClose);
    const scoreFar = matchingEngine.calculateScore(driverFar);

    expect(scoreClose).toBeGreaterThan(scoreFar);
    expect(scoreClose).toBeGreaterThan(80);
  });
});

describe("SUITE 54: CORE RIDE LOGISTICS — Driver Navigation (Green Approach & Blue Trip)", () => {
  test("1. Etapa A (ACCEPTED / Coleta): Rota do Motorista até a Origem com traçado real", async () => {
    const driverLocation: [number, number] = [-41.8965, -21.198]; // Aeroporto
    const passengerPickup: [number, number] = [-41.888, -21.205]; // Centro

    const approachRoute = await directionsService.getRoute(driverLocation, passengerPickup);

    expect(approachRoute.distanceMeters).toBeGreaterThan(1000);
    expect(approachRoute.durationMinutes).toBeGreaterThanOrEqual(1);
    expect(approachRoute.coordinates.length).toBeGreaterThan(2);

    // Azimute inicial em direção ao passageiro
    const bearing = calculateBearing(approachRoute.coordinates[0], approachRoute.coordinates[1]);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThanOrEqual(360);
  });

  test("2. Etapa B (IN_TRANSIT / Viagem): Rota da Origem ao Destino final", async () => {
    const passengerPickup: [number, number] = [-41.888, -21.205];
    const destination: [number, number] = [-41.879, -21.212];

    const tripRoute = await directionsService.getRoute(passengerPickup, destination);

    expect(tripRoute.distanceMeters).toBeGreaterThan(800);
    expect(tripRoute.coordinates.length).toBeGreaterThan(2);
    expect(tripRoute.encodedPolyline.length).toBeGreaterThan(5);
  });
});

describe("SUITE 55: CORE RIDE LOGISTICS — Live Tracking & Snap to Route Engine", () => {
  const mockRoute: [number, number][] = [
    [-41.8880, -21.2050],
    [-41.8860, -21.2065],
    [-41.8835, -21.2080],
    [-41.8810, -21.2095],
    [-41.8790, -21.2120],
  ];

  test("1. Snap to Route: GPS com ruído fora da rua é projetado no asfalto da via", () => {
    // Ponto GPS com ruído lateral de 25 metros fora da rua
    const noisyGps: [number, number] = [-41.8858, -21.2068];

    const snap = snapPointToPolyline(noisyGps, mockRoute);

    expect(snap.distanceFromLineMeters).toBeGreaterThan(0);
    // Coordenada projetada está no traçado da rua
    expect(snap.snappedCoords[0]).toBeCloseTo(-41.8860, 2);
    expect(snap.snappedCoords[1]).toBeCloseTo(-21.2065, 2);
    // Ângulo tangencial da via
    expect(snap.bearing).toBeGreaterThan(0);
    expect(snap.bearing).toBeLessThan(360);
  });

  test("2. Interpolação Linear ao longo da polyline sem saltos de tela", () => {
    const totalLength = calculatePolylineLength(mockRoute);
    expect(totalLength).toBeGreaterThan(500);

    // Interpola a 25% do percurso
    const step1 = interpolateAlongPolyline(mockRoute, totalLength * 0.25);
    expect(step1.finished).toBe(false);
    expect(step1.coords[0]).toBeGreaterThan(mockRoute[0][0]); // Avançou para leste (longitude maior)

    // Interpola a 75% do percurso
    const step2 = interpolateAlongPolyline(mockRoute, totalLength * 0.75);
    expect(step2.finished).toBe(false);

    // Interpola no final
    const stepFinal = interpolateAlongPolyline(mockRoute, totalLength + 10);
    expect(stepFinal.finished).toBe(true);
    expect(stepFinal.coords[0]).toBe(mockRoute[mockRoute.length - 1][0]);
    expect(stepFinal.coords[1]).toBe(mockRoute[mockRoute.length - 1][1]);
  });

  test("3. Broadcast de Telemetria (DriverLocationUpdate) e Assinatura Realtime", async () => {
    const driverId = "drv_test_99";
    let receivedUpdate: DriverLocationUpdate | null = null;

    const unsubscribe = supabaseService.subscribeToDriverLocation(driverId, (update) => {
      receivedUpdate = update;
    });

    const testUpdate: DriverLocationUpdate = {
      driver_id: driverId,
      coords: [-41.887, -21.2055],
      latitude: -21.2055,
      longitude: -41.887,
      heading: 135,
      speed_kmh: 42,
      accuracy: 4,
      timestamp: Date.now(),
      status: "ON_TRIP",
      ride_id: "ride_123",
    };

    await supabaseService.updateDriverLocation(testUpdate);

    expect(receivedUpdate !== null).toBe(true);
    expect(receivedUpdate!.driver_id).toBe(driverId);
    expect(receivedUpdate!.speed_kmh).toBe(42);
    expect(receivedUpdate!.heading).toBe(135);

    unsubscribe();
  });
});
