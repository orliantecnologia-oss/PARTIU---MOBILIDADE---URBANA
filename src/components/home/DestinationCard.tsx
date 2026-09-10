import React, { useState, useEffect } from "react";
import { Search, Clock, ChevronRight, Home, Briefcase, MapPin, ArrowRight } from "lucide-react";
import { RecentAddressItem } from "./home-mock-data";
import { addressService, type UserAddressItem } from "@/services/AddressService";
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

export function DestinationCard({
  onSearchClick,
  onEditPickupClick,
  onAdjustPinOnMap,
  onSelectAddress,
  onSelectCasa,
  onSelectTrabalho,
  recentAddresses = [],
  currentAddress,
}: DestinationCardProps) {
  const [casa, setCasa] = useState<UserAddressItem | null>(null);
  const [trabalho, setTrabalho] = useState<UserAddressItem | null>(null);

  useEffect(() => {
    const carregar = () => {
      setCasa(addressService.getCasa());
      setTrabalho(addressService.getTrabalho());
    };
    carregar();
    window.addEventListener("partiu:addresses_updated", carregar);
    return () => window.removeEventListener("partiu:addresses_updated", carregar);
  }, []);

  const handleCasaClick = () => {
    hapticFeedback.light();
    if (onSelectCasa) {
      onSelectCasa();
      return;
    }
    if (casa && casa.endereco) {
      onSelectAddress?.({
        id: casa.id,
        titulo: "Casa",
        endereco: casa.endereco,
        coords: casa.coords,
      });
    } else {
      onSearchClick();
    }
  };

  const handleTrabalhoClick = () => {
    hapticFeedback.light();
    if (onSelectTrabalho) {
      onSelectTrabalho();
      return;
    }
    if (trabalho && trabalho.endereco) {
      onSelectAddress?.({
        id: trabalho.id,
        titulo: "Trabalho",
        endereco: trabalho.endereco,
        coords: trabalho.coords,
      });
    } else {
      onSearchClick();
    }
  };

  // Limita estritamente ao item recente mais relevante para manter a tela limpa
  const itensRapidos = (recentAddresses || []).slice(0, 1);

  return (
    <div className="w-full z-20 pointer-events-auto">
      <div className="bg-white/98 backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 p-3.5 sm:p-4 space-y-3 text-left">
        
        {/* 1. PONTO DE PARTIDA / EMBARQUE (DISCRETO E ELEGANTE ESTILO 99) */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-50/80 border border-slate-200/60 hover:bg-slate-100/70 transition-colors">
          <button
            type="button"
            onClick={onEditPickupClick || onSearchClick}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer text-left group bg-transparent border-0 p-0"
            title="Alterar ponto de partida"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block leading-none mb-0.5">
                Embarque
              </span>
              <span className="font-bold text-slate-800 block truncate text-xs group-hover:text-emerald-700 transition-colors">
                {currentAddress && currentAddress !== "Meu Local Atual"
                  ? currentAddress
                  : "Meu local atual"}
              </span>
            </div>
          </button>

          {onAdjustPinOnMap && (
            <button
              type="button"
              onClick={onAdjustPinOnMap}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl transition shadow-2xs cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
              title="Ajustar no mapa"
            >
              <MapPin className="w-3 h-3 text-emerald-600" />
              <span>Ajustar</span>
            </button>
          )}
        </div>

        {/* 2. BARRA PRINCIPAL "PARA ONDE VAMOS?" (CHAMATIVA, CONFORTÁVEL, ESTILO 99) */}
        <button
          type="button"
          onClick={() => {
            hapticFeedback.light();
            onSearchClick();
          }}
          className="group w-full h-13 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 flex items-center gap-3.5 transition-all duration-200 active:scale-[0.99] cursor-pointer text-left shadow-2xs"
          aria-label="Para onde vamos? Buscar endereços"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-400 group-hover:bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            <Search className="w-4.5 h-4.5 stroke-[2.8]" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-[15px] font-black text-slate-900 block truncate">
              Para onde vamos?
            </span>
          </div>

          <div className="w-7 h-7 rounded-full bg-white text-slate-400 group-hover:text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </button>

        {/* 3. ATALHOS RÁPIDOS DE 1 TOQUE: CASA E TRABALHO (ESTILO 99) */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {/* Botão Casa */}
          <button
            type="button"
            onClick={handleCasaClick}
            className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 transition active:scale-[0.98] cursor-pointer group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Home className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-slate-900 block leading-tight">
                Casa
              </span>
              <span className="text-[10px] text-slate-500 block truncate mt-0.5 font-medium">
                {casa?.endereco ? casa.endereco.split(",")[0] : "Adicionar"}
              </span>
            </div>
          </button>

          {/* Botão Trabalho */}
          <button
            type="button"
            onClick={handleTrabalhoClick}
            className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 transition active:scale-[0.98] cursor-pointer group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Briefcase className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-slate-900 block leading-tight">
                Trabalho
              </span>
              <span className="text-[10px] text-slate-500 block truncate mt-0.5 font-medium">
                {trabalho?.endereco ? trabalho.endereco.split(",")[0] : "Adicionar"}
              </span>
            </div>
          </button>
        </div>

        {/* 4. DESTINO RECENTE (SE HOUVER) */}
        {itensRapidos.length > 0 && (
          <div className="pt-1 border-t border-slate-100">
            {itensRapidos.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  hapticFeedback.light();
                  onSelectAddress?.(item);
                }}
                className="w-full py-1.5 px-2 flex items-center gap-2.5 hover:bg-slate-50 rounded-xl transition active:scale-[0.99] cursor-pointer group text-left"
              >
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3 stroke-[2.4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {item.titulo}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {item.endereco}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 shrink-0" />
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

