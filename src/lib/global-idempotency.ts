/**
 * ==============================================================================
 * 🛡️ PARTIU GLOBAL IDEMPOTENCY ENGINE (v4.0)
 * Prevenção Estrita de Duplicação e Atomic Lock Multi-Entidade
 * ==============================================================================
 */

import { DomainError, createDomainError } from "./domain-contracts";

export type CriticalDomainCommand =
  | "START_TRIP"
  | "END_TRIP"
  | "CANCEL_TRIP"
  | "CREATE_TICKET"
  | "VALIDATE_TICKET"
  | "BOARD_PASSENGER"
  | "CREATE_PAYMENT"
  | "CONFIRM_PAYMENT"
  | "REFUND_PAYMENT"
  | "CREATE_SETTLEMENT"
  | "SYNC_OFFLINE_EVENT"
  | "REGISTER_TELEMETRY"
  | "SEND_SOS"
  | "CREATE_INCIDENT"
  | "CREATE_ROUTE"
  | "DISPATCH_TASK"
  | "DISPATCH_VEHICLE";

export type IdempotencyStatus = "IN_FLIGHT" | "COMMITTED" | "REJECTED";

export interface IdempotencyRecord<T = unknown> {
  idempotencyKey: string;
  command: CriticalDomainCommand;
  actorId: string;
  tenantId: string;
  requestId: string;
  correlationId: string;
  requestHash: string;
  status: IdempotencyStatus;
  resultPayload?: T | undefined;
  error?: DomainError | undefined;
  createdAt: string;
  committedAt?: string | undefined;
  expiresAt: string;
}

import crypto from "crypto";
import { supabase } from "@/integrations/supabase/client";
import { silentCatchWarn } from "@/lib/structured-logger";


const LOCAL_FALLBACK_STORE = new Map<string, IdempotencyRecord>();
const DEFAULT_EXPIRATION_HOURS = 24;

export function calculatePayloadHash(payload: unknown): string {
  if (!payload) return "sha256_empty_payload";
  const str = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHash("sha256").update(str).digest("hex");
}

export async function getIdempotencyRecord<T>(key: string): Promise<IdempotencyRecord<T> | null> {
  // 1. Tentar consultar no PostgreSQL
  try {
    const { data, error } = await supabase
      .from("idempotency_keys")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (!error && data) {
      if (new Date(data.expires_at).getTime() < Date.now()) {
        return null;
      }
      return {
        idempotencyKey: data.key,
        command: data.command as CriticalDomainCommand,
        actorId: data.actor_id || "",
        tenantId: "DEFAULT_TENANT",
        requestId: "db_req",
        correlationId: "db_corr",
        requestHash: data.request_hash,
        status: data.status as IdempotencyStatus,
        resultPayload: (data.response_payload as T) ?? undefined,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
      };
    }
  } catch (err) { silentCatchWarn("global-idempotency", err); }

  // 2. Fallback local em memória
  const record = LOCAL_FALLBACK_STORE.get(key);
  if (!record) return null;
  if (Date.now() > new Date(record.expiresAt).getTime()) {
    LOCAL_FALLBACK_STORE.delete(key);
    return null;
  }
  return record as IdempotencyRecord<T>;
}

export async function executeWithIdempotency<T>(
  idempotencyKey: string,
  command: CriticalDomainCommand,
  actorId: string,
  tenantId: string,
  correlationId: string,
  executor: () => Promise<T>,
  requestPayload?: unknown,
): Promise<{ executed: boolean; duplicate: boolean; result: T }> {
  const incomingHash = calculatePayloadHash(requestPayload);
  const existing = await getIdempotencyRecord<T>(idempotencyKey);

  if (existing) {
    // 1. Validar se a mesma chave foi enviada com payload diferente (Hash Mismatch)
    if (existing.requestHash !== incomingHash) {
      throw createDomainError(
        "IDEMPOTENCY_CONFLICT",
        `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST: A chave '${idempotencyKey}' já foi utilizada com parâmetros diferentes.`,
        { idempotencyKey, originalHash: existing.requestHash, newHash: incomingHash },
      );
    }

    if (existing.status === "COMMITTED" && existing.resultPayload !== undefined) {
      return {
        executed: false,
        duplicate: true,
        result: existing.resultPayload,
      };
    }

    if (existing.status === "IN_FLIGHT") {
      throw createDomainError(
        "IDEMPOTENCY_CONFLICT",
        `Operação '${command}' com chave '${idempotencyKey}' já está em processamento concorrente.`,
      );
    }
  }

  const agora = new Date();
  const expires = new Date(agora.getTime() + DEFAULT_EXPIRATION_HOURS * 3600 * 1000);
  const requestId = "req_" + crypto.randomUUID();

  const record: IdempotencyRecord<T> = {
    idempotencyKey,
    command,
    actorId,
    tenantId,
    requestId,
    correlationId,
    requestHash: incomingHash,
    status: "IN_FLIGHT",
    createdAt: agora.toISOString(),
    expiresAt: expires.toISOString(),
  };

  LOCAL_FALLBACK_STORE.set(idempotencyKey, record as IdempotencyRecord<unknown>);

  // Tentar registrar IN_FLIGHT no PostgreSQL
  try {
    await supabase.from("idempotency_keys").upsert({
      key: idempotencyKey,
      request_hash: incomingHash,
      actor_id: actorId,
      command,
      status: "IN_FLIGHT",
      expires_at: expires.toISOString(),
    });
  } catch (err) { silentCatchWarn("global-idempotency", err); }

  try {
    const result = await executor();

    record.status = "COMMITTED";
    record.resultPayload = result;
    record.committedAt = new Date().toISOString();
    LOCAL_FALLBACK_STORE.set(idempotencyKey, record as IdempotencyRecord<unknown>);

    // Atualizar resultado no PostgreSQL
    try {
      await supabase
        .from("idempotency_keys")
        .update({
          status: "COMMITTED",
          response_payload: (result as any) ?? null,
        })
        .eq("key", idempotencyKey);
    } catch (err) { silentCatchWarn("global-idempotency", err); }

    return { executed: true, duplicate: false, result };
  } catch (err) {
    record.status = "REJECTED";
    LOCAL_FALLBACK_STORE.set(idempotencyKey, record as IdempotencyRecord<unknown>);

    try {
      await supabase
        .from("idempotency_keys")
        .update({
          status: "REJECTED",
        })
        .eq("key", idempotencyKey);
    } catch (err) { silentCatchWarn("global-idempotency", err); }

    throw err;
  }
}

export function resetIdempotencyStore(): void {
  LOCAL_FALLBACK_STORE.clear();
}
