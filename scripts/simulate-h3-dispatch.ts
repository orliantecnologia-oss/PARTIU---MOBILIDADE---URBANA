/**
 * ==============================================================================
 * 🚀 PARTIU H3 CONCURRENT WAVE DISPATCH BENCHMARK & LOAD SIMULATOR
 * ==============================================================================
 * Inspirado nos scripts simulate-match.js e driver-loadgen.js do Ride Hailing:
 *
 * Simula um enxame de centenas/milhares de condutores em movimento, indexados
 * hexagonalmente com Uber H3 Resolução 9, processando rajadas concorrentes de
 * corridas e medindo a latência do motor de despacho por ondas (p50, p95, p99).
 *
 * Execução:
 *   npx tsx scripts/simulate-h3-dispatch.ts --drivers 500 --requests 50
 * ==============================================================================
 */

import { h3SpatialIndex, DEFAULT_H3_MATCHING_RESOLUTION } from "../src/lib/spatial/h3-spatial-index";
import { H3DispatchEngine } from "../src/lib/spatial/h3-dispatch-engine";
import { spatialStore } from "../src/lib/spatial/redis-spatial-store";
import { redisLuaEngine } from "../src/lib/spatial/redis-lua-engine";

interface SimArgs {
  drivers: number;
  requests: number;
  centerLat: number;
  centerLng: number;
  radiusM: number;
  acceptProb: number;
  waveSize: number;
  maxWaves: number;
  res: number;
}

function parseArgs(): SimArgs {
  const args = process.argv.slice(2);
  const map = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i].replace(/^--/, "");
    const v = args[i + 1];
    if (v && !v.startsWith("--")) {
      map.set(k, v);
    } else {
      map.set(k, "true");
      i--;
    }
  }

  return {
    drivers: parseInt(map.get("drivers") || "500", 10),
    requests: parseInt(map.get("requests") || "50", 10),
    centerLat: parseFloat(map.get("centerLat") || "-9.6498"), // Maceió, AL
    centerLng: parseFloat(map.get("centerLng") || "-35.7089"),
    radiusM: parseInt(map.get("radiusM") || "8000", 10), // 8km
    acceptProb: parseFloat(map.get("acceptProb") || "0.65"),
    waveSize: parseInt(map.get("waveSize") || "5", 10),
    maxWaves: parseInt(map.get("maxWaves") || "4", 10),
    res: parseInt(map.get("res") || String(DEFAULT_H3_MATCHING_RESOLUTION), 10),
  };
}

function randInCircle(centerLat: number, centerLng: number, radiusM: number): { lat: number; lng: number } {
  const r = radiusM * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  const dx = r * Math.cos(theta);
  const dy = r * Math.sin(theta);
  const dLat = dy / 111320;
  const dLng = dx / (111320 * Math.cos((centerLat * Math.PI) / 180));
  return {
    lat: Number((centerLat + dLat).toFixed(6)),
    lng: Number((centerLng + dLng).toFixed(6)),
  };
}

async function seedDrivers(config: SimArgs): Promise<{ driverIds: string[]; cellDistribution: Map<string, number> }> {
  const driverIds: string[] = [];
  const cellDistribution = new Map<string, number>();

  for (let i = 0; i < config.drivers; i++) {
    const id = `driver_bench_${i}`;
    const p = randInCircle(config.centerLat, config.centerLng, config.radiusM);
    const cell = h3SpatialIndex.latLngToCell(p.lat, p.lng, config.res);

    // Registra motorista online e atualiza telemetria via Lua Engine
    await redisLuaEngine.setDriverOnline(id);
    await redisLuaEngine.updateLocation(id, p.lat, p.lng, cell, Date.now());

    driverIds.push(id);
    cellDistribution.set(cell, (cellDistribution.get(cell) || 0) + 1);
  }

  return { driverIds, cellDistribution };
}

export async function runDispatchBenchmark(customConfig?: Partial<SimArgs>): Promise<{
  totalRequests: number;
  matchedCount: number;
  unmatchedCount: number;
  matchRatePercent: number;
  latenciesMs: number[];
  p50: number;
  p95: number;
  p99: number;
  avgLatencyMs: number;
  wavesCountDistribution: Record<number, number>;
}> {
  const config: SimArgs = {
    ...parseArgs(),
    ...customConfig,
  };

  // 1. Limpa e inicializa o store espacial
  spatialStore.clearAll();
  const { cellDistribution } = await seedDrivers(config);

  const engine = new H3DispatchEngine(spatialStore, redisLuaEngine, config.res);
  const latenciesMs: number[] = [];
  const wavesCountDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (let r = 0; r < config.requests; r++) {
    const rideId = `ride_bench_${r}`;
    const pickup = randInCircle(config.centerLat, config.centerLng, config.radiusM * 0.7);

    const tStart = performance.now();

    // 1. Busca candidatos em anéis concêntricos H3
    const candidates = await engine.fetchCandidatesInH3Rings({
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      maxRings: 4,
      limit: config.waveSize * config.maxWaves,
    });

    let assigned = false;
    let matchedWave = 0;

    if (candidates.length > 0) {
      // Simula o laço de ondas com probabilidade de aceite do condutor
      for (let wave = 1; wave <= config.maxWaves; wave++) {
        const batch = engine.createWaveBatch(candidates, wave, config.waveSize);
        if (batch.length === 0) break;

        // Cada condutor na onda avalia a corrida
        for (const candidate of batch) {
          const accepts = Math.random() < config.acceptProb;
          if (accepts) {
            // Tenta atribuição atômica via Lua (ASSIGN_AND_EVICT)
            const locked = await redisLuaEngine.assignAndEvict(candidate.driverId);
            if (locked) {
              assigned = true;
              matchedWave = wave;
              break;
            }
          }
        }

        if (assigned) break;
      }
    }

    const elapsedMs = performance.now() - tStart;
    latenciesMs.push(elapsedMs);

    if (assigned) {
      matchedCount++;
      wavesCountDistribution[matchedWave] = (wavesCountDistribution[matchedWave] || 0) + 1;
    } else {
      unmatchedCount++;
    }
  }

  // Estatísticas e Percentis
  latenciesMs.sort((a, b) => a - b);
  const p50 = latenciesMs[Math.floor(latenciesMs.length * 0.5)] || 0;
  const p95 = latenciesMs[Math.floor(latenciesMs.length * 0.95)] || 0;
  const p99 = latenciesMs[Math.floor(latenciesMs.length * 0.99)] || 0;
  const sum = latenciesMs.reduce((acc, v) => acc + v, 0);
  const avgLatencyMs = latenciesMs.length > 0 ? sum / latenciesMs.length : 0;
  const matchRatePercent = Number(((matchedCount / config.requests) * 100).toFixed(1));

  return {
    totalRequests: config.requests,
    matchedCount,
    unmatchedCount,
    matchRatePercent,
    latenciesMs,
    p50: Number(p50.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    avgLatencyMs: Number(avgLatencyMs.toFixed(2)),
    wavesCountDistribution,
  };
}

// Execução direta via CLI
if (typeof process !== "undefined" && process.argv[1]?.endsWith("simulate-h3-dispatch.ts")) {
  const cfg = parseArgs();
  console.log("================================================================================");
  console.log("⚡ PARTIU H3 DISPATCH ENGINE BENCHMARK (UBER H3 V4 + REDIS LUA)");
  console.log("================================================================================");
  console.log(`📍 Centro: ${cfg.centerLat}, ${cfg.centerLng} (Raio: ${cfg.radiusM / 1000} km)`);
  console.log(`🚗 População de Condutores: ${cfg.drivers} condutores`);
  console.log(`📲 Corridas Concorrentes: ${cfg.requests} solicitações`);
  console.log(`🌊 Ondas de Despacho: ${cfg.maxWaves} ondas de ${cfg.waveSize} condutores (TTL 10s)`);
  console.log(`🎲 Taxa de Aceite Simulado: ${(cfg.acceptProb * 100).toFixed(0)}%\n`);

  runDispatchBenchmark(cfg).then((res) => {
    console.log("--------------------------------------------------------------------------------");
    console.log("📊 RESULTADOS DO BENCHMARK:");
    console.log("--------------------------------------------------------------------------------");
    console.log(`  Taxa de Sucesso de Pareamento:  ${res.matchedCount}/${res.totalRequests} (${res.matchRatePercent}%)`);
    console.log(`  Corridas Sem Condutor (Timeout): ${res.unmatchedCount}`);
    console.log(`  Latência Média por Corrida:     ${res.avgLatencyMs} ms`);
    console.log(`  Percentil 50 (p50):             ${res.p50} ms`);
    console.log(`  Percentil 95 (p95):             ${res.p95} ms`);
    console.log(`  Percentil 99 (p99):             ${res.p99} ms`);
    console.log("--------------------------------------------------------------------------------");
    console.log("🌊 DISTRIBUIÇÃO DE ONDAS:");
    console.log(`  Onda 1 (Imediata):              ${res.wavesCountDistribution[1] || 0} corridas`);
    console.log(`  Onda 2 (+10s):                  ${res.wavesCountDistribution[2] || 0} corridas`);
    console.log(`  Onda 3 (+20s):                  ${res.wavesCountDistribution[3] || 0} corridas`);
    console.log(`  Onda 4 (+30s):                  ${res.wavesCountDistribution[4] || 0} corridas`);
    console.log("================================================================================\n");
  });
}
