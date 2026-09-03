/**
 * ==============================================================================
 * 🛡️ PUBLIC KEY REGISTRY (RFC 8032 - ED25519) — 100% CLIENT-SAFE
 * ESTE ARQUIVO CONTÉM APENAS CHAVES PÚBLICAS E IDENTIFICADORES DE VERSÃO.
 * NUNCA CONTÉM NENHUMA CHAVE PRIVADA. SEGURO PARA BUNDLES CLIENT-SIDE.
 * ==============================================================================
 */

export const REVOKED_OLD_KEY_ID = "v1-ed25519-leaked-legacy";
export const REVOKED_OLD_PUBLIC_KEY =
  "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAfxR8i9cW+VpGqf7X3l0K+YfA8BqI1XqEw7F1bA3g8Z0=\n-----END PUBLIC KEY-----\n";

export const ACTIVE_KEY_ID = "v3-ed25519-prod-2026";
export const ACTIVE_PUBLIC_KEY =
  "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAzMTGVZD2GPRp8v9m2kthwctyLvU4pWWqVTZvP+K/Wsc=\n-----END PUBLIC KEY-----\n";
