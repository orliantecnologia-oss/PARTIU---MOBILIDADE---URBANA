import React from "react";
import { Bell } from "lucide-react";
import { USER_PROFILE_MOCK } from "./home-mock-data";
import { useBrandTheme } from "@/hooks/useBrandTheme";

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
 * Cabeçalho com Curvatura em Arco na Base (Padrão Oficial App 99) em Azul Degradê
 *
 * Arquitetura de Layout:
 * - Camada de fundo superdimensionada (width: 160%) com `borderBottomRadius: 50%`.
 * - Cria o arco côncavo característico da 99, curvando para cima nas extremidades
 *   e revelando os cantos superiores do mapa.
 * - Paleta Azul Degradê Tech (#0088FF -> #003366).
 * - Foreground em linha única respeitando a Safe Area com textos em branco puro.
 */
export function AnimatedWaveHeader({
  userName,
  avatarUrl = USER_PROFILE_MOCK.avatarUrl,
  onOpenDrawer,
  onOpenNotifications,
  hasUnreadNotifications = true,
}: AnimatedWaveHeaderProps) {
  const { nomeApp } = useBrandTheme();
  const nomeExibicao = (userName || USER_PROFILE_MOCK.nome).trim();
  const primeiroNome = nomeExibicao.split(/\s+/)[0] || "Rodrigo";
  const iniciais = primeiroNome.substring(0, 2).toUpperCase();

  return (
    <header className="absolute top-0 left-0 right-0 z-30 w-full h-[74px] sm:h-[80px] overflow-visible pointer-events-none select-none">
      {/* 1. CAMADA SVG COM CURVATURA EM ARCO NA BASE (PADRÃO 99) E SOMBRA QUE SEGUE A CURVA */}
      <svg
        className="absolute top-0 left-0 w-full h-[74px] sm:h-[80px] pointer-events-auto overflow-visible transition-all duration-300"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          filter: "drop-shadow(0 10px 18px rgba(0, 51, 102, 0.42)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.22))",
        }}
      >
        <defs>
          <linearGradient id="partiuHeaderArcGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--header-gradient-start, #0088FF)" />
            <stop offset="100%" stopColor="var(--header-gradient-end, #003366)" />
          </linearGradient>
        </defs>
        {/* Fundo com degradê curvo estilo 99 */}
        <path
          d="M 0,0 L 100,0 L 100,54 C 74,98 26,98 0,54 Z"
          fill="url(#partiuHeaderArcGradient)"
        />
        {/* Filete de luz na borda curva inferior (acabamento glass/tecnológico) */}
        <path
          d="M 100,54 C 74,98 26,98 0,54"
          fill="none"
          stroke="rgba(255, 255, 255, 0.22)"
          strokeWidth="0.75"
        />
      </svg>

      {/* 2. CONTEÚDO FOREGROUND RESPEITANDO A SAFE AREA */}
      <div className="relative z-10 w-full pt-[max(0.45rem,env(safe-area-inset-top,8px))] px-4 sm:px-5 flex items-center justify-between pointer-events-auto">
        {/* Esquerda: Avatar Redondo + Saudação */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="group relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden ring-[2px] ring-white/85 shadow-md active:scale-95 transition-transform cursor-pointer bg-white/20 flex items-center justify-center font-black text-xs text-white shrink-0"
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

          <div className="flex flex-col text-left justify-center min-w-0">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/80 leading-none mb-0.5">
              {nomeApp || "PARTIU"}
            </span>
            <h1 className="text-[13px] sm:text-[14.5px] font-black tracking-tight leading-tight text-white drop-shadow-xs truncate">
              Olá, {primeiroNome}! 👋
            </h1>
          </div>
        </div>

        {/* Direita: Botão de Notificações com Glow Suave */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white flex items-center justify-center cursor-pointer shrink-0 border border-white/25 shadow-sm"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="w-4 h-4 sm:w-[18px] sm:h-[18px] stroke-[2.4] text-white" />

          {hasUnreadNotifications && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white shadow-md animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
}

export { AnimatedWaveHeader as FloatingIslandHeader };
