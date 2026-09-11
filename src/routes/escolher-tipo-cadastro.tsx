import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Bike,
  Package,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/escolher-tipo-cadastro")({
  head: () => ({
    meta: [
      { title: "Como deseja se cadastrar? | PARTIU" },
      {
        name: "description",
        content:
          "Cadastre-se no PARTIU como passageiro para pedir corridas ou como motorista/entregador parceiro para faturar com seu veículo.",
      },
    ],
  }),
  component: EscolherTipoCadastroPage,
});

export function EscolherTipoCadastroPage() {
  return (
    <div className="min-h-[100dvh] bg-[#0b0f17] text-white flex flex-col justify-between p-4 sm:p-6 w-full pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      {/* Top Header */}
      <div className="mx-auto w-full max-w-md flex items-center justify-between">
        <Link
          to="/"
          className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 shadow-xs active:scale-95 transition-all cursor-pointer hover:text-white"
          aria-label="Voltar para o início"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-xs font-black uppercase tracking-wider text-[#0088FF]">
          Criar Nova Conta
        </span>
        <div className="w-11" />
      </div>

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center py-6">
        {/* Logo e Título */}
        <div className="text-center mb-7">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0088FF] text-slate-950 shadow-lg shadow-[#0088FF]/20 mb-3">
            <Zap className="h-7 w-7 fill-slate-950 stroke-[2.5]" />
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#0088FF] uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" /> PARTIU Mobilidade & Entregas
          </span>
          <h1 className="text-2xl font-black text-white mt-1">Como deseja usar o Partiu?</h1>
          <p className="text-xs text-slate-400 mt-1">
            Selecione uma modalidade para continuar seu cadastro
          </p>
        </div>

        {/* Cards de Opção */}
        <div className="space-y-3">
          {/* Opção 1: Sou Passageiro */}
          <Link
            to="/cadastro-passageiro"
            className="group flex items-center gap-4 rounded-2xl bg-slate-900/90 hover:bg-slate-900 p-4 border border-slate-800 hover:border-[#0088FF]/60 transition-all active:scale-[0.98] min-h-[76px] cursor-pointer shadow-lg"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0088FF] text-slate-950 font-black shadow-xs group-hover:scale-105 transition-transform">
              <Car className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-black text-white">Quero ser Passageiro</p>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Popular
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Chame carros ou motos com tarifa justa, PIN e rastreamento ao vivo.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-[#0088FF] transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Opção 2: Sou Motorista */}
          <Link
            to="/cadastro-motorista"
            className="group flex items-center gap-4 rounded-2xl bg-slate-900/90 hover:bg-slate-900 p-4 border border-slate-800 hover:border-[#0088FF]/60 transition-all active:scale-[0.98] min-h-[76px] cursor-pointer shadow-lg"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-600/20 text-primary-600 border border-primary-600/30 font-black shadow-xs group-hover:scale-105 transition-transform">
              <Car className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-white">Motorista Parceiro (Carro)</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Dirija com seu automóvel, fature no seu ritmo e receba via PIX D+0.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-[#0088FF] transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Opção 3: Sou Entregador ou Moto */}
          <Link
            to="/cadastro-motorista"
            className="group flex items-center gap-4 rounded-2xl bg-slate-900/90 hover:bg-slate-900 p-4 border border-slate-800 hover:border-[#0088FF]/60 transition-all active:scale-[0.98] min-h-[76px] cursor-pointer shadow-lg"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-black shadow-xs group-hover:scale-105 transition-transform">
              <Bike className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-black text-white">Partiu Moto & Entregador</p>
                <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Corridas rápidas de moto e entregas expressas de pacotes.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-[#0088FF] transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Link para Login */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Já possui uma conta ativa no PARTIU?{" "}
            <Link
              to="/auth"
              search={{ redirect: "/app" }}
              className="text-[#0088FF] font-black hover:underline ml-1"
            >
              Fazer Login
            </Link>
          </p>
        </div>
      </div>

      {/* Rodapé Operacional */}
      <div className="mx-auto w-full max-w-md pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
        <Link to="/app" className="hover:text-slate-300 font-bold">
          App Passageiro
        </Link>
        <span>•</span>
        <Link to="/app/motorista" className="hover:text-slate-300 font-bold">
          Cockpit Motorista
        </Link>
        <span>•</span>
        <Link to="/app/admin/login" className="hover:text-slate-300 font-bold">
          Admin
        </Link>
      </div>
    </div>
  );
}
