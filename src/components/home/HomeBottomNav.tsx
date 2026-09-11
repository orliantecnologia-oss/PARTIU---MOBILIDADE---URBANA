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

/** Estilo compartilhado para a pill de gradiente ativa */
const ACTIVE_PILL_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
};

export function HomeBottomNav({ activeTab }: HomeBottomNavProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { menuBuilder } = useBrandTheme();

  const customTabs = menuBuilder?.abasNavegacaoInferior?.filter((t) => t.ativo);

  // === Renderização White Label (tabs customizadas) ===
  if (customTabs && customTabs.length > 0) {
    return (
      <nav
        className="mx-4 bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] z-30 py-2.5 px-3 flex items-center justify-around shrink-0"
        style={{
          marginBottom: "max(1rem, env(safe-area-inset-bottom, 16px))",
        }}
        aria-label="Navegação Principal White Label"
      >
        <div className="w-full max-w-md flex items-center justify-around gap-1.5">
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
                  className={`flex items-center justify-center transition-all duration-250 active:scale-95 cursor-pointer ${
                    isActive
                      ? "gap-2 py-2 px-4 rounded-2xl"
                      : "p-2 rounded-xl"
                  }`}
                  style={isActive ? ACTIVE_PILL_STYLE : undefined}
                  aria-label={tab.rotulo}
                >
                  <IconComp
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive
                        ? "text-white stroke-[2.3]"
                        : "text-[#9CA3AF] stroke-[1.8]"
                    }`}
                  />
                  {isActive && (
                    <span className="text-[12px] font-bold text-white tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-1 duration-200">
                      {tab.rotulo}
                    </span>
                  )}
                </Link>
              );
            })}
        </div>
      </nav>
    );
  }

  // === Fallback padrão: Corridas e Entregas ===
  const isCorridas = activeTab ? activeTab === "corridas" : pathname === "/app" || pathname === "/app/";
  const isEntregas = activeTab ? activeTab === "entregas" : pathname === "/app/encomendas" || pathname === "/app/encomendas/";

  return (
    <nav
      className="mx-4 bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] z-30 py-2.5 px-3 flex items-center justify-around shrink-0"
      style={{
        marginBottom: "max(1rem, env(safe-area-inset-bottom, 16px))",
      }}
      aria-label="Navegação Principal"
    >
      <div className="w-full max-w-md flex items-center justify-around gap-1.5">
        {/* Aba 1: Corridas */}
        <Link
          to="/app"
          className={`flex items-center justify-center transition-all duration-250 active:scale-95 cursor-pointer ${
            isCorridas
              ? "gap-2 py-2 px-5 rounded-2xl"
              : "p-2.5 rounded-xl"
          }`}
          style={isCorridas ? ACTIVE_PILL_STYLE : undefined}
          aria-label="Aba de Corridas"
        >
          <Car
            className={`w-5 h-5 transition-colors duration-200 ${
              isCorridas
                ? "text-white stroke-[2.3]"
                : "text-[#9CA3AF] stroke-[1.8]"
            }`}
          />
          {isCorridas && (
            <span className="text-[12px] font-bold text-white tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-1 duration-200">
              Corridas
            </span>
          )}
        </Link>

        {/* Aba 2: Entregas */}
        <Link
          to="/app/encomendas"
          className={`flex items-center justify-center transition-all duration-250 active:scale-95 cursor-pointer ${
            isEntregas
              ? "gap-2 py-2 px-5 rounded-2xl"
              : "p-2.5 rounded-xl"
          }`}
          style={isEntregas ? ACTIVE_PILL_STYLE : undefined}
          aria-label="Aba de Entregas"
        >
          <Package
            className={`w-5 h-5 transition-colors duration-200 ${
              isEntregas
                ? "text-white stroke-[2.3]"
                : "text-[#9CA3AF] stroke-[1.8]"
            }`}
          />
          {isEntregas && (
            <span className="text-[12px] font-bold text-white tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-1 duration-200">
              Entregas
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}
