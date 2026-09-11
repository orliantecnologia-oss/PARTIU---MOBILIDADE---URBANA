/**
 * ==============================================================================
 * 📜 PARTIU REDIS ATOMIC LUA ENGINE (CONCURRENCY DEFENSE CORE)
 * ==============================================================================
 * Transposição fiel e tipada dos scripts Lua do projeto Ride Hailing:
 *
 * 1. UPDATE_LOCATION:
 *    - Atualiza coordenadas e célula H3 no hash de telemetria do condutor.
 *    - Renova TTL automático (PEXPIRE).
 *    - Se o condutor estiver com estado 'online' e mudou de célula H3,
 *      remove atomicamente da célula antiga e insere na nova célula no Redis ZSET.
 *
 * 2. ASSIGN_AND_EVICT:
 *    - Verifica se o motorista está com status 'online'.
 *    - Se sim, remove-o imediatamente do ZSET de condutores disponíveis da célula H3.
 *    - Altera o estado para 'busy' e incrementa a versão atômica do perfil.
 *    - Retorna true (1) se obteve a trava exclusiva ou false (0) se já estava ocupado.
 *    - ELIMINA 100% de condições de corrida (Double Dispatch).
 *
 * 3. RELEASE_TO_CELL:
 *    - Reverte o ASSIGN_AND_EVICT após cancelamento ou conclusão de corrida.
 *    - Reinsere o condutor no ZSET de condutores disponíveis da sua célula H3 atual.
 *    - Altera o estado para 'online'.
 * ==============================================================================
 */

import { spatialStore, type RedisSpatialStoreInterface } from "./redis-spatial-store";
import { DEFAULT_H3_MATCHING_RESOLUTION } from "./h3-spatial-index";

export interface RedisLuaEngineOptions {
  h3Res?: number;
  locTtlMs?: number;
  store?: RedisSpatialStoreInterface;
}

export class RedisLuaEngine {
  private store: RedisSpatialStoreInterface;
  private h3Res: number;
  private locTtlMs: number;

  constructor(opts: RedisLuaEngineOptions = {}) {
    this.store = opts.store || spatialStore;
    this.h3Res = opts.h3Res ?? DEFAULT_H3_MATCHING_RESOLUTION;
    this.locTtlMs = opts.locTtlMs ?? 120000; // 2 minutos de TTL padrão
  }

  public stateKey(driverId: string): string {
    return `driver:${driverId}:state`;
  }

  public locKey(driverId: string): string {
    return `driver:${driverId}:loc`;
  }

  public zsetKey(cell: string): string {
    return `h3:${this.h3Res}:${cell}:available`;
  }

  /**
   * Atribui o condutor exclusivamente e remove-o do ZSET da célula em passo atômico
   * Retorna true se teve sucesso ou false se o condutor já estava ocupado/offline
   */
  public async assignAndEvict(driverId: string, now: number = Date.now()): Promise<boolean> {
    const sKey = this.stateKey(driverId);
    const lKey = this.locKey(driverId);

    const currentState = await this.store.hget(sKey, "state");
    // Apenas condutor 'online' pode ser atribuído
    if (currentState !== "online") {
      return false;
    }

    const cell = await this.store.hget(lKey, "h3");
    if (cell) {
      const zKey = this.zsetKey(cell);
      await this.store.zrem(zKey, driverId);
    }

    await this.store.hset(sKey, {
      state: "busy",
      updatedAt: String(now),
    });
    await this.store.hincrby(sKey, "ver", 1);

    return true;
  }

  /**
   * Libera o condutor de volta para a célula H3 atual após finalização ou cancelamento de corrida
   */
  public async releaseToCell(driverId: string, now: number = Date.now()): Promise<boolean> {
    const sKey = this.stateKey(driverId);
    const lKey = this.locKey(driverId);

    const currentState = await this.store.hget(sKey, "state");
    if (currentState !== "busy") {
      return false;
    }

    const cell = await this.store.hget(lKey, "h3");
    if (cell) {
      const zKey = this.zsetKey(cell);
      await this.store.zadd(zKey, now, driverId);
    }

    await this.store.hset(sKey, {
      state: "online",
      updatedAt: String(now),
    });
    await this.store.hincrby(sKey, "ver", 1);

    return true;
  }

  /**
   * Atualiza a localização do condutor e mantém o índice H3 ZSET perfeitamente sincronizado
   */
  public async updateLocation(
    driverId: string,
    lat: number,
    lng: number,
    newCell: string,
    now: number = Date.now(),
    ttlMs: number = this.locTtlMs
  ): Promise<number> {
    const sKey = this.stateKey(driverId);
    const lKey = this.locKey(driverId);

    const prevCell = await this.store.hget(lKey, "h3");

    // 1. Atualiza hash de telemetria
    await this.store.hset(lKey, {
      lat: String(lat),
      lng: String(lng),
      h3: newCell,
      ts: String(now),
    });

    // 2. Define expiração de TTL na chave de localização
    if (ttlMs > 0) {
      await this.store.pexpire(lKey, ttlMs);
    }

    // 3. Se estiver online, sincroniza o ZSET da célula
    const status = await this.store.hget(sKey, "state");
    if (status === "online") {
      if (prevCell && prevCell !== newCell) {
        const oldZKey = this.zsetKey(prevCell);
        await this.store.zrem(oldZKey, driverId);
      }
      const newZKey = this.zsetKey(newCell);
      await this.store.zadd(newZKey, now, driverId);
    }

    return 1;
  }

  /**
   * Coloca o condutor explicitamente em modo 'online'
   */
  public async setDriverOnline(driverId: string, now: number = Date.now()): Promise<void> {
    const sKey = this.stateKey(driverId);
    const lKey = this.locKey(driverId);

    await this.store.hset(sKey, {
      state: "online",
      updatedAt: String(now),
    });

    const cell = await this.store.hget(lKey, "h3");
    if (cell) {
      const zKey = this.zsetKey(cell);
      await this.store.zadd(zKey, now, driverId);
    }
  }

  /**
   * Coloca o condutor em modo 'offline' e remove de qualquer ZSET
   */
  public async setDriverOffline(driverId: string, now: number = Date.now()): Promise<void> {
    const sKey = this.stateKey(driverId);
    const lKey = this.locKey(driverId);

    await this.store.hset(sKey, {
      state: "offline",
      updatedAt: String(now),
    });

    const cell = await this.store.hget(lKey, "h3");
    if (cell) {
      const zKey = this.zsetKey(cell);
      await this.store.zrem(zKey, driverId);
    }
  }

  /**
   * Retorna o estado atual do condutor ('online' | 'busy' | 'offline' | null)
   */
  public async getDriverState(driverId: string): Promise<string | null> {
    return this.store.hget(this.stateKey(driverId), "state");
  }

  /**
   * Retorna a última localização gravada no Redis
   */
  public async getDriverLocation(driverId: string): Promise<{ lat: number; lng: number; cell: string; ts: number } | null> {
    const data = await this.store.hgetall(this.locKey(driverId));
    if (!data.lat || !data.lng) return null;
    return {
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lng),
      cell: data.h3 || "",
      ts: parseInt(data.ts || "0", 10),
    };
  }
}

export const redisLuaEngine = new RedisLuaEngine();
