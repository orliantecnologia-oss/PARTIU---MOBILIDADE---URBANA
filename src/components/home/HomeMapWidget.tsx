import React from "react";
import { MapPin } from "lucide-react";
import { PartiuRideMap } from "@/components/maps/PartiuRideMap";

export interface HomeMapWidgetProps {
  origemEndereco?: string;
  origemCoords?: [number, number];
}

// Coordenadas padrão em Itaperuna, RJ para testes
const ITAPERUNA_MOCK_COORDS: [number, number] = [-41.8880, -21.2050];

export function HomeMapWidget({
  origemEndereco = "Rua Amadeu Tinoco Lacerda, 492 - Centro",
  origemCoords = ITAPERUNA_MOCK_COORDS,
}: HomeMapWidgetProps) {
  return (
    <div className="w-full max-w-md mx-auto px-3.5 sm:px-4 z-10 pointer-events-auto flex-1 min-h-[160px] flex flex-col">
      {/* Container Retangular com Bordas Arredondadas e Margens Laterais (Padrão Uber) */}
      <div className="w-full h-full min-h-[160px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm relative bg-slate-100">
        <PartiuRideMap
          status="IDLE"
          modalidade="POP"
          origemEndereco={origemEndereco}
          origemCoords={origemCoords}
          hideRecenter={true}
        />

        {/* Indicador de Localização Atual no Mapa */}
        <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1.5 border border-black/5 pointer-events-none z-10">
          <MapPin className="w-3.5 h-3.5 text-primary-600 fill-amber-500 shrink-0" />
          <span className="text-[10.5px] font-bold text-slate-800">
            Itaperuna, RJ
          </span>
        </div>
      </div>
    </div>
  );
}
