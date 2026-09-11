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
  gender?: "FEMALE" | "MALE" | "OTHER" | "UNSPECIFIED";
}

export interface WaveDispatchConfig {
  waveSize: number;    // padrão: 5 condutores por onda
  offerTtlMs: number;  // padrão: 15.000ms (15 segundos)
  maxWaves: number;    // padrão: 4 ondas (até 20 condutores)
}

export interface WaveOffer {
  offerId: string;
  rideId: string;
  driverId: string;
  waveNumber: number;
  distanceMeters: number;
  etaMinutes: number;
  expiresAt: number; // timestamp ms
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
}

export interface WaveDispatchResult {
  success: boolean;
  assignedDriverId?: string;
  waveNumber?: number;
  reason?: "ACCEPTED" | "ALL_DECLINED" | "TIMEOUT" | "NO_CANDIDATES" | "RIDE_CANCELED";
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

  /**
   * Filtro de Segurança 99Mulher: Descarta condutores que não pertençam ao gênero feminino
   */
  public filterFemaleDrivers(
    candidates: CandidateH3Driver[],
    femaleDriverIds?: Set<string>
  ): CandidateH3Driver[] {
    if (!candidates || candidates.length === 0) return [];
    return candidates.filter((c) => {
      if (femaleDriverIds && femaleDriverIds.has(c.driverId)) return true;
      return c.gender === "FEMALE";
    });
  }

  /**
   * Filtro de Segurança Bloqueio Mútuo (user_blocks):
   * Exclui motoristas bloqueados pelo passageiro ou que bloquearam o passageiro
   */
  public filterBlockedDrivers(
    candidates: CandidateH3Driver[],
    blockedDriverIds: Set<string>
  ): CandidateH3Driver[] {
    if (!candidates || candidates.length === 0 || !blockedDriverIds || blockedDriverIds.size === 0) {
      return candidates;
    }
    return candidates.filter((c) => !blockedDriverIds.has(c.driverId));
  }

  /**
   * Fatiamento em Ondas (Wave Batching): Retorna o lote da onda solicitada
   */
  public createWaveBatch(
    candidates: CandidateH3Driver[],
    waveNumber: number,
    waveSize: number = 5
  ): CandidateH3Driver[] {
    if (!candidates || candidates.length === 0 || waveNumber < 1) return [];
    const start = (waveNumber - 1) * waveSize;
    return candidates.slice(start, start + waveSize);
  }

  /**
   * Publica ofertas da onda no store atômico (Redis / Memória) com TTL de 15 segundos
   */
  public async publishWaveOffers(
    rideId: string,
    drivers: CandidateH3Driver[],
    waveNumber: number,
    offerTtlMs: number = 15000
  ): Promise<WaveOffer[]> {
    const expiresAt = Date.now() + offerTtlMs;
    const offers: WaveOffer[] = [];
    const hashKey = `partiu:dispatch:offers:${rideId}`;

    for (const d of drivers) {
      const offerId = `off_${rideId.slice(0, 8)}_${d.driverId.slice(0, 6)}_${waveNumber}_${Date.now()}`;
      const etaMinutes = Math.max(1, Math.round(d.distanceApproxMeters / 450));
      const offer: WaveOffer = {
        offerId,
        rideId,
        driverId: d.driverId,
        waveNumber,
        distanceMeters: d.distanceApproxMeters,
        etaMinutes,
        expiresAt,
        status: "PENDING",
      };

      offers.push(offer);
      await this.store.hset(hashKey, d.driverId, JSON.stringify(offer));
      // Trava chave de oferta ativa do motorista com TTL
      await this.store.setNxPx(`partiu:driver:${d.driverId}:active_offer`, rideId, offerTtlMs);
    }

    // Expira o hash da corrida após 5 minutos
    await this.store.pexpire(hashKey, 300000);
    return offers;
  }

  /**
   * Registra a recusa expressa de um motorista na onda ativa
   */
  public async declineWaveOffer(rideId: string, driverId: string): Promise<boolean> {
    const hashKey = `partiu:dispatch:offers:${rideId}`;
    const raw = await this.store.hget(hashKey, driverId);
    if (!raw) return false;

    try {
      const offer: WaveOffer = JSON.parse(raw);
      offer.status = "DECLINED";
      await this.store.hset(hashKey, driverId, JSON.stringify(offer));
      await this.store.del(`partiu:driver:${driverId}:active_offer`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Aceita a oferta da onda com evicção atômica (ASSIGN_AND_EVICT) contra concorrência
   */
  public async acceptWaveOffer(
    rideId: string,
    driverId: string
  ): Promise<{ success: boolean; error?: string }> {
    const hashKey = `partiu:dispatch:offers:${rideId}`;
    const raw = await this.store.hget(hashKey, driverId);
    if (!raw) {
      return { success: false, error: "OFFER_NOT_FOUND" };
    }

    const offer: WaveOffer = JSON.parse(raw);
    if (offer.status !== "PENDING") {
      return { success: false, error: `OFFER_ALREADY_${offer.status}` };
    }

    if (Date.now() > offer.expiresAt) {
      offer.status = "EXPIRED";
      await this.store.hset(hashKey, driverId, JSON.stringify(offer));
      return { success: false, error: "OFFER_EXPIRED" };
    }

    // 1. Evicção atômica no motor espacial (lock atômico contra double dispatch)
    const evicted = await this.lua.assignAndEvict(driverId);
    if (!evicted) {
      return { success: false, error: "DRIVER_UNAVAILABLE" };
    }

    // 2. Marca a oferta aceita e expira as outras da mesma corrida
    offer.status = "ACCEPTED";
    await this.store.hset(hashKey, driverId, JSON.stringify(offer));

    const allOffers = await this.getRideWaveOffers(rideId);
    for (const other of allOffers) {
      if (other.driverId !== driverId && other.status === "PENDING") {
        other.status = "EXPIRED";
        await this.store.hset(hashKey, other.driverId, JSON.stringify(other));
        await this.store.del(`partiu:driver:${other.driverId}:active_offer`);
      }
    }

    return { success: true };
  }

  /**
   * Recupera todas as ofertas registradas para uma corrida
   */
  public async getRideWaveOffers(rideId: string): Promise<WaveOffer[]> {
    const hashKey = `partiu:dispatch:offers:${rideId}`;
    const all = await this.store.hgetall(hashKey);
    const result: WaveOffer[] = [];
    for (const val of Object.values(all)) {
      try {
        result.push(JSON.parse(val));
      } catch {}
    }
    return result;
  }

  /**
   * Executa o loop completo de despacho em ondas (Wave Dispatch Loop)
   */
  public async executeWaveDispatch(
    rideId: string,
    candidates: CandidateH3Driver[],
    config: Partial<WaveDispatchConfig> = {},
    checkRideStatus?: () => Promise<string | null>
  ): Promise<WaveDispatchResult> {
    const { waveSize = 5, offerTtlMs = 15000, maxWaves = 4 } = config;

    if (!candidates || candidates.length === 0) {
      return { success: false, reason: "NO_CANDIDATES" };
    }

    let wave = 1;
    while (wave <= maxWaves) {
      // 1. Fatiamento dos próximos condutores
      const batch = this.createWaveBatch(candidates, wave, waveSize);
      if (batch.length === 0) {
        break; // Sem mais candidatos
      }

      // 2. Publica as ofertas com timer de 15 segundos
      await this.publishWaveOffers(rideId, batch, wave, offerTtlMs);

      // 3. Monitora aceites, recusas ou cancelamento durante a janela da onda
      const startedAt = Date.now();
      while (Date.now() - startedAt < offerTtlMs) {
        // Verifica se a corrida foi cancelada pelo passageiro
        if (checkRideStatus) {
          const status = await checkRideStatus();
          if (status === "CANCELADA" || status === "CANCELED") {
            return { success: false, reason: "RIDE_CANCELED" };
          }
        }

        const offers = await this.getRideWaveOffers(rideId);
        const accepted = offers.find((o) => o.waveNumber === wave && o.status === "ACCEPTED");
        if (accepted) {
          return {
            success: true,
            assignedDriverId: accepted.driverId,
            waveNumber: wave,
            reason: "ACCEPTED",
          };
        }

        const allDeclined = batch.every((d) => {
          const off = offers.find((o) => o.driverId === d.driverId && o.waveNumber === wave);
          return off?.status === "DECLINED";
        });

        if (allDeclined) {
          break; // Avança imediatamente para a próxima onda
        }

        await new Promise((r) => setTimeout(r, 100));
      }

      // Onda expirada sem aceite; avança para a próxima onda
      wave++;
    }

    return { success: false, reason: "TIMEOUT" };
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
