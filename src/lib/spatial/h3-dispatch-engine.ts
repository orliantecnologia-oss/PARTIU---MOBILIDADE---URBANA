/**
 * ==============================================================================
 * 🎯 PARTIU H3 CONCENTRIC RING DISPATCH ENGINE
 * ==============================================================================
 * Inspirado no despachador do Ride Hailing (Matcher Worker).
 * Localiza condutores candidatos nas proximidades do ponto de embarque
 * varrendo anéis concêntricos de hexágonos H3 em tempo de complexidade O(1).
 *
 * FLUXO DE DISPATCH:
 * 1. Calcula a célula H3 do ponto de embarque (Resolução 9, ~170m).
 * 2. Gera anéis concêntricos de expansão (k-rings).
 * 3. Busca motoristas disponíveis no Redis ZSET (`h3:9:<cell>:available`).
 * 4. Carrega a telemetria recente via HGETALL do hash de cada motorista.
 * 5. Retorna candidatos ordenados por proximidade topológica hexagonal.
 * ==============================================================================
 */

import { h3SpatialIndex, DEFAULT_H3_MATCHING_RESOLUTION } from "./h3-spatial-index";
import { spatialStore, type RedisSpatialStoreInterface } from "./redis-spatial-store";
import { redisLuaEngine, type RedisLuaEngine } from "./redis-lua-engine";

export interface CandidateH3Driver {
  driverId: string;
  lat: number;
  lng: number;
  cell: string;
  ring: number;
  distanceApproxMeters: number;
  lastSeenTimestamp: number;
}

export interface FetchCandidatesOptions {
  pickupLat: number;
  pickupLng: number;
  maxRings?: number; // padrão: 4 anéis (~700m - 1.2km)
  limit?: number;    // padrão: 50 condutores
  resolution?: number;
}

export class H3DispatchEngine {
  private store: RedisSpatialStoreInterface;
  private lua: RedisLuaEngine;
  private res: number;

  constructor(store: RedisSpatialStoreInterface = spatialStore, lua: RedisLuaEngine = redisLuaEngine, res: number = DEFAULT_H3_MATCHING_RESOLUTION) {
    this.store = store;
    this.lua = lua;
    this.res = res;
  }

  /**
   * Varre anéis concêntricos H3 no Redis e retorna condutores disponíveis ordenados por proximidade
   */
  public async fetchCandidatesInH3Rings(opts: FetchCandidatesOptions): Promise<CandidateH3Driver[]> {
    const { pickupLat, pickupLng, maxRings = 4, limit = 50, resolution = this.res } = opts;

    // 1. Célula de origem do passageiro
    const startCell = h3SpatialIndex.latLngToCell(pickupLat, pickupLng, resolution);

    // 2. Anéis concêntricos ordenados
    const cells = h3SpatialIndex.kRingCellsOrdered(startCell, maxRings);

    const candidateIdsWithRing: Array<{ id: string; ring: number; cell: string }> = [];
    const seenIds = new Set<string>();

    // 3. Itera células buscando condutores disponíveis nos ZSETs
    for (const cell of cells) {
      if (seenIds.size >= limit) break;

      const ringDistance = h3SpatialIndex.gridDistance(startCell, cell);
      const zKey = `h3:${resolution}:${cell}:available`;

      // Lê IDs com maior score (mais recentes primeiro)
      const driverIds = await this.store.zrevrange(zKey, 0, Math.min(limit - seenIds.size - 1, 50));

      for (const id of driverIds) {
        if (!seenIds.has(id)) {
          seenIds.add(id);
          candidateIdsWithRing.push({ id, ring: ringDistance, cell });
          if (seenIds.size >= limit) break;
        }
      }
    }

    if (candidateIdsWithRing.length === 0) {
      return [];
    }

    // 4. Carrega telemetria de cada condutor encontrado
    const results: CandidateH3Driver[] = [];
    for (const item of candidateIdsWithRing) {
      const locData = await this.lua.getDriverLocation(item.id);
      if (!locData) continue;

      // Distância geodésica aproximada em metros
      const distMeters = this.calculateDistanceMeters(pickupLat, pickupLng, locData.lat, locData.lng);

      results.push({
        driverId: item.id,
        lat: locData.lat,
        lng: locData.lng,
        cell: locData.cell || item.cell,
        ring: item.ring,
        distanceApproxMeters: Math.round(distMeters),
        lastSeenTimestamp: locData.ts,
      });
    }

    // 5. Ordena por anel de vizinhança e distância métrica
    results.sort((a, b) => {
      if (a.ring !== b.ring) return a.ring - b.ring;
      return a.distanceApproxMeters - b.distanceApproxMeters;
    });

    return results;
  }

  /**
   * Adquire um lock distribuído para a corrida (evita concorrência entre despachadores)
   */
  public async withRideLock<T>(rideId: string, lockTtlMs: number, operation: () => Promise<T>): Promise<T | null> {
    const lockKey = `ride:${rideId}:lock`;
    const acquired = await this.store.setNxPx(lockKey, "1", lockTtlMs);
    if (!acquired) {
      return null;
    }
    try {
      return await operation();
    } finally {
      await this.store.del(lockKey);
    }
  }

  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metros
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const h3DispatchEngine = new H3DispatchEngine();
