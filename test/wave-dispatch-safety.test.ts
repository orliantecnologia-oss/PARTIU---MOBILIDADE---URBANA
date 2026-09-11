import { describe, test, expect } from "./test-harness.mjs";
import { h3DispatchEngine, type CandidateH3Driver } from "../src/lib/spatial/h3-dispatch-engine.ts";
import { spatialStore } from "../src/lib/spatial/redis-spatial-store.ts";
import { redisLuaEngine } from "../src/lib/spatial/redis-lua-engine.ts";
import { matchingEngine } from "../src/services/MatchingEngine.ts";

describe("SUITE 49: WAVE DISPATCHING & 99 SAFETY FILTERS (99MULHER + USER BLOCKS)", () => {
  test("1. Filtro 99Mulher: Descarta 100% de condutores não-femininos", () => {
    const candidates: CandidateH3Driver[] = [
      { driverId: "drv-ana", lat: -21.205, lng: -41.888, cell: "89a", ring: 0, distanceApproxMeters: 100, lastSeenTimestamp: Date.now(), gender: "FEMALE" },
      { driverId: "drv-carlos", lat: -21.206, lng: -41.889, cell: "89b", ring: 0, distanceApproxMeters: 150, lastSeenTimestamp: Date.now(), gender: "MALE" },
      { driverId: "drv-julia", lat: -21.207, lng: -41.890, cell: "89c", ring: 1, distanceApproxMeters: 300, lastSeenTimestamp: Date.now(), gender: "FEMALE" },
      { driverId: "drv-marcos", lat: -21.208, lng: -41.891, cell: "89d", ring: 1, distanceApproxMeters: 400, lastSeenTimestamp: Date.now(), gender: "UNSPECIFIED" },
    ];

    const filtered = h3DispatchEngine.filterFemaleDrivers(candidates);
    expect(filtered.length).toBe(2);
    expect(filtered.map((c) => c.driverId)).toEqual(["drv-ana", "drv-julia"]);

    // Teste com Set explícito de IDs femininos
    const femaleIds = new Set(["drv-julia", "drv-marcos"]);
    const filteredWithSet = h3DispatchEngine.filterFemaleDrivers(candidates, femaleIds);
    expect(filteredWithSet.length).toBe(3);
    expect(filteredWithSet.map((c) => c.driverId)).toEqual(["drv-ana", "drv-julia", "drv-marcos"]);
  });

  test("2. Bloqueio Mútuo (user_blocks): Exclui condutores bloqueados", () => {
    const candidates: CandidateH3Driver[] = [
      { driverId: "drv-1", lat: -21.205, lng: -41.888, cell: "89a", ring: 0, distanceApproxMeters: 100, lastSeenTimestamp: Date.now() },
      { driverId: "drv-2", lat: -21.206, lng: -41.889, cell: "89b", ring: 0, distanceApproxMeters: 150, lastSeenTimestamp: Date.now() },
      { driverId: "drv-3", lat: -21.207, lng: -41.890, cell: "89c", ring: 1, distanceApproxMeters: 300, lastSeenTimestamp: Date.now() },
    ];

    const blockedIds = new Set(["drv-2"]);
    const unblocked = h3DispatchEngine.filterBlockedDrivers(candidates, blockedIds);
    expect(unblocked.length).toBe(2);
    expect(unblocked.map((c) => c.driverId)).toEqual(["drv-1", "drv-3"]);
  });

  test("3. Fatiamento em Ondas (Wave Batching): Divide candidatos em lotes de 5", () => {
    const candidates: CandidateH3Driver[] = Array.from({ length: 12 }, (_, i) => ({
      driverId: `drv-${i + 1}`,
      lat: -21.205 + i * 0.001,
      lng: -41.888 + i * 0.001,
      cell: `cell-${i}`,
      ring: Math.floor(i / 5),
      distanceApproxMeters: (i + 1) * 100,
      lastSeenTimestamp: Date.now(),
    }));

    // Onda 1: condutores 1 a 5
    const wave1 = h3DispatchEngine.createWaveBatch(candidates, 1, 5);
    expect(wave1.length).toBe(5);
    expect(wave1[0].driverId).toBe("drv-1");
    expect(wave1[4].driverId).toBe("drv-5");

    // Onda 2: condutores 6 a 10
    const wave2 = h3DispatchEngine.createWaveBatch(candidates, 2, 5);
    expect(wave2.length).toBe(5);
    expect(wave2[0].driverId).toBe("drv-6");
    expect(wave2[4].driverId).toBe("drv-10");

    // Onda 3: condutores 11 e 12
    const wave3 = h3DispatchEngine.createWaveBatch(candidates, 3, 5);
    expect(wave3.length).toBe(2);
    expect(wave3[0].driverId).toBe("drv-11");
    expect(wave3[1].driverId).toBe("drv-12");

    // Onda 4: vazio
    const wave4 = h3DispatchEngine.createWaveBatch(candidates, 4, 5);
    expect(wave4.length).toBe(0);
  });

  test("4. Publicação e Recusa de Ofertas da Onda com TTL de 15s", async () => {
    spatialStore.clearAll();
    const rideId = "ride-wave-test-1";

    const batch: CandidateH3Driver[] = [
      { driverId: "drv-wave-1", lat: -21.205, lng: -41.888, cell: "89a", ring: 0, distanceApproxMeters: 450, lastSeenTimestamp: Date.now() },
      { driverId: "drv-wave-2", lat: -21.206, lng: -41.889, cell: "89a", ring: 0, distanceApproxMeters: 900, lastSeenTimestamp: Date.now() },
    ];

    const offers = await h3DispatchEngine.publishWaveOffers(rideId, batch, 1, 15000);
    expect(offers.length).toBe(2);
    expect(offers[0].status).toBe("PENDING");
    expect(offers[0].expiresAt > Date.now() + 14000).toBe(true);

    // Motorista 1 recusa expressamente
    const declined = await h3DispatchEngine.declineWaveOffer(rideId, "drv-wave-1");
    expect(declined).toBe(true);

    const allOffers = await h3DispatchEngine.getRideWaveOffers(rideId);
    const offer1 = allOffers.find((o) => o.driverId === "drv-wave-1");
    const offer2 = allOffers.find((o) => o.driverId === "drv-wave-2");
    expect(offer1?.status).toBe("DECLINED");
    expect(offer2?.status).toBe("PENDING");
  });

  test("5. Aceite Atômico e Evicção de Concorrência da Onda", async () => {
    spatialStore.clearAll();
    const rideId = "ride-wave-atomic-1";
    const driverA = "drv-atomic-a";
    const driverB = "drv-atomic-b";
    const now = Date.now();

    // Coloca motoristas online
    await redisLuaEngine.setDriverOnline(driverA, now);
    await redisLuaEngine.setDriverOnline(driverB, now);

    const batch: CandidateH3Driver[] = [
      { driverId: driverA, lat: -21.205, lng: -41.888, cell: "89a", ring: 0, distanceApproxMeters: 200, lastSeenTimestamp: now },
      { driverId: driverB, lat: -21.206, lng: -41.889, cell: "89a", ring: 0, distanceApproxMeters: 250, lastSeenTimestamp: now },
    ];

    await h3DispatchEngine.publishWaveOffers(rideId, batch, 1, 15000);

    // Motorista A aceita a corrida
    const acceptResult = await h3DispatchEngine.acceptWaveOffer(rideId, driverA);
    expect(acceptResult.success).toBe(true);

    // Verifica que Motorista A virou 'busy' via ASSIGN_AND_EVICT
    const stateA = await redisLuaEngine.getDriverState(driverA);
    expect(stateA).toBe("busy");

    // Verifica que a oferta do Motorista B foi expirada automaticamente
    const allOffers = await h3DispatchEngine.getRideWaveOffers(rideId);
    const offerA = allOffers.find((o) => o.driverId === driverA);
    const offerB = allOffers.find((o) => o.driverId === driverB);
    expect(offerA?.status).toBe("ACCEPTED");
    expect(offerB?.status).toBe("EXPIRED");

    // Motorista B tentando aceitar depois é rejeitado
    const secondAccept = await h3DispatchEngine.acceptWaveOffer(rideId, driverB);
    expect(secondAccept.success).toBe(false);
  });

  test("6. Orquestrador executeWaveDispatch: Avanço automático ao declinar e aceite na Onda 2", async () => {
    spatialStore.clearAll();
    const rideId = "ride-orchestrated-1";
    const now = Date.now();

    // 4 candidatos divididos em ondas de tamanho 2 (Onda 1: drv-1, drv-2 | Onda 2: drv-3, drv-4)
    for (let i = 1; i <= 4; i++) {
      await redisLuaEngine.setDriverOnline(`drv-${i}`, now);
    }

    const candidates: CandidateH3Driver[] = [
      { driverId: "drv-1", lat: -21.205, lng: -41.888, cell: "89a", ring: 0, distanceApproxMeters: 100, lastSeenTimestamp: now },
      { driverId: "drv-2", lat: -21.206, lng: -41.889, cell: "89a", ring: 0, distanceApproxMeters: 200, lastSeenTimestamp: now },
      { driverId: "drv-3", lat: -21.207, lng: -41.890, cell: "89a", ring: 1, distanceApproxMeters: 300, lastSeenTimestamp: now },
      { driverId: "drv-4", lat: -21.208, lng: -41.891, cell: "89a", ring: 1, distanceApproxMeters: 400, lastSeenTimestamp: now },
    ];

    // Simula recusa em segundo plano para a Onda 1 e aceite para drv-3 na Onda 2
    setTimeout(async () => {
      // Recusa Onda 1
      await h3DispatchEngine.declineWaveOffer(rideId, "drv-1");
      await h3DispatchEngine.declineWaveOffer(rideId, "drv-2");

      // Aguarda 150ms para a Onda 2 iniciar e aceita drv-3
      setTimeout(async () => {
        await h3DispatchEngine.acceptWaveOffer(rideId, "drv-3");
      }, 150);
    }, 100);

    const result = await h3DispatchEngine.executeWaveDispatch(
      rideId,
      candidates,
      { waveSize: 2, offerTtlMs: 2000, maxWaves: 2 }
    );

    expect(result.success).toBe(true);
    expect(result.assignedDriverId).toBe("drv-3");
    expect(result.waveNumber).toBe(2);
  });
});
