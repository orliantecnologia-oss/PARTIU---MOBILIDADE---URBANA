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
 * Cabeçalho "Floating Island" (Ilha Flutuante) - Padrão Premium
 * - Substitui a curvatura amarela sólida por um card flutuante translúcido (Glassmorphism).
 * - Posicionado absolutamente sobre o mapa no topo da tela com respeito à Safe Area.
 * - Sombra difusa elegante, cantos arredondados (rounded-[30px]), layout horizontal e minimalista.
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
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none select-none flex justify-center pt-[max(0.65rem,env(safe-area-inset-top,10px))] px-3 sm:px-4">
      {/* CARD FLUTUANTE / ILHA GLASSMORPHISM */}
      <div
        className="pointer-events-auto w-full max-w-md bg-white/95 backdrop-blur-md rounded-[30px] px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.10)] border border-slate-100/90 flex items-center justify-between transition-all duration-300"
        style={{
          elevation: 5,
        }}
      >
        {/* Lado Esquerdo: Avatar & Saudação */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-slate-100 shadow-xs active:scale-95 transition-transform cursor-pointer bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xs shrink-0"
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
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 leading-none mb-0.5">
              PARTIU
            </span>
            <h1 className="text-sm sm:text-[15px] font-black tracking-tight leading-tight text-slate-900">
              Olá, {primeiroNome}!
            </h1>
          </div>
        </div>

        {/* Lado Direito: Sino de Notificações com Badge */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-slate-700 hover:text-slate-950 flex items-center justify-center cursor-pointer shrink-0 border border-slate-200/60 shadow-2xs"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="w-4 h-4 sm:w-[18px] sm:h-[18px] stroke-[2.2]" />

          {hasUnreadNotifications && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
}

export { AnimatedWaveHeader as FloatingIslandHeader };
