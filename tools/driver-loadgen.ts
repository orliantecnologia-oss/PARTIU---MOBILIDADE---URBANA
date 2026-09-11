#!/usr/bin/env node
/**
 * ==============================================================================
 * 🚗 PARTIU SPATIAL SIMULATOR — DRIVER LOAD GENERATOR (Padrão Ride Hailing)
 * ==============================================================================
 * Simula dezenas a centenas de motoristas virtuais se movimentando realisticamente
 * em ruas e anéis concêntricos H3 ao redor de um ponto central (ex: Campos dos
 * Goytacazes, São Paulo, Rio de Janeiro).
 *
 * Utilização via CLI:
 *   npx tsx tools/driver-loadgen.ts --drivers 25 --durationSec 60 --rateHz 1
 *   npx tsx tools/driver-loadgen.ts --drivers 50 --centerLat -21.205 --centerLng -41.888 --radiusM 4000
 * ==============================================================================
 */

import { argv } from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import * as h3 from "h3-js";
import { redisLuaEngine } from "../src/lib/spatial/redis-lua-engine";
import { redisSpatialStore } from "../src/lib/spatial/redis-spatial-store";
import { h3SpatialIndex } from "../src/lib/spatial/h3-spatial-index";

export interface DriverLoadGenConfig {
  drivers: number;
  durationSec: number;
  rateHz: number;
  centerLat: number;
  centerLng: number;
  radiusM: number;
  h3Res: number;
  verbose: boolean;
}

export function parseArgs(): DriverLoadGenConfig {
  const args = new Map<string, string>();
  for (let i = 2; i < argv.length; i += 2) {
    const k = argv[i].replace(/^--/, "");
    const v = argv[i + 1];
    args.set(k, v ?? "1");
    if (!argv[i + 1] || argv[i + 1].startsWith("--")) i--;
  }

  return {
    drivers: parseInt(args.get("drivers") || "20", 10),
    durationSec: parseInt(args.get("durationSec") || "60", 10),
    rateHz: parseFloat(args.get("rateHz") || "1"),
    centerLat: parseFloat(args.get("centerLat") || "-21.205"),
    centerLng: parseFloat(args.get("centerLng") || "-41.888"),
    radiusM: parseInt(args.get("radiusM") || "4000", 10),
    h3Res: parseInt(args.get("res") || "9", 10),
    verbose: args.get("verbose") === "true",
  };
}

/**
 * Retorna ponto aleatório dentro de um círculo com raio em metros
 */
export function randInCircle(centerLat: number, centerLng: number, radiusM: number): { lat: number; lng: number } {
  const r = radiusM * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  const dx = r * Math.cos(theta);
  const dy = r * Math.sin(theta);
  const dLat = dy / 111320;
  const dLng = dx / (111320 * Math.cos((centerLat * Math.PI) / 180));
  return { lat: centerLat + dLat, lng: centerLng + dLng };
}

/**
 * Calcula rumo/azimute (bearing em graus 0-360)
 */
export function calculateBearing(start: { lat: number; lng: number }, end: { lat: number; lng: number }): number {
  const startLng = (start.lng * Math.PI) / 180;
  const startLat = (start.lat * Math.PI) / 180;
  const endLng = (end.lng * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Gerador de rota realista para um motorista simulado
 */
export function* pathGenerator(
  start: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radiusM: number
): Generator<{ lat: number; lng: number }, void, unknown> {
  let a = start;
  while (true) {
    const b = randInCircle(center.lat, center.lng, radiusM);
    const steps = 40 + Math.floor(Math.random() * 60);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      yield {
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      };
    }
    a = b;
  }
}

export interface SimulatedDriver {
  id: string;
  name: string;
  pos: { lat: number; lng: number };
  cell: string;
  heading: number;
  speedKmh: number;
  gen: Generator<{ lat: number; lng: number }, void, unknown>;
}

export async function runSimulation(config: DriverLoadGenConfig): Promise<{
  totalDrivers: number;
  totalPings: number;
  durationMs: number;
}> {
  console.log(`[DriverLoadGen] Iniciando simulação: ${config.drivers} motoristas @ ${config.rateHz}Hz por ${config.durationSec}s`);
  console.log(`[DriverLoadGen] Centro: [${config.centerLat}, ${config.centerLng}] | Raio: ${config.radiusM}m | Res H3: ${config.h3Res}`);

  const drivers: SimulatedDriver[] = [];

  for (let i = 0; i < config.drivers; i++) {
    const start = randInCircle(config.centerLat, config.centerLng, config.radiusM);
    const id = `sim-driver-${i + 1}`;
    const cell = h3.latLngToCell(start.lat, start.lng, config.h3Res);

    drivers.push({
      id,
      name: `Motorista Parceiro #${i + 1}`,
      pos: start,
      cell,
      heading: 0,
      speedKmh: 30 + Math.floor(Math.random() * 25),
      gen: pathGenerator(start, { lat: config.centerLat, lng: config.centerLng }, config.radiusM),
    });

    // Registra como online no store espacial
    await redisLuaEngine.setDriverOnline(id);
    await redisLuaEngine.updateLocation(id, start.lat, start.lng, cell, Date.now());
  }

  console.log(`[DriverLoadGen] ✅ ${drivers.length} motoristas registrados e indexados em H3.`);

  const endAt = Date.now() + config.durationSec * 1000;
  const intervalMs = Math.max(1000 / config.rateHz, 50);
  let totalPings = 0;
  const t0 = Date.now();

  while (Date.now() < endAt) {
    const loopStart = Date.now();

    await Promise.all(
      drivers.map(async (d) => {
        const next = d.gen.next().value;
        if (!next) return;

        const heading = calculateBearing(d.pos, next);
        d.pos = next;
        d.heading = heading;
        d.cell = h3.latLngToCell(next.lat, next.lng, config.h3Res);

        await redisLuaEngine.updateLocation(d.id, next.lat, next.lng, d.cell, Date.now());
        totalPings++;
      })
    );

    const elapsed = Date.now() - loopStart;
    const sleep = Math.max(intervalMs - elapsed, 0);
    if (sleep > 0) {
      await delay(sleep);
    }
  }

  const durationMs = Date.now() - t0;
  console.log(`[DriverLoadGen] 🏁 Simulação concluída: ${totalPings} pings transmitidos em ${Math.round(durationMs / 1000)}s.`);

  return {
    totalDrivers: config.drivers,
    totalPings,
    durationMs,
  };
}

// Execução direta via CLI se chamado como script principal
if (process.argv[1]?.includes("driver-loadgen")) {
  const config = parseArgs();
  runSimulation(config)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[DriverLoadGen] Erro fatal:", err);
      process.exit(1);
    });
}
