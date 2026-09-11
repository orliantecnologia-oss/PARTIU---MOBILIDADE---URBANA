import React from "react";
import { Bell } from "lucide-react";
import { USER_PROFILE_MOCK } from "./home-mock-data";

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
 * Cabeçalho "Dynamic Gradient Wave" — Rebranding Ocean Tech
 *
 * Design: Fundo em degradê azul vibrante (#0088FF → #003366), com borda
 * inferior arredondada (radius 35) que sobrepõe os primeiros centímetros
 * do mapa. Texto branco, avatar com borda branca, ícone de sino branco
 * com glow sutil. Layout horizontal minimalista.
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
        background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        paddingTop: "max(0.75rem, env(safe-area-inset-top, 12px))",
      }}
    >
      <div className="flex items-center justify-between px-5 pb-5 pt-2">
        {/* Lado Esquerdo: Avatar & Saudação */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="group relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden ring-[2.5px] ring-white/80 shadow-lg active:scale-95 transition-transform cursor-pointer bg-white/20 text-white flex items-center justify-center font-black text-xs shrink-0"
            aria-label="Abrir Menu Lateral e Perfil"
            title="Abrir Menu"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={nomeExibicao}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <span>{iniciais}</span>
            )}
          </button>

          <div className="flex flex-col text-left justify-center">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/70 leading-none mb-0.5">
              PARTIU
            </span>
            <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight text-white">
              Olá, {primeiroNome}!
            </h1>
          </div>
        </div>

        {/* Lado Direito: Sino de Notificações com Glow */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white flex items-center justify-center cursor-pointer shrink-0 backdrop-blur-sm"
          style={{
            boxShadow: "0 0 18px rgba(0, 136, 255, 0.35)",
          }}
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="w-[18px] h-[18px] sm:w-5 sm:h-5 stroke-[2.2]" />

          {hasUnreadNotifications && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-white rounded-full ring-2 ring-[#0088FF] animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
}

export { AnimatedWaveHeader as FloatingIslandHeader };
