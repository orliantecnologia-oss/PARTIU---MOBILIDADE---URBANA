import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft, Lock, Crown } from "lucide-react";
import { temPermissao, getAdminRole, type AdminPermission } from "@/lib/admin-rbac";

interface GuardiaoAcessoProps {
  permissao?: AdminPermission;
  somenteOwner?: boolean;
  children: ReactNode;
}

/**
 * 🛡️ COMPONENTE GUARDIÃO DE ACESSO ADMINISTRATIVO (HTTP 403 INTERNO)
 * Bloqueia a renderização de componentes, abas ou páginas inteiras
 * quando o usuário ativo não tem a permissão ou é apenas Administrador tentando ver financeiro.
 */
export function GuardiaoAcesso({ permissao, somenteOwner = false, children }: GuardiaoAcessoProps) {
  const role = getAdminRole();

  const negadoPorOwner = somenteOwner && role !== "OWNER";
  const negadoPorPermissao = permissao ? !temPermissao(permissao) : false;

  if (negadoPorOwner || negadoPorPermissao) {
    return (
      <div className="w-full min-h-[550px] flex items-center justify-center p-6 animate-in fade-in">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border-2 border-slate-200 text-center shadow-xl space-y-5">
          <div className="h-16 w-16 rounded-2xl bg-primary-50 text-primary-700 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-primary-50 px-3 py-1 rounded-full border border-amber-200">
              Acesso Restrito ao Proprietário
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Área Financeira &amp; Estratégica Bloqueada
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Seu perfil atual de acesso é <strong>Administrador / Gestor Operacional</strong>.
              Informações de faturamento, splits contábeis, lucros e contas bancárias são restritas
              exclusivamente ao <strong>Proprietário (Owner)</strong> do sistema.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <ShieldAlert className="h-4 w-4 text-primary-700" />
              <span>Regra de Menor Privilégio Ativa</span>
            </div>
            <p className="text-[11px]">
              Tentativas de acesso direto por URL a recursos financeiros são registradas no log de
              auditoria da plataforma.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <Link
              to="/app/admin"
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
