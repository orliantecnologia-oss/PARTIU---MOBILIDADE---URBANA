/**
 * ==============================================================================
 * ⚡ PARTIU CIRCUIT BREAKER & FAULT ISOLATION ENGINE (v4.0)
 * Proteção de Resiliência para Integrações Externas (PSP, SMS, Mapas, Starlink)
 * ==============================================================================
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeMs: number;
}

export class CircuitBreaker {
  public serviceName: string;
  public state: CircuitState = "CLOSED";
  public failureCount: number = 0;
  public lastFailureTime: number = 0;
  public failureThreshold: number;
  public recoveryTimeMs: number;

  constructor(serviceName: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.serviceName = serviceName;
    this.failureThreshold = options.failureThreshold || 3;
    this.recoveryTimeMs = options.recoveryTimeMs || 5000;
  }

  public async execute<T>(action: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const agora = Date.now();

    // 1. Se estiver OPEN, verificar se passou o tempo de recuperação para HALF_OPEN
    if (this.state === "OPEN") {
      if (agora - this.lastFailureTime > this.recoveryTimeMs) {
        this.state = "HALF_OPEN";
      } else {
        if (fallback) return fallback();
        throw new Error(
          `CIRCUIT_BREAKER_OPEN: O serviço '${this.serviceName}' está temporariamente indisponível.`,
        );
      }
    }

    try {
      const result = await action();
      // Sucesso: resetar falhas e fechar circuito
      this.failureCount = 0;
      this.state = "CLOSED";
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = agora;

      if (this.failureCount >= this.failureThreshold || this.state === "HALF_OPEN") {
        this.state = "OPEN";
      }

      if (fallback) return fallback();
      throw err;
    }
  }

  public reset() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

const REGISTRY = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  serviceName: string,
  options?: Partial<CircuitBreakerOptions>,
): CircuitBreaker {
  let cb = REGISTRY.get(serviceName);
  if (!cb) {
    cb = new CircuitBreaker(serviceName, options);
    REGISTRY.set(serviceName, cb);
  }
  return cb;
}

export function resetAllCircuitBreakers() {
  REGISTRY.forEach((cb) => cb.reset());
}

/**
 * ==============================================================================
 * 🪣 BYTEBYTEGO TOKEN BUCKET RATE LIMITER (p. 26, 147)
 * Proteção do API Gateway / Endpoints Sensíveis contra Scraping e Negação de Serviço
 * ==============================================================================
 */
export interface TokenBucketOptions {
  capacity: number; // Capacidade máxima do balde
  refillRatePerSecond: number; // Taxa de reposição de tokens por segundo
}

export class TokenBucketRateLimiter {
  private capacity: number;
  private refillRate: number;
  private tokens: number;
  private lastRefillTimestamp: number;

  constructor(options: TokenBucketOptions = { capacity: 10, refillRatePerSecond: 2 }) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRatePerSecond;
    this.tokens = options.capacity;
    this.lastRefillTimestamp = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedTimeSeconds = (now - this.lastRefillTimestamp) / 1000;
    const tokensToAdd = elapsedTimeSeconds * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTimestamp = now;
  }

  public tryConsume(tokensRequested: number = 1): { allowed: boolean; remainingTokens: number } {
    this.refill();

    if (this.tokens >= tokensRequested) {
      this.tokens -= tokensRequested;
      return { allowed: true, remainingTokens: Math.floor(this.tokens) };
    }

    return { allowed: false, remainingTokens: Math.floor(this.tokens) };
  }

  public reset(): void {
    this.tokens = this.capacity;
    this.lastRefillTimestamp = Date.now();
  }
}

const RATE_LIMITER_REGISTRY = new Map<string, TokenBucketRateLimiter>();

export function getRateLimiter(
  key: string,
  options?: Partial<TokenBucketOptions>,
): TokenBucketRateLimiter {
  let limiter = RATE_LIMITER_REGISTRY.get(key);
  if (!limiter) {
    limiter = new TokenBucketRateLimiter({
      capacity: options?.capacity ?? 10,
      refillRatePerSecond: options?.refillRatePerSecond ?? 2,
    });
    RATE_LIMITER_REGISTRY.set(key, limiter);
  }
  return limiter;
}
