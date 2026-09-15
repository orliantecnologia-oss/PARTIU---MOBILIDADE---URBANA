import { describe, test, testAsync, expect } from "./test-harness.mjs";
import {
  distanceM,
  haversine,
  bearing,
  cumulativeDistances,
  snapToRoute,
  computeProgress,
  announcementBand,
  announcementText,
  shouldAnnounce,
  viaRoad,
  decodePolyline,
} from "../src/services/NavigationEngine.ts";
import {
  pointInPolygon,
  ringBbox,
  circleToRing,
  polygonArea,
  formatDistanceKm,
} from "../src/lib/geo/geofence.ts";
import { createBoundedPool } from "../src/lib/network/fetchPool.ts";
import { cachedSource, clearSourceCache } from "../src/lib/network/sourceCache.ts";

describe("🧭 SUÍTE OFICIAL V8: TECNOLOGIAS GEOESPACIAIS AVANÇADAS (OSIRIS)", () => {
  const sampleRoute: [number, number][] = [
    [-46.6565, -23.5615],
    [-46.6540, -23.5630],
    [-46.6510, -23.5650],
  ];

  test("1.1 cumulativeDistances calcula distâncias acumuladas da rota", () => {
    const cum = cumulativeDistances(sampleRoute);
    expect(cum.length).toBe(3);
    expect(cum[0]).toBe(0);
    expect(cum[1]).toBeGreaterThan(200);
    expect(cum[2]).toBeGreaterThan(cum[1]);
  });

  test("1.2 snapToRoute projeta o ponto GPS ortogonalmente no segmento", () => {
    const noisyGps = { lat: -23.5620, lng: -46.6550 };
    const snap = snapToRoute(sampleRoute, noisyGps.lat, noisyGps.lng);

    expect(snap.index).toBe(0);
    expect(snap.deviation).toBeGreaterThan(0);
    expect(snap.deviation).toBeLessThan(100);
    expect(snap.point[0]).toBeGreaterThan(sampleRoute[0][0]);
    expect(snap.point[0]).toBeLessThan(sampleRoute[1][0]);
  });

  test("1.3 computeProgress detecta chegada ao destino (<35m) e desvio (>45m)", () => {
    const steps = [
      { instruction: "Siga pela Avenida Paulista", distance: 300, duration: 60, location: sampleRoute[0], type: "depart" },
      { instruction: "Vire à direita na Rua Peixoto Gomide", distance: 400, duration: 90, location: sampleRoute[1], type: "right" },
      { instruction: "Você chegou ao destino", distance: 0, duration: 0, location: sampleRoute[2], type: "arrive" },
    ];
    const cum = cumulativeDistances(sampleRoute);
    const stepAlong = [0, cum[1], cum[2]];

    // Início da rota
    const pStart = computeProgress(sampleRoute, steps, stepAlong, 150, { lat: sampleRoute[0][1], lng: sampleRoute[0][0] }, cum);
    expect(pStart.offRoute).toBe(false);
    expect(pStart.arrived).toBe(false);

    // Destino
    const pEnd = computeProgress(sampleRoute, steps, stepAlong, 150, { lat: sampleRoute[2][1], lng: sampleRoute[2][0] }, cum);
    expect(pEnd.arrived).toBe(true);

    // Fora de rota
    const pOff = computeProgress(sampleRoute, steps, stepAlong, 150, { lat: -23.5700, lng: -46.6600 }, cum);
    expect(pOff.offRoute).toBe(true);
  });

  test("1.4 announcementBand & announcementText gerenciam voz sem spam", () => {
    expect(announcementBand(380)).toBe(400);
    const spoken: Record<number, number> = {};

    const b1 = shouldAnnounce(1, 380, spoken);
    expect(b1).toBe(400);
    spoken[1] = b1!;
    expect(announcementText("Vire à direita na Rua Augusta", b1!)).toBe("Em 400 metros, vire à direita na Rua Augusta");

    // Repetição na mesma faixa ignorada
    expect(shouldAnnounce(1, 350, spoken)).toBe(null);

    // Faixa 30m sem prefixo
    expect(announcementText("Vire à direita", 30)).toBe("Vire à direita");
  });

  test("1.5 viaRoad extrai o nome da via principal", () => {
    const steps = [
      { instruction: "Saia da garagem", distance: 20, duration: 5, location: [0, 0] as [number, number], type: "depart" },
      { instruction: "Continue na Avenida Paulista por 3 km", distance: 3000, duration: 300, location: [0, 0] as [number, number], type: "straight" },
    ];
    expect(viaRoad(steps)).toContain("Avenida Paulista");
  });

  test("1.6 decodePolyline decodifica strings de polyline", () => {
    const coords = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@", 5);
    expect(coords.length).toBeGreaterThanOrEqual(3);
    expect(Number.isFinite(coords[0][0])).toBe(true);
  });

  test("2.1 pointInPolygon valida geofences com Ray-Casting", () => {
    const quad: number[][] = [
      [-46.6600, -23.5600],
      [-46.6500, -23.5600],
      [-46.6500, -23.5700],
      [-46.6600, -23.5700],
      [-46.6600, -23.5600],
    ];
    expect(pointInPolygon(-46.6550, -23.5650, quad)).toBe(true);
    expect(pointInPolygon(-46.6700, -23.5800, quad)).toBe(false);
  });

  test("2.2 circleToRing gera círculos geodésicos reais", () => {
    const circle = circleToRing([-46.6550, -23.5650], 2.0, 16);
    expect(circle.length).toBe(17);
    const area = polygonArea(circle);
    expect(area).toBeGreaterThan(11.0);
    expect(area).toBeLessThan(14.0);
  });

  testAsync("3.1 createBoundedPool limita concorrência de requisições paralelas", async () => {
    const pool = createBoundedPool(2);
    let active = 0;
    let max = 0;

    const task = () =>
      pool.run(async () => {
        active++;
        max = Math.max(max, active);
        await new Promise((r) => setTimeout(r, 20));
        active--;
      });

    await Promise.all([task(), task(), task(), task()]);
    expect(max).toBeLessThanOrEqual(2);
  });

  testAsync("3.2 cachedSource deduplica requisições e oferece stale fallback", async () => {
    clearSourceCache();
    let calls = 0;
    const fetcher = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 20));
      return "dados_ok";
    };

    const cached = cachedSource("dedup_key", fetcher, 2000);
    const [r1, r2, r3] = await Promise.all([cached(), cached(), cached()]);

    expect(calls).toBe(1);
    expect(r1).toBe("dados_ok");
    expect(r2).toBe("dados_ok");
    expect(r3).toBe("dados_ok");
  });
});
