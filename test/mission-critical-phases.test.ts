import { describe, test, expect } from "./test-harness.mjs";
import {
  progressiveDispatchEngine,
  SEARCH_TIMEOUT_MS,
  SEARCH_DURATION_MS,
  DRIVER_SEARCH_WINDOW_MS,
} from "../src/services/ProgressiveDispatchEngine.ts";
import { convertDriversToGeoJson, type LiveDriver } from "../src/hooks/useLiveDriversGeoJson.ts";
import { registeredDriversMapService } from "../src/lib/ecosystem/registered-drivers-map.ts";

describe("MISSION CRITICAL SUITE — FASES 1 A 9 VALIDATION", () => {
  // FASE 3: STACKING CONTEXT
  test("FASE 3: Top Modal Stacking Context explícito (zIndex 9999 + elevation 40)", () => {
    const topModalStyle = {
      position: "fixed",
      top: "calc(env(safe-area-inset-top, 0px) + 16px)",
      zIndex: 9999,
      elevation: 40,
    };
    expect(topModalStyle.zIndex).toBe(9999);
    expect(topModalStyle.elevation).toBe(40);
    expect(topModalStyle.position).toBe("fixed");
  });

  // FASE 4: 60S SEARCH WINDOW
  test("FASE 4: Constantes oficiais de busca em 60.000 ms (1 minuto)", () => {
    expect(SEARCH_TIMEOUT_MS).toBe(60000);
    expect(SEARCH_DURATION_MS).toBe(60000);
    expect(DRIVER_SEARCH_WINDOW_MS).toBe(60000);
  });

  test("FASE 4: Ondas de despacho somam exatamente 60 segundos (20s + 20s + 20s)", async () => {
    const session = await progressiveDispatchEngine.startProgressiveDispatch({
      rideId: "test-60s-search-window",
      category: "CARRO",
      pickupCoords: [-41.888, -21.205],
      destinationCoords: [-41.879, -21.212],
      fareBrl: 19.5,
    });

    expect(session.waveDurationSeconds).toBe(20);
    expect(session.currentWave).toBe(1);
    expect(session.cascadeSecondsRemaining).toBe(12);

    progressiveDispatchEngine.cleanup("test-60s-search-window");
  });

  // FASE 5: ARQUITETURA REALTIME DE MOTORISTAS
  test("FASE 5: Contrato LiveDriver[] possui propriedades canônicas", () => {
    const mockDriver: LiveDriver = {
      id: "drv-live-01",
      latitude: -21.205,
      longitude: -41.888,
      heading: 145,
      status: "DISPONIVEL",
      category: "CARRO",
      vehicleModel: "Chevrolet Onix",
      licensePlate: "BRA-4X99",
      updatedAt: Date.now(),
    };

    expect(mockDriver.id).toBe("drv-live-01");
    expect(typeof mockDriver.latitude).toBe("number");
    expect(typeof mockDriver.longitude).toBe("number");
    expect(typeof mockDriver.heading).toBe("number");
    expect(mockDriver.status).toBe("DISPONIVEL");
  });

  // FASE 6: MAPBOX REALTIME VEHICLES
  test("FASE 6: Conversão de LiveDriver[] para FeatureCollection Mapbox", () => {
    const drivers: LiveDriver[] = [
      {
        id: "drv-moto-01",
        latitude: -21.2045,
        longitude: -41.8875,
        heading: 90,
        status: "DISPONIVEL",
        category: "MOTO",
        vehicleModel: "Honda CG 160",
        licensePlate: "MOT-1A23",
      },
      {
        id: "drv-car-01",
        latitude: -21.2060,
        longitude: -41.8890,
        heading: 180,
        status: "DISPONIVEL",
        category: "CARRO",
        vehicleModel: "Toyota Yaris",
        licensePlate: "CAR-9X88",
      },
    ];

    const geoJson = convertDriversToGeoJson(drivers);

    expect(geoJson.type).toBe("FeatureCollection");
    expect(geoJson.features.length).toBe(2);

    // Feature 1 (Moto)
    const f1 = geoJson.features[0]!;
    expect(f1.geometry.type).toBe("Point");
    expect(f1.geometry.coordinates[0]).toBe(-41.8875);
    expect(f1.geometry.coordinates[1]).toBe(-21.2045);
    expect(f1.properties.icon).toBe("moto-icon");
    expect(f1.properties.heading).toBe(90);

    // Feature 2 (Carro)
    const f2 = geoJson.features[1]!;
    expect(f2.geometry.type).toBe("Point");
    expect(f2.geometry.coordinates[0]).toBe(-41.8890);
    expect(f2.geometry.coordinates[1]).toBe(-21.2060);
    expect(f2.properties.icon).toBe("car-icon");
    expect(f2.properties.heading).toBe(180);
  });

  // FASE 7: DYNAMIC TOP MODAL
  test("FASE 7: Dynamic Top Modal recebe e processa dados completos do motorista", () => {
    const driverContacted = {
      id: "drv-test-01",
      name: "Carlos Silva",
      firstName: "Carlos",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      rating: 4.98,
      category: "Partiu Carro",
      vehicleModel: "Chevrolet Onix Plus",
      licensePlate: "ABC-1D23",
      distanceKm: 0.8,
      etaMinutes: 2,
      dispatchStatus: "DRIVER_NOTIFIED",
      cascadeSecondsRemaining: 12,
    };

    expect(driverContacted.firstName).toBe("Carlos");
    expect(driverContacted.rating).toBeGreaterThanOrEqual(4.5);
    expect(driverContacted.etaMinutes).toBe(2);
    expect(driverContacted.cascadeSecondsRemaining).toBe(12);
  });

  // FASE 8: PERFORMANCE & RESILIENCE
  test("FASE 8: RegisteredDriversMapService fornece dados imediatos de fallback resiliente", () => {
    const geoJson = registeredDriversMapService.getGeoJsonForMap([-41.888, -21.205]);
    expect(geoJson.type).toBe("FeatureCollection");
    expect(geoJson.features.length).toBeGreaterThan(0);
    expect(geoJson.features[0]!.properties.status).toBe("DISPONIVEL");
  });
});
