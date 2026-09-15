import { MessageCircle, Compass, MapPin, KeyRound, UserX, RotateCcw, Package, CheckCircle2 } from "lucide-react";
import type { ReturnDetails } from "@/lib/delivery";

interface InTripStateProps {
  passageiroNome: string;
  destinoEndereco: string;
  distanciaKm: number;
  valorLiquido: number;
  isEntrega: boolean;
  emDevolucao: boolean;
  returnDetails: ReturnDetails | null;
  currentStopNumber: number;
  driverUnreadCount: number;
  onConcluirCorrida: () => void;
  onOpenPinNumpadDropoff: () => void;
  onOpenDevolucao: () => void;
  onOpenReturnFinalizar: () => void;
  onOpenChat: () => void;
  onNavegar: (provedor: "waze" | "google_maps") => void;
}

export function InTripState({
  passageiroNome,
  destinoEndereco,
  distanciaKm,
  valorLiquido,
  isEntrega,
  emDevolucao,
  returnDetails,
  currentStopNumber,
  driverUnreadCount,
  onConcluirCorrida,
  onOpenPinNumpadDropoff,
  onOpenDevolucao,
  onOpenReturnFinalizar,
  onOpenChat,
  onNavegar,
}: InTripStateProps) {
  // Caso de Devolução Reversa da Entrega
  if (isEntrega && emDevolucao) {
    return (
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between border-b border-rose-100 pb-2.5">
          <div className="flex items-center gap-1.5 text-rose-700 font-black text-xs uppercase tracking-wider">
            <RotateCcw className="w-4 h-4 text-rose-600 animate-spin" />
            <span>Devolução Reversa ao Remetente</span>
          </div>
          <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
            +R$ {returnDetails?.driverReturnCompensationBrl.toFixed(2) || "15,50"}
          </span>
        </div>

        <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-1 text-xs">
          <span className="text-[10px] font-black uppercase text-rose-800 block">
            Ponto de Retorno (Remetente):
          </span>
          <p className="font-black text-slate-950 truncate">{destinoEndereco}</p>
          <p className="text-[11px] text-slate-600">
            Devolver pacote para: <strong>{passageiroNome}</strong>
          </p>
        </div>

        {/* Navegação Externa para Devolução */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onNavegar("waze")}
            className="h-11 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-950 border border-sky-200 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Compass className="w-4 h-4 text-sky-600" />
            <span>Waze</span>
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

        <button
          type="button"
          onClick={onOpenReturnFinalizar}
          className="w-full h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-xl transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Package className="w-5 h-5" />
          <span>CHEGUEI AO REMETENTE • FINALIZAR DEVOLUÇÃO</span>
        </button>
      </div>
    );
  }

  // Viagem Normal (Carro, Moto ou Entrega Flash em Rota)
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom duration-300">
      {/* Cabeçalho da Viagem & Valor a Receber */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="min-w-0 flex-1 pr-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider inline-block bg-brand-soft text-brand-primary-deep border-brand-border-active">
            {isEntrega
              ? `● Rota de Entrega ${currentStopNumber > 1 ? `(Parada ${currentStopNumber})` : ""}`
              : "● Viagem em Andamento"}
          </span>
          <h3 className="text-base font-black text-slate-950 mt-1 truncate">
            {passageiroNome}
          </h3>
          <span className="text-xs text-slate-500 truncate block mt-0.5">
            Destino: {destinoEndereco}
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenChat}
            className="relative w-11 h-11 rounded-xl bg-brand-primary-vibrant text-slate-950 flex items-center justify-center active:scale-90 transition shadow-xs cursor-pointer"
            title="Abrir Chat Operacional"
            aria-label={`Abrir chat operacional${driverUnreadCount > 0 ? ` (${driverUnreadCount} não lidas)` : ""}`}
          >
            <MessageCircle className="w-5 h-5 text-slate-950" />
            {driverUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-black border-2 border-white shadow-xs animate-pulse">
                {driverUnreadCount > 9 ? "9+" : driverUnreadCount}
              </span>
            )}
          </button>

          <div className="text-right">
            <div className="text-xl sm:text-2xl font-black text-brand-primary-deep leading-none">
              {valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <span className="text-[10px] font-bold text-brand-primary-vibrant">
              {distanciaKm} km • D+0 PIX
            </span>
          </div>
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

      {/* Ações de Conclusão */}
      {isEntrega ? (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {/* Exceção: Destinatário não localizado */}
            <button
              type="button"
              onClick={onOpenDevolucao}
              className="h-14 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer text-center px-2"
            >
              <UserX className="w-4 h-4 shrink-0 text-amber-700" />
              <span>Destinatário Ausente?</span>
            </button>

            {/* Normal: Finalizar com PIN 2 de Entrega */}
            <button
              type="button"
              onClick={onOpenPinNumpadDropoff}
              className="h-14 rounded-2xl bg-brand-primary-vibrant hover:brightness-105 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer text-center px-2"
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>FINALIZAR COM PIN 2</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 font-medium text-center">
            Exige PIN de 4 dígitos informado pelo destinatário para liberar repasse D+0
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onConcluirCorrida}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-brand-primary-vibrant to-brand-primary-deep text-slate-950 font-black text-sm shadow-xl transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer hover:brightness-105"
        >
          <span>🏁 FINALIZAR CORRIDA &amp; RECEBER PIX D+0</span>
        </button>
      )}
    </div>
  );
}
