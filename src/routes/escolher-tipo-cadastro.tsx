import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/escolher-tipo-cadastro")({
  head: () => ({
    meta: [
      { title: "Escolha seu Perfil | Pega a Van & UniVans" },
      {
        name: "description",
        content: "Acesse o sistema de vans intermunicipais como passageiro ou motorista parceiro.",
      },
    ],
  }),
  component: EscolherTipoCadastroPage,
});

export function EscolherTipoCadastroPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-[#f8faf9] flex flex-col justify-between p-2 sm:p-6 w-full pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      {/* Top Header com Voltar */}
      <div className="mx-auto w-full max-w-full sm:max-w-md flex items-center justify-between px-1 sm:px-0">
        <Link
          to="/"
          className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
          aria-label="Voltar para a página inicial"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-xs font-black uppercase tracking-wider text-[#0d5930]">
          Selecione seu Perfil
        </span>
        <div className="w-9" />
      </div>

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center py-2">
        {/* Logo e Título */}
        <div className="text-center mb-5">
          <div className="mx-auto flex h-14 w-auto items-center justify-center rounded-2xl bg-white p-2 border border-slate-200 shadow-md mb-2">
            <img
              src="/univans-logo.jpg"
              alt="UniVans Coop Alagoas"
              className="h-10 w-auto object-contain"
            />
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#0d5930] uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-[#e5a93c]" /> UniVans Coop Alagoas
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-0.5">Como deseja acessar?</h1>
          <p className="text-xs text-slate-500 mt-0.5">Selecione uma opção para continuar</p>
        </div>

        {/* Cards de Escolha de Perfil */}
        <div className="space-y-3">
          {/* Opção 1: Sou Passageiro */}
          <Link
            to="/cadastro-passageiro"
            className="group flex items-center gap-3.5 rounded-xl bg-white p-4 shadow-xs border border-slate-200/90 transition-all hover:border-[#0d5930] active:scale-[0.98] min-h-[68px] cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5930] transition-colors group-hover:bg-[#0d5930] group-hover:text-white">
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-black text-slate-900">Sou Passageiro</p>
              <p className="text-xs text-slate-500 font-medium">
                Encontrar rotas, horários e viajar
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-[#0d5930] transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Opção 2: Sou Motorista */}
          <Link
            to="/cadastro-motorista"
            className="group flex items-center gap-3.5 rounded-xl bg-white p-4 shadow-xs border border-slate-200/90 transition-all hover:border-[#0d5930] active:scale-[0.98] min-h-[68px] cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5930] transition-colors group-hover:bg-[#0d5930] group-hover:text-white">
              <Truck className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-black text-slate-900">Sou Motorista</p>
              <p className="text-xs text-slate-500 font-medium">Cadastrar van, horários e vagas</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-[#0d5930] transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Opção 3: Passe Livre Governamental (Gratuidade por Lei) */}
          <Link
            to="/cadastro-gratuidade"
            className="group flex items-center gap-3.5 rounded-xl bg-gradient-to-r from-emerald-50/90 to-amber-50/50 p-4 shadow-xs border-2 border-emerald-300 transition-all hover:border-[#0d5930] active:scale-[0.98] min-h-[68px] cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0d5930] text-white transition-colors group-hover:bg-[#147a44]">
              <ShieldCheck className="h-6 w-6 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm sm:text-base font-black text-slate-900">
                  Passe Livre Governamental
                </p>
                <span className="text-xs font-black uppercase text-[#0d5930] bg-emerald-100 px-2 py-0.5 rounded">
                  Lei 100% Gratuito
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Idosos 60+, PCD e Estudante CadÚnico (2 vagas/van)
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-[#0d5930] transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Opção 4: Acesso Direto aos Horários */}
          <Link
            to="/app/linhas"
            className="group flex items-center gap-3.5 rounded-xl bg-white p-4 shadow-xs border border-slate-200/90 transition-all hover:border-amber-500 active:scale-[0.98] min-h-[68px] cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-500 group-hover:text-white">
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-black text-slate-900">
                Consultar Horários & Linhas
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Ver próximas saídas e vagas livres
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Link de Entrada */}
        <div className="mt-5 text-center space-y-2">
          <Link
            to="/auth"
            search={{ redirect: "/app" }}
            className="inline-block text-xs font-black text-[#0d5930] hover:underline"
          >
            Já tem uma conta? Entrar no Sistema
          </Link>
        </div>
      </div>

      {/* Rodapé Operacional */}
      <div className="mx-auto w-full max-w-sm pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <Link to="/app/motorista" className="hover:text-slate-900 font-bold">
          Painel de Bordo
        </Link>
        <span>•</span>
        <Link to="/app/admin" className="hover:text-slate-900 font-bold">
          Painel Admin
        </Link>
        <span>•</span>
        <Link to="/app/sos" className="hover:text-rose-600 font-bold">
          SOS Emergência
        </Link>
      </div>
    </div>
  );
}
