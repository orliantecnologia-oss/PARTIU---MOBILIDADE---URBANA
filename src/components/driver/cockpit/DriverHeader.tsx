import { Menu, Volume2, VolumeX, Bell } from "lucide-react";
import { PartiuLogo } from "@/components/common/PartiuLogo";

interface DriverHeaderProps {
  isOnline: boolean;
  somAtivo: boolean;
  onToggleSom: () => void;
  onOpenMenu: () => void;
  onOpenNotifications?: () => void;
  unreadNotifications?: boolean;
}

export function DriverHeader({
  isOnline,
  somAtivo,
  onToggleSom,
  onOpenMenu,
  onOpenNotifications,
  unreadNotifications = false,
}: DriverHeaderProps) {
  return (
    <header className="absolute top-0 inset-x-0 z-30 pt-[max(0.6rem,env(safe-area-inset-top))] px-3 pb-2 pointer-events-none">
      <div className="flex items-center justify-between pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs max-w-lg mx-auto">
        {/* Menu Hambúrguer / Perfil */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
          aria-label="Abrir menu do motorista"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo PARTIU Centralizado */}
        <div className="flex items-center justify-center">
          <PartiuLogo variant="full" size="md" />
        </div>

        {/* Status Operacional GPS + Ações Rápidas */}
        <div className="flex items-center gap-1.5">
          {/* Indicador de Status GPS (Discreto e Operacional) */}
          <div
            className={`hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
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

          {/* Notificações Operacionais */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition relative cursor-pointer"
            aria-label="Notificações"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-primary-vibrant" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
