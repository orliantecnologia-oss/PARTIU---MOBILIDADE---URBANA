import { silentCatchWarn } from "@/lib/structured-logger";

/**
 * ==============================================================================
 * ⚡ PARTIU HIGH-PERFORMANCE ROUTING CACHE (v4.0)
 * ==============================================================================
 * Armazenamento em dois níveis (LRU em Memória + LocalStorage com TTL)
 * para atingir resposta sub-50ms em cotações e simulações frequentes.
 *
 * Aplica deadband de arredondamento de coordenadas (~50m) para deduplicação
 * automática de requisições de mesma origem/destino.
 * ==============================================================================
 */

export interface CachedRouteData {
  metrics: any;
  timestamp: number;
}

const CACHE_STORAGE_KEY = "partiu_routing_cache_v4";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos de validade para rotas
const MAX_MEMORY_ITEMS = 200;

export class RoutingCache {
  private static instance: RoutingCache;
  private memoryMap = new Map<string, CachedRouteData>();

  private constructor() {
    this.restoreFromStorage();
  }

  public static getInstance(): RoutingCache {
    if (!RoutingCache.instance) {
      RoutingCache.instance = new RoutingCache();
    }
    return RoutingCache.instance;
  }

  /**
   * Gera uma chave determinística com deadband de 3 casas decimais (~50 metros)
   */
  public generateKey(origin: [number, number], destination: [number, number]): string {
    const oLng = origin[0].toFixed(3);
    const oLat = origin[1].toFixed(3);
    const dLng = destination[0].toFixed(3);
    const dLat = destination[1].toFixed(3);
    return `${oLng},${oLat}->${dLng},${dLat}`;
  }

  public get(origin: [number, number], destination: [number, number]): any | null {
    const key = this.generateKey(origin, destination);
    const entry = this.memoryMap.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.memoryMap.delete(key);
      return null;
    }

    // Move para o final para manter LRU
    this.memoryMap.delete(key);
    this.memoryMap.set(key, entry);
    return { ...entry.metrics, cached: true };
  }

  public set(origin: [number, number], destination: [number, number], metrics: any): void {
    const key = this.generateKey(origin, destination);
    const entry: CachedRouteData = {
      metrics,
      timestamp: Date.now(),
    };

    if (this.memoryMap.size >= MAX_MEMORY_ITEMS) {
      const oldestKey = this.memoryMap.keys().next().value;
      if (oldestKey) this.memoryMap.delete(oldestKey);
    }

    this.memoryMap.set(key, entry);
    this.persistToStorage();
  }

  public clear(): void {
    this.memoryMap.clear();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(CACHE_STORAGE_KEY);
      } catch (err) { silentCatchWarn("RoutingCache", err); }
    }
  }

  private restoreFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (raw) {
        const parsed: Record<string, CachedRouteData> = JSON.parse(raw);
        const now = Date.now();
        for (const [key, data] of Object.entries(parsed)) {
          if (now - data.timestamp < CACHE_TTL_MS) {
            this.memoryMap.set(key, data);
          }
        }
      }
    } catch (err) { silentCatchWarn("RoutingCache", err); }
  }

  private persistToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const obj: Record<string, CachedRouteData> = {};
      let count = 0;
      for (const [key, data] of this.memoryMap.entries()) {
        if (count++ > 50) break;
        obj[key] = data;
      }
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch (err) { silentCatchWarn("RoutingCache", err); }
  }
}

export const routingCache = RoutingCache.getInstance();
