import { describe, it, expect, beforeEach } from "vitest";
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
} from "../src/services/NavigationEngine";
import {
  pointInPolygon,
  ringBbox,
  circleToRing,
  polygonArea,
  formatDistanceKm,
} from "../src/lib/geo/geofence";
import { createBoundedPool } from "../src/lib/network/fetchPool";
import { cachedSource, clearSourceCache } from "../src/lib/network/sourceCache";

describe("🧭 NavigationEngine (Ported & Adapted from Osiris)", () => {
  const sampleRoute: [number, number][] = [
    [-46.6565, -23.5615], // Ponto A (ex: MASP - Paulista)
    [-46.6540, -23.5630], // Ponto B
    [-46.6510, -23.5650], // Ponto C
  ];

  it("calcula distâncias acumuladas com precisão", () => {
    const cum = cumulativeDistances(sampleRoute);
    expect(cum).toHaveLength(3);
    expect(cum[0]).toBe(0);
    expect(cum[1]).toBeGreaterThan(200);
    expect(cum[2]).toBeGreaterThan(cum[1]);
  });

  it("projeta a coordenada GPS perpendicularmente sobre o segmento (snapToRoute)", () => {
    // Ponto ligeiramente ao lado do segmento A-B
    const noisyGps = { lat: -23.5620, lng: -46.6550 };
    const snap = snapToRoute(sampleRoute, noisyGps.lat, noisyGps.lng);

    expect(snap.index).toBe(0); // Pertence ao segmento 0 (A->B)
    expect(snap.deviation).toBeGreaterThan(0);
    expect(snap.deviation).toBeLessThan(100);
    expect(snap.point).toHaveLength(2);
    // Coordenada projetada deve estar contida na faixa de longitude entre A e B (números negativos)
    expect(snap.point[0]).toBeGreaterThan(sampleRoute[0][0]);
    expect(snap.point[0]).toBeLessThan(sampleRoute[1][0]);
  });

  it("calcula progresso, offRoute e chegada ao destino", () => {
    const steps = [
      {
        instruction: "Siga pela Avenida Paulista",
        distance: 300,
        duration: 60,
        location: sampleRoute[0],
        type: "depart",
      },
      {
        instruction: "Vire à direita na Rua Peixoto Gomide",
        distance: 400,
        duration: 90,
        location: sampleRoute[1],
        type: "right",
      },
      {
        instruction: "Você chegou ao destino",
        distance: 0,
        duration: 0,
        location: sampleRoute[2],
        type: "arrive",
      },
    ];

    const cum = cumulativeDistances(sampleRoute);
    const stepAlong = [0, cum[1], cum[2]];

    // Caso 1: Veículo no início da rota
    const progressStart = computeProgress(
      sampleRoute,
      steps,
      stepAlong,
      150,
      { lat: sampleRoute[0][1], lng: sampleRoute[0][0] },
      cum,
    );
    expect(progressStart.offRoute).toBe(false);
    expect(progressStart.arrived).toBe(false);
    expect(progressStart.fraction).toBeLessThan(0.1);

    // Caso 2: Veículo próximo ao destino (< 35m)
    const progressEnd = computeProgress(
      sampleRoute,
      steps,
      stepAlong,
      150,
      { lat: sampleRoute[2][1], lng: sampleRoute[2][0] },
      cum,
    );
    expect(progressEnd.arrived).toBe(true);
    expect(progressEnd.distanceRemaining).toBeLessThan(35);

    // Caso 3: Veículo afastado (> 45m de desvio)
    const progressOff = computeProgress(
      sampleRoute,
      steps,
      stepAlong,
      150,
      { lat: -23.5700, lng: -46.6600 },
      cum,
    );
    expect(progressOff.offRoute).toBe(true);
    expect(progressOff.deviation).toBeGreaterThan(45);
  });

  it("gerencia faixas de anúncios de manobra em Português sem repetição indevida", () => {
    expect(announcementBand(850)).toBe(1000);
    expect(announcementBand(380)).toBe(400);
    expect(announcementBand(120)).toBe(150);
    expect(announcementBand(20)).toBe(30);

    const spoken: Record<number, number> = {};
    const stepIdx = 1;

    // Primeiro aviso a 380m (faixa 400m)
    const band1 = shouldAnnounce(stepIdx, 380, spoken);
    expect(band1).toBe(400);
    spoken[stepIdx] = band1!;
    expect(announcementText("Vire à direita na Rua Augusta", band1!)).toBe(
      "Em 400 metros, vire à direita na Rua Augusta"
    );

    // Mesma faixa de 400m a 350m: NÃO deve repetir
    expect(shouldAnnounce(stepIdx, 350, spoken)).toBeNull();

    // Cruzou para a faixa mais próxima (120m -> faixa 150m): DEVE anunciar
    const band2 = shouldAnnounce(stepIdx, 120, spoken);
    expect(band2).toBe(150);
    spoken[stepIdx] = band2!;

    // Chegou à manobra (< 30m): DEVE anunciar sem prefixo
    const band3 = shouldAnnounce(stepIdx, 15, spoken);
    expect(band3).toBe(30);
    expect(announcementText("Vire à direita na Rua Augusta", band3!)).toBe(
      "Vire à direita na Rua Augusta"
    );
  });

  it("extrai a via principal da rota com viaRoad", () => {
    const steps = [
      { instruction: "Saia em direção ao norte", distance: 50, duration: 10, location: [0, 0] as [number, number], type: "depart" },
      { instruction: "Continue na Avenida Paulista por 2 km", distance: 2000, duration: 240, location: [0, 0] as [number, number], type: "straight" },
      { instruction: "Vire na Rua da Consolação", distance: 300, duration: 60, location: [0, 0] as [number, number], type: "right" },
    ];
    const principal = viaRoad(steps);
    expect(principal).toContain("Avenida Paulista");
  });

  it("decodifica polylines com precisão 5 e 6", () => {
    // Polyline clássica de teste (Google/OSRM)
    const encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
    const coords = decodePolyline(encoded, 5);
    expect(coords.length).toBeGreaterThanOrEqual(3);
    expect(Number.isFinite(coords[0][0])).toBe(true);
    expect(Number.isFinite(coords[0][1])).toBe(true);
  });
});

describe("🌐 Geofence & Geodesic Math (Ported & Adapted from Osiris)", () => {
  // Polígono em formato anel GeoJSON [lng, lat]
  const geofenceQuad: number[][] = [
    [-46.6600, -23.5600],
    [-46.6500, -23.5600],
    [-46.6500, -23.5700],
    [-46.6600, -23.5700],
    [-46.6600, -23.5600],
  ];

  it("detecta com precisão se ponto está dentro ou fora do polígono (pointInPolygon)", () => {
    // Ponto central interno
    const inside = pointInPolygon(-46.6550, -23.5650, geofenceQuad);
    expect(inside).toBe(true);

    // Ponto distante externo
    const outside = pointInPolygon(-46.6700, -23.5800, geofenceQuad);
    expect(outside).toBe(false);
  });

  it("calcula bounding box correto para pré-rejeição", () => {
    const [minLng, minLat, maxLng, maxLat] = ringBbox(geofenceQuad);
    expect(minLng).toBe(-46.6600);
    expect(maxLng).toBe(-46.6500);
    expect(minLat).toBe(-23.5700);
    expect(maxLat).toBe(-23.5600);
  });

  it("gera círculos geodésicos reais imunes à distorção Mercator", () => {
    const ring = circleToRing([-46.6550, -23.5650], 2.5, 16);
    expect(ring.length).toBe(17); // 16 steps + fechamento
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    const area = polygonArea(ring);
    // Área esperada para círculo de raio 2.5 km: pi * r^2 ≈ 19.63 km²
    expect(area).toBeGreaterThan(18.5);
    expect(area).toBeLessThan(20.5);
  });

  it("formata distâncias de forma concisa", () => {
    expect(formatDistanceKm(0.45)).toBe("450 m");
    expect(formatDistanceKm(4.24)).toBe("4.2 km");
    expect(formatDistanceKm(25.8)).toBe("26 km");
  });
});

describe("⚡ Network Resilience: FetchPool & SourceCache (Ported from Osiris)", () => {
  beforeEach(() => {
    clearSourceCache();
  });

  it("createBoundedPool limita o número de requisições simultâneas", async () => {
    const pool = createBoundedPool(2);
    let currentlyRunning = 0;
    let maxObserved = 0;

    const makeTask = (ms: number) => () =>
      pool.run(async () => {
        currentlyRunning++;
        maxObserved = Math.max(maxObserved, currentlyRunning);
        await new Promise((r) => setTimeout(r, ms));
        currentlyRunning--;
        return "ok";
      });

    await Promise.all([
      makeTask(30)(),
      makeTask(30)(),
      makeTask(30)(),
      makeTask(30)(),
    ]);

    expect(maxObserved).toBeLessThanOrEqual(2);
  });

  it("cachedSource deduplica requisições concorrentes em voo", async () => {
    let callCount = 0;
    const fetcher = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 25));
      return ["dados", "reais"];
    };

    const cached = cachedSource("test_key", fetcher, 5000);

    // Dispara 5 chamadas quase simultâneas
    const results = await Promise.all([
      cached(),
      cached(),
      cached(),
      cached(),
      cached(),
    ]);

    expect(callCount).toBe(1); // Somente 1 requisição foi enviada!
    expect(results[0]).toEqual(["dados", "reais"]);
    expect(results[4]).toEqual(["dados", "reais"]);
  });

  it("cachedSource aplica fallback stale-on-error se o upstream falhar", async () => {
    let shouldFail = false;
    const fetcher = async () => {
      if (shouldFail) throw new Error("Servidor offline!");
      return ["versao_1"];
    };

    const cached = cachedSource("stale_test", fetcher, 100);

    // Chamada inicial de sucesso
    const initial = await cached();
    expect(initial).toEqual(["versao_1"]);

    // Simula falha do backend
    shouldFail = true;
    // Aguarda expirar o TTL para tentar revalidar
    await new Promise((r) => setTimeout(r, 120));

    // Deve retornar o dado stale em vez de quebrar
    const staleResult = await cached();
    expect(staleResult).toEqual(["versao_1"]);
  });
});
