import React, { memo, useCallback } from "react";
import { Search, Clock, ChevronRight, MapPin } from "lucide-react";
import type { RecentAddressItem } from "./home-mock-data";
import { RECENT_SEARCH_MOCKS } from "./home-mock-data";
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

/** Item de endereço recente memorizado com 100% de paridade com 2.png */
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
      className="w-full py-3 px-1 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/80 rounded-xl transition active:scale-[0.99] cursor-pointer group text-left"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 shrink-0 group-hover:text-[#0088FF] transition-colors">
          <Clock className="w-5 h-5 stroke-[2]" />
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-slate-900 block truncate leading-tight">
            {item.titulo}
          </span>
          <span className="text-xs font-normal text-slate-500 block truncate mt-0.5">
            {item.endereco}
          </span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 shrink-0 transition-colors ml-2" />
    </button>
  );
});

/**
 * 📍 DESTINATION CARD — HOME DO PASSAGEIRO
 * ==============================================================================
 * Alinhado com 100% de fidelidade estética e estrutural com Lealt Recomendado/2.png:
 * 1. Superfície com cantos superiores arredondados rounded-t-[32px]
 * 2. Drag Handle central cinza
 * 3. Pílula de Busca "Para onde vamos?" com botão circular azul (#0088FF)
 * 4. Cabeçalho "Destinos recentes" com link "Ver todos >"
 * 5. Lista de endereços recentes com ícone de relógio e chevron
 * ==============================================================================
 */
export const DestinationCard = memo(function DestinationCard({
  onSearchClick,
  onAdjustPinOnMap,
  onSelectAddress,
  recentAddresses = [],
}: DestinationCardProps) {
  // Itens de histórico reais ou os oficiais de demonstração de 2.png
  const itensHistorico =
    recentAddresses && recentAddresses.length > 0
      ? recentAddresses.slice(0, 2)
      : RECENT_SEARCH_MOCKS.slice(0, 2);

  const handleSearch = useCallback(() => {
    hapticFeedback.light();
    onSearchClick();
  }, [onSearchClick]);

  const handleAdjustPin = useCallback(() => {
    hapticFeedback.light();
    onAdjustPinOnMap?.();
  }, [onAdjustPinOnMap]);

  return (
    <div className="w-full z-20 pointer-events-auto select-none">
      <div className="bg-white rounded-t-[32px] shadow-2xl border-t border-slate-100 pt-3 pb-5 px-4 sm:px-5 space-y-4 text-left">
        {/* DRAG HANDLE BAR CENTRAL */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto" />

        {/* 1. PÍLULA DE BUSCA "PARA ONDE VAMOS?" (PADRÃO 2.PNG) */}
        <button
          type="button"
          onClick={handleSearch}
          className="group w-full h-14 px-2 py-1.5 rounded-full bg-[#F0F7FF] hover:bg-[#E4F1FF] border border-[#D0E6FF] flex items-center transition-all duration-200 active:scale-[0.99] cursor-pointer text-left shadow-xs"
          aria-label="Para onde vamos? Buscar endereços"
        >
          {/* Botão circular com lupa azul */}
          <div className="w-11 h-11 rounded-full bg-[#0088FF] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            <Search className="w-5 h-5 stroke-[2.4]" />
          </div>

          <div className="flex-1 min-w-0 ml-3.5">
            <span className="text-base font-medium text-slate-600 block truncate">
              Para onde vamos?
            </span>
          </div>
        </button>

        {/* 2. SEÇÃO "DESTINOS RECENTES" (PADRÃO 2.PNG) */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-900 stroke-[2.2]" />
              <h3 className="text-base font-bold text-slate-900">
                Destinos recentes
              </h3>
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="text-sm font-semibold text-[#0088FF] hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* LISTA DE ITENS RECENTES */}
          <div className="divide-y divide-slate-100">
            {itensHistorico.map((item) => (
              <RecentAddressItemRow
                key={item.id}
                item={item}
                onSelect={onSelectAddress}
              />
            ))}
          </div>

          {/* Opção de escolher no mapa se aplicável */}
          {onAdjustPinOnMap && (
            <button
              type="button"
              onClick={handleAdjustPin}
              className="w-full mt-2 py-2 px-1 flex items-center justify-between text-xs text-slate-500 hover:text-[#0088FF] hover:bg-blue-50/50 rounded-xl transition cursor-pointer"
            >
              <span className="flex items-center gap-2 font-medium">
                <MapPin className="w-4 h-4 text-[#0088FF]" />
                <span>Escolher destino no mapa</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default DestinationCard;
