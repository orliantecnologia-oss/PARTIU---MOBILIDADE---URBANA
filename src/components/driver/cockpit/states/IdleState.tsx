import { Power, Wallet, Compass, Car, Flame, ArrowUpRight, ChevronRight } from "lucide-react";
import type { DriverDestination } from "@/services/DriverDestinationModeService";

interface IdleStateProps {
  ganhosHoje: number;
  corridasFeitas: number;
  destinoAtivo: DriverDestination | null;
  remainingDestinationUses: number;
  onToggleOnline: () => void;
  onOpenSaquePix: () => void;
  onOpenModoDestino: () => void;
  onClearDestino: () => void;
  onOpenTaximetro: () => void;
  onOpenEconomia: () => void;
  onOpenPlanos: () => void;
}

export function IdleState({
  ganhosHoje,
  corridasFeitas,
  destinoAtivo,
  remainingDestinationUses,
  onToggleOnline,
  onOpenSaquePix,
  onOpenModoDestino,
  onClearDestino,
  onOpenTaximetro,
  onOpenEconomia,
  onOpenPlanos,
}: IdleStateProps) {
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom duration-300">
      {/* Linha 1: Status do Trip Radar & Botão Ficar Offline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-status-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-status-green" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-black text-slate-900 leading-none">Trip Radar em Busca</h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Aguardando novas oportunidades no seu raio
            </p>
          </div>
        </div>

        {/* Botão Compacto Ficar Offline */}
        <button
          type="button"
          onClick={onToggleOnline}
          className="h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
        >
          <Power className="w-3.5 h-3.5 text-slate-500" />
          <span>Desconectar</span>
        </button>
      </div>

      {/* Linha 2: Resumo Compacto dos Ganhos de Hoje (D+0 PIX) */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-soft border border-brand-border-active">
        <button
          type="button"
          onClick={onOpenSaquePix}
          className="flex items-center gap-2.5 text-left active:scale-98 transition cursor-pointer flex-1 min-w-0"
        >
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 border border-brand-border-active shadow-xs">
            <Wallet className="w-5 h-5 text-brand-primary-deep" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Ganhos de Hoje
            </span>
            <div className="text-base sm:text-lg font-black text-brand-primary-deep leading-tight truncate">
              {ganhosHoje.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <span className="text-[10px] font-bold text-brand-primary-vibrant">
              {corridasFeitas} {corridasFeitas === 1 ? "corrida" : "corridas"} • D+0 PIX
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenSaquePix}
          className="px-3 py-2 rounded-xl bg-brand-primary-vibrant hover:brightness-105 active:scale-95 text-slate-950 font-black text-xs transition shadow-xs cursor-pointer shrink-0"
        >
          Sacar PIX
        </button>
      </div>

      {/* Linha 3: Ferramentas Operacionais Estratégicas (Modo Destino e Taxímetro) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Modo Destino */}
        {destinoAtivo ? (
          <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-left min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-tight truncate">
                🎯 Destino Ativo
              </span>
              <button
                type="button"
                onClick={onClearDestino}
                className="text-[10px] font-black text-rose-600 hover:underline"
              >
                ✕ Sair
              </button>
            </div>
            <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
              {destinoAtivo.address}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenModoDestino}
            className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition active:scale-95 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-base">🎯</span>
              <span className="text-[9px] font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded-full">
                {remainingDestinationUses} rest.
              </span>
            </div>
            <div className="mt-1">
              <span className="text-xs font-black text-slate-900 block leading-tight">Modo Destino</span>
              <span className="text-[10px] text-slate-500 font-medium">Ir para Casa</span>
            </div>
          </button>
        )}

        {/* Taxímetro Virtual */}
        <button
          type="button"
          onClick={onOpenTaximetro}
          className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition active:scale-95 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-base">⏱️</span>
            <span className="text-[9px] font-bold text-brand-primary-vibrant bg-brand-surface-highlight px-1.5 py-0.2 rounded-full">
              NOVO
            </span>
          </div>
          <div className="mt-1">
            <span className="text-xs font-black text-slate-900 block leading-tight">Taxímetro Virtual</span>
            <span className="text-[10px] text-slate-500 font-medium">Corrida de Rua</span>
          </div>
        </button>
      </div>

      {/* Linha 4: Acesso Secundário Discreto a Planos e Economia */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] font-bold text-slate-500">
        <button
          type="button"
          onClick={onOpenEconomia}
          className="hover:text-brand-primary-deep transition cursor-pointer flex items-center gap-1"
        >
          <span>Ver Faturamento &amp; Economia</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={onOpenPlanos}
          className="hover:text-brand-primary-deep transition cursor-pointer flex items-center gap-1"
        >
          <span>Meu Plano</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
