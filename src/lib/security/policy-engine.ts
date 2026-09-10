/**
 * PARTIU TITANIUM SHIELD — POLICY ENGINE (ABAC / CONTEXTUAL ACCESS CONTROL)
 * 
 * Avaliador de políticas com isolamento multi-tenant por praça/franquia.
 * Garante que administradores de uma franquia não acessem dados de outras cidades.
 */

import { AdminRole, AdminPermission } from './auth-service';
import { RoleService } from './role-service';

export interface SecurityContext {
  userId: string;
  role: AdminRole;
  tenantCityId?: string | undefined;
  permissions: AdminPermission[];
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface AccessEvaluationRequest {
  permission: AdminPermission;
  targetCityId?: string | undefined;
  resourceOwnerId?: string | undefined;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason: string;
  auditRequired: boolean;
}

export class PolicyEngine {
  /**
   * Avalia se uma requisição é permitida com base no contexto do usuário e escopo municipal
   */
  public static evaluate(
    context: SecurityContext,
    request: AccessEvaluationRequest
  ): PolicyEvaluationResult {
    // 1. OWNER possui acesso irrestrito global
    if (context.role === 'OWNER') {
      return { allowed: true, reason: 'OWNER_SUPERUSER_ACCESS', auditRequired: true };
    }

    // 2. Validação da permissão base no RBAC
    const hasBasePermission = RoleService.hasPermission(context.role, request.permission);
    if (!hasBasePermission) {
      return {
        allowed: false,
        reason: `ROLE_${context.role}_LACKS_PERMISSION_${request.permission}`,
        auditRequired: true
      };
    }

    // 3. Isolamento Multi-Tenant por Praça Municipal (Franchise Admin)
    if (context.role === 'FRANCHISE_ADMIN' && request.targetCityId) {
      if (!context.tenantCityId || context.tenantCityId !== request.targetCityId) {
        return {
          allowed: false,
          reason: 'CROSS_TENANT_BOUNDARY_VIOLATION: Franquia não autorizada nesta praça.',
          auditRequired: true
        };
      }
    }

    // 4. Isolamento Corporativo (Corporate Admin)
    if (context.role === 'CORPORATE_ADMIN' && request.resourceOwnerId) {
      if (context.userId !== request.resourceOwnerId) {
        return {
          allowed: false,
          reason: 'CORPORATE_TENANT_BOUNDARY_VIOLATION',
          auditRequired: true
        };
      }
    }

    return { allowed: true, reason: 'POLICY_EVALUATION_PASSED', auditRequired: false };
  }
}
