import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Search,
  MapPin,
  Clock,
  Navigation,
  X,
  ChevronRight,
  ArrowUpDown,
  Building2,
  GraduationCap,
  Cross,
  Bus,
  ShoppingBag,
  Home,
  Briefcase,
  Star,
  User,
  Users,
  Compass,
} from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { DEFAULT_ORIGIN } from "@/lib/passenger/passenger-ride-machine";
import { calcularDistanciaHaversine } from "@/lib/passenger/eta-service";
import {
  geocodingService,
  type GeocodedPlace,
  LUGARES_CURADOS_ITAPERUNA,
} from "@/lib/passenger/geocoding-service";
import { addressService } from "@/services/AddressService";
import { AddressSetupModal } from "@/components/passenger/AddressSetupModal";
import { FavoritesManagerModal } from "@/components/passenger/FavoritesManagerModal";
import { AddressSearchSkeleton } from "@/components/ui/skeleton";
import { hapticFeedback } from "@/lib/haptics/haptic-feedback";
import { silentCatchWarn } from "@/lib/structured-logger";


const STORAGE_RECENT_KEY = "partiu_recent_destinations_v1";

interface RecentItem {
  id: string;
  label: string;
  endereco: string;
  coords?: [number, number] | undefined;
  timestamp: number;
}

const VIAGENS_RECENTES_DEFAULT: RecentItem[] = [
  {
    id: "rec-1",
    label: "Rua Dez de Maio, 188",
    endereco: "Rua Dez de Maio, 188 - Centro, Itaperuna - RJ",
    coords: [-41.886, -21.2065],
    timestamp: Date.now() - 3600000,
  },
  {
    id: "rec-2",
    label: "Hospital São José do Avaí",
    endereco: "Rua Cel. Luiz Ferraz, 397 - Centro, Itaperuna - RJ",
    coords: [-41.8895, -21.2038],
    timestamp: Date.now() - 7200000,
  },
];

export function PassengerSearchDestinationSheet() {
  const { corPrimaria, corSecundaria, corTextoPrimaria } = useBrandTheme();

  const {
    state,
    origem,
    origemCoords,
    destino,
    setOrigemEndereco,
    swapOrigemDestino,
    selectDestination,
    selectDestinationOnMap,
    cancelSearch,
    viajanteOutraPessoa,
    nomeOutroPassageiro,
    setViajanteOutraPessoa,
    setNomeOutroPassageiro,
  } = usePassengerRide();

  // Estado dos inputs: Origem preenchida automaticamente com o GPS e Destino em branco
  const [origemLocal, setOrigemLocal] = useState<string>(() => {
    return origem && origem !== "Meu Local Atual" ? origem : "Meu Local Atual";
  });
  const [buscaDestino, setBuscaDestino] = useState<string>(() => {
    return destino && destino !== "Definir no mapa" ? destino : "";
  });

  useEffect(() => {
    if (origem) {
      setOrigemLocal(origem);
    }
  }, [origem]);

  // Campo ativo: Foco inicial direto no Embarque se state for EDITING_PICKUP, caso contrário no Destino
  const [campoAtivo, setCampoAtivo] = useState<"embarque" | "destino">(() => {
    return state === "EDITING_PICKUP" ? "embarque" : "destino";
  });

  useEffect(() => {
    if (state === "EDITING_PICKUP") {
      setCampoAtivo("embarque");
    }
  }, [state]);
  const [modalPassageiroAberto, setModalPassageiroAberto] = useState(false);
  const [modalEnderecoAberto, setModalEnderecoAberto] = useState<"casa" | "trabalho" | null>(null);
  const [modalFavoritosAberto, setModalFavoritosAberto] = useState(false);

  // Handlers reativos dos atalhos com verificação de Estado Duplo (Cadastrado / Não Cadastrado)
  const handleShortcutCasa = () => {
    hapticFeedback.light();
    const casa = addressService.getCasa();
    if (casa && casa.endereco) {
      handleSelectDestino(casa.endereco, casa.coords, "Casa");
    } else {
      setModalEnderecoAberto("casa");
    }
  };

  const handleShortcutTrabalho = () => {
    hapticFeedback.light();
    const trabalho = addressService.getTrabalho();
    if (trabalho && trabalho.endereco) {
      handleSelectDestino(trabalho.endereco, trabalho.coords, "Trabalho");
    } else {
      setModalEnderecoAberto("trabalho");
    }
  };

  const handleShortcutFavoritos = () => {
    hapticFeedback.light();
    setModalFavoritosAberto(true);
  };

  // Sugestões dinâmicas e histórico recente (estritamente as 2 últimas viagens)
  const [lugaresEncontrados, setLugaresEncontrados] = useState<GeocodedPlace[]>(LUGARES_CURADOS_ITAPERUNA);
  const [carregandoLugares, setCarregandoLugares] = useState(false);

  const [historicoRecente, setHistoricoRecente] = useState<RecentItem[]>(() => {
    if (typeof window === "undefined") return VIAGENS_RECENTES_DEFAULT;
    try {
      const salvo = localStorage.getItem(STORAGE_RECENT_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 2);
        }
      }
    } catch (err) { silentCatchWarn("PassengerSearchDestinationSheet", err); }
    return VIAGENS_RECENTES_DEFAULT;
  });

  const inputDestinoRef = useRef<HTMLInputElement>(null);
  const inputOrigemRef = useRef<HTMLInputElement>(null);

  // 1. Notificação para esconder barra de navegação no modal
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("partiu:toggle-bottom-nav", { detail: { visible: false } }));
    return () => {
      window.dispatchEvent(new CustomEvent("partiu:toggle-bottom-nav", { detail: { visible: true } }));
    };
  }, []);

  // 2. Foco automático imediato no Destino ao abrir a tela
  useEffect(() => {
    const timer = setTimeout(() => {
      if (campoAtivo === "destino") {
        inputDestinoRef.current?.focus();
      } else {
        inputOrigemRef.current?.focus();
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [campoAtivo]);

  // 3. Sincronização da Origem quando o GPS resolver o endereço legível
  useEffect(() => {
    if (origem && origem !== "Meu Local Atual") {
      setOrigemLocal(origem);
    }
  }, [origem]);

  // 4. Autocompletar Dinâmico em Tempo Real (Mapbox / Places API com refinamento a cada letra)
  useEffect(() => {
    let ativo = true;
    const termo = campoAtivo === "embarque" ? origemLocal : buscaDestino;

    if (!termo.trim() || (campoAtivo === "embarque" && termo === "Meu Local Atual")) {
      setLugaresEncontrados(LUGARES_CURADOS_ITAPERUNA);
      return;
    }

    setCarregandoLugares(true);
    const timer = setTimeout(async () => {
      try {
        const resultados = await geocodingService.buscarLugares(termo);
        if (ativo) {
          setLugaresEncontrados(resultados);
        }
      } catch {
        if (ativo) setLugaresEncontrados(LUGARES_CURADOS_ITAPERUNA);
      } finally {
        if (ativo) setCarregandoLugares(false);
      }
    }, 140);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [buscaDestino, origemLocal, campoAtivo]);

  // 5. Salvar e recuperar no histórico persistente
  function registrarViagemRecente(label: string, endereco: string, coords?: [number, number]) {
    try {
      const novo: RecentItem = {
        id: `rec-${Date.now()}`,
        label,
        endereco,
        coords,
        timestamp: Date.now(),
      };
      const filtrados = historicoRecente.filter(
        (h) => h.endereco.toLowerCase() !== endereco.toLowerCase()
      );
      const atualizados = [novo, ...filtrados].slice(0, 2);
      setHistoricoRecente(atualizados);
      localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(atualizados));
    } catch (err) { silentCatchWarn("PassengerSearchDestinationSheet", err); }
  }

  // 6. Seleção Rápida de Destino com Avanço Automático para a Próxima Etapa
  function handleSelectDestino(endereco: string, coords?: [number, number], label?: string) {
    hapticFeedback.selection();
    let coordsFinal = coords;
    if (!coordsFinal) {
      const match = lugaresEncontrados.find(
        (l) => l.endereco.toLowerCase() === endereco.toLowerCase() || l.label.toLowerCase() === endereco.toLowerCase()
      ) || lugaresEncontrados[0] || LUGARES_CURADOS_ITAPERUNA[0];
      coordsFinal = match ? match.coords : [-41.886, -21.2065];
    }

    const rotuloFinal = label || endereco.split(",")[0] || endereco;
    registrarViagemRecente(rotuloFinal, endereco, coordsFinal);
    setBuscaDestino(rotuloFinal);

    // Se a origem estiver preenchida, avança automaticamente para o modal de seleção de veículo!
    selectDestination(endereco, coordsFinal);
  }

  // 7. Seleção de Origem
  function handleSelectOrigem(lugar: GeocodedPlace) {
    hapticFeedback.selection();
    setOrigemLocal(lugar.label);
    setOrigemEndereco(lugar.endereco, lugar.coords);
    // Move o foco automaticamente para o destino se estiver vazio
    if (!buscaDestino.trim()) {
      setCampoAtivo("destino");
      setTimeout(() => inputDestinoRef.current?.focus(), 60);
    } else {
      // Se o destino já estiver preenchido, avança direto
      selectDestination(buscaDestino, lugar.coords);
    }
  }

  // Cálculo de distância em relação à origem atual
  function getDistanciaTexto(coords?: [number, number]): string | null {
    if (!coords || !origemCoords) return null;
    try {
      const metros = calcularDistanciaHaversine(origemCoords, coords);
      if (metros < 1000) {
        return `~${Math.round(metros / 50) * 50} m`;
      }
      return `~${(metros / 1000).toFixed(1).replace(".", ",")} km`;
    } catch {
      return null;
    }
  }

  // Ícone por categoria
  function getCategoryIcon(label: string) {
    const l = label.toLowerCase();
    if (l.includes("hospital") || l.includes("avaí") || l.includes("upa") || l.includes("saúde")) {
      return <Cross className="w-4 h-4 text-rose-500" />;
    }
    if (l.includes("redentor") || l.includes("afya") || l.includes("faculdade") || l.includes("escola")) {
      return <GraduationCap className="w-4 h-4 text-indigo-500" />;
    }
    if (l.includes("rodoviário") || l.includes("terminal") || l.includes("balsa")) {
      return <Bus className="w-4 h-4 text-blue-500" />;
    }
    if (l.includes("mercado") || l.includes("fluminense") || l.includes("shopping")) {
      return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
    }
    return <Building2 className="w-4 h-4 text-slate-500" />;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-hide-bottom-nav="true"
      onClick={cancelSearch}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg h-[92dvh] sm:h-[86dvh] max-h-[100dvh] bg-white rounded-t-[32px] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom duration-250 select-none pb-safe"
      >
        {/* Barra superior de arraste suave com gesto de swipe-down */}
        <div
          onTouchStart={(e) => {
            (e.currentTarget as any)._startY = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            const startY = (e.currentTarget as any)._startY;
            if (startY && e.changedTouches[0].clientY - startY > 50) {
              hapticFeedback.light();
              cancelSearch();
            }
          }}
          className="pt-2 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing shrink-0 sm:hidden touch-none"
        >
          <div className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* 1. CABEÇALHO LIMPO COM SELETOR DE PASSAGEIRO (ESTILO 99) */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 relative">
          <div className="flex items-center gap-2.5">
            {/* Botão Voltar */}
            <button
              type="button"
              onClick={() => {
                hapticFeedback.light();
                cancelSearch();
              }}
              aria-label="Voltar para o mapa"
              className="min-w-[48px] min-h-[48px] -ml-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 active:scale-95 rounded-full transition cursor-pointer flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
            </button>

            {/* Seletor de Passageiro ("Para mim ▾" / "Outra pessoa ▾") */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setModalPassageiroAberto(!modalPassageiroAberto)}
                className="min-h-[44px] px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer border border-slate-200/70"
              >
                {viajanteOutraPessoa ? (
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>
                  {viajanteOutraPessoa
                    ? `Para: ${nomeOutroPassageiro || "Outra pessoa"}`
                    : "Para mim"}
                </span>
                <span className="text-xs text-slate-500">▾</span>
              </button>

              {/* Dropdown Flutuante do Seletor de Passageiro */}
              {modalPassageiroAberto && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 z-30 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Quem vai viajar?
                  </p>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setViajanteOutraPessoa(false);
                        setModalPassageiroAberto(false);
                      }}
                      style={
                        !viajanteOutraPessoa
                          ? { backgroundColor: corPrimaria || "#FFDE00", color: corTextoPrimaria || "#0F172A" }
                          : undefined
                      }
                      className={`py-2 px-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                        !viajanteOutraPessoa ? "shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <User className="w-3 h-3" />
                      <span>Para mim</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViajanteOutraPessoa(true)}
                      style={
                        viajanteOutraPessoa
                          ? { backgroundColor: corPrimaria || "#FFDE00", color: corTextoPrimaria || "#0F172A" }
                          : undefined
                      }
                      className={`py-2 px-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                        viajanteOutraPessoa ? "shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      <span>Outra pessoa</span>
                    </button>
                  </div>

                  {viajanteOutraPessoa && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={nomeOutroPassageiro}
                        onChange={(e) => setNomeOutroPassageiro(e.target.value)}
                        placeholder="Nome do passageiro..."
                        className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setModalPassageiroAberto(false)}
                        className="w-full mt-2 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-black cursor-pointer hover:bg-slate-800"
                      >
                        Salvar Passageiro
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Atalho no Topo: Definir no Mapa */}
          <button
            type="button"
            onClick={selectDestinationOnMap}
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Escolher destino diretamente no mapa"
          >
            <Compass className="w-3.5 h-3.5 text-amber-600 stroke-[2.4]" />
            <span>No mapa</span>
          </button>
        </div>

        {/* 2. CAMPOS CONECTADOS DE ORIGEM E DESTINO (LIMPO E INTUITIVO) */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 shrink-0 space-y-3">
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3 relative flex items-center gap-3">
            {/* Coluna Visual com Indicadores Conectados */}
            <div className="flex flex-col items-center justify-between h-20 py-2 shrink-0">
              {/* Círculo Verde de Origem */}
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              {/* Linha Tracejada Conectora */}
              <div className="w-0.5 flex-1 bg-slate-300/80 my-1" />
              {/* Círculo Laranja de Destino */}
              <div
                style={{ backgroundColor: corPrimaria || "#F59E0B" }}
                className="w-2.5 h-2.5 rounded-full ring-4 ring-amber-100"
              />
            </div>

            {/* Coluna dos Inputs de Texto */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* CAMPO 1: ORIGEM (LOCAL DE EMBARQUE) */}
              <div className="flex items-center justify-between gap-2">
                <input
                  ref={inputOrigemRef}
                  type="text"
                  value={origemLocal}
                  onFocus={() => setCampoAtivo("embarque")}
                  onChange={(e) => {
                    setOrigemLocal(e.target.value);
                    setOrigemEndereco(e.target.value);
                  }}
                  placeholder="Local de embarque (seu endereço)..."
                  className={`w-full text-xs sm:text-[13px] font-bold text-slate-900 bg-transparent placeholder:text-slate-400 truncate outline-none py-1 transition ${
                    campoAtivo === "embarque" ? "text-slate-950" : "text-slate-700"
                  }`}
                />

                <div className="flex items-center gap-1 shrink-0">
                  {origemLocal && origemLocal !== "Meu Local Atual" && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        hapticFeedback.light();
                        setOrigemLocal("Localizando rua...");
                        if (typeof navigator !== "undefined" && navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            async (pos) => {
                              const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
                              const nomeVia = await geocodingService.geocodificarReverso(coords);
                              setOrigemLocal(nomeVia);
                              setOrigemEndereco(nomeVia, coords);
                            },
                            () => {
                              setOrigemLocal(origem || "Meu Local Atual");
                            },
                            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                          );
                        }
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded-md text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                      title="Restaurar GPS atual"
                    >
                      <Navigation className="w-3 h-3 fill-blue-600" />
                      <span>GPS</span>
                    </button>
                  )}
                  {origemLocal && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrigemLocal("");
                        setOrigemEndereco("");
                        setCampoAtivo("embarque");
                        inputOrigemRef.current?.focus();
                      }}
                      className="min-w-[40px] min-h-[40px] p-2 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer flex items-center justify-center -mr-1"
                      title="Limpar embarque"
                      aria-label="Limpar campo de embarque"
                    >
                      <X className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  )}
                </div>
              </div>

              {/* DIVISOR INTERNO SUTIL */}
              <div className="border-t border-slate-200/60" />

              {/* CAMPO 2: DESTINO (PARA ONDE VAMOS? - COM FOCO INICIAL) */}
              <div className="flex items-center justify-between gap-2">
                <input
                  ref={inputDestinoRef}
                  type="text"
                  value={buscaDestino}
                  onFocus={() => setCampoAtivo("destino")}
                  onChange={(e) => setBuscaDestino(e.target.value)}
                  placeholder="Para onde vamos?"
                  className="w-full text-xs sm:text-[13px] font-black text-slate-950 bg-transparent placeholder:text-slate-400 placeholder:font-medium truncate outline-none py-1"
                />

                {buscaDestino && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBuscaDestino("");
                      setCampoAtivo("destino");
                      inputDestinoRef.current?.focus();
                    }}
                    className="min-w-[40px] min-h-[40px] p-2 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer shrink-0 flex items-center justify-center -mr-1"
                    title="Limpar destino"
                    aria-label="Limpar campo de destino"
                  >
                    <X className="w-4 h-4 stroke-[2.2]" />
                  </button>
                )}
              </div>
            </div>

            {/* BOTÃO SWAP (⇅ INVERTER ORIGEM E DESTINO) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticFeedback.light();
                const tempOrigem = origemLocal;
                const tempDestino = buscaDestino;
                setOrigemLocal(tempDestino || origem || "Meu Local Atual");
                setBuscaDestino(tempOrigem);
                swapOrigemDestino();
              }}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 shadow-2xs text-slate-700 hover:text-slate-950 flex items-center justify-center shrink-0 transition active:scale-90 cursor-pointer"
              title="Inverter origem e destino"
              aria-label="Inverter origem e destino"
            >
              <ArrowUpDown className="w-4 h-4 stroke-[2.4]" />
            </button>
          </div>

          {/* 3. ATALHOS RÁPIDOS: CASA, TRABALHO, FAVORITOS E NO MAPA */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
            <button
              type="button"
              onClick={handleShortcutCasa}
              className="min-h-[40px] px-3.5 py-2 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
            >
              <Home className="w-3.5 h-3.5 text-amber-600" />
              <span>Casa</span>
            </button>

            <button
              type="button"
              onClick={handleShortcutTrabalho}
              className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>Trabalho</span>
            </button>

            <button
              type="button"
              onClick={handleShortcutFavoritos}
              className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Favoritos</span>
            </button>

            <button
              type="button"
              onClick={selectDestinationOnMap}
              className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>No Mapa</span>
            </button>
          </div>
        </div>

        {/* 4. CONTEÚDO DINÂMICO ROLÁVEL COM TECLADO ERGONÔMICO */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-4 sm:px-5 py-2">
          {/* CASO A: USUÁRIO DIGITANDO NO CAMPO (AUTOCOMPLETAR DINÂMICO EM TEMPO REAL) */}
          {buscaDestino.trim().length > 0 ? (
            <div className="space-y-1 pt-1 pb-3">
              {/* Opção Rápida no Topo: Buscar texto exato no mapa */}
              <button
                type="button"
                onClick={() => handleSelectDestino(buscaDestino.trim(), undefined, buscaDestino.trim())}
                style={{
                  borderColor: `${corPrimaria || "#FFDE00"}60`,
                  backgroundColor: `${corPrimaria || "#FFDE00"}15`,
                }}
                className="w-full p-3 flex items-center gap-3 text-left rounded-2xl transition active:scale-[0.99] cursor-pointer border mb-2 shadow-2xs"
              >
                <div
                  style={{
                    backgroundColor: corPrimaria || "#FFDE00",
                    color: corTextoPrimaria || "#0F172A",
                  }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black shadow-2xs"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-950 truncate">
                    Buscar &ldquo;{buscaDestino}&rdquo;
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Ir para este endereço em Itaperuna, RJ
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block px-1 pb-1">
                Sugestões de Endereço (Tempo Real)
              </span>

              {/* Lista Refinada a Cada Letra Digitada ou Shimmer Skeleton */}
              {carregandoLugares ? (
                <AddressSearchSkeleton />
              ) : (
                lugaresEncontrados.map((item) => {
                const distText = getDistanciaTexto(item.coords);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (campoAtivo === "embarque") {
                        handleSelectOrigem(item);
                      } else {
                        handleSelectDestino(item.endereco, item.coords, item.label);
                      }
                    }}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-slate-50 rounded-2xl transition active:scale-[0.99] cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-amber-100 text-slate-700 group-hover:text-slate-950 flex items-center justify-center shrink-0 transition">
                      {getCategoryIcon(item.label)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight group-hover:text-amber-900 transition">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                        {item.sublabel || item.endereco}
                      </p>
                    </div>

                    {distText && (
                      <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                        {distText}
                      </span>
                    )}

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0 transition" />
                  </button>
                );
              }))}
            </div>
          ) : (
            /* CASO B: SEM DIGITAÇÃO -> AS ÚLTIMAS 2 VIAGENS RECENTES E LOCAIS POPULARES */
            <div className="space-y-3 pt-1 pb-4">
              {/* HISTÓRICO DAS ÚLTIMAS 2 VIAGENS (EXATAMENTE COMO NO VÍDEO DO APP 99) */}
              {historicoRecente && historicoRecente.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-1 py-1">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Últimas Viagens</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    {historicoRecente.slice(0, 2).map((item) => {
                      const distText = getDistanciaTexto(item.coords);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectDestino(item.endereco, item.coords, item.label)}
                          className="w-full p-3 flex items-center gap-3 text-left hover:bg-slate-50 rounded-2xl transition active:scale-[0.99] cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-amber-100 text-slate-500 group-hover:text-slate-950 flex items-center justify-center shrink-0 transition">
                            <Clock className="w-4 h-4 stroke-[2.2]" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight">
                                {item.label}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                Recente
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                              {item.endereco}
                            </p>
                          </div>

                          {distText && (
                            <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/70 shrink-0">
                              {distText}
                            </span>
                          )}

                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0 transition" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LOCAIS SUGERIDOS EM ITAPERUNA */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block px-1">
                  Locais Frequentes em Itaperuna
                </span>

                <div className="space-y-1">
                  {LUGARES_CURADOS_ITAPERUNA.slice(0, 5).map((lugar) => {
                    const distText = getDistanciaTexto(lugar.coords);
                    return (
                      <button
                        key={lugar.id}
                        type="button"
                        onClick={() => handleSelectDestino(lugar.endereco, lugar.coords, lugar.label)}
                        className="w-full p-3 flex items-center gap-3 text-left hover:bg-slate-50 rounded-2xl transition active:scale-[0.99] cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-amber-100 text-slate-600 group-hover:text-slate-950 flex items-center justify-center shrink-0 transition">
                          {getCategoryIcon(lugar.label)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight group-hover:text-amber-900 transition">
                            {lugar.label}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                            {lugar.sublabel || lugar.endereco}
                          </p>
                        </div>

                        {distText && (
                          <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                            {distText}
                          </span>
                        )}

                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0 transition" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CADASTRO DE CASA OU TRABALHO ("ONDE VOCÊ MORA?" / "ONDE VOCÊ TRABALHA?") */}
      {modalEnderecoAberto && (
        <AddressSetupModal
          isOpen={!!modalEnderecoAberto}
          tipo={modalEnderecoAberto}
          onClose={() => setModalEnderecoAberto(null)}
          onAddressSelected={(item) => {
            handleSelectDestino(item.endereco, item.coords, item.label);
            setModalEnderecoAberto(null);
          }}
        />
      )}

      {/* MODAL DE GESTÃO DE LOCAIS FAVORITOS (ESTADO VAZIO VETORIAL E LISTA DE FAVORITOS) */}
      {modalFavoritosAberto && (
        <FavoritesManagerModal
          isOpen={modalFavoritosAberto}
          onClose={() => setModalFavoritosAberto(false)}
          onSelectFavorite={(endereco, coords, label) => {
            handleSelectDestino(endereco, coords, label);
            setModalFavoritosAberto(false);
          }}
        />
      )}
    </div>
  );
}
