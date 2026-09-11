import { Link, useLocation } from "@tanstack/react-router";
import { Car, Package } from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";

interface ModeTabSelectorProps {
  className?: string;
}

export function ModeTabSelector({ className = "" }: ModeTabSelectorProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { corPrimaria, corTextoPrimaria } = useBrandTheme();

  const isCorrida = pathname === "/app" || pathname === "/app/";
  const isEntrega = pathname === "/app/encomendas" || pathname === "/app/encomendas/";

  return (
    <div
      className={`inline-flex items-center p-1 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-black/5 ring-1 ring-black/5 transition-all pointer-events-auto ${className}`}
      role="tablist"
      aria-label="Modalidade Partiu"
    >
      {/* Aba 1: Corrida */}
      <Link
        to="/app"
        role="tab"
        aria-selected={isCorrida}
        style={{
          backgroundColor: isCorrida ? (corPrimaria || "#0088FF") : "transparent",
          color: isCorrida ? "#FFFFFF" : undefined,
        }}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 ${
          isCorrida
            ? "shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
        }`}
      >
        <Car className="w-3.5 h-3.5 stroke-[2.4]" />
        <span>Corrida</span>
      </Link>

      {/* Aba 2: Entrega */}
      <Link
        to="/app/encomendas"
        role="tab"
        aria-selected={isEntrega}
        style={{
          backgroundColor: isEntrega ? (corPrimaria || "#0088FF") : "transparent",
          color: isEntrega ? "#FFFFFF" : undefined,
        }}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 ${
          isEntrega
            ? "shadow-sm"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
        }`}
      >
        <Package className="w-3.5 h-3.5 stroke-[2.4]" />
        <span>Entrega</span>
      </Link>
    </div>
  );
}
