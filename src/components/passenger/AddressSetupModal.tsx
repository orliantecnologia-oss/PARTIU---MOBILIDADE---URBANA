import React, { useState, useEffect, useRef } from "react";
import { Home, Briefcase, Clock, MapPin, X, Loader2 } from "lucide-react";
import { addressService } from "@/services/AddressService";
import {
  geocodingService,
  type GeocodedPlace,
  LUGARES_CURADOS_ITAPERUNA,
} from "@/lib/passenger/geocoding-service";
import { calcularDistanciaHaversine } from "@/lib/passenger/eta-service";
import { usePassengerRide } from "@/contexts/PassengerRideContext";

export interface AddressSetupModalProps {
  isOpen: boolean;
  tipo: "casa" | "trabalho";
  onClose: () => void;
  onAddressSelected: (item: { label: string; endereco: string; coords: [number, number] }) => void;
}

export function AddressSetupModal({
  isOpen,
  tipo,
  onClose,
  onAddressSelected,
}: AddressSetupModalProps) {
  const { origemCoords } = usePassengerRide();
  const [busca, setBusca] = useState("");
  const [lugares, setLugares] = useState<GeocodedPlace[]>(LUGARES_CURADOS_ITAPERUNA);
  const [carregando, setCarregando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setBusca("");
      setLugares(LUGARES_CURADOS_ITAPERUNA);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    let ativo = true;
    if (!busca.trim()) {
      setLugares(LUGARES_CURADOS_ITAPERUNA);
      return;
    }

    setCarregando(true);
    const timer = setTimeout(async () => {
      try {
        const resultados = await geocodingService.buscarLugares(busca.trim());
        if (ativo) setLugares(resultados);
      } catch {
        if (ativo) setLugares(LUGARES_CURADOS_ITAPERUNA);
      } finally {
        if (ativo) setCarregando(false);
      }
    }, 140);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [busca]);

  if (!isOpen) return null;

  const placeholderTexto = tipo === "casa" ? "Onde você mora?" : "Onde você trabalha?";

  async function handleSelect(lugar: GeocodedPlace) {
    if (tipo === "casa") {
      await addressService.saveCasa(lugar.endereco, lugar.coords);
      onAddressSelected({ label: "Casa", endereco: lugar.endereco, coords: lugar.coords });
    } else {
      await addressService.saveTrabalho(lugar.endereco, lugar.coords);
      onAddressSelected({ label: "Trabalho", endereco: lugar.endereco, coords: lugar.coords });
    }
    onClose();
  }

  function getDistanciaTexto(coords?: [number, number]): string | null {
    if (!coords || !origemCoords) return null;
    try {
      const metros = calcularDistanciaHaversine(origemCoords, coords);
      if (metros < 1000) return `${Math.round(metros / 50) * 50}m`;
      return `${(metros / 1000).toFixed(1).replace(".", ",")}km`;
    } catch {
      return null;
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg h-[86vh] sm:h-[680px] bg-white rounded-t-[32px] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom duration-250 select-none"
      >
        <div className="pt-2.5 pb-1 flex justify-center cursor-grab shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div className="flex-1 bg-slate-100/90 rounded-full flex items-center px-4 py-2.5 gap-2.5 border border-slate-200/70 focus-within:border-amber-400 focus-within:bg-white transition">
            {tipo === "casa" ? (
              <Home className="w-5 h-5 text-slate-800 shrink-0" />
            ) : (
              <Briefcase className="w-5 h-5 text-slate-800 shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={placeholderTexto}
              className="w-full text-sm font-medium text-slate-900 bg-transparent placeholder:text-slate-400 outline-none caret-amber-500"
            />
            {carregando && <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />}
            {busca && !carregando && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-slate-700 hover:text-slate-950 px-1 py-1 cursor-pointer transition active:scale-95 shrink-0"
          >
            Cancelar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 px-4 py-1">
          {lugares.map((lugar) => {
            const dist = getDistanciaTexto(lugar.coords);
            return (
              <button
                key={lugar.id}
                type="button"
                onClick={() => handleSelect(lugar)}
                className="w-full py-3.5 flex items-center gap-3.5 text-left hover:bg-slate-50 active:bg-slate-100 rounded-xl transition cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-500 shrink-0 transition">
                  <Clock className="w-4 h-4 text-slate-500 stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-bold text-slate-900 truncate">{lugar.label}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5 font-normal">{lugar.endereco}</p>
                </div>
                {dist && <span className="text-xs font-semibold text-slate-400 shrink-0">{dist}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}