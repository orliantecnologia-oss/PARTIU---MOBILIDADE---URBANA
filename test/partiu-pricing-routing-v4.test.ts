import { describe, test, expect, waitForAllTests } from "./test-harness.mjs";
import { routingCache } from "../src/services/RoutingCache.ts";
import { routingService } from "../src/services/RoutingService.ts";
import { etaEngine } from "../src/services/EtaEngine.ts";
import { surgeEngine } from "../src/services/SurgeEngine.ts";
import { pricingService, ALL_PARTIU_CATEGORIES } from "../src/services/PricingService.ts";
import { antifraudService } from "../src/services/AntifraudService.ts";
import { appSettingsService } from "../src/lib/ecosystem/app-settings-service.ts";

// Polyfill localStorage se necessário
if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe("23. RoutingCache Enterprise (Deadband & Fast Cache)", () => {
  const origenSP: [number, number] = [-46.6565, -23.5615]; // Av. Paulista
  const destinoSP: [number, number] = [-46.6855, -23.5874]; // Faria Lima (~5 km)

  test("Cache: Armazena e recupera métricas com flag cached", async () => {
    routingCache.clear();
    const mockMetrics = {
      distanceKm: 5.2,
      durationMinutes: 14,
      coordinates: [origenSP, destinoSP],
      source: "google_directions" as const,
      polyline: "mockPolyline",
      summary: "Via Av. Brasil",
      cached: false,
    };

    routingCache.set(origenSP, destinoSP, mockMetrics);

    const cached = routingCache.get(origenSP, destinoSP);
    expect(cached).toBeDefined();
    expect(cached?.distanceKm).toBe(5.2);
    expect(cached?.durationMinutes).toBe(14);
    expect(cached?.cached).toBe(true);
  });

  test("Cache: Limpeza e invalidação correta", async () => {
    routingCache.set(origenSP, destinoSP, {
      distanceKm: 3.0,
      durationMinutes: 8,
      coordinates: [origenSP, destinoSP],
      source: "urban_fallback",
      cached: false,
    });

    expect(routingCache.get(origenSP, destinoSP)).toBeDefined();
    routingCache.clear();
    const afterClear = routingCache.get(origenSP, destinoSP);
    expect(afterClear === null || afterClear === undefined).toBeTruthy();
  });
});

describe("24. RoutingService Multi-Provider Engine (Real Streets)", () => {
  const origenSP: [number, number] = [-46.6565, -23.5615];
  const destinoSP: [number, number] = [-46.6855, -23.5874];

  test("Routing: Calcula distância, duração e polyline em vias reais", async () => {
    const route = await routingService.getRoute(origenSP, destinoSP, { skipCache: true });
    expect(route).toBeDefined();
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.durationMinutes).toBeGreaterThan(0);
    expect(Array.isArray(route.coordinates)).toBeTruthy();
    expect(route.coordinates!.length).toBeGreaterThanOrEqual(2);
    expect(typeof route.provider === "string").toBeTruthy();
  });

  test("Routing: Consulta idêntica subsequente é servida com flag cached", async () => {
    const route1 = await routingService.getRoute(origenSP, destinoSP);
    const route2 = await routingService.getRoute(origenSP, destinoSP);
    expect(route1.distanceKm).toBe(route2.distanceKm);
    expect(route2.cached).toBe(true);
  });

  test("Routing: Origem idêntica ao destino resulta em 0 km e 0 min", async () => {
    const route = await routingService.getRoute(origenSP, origenSP, { skipCache: true });
    expect(route.distanceKm).toBe(0);
    expect(route.durationMinutes).toBe(0);
  });
});

describe("25. ETA Engine (Pickup ETA 1 & Trip ETA 2)", () => {
  const origenSP: [number, number] = [-46.6565, -23.5615];
  const destinoSP: [number, number] = [-46.6855, -23.5874];

  test("ETA: Calcula ETA de busca do motorista (ETA 1) e viagem (ETA 2)", async () => {
    const driverCoords: [number, number] = [-46.658, -23.563]; // ~300m de distância
    const pickupEta = await etaEngine.calculatePickupEta(driverCoords, origenSP);

    expect(pickupEta.durationMinutes).toBeGreaterThanOrEqual(1);
    expect(pickupEta.distanceKm).toBeGreaterThan(0);
    expect(pickupEta.formattedEta).toMatch(/min/);

    const tripEta = await etaEngine.calculateTripEta(origenSP, destinoSP);
    expect(tripEta.durationMinutes).toBeGreaterThan(0);
    expect(tripEta.distanceKm).toBeGreaterThan(0);
    expect(tripEta.formattedEta).toBeDefined();
  });

  test("ETA: Ranqueia motorista mais próximo pelo ETA real", async () => {
    const candidates = [
      { id: "d1", coords: [-46.658, -23.563] as [number, number], category: "PARTIU_CARRO" },
      { id: "d2", coords: [-46.700, -23.600] as [number, number], category: "PARTIU_CARRO" },
    ];

    const ranked = await etaEngine.findBestDriverCandidate(candidates, origenSP);
    expect(ranked).toBeDefined();
    expect(ranked?.driver.id).toBe("d1");
  });
});

describe("26. Dynamic Surge Engine (Tarifa Dinâmica Inteligente)", () => {
  test("Surge: Multiplicador 1.0x em cenário equilibrado", async () => {
    const calm = surgeEngine.calculateSurge({
      demandCount: 5,
      availableDriversCount: 10,
      hour: 14,
      rainRiskFactor: 1.0,
    });
    expect(calm.multiplier).toBe(1.0);
    expect(calm.isSurgeActive).toBe(false);
  });

  test("Surge: Dispara multiplicador na alta demanda e respeita teto de segurança (2.5x)", async () => {
    const heavy = surgeEngine.calculateSurge({
      demandCount: 40,
      availableDriversCount: 3,
      hour: 18,
      rainRiskFactor: 1.3,
    });
    expect(heavy.multiplier).toBeGreaterThan(1.0);
    expect(heavy.multiplier).toBeLessThanOrEqual(2.5);
    expect(heavy.isSurgeActive).toBe(true);
  });

  test("Surge: Aplica acréscimo noturno entre 22h e 05h", async () => {
    const night = surgeEngine.calculateSurge({
      demandCount: 10,
      availableDriversCount: 10,
      hour: 23,
    });
    expect(night.breakdown.nightFactor).toBeGreaterThan(1.0);
  });
});

describe("27. Dynamic Pricing Engine & All 7 Categories (Zero Hardcode)", () => {
  const origenSP: [number, number] = [-46.6565, -23.5615];
  const destinoSP: [number, number] = [-46.6855, -23.5874];

  test("Pricing: Retorna cotações completas para as 7 categorias oficiais", async () => {
    const route = await routingService.getRoute(origenSP, destinoSP);
    const quotes = pricingService.calculateQuotesList(route);

    expect(quotes.length).toBe(7);
    const keys = quotes.map((q) => q.categoryId);
    ALL_PARTIU_CATEGORIES.forEach((cat) => {
      expect(keys).toContain(cat);
    });

    const moto = quotes.find((q) => q.categoryId === "PARTIU_MOTO")!;
    const carro = quotes.find((q) => q.categoryId === "PARTIU_CARRO")!;
    const executivo = quotes.find((q) => q.categoryId === "PARTIU_EXECUTIVO")!;
    const van = quotes.find((q) => q.categoryId === "PARTIU_VAN")!;

    expect(moto.priceBrl).toBeLessThanOrEqual(carro.priceBrl);
    expect(executivo.priceBrl).toBeGreaterThanOrEqual(carro.priceBrl);
    expect(van.priceBrl).toBeGreaterThan(carro.priceBrl);
  });

  test("Pricing: Garante piso de tarifa mínima em trajetos ultra curtos", async () => {
    const ultraCurta: [number, number] = [-46.6566, -23.5616];
    const route = await routingService.getRoute(origenSP, ultraCurta);
    const quotes = pricingService.calculateQuotesList(route);

    quotes.forEach((q) => {
      expect(q.priceBrl).toBeGreaterThanOrEqual(q.minimumFare);
    });
  });

  test("Pricing: Preserva paridade com as regras operacionais dinâmicas", async () => {
    appSettingsService.updateSettings({
      base_fare: 12.0,
      price_per_km: 3.5,
      price_per_minute: 0.6,
    });

    const legacyQuotes = pricingService.calculateLegacyPairQuotes(10, 20);
    // Carro: 12 + 10*3.5 + 20*0.6 = 12 + 35 + 12 = 59.00
    expect(legacyQuotes.carro.precoBrl).toBe(59.0);
    // Moto: 12*0.75 + 10*(3.5*0.78) + 20*(0.6*0.75) = 9 + 27.3 + 9 = 45.30
    expect(legacyQuotes.moto.precoBrl).toBe(45.3);
  });
});

describe("28. Antifraud Shield & Server Verification (Tolerância < 1.5%)", () => {
  const origenSP: [number, number] = [-46.6565, -23.5615];
  const destinoSP: [number, number] = [-46.6855, -23.5874];

  test("Antifraud: Aprova cotação íntegra calculada em vias reais", async () => {
    const route = await routingService.getRoute(origenSP, destinoSP);
    const quote = pricingService.calculateCategoryQuote(
      "PARTIU_CARRO",
      route.distanceKm,
      route.durationMinutes
    );

    const verification = await antifraudService.verifyQuote({
      origemCoords: origenSP,
      destinoCoords: destinoSP,
      category: "PARTIU_CARRO",
      clientFareBrl: quote.fareBrl,
      clientDistanceKm: route.distanceKm,
      clientDurationMinutes: route.durationMinutes,
    });

    expect(verification.isValid).toBe(true);
    expect(verification.tamperDetected).toBe(false);
    expect(verification.rejectionReason).toBeUndefined();
  });

  test("Antifraud: Detecta e bloqueia adulteração de preço enviada pelo cliente (> 1.5%)", async () => {
    const route = await routingService.getRoute(origenSP, destinoSP);
    const quote = pricingService.calculateCategoryQuote(
      "PARTIU_CARRO",
      route.distanceKm,
      route.durationMinutes
    );

    // Usuário tenta pagar 50% adulterando o payload do cliente
    const tamperedFare = Number((quote.fareBrl * 0.5).toFixed(2));

    const verification = await antifraudService.verifyQuote({
      origemCoords: origenSP,
      destinoCoords: destinoSP,
      category: "PARTIU_CARRO",
      clientFareBrl: tamperedFare,
      clientDistanceKm: route.distanceKm,
      clientDurationMinutes: route.durationMinutes,
    });

    expect(verification.isValid).toBe(false);
    expect(verification.tamperDetected).toBe(true);
    expect(verification.rejectionReason).toMatch(/adulteração/);
  });

  test("Antifraud: Bloqueia coordenadas geográficas inválidas ou nulas", async () => {
    const verification = await antifraudService.verifyQuote({
      origemCoords: [NaN, NaN],
      destinoCoords: origenSP,
      category: "PARTIU_CARRO",
      clientFareBrl: 25.0,
    });

    expect(verification.isValid).toBe(false);
    expect(verification.rejectionReason).toMatch(/inválidas/);
  });
});

// Execução direta se invocado standalone
if (process.argv[1] && process.argv[1].includes("partiu-pricing-routing-v4")) {
  waitForAllTests().then(() => {
    console.log("\n✨ SUÍTES DE TESTES V4 CONCLUÍDAS COM SUCESSO!\n");
  });
}
