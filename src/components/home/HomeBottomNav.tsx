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

/** Fundo preto obsidian com contraste máximo e profundidade */
const NAV_STYLE: React.CSSProperties = {
  background: "linear-gradient(180deg, #0F172A 0%, #020617 100%)",
  boxShadow: "0 -8px 36px rgba(0, 0, 0, 0.45), 0 -2px 10px rgba(0, 0, 0, 0.3)",
};

/** Pílula ativa de altíssimo contraste (Branco puro sobre fundo escuro = 21:1) */
const ACTIVE_PILL_STYLE: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  color: "#090D1A",
  boxShadow: "0 4px 20px rgba(255, 255, 255, 0.35)",
};

export function HomeBottomNav({ activeTab }: HomeBottomNavProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { menuBuilder } = useBrandTheme();

  const customTabs = menuBuilder?.abasNavegacaoInferior?.filter((t) => t.ativo);

  // === Renderização com White Label Custom Tabs ===
  if (customTabs && customTabs.length > 0) {
    return (
      <nav
        className="w-full z-30 pt-2 px-4 flex items-center justify-around shrink-0 border-t border-white/15"
        style={{
          ...NAV_STYLE,
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 14px))",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        aria-label="Navegação Principal"
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
                  className={`flex-1 flex items-center justify-center py-2 px-3 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
                    isActive
                      ? "font-black"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                  style={isActive ? ACTIVE_PILL_STYLE : undefined}
                  aria-label={tab.rotulo}
                >
                  <IconComp
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? "text-[#090D1A] stroke-[2.6] scale-105" : "text-slate-300 stroke-[2]"
                    }`}
                  />
                  <span
                    className={`text-xs ml-2 tracking-tight ${
                      isActive ? "text-[#090D1A] font-black" : "text-slate-300 font-semibold"
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

  // === Padrão: Corridas & Entregas (Alto Contraste) ===
  const isCorridas = activeTab ? activeTab === "corridas" : pathname === "/app" || pathname === "/app/";
  const isEntregas = activeTab ? activeTab === "entregas" : pathname === "/app/encomendas" || pathname === "/app/encomendas/";

  return (
    <nav
      className="w-full z-30 pt-2 px-4 flex items-center justify-around shrink-0 border-t border-white/15"
      style={{
        ...NAV_STYLE,
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 14px))",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      aria-label="Navegação Principal"
    >
      <div className="w-full max-w-md flex items-center justify-around gap-2.5">
        {/* Aba 1: Corridas */}
        <Link
          to="/app"
          className={`flex-1 flex items-center justify-center py-2 px-4 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
            isCorridas
              ? "font-black"
              : "text-slate-300 hover:text-white hover:bg-white/10"
          }`}
          style={isCorridas ? ACTIVE_PILL_STYLE : undefined}
          aria-label="Aba Corridas"
        >
          <Car
            className={`w-5 h-5 transition-transform duration-200 ${
              isCorridas ? "text-[#090D1A] stroke-[2.6] scale-105" : "text-slate-300 stroke-[2]"
            }`}
          />
          <span
            className={`text-xs ml-2 tracking-tight ${
              isCorridas ? "text-[#090D1A] font-black" : "text-slate-300 font-semibold"
            }`}
          >
            Corridas
          </span>
        </Link>

        {/* Aba 2: Entregas */}
        <Link
          to="/app/encomendas"
          className={`flex-1 flex items-center justify-center py-2 px-4 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
            isEntregas
              ? "font-black"
              : "text-slate-300 hover:text-white hover:bg-white/10"
          }`}
          style={isEntregas ? ACTIVE_PILL_STYLE : undefined}
          aria-label="Aba Entregas"
        >
          <Package
            className={`w-5 h-5 transition-transform duration-200 ${
              isEntregas ? "text-[#090D1A] stroke-[2.6] scale-105" : "text-slate-300 stroke-[2]"
            }`}
          />
          <span
            className={`text-xs ml-2 tracking-tight ${
              isEntregas ? "text-[#090D1A] font-black" : "text-slate-300 font-semibold"
            }`}
          >
            Entregas
          </span>
        </Link>
      </div>
    </nav>
  );
}
