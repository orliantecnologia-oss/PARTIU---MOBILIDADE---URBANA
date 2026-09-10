import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Car, Package, Compass, CreditCard, User, Truck, Shield, HelpCircle } from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export interface HomeBottomNavProps {
  activeTab?: "corridas" | "entregas" | string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Car,
  Package,
  Compass,
  CreditCard,
  User,
  Truck,
  Shield,
  HelpCircle,
};

export function HomeBottomNav({ activeTab }: HomeBottomNavProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { corPrimaria, corTextoPrimaria, menuBuilder } = useBrandTheme();

  const customTabs = menuBuilder?.abasNavegacaoInferior?.filter((t) => t.ativo);

  // Se houver abas customizadas no Menu Builder White Label, renderiza-as dinamicamente
  if (customTabs && customTabs.length > 0) {
    return (
      <nav
        className="w-full bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-30 py-1.5 px-4 flex items-center justify-around pb-[max(0.75rem,env(safe-area-inset-bottom,12px))] shrink-0"
        aria-label="Navegação Principal White Label"
      >
        <div className="w-full max-w-md flex items-center justify-around gap-2">
          {customTabs
            .sort((a, b) => a.ordem - b.ordem)
            .map((tab) => {
              const isActive =
                activeTab === tab.id ||
                pathname === tab.rota ||
                (tab.rota === "/app" && (pathname === "/app" || pathname === "/app/"));
              const IconComp = ICON_MAP[tab.icone] || Car;

              return (
                <Link
                  key={tab.id}
                  to={tab.rota as any}
                  style={{
                    backgroundColor: isActive ? (corPrimaria || "#FFDE00") : "transparent",
                    color: isActive ? (corTextoPrimaria || "#0F172A") : undefined,
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer font-bold text-xs ${
                    isActive
                      ? "shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                  aria-label={tab.rotulo}
                >
                  <IconComp className="w-4 h-4 stroke-[2.4]" />
                  <span>{tab.rotulo}</span>
                </Link>
              );
            })}
        </div>
      </nav>
    );
  }

  // Fallback padrão canônico
  const isCorridas = activeTab ? activeTab === "corridas" : pathname === "/app" || pathname === "/app/";
  const isEntregas = activeTab ? activeTab === "entregas" : pathname === "/app/encomendas" || pathname === "/app/encomendas/";

  return (
    <nav
      className="w-full bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-30 py-1.5 px-4 flex items-center justify-around pb-[max(0.75rem,env(safe-area-inset-bottom,12px))] shrink-0"
      aria-label="Navegação Principal"
    >
      <div className="w-full max-w-md flex items-center justify-around gap-2">
        {/* Aba 1: Corridas (Ícone de Carro) */}
        <Link
          to="/app"
          style={{
            backgroundColor: isCorridas ? (corPrimaria || "#FFDE00") : "transparent",
            color: isCorridas ? (corTextoPrimaria || "#0F172A") : undefined,
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer font-bold text-xs ${
            isCorridas
              ? "shadow-xs font-black"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
          }`}
          aria-label="Aba de Corridas"
        >
          <Car className="w-4 h-4 stroke-[2.4]" />
          <span>Corridas</span>
        </Link>

        {/* Aba 2: Entregas (Ícone de Pacote / Caixa) */}
        <Link
          to="/app/encomendas"
          style={{
            backgroundColor: isEntregas ? (corPrimaria || "#FFDE00") : "transparent",
            color: isEntregas ? (corTextoPrimaria || "#0F172A") : undefined,
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer font-bold text-xs ${
            isEntregas
              ? "shadow-xs font-black"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
          }`}
          aria-label="Aba de Entregas"
        >
          <Package className="w-4 h-4 stroke-[2.4]" />
          <span>Entregas</span>
        </Link>
      </div>
    </nav>
  );
}
