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
        background: "linear-gradient(180deg, #0088FF 0%, #003366 100%)",
        color: "#FFFFFF",
      }}
      className="sticky top-0 z-30 w-full px-3.5 py-2 sm:py-2.5 rounded-b-2xl shadow-lg flex items-center justify-between transition-all shrink-0"
    >
      {/* Esquerda: Avatar redondo compacto (gatilho do Drawer) e Saudação "Olá, Rodrigo!" */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenDrawer}
          className="group relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/60 shadow-xs active:scale-95 transition cursor-pointer bg-white/20 text-white flex items-center justify-center font-black text-xs shrink-0"
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
          <span className="text-[9px] font-black uppercase tracking-wider text-white/70 leading-none mb-0.5">
            Partiu
          </span>
          <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight text-white">
            Olá, {primeiroNome}!
          </h1>
        </div>
      </div>

      {/* Direita: Ícone de Notificações */}
      <button
        type="button"
        onClick={onOpenNotifications}
        className="relative w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0"
        aria-label="Notificações"
        title="Notificações"
      >
        <Bell className="w-4.5 h-4.5 stroke-[2.4] text-white" />
        {hasUnreadNotifications && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-[#0088FF] animate-pulse" />
        )}
      </button>
    </header>
  );
}
