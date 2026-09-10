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
 * Cabeçalho Fixo com Curvatura em Arco na Base (Estilo Lente / Arched Canopy)
 * - Container com overflow: hidden cobrindo o topo da tela com z-index elevado (z-30).
 * - Camada amarela superdimensionada (width: 160%) com borderBottomRadius em 50%,
 *   fazendo a borda inferior arquear suavemente para cima nas laterais e descer no centro.
 * - Revela os cantos superiores do mapa (Camada 0) integrando a UI ao ambiente de geolocalização.
 * - Foreground respeita a Safe Area com avatar circular, textos alinhados e sino de notificações.
 */
export function AnimatedWaveHeader({
  userName,
  avatarUrl = USER_PROFILE_MOCK.avatarUrl,
  onOpenDrawer,
  onOpenNotifications,
  hasUnreadNotifications = true,
}: AnimatedWaveHeaderProps) {
  const { corPrimaria, corTextoPrimaria } = useBrandTheme();
  const nomeExibicao = (userName || USER_PROFILE_MOCK.nome).trim();
  const primeiroNome = nomeExibicao.split(/\s+/)[0] || "Rodrigo";
  const iniciais = primeiroNome.substring(0, 2).toUpperCase();

  return (
    <header className="absolute top-0 left-0 right-0 z-30 w-full h-[84px] sm:h-[90px] overflow-hidden pointer-events-none select-none">
      {/* 1. CAMADA DE FUNDO SUPERDIMENSIONADA COM CURVATURA EM ARCO NA BASE (-25% REDUZIDO) */}
      <div
        style={{
          backgroundColor: corPrimaria || "#FFDE00",
          borderBottomLeftRadius: "50%",
          borderBottomRightRadius: "50%",
        }}
        className="absolute -top-[96px] sm:-top-[100px] left-1/2 -translate-x-1/2 w-[160%] h-[175px] sm:h-[185px] shadow-[0_8px_20px_rgba(0,0,0,0.12)] pointer-events-auto transition-colors duration-300"
      />

      {/* 2. CONTEÚDO (FOREGROUND) RESPEITANDO A SAFE AREA E PROPORÇÃO COMPACTA */}
      <div className="relative z-10 w-full pt-[max(0.45rem,env(safe-area-inset-top))] px-4 sm:px-5 flex items-center justify-between pointer-events-auto">
        {/* Esquerda: Avatar Redondo e Textos Alinhados Verticalmente */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="group relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-black/15 shadow-sm active:scale-95 transition-transform cursor-pointer bg-slate-900 text-amber-400 flex items-center justify-center font-black text-[11px] shrink-0"
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

          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800/80 leading-none mb-0.5">
              PARTIU
            </span>
            <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight text-slate-950">
              Olá, {primeiroNome}!
            </h1>
          </div>
        </div>

        {/* Direita: Ícone Circular do Sino com Badge Vermelha */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 active:scale-95 transition-all text-slate-950 flex items-center justify-center cursor-pointer shrink-0 border border-black/10 shadow-2xs"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="w-4 h-4 stroke-[2.3]" />

          {hasUnreadNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full ring-2 ring-[#FFDE00] animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
}
