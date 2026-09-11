import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Zap } from "lucide-react";

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-2 sm:px-4 py-2 shadow-xs">
      <div className="mx-auto flex w-full max-w-full sm:max-w-4xl items-center justify-between gap-2.5">
        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="h-8 sm:h-9 w-8 sm:w-9 rounded-xl bg-[#0088FF] flex items-center justify-center font-black text-slate-950 text-sm shadow-xs">
            <Zap className="h-4 w-4 fill-slate-950 stroke-[2.5]" />
          </div>
          <div className="leading-tight">
            <p className="text-xs sm:text-base font-black tracking-tight text-slate-900">
              PARTIU <span className="text-primary-600 font-extrabold">BRASIL</span>
            </p>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 block">
              Corridas & Entregas Flash
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            to="/app/motorista"
            className="min-h-[44px] h-11 flex items-center rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 transition-colors cursor-pointer active:scale-95"
          >
            Motorista Parceiro
          </Link>
          <Link
            to="/app"
            className="min-h-[44px] h-11 flex items-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 px-4 py-2 text-xs sm:text-sm font-black text-[#0088FF] shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <span>Pedir Agora</span>
            <ArrowRight className="h-4 w-4 text-[#0088FF]" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
