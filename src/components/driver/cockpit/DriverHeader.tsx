import React from "react";
import { Menu, Volume2, VolumeX, Bell } from "lucide-react";
import { PartiuLogo } from "@/components/common/PartiuLogo";

export interface DriverHeaderProps {
  isOnline: boolean;
  somAtivo: boolean;
  onToggleSom: () => void;
  onOpenMenu: () => void;
  onOpenProfile?: () => void;
  driverAvatarUrl?: string | null;
  driverName?: string;
  onOpenNotifications?: () => void;
  unreadNotifications?: boolean;
  unreadCount?: number;
}

export function DriverHeader({
  isOnline,
  somAtivo,
  onToggleSom,
  onOpenMenu,
  onOpenProfile,
  driverAvatarUrl,
  driverName = "Motorista",
  onOpenNotifications,
  unreadNotifications = false,
  unreadCount = 0,
}: DriverHeaderProps) {
  const driverInitials = (driverName || "Motorista")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hasUnread = unreadCount > 0 || unreadNotifications;

  return (
    <header className="absolute top-0 inset-x-0 z-30 pt-[max(0.6rem,env(safe-area-inset-top))] px-3 pb-2 pointer-events-none">
      <div className="flex items-center justify-between pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-200/80 shadow-xs max-w-lg mx-auto">
        {/* ================================================================= */}
        {/* ESQUERDA: AVATAR DO MOTORISTA (PERFIL) + BOTÃO DE MENU LATERAL     */}
        {/* ================================================================= */}
        <div className="flex items-center gap-1.5">
          {/* Avatar Circular Clicável (Acesso Rápido ao Perfil e Veículo) */}
          <button
            type="button"
            onClick={onOpenProfile || onOpenMenu}
            className="w-9 h-9 rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer shadow-xs hover:ring-2 hover:ring-brand-primary-vibrant/40 active:scale-95 transition-all"
            aria-label="Abrir Perfil do Motorista"
            title="Editar Perfil e Veículo"
          >
            {driverAvatarUrl ? (
              <img
                src={driverAvatarUrl}
                alt={driverName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-brand-primary-deep text-[11px] font-black tracking-tight">
                {driverInitials}
              </span>
            )}
          </button>

          {/* Menu Hambúrguer */}
          <button
            type="button"
            onClick={onOpenMenu}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            aria-label="Abrir menu do motorista"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* CENTRO: LOGOTIPO PARTIU OFICIAL                                  */}
        {/* ================================================================= */}
        <div className="flex items-center justify-center">
          <PartiuLogo variant="full" size="md" />
        </div>

        {/* ================================================================= */}
        {/* DIREITA: STATUS OPERACIONAL GPS + SOM + SINO NOTIFICAÇÕES         */}
        {/* ================================================================= */}
        <div className="flex items-center gap-1">
          {/* Indicador de Status GPS */}
          <div
            className={`hidden xs:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              isOnline
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}
            title={isOnline ? "GPS e Telemetria Conectados" : "Operação Offline"}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            <span>{isOnline ? "GPS Conectado" : "Offline"}</span>
          </div>

          {/* Controle de Áudio do Radar */}
          <button
            type="button"
            onClick={onToggleSom}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-90 cursor-pointer ${
              somAtivo
                ? "text-brand-primary-vibrant hover:bg-blue-50"
                : "text-slate-400 hover:bg-slate-100"
            }`}
            title={somAtivo ? "Som ativado" : "Som silenciado"}
            aria-label="Controle de áudio"
          >
            {somAtivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Sino de Notificações com Badge Numérico Vermelho em Tempo Real */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition relative cursor-pointer"
            aria-label="Central de Notificações"
            title="Central de Notificações"
          >
            <Bell className="w-4.5 h-4.5" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white animate-pulse">
                {unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : ""}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export default DriverHeader;
