import { useState, useMemo } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  Clock,
  Compass,
  Fuel,
  Info,
  MapPin,
  Palmtree,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  getPontosEmbarqueConfig,
  type PontoEmbarqueConfig,
  type TipoPontoEmbarque,
} from "@/lib/pontos-embarque-store";

interface ModalSelecaoPontoEmbarqueProps {
  aberto: boolean;
  onFechar: () => void;
  pontoSelecionadoId?: string | null | undefined;
  onSelecionarPonto: (ponto: PontoEmbarqueConfig) => void;
  cidadeOrigem?: string | undefined;
}

export function ModalSelecaoPontoEmbarque({
  aberto,
  onFechar,
  pontoSelecionadoId,
  onSelecionarPonto,
  cidadeOrigem,
}: ModalSelecaoPontoEmbarqueProps) {
  const [busca, setBusca] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState<string>("todas");
  const todosPontos = useMemo(() => getPontosEmbarqueConfig().filter((p) => p.ativo), []);

  const cidadesDisponiveis = useMemo(() => {
    const setCidades = new Set(todosPontos.map((p) => p.cidade));
    return ["todas", ...Array.from(setCidades)];
  }, [todosPontos]);

  const pontosFiltrados = useMemo(() => {
    return todosPontos.filter((p) => {
      const matchBusca =
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.cidade.toLowerCase().includes(busca.toLowerCase()) ||
        p.referencia.toLowerCase().includes(busca.toLowerCase()) ||
        p.enderecoCompleto.toLowerCase().includes(busca.toLowerCase());

      const matchCidade = cidadeFiltro === "todas" || p.cidade === cidadeFiltro;

      return matchBusca && matchCidade;
    });
  }, [todosPontos, busca, cidadeFiltro]);

  if (!aberto) return null;

  function getIconeTipo(tipo: TipoPontoEmbarque) {
    switch (tipo) {
      case "posto_combustivel":
        return <Fuel className="h-4 w-4 text-primary-600" />;
      case "terminal_rodoviario":
        return <Building2 className="h-4 w-4 text-emerald-600" />;
      case "trevo_rodoviario":
        return <Compass className="h-4 w-4 text-blue-600" />;
      case "praca_central":
        return <Palmtree className="h-4 w-4 text-emerald-700" />;
      default:
        return <MapPin className="h-4 w-4 text-slate-600" />;
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-[430px] max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in slide-in-from-bottom duration-200 mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* BARRA SUPERIOR MOBILE DE ARRASTE (DRAG HANDLE) */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden bg-gradient-to-r from-[#0b2046] via-[#0d5930] to-[#071833]">
          <div className="h-1.5 w-12 rounded-full bg-white/40" />
        </div>

        {/* 1. CABEÇALHO DO MODAL */}
        <div className="bg-gradient-to-r from-[#0b2046] via-[#0d5930] to-[#071833] p-4 sm:p-5 text-white">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/15 text-primary-500 border border-white/20 shadow-xs shrink-0">
                <MapPin className="h-6 w-6 animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-primary-500 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15 inline-block">
                  Estações &amp; Trevos Oficiais
                </span>
                <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-1 truncate">
                  Ponto de Embarque Oficial
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 truncate mt-0.5">
                  Selecione onde a van deve parar para você subir
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onFechar}
              className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all shrink-0 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>

        {/* 2. BUSCADOR & FILTROS POR CIDADE */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por trevo, posto, referência..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-11 pr-9 min-h-[48px] h-12 bg-white border border-slate-200 rounded-xl text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d5930] focus:border-transparent transition-all shadow-xs"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Pílulas de Cidades */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {cidadesDisponiveis.map((cidade) => (
              <button
                key={cidade}
                type="button"
                onClick={() => setCidadeFiltro(cidade)}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center cursor-pointer active:scale-95 ${
                  cidadeFiltro === cidade
                    ? "bg-[#0d5930] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cidade === "todas" ? "Todas as Cidades" : cidade}
              </button>
            ))}
          </div>
        </div>

        {/* 3. LISTA DE PONTOS DE EMBARQUE */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {pontosFiltrados.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <MapPin className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-600">
                Nenhum ponto de embarque encontrado.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBusca("");
                  setCidadeFiltro("todas");
                }}
                className="text-xs sm:text-sm font-black text-[#0d5930] underline cursor-pointer"
              >
                Limpar filtros de busca
              </button>
            </div>
          ) : (
            pontosFiltrados.map((ponto) => {
              const selecionado = ponto.id === pontoSelecionadoId;
              return (
                <div
                  key={ponto.id}
                  onClick={() => {
                    onSelecionarPonto(ponto);
                    onFechar();
                  }}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 active:scale-[0.99] ${
                    selecionado
                      ? "bg-emerald-50/80 border-[#0d5930] ring-1 ring-[#0d5930] shadow-xs"
                      : "bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 border ${
                      selecionado
                        ? "bg-[#0d5930] text-white border-[#0d5930]"
                        : "bg-slate-50 text-[#0d5930] border-slate-200"
                    }`}
                  >
                    {getIconeTipo(ponto.tipo)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <strong className="text-sm sm:text-base font-black text-slate-900 leading-snug truncate">
                        {ponto.nome}
                      </strong>
                      <span className="text-xs font-black text-[#0d5930] bg-emerald-100/80 px-2 py-0.5 rounded-md shrink-0">
                        +{ponto.minutosAposSaida} min
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                      {ponto.referencia}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {ponto.comodidades.slice(0, 3).map((comodidade, i) => (
                        <span
                          key={i}
                          className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                        >
                          {comodidade}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    <div
                      className={`h-6 w-6 rounded-full border flex items-center justify-center transition-all ${
                        selecionado
                          ? "bg-[#0d5930] border-[#0d5930] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {selecionado && <Check className="h-4 w-4 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. RODAPÉ DE AJUDA */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs sm:text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Pontos seguros e monitorados</span>
          </span>
          <button
            type="button"
            onClick={onFechar}
            className="min-h-[44px] px-3 font-black text-[#0d5930] hover:underline cursor-pointer flex items-center"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
