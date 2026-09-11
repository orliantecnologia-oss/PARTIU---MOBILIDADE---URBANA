import React, { memo } from "react";
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

export const HomeBottomNav = memo(function HomeBottomNav({ activeTab }: HomeBottomNavProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { menuBuilder, corPrimaria } = useBrandTheme();

  const customTabs = menuBuilder?.abasNavegacaoInferior?.filter((t) => t.ativo);
  const primaryColor = corPrimaria || "#0088FF";

  // === Renderização com White Label Custom Tabs ===
  if (customTabs && customTabs.length > 0) {
    return (
      <nav
        className="w-full z-30 flex items-center justify-center bg-transparent pointer-events-auto select-none"
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 10px))",
        }}
        aria-label="Navegação Principal"
      >
        <div className="flex items-center justify-around gap-1.5 p-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-200/80 max-w-md w-full mx-auto">
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
                  className={`flex-1 flex items-center justify-center py-2 px-3 rounded-full transition-all duration-200 active:scale-95 cursor-pointer ${
                    isActive
                      ? "font-black shadow-xs text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: primaryColor,
                          color: "#FFFFFF",
                        }
                      : undefined
                  }
                  aria-label={tab.rotulo}
                >
                  <IconComp
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isActive ? "text-white stroke-[2.6] scale-105" : "text-slate-500 stroke-[2]"
                    }`}
                  />
                  <span
                    className={`text-xs ml-1.5 tracking-tight ${
                      isActive ? "text-white font-black" : "text-slate-600 font-semibold"
                    }`}
                  >
                    {tab.rotulo}
                  </span>
                </Link>
              );
            })}
        </div>
      </nav>
    );
  }

  // === Padrão: Corridas & Entregas ===
  const isCorridas = activeTab ? activeTab === "corridas" : pathname === "/app" || pathname === "/app/";
  const isEntregas = activeTab ? activeTab === "entregas" : pathname === "/app/encomendas" || pathname === "/app/encomendas/";

  return (
    <nav
      className="w-full z-30 flex items-center justify-center bg-transparent pointer-events-auto select-none"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 10px))",
      }}
      aria-label="Navegação Principal"
    >
      <div className="flex items-center justify-around gap-1.5 p-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-200/80 max-w-xs sm:max-w-sm w-full mx-auto">
        {/* Aba 1: Corridas */}
        <Link
          to="/app"
          className={`flex-1 flex items-center justify-center py-2 px-4 rounded-full transition-all duration-200 active:scale-95 cursor-pointer ${
            isCorridas
              ? "font-black shadow-xs text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
          }`}
          style={
            isCorridas
              ? {
                  backgroundColor: primaryColor,
                  color: "#FFFFFF",
                }
              : undefined
          }
          aria-label="Aba Corridas"
        >
          <Car
            className={`w-4 h-4 transition-transform duration-200 ${
              isCorridas ? "text-white stroke-[2.6] scale-105" : "text-slate-500 stroke-[2]"
            }`}
          />
          <span
            className={`text-xs ml-1.5 tracking-tight ${
              isCorridas ? "text-white font-black" : "text-slate-600 font-semibold"
            }`}
          >
            Corridas
          </span>
        </Link>

        {/* Aba 2: Entregas */}
        <Link
          to="/app/encomendas"
          className={`flex-1 flex items-center justify-center py-2 px-4 rounded-full transition-all duration-200 active:scale-95 cursor-pointer ${
            isEntregas
              ? "font-black shadow-xs text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
          }`}
          style={
            isEntregas
              ? {
                  backgroundColor: primaryColor,
                  color: "#FFFFFF",
                }
              : undefined
          }
          aria-label="Aba Entregas"
        >
          <Package
            className={`w-4 h-4 transition-transform duration-200 ${
              isEntregas ? "text-white stroke-[2.6] scale-105" : "text-slate-500 stroke-[2]"
            }`}
          />
          <span
            className={`text-xs ml-1.5 tracking-tight ${
              isEntregas ? "text-white font-black" : "text-slate-600 font-semibold"
            }`}
          >
            Entregas
          </span>
        </Link>
      </div>
    </nav>
  );
});
