/**
 * ==============================================================================
 * 🏢 UNIVANS MULTI-TENANT SECURITY & ZERO-TRUST RLS GUARD ENGINE (v3.4)
 * Isolamento Criptográfico e Contratual de Dados entre Cooperativas
 * ==============================================================================
 */

import { DomainError, createDomainError } from "./domain-contracts";

export interface TenantSecurityContext {
  tenantId: string; // organization_id
  userId: string;
  role:
    | "SUPER_ADMIN"
    | "OWNER"
    | "ADMIN"
    | "DISPATCHER"
    | "SUPERVISOR"
    | "OPERATOR"
    | "DRIVER"
    | "FINANCE"
    | "AUDITOR";
  permissions: string[];
  correlationId: string;
}

export interface TenantScopedEntity {
  id: string;
  organizationId: string;
  [key: string]: unknown;
}

/**
 * Validador de Acesso Multi-Tenant (Zero-Trust)
 */
export function assertTenantAccess(
  context: TenantSecurityContext,
  targetEntityOrganizationId: string,
  operation: "READ" | "WRITE" | "DELETE" | "EXPORT" | "REALTIME",
): { allowed: boolean; error?: DomainError | undefined } {
  // 1. SuperAdmin possui acesso de governança global com trilha de auditoria
  if (context.role === "SUPER_ADMIN") {
    return { allowed: true };
  }

  // 2. Qualquer tentativa de acesso cruzado (Cross-Tenant Breakout) é bloqueada
  if (context.tenantId !== targetEntityOrganizationId) {
    return {
      allowed: false,
      error: createDomainError(
        "TENANT_ACCESS_DENIED",
        `ZERO-TRUST VIOLATION: Usuário do tenant '${context.tenantId}' tentou operação '${operation}' no recurso do tenant '${targetEntityOrganizationId}'.`,
        {
          requestingTenant: context.tenantId,
          targetTenant: targetEntityOrganizationId,
          operation,
        },
      ),
    };
  }

  return { allowed: true };
}

/**
 * Filtro rigoroso de consulta SQL / Memória para isolamento de dados
 */
export function filterByTenant<T extends TenantScopedEntity>(
  context: TenantSecurityContext,
  entities: T[],
): T[] {
  if (context.role === "SUPER_ADMIN") {
    return entities;
  }
  return entities.filter((e) => e.organizationId === context.tenantId);
}
