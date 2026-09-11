import React from "react";
import { Bell } from "lucide-react";
import { USER_PROFILE_MOCK } from "./home-mock-data";
import { gradients } from "@/lib/design-tokens";

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
  const nomeExibicao = (userName || USER_PROFILE_MOCK.nome).trim();
  const primeiroNome = nomeExibicao.split(/\s+/)[0] || "Rodrigo";
  const iniciais = primeiroNome.substring(0, 2).toUpperCase();

  return (
    <header className="absolute top-0 left-0 right-0 z-30 w-full h-[90px] sm:h-[96px] overflow-hidden pointer-events-none select-none">
      {/* 1. CAMADA COM CURVATURA EM ARCO NA BASE (PADRÃO 99) */}
      <div
        style={{
          background: gradients.header || "linear-gradient(180deg, #0088FF 0%, #003366 100%)",
          borderBottomLeftRadius: "50%",
          borderBottomRightRadius: "50%",
          boxShadow: "0 10px 30px rgba(0, 51, 102, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15)",
        }}
        className="absolute -top-[95px] sm:-top-[98px] left-1/2 -translate-x-1/2 w-[160%] h-[185px] sm:h-[195px] pointer-events-auto transition-all duration-300"
      />

      {/* 2. CONTEÚDO FOREGROUND RESPEITANDO A SAFE AREA */}
      <div className="relative z-10 w-full pt-[max(0.6rem,env(safe-area-inset-top,10px))] px-4 sm:px-5 flex items-center justify-between pointer-events-auto">
        {/* Esquerda: Avatar Redondo + Saudação */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-[2.5px] ring-white/80 shadow-md active:scale-95 transition-transform cursor-pointer bg-white/20 flex items-center justify-center font-black text-xs text-white shrink-0"
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
            <span className="text-[9.5px] font-black uppercase tracking-[0.16em] text-white/80 leading-none mb-0.5">
              PARTIU
            </span>
            <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight text-white drop-shadow-xs truncate">
              Olá, {primeiroNome}! 👋
            </h1>
          </div>
        </div>

        {/* Direita: Botão de Notificações com Glow Suave */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white flex items-center justify-center cursor-pointer shrink-0 border border-white/25 shadow-sm"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="w-[18px] h-[18px] sm:w-5 sm:h-5 stroke-[2.4] text-white" />

          {hasUnreadNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white shadow-md animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
}

export { AnimatedWaveHeader as FloatingIslandHeader };
