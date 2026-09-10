/**
 * ==============================================================================
 * 🔑 CRYPTOGRAPHIC KEY LIFECYCLE & ROTATION MANAGER (ED25519) — 100% CLIENT-SAFE
 * ATENÇÃO: ESTE MÓDULO É 100% SEGURO PARA O CLIENT / BUNDLE DO NAVEGADOR.
 * ELE GERENCIA APENAS CHAVES PÚBLICAS E POLÍTICA DE ROTAÇÃO N / N-1.
 * ==============================================================================
 */
import crypto from "crypto";
import {
  ACTIVE_KEY_ID,
  ACTIVE_PUBLIC_KEY,
  REVOKED_OLD_KEY_ID,
  REVOKED_OLD_PUBLIC_KEY,
} from "./public-key-registry";

export type KeyStatus = "ACTIVE" | "ROTATED" | "REVOKED";

export interface CryptoKeyMetadata {
  keyId: string;
  version: string;
  algorithm: string;
  publicKey: string;
  status: KeyStatus;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string | undefined;
}

const K1_PUB = REVOKED_OLD_PUBLIC_KEY;
const K2_PUB = ACTIVE_PUBLIC_KEY;

// Repositório de Metadados e Chaves Públicas do Sistema (Client-Safe)
const KEY_STORE = new Map<string, CryptoKeyMetadata>([
  [
    REVOKED_OLD_KEY_ID,
    {
      keyId: "key_partiu_v1_leaked",
      version: REVOKED_OLD_KEY_ID,
      algorithm: "Ed25519",
      publicKey: K1_PUB,
      status: "REVOKED", // Chave revogada por exposição anterior
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2027-01-01T00:00:00.000Z",
      revokedAt: "2026-09-02T22:00:00.000Z",
    },
  ],
  [
    ACTIVE_KEY_ID,
    {
      keyId: "key_partiu_v3_active",
      version: ACTIVE_KEY_ID,
      algorithm: "Ed25519",
      publicKey: K2_PUB,
      status: "ACTIVE", // Versão N (Canônica atual)
      issuedAt: "2026-09-02T22:00:00.000Z",
      expiresAt: "2027-09-02T22:00:00.000Z",
    },
  ],
  [
    "v0-compromised-2026",
    {
      keyId: "key_partiu_v0_compromised",
      version: "v0-compromised-2026",
      algorithm: "Ed25519",
      publicKey: K1_PUB,
      status: "REVOKED",
      issuedAt: "2025-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:00:00.000Z",
      revokedAt: "2026-02-01T12:00:00.000Z",
    },
  ],
]);

export function getActiveKey(): CryptoKeyMetadata {
  const active = Array.from(KEY_STORE.values()).find((k) => k.status === "ACTIVE");
  if (!active) {
    throw new Error("CRITICAL SECURITY ERROR: Nenhuma chave ativa encontrada no KeyStore.");
  }
  return active;
}

export function getKeyByVersion(version: string): CryptoKeyMetadata | null {
  return KEY_STORE.get(version) || null;
}

/**
 * Assinatura restrita ao servidor.
 */
export function signPayloadWithActiveKey(_rawPayload: string): {
  signature: string;
  keyVersion: string;
} {
  throw new Error(
    "[SecurityConstraint] Assinatura com chave ativa é exclusiva do servidor via signing-key-provider.server.",
  );
}

/**
 * Validação com suporte a coexistência de chaves (N e N-1) via Ed25519
 */
export function verifySignatureWithKeyRotation(
  rawPayload: string,
  signature: string,
  keyVersion: string,
): {
  valid: boolean;
  reason?: string | undefined;
} {
  const keyMeta = getKeyByVersion(keyVersion);

  if (!keyMeta) {
    return {
      valid: false,
      reason: `Chave criptográfica versão '${keyVersion}' é desconhecida ou não registrada.`,
    };
  }

  // Se a chave foi revogada (ex: comprometimento da chave legada), rejeita sumariamente
  if (keyMeta.status === "REVOKED") {
    return {
      valid: false,
      reason: `ALERTA DE SEGURANÇA: Chave versão '${keyVersion}' foi REVOGADA por razões de segurança.`,
    };
  }

  // Verifica expiração
  const now = new Date().toISOString();
  if (now > keyMeta.expiresAt) {
    return {
      valid: false,
      reason: `Chave criptográfica versão '${keyVersion}' expirou em ${keyMeta.expiresAt}.`,
    };
  }

  // Validação criptográfica com chave pública
  try {
    if (!signature.startsWith("ED25519_")) {
      return { valid: false, reason: "Formato de assinatura inválido (esperado prefixo ED25519_)" };
    }
    const sigHex = signature.replace("ED25519_", "");
    const sigBuffer = Buffer.from(sigHex, "hex");
    const dataBuffer = Buffer.from(rawPayload, "utf-8");

    const valid = crypto.verify(null, dataBuffer, keyMeta.publicKey, sigBuffer);
    if (!valid) {
      return { valid: false, reason: "Assinatura digital não confere com o payload apresentado." };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `Erro criptográfico na verificação: ${err?.message}` };
  }
}
