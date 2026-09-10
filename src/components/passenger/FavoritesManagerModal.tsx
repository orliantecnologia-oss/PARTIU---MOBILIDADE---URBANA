import React, { useState, useEffect, useRef } from "react";
import { X, Star, Plus, Trash2, ArrowLeft, Loader2, MapPin } from "lucide-react";
import { addressService, type UserAddressItem } from "@/services/AddressService";
import {
  geocodingService,
  type GeocodedPlace,
  LUGARES_CURADOS_ITAPERUNA,
} from "@/lib/passenger/geocoding-service";
import { calcularDistanciaHaversine } from "@/lib/passenger/eta-service";
import { usePassengerRide } from "@/contexts/PassengerRideContext";

export interface FavoritesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFavorite: (endereco: string, coords: [number, number], label: string) => void;
}

const RÓTULOS_SUGERIDOS = ["Faculdade", "Academia", "Casa da Mãe", "Igreja", "Consultório", "Escola"];

export function FavoritesManagerModal({
  isOpen,
  onClose,
  onSelectFavorite,
}: FavoritesManagerModalProps) {
  const { origemCoords } = usePassengerRide();
  const [favoritos, setFavoritos] = useState<UserAddressItem[]>([]);
  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [busca, setBusca] = useState("");
  const [lugares, setLugares] = useState<GeocodedPlace[]>(LUGARES_CURADOS_ITAPERUNA);
  const [carregando, setCarregando] = useState(false);
  const [lugarSelecionado, setLugarSelecionado] = useState<GeocodedPlace | null>(null);
  const [nomeCustomizado, setNomeCustomizado] = useState("");
  const inputBuscaRef = useRef<HTMLInputElement>(null);

  const carregarFavoritos = () => {
    const list = addressService.getFavoritos();
    setFavoritos(list);
  };

  useEffect(() => {
    if (isOpen) {
      carregarFavoritos();
      setModoAdicionar(false);
      setLugarSelecionado(null);
      setBusca("");
      setNomeCustomizado("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => carregarFavoritos();
    window.addEventListener("partiu:addresses_updated", handleUpdate);
    return () => window.removeEventListener("partiu:addresses_updated", handleUpdate);
  }, []);

  useEffect(() => {
    let ativo = true;
    if (!modoAdicionar || !busca.trim()) {
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
  }, [busca, modoAdicionar]);

  if (!isOpen) return null;

  async function handleSalvarFavorito() {
    if (!lugarSelecionado) return;
    const labelFinal = nomeCustomizado.trim() || lugarSelecionado.label || "Favorito";
    await addressService.saveFavorito(labelFinal, lugarSelecionado.endereco, lugarSelecionado.coords);
    carregarFavoritos();
    setModoAdicionar(false);
    setLugarSelecionado(null);
    setBusca("");
    setNomeCustomizado("");
  }

  async function handleRemover(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await addressService.removeAddress(id);
    carregarFavoritos();
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
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 relative">
          {modoAdicionar ? (
            <button
              type="button"
              onClick={() => {
                if (lugarSelecionado) {
                  setLugarSelecionado(null);
                } else {
                  setModoAdicionar(false);
                }
              }}
              className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 stroke-[2.4]" />
            </button>
          )}

          <h2 className="text-base font-bold text-slate-900 absolute left-1/2 -translate-x-1/2 pointer-events-none">
            {modoAdicionar ? (lugarSelecionado ? "Nome do Favorito" : "Buscar Local") : "Favoritos"}
          </h2>

          {!modoAdicionar && favoritos.length > 0 ? (
            <button
              type="button"
              onClick={() => setModoAdicionar(true)}
              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-full transition cursor-pointer"
              title="Adicionar novo favorito"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {modoAdicionar ? (
          lugarSelecionado ? (
            <div className="p-5 flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Endereço Selecionado
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                    {lugarSelecionado.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lugarSelecionado.endereco}
                  </p>
                </div>

                <div className="pt-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                    Como você quer chamar este local?
                  </label>
                  <input
                    type="text"
                    value={nomeCustomizado}
                    onChange={(e) => setNomeCustomizado(e.target.value)}
                    placeholder="Ex: Faculdade, Academia, Casa da Mãe..."
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-400 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Sugestões Rápidas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {RÓTULOS_SUGERIDOS.map((rotulo) => (
                      <button
                        key={rotulo}
                        type="button"
                        onClick={() => setNomeCustomizado(rotulo)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
                          nomeCustomizado === rotulo
                            ? "bg-amber-400 text-slate-950 border-amber-500 shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/60"
                        }`}
                      >
                        {rotulo}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSalvarFavorito}
                className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm transition active:scale-[0.98] shadow-md cursor-pointer mt-6"
              >
                Salvar Favorito
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="bg-slate-100 rounded-full flex items-center px-4 py-2.5 gap-2.5 border border-slate-200/70 focus-within:border-amber-400 focus-within:bg-white transition">
                  <MapPin className="w-5 h-5 text-amber-600 shrink-0" />
                  <input
                    ref={inputBuscaRef}
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Digite o endereço ou nome do local..."
                    autoFocus
                    className="w-full text-sm font-medium text-slate-900 bg-transparent placeholder:text-slate-400 outline-none caret-amber-500"
                  />
                  {carregando && <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 px-4 py-1">
                {lugares.map((lugar) => (
                  <button
                    key={lugar.id}
                    type="button"
                    onClick={() => {
                      setLugarSelecionado(lugar);
                      setNomeCustomizado(lugar.label);
                    }}
                    className="w-full py-3.5 flex items-center gap-3.5 text-left hover:bg-slate-50 active:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                      <MapPin className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{lugar.label}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5 font-normal">{lugar.endereco}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        ) : favoritos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-36 h-36 relative flex items-center justify-center mb-6">
              <svg className="w-36 h-36" viewBox="0 0 160 160" fill="none">
                <circle cx="80" cy="80" r="70" fill="#E2E8F0" opacity="0.65" />
                <circle cx="108" cy="52" r="20" fill="#CBD5E1" opacity="0.5" />
                <circle cx="50" cy="115" r="16" fill="#CBD5E1" opacity="0.5" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-18 bg-gradient-to-b from-amber-500 to-orange-500 rounded-t-full rounded-b-[28px] shadow-lg flex items-center justify-center border-2 border-white/80 transform hover:scale-105 transition">
                  <Star className="w-7 h-7 text-white fill-white mb-1.5" />
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-black text-slate-950 mb-2 tracking-tight">
              Locais favoritos
            </h3>

            <p className="text-sm text-slate-500 font-medium max-w-[280px] leading-relaxed mb-8">
              É mais fácil chegar a um destino se ele já estiver salvo
            </p>

            <button
              type="button"
              onClick={() => setModoAdicionar(true)}
              className="px-10 py-3.5 rounded-full bg-[#FFC700] hover:bg-amber-400 text-slate-950 font-black text-sm tracking-wide shadow-md transition active:scale-95 cursor-pointer"
            >
              Adicionar favorito
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 px-4 py-2">
              {favoritos.map((fav) => {
                const dist = getDistanciaTexto(fav.coords);
                return (
                  <div
                    key={fav.id}
                    onClick={() => {
                      onSelectFavorite(fav.endereco, fav.coords, fav.label);
                      onClose();
                    }}
                    className="w-full py-3.5 flex items-center gap-3.5 hover:bg-slate-50 active:bg-slate-100 rounded-2xl transition cursor-pointer px-2 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-50 group-hover:bg-amber-100 text-amber-500 flex items-center justify-center shrink-0 transition">
                      <Star className="w-5 h-5 fill-amber-500 stroke-[1.5]" />
                    </div>
                    <div className="flex-1 min-w-0 pr-2 text-left">
                      <p className="text-sm font-bold text-slate-900 truncate">{fav.label}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{fav.endereco}</p>
                    </div>
                    {dist && <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">{dist}</span>}
                    <button
                      type="button"
                      onClick={(e) => handleRemover(fav.id, e)}
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition cursor-pointer shrink-0"
                      title="Excluir favorito"
                    >
                      <Trash2 className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModoAdicionar(true)}
                className="w-full py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Adicionar outro favorito</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}