import React from "react";
import { MapPin, ArrowLeft, Check, Sparkles, Loader2 } from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export function PassengerConfirmPickupPin() {
  const {
    origem,
    backToReviewRoute,
    confirmPickupPin,
    categoriaVeiculo,
    isResolvingAddress,
    smartPickups,
    selectStrategicPickup,
  } = usePassengerRide();

  const { corPrimaria, corTextoPrimaria } = useBrandTheme();

  return (
    <>
      {/* 1. PINO CENTRAL FLUTUANTE NO MAPA COM PULSO */}
      <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center -translate-y-8">
        <div className="relative flex flex-col items-center animate-bounce duration-1000">
          {/* Label Chamativo */}
          <div className="px-3.5 py-1.5 rounded-full bg-slate-950/90 text-white text-[11px] font-black shadow-xl border border-white/20 mb-1 flex items-center gap-1.5 backdrop-blur-xs whitespace-nowrap">
            {isResolvingAddress ? (
              <>
                <Loader2 className="w-3 h-3 text-primary-600 animate-spin" />
                <span>Identificando rua...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-primary-600 animate-ping" />
                <span>Ponto de encontro do {categoriaVeiculo === "MOTO" ? "motoboy" : "motorista"}</span>
              </>
            )}
          </div>

          {/* Pino estilizado */}
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary-700 to-primary-500 text-white flex items-center justify-center shadow-2xl border-2 border-white">
            <MapPin className="w-6 h-6 stroke-[2.5] text-white" />
          </div>

          {/* Sombra de projeção no solo */}
          <div className="w-4 h-1.5 bg-black/30 rounded-full blur-[1px] mt-0.5" />
        </div>
      </div>

      {/* 2. CARD INFERIOR FLUTUANTE COM AÇÃO DE CONFIRMAÇÃO */}
      <div
        data-hide-bottom-nav="true"
        className="w-full max-w-md mx-auto px-4 pb-5 z-20 animate-in slide-in-from-bottom duration-300 mt-auto"
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-4 sm:p-5 space-y-3 text-left backdrop-blur-md">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={backToReviewRoute}
              className="p-2 -ml-1 text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              aria-label="Voltar para opções de viagem"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary-700 block">
                Local de Embarque Selecionado
              </span>
              <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {isResolvingAddress ? "Localizando endereço exato..." : origem}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Arraste o mapa para posicionar o pino na calçada onde você estará aguardando.
          </p>

          {/* Chips de Atalhos de Pontos Estratégicos Próximos */}
          {smartPickups && smartPickups.length > 0 && (
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>Pontos Recomendados Próximos</span>
                <span className="text-emerald-700 font-bold">Calçadas amplas</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {smartPickups.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectStrategicPickup(p)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer border ${
                      origem === p.nome
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200"
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-primary-600" />
                    <span className="truncate max-w-[130px]">{p.nome.split(" x ")[0]}</span>
                    <span className="text-[10px] opacity-75">~{p.distanciaMetros}m</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={confirmPickupPin}
            style={{
              background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
              color: "#FFFFFF",
              borderRadius: 16,
              boxShadow: "0 8px 24px -4px rgba(0, 51, 102, 0.35), 0 4px 12px -2px rgba(0, 136, 255, 0.25)",
            }}
            className="w-full py-3.5 px-4 font-bold text-sm sm:text-base active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer hover:brightness-105"
          >
            <Check className="w-5 h-5 stroke-[2.5] text-white" />
            <span>Confirmar Este Ponto de Embarque</span>
          </button>
        </div>
      </div>
    </>
  );
}
