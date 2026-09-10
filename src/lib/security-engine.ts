/**
 * ==============================================================================
 * 🛡️ PARTIU RATE LIMITER & SECURITY ENGINE (v3.3)
 * Proteção contra Abuso de API, Brute-Force, Replay Attacks e OWASP Hardening
 * ==============================================================================
 */

import { DomainError, createDomainError } from "./domain-contracts";

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  "/api/v1/auth/login": { maxRequests: 5, windowSeconds: 60 },
  "/api/v1/auth/otp": { maxRequests: 3, windowSeconds: 60 },
  "/api/v1/payments/create": { maxRequests: 10, windowSeconds: 60 },
  "/api/v1/tickets/validate": { maxRequests: 60, windowSeconds: 60 },
  "/api/v1/telemetry/ingest": { maxRequests: 120, windowSeconds: 60 },
  "/api/v1/devices/provision": { maxRequests: 5, windowSeconds: 300 },
  default: { maxRequests: 100, windowSeconds: 60 },
};

// Histórico de requisições por chave (sliding window)
const RATE_LIMIT_CACHE = new Map<string, number[]>();

export function checkRateLimit(
  clientKey: string,
  endpoint: string = "default",
): {
  allowed: boolean;
  currentRequests: number;
  limit: number;
  retryAfterSeconds?: number | undefined;
  error?: DomainError | undefined;
} {
  const config = ENDPOINT_LIMITS[endpoint] || ENDPOINT_LIMITS["default"]!;
  const agora = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `${endpoint}:${clientKey}`;

  let timestamps = RATE_LIMIT_CACHE.get(key) || [];
  // Filtrar requisições fora da janela deslizante
  timestamps = timestamps.filter((t) => agora - t < windowMs);

  if (timestamps.length >= config.maxRequests) {
    const oldest = timestamps[0] || agora;
    const retryAfterSeconds = Math.ceil((oldest + windowMs - agora) / 1000);

    return {
      allowed: false,
      currentRequests: timestamps.length,
      limit: config.maxRequests,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
      error: createDomainError(
        "RATE_LIMITED",
        `Limite de requisições excedido para '${endpoint}'. Tente novamente em ${retryAfterSeconds}s.`,
        { retryAfterSeconds, limit: config.maxRequests },
      ),
    };
  }

  timestamps.push(agora);
  RATE_LIMIT_CACHE.set(key, timestamps);

  return {
    allowed: true,
    currentRequests: timestamps.length,
    limit: config.maxRequests,
  };
}

export function resetRateLimits() {
  RATE_LIMIT_CACHE.clear();
}
