import React from "react";
import { ArrowLeft, Check, Loader2, MapPin } from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export function PassengerConfirmDestinationPin() {
  const {
    destino,
    destinoCoords,
    isResolvingAddress,
    backFromDestinationMapPin,
    confirmDestinationPin,
  } = usePassengerRide();

  const { corPrimaria, corTextoPrimaria } = useBrandTheme();

  return (
    <>
      {/* 1. PINO CENTRAL FLUTUANTE NO CENTRO EXATO DA TELA */}
      <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center -translate-y-8">
        <div className="relative flex flex-col items-center animate-bounce duration-1000">
          <div className="px-3.5 py-1.5 rounded-full bg-slate-950/90 text-white text-[11px] font-black shadow-xl border border-white/20 mb-1 flex items-center gap-1.5 backdrop-blur-xs whitespace-nowrap">
            {isResolvingAddress ? (
              <>
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <span>Identificando rua...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Arraste o mapa até o destino</span>
              </>
            )}
          </div>

          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-amber-400/30">
            <MapPin className="w-6 h-6 stroke-[2.6]" />
          </div>
          <div className="w-4 h-1.5 bg-black/30 rounded-full blur-[1px] mt-0.5" />
        </div>
      </div>

      {/* 2. CARD INFERIOR FLUTUANTE COM AÇÃO DE CONFIRMAÇÃO */}
      <div
        data-hide-bottom-nav="true"
        className="w-full max-w-md mx-auto px-4 pb-5 z-20 animate-in slide-in-from-bottom duration-300 mt-auto pointer-events-auto"
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-4 sm:p-5 space-y-3.5 text-left backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={backFromDestinationMapPin}
              className="p-2 -ml-1 text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer active:scale-95"
              aria-label="Voltar para a busca"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
            </button>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">
                Destino Selecionado no Mapa
              </span>
              <p className="text-xs sm:text-sm font-black text-slate-900 truncate mt-0.5">
                {isResolvingAddress ? "Localizando endereço exato..." : (destino || "Ponto selecionado no mapa")}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Mova e amplie o mapa livremente. O pino central marca exatamente o seu local de desembarque.
          </p>

          <button
            type="button"
            onClick={() => confirmDestinationPin(destinoCoords, destino)}
            disabled={isResolvingAddress}
            style={{
              backgroundColor: corPrimaria || "#FFDE00",
              color: corTextoPrimaria || "#0F172A",
            }}
            className="w-full py-4 rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>Confirmar este local</span>
          </button>
        </div>
      </div>
    </>
  );
}