import { MessageCircle, Phone, Compass, MapPin, AlertTriangle, Navigation } from "lucide-react";

interface HeadingToPickupStateProps {
  passageiroNome: string;
  origemEndereco: string;
  isEntrega: boolean;
  driverUnreadCount: number;
  onChegueiAoLocal: () => void;
  onOpenChat: () => void;
  onLigar: () => void;
  onNavegar: (provedor: "waze" | "google_maps") => void;
  onOpenCancelar: () => void;
}

export function HeadingToPickupState({
  passageiroNome,
  origemEndereco,
  isEntrega,
  driverUnreadCount,
  onChegueiAoLocal,
  onOpenChat,
  onLigar,
  onNavegar,
  onOpenCancelar,
}: HeadingToPickupStateProps) {
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom duration-300">
      {/* Cabeçalho da Viagem & Contatos Rápidos */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="min-w-0 flex-1 pr-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider inline-block bg-brand-soft text-brand-primary-deep border-brand-border-active">
            {isEntrega ? "● A Caminho da Coleta" : "● A Caminho do Embarque"}
          </span>
          <h3 className="text-base font-black text-slate-950 mt-1 truncate">
            {passageiroNome}
          </h3>
          <span className="text-xs text-slate-500 truncate block mt-0.5">
            {origemEndereco}
          </span>
        </div>

        {/* Botões de Contato Rápido (Chat Seguro + Ligação) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenChat}
            className="relative w-11 h-11 rounded-2xl bg-brand-primary-vibrant text-slate-950 flex items-center justify-center active:scale-90 transition shadow-xs cursor-pointer"
            title="Abrir Chat Operacional Seguro"
            aria-label={`Abrir chat operacional${driverUnreadCount > 0 ? ` (${driverUnreadCount} não lidas)` : ""}`}
          >
            <MessageCircle className="w-5 h-5 text-slate-950" />
            {driverUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-black border-2 border-white shadow-xs animate-pulse">
                {driverUnreadCount > 9 ? "9+" : driverUnreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onLigar}
            className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center active:scale-90 transition shadow-xs hover:bg-slate-200 cursor-pointer"
            title="Ligar para o passageiro"
            aria-label="Ligar para o passageiro"
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Atalhos Rápidos de Navegação Externa (Waze & Google Maps) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onNavegar("waze")}
          className="h-11 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-950 border border-sky-200 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Compass className="w-4 h-4 text-sky-600" />
          <span>Navegar no Waze</span>
        </button>
        <button
          type="button"
          onClick={() => onNavegar("google_maps")}
          className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <MapPin className="w-4 h-4 text-brand-primary-vibrant" />
          <span>Google Maps</span>
        </button>
      </div>

      {/* Botão Primário de Chegada (56px Touch Target) */}
      <button
        type="button"
        onClick={onChegueiAoLocal}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-brand-primary-vibrant to-brand-primary-deep text-slate-950 font-black text-sm shadow-xl transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer hover:brightness-105"
      >
        <span>✓ CHEGUEI AO LOCAL DE EMBARQUE</span>
      </button>

      {/* Opção Secundária: Cancelamento Justificado */}
      <div className="pt-0.5 flex justify-center">
        <button
          type="button"
          onClick={onOpenCancelar}
          className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1.5 py-1 px-3 rounded-lg transition active:scale-95 cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
          <span>Problemas com o embarque? Cancelar corrida</span>
        </button>
      </div>
    </div>
  );
}
