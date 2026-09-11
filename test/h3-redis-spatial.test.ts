import { describe, test, expect } from "./test-harness.mjs";
import { h3SpatialIndex } from "../src/lib/spatial/h3-spatial-index.ts";
import { spatialStore } from "../src/lib/spatial/redis-spatial-store.ts";
import { redisLuaEngine } from "../src/lib/spatial/redis-lua-engine.ts";
import { h3DispatchEngine } from "../src/lib/spatial/h3-dispatch-engine.ts";

describe("SUITE 48: H3 / REDIS SPATIAL INDEXING ENGINE (UBER H3 + ATOMIC LUA)", () => {
  test("1. H3SpatialIndex: Conversão de Coordenadas e Validação de Célula Hexagonal", () => {
    const lat = -21.205;
    const lng = -41.888;

    const cellRes9 = h3SpatialIndex.latLngToCell(lat, lng, 9);
    expect(typeof cellRes9 === "string").toBe(true);
    expect(cellRes9.length > 10).toBe(true);
    expect(h3SpatialIndex.isValidCell(cellRes9)).toBe(true);
    expect(h3SpatialIndex.getResolution(cellRes9)).toBe(9);

    const centroid = h3SpatialIndex.cellToLatLng(cellRes9);
    expect(Math.abs(centroid.lat - lat) < 0.005).toBe(true);
    expect(Math.abs(centroid.lng - lng) < 0.005).toBe(true);
  });

  test("2. H3SpatialIndex: Anéis Concêntricos e Polígonos de Fronteira (gridDisk)", () => {
    const cell = h3SpatialIndex.latLngToCell(-21.205, -41.888, 9);

    // k=1 (célula central + 6 vizinhos = 7 células)
    const disk1 = h3SpatialIndex.gridDisk(cell, 1);
    expect(disk1.length).toBe(7);
    expect(disk1.includes(cell)).toBe(true);

    // k=2 (1 + 6 + 12 = 19 células)
    const disk2 = h3SpatialIndex.gridDisk(cell, 2);
    expect(disk2.length).toBe(19);

    // Distância topológica hexagonal
    for (const neighbor of disk1) {
      const dist = h3SpatialIndex.gridDistance(cell, neighbor);
      expect(dist <= 1).toBe(true);
    }

    // Polígono fechado para renderização Mapbox (7 pontos [lng, lat])
    const polygon = h3SpatialIndex.cellToGeoJsonPolygon(cell);
    expect(polygon.length).toBe(7);
    expect(polygon[0][0]).toBe(polygon[polygon.length - 1][0]);
    expect(polygon[0][1]).toBe(polygon[polygon.length - 1][1]);
  });

  test("3. RedisLuaEngine: updateLocation com sincronização atômica de ZSET", async () => {
    spatialStore.clearAll();

    const driverId = "driver-test-01";
    const lat = -21.205;
    const lng = -41.888;
    const cell1 = h3SpatialIndex.latLngToCell(lat, lng, 9);
    const now = Date.now();

    // 1. Coloca o motorista online
    await redisLuaEngine.setDriverOnline(driverId, now);
    const stateOnline = await redisLuaEngine.getDriverState(driverId);
    expect(stateOnline).toBe("online");

    // 2. Atualiza localização na célula 1
    await redisLuaEngine.updateLocation(driverId, lat, lng, cell1, now);

    // Verifica que está no ZSET da célula 1
    const zkey1 = redisLuaEngine.zsetKey(cell1);
    const inCell1 = await spatialStore.zrevrange(zkey1, 0, 10);
    expect(inCell1.includes(driverId)).toBe(true);

    // 3. Motorista se move para outra coordenada (célula 2)
    const newLat = -21.215;
    const newLng = -41.895;
    const cell2 = h3SpatialIndex.latLngToCell(newLat, newLng, 9);
    expect(cell1 !== cell2).toBe(true);

    await redisLuaEngine.updateLocation(driverId, newLat, newLng, cell2, now + 5000);

    // Deve ter sido removido da célula 1 e inserido na célula 2
    const afterCell1 = await spatialStore.zrevrange(zkey1, 0, 10);
    expect(afterCell1.includes(driverId)).toBe(false);

    const zkey2 = redisLuaEngine.zsetKey(cell2);
    const inCell2 = await spatialStore.zrevrange(zkey2, 0, 10);
    expect(inCell2.includes(driverId)).toBe(true);
  });

  test("4. RedisLuaEngine: ASSIGN_AND_EVICT atômico contra Double Dispatch", async () => {
    spatialStore.clearAll();

    const driverId = "driver-lock-test";
    const lat = -21.205;
    const lng = -41.888;
    const cell = h3SpatialIndex.latLngToCell(lat, lng, 9);
    const now = Date.now();

    // Coloca motorista online e com localização
    await redisLuaEngine.setDriverOnline(driverId, now);
    await redisLuaEngine.updateLocation(driverId, lat, lng, cell, now);

    const zkey = redisLuaEngine.zsetKey(cell);
    expect((await spatialStore.zrevrange(zkey, 0, 10)).includes(driverId)).toBe(true);

    // Passageiro 1 tenta atribuir o motorista
    const assigned1 = await redisLuaEngine.assignAndEvict(driverId, now);
    expect(assigned1).toBe(true);

    // Estado deve ter virado 'busy' e saído do ZSET
    expect(await redisLuaEngine.getDriverState(driverId)).toBe("busy");
    expect((await spatialStore.zrevrange(zkey, 0, 10)).includes(driverId)).toBe(false);

    // Passageiro 2 tenta atribuir simultaneamente o MESMO motorista
    const assigned2 = await redisLuaEngine.assignAndEvict(driverId, now);
    expect(assigned2).toBe(false); // TRAVA ATÔMICA GARANTIDA: Concorrência eliminada!

    // Corrida finalizada: libera condutor de volta para o ZSET
    const released = await redisLuaEngine.releaseToCell(driverId, now + 60000);
    expect(released).toBe(true);
    expect(await redisLuaEngine.getDriverState(driverId)).toBe("online");
    expect((await spatialStore.zrevrange(zkey, 0, 10)).includes(driverId)).toBe(true);
  });

  test("5. H3DispatchEngine: Busca de candidatos em anéis concêntricos H3", async () => {
    spatialStore.clearAll();

    const pickupLat = -21.205;
    const pickupLng = -41.888;
    const startCell = h3SpatialIndex.latLngToCell(pickupLat, pickupLng, 9);

    // Registra 5 motoristas em diferentes distâncias
    const mockDrivers = [
      { id: "mot-1", lat: -21.2051, lng: -41.8881 }, // anel 0 ou 1 (bem perto)
      { id: "mot-2", lat: -21.2065, lng: -41.8895 }, // anel 1
      { id: "mot-3", lat: -21.2090, lng: -41.8920 }, // anel 2
      { id: "mot-4", lat: -21.2130, lng: -41.8960 }, // anel 3
      { id: "mot-busy", lat: -21.2052, lng: -41.8882 }, // ocupado (não deve aparecer)
    ];

    const now = Date.now();
    for (const d of mockDrivers) {
      await redisLuaEngine.setDriverOnline(d.id, now);
      const c = h3SpatialIndex.latLngToCell(d.lat, d.lng, 9);
      await redisLuaEngine.updateLocation(d.id, d.lat, d.lng, c, now);
    }

    // Marca o mot-busy como 'busy'
    await redisLuaEngine.assignAndEvict("mot-busy", now);

    // Executa busca por anéis H3 a partir do ponto de embarque
    const candidates = await h3DispatchEngine.fetchCandidatesInH3Rings({
      pickupLat,
      pickupLng,
      maxRings: 4,
      limit: 10,
    });

    expect(candidates.length).toBe(4);
    // mot-busy NÃO pode estar nos candidatos
    expect(candidates.some((c) => c.driverId === "mot-busy")).toBe(false);

    // O primeiro candidato deve ser o mais próximo (mot-1)
    expect(candidates[0].driverId).toBe("mot-1");
    expect(candidates[0].ring <= 1).toBe(true);

    // A lista deve estar ordenada por distância crescente
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i].distanceApproxMeters >= candidates[i - 1].distanceApproxMeters).toBe(true);
    }
  });

  test("6. H3DispatchEngine: withRideLock distributed lock", async () => {
    const rideId = "ride-test-lock-99";
    let executions = 0;

    const res = await h3DispatchEngine.withRideLock(rideId, 5000, async () => {
      executions++;
      return "SUCCESS";
    });

    expect(res).toBe("SUCCESS");
    expect(executions).toBe(1);

    // Lock deve ter sido liberado após o bloco
    const canAcquireAgain = await h3DispatchEngine.withRideLock(rideId, 5000, async () => "SECOND_OK");
    expect(canAcquireAgain).toBe("SECOND_OK");
  });
});
