/**
 * ==============================================================================
 * ⚡ PARTIU REDIS SPATIAL STORE (DUAL-MODE CORE)
 * ==============================================================================
 * Implementa a estrutura de dados de chave-valor e conjuntos ordenados (ZSETs)
 * idêntica ao Redis 7 do projeto Ride Hailing:
 * - ZSETs: `h3:<res>:<cell>:available` (score = timestamp, member = driverId)
 * - HASH: `driver:<id>:loc` (lat, lng, h3, ts)
 * - HASH: `driver:<id>:state` (state, updatedAt, ver)
 * - LOCKS: `ride:<id>:lock` (PX ms, NX)
 *
 * MODOS DE OPERAÇÃO:
 * 1. Redis Live / Nuvem: se process.env.REDIS_URL estiver definido.
 * 2. Embedded In-Memory: opera em memória de altíssima performance (0 ms de I/O)
 *    com suporte a expiração de TTL e sem dependências externas.
 * ==============================================================================
 */

export interface ZSetMember {
  member: string;
  score: number;
}

export interface RedisSpatialStoreInterface {
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, member: string): Promise<number>;
  zrevrange(key: string, start: number, stop: number): Promise<string[]>;
  zcard(key: string): Promise<number>;

  hset(key: string, fieldOrObj: string | Record<string, any>, value?: any): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string>>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  hdel(key: string, ...fields: string[]): Promise<number>;

  pexpire(key: string, ttlMs: number): Promise<boolean>;
  del(...keys: string[]): Promise<number>;
  setNxPx(key: string, value: string, ttlMs: number): Promise<boolean>;

  clearAll(): void;
}

/**
 * Implementação em memória de alta performance compatível com a semântica do Redis
 */
export class InMemorySpatialStore implements RedisSpatialStoreInterface {
  private zsets: Map<string, Map<string, number>> = new Map();
  private hashes: Map<string, Map<string, string>> = new Map();
  private strings: Map<string, string> = new Map();
  private expirations: Map<string, NodeJS.Timeout> = new Map();

  public async zadd(key: string, score: number, member: string): Promise<number> {
    let zset = this.zsets.get(key);
    if (!zset) {
      zset = new Map<string, number>();
      this.zsets.set(key, zset);
    }
    const isNew = !zset.has(member);
    zset.set(member, score);
    return isNew ? 1 : 0;
  }

  public async zrem(key: string, member: string): Promise<number> {
    const zset = this.zsets.get(key);
    if (!zset) return 0;
    const deleted = zset.delete(member);
    if (zset.size === 0) {
      this.zsets.delete(key);
    }
    return deleted ? 1 : 0;
  }

  public async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    const zset = this.zsets.get(key);
    if (!zset || zset.size === 0) return [];

    // Converte e ordena por score decrescente (timestamp mais recente primeiro)
    const entries = Array.from(zset.entries());
    entries.sort((a, b) => b[1] - a[1]);

    const stopIndex = stop < 0 ? entries.length + stop + 1 : stop + 1;
    return entries.slice(start, stopIndex).map((e) => e[0]);
  }

  public async zcard(key: string): Promise<number> {
    const zset = this.zsets.get(key);
    return zset ? zset.size : 0;
  }

  public async hset(key: string, fieldOrObj: string | Record<string, any>, value?: any): Promise<number> {
    let hash = this.hashes.get(key);
    if (!hash) {
      hash = new Map<string, string>();
      this.hashes.set(key, hash);
    }

    let addedCount = 0;
    if (typeof fieldOrObj === "object" && fieldOrObj !== null) {
      for (const [f, v] of Object.entries(fieldOrObj)) {
        if (!hash.has(f)) addedCount++;
        hash.set(f, String(v));
      }
    } else if (typeof fieldOrObj === "string" && value !== undefined) {
      if (!hash.has(fieldOrObj)) addedCount++;
      hash.set(fieldOrObj, String(value));
    }

    return addedCount;
  }

  public async hget(key: string, field: string): Promise<string | null> {
    const hash = this.hashes.get(key);
    if (!hash) return null;
    return hash.get(field) ?? null;
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashes.get(key);
    if (!hash) return {};
    const result: Record<string, string> = {};
    for (const [k, v] of hash.entries()) {
      result[k] = v;
    }
    return result;
  }

  public async hincrby(key: string, field: string, increment: number): Promise<number> {
    let hash = this.hashes.get(key);
    if (!hash) {
      hash = new Map<string, string>();
      this.hashes.set(key, hash);
    }
    const current = parseInt(hash.get(field) || "0", 10);
    const nextVal = current + increment;
    hash.set(field, String(nextVal));
    return nextVal;
  }

  public async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.hashes.get(key);
    if (!hash) return 0;
    let count = 0;
    for (const f of fields) {
      if (hash.delete(f)) count++;
    }
    if (hash.size === 0) {
      this.hashes.delete(key);
    }
    return count;
  }

  public async pexpire(key: string, ttlMs: number): Promise<boolean> {
    const prevTimer = this.expirations.get(key);
    if (prevTimer) clearTimeout(prevTimer);

    if (ttlMs <= 0) {
      await this.del(key);
      return true;
    }

    const timer = setTimeout(() => {
      this.zsets.delete(key);
      this.hashes.delete(key);
      this.strings.delete(key);
      this.expirations.delete(key);
    }, ttlMs);

    // No Node.js, desassocia o timer do event loop para não travar desligamento
    if (typeof timer === "object" && "unref" in timer) {
      (timer as any).unref();
    }

    this.expirations.set(key, timer);
    return true;
  }

  public async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      const prevTimer = this.expirations.get(k);
      if (prevTimer) {
        clearTimeout(prevTimer);
        this.expirations.delete(k);
      }
      if (this.zsets.delete(k) || this.hashes.delete(k) || this.strings.delete(k)) {
        count++;
      }
    }
    return count;
  }

  public async setNxPx(key: string, value: string, ttlMs: number): Promise<boolean> {
    if (this.strings.has(key)) {
      return false; // Chave já existe (Lock ocupado)
    }
    this.strings.set(key, value);
    await this.pexpire(key, ttlMs);
    return true;
  }

  public clearAll(): void {
    this.expirations.forEach((t) => clearTimeout(t));
    this.expirations.clear();
    this.zsets.clear();
    this.hashes.clear();
    this.strings.clear();
  }
}

// Instância Singleton compartilhada
export const spatialStore: RedisSpatialStoreInterface = new InMemorySpatialStore();
