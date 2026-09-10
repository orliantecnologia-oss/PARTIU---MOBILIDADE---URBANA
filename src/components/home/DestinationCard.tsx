import React from "react";
import { Search, Clock, ChevronRight } from "lucide-react";
import { RecentAddressItem, RECENT_SEARCH_MOCKS } from "./home-mock-data";

export interface DestinationCardProps {
  onSearchClick: () => void;
  onEditPickupClick?: () => void;
  onAdjustPinOnMap?: () => void;
  onSelectAddress?: (item: RecentAddressItem) => void;
  recentAddresses?: RecentAddressItem[];
  currentAddress?: string;
  userAccuracyMeters?: number | null;
}

export function DestinationCard({
  onSearchClick,
  onEditPickupClick,
  onAdjustPinOnMap,
  onSelectAddress,
  recentAddresses = [],
  currentAddress,
  userAccuracyMeters,
}: DestinationCardProps) {
  // Limita estritamente a no máximo 2 itens rápidos
  const itensRapidos = (recentAddresses || []).slice(0, 2);

  return (
    <div className="w-full z-20 pointer-events-auto">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-3.5 sm:p-4 space-y-2.5 text-left">
        
        {/* Local de Embarque Atual (Identificado pelo GPS em tempo real ou personalizado) */}
        <div className="flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-950 shadow-2xs">
          <button
            type="button"
            onClick={onEditPickupClick || onSearchClick}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer text-left group bg-transparent border-0 p-0"
            title="Clique para editar seu endereço de embarque"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ring-4 ring-emerald-200/70" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 block leading-none">
                  Local de Embarque
                </span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-md">
                  {userAccuracyMeters && userAccuracyMeters > 35 ? "Rede / IP" : "GPS"}
                </span>
              </div>
              <span className="font-bold text-slate-900 block truncate text-xs sm:text-[13px] group-hover:text-emerald-700 transition-colors">
                {currentAddress && currentAddress !== "Meu Local Atual"
                  ? currentAddress
                  : "Definir endereço de embarque..."}
              </span>
              {userAccuracyMeters && userAccuracyMeters > 35 && (
                <span className="text-[10px] text-amber-800 font-semibold block truncate">
                  Local aproximado • Toque para rua exata
                </span>
              )}
            </div>
          </button>

          {onAdjustPinOnMap && (
            <button
              type="button"
              onClick={onAdjustPinOnMap}
              className="px-2.5 py-1.5 text-[11px] font-black bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 rounded-xl transition shadow-2xs cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
              title="Ajustar ponto exato no mapa"
            >
              <span>Ajustar no mapa</span>
            </button>
          )}
        </div>

        {/* Input Principal: Botão estilizado como campo de busca com lupa (área de toque maximizada) */}
        <button
          type="button"
          onClick={onSearchClick}
          className="group w-full h-12 sm:h-13 px-3.5 sm:px-4 rounded-2xl bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 flex items-center gap-3 transition-all duration-200 active:scale-[0.99] cursor-pointer text-left shadow-2xs"
          aria-label="Para onde vamos? Buscar endereços"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-400 group-hover:bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            <Search className="w-4 h-4 stroke-[2.8]" />
          </div>

          <span className="text-sm sm:text-[15px] font-black text-slate-900 block flex-1 truncate">
            Para onde vamos?
          </span>
        </button>

        {/* Lista de Atalhos Recentes: exibida apenas se houver histórico real */}
        {itensRapidos.length > 0 && (
          <div className="divide-y divide-slate-100/80 pt-0.5">
            {itensRapidos.slice(0, 2).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectAddress?.(item)}
                className="w-full py-2 px-1 flex items-center gap-3 hover:bg-slate-50/80 rounded-xl transition active:scale-[0.99] cursor-pointer group text-left"
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-amber-100 text-slate-600 group-hover:text-slate-950 flex items-center justify-center shrink-0 transition-colors">
                  <Clock className="w-3.5 h-3.5 stroke-[2.4]" />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-xs sm:text-[13px] font-bold text-slate-900 block truncate leading-tight">
                    {item.titulo}
                  </span>
                  <span className="text-[10.5px] sm:text-[11px] text-slate-500 group-hover:text-slate-700 font-normal block truncate mt-0.5">
                    {item.endereco}
                  </span>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
