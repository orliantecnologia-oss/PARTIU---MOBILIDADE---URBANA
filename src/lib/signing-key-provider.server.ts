/**
 * ==============================================================================
 * 🔐 SERVER-SIDE SIGNING KEY PROVIDER (ED25519) — ENTERPRISE V6.0
 * ATENÇÃO: ESTE ARQUIVO NUNCA DEVE SER IMPORTADO NO BUNDLE CLIENT DO NAVEGADOR.
 * EXECUTA EXCLUSIVAMENTE NO NITRO SSR / CLOUDFLARE WORKERS / NODE.JS.
 * ==============================================================================
 */
import crypto from "node:crypto";
import {
  REVOKED_OLD_KEY_ID,
  REVOKED_OLD_PUBLIC_KEY,
  ACTIVE_KEY_ID,
  ACTIVE_PUBLIC_KEY,
} from "./public-key-registry";

export { REVOKED_OLD_KEY_ID, REVOKED_OLD_PUBLIC_KEY, ACTIVE_KEY_ID, ACTIVE_PUBLIC_KEY };

export interface SigningKeyRecord {
  keyId: string;
  version: number;
  algorithm: "Ed25519";
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  publicKeyPem: string;
  privateKeyPem?: string;
  createdAt: string;
  revokedAt?: string;
  revocationReason?: string;
}

// A chave privada deve ser prioritariamente injetada via variável de ambiente de servidor
const SERVER_PRIVATE_KEY_DEFAULT =
  "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIFTFL2D+pMEyz1gwkXm/m8MFXABakdbP0cDAfgr8SR++\n-----END PRIVATE KEY-----\n";

const KEY_REGISTRY: Record<string, SigningKeyRecord> = {
  [REVOKED_OLD_KEY_ID]: {
    keyId: REVOKED_OLD_KEY_ID,
    version: 1,
    algorithm: "Ed25519",
    status: "REVOKED",
    publicKeyPem: REVOKED_OLD_PUBLIC_KEY,
    createdAt: "2026-08-01T00:00:00.000Z",
    revokedAt: "2026-09-02T22:00:00.000Z",
    revocationReason: "CHAVE PRIVADA EXPOSTA EM BUNDLE CLIENT ANTERIOR — COMPROMETIDA",
  },
  [ACTIVE_KEY_ID]: {
    keyId: ACTIVE_KEY_ID,
    version: 3,
    algorithm: "Ed25519",
    status: "ACTIVE",
    publicKeyPem: ACTIVE_PUBLIC_KEY,
    privateKeyPem:
      (typeof process !== "undefined" && process.env?.["TICKET_SIGNING_PRIVATE_KEY"]) ||
      SERVER_PRIVATE_KEY_DEFAULT,
    createdAt: "2026-09-02T22:00:00.000Z",
  },
};

/**
 * Obtém a chave privada de assinatura ativa no servidor.
 * Rejeita qualquer chave revogada com erro inviolável.
 */
export function getActiveSigningKey(): { keyId: string; privateKeyPem: string } {
  const activeRecord = KEY_REGISTRY[ACTIVE_KEY_ID];
  if (!activeRecord || activeRecord.status !== "ACTIVE" || !activeRecord.privateKeyPem) {
    throw new Error(
      `[SecurityViolation] Chave ativa não encontrada ou inválida no registro seguro do servidor.`,
    );
  }

  return {
    keyId: activeRecord.keyId,
    privateKeyPem: activeRecord.privateKeyPem,
  };
}

/**
 * Verifica se um ID de chave está na lista de chaves revogadas
 */
export function isKeyRevoked(keyId: string): boolean {
  const record = KEY_REGISTRY[keyId];
  return record ? record.status === "REVOKED" : false;
}

/**
 * Assina payload usando o provedor de chaves do servidor (Ed25519)
 */
export function signPayloadWithActiveKey(rawPayload: string): {
  signature: string;
  keyVersion: string;
} {
  const { keyId, privateKeyPem } = getActiveSigningKey();
  const sig = crypto.sign(null, Buffer.from(rawPayload, "utf-8"), privateKeyPem);
  return {
    signature: "ED25519_" + sig.toString("hex"),
    keyVersion: keyId,
  };
}

/**
 * Assina payload bruto com Ed25519 exclusivamente no servidor
 */
export function assinarPayloadEd25519(payloadRaw: string): string {
  const { privateKeyPem } = getActiveSigningKey();
  const data = Buffer.from(payloadRaw, "utf-8");
  const signature = crypto.sign(null, data, privateKeyPem);
  return "ED25519_" + signature.toString("hex");
}
