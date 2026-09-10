/**
 * ==============================================================================
 * 📜 PARTIU STRUCTURED JSON LOGGER (v3.3)
 * Logs Estruturados, Mascaramento de Dados Sensíveis e Rastreabilidade por Correlation ID
 * ==============================================================================
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogContext {
  service?: string | undefined;
  environment?: string | undefined;
  requestId?: string | undefined;
  correlationId?: string | undefined;
  tenantId?: string | undefined;
  userId?: string | undefined;
  deviceId?: string | undefined;
  durationMs?: number | undefined;
  errorCode?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

const SENSITIVE_KEYS = [
  "password",
  "senha",
  "token",
  "secret",
  "privatekey",
  "private_key",
  "cvv",
  "cardnumber",
  "card_number",
  "bearer",
  "authorization",
];

function maskSensitiveData(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      masked[key] = "***MASKED_SENSITIVE_DATA***";
    } else if (typeof value === "object" && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

export class StructuredLogger {
  private serviceName: string;
  private environment: string;

  constructor(serviceName: string = "partiu-core", environment: string = "production") {
    this.serviceName = serviceName;
    this.environment = environment;
  }

  private log(level: LogLevel, event: string, context?: LogContext) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: context?.service || this.serviceName,
      environment: context?.environment || this.environment,
      event,
      requestId: context?.requestId,
      correlationId: context?.correlationId,
      tenantId: context?.tenantId,
      userId: context?.userId,
      deviceId: context?.deviceId,
      durationMs: context?.durationMs,
      errorCode: context?.errorCode,
      metadata: context?.metadata ? maskSensitiveData(context.metadata) : undefined,
    };

    const jsonString = JSON.stringify(entry);
    if (level === "ERROR") {
      console.error(jsonString);
    } else if (level === "WARN") {
      console.warn(jsonString);
    } else {
      console.log(jsonString);
    }
    return entry;
  }

  info(event: string, context?: LogContext) {
    return this.log("INFO", event, context);
  }

  warn(event: string, context?: LogContext) {
    return this.log("WARN", event, context);
  }

  error(event: string, context?: LogContext) {
    return this.log("ERROR", event, context);
  }

  debug(event: string, context?: LogContext) {
    return this.log("DEBUG", event, context);
  }
}

export const appLogger = new StructuredLogger("partiu-app", "production");

/**
 * Substituto seguro para `catch {}` silencioso.
 * Loga o erro de forma estruturada sem interromper o fluxo.
 * Uso: `} catch (err) { silentCatchWarn("contexto", err); }`
 *
 * AUDIT FIX (CRIT-003): Empty catch blocks swallow errors silently,
 * making production troubleshooting impossible.
 */
export function silentCatchWarn(context: string, err?: unknown): void {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "unknown error";
  appLogger.warn(`silent-catch:${context}`, {
    errorCode: "SILENT_CATCH",
    metadata: { originalError: message },
  });
}
