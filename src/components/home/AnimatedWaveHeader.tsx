import React from "react";
import { Bell } from "lucide-react";
import { USER_PROFILE_MOCK } from "./home-mock-data";
import { colors, gradients, components } from "@/lib/design-tokens";

export interface AnimatedWaveHeaderProps {
  userName?: string;
  avatarUrl?: string;
  onOpenDrawer: () => void;
  onOpenNotifications: () => void;
  hasUnreadNotifications?: boolean;
  waveRadius?: number;
  isScrolled?: boolean;
}

/**
 * Header "Premium Slim" — Azul Tech Premium Identity
 *
 * Ultra-compact single-line header that maximizes map area.
 * Layout: [Avatar] [Olá Rodrigo 👋] ———————— [Sino]
 *
 * Visual:
 * - LinearGradient #0088FF → #003366 (vertical)
 * - borderBottomLeft/RightRadius: 16
 * - Subtle shadow for depth
 * - SafeArea respected via env()
 */
export function AnimatedWaveHeader({
  userName,
  avatarUrl = USER_PROFILE_MOCK.avatarUrl,
  onOpenDrawer,
  onOpenNotifications,
  hasUnreadNotifications = true,
}: AnimatedWaveHeaderProps) {
  const nomeExibicao = (userName || USER_PROFILE_MOCK.nome).trim();
  const primeiroNome = nomeExibicao.split(/\s+/)[0] || "Rodrigo";
  const iniciais = primeiroNome.substring(0, 2).toUpperCase();

  return (
    <header
      className="absolute top-0 left-0 right-0 z-30 select-none"
      style={{
        background: components.header.gradient,
        borderBottomLeftRadius: components.header.borderRadius,
        borderBottomRightRadius: components.header.borderRadius,
        paddingTop: "env(safe-area-inset-top, 0px)",
        boxShadow: "0 4px 20px rgba(0, 28, 56, 0.25)",
      }}
    >
      {/* Single-line flex row: Avatar | Greeting | Bell */}
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Left: Avatar + Greeting */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/60 active:scale-95 transition-transform cursor-pointer bg-white/20 flex items-center justify-center font-bold text-[11px] text-white shrink-0"
            aria-label="Abrir Menu Lateral e Perfil"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={nomeExibicao}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <span>{iniciais}</span>
            )}
          </button>

          <span className="text-sm font-bold text-white truncate leading-tight">
            Olá, {primeiroNome} 👋
          </span>
        </div>

        {/* Right: Bell */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative w-9 h-9 rounded-full bg-white/12 hover:bg-white/20 active:scale-95 transition-all text-white flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Notificações"
        >
          <Bell className="w-[17px] h-[17px] stroke-[2.2]" />

          {hasUnreadNotifications && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 animate-pulse"
              style={{
                backgroundColor: colors.accent,
                ringColor: colors.primary[600],
              }}
            />
          )}
        </button>
      </div>
    </header>
  );
}

export { AnimatedWaveHeader as FloatingIslandHeader };
