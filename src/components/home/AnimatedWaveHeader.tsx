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
 * Header "Estilo Arco-íris" (Rainbow Edition)
 *
 * Design:
 * - Gradiente cromático vibrante em espectro arco-íris (Rosa, Laranja, Ouro, Esmeralda, Ciano, Azul e Roxo)
 * - Tipografia de altíssimo contraste com drop-shadow sutil e nítido
 * - Avatar com anel de luz branco e badge translúcido de vidro fosco
 * - Barra ultracompacta em linha única para maximizar o campo de visualização do mapa
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
      className="absolute top-0 left-0 right-0 z-30 select-none overflow-hidden"
      style={{
        background: gradients.rainbow,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        paddingTop: "max(0.6rem, env(safe-area-inset-top, 8px))",
        boxShadow:
          "0 8px 30px rgba(0, 0, 0, 0.28), 0 2px 8px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Barra de brilho cromático no topo */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/40 pointer-events-none" />

      {/* Linha única flex: [Avatar + Saudação] ———— [Sino de Notificação] */}
      <div className="flex items-center justify-between px-4 py-2 sm:py-2.5 relative z-10">
        {/* Esquerda: Avatar com anel branco + Saudação */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-[2.5px] ring-white shadow-md active:scale-95 transition-transform cursor-pointer bg-black/25 flex items-center justify-center font-black text-xs text-white shrink-0"
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
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="bg-black/25 backdrop-blur-md px-1.5 py-0.2 rounded-full text-[8.5px] font-black uppercase tracking-[0.18em] text-white border border-white/25 leading-tight shadow-xs">
                PARTIU
              </span>
            </div>
            <h1 className="text-sm sm:text-[15px] font-black tracking-tight leading-tight text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.65)] truncate">
              Olá, {primeiroNome}! 👋
            </h1>
          </div>
        </div>

        {/* Direita: Botão de Notificações com efeito Glassmorphism */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/25 hover:bg-black/40 backdrop-blur-md border border-white/30 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0 shadow-md"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="w-[18px] h-[18px] sm:w-5 sm:h-5 stroke-[2.4] text-white drop-shadow-xs" />

          {hasUnreadNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-rose-500 shadow-md animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
}

export { AnimatedWaveHeader as FloatingIslandHeader };
