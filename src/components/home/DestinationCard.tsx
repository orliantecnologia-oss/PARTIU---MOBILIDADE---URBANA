import React, { memo, useCallback } from "react";
import { Search, Clock, ChevronRight, ArrowRight, MapPin } from "lucide-react";
import type { RecentAddressItem } from "./home-mock-data";
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
      className="w-full py-2 px-1.5 flex items-center gap-3 hover:bg-slate-50 rounded-xl transition active:scale-[0.99] cursor-pointer group text-left"
    >
      <div className="w-7 h-7 rounded-full bg-slate-100 text-[#64748B] group-hover:bg-blue-50 group-hover:text-[#0088FF] flex items-center justify-center shrink-0 transition-colors">
        <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-xs sm:text-[13px] font-medium text-slate-900 block truncate leading-tight">
          {item.titulo}
        </span>
        <span className="text-[10.5px] sm:text-[11px] font-normal text-[#64748B] group-hover:text-slate-600 block truncate mt-0.5 transition-colors">
          {item.endereco}
        </span>
      </div>

      <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-slate-800 shrink-0 transition-colors" />
    </button>
  );
});

export const DestinationCard = memo(function DestinationCard({
  onSearchClick,
  onAdjustPinOnMap,
  onSelectAddress,
  recentAddresses = [],
}: DestinationCardProps) {
  // Exibe estritamente o histórico real do usuário (Zero dados fictícios)
  const itensHistorico =
    recentAddresses && recentAddresses.length > 0
      ? recentAddresses.slice(0, 2)
      : [];

  const handleSearch = useCallback(() => {
    hapticFeedback.light();
    onSearchClick();
  }, [onSearchClick]);

  const handleAdjustPin = useCallback(() => {
    hapticFeedback.light();
    onAdjustPinOnMap?.();
  }, [onAdjustPinOnMap]);

  return (
    <div className="w-full z-20 pointer-events-auto">
      <div className="bg-white rounded-3xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] border border-slate-100 p-3 sm:p-3.5 space-y-2 text-left">
        {/* 1. CAMPO DE BUSCA "PARA ONDE VAMOS?" (COMPACTO E PROEMINENTE ESTILO 99/UBER) */}
        <button
          type="button"
          onClick={handleSearch}
          className="group w-full h-12 sm:h-12.5 px-3.5 sm:px-4 rounded-2xl bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 flex items-center gap-3 transition-all duration-200 active:scale-[0.99] cursor-pointer text-left shadow-2xs"
          aria-label="Para onde vamos? Buscar endereços"
        >
          <div
            className="w-8 h-8 rounded-xl bg-[#0088FF] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-sm sm:text-[15px] font-semibold text-slate-900 block truncate">
              Para onde vamos?
            </span>
          </div>

          <div className="w-6 h-6 rounded-full bg-white text-slate-400 group-hover:text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
            <ArrowRight className="w-3 h-3 stroke-[2.5]" />
          </div>
        </button>

        {/* 2. HISTÓRICO REAL OU BOTÃO RÁPIDO PARA ESCOLHER NO MAPA */}
        {itensHistorico.length > 0 ? (
          <div className="divide-y divide-slate-100/90 pt-0.5">
            {itensHistorico.map((item) => (
              <RecentAddressItemRow
                key={item.id}
                item={item}
                onSelect={onSelectAddress}
              />
            ))}
          </div>
        ) : onAdjustPinOnMap ? (
          <button
            type="button"
            onClick={handleAdjustPin}
            className="w-full py-1.5 px-2 flex items-center justify-between text-xs text-slate-500 hover:text-blue-700 hover:bg-blue-50/50 rounded-xl transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-semibold text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Escolher destino no mapa</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : null}
      </div>
    </div>
  );
});



