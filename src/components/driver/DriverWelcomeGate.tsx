import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Car,
  Bike,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  DollarSign,
  TrendingUp,
  Clock,
  Navigation,
} from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";

interface DriverWelcomeGateProps {
  onEnterDemo: () => void;
}

export const DriverWelcomeGate: React.FC<DriverWelcomeGateProps> = ({ onEnterDemo }) => {
  const {
    nomeApp,
    corPrimaria,
    corSecundaria,
    corTextoPrimaria,
    corCabecalhoInicio,
    corCabecalhoFim,
  } = useBrandTheme();

  const brandGradient = `linear-gradient(135deg, var(--header-gradient-start, ${corCabecalhoInicio}) 0%, var(--header-gradient-end, ${corCabecalhoFim}) 100%)`;

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] font-sans animate-in fade-in duration-300">
      {/* Topo / Header com Identidade da Marca */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between pt-2">
        <Link
          to="/"
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition"
        >
          ← Início
        </Link>
        <span
          className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shadow-2xs"
          style={{
            backgroundColor: `${corPrimaria}20`,
            color: corPrimaria,
            borderColor: `${corPrimaria}40`,
          }}
        >
          Portal do Parceiro Oficial
        </span>
        <div className="w-12" />
      </header>

      {/* Conteúdo Central */}
      <main className="w-full max-w-md mx-auto space-y-6 py-6 my-auto">
        <div className="text-center space-y-2">
          <div
            className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center font-black text-2xl shadow-xl shadow-amber-500/10 mb-3"
            style={{ background: brandGradient, color: corTextoPrimaria }}
          >
            <Zap className="w-8 h-8 fill-current" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Dirija e Fature 100% no {nomeApp}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Seja dono do seu tempo. Ganhe mais com taxas justas e receba na hora via PIX D+0.
          </p>
        </div>

        {/* 4 Vantagens Estratégicas da Versão 2026 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>Até 100% Líquido</span>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-snug">
              Planos diários com 0% de comissão por corrida.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Zap className="w-4 h-4 shrink-0" />
              <span>Saque PIX D+0</span>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-snug">
              Dinheiro na sua conta imediatamente após a viagem.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Taxímetro de Rua</span>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-snug">
              Pegue passageiros na rua e cobre via QR Code PIX.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Segurança Máxima</span>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-snug">
              PIN de 4 dígitos e leitura de mensagens por voz.
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-2.5 pt-2">
          {/* Botão 1: Cadastrar */}
          <Link
            to="/cadastro-motorista"
            style={{ background: brandGradient, color: corTextoPrimaria }}
            className="w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-98 transition cursor-pointer"
          >
            <Car className="w-5 h-5" />
            <span>CADASTRAR MEU VEÍCULO (CARRO OU MOTO)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Botão 2: Fazer Login */}
          <Link
            to="/"
            className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
          >
            <span>Já sou parceiro cadastrado • Fazer Login</span>
          </Link>

          {/* Botão 3: Modo Demonstração */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onEnterDemo}
              className="w-full py-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Testar Cockpit em Modo Demonstração</span>
            </button>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Acesso instantâneo para testar radar, taxímetro e GPS
            </span>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="w-full max-w-md mx-auto text-center text-[10px] text-slate-500 pt-3 border-t border-slate-900">
        © 2026 {nomeApp} Mobilidade Urbana • Plataforma Oficial do Parceiro
      </footer>
    </div>
  );
};
