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
  const { corPrimaria, menuBuilder } = useBrandTheme();

  const customTabs = menuBuilder?.abasNavegacaoInferior?.filter((t) => t.ativo);
  const accentColor = corPrimaria || "#FFDE00";

  // Se houver abas customizadas no Menu Builder White Label, renderiza-as dinamicamente
  if (customTabs && customTabs.length > 0) {
    return (
      <nav
        className="w-full bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-30 py-2 px-4 flex items-center justify-around pb-[max(0.75rem,env(safe-area-inset-bottom,12px))] shrink-0"
        aria-label="Navegação Principal White Label"
      >
        <div className="w-full max-w-md flex items-center justify-around gap-1">
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
                  className="flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer relative group"
                  aria-label={tab.rotulo}
                >
                  <IconComp
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive
                        ? "text-slate-950 stroke-[2.3]"
                        : "text-[#A0A0A0] stroke-[1.8] group-hover:text-slate-600"
                    }`}
                  />
                  <span
                    className={`text-[11px] mt-0.5 tracking-tight transition-colors duration-200 ${
                      isActive
                        ? "text-slate-950 font-bold"
                        : "text-[#A0A0A0] font-medium group-hover:text-slate-600"
                    }`}
                  >
                    {tab.rotulo}
                  </span>

                  {/* Dot Indicator Minimalista: Ponto Amarelo Vibrante Marca Partiu */}
                  {isActive ? (
                    <span
                      style={{ backgroundColor: accentColor }}
                      className="w-1.5 h-1.5 rounded-full mt-1 shadow-xs animate-in zoom-in-75 duration-200"
                    />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full mt-1 opacity-0 pointer-events-none" />
                  )}
                </Link>
              );
            })}
        </div>
      </nav>
    );
  }

  // Fallback padrão canônico: Corridas e Entregas
  const isCorridas = activeTab ? activeTab === "corridas" : pathname === "/app" || pathname === "/app/";
  const isEntregas = activeTab ? activeTab === "entregas" : pathname === "/app/encomendas" || pathname === "/app/encomendas/";

  return (
    <nav
      className="w-full bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-30 py-2 px-4 flex items-center justify-around pb-[max(0.75rem,env(safe-area-inset-bottom,12px))] shrink-0"
      aria-label="Navegação Principal"
    >
      <div className="w-full max-w-md flex items-center justify-around gap-1">
        {/* Aba 1: Corridas */}
        <Link
          to="/app"
          className="flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer relative group"
          aria-label="Aba de Corridas"
        >
          <Car
            className={`w-5 h-5 transition-colors duration-200 ${
              isCorridas
                ? "text-slate-950 stroke-[2.3]"
                : "text-[#A0A0A0] stroke-[1.8] group-hover:text-slate-600"
            }`}
          />
          <span
            className={`text-[11px] mt-0.5 tracking-tight transition-colors duration-200 ${
              isCorridas
                ? "text-slate-950 font-bold"
                : "text-[#A0A0A0] font-medium group-hover:text-slate-600"
            }`}
          >
            Corridas
          </span>

          {/* Dot Indicator Minimalista */}
          {isCorridas ? (
            <span
              style={{ backgroundColor: accentColor }}
              className="w-1.5 h-1.5 rounded-full mt-1 shadow-xs animate-in zoom-in-75 duration-200"
            />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full mt-1 opacity-0 pointer-events-none" />
          )}
        </Link>

        {/* Aba 2: Entregas */}
        <Link
          to="/app/encomendas"
          className="flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer relative group"
          aria-label="Aba de Entregas"
        >
          <Package
            className={`w-5 h-5 transition-colors duration-200 ${
              isEntregas
                ? "text-slate-950 stroke-[2.3]"
                : "text-[#A0A0A0] stroke-[1.8] group-hover:text-slate-600"
            }`}
          />
          <span
            className={`text-[11px] mt-0.5 tracking-tight transition-colors duration-200 ${
              isEntregas
                ? "text-slate-950 font-bold"
                : "text-[#A0A0A0] font-medium group-hover:text-slate-600"
            }`}
          >
            Entregas
          </span>

          {/* Dot Indicator Minimalista */}
          {isEntregas ? (
            <span
              style={{ backgroundColor: accentColor }}
              className="w-1.5 h-1.5 rounded-full mt-1 shadow-xs animate-in zoom-in-75 duration-200"
            />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full mt-1 opacity-0 pointer-events-none" />
          )}
        </Link>
      </div>
    </nav>
  );
}
