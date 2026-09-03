import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-2 sm:px-4 py-2 shadow-xs">
      <div className="mx-auto flex w-full max-w-full sm:max-w-4xl items-center justify-between gap-2.5">
        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
          <img
            src="/univans-logo.jpg"
            alt="UniVans Coop Alagoas"
            className="h-8 sm:h-9 w-auto object-contain rounded-lg border border-slate-100"
          />
          <div className="leading-tight">
            <p className="text-xs sm:text-base font-black tracking-tight text-slate-900">
              UniVans <span className="text-[#0d5930]">Coop</span>
            </p>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 block">
              Alagoas • Oficial
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            to="/app/linhas"
            className="min-h-[44px] h-11 flex items-center rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 transition-colors cursor-pointer active:scale-95"
          >
            Horários
          </Link>
          <Link
            to="/app"
            className="min-h-[44px] h-11 flex items-center gap-1.5 rounded-xl bg-[#0b2046] hover:bg-[#071833] px-4 py-2 text-xs sm:text-sm font-black text-white shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <span>Entrar no App</span>
            <ArrowRight className="h-4 w-4 text-amber-300" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
