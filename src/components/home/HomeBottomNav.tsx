import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Car, Package, Compass, CreditCard, User, Truck, Shield, HelpCircle } from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { components } from "@/lib/design-tokens";

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

/** Shared styles for the dark premium nav bar */
const NAV_STYLE: React.CSSProperties = {
  background: components.bottomNav.gradient,
  boxShadow: "0 -4px 30px rgba(0, 0, 0, 0.15)",
};

/** Active pill style */
const ACTIVE_PILL: React.CSSProperties = {
  backgroundColor: components.bottomNav.activePill.background,
  border: `1px solid ${components.bottomNav.activePill.border}`,
  boxShadow: "0 0 12px rgba(0, 198, 255, 0.20)",
};

const INACTIVE_COLOR = components.bottomNav.inactiveColor;
const ACTIVE_COLOR = components.bottomNav.activeIconColor;

export function HomeBottomNav({ activeTab }: HomeBottomNavProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { menuBuilder } = useBrandTheme();

  const customTabs = menuBuilder?.abasNavegacaoInferior?.filter((t) => t.ativo);

  // === White Label Custom Tabs ===
  if (customTabs && customTabs.length > 0) {
    return (
      <nav
        className="w-full z-30 py-2 px-4 flex items-center justify-around shrink-0"
        style={{
          ...NAV_STYLE,
          paddingBottom: "max(0.65rem, env(safe-area-inset-bottom, 10px))",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        aria-label="Navegação Principal"
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
                  className="flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer"
                  style={isActive ? ACTIVE_PILL : undefined}
                  aria-label={tab.rotulo}
                >
                  <IconComp
                    className="w-[20px] h-[20px] transition-colors duration-200"
                    style={{
                      color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                      strokeWidth: isActive ? 2.4 : 1.8,
                    }}
                  />
                  <span
                    className="text-[10px] mt-0.5 tracking-tight transition-colors duration-200"
                    style={{
                      color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                      fontWeight: isActive ? 700 : 500,
                    }}
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

  // === Default: Corridas & Entregas ===
  const isCorridas = activeTab ? activeTab === "corridas" : pathname === "/app" || pathname === "/app/";
  const isEntregas = activeTab ? activeTab === "entregas" : pathname === "/app/encomendas" || pathname === "/app/encomendas/";

  return (
    <nav
      className="w-full z-30 py-2 px-4 flex items-center justify-around shrink-0"
      style={{
        ...NAV_STYLE,
        paddingBottom: "max(0.65rem, env(safe-area-inset-bottom, 10px))",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      aria-label="Navegação Principal"
    >
      <div className="w-full max-w-md flex items-center justify-around gap-1">
        {/* Tab: Corridas */}
        <Link
          to="/app"
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer"
          style={isCorridas ? ACTIVE_PILL : undefined}
          aria-label="Corridas"
        >
          <Car
            className="w-[20px] h-[20px] transition-colors duration-200"
            style={{
              color: isCorridas ? ACTIVE_COLOR : INACTIVE_COLOR,
              strokeWidth: isCorridas ? 2.4 : 1.8,
            }}
          />
          <span
            className="text-[10px] mt-0.5 tracking-tight transition-colors duration-200"
            style={{
              color: isCorridas ? ACTIVE_COLOR : INACTIVE_COLOR,
              fontWeight: isCorridas ? 700 : 500,
            }}
          >
            Corridas
          </span>
        </Link>

        {/* Tab: Entregas */}
        <Link
          to="/app/encomendas"
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer"
          style={isEntregas ? ACTIVE_PILL : undefined}
          aria-label="Entregas"
        >
          <Package
            className="w-[20px] h-[20px] transition-colors duration-200"
            style={{
              color: isEntregas ? ACTIVE_COLOR : INACTIVE_COLOR,
              strokeWidth: isEntregas ? 2.4 : 1.8,
            }}
          />
          <span
            className="text-[10px] mt-0.5 tracking-tight transition-colors duration-200"
            style={{
              color: isEntregas ? ACTIVE_COLOR : INACTIVE_COLOR,
              fontWeight: isEntregas ? 700 : 500,
            }}
          >
            Entregas
          </span>
        </Link>
      </div>
    </nav>
  );
}
