/**
 * ==============================================================================
 * 📦 PARTIU NETWORK CACHE — IN-FLIGHT DEDUP & STALE-ON-ERROR
 * ==============================================================================
 * Cache em memória avançado com três propriedades fundamentais:
 * 1. TTL: Serve do cache local enquanto os dados forem válidos.
 * 2. In-flight Deduplication: Requisições concorrentes idênticas compartilham
 *    a mesma promessa em voo, eliminando 'thundering herd' / stampedes.
 * 3. Stale-on-Error Fallback: Se o servidor remoto falhar temporariamente,
 *    continua servindo os últimos dados válidos conhecidos em vez de falhar a UI.
 * ==============================================================================
 */

interface CacheEntry<T> {
  data: T | null;
  expiresAt: number;
  inflight: Promise<T> | null;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();
const MAX_CACHE_ENTRIES = 300;
export const DEFAULT_CACHE_TTL_MS = 60 * 1000; // 60 segundos

function evictIfNeeded(): void {
  if (cacheStore.size <= MAX_CACHE_ENTRIES) return;
  for (const key of cacheStore.keys()) {
    if (cacheStore.size <= MAX_CACHE_ENTRIES) break;
    const entry = cacheStore.get(key);
    if (entry?.inflight) continue; // Nunca remove uma promessa ativa em voo
    cacheStore.delete(key);
  }
}

/**
 * Envolve uma função de busca assíncrona com cache com dedup e fallback resiliente.
 */
export function cachedSource<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_CACHE_TTL_MS,
): () => Promise<T> {
  return async (): Promise<T> => {
    const now = Date.now();
    const entry = cacheStore.get(key) as CacheEntry<T> | undefined;

    // 1. Hit de cache válido
    if (entry && now < entry.expiresAt && entry.data !== null) {
      return entry.data;
    }

    // 2. Já existe uma requisição em voo: compartilha a promessa
    if (entry?.inflight) {
      return entry.inflight;
    }

    // 3. Dispara a busca com dedup
    const inflight = (async () => {
      try {
        const data = await fetcher();
        cacheStore.set(key, { data, expiresAt: now + ttlMs, inflight: null });
        return data;
      } catch (err) {
        // Se já tínhamos dados anteriores no cache, servimos stale em vez de quebrar a UI
        if (entry?.data !== null && entry?.data !== undefined) {
          console.warn(`[PartiuCache] Falha ao atualizar ${key} — servindo dados em cache anteriores.`);
          cacheStore.set(key, { data: entry.data, expiresAt: now + 30_000, inflight: null });
          return entry.data;
        }
        cacheStore.delete(key);
        throw err;
      }
    })();

    cacheStore.set(key, {
      data: entry?.data ?? null,
      expiresAt: entry?.expiresAt ?? 0,
      inflight,
    } as CacheEntry<unknown>);

    evictIfNeeded();
    return inflight;
  };
}

/** Limpa todo o cache em memória (útil para testes unitários ou logout) */
export function clearSourceCache(): void {
  cacheStore.clear();
}
