import React, { memo, useCallback } from "react";
import { Search, Clock, ChevronRight, ArrowRight } from "lucide-react";
import { RecentAddressItem, RECENT_SEARCH_MOCKS } from "./home-mock-data";
import { hapticFeedback } from "@/lib/haptics/haptic-feedback";

export interface DestinationCardProps {
  onSearchClick: () => void;
  onEditPickupClick?: () => void;
  onAdjustPinOnMap?: () => void;
  onSelectAddress?: (item: RecentAddressItem) => void;
  onSelectCasa?: () => void;
  onSelectTrabalho?: () => void;
  recentAddresses?: RecentAddressItem[];
  currentAddress?: string;
  userAccuracyMeters?: number | null;
}

/** Componente de item de histórico 100% puro e memorizado */
const RecentAddressItemRow = memo(function RecentAddressItemRow({
  item,
  onSelect,
}: {
  item: RecentAddressItem;
  onSelect?: (item: RecentAddressItem) => void;
}) {
  const handleClick = useCallback(() => {
    hapticFeedback.light();
    onSelect?.(item);
  }, [item, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full py-2 px-1.5 flex items-center gap-3 hover:bg-slate-50/90 rounded-xl transition active:scale-[0.99] cursor-pointer group text-left"
    >
      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-slate-900 flex items-center justify-center shrink-0 transition-colors">
        <Clock className="w-3.5 h-3.5 stroke-[2.4]" />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-xs sm:text-[13px] font-bold text-slate-900 block truncate leading-tight">
          {item.titulo}
        </span>
        <span className="text-[10.5px] sm:text-[11px] text-slate-400 group-hover:text-slate-600 block truncate mt-0.5 transition-colors">
          {item.endereco}
        </span>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0 transition-colors" />
    </button>
  );
});

export const DestinationCard = memo(function DestinationCard({
  onSearchClick,
  onSelectAddress,
  recentAddresses = [],
}: DestinationCardProps) {
  // Exibe estritamente os últimos 2 endereços do histórico (ou os 2 mais frequentes de Itaperuna)
  const itensHistorico =
    recentAddresses && recentAddresses.length > 0
      ? recentAddresses.slice(0, 2)
      : RECENT_SEARCH_MOCKS.slice(0, 2);

  const handleSearch = useCallback(() => {
    hapticFeedback.light();
    onSearchClick();
  }, [onSearchClick]);

  return (
    <div className="w-full z-20 pointer-events-auto">
      <div className="bg-white/98 backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 p-3 sm:p-3.5 space-y-2 text-left">
        {/* 1. CAMPO DE BUSCA "PARA ONDE VAMOS?" (COMPACTO E PROEMINENTE ESTILO 99) */}
        <button
          type="button"
          onClick={handleSearch}
          className="group w-full h-12 sm:h-12.5 px-3.5 sm:px-4 rounded-2xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 flex items-center gap-3 transition-all duration-200 active:scale-[0.99] cursor-pointer text-left shadow-2xs"
          aria-label="Para onde vamos? Buscar endereços"
        >
          <div className="w-8 h-8 rounded-xl bg-primary-600 group-hover:bg-primary-700 text-white flex items-center justify-center font-black shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            <Search className="w-4 h-4 stroke-[2.8]" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-sm sm:text-[15px] font-black text-slate-900 block truncate">
              Para onde vamos?
            </span>
          </div>

          <div className="w-6 h-6 rounded-full bg-white text-slate-400 group-hover:text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
            <ArrowRight className="w-3 h-3 stroke-[2.5]" />
          </div>
        </button>

        {/* 2. PEQUENO HISTÓRICO DOS ÚLTIMOS DOIS ENDEREÇOS */}
        {itensHistorico.length > 0 && (
          <div className="divide-y divide-slate-100/90 pt-0.5">
            {itensHistorico.map((item) => (
              <RecentAddressItemRow
                key={item.id}
                item={item}
                onSelect={onSelectAddress}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});


