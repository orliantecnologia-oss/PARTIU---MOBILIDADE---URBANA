import React from "react";
import { Bell } from "lucide-react";
import { USER_PROFILE_MOCK } from "./home-mock-data";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export interface HomeHeaderProps {
  userName?: string;
  avatarUrl?: string;
  onOpenDrawer: () => void;
  onOpenNotifications: () => void;
  hasUnreadNotifications?: boolean;
}

export function HomeHeader({
  userName,
  avatarUrl = USER_PROFILE_MOCK.avatarUrl,
  onOpenDrawer,
  onOpenNotifications,
  hasUnreadNotifications = true,
}: HomeHeaderProps) {
  const { corPrimaria, corTextoPrimaria } = useBrandTheme();
  const nomeExibicao = (userName || USER_PROFILE_MOCK.nome).trim();
  const primeiroNome = nomeExibicao.split(/\s+/)[0] || "Rodrigo";
  const iniciais = primeiroNome.substring(0, 2).toUpperCase();

  return (
    <header
      style={{
        backgroundColor: corPrimaria || "#FFDE00",
        color: corTextoPrimaria || "#0F172A",
      }}
      className="sticky top-0 z-30 w-full px-3.5 py-1.5 sm:py-2 rounded-b-2xl shadow-xs border-b border-black/5 flex items-center justify-between transition-all shrink-0"
    >
      {/* Esquerda: Avatar redondo compacto (gatilho do Drawer) e Saudação "Olá, Rodrigo!" */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenDrawer}
          className="group relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-black/10 shadow-xs active:scale-95 transition cursor-pointer bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xs shrink-0"
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
          <span className="text-[9px] font-black uppercase tracking-wider opacity-70 leading-none mb-0.5">
            Partiu
          </span>
          <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight text-slate-950">
            Olá, {primeiroNome}!
          </h1>
        </div>
      </div>

      {/* Direita: Ícone de Notificações com contorno circular moderno (Estritamente Sino) */}
      <button
        type="button"
        onClick={onOpenNotifications}
        className="relative w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 text-slate-950 flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0 border border-black/5"
        aria-label="Notificações"
        title="Notificações"
      >
        <Bell className="w-4.5 h-4.5 stroke-[2.4]" />
        {hasUnreadNotifications && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-amber-300 animate-pulse" />
        )}
      </button>
    </header>
  );
}
