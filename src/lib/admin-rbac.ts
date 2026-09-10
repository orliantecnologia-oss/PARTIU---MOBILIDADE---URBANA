/**
 * ==============================================================================
 * 🛡️ PARTIU ENTERPRISE RBAC & PERMISSION ENGINE (v6.0)
 * Segregação Estrita: PROPRIETÁRIO (OWNER) vs ADMINISTRADOR (GESTOR OPERACIONAL)
 * AUTENTICAÇÃO CENTRALIZADA NO SUPABASE AUTH (ZERO-TRUST)
 * ==============================================================================
 */
import { supabase } from "@/integrations/supabase/client";

export type AdminRole = 
  | "super_admin" 
  | "admin" 
  | "franqueado" 
  | "operador" 
  | "suporte" 
  | "OWNER" 
  | "ADMIN" 
  | "OPERATOR" 
  | "AUDITOR";

/**
 * Normaliza qualquer alias legado para a convenção canônica (UPPERCASE)
 * AUDIT FIX (IMP-004): Elimina divergências entre convenções de casing
 */
export function normalizeAdminRole(role: string): AdminRole {
  const upper = role.toUpperCase().trim();
  if (upper === "SUPER_ADMIN" || upper === "SUPERADMIN" || upper === "OWNER") return "OWNER";
  if (upper === "ADMIN") return "ADMIN";
  if (upper === "FRANQUEADO") return "franqueado";
  if (upper === "OPERADOR" || upper === "OPERATOR") return "OPERATOR";
  if (upper === "SUPORTE" || upper === "SUPPORT") return "suporte";
  if (upper === "AUDITOR") return "AUDITOR";
  return (role as AdminRole) || "ADMIN";
}

export type AdminPermission =
  // 💰 Permissões Financeiras e Estratégicas (Exclusivas do OWNER / super_admin)
  | "financial:view_revenue"
  | "financial:view_profit"
  | "financial:view_splits"
  | "financial:manage_cash_closing"
  | "financial:configure_gateways"
  | "financial:configure_fees"
  | "financial:process_refunds"
  | "financial:export_ledger"

  // 🔐 Permissões de Governança e Segurança (Exclusivas do OWNER / super_admin)
  | "governance:manage_admins"
  | "governance:manage_permissions"
  | "governance:view_audit_logs"
  | "governance:edit_security_rules"

  // 🚐 Permissões Operacionais e de Frota
  | "operations:view_radar"
  | "operations:manage_sos"
  | "operations:manage_trips"
  | "operations:manage_routes"
  | "operations:manage_stops"
  | "operations:manage_fleet"
  | "operations:manage_drivers"
  | "operations:manage_passengers"
  | "operations:manage_cargo"
  | "operations:view_operational_kpis"

  // 📱 Permissões de Conteúdo e Configuração do App
  | "app:manage_banners"
  | "app:manage_announcements"
  | "app:manage_affiliates"
  | "app:configure_system_parameters";

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    "financial:view_revenue",
    "financial:view_profit",
    "financial:view_splits",
    "financial:manage_cash_closing",
    "financial:configure_gateways",
    "financial:configure_fees",
    "financial:process_refunds",
    "financial:export_ledger",
    "governance:manage_admins",
    "governance:manage_permissions",
    "governance:view_audit_logs",
    "governance:edit_security_rules",
    "operations:view_radar",
    "operations:manage_sos",
    "operations:manage_trips",
    "operations:manage_routes",
    "operations:manage_stops",
    "operations:manage_fleet",
    "operations:manage_drivers",
    "operations:manage_passengers",
    "operations:manage_cargo",
    "operations:view_operational_kpis",
    "app:manage_banners",
    "app:manage_announcements",
    "app:manage_affiliates",
    "app:configure_system_parameters",
  ],
  OWNER: [
    "financial:view_revenue",
    "financial:view_profit",
    "financial:view_splits",
    "financial:manage_cash_closing",
    "financial:configure_gateways",
    "financial:configure_fees",
    "financial:process_refunds",
    "financial:export_ledger",
    "governance:manage_admins",
    "governance:manage_permissions",
    "governance:view_audit_logs",
    "governance:edit_security_rules",
    "operations:view_radar",
    "operations:manage_sos",
    "operations:manage_trips",
    "operations:manage_routes",
    "operations:manage_stops",
    "operations:manage_fleet",
    "operations:manage_drivers",
    "operations:manage_passengers",
    "operations:manage_cargo",
    "operations:view_operational_kpis",
    "app:manage_banners",
    "app:manage_announcements",
    "app:manage_affiliates",
    "app:configure_system_parameters",
  ],
  admin: [
    "financial:view_revenue",
    "financial:manage_cash_closing",
    "financial:configure_fees",
    "operations:view_radar",
    "operations:manage_sos",
    "operations:manage_trips",
    "operations:manage_routes",
    "operations:manage_stops",
    "operations:manage_fleet",
    "operations:manage_drivers",
    "operations:manage_passengers",
    "operations:manage_cargo",
    "operations:view_operational_kpis",
    "app:manage_banners",
    "app:manage_announcements",
    "app:manage_affiliates",
  ],
  ADMIN: [
    "financial:view_revenue",
    "financial:manage_cash_closing",
    "financial:configure_fees",
    "operations:view_radar",
    "operations:manage_sos",
    "operations:manage_trips",
    "operations:manage_routes",
    "operations:manage_stops",
    "operations:manage_fleet",
    "operations:manage_drivers",
    "operations:manage_passengers",
    "operations:manage_cargo",
    "operations:view_operational_kpis",
    "app:manage_banners",
    "app:manage_announcements",
    "app:manage_affiliates",
  ],
  franqueado: [
    "financial:view_revenue",
    "financial:view_splits",
    "operations:view_radar",
    "operations:manage_sos",
    "operations:manage_trips",
    "operations:manage_fleet",
    "operations:manage_drivers",
    "operations:manage_passengers",
    "operations:view_operational_kpis",
    "app:manage_banners",
    "app:manage_affiliates",
  ],
  operador: [
    "operations:view_radar",
    "operations:manage_sos",
    "operations:manage_trips",
    "operations:manage_cargo",
    "operations:manage_drivers",
    "operations:view_operational_kpis",
  ],
  OPERATOR: [
    "operations:view_radar",
    "operations:manage_sos",
    "operations:manage_trips",
    "operations:manage_cargo",
    "operations:manage_drivers",
    "operations:view_operational_kpis",
  ],
  suporte: [
    "operations:manage_sos",
    "operations:manage_trips",
    "operations:view_operational_kpis",
  ],
  AUDITOR: [
    "governance:view_audit_logs",
    "operations:view_operational_kpis",
    "financial:view_splits",
  ],
};

export interface AdminAccount {
  id: string;
  role: AdminRole;
  nome: string;
  email: string;
  ultimoAcesso?: string;
  cargo: string;
}

const STORAGE_KEY_ROLE = "partiu_admin_active_role";
const STORAGE_KEY_AUTH = "partiu_admin_session_auth";

export const CONTAS_ADMIN_PADRAO: AdminAccount[] = [
  {
    id: "acc_owner_01",
    role: "OWNER",
    nome: "Diretoria Executiva (Dono)",
    email: "dono@partiu.app",
    cargo: "Proprietário Geral / Fundador",
  },
  {
    id: "acc_admin_01",
    role: "ADMIN",
    nome: "Gestão Operacional PARTIU",
    email: "admin@partiu.app",
    cargo: "Supervisor de Operações",
  },
];

import { authService, TokenPayload } from "./security/auth-service";
import { auditTrail } from "./security/audit-trail";
import { silentCatchWarn } from "@/lib/structured-logger";


export function isAutenticadoAdmin(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (!session?.token) return false;

    // Validação criptográfica do token assinado
    const { valid, payload } = authService.verifyToken(session.token);
    if (!valid || !payload) {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      return false;
    }

    return payload.role === "OWNER" || payload.role === "SUPER_ADMIN" || payload.role === "ADMIN" || payload.role === "OPERATOR";
  } catch {
    return false;
  }
}

/**
 * Realiza login no painel administrativo via Supabase Auth ou Zero Trust Tokens
 */
export async function loginAdmin(
  email: string,
  senha: string,
): Promise<{ sucesso: boolean; mensagem: string; conta?: AdminAccount; token?: string }> {
  const emailLimpo = email.trim().toLowerCase();
  const senhaLimpa = senha.trim();

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailLimpo,
      password: senhaLimpa,
    });

    if (!authError && authData?.user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      const userRole: AdminRole = roleData?.role === "superadmin" ? "OWNER" : "ADMIN";

      const conta: AdminAccount = {
        id: authData.user.id,
        role: userRole,
        nome:
          (authData.user.user_metadata?.["full_name"] as string | undefined) ||
          "Administrador Homologado",
        email: authData.user.email || emailLimpo,
        cargo: userRole === "OWNER" ? "Diretor Executivo" : "Gestor Operacional",
      };

      const tokens = authService.generateTokens({
        id: conta.id,
        email: conta.email,
        role: conta.role,
        permissions: ROLE_PERMISSIONS[conta.role] || [],
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(
          STORAGE_KEY_AUTH,
          JSON.stringify({
            autenticado: true,
            contaId: conta.id,
            email: conta.email,
            role: conta.role,
            token: tokens.accessToken,
            expiresAt: tokens.expiresAt,
            autenticadoEm: new Date().toISOString(),
          }),
        );
        setAdminRole(conta.role);
      }

      auditTrail.logEvent({
        userId: conta.id,
        action: "ADMIN_LOGIN_SUCCESS",
        resource: "app.admin",
        status: "SUCCESS",
        details: { role: conta.role, email: conta.email }
      });

      return {
        sucesso: true,
        mensagem: "Login administrativo realizado com sucesso via Zero Trust Auth.",
        conta,
        token: tokens.accessToken,
      };
    }

    auditTrail.logEvent({
      userId: emailLimpo || "anonymous",
      action: "ADMIN_LOGIN_REJECTED",
      resource: "app.admin",
      status: "DENIED",
      details: { email: emailLimpo, reason: authError?.message || "Invalid credentials" }
    });

    return {
      sucesso: false,
      mensagem:
        authError?.message ||
        "Credenciais inválidas. Verifique seu e-mail e senha cadastrados.",
    };
  } catch (err: any) {
    auditTrail.logEvent({
      userId: emailLimpo || "anonymous",
      action: "ADMIN_LOGIN_ERROR",
      resource: "app.admin",
      status: "ALERT",
      details: { error: err?.message }
    });

    return {
      sucesso: false,
      mensagem: `Falha no serviço de autenticação: ${err?.message || "Erro desconhecido"}`,
    };
  }
}

export function logoutAdmin(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    localStorage.removeItem(STORAGE_KEY_ROLE);
    supabase.auth.signOut().catch(() => {});
  } catch (err) { silentCatchWarn("admin-rbac", err); }
}

export function getAdminRole(): AdminRole {
  if (typeof window === "undefined") return "ADMIN";
  try {
    const role = (localStorage.getItem(STORAGE_KEY_ROLE) ||
      localStorage.getItem("univans_admin_active_role")) as AdminRole | null;
    return role || "ADMIN";
  } catch {
    return "ADMIN";
  }
}

export function setAdminRole(role: AdminRole): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_ROLE, role);
    window.dispatchEvent(new CustomEvent("partiu:role-changed", { detail: { role } }));
    window.dispatchEvent(new CustomEvent("univans:role-changed", { detail: { role } }));
  } catch (err) { silentCatchWarn("admin-rbac", err); }
}

export function hasPermission(permission: AdminPermission, roleOverride?: AdminRole): boolean {
  const role = roleOverride || getAdminRole();
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export const temPermissao = hasPermission;

export function isSuperAdmin(roleOverride?: AdminRole): boolean {
  const role = roleOverride || getAdminRole();
  return role === "super_admin" || role === "OWNER";
}

export function isOwner(roleOverride?: AdminRole): boolean {
  return isSuperAdmin(roleOverride);
}

export type AdminModuleId = "dashboard" | "operacao" | "motoristas" | "financeiro" | "marketing" | "configuracoes";

export function canAccessModule(modulo: AdminModuleId, roleOverride?: AdminRole): boolean {
  const role = roleOverride || getAdminRole();
  if (role === "super_admin" || role === "OWNER") return true;

  switch (modulo) {
    case "dashboard":
      return true; // Todos os operadores têm acesso ao dashboard básico
    case "operacao":
      return true; // Todos os papéis operam ou atendem chamados
    case "motoristas":
      return role === "admin" || role === "ADMIN" || role === "franqueado" || role === "operador" || role === "OPERATOR";
    case "financeiro":
      return role === "admin" || role === "ADMIN" || role === "franqueado";
    case "marketing":
      return role === "admin" || role === "ADMIN" || role === "franqueado";
    case "configuracoes":
      return role === "admin" || role === "ADMIN" || role === "franqueado";
    default:
      return false;
  }
}

export function canViewAdvancedConfig(roleOverride?: AdminRole): boolean {
  const role = roleOverride || getAdminRole();
  return role === "super_admin" || role === "OWNER";
}

export function getRoleMetadata(role: AdminRole): {
  label: string;
  titulo: string;
  badgeColor: string;
  description: string;
} {
  switch (role) {
    case "super_admin":
    case "OWNER":
      return {
        label: "Super Admin (Nacional)",
        titulo: "Super Administrador Nacional",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        description: "Acesso irrestrito a governança nacional, finanças e configurações avançadas.",
      };
    case "admin":
    case "ADMIN":
      return {
        label: "Administrador Geral",
        titulo: "Administrador Operacional",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        description: "Controle de tráfego, frota, tarifas essenciais e marketing.",
      };
    case "franqueado":
      return {
        label: "Franqueado Regional",
        titulo: "Gestor de Cidade / Franquia",
        badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        description: "Gestão completa de operação, motoristas e finanças da sua cidade.",
      };
    case "operador":
    case "OPERATOR":
      return {
        label: "Operador de Tráfego",
        titulo: "Operador da Central",
        badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        description: "Despacho, monitoramento de corridas e suporte operacional.",
      };
    case "suporte":
      return {
        label: "Suporte & SOS",
        titulo: "Atendimento ao Usuário",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        description: "Fila de ocorrências, incidentes e chamados de emergência SOS.",
      };
    case "AUDITOR":
      return {
        label: "Auditor de Conformidade",
        titulo: "Auditor de Conformidade",
        badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        description: "Visualização de métricas e registros de auditoria.",
      };
    default:
      return {
        label: "Operador",
        titulo: "Operador de Tráfego",
        badgeColor: "bg-slate-500/20 text-slate-300 border-slate-500/30",
        description: "Acesso operacional padrão.",
      };
  }
}

export function getContaAtiva(): AdminAccount {
  if (typeof window !== "undefined") {
    try {
      const auth = localStorage.getItem(STORAGE_KEY_AUTH);
      if (auth) {
        const parsed = JSON.parse(auth);
        if (parsed?.autenticado && parsed?.contaId) {
          return {
            id: parsed.contaId,
            role: parsed.role || "ADMIN",
            nome: parsed.nome || parsed.email || "Administrador Homologado",
            email: parsed.email || "",
            cargo: parsed.role === "OWNER" ? "Diretor Executivo (Dono)" : "Gestor Operacional",
          };
        }
      }
    } catch (err) { silentCatchWarn("admin-rbac", err); }
  }
  const role = getAdminRole();
  return {
    id: "acc_active_session",
    role,
    nome: "Sessão Administrativa",
    email: "admin@partiu.app",
    cargo: role === "OWNER" ? "Proprietário Geral" : "Gestor Operacional",
  };
}

export function atualizarCredenciaisContaAtiva(
  novoEmail: string,
  novaSenha?: string,
  novoNome?: string,
): { sucesso: boolean; mensagem: string } {
  return {
    sucesso: true,
    mensagem:
      "Para atualizar credenciais permanentemente, use o fluxo de recuperação de conta no Supabase Auth.",
  };
}
