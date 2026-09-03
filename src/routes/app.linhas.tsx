import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Compass,
  MapPin,
  Search,
  Ticket,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import {
  ROTAS_OFICIAIS,
  calcularHorariosDisponiveisRota,
  type RotaBase,
  type HorarioDisponivel,
} from "@/lib/horarios-inteligentes";
import {
  ModalCompraPassagem,
  type DadosViagemCompra,
} from "@/components/passagens/ModalCompraPassagem";

export const Route = createFileRoute("/app/linhas")({
  head: () => ({
    meta: [
      { title: "Horários & Linhas Oficiais | UniVans" },
      {
        name: "description",
        content:
          "Consulte horários de saída das vans em Alagoas, veja paradas e reserve sua passagem com rapidez.",
      },
    ],
  }),
  component: LinhasPassagensScreen,
});

const CIDADES_FILTRO = [
  "Todas",
  "Maceió",
  "Arapiraca",
  "Tapera",
  "Penedo",
  "Caruaru",
  "Santa Cruz",
  "Maragogi",
];

/* ─── Helpers de vagas semafóricas ─── */
function vagasCor(vagas: number, esgotado: boolean) {
  if (esgotado)
    return { dot: "bg-slate-400", text: "text-slate-400", bg: "bg-slate-50", label: "Esgotado" };
  if (vagas <= 2)
    return {
      dot: "bg-rose-500",
      text: "text-rose-600",
      bg: "bg-rose-50",
      label: `Últimas ${vagas}`,
    };
  if (vagas <= 5)
    return {
      dot: "bg-amber-500",
      text: "text-amber-600",
      bg: "bg-amber-50",
      label: `${vagas} disponíveis`,
    };
  return {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    label: `${vagas} disponíveis`,
  };
}

export function LinhasPassagensScreen() {
  const [busca, setBusca] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("busca") || sp.get("destino") || "";
    }
    return "";
  });
  const [cidadeSelecionada, setCidadeSelecionada] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const c = sp.get("cidade") || sp.get("destino");
      if (c) {
        const match = CIDADES_FILTRO.find((item) => item.toLowerCase() === c.toLowerCase());
        if (match) return match;
      }
    }
    return "Todas";
  });

  const hojeIso = new Date().toISOString().split("T")[0]!;
  const amanhaDate = new Date();
  amanhaDate.setDate(amanhaDate.getDate() + 1);
  const amanhaIso = amanhaDate.toISOString().split("T")[0]!;

  const [dataSelecionadaIso, setDataSelecionadaIso] = useState<string>(hojeIso);
  const [filtroTurno, setFiltroTurno] = useState<"todos" | "manha" | "tarde" | "noite">("todos");
  const [horariosSelecionados, setHorariosSelecionados] = useState<Record<string, string>>({});
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [paradasAbertas, setParadasAbertas] = useState<Record<string, boolean>>({});

  const [viagemParaComprar, setViagemParaComprar] = useState<DadosViagemCompra | null>(null);
  const [modalCompraAberto, setModalCompraAberto] = useState(false);

  const proximaSaidaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setHoraAtual(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const textoDataSelecionada = useMemo(() => {
    if (dataSelecionadaIso === hojeIso) return "Hoje";
    if (dataSelecionadaIso === amanhaIso) return "Amanhã";
    const [ano, mes, dia] = dataSelecionadaIso.split("-").map(Number);
    const d = new Date(ano!, mes! - 1, dia!);
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  }, [dataSelecionadaIso, hojeIso, amanhaIso]);

  const diasRapidos = useMemo(() => {
    const lista = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0]!;
      let label = "Hoje";
      if (i === 1) label = "Amanhã";
      else if (i > 1) {
        label = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
      }
      lista.push({ iso, label });
    }
    return lista;
  }, []);

  /* ─── Busca expandida: cidade, destino, nome de rota e ID da linha ─── */
  const rotasFiltradas = useMemo(() => {
    return ROTAS_OFICIAIS.filter((r) => {
      if (busca) {
        const q = busca.toLowerCase().trim();
        const matchOrigem = r.origem.toLowerCase().includes(q);
        const matchDestino = r.destino.toLowerCase().includes(q);
        const matchId = r.id.toLowerCase().includes(q);
        const matchLinha = `linha ${r.id}`.includes(q) || `linha#${r.id}`.includes(q);
        const matchParada = r.paradas.some((p) => p.toLowerCase().includes(q));
        if (!matchOrigem && !matchDestino && !matchId && !matchLinha && !matchParada) {
          return false;
        }
      }
      if (cidadeSelecionada !== "Todas") {
        const matchOrigem = r.origem.toLowerCase().includes(cidadeSelecionada.toLowerCase());
        const matchDestino = r.destino.toLowerCase().includes(cidadeSelecionada.toLowerCase());
        if (!matchOrigem && !matchDestino) return false;
      }
      return true;
    });
  }, [busca, cidadeSelecionada]);

  /* ─── Card "Próxima Saída" inteligente ─── */
  const proximaSaida = useMemo(() => {
    if (dataSelecionadaIso !== hojeIso) return null;

    let melhor: { rota: RotaBase; horario: HorarioDisponivel } | null = null;

    for (const rota of rotasFiltradas) {
      const horarios = calcularHorariosDisponiveisRota(rota, horaAtual, hojeIso);
      for (const h of horarios) {
        if (h.podeComprar && h.status !== "encerrado" && h.vagasLivres > 0) {
          if (!melhor || h.minutosAteSaida < melhor.horario.minutosAteSaida) {
            melhor = { rota, horario: h };
          }
          break;
        }
      }
    }
    return melhor;
  }, [rotasFiltradas, horaAtual, dataSelecionadaIso, hojeIso]);

  function alternarParadas(rotaId: string) {
    setParadasAbertas((prev) => ({ ...prev, [rotaId]: !prev[rotaId] }));
  }

  function selecionarHorario(rotaId: string, horarioId: string) {
    setHorariosSelecionados((prev) => ({ ...prev, [rotaId]: horarioId }));
  }

  function iniciarCompra(rota: RotaBase, horario: HorarioDisponivel) {
    setViagemParaComprar({
      id: rota.id,
      origem: rota.origem,
      destino: rota.destino,
      horarioSaida: `${horario.horarioSaida} (${horario.dataTexto})`,
      dataViagem: horario.dataIso,
      tempoEstimado: horario.tempoEstimadoTexto,
      valorPassagem: horario.valorPassagem,
      motorista: horario.motoristaNome,
      motoristaFoto: horario.motoristaFoto,
      placa: horario.vanPlaca,
      modelo: horario.vanModelo,
      starlinkWifi: horario.starlinkWifi,
    });
    setModalCompraAberto(true);
  }

  function obterProximoHorarioId(horariosExibidos: HorarioDisponivel[]): string | undefined {
    const proximo = horariosExibidos.find(
      (h) => h.podeComprar && h.status !== "encerrado" && h.vagasLivres > 0,
    );
    return proximo?.id;
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-900 pb-10">
      {/* ═══ 1. HEADER COMPACTO COM INDICADOR LIVE ═══ */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-3 sm:px-4 py-2 border-b border-slate-200/80 shadow-2xs">
        <div className="w-full max-w-2xl mx-auto flex items-center justify-between">
          <Link
            to="/app"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-center">
            <h1 className="text-[13px] font-bold text-slate-900 tracking-tight">
              Linhas e horários
            </h1>
            <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Dados atualizados em tempo real
            </span>
          </div>
          <Link
            to="/app/viagem"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5930] hover:bg-emerald-100 transition-all"
            title="Minhas Passagens"
          >
            <Ticket className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* ═══ 2. ÁREA DE FILTROS COMPACTA ═══ */}
      <main className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-3 space-y-2.5">
        {/* ── Busca Protagonista ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Para onde você quer ir?"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-11 pr-10 min-h-[52px] h-[52px] rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-[#0d5930]/40 focus:border-[#0d5930] shadow-xs transition-all"
          />
          {!busca && (
            <span className="absolute left-11 top-[32px] text-[10px] text-slate-400 font-medium pointer-events-none">
              Cidade, linha ou destino
            </span>
          )}
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs cursor-pointer hover:bg-slate-200 transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {/* ── Chips de Cidades ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
          {CIDADES_FILTRO.map((cidade) => (
            <button
              key={cidade}
              type="button"
              onClick={() => setCidadeSelecionada(cidade)}
              className={`min-h-[34px] px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                cidadeSelecionada === cidade
                  ? "bg-[#0d5930] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cidade}
            </button>
          ))}
        </div>

        {/* ── Quando você vai? + Turno ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">Quando?</span>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
              {diasRapidos.map((item) => {
                const ativo = dataSelecionadaIso === item.iso;
                return (
                  <button
                    key={item.iso}
                    type="button"
                    onClick={() => setDataSelecionadaIso(item.iso)}
                    className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all shrink-0 font-semibold ${
                      ativo
                        ? "bg-[#0d5930] text-white shadow-xs font-bold"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="relative shrink-0">
              <input
                type="date"
                min={hojeIso}
                value={dataSelecionadaIso}
                onChange={(e) => {
                  if (e.target.value) setDataSelecionadaIso(e.target.value);
                }}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                title="Escolher outra data"
              />
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors pointer-events-none">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-full w-fit">
            {(
              [
                { id: "todos", label: "Todos" },
                { id: "manha", label: "Manhã" },
                { id: "tarde", label: "Tarde" },
                { id: "noite", label: "Noite" },
              ] as const
            ).map((t) => {
              const ativo = filtroTurno === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFiltroTurno(t.id)}
                  className={`px-3 py-1 rounded-full text-[11px] transition-all font-semibold ${
                    ativo
                      ? "bg-white text-slate-900 font-bold shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ 3. CARD "PRÓXIMA SAÍDA" INTELIGENTE ═══ */}
        {proximaSaida && (
          <div
            ref={proximaSaidaRef}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border border-emerald-200/80 p-3.5 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                    Próxima saída
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {proximaSaida.rota.origem.split("(")[0]?.trim()} →{" "}
                  {proximaSaida.rota.destino.split("(")[0]?.trim()}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-bold text-[#0d5930] text-base">
                    {proximaSaida.horario.horarioSaida}
                  </span>
                  <span className="text-slate-300">•</span>
                  {(() => {
                    const v = vagasCor(
                      proximaSaida.horario.vagasLivres,
                      proximaSaida.horario.vagasLivres === 0,
                    );
                    return (
                      <span className={`flex items-center gap-1 font-semibold ${v.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
                        {v.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => iniciarCompra(proximaSaida.rota, proximaSaida.horario)}
                className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0d5930] text-white text-xs font-bold shadow-xs hover:bg-[#147a44] active:scale-95 transition-all"
              >
                <Ticket className="h-3.5 w-3.5 text-amber-300" />
                Comprar
              </button>
            </div>
          </div>
        )}

        {/* ═══ 4. LISTA DE ROTAS — CARDS COM NARRATIVA VISUAL ═══ */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 px-0.5">
            {rotasFiltradas.length === 0
              ? "Nenhuma rota encontrada"
              : `${rotasFiltradas.length} ${rotasFiltradas.length === 1 ? "rota encontrada" : "rotas encontradas"}`}
            {cidadeSelecionada !== "Todas" && (
              <>
                {" "}
                <span className="text-slate-300">•</span> {cidadeSelecionada}
              </>
            )}
            <>
              {" "}
              <span className="text-slate-300">•</span>{" "}
              <span className="text-[#0d5930] font-bold">{textoDataSelecionada}</span>
            </>
          </p>

          {rotasFiltradas.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
              <Compass className="h-8 w-8 text-slate-300 mx-auto" />
              <strong className="text-sm font-bold text-slate-700 block">
                Nenhuma rota encontrada
              </strong>
              <p className="text-xs text-slate-500">
                Tente ajustar a cidade ou limpar o campo de busca.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBusca("");
                  setCidadeSelecionada("Todas");
                }}
                className="px-4 py-2 rounded-xl bg-[#0d5930] text-white text-xs font-bold mt-2 hover:bg-[#147a44] transition-colors"
              >
                Ver todas as linhas
              </button>
            </div>
          ) : (
            rotasFiltradas.map((rota) => {
              const todosHorarios = calcularHorariosDisponiveisRota(
                rota,
                horaAtual,
                dataSelecionadaIso,
              );
              let horariosExibidos = todosHorarios;

              if (filtroTurno !== "todos") {
                horariosExibidos = horariosExibidos.filter((h) => {
                  const hora = parseInt(h.horarioSaida.split(":")[0] || "0", 10);
                  if (filtroTurno === "manha") return hora >= 5 && hora < 12;
                  if (filtroTurno === "tarde") return hora >= 12 && hora < 18;
                  if (filtroTurno === "noite") return hora >= 18 && hora <= 23;
                  return true;
                });
              }

              const proximoHorarioId = obterProximoHorarioId(horariosExibidos);

              const idSelecionado =
                horariosSelecionados[rota.id] || proximoHorarioId || horariosExibidos[0]?.id;
              const horarioAtual =
                horariosExibidos.find((h) => h.id === idSelecionado) || horariosExibidos[0];

              if (!horarioAtual) return null;
              const paradasExpandidas = paradasAbertas[rota.id] || false;

              return (
                <div
                  key={rota.id}
                  className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:border-emerald-200/80"
                >
                  {/* Topo: Identificação + VIP tag */}
                  <div className="p-3.5 pb-0">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Linha Executiva #{rota.id}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                        <Wifi className="h-2.5 w-2.5" />✦ VIP
                      </span>
                    </div>

                    {/* Narrativa visual de rota */}
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-[#0d5930] ring-2 ring-emerald-200" />
                        <div className="w-px h-6 bg-gradient-to-b from-[#0d5930] to-slate-300" />
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-400 ring-2 ring-slate-200" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm font-bold text-slate-900 truncate leading-tight">
                          {rota.origem.split("(")[0]?.trim()}
                        </p>
                        <p className="text-sm font-bold text-slate-900 truncate leading-tight">
                          {rota.destino.split("(")[0]?.trim()}
                        </p>
                      </div>
                    </div>

                    {/* Metadados compactos */}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mb-3">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {rota.origem.match(/\(([^)]+)\)/)?.[1] || rota.origem} • {rota.distanciaKm}{" "}
                        km • {horarioAtual.tempoEstimadoTexto}
                      </span>
                    </div>
                  </div>

                  {/* Grid de Horários Inteligentes */}
                  <div className="px-3.5 pb-2">
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                      Horários disponíveis
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                      {horariosExibidos.map((h) => {
                        const selecionado = h.id === horarioAtual.id;
                        const esgotado = h.vagasLivres === 0;
                        const encerrado = h.status === "encerrado";
                        const isProxima =
                          h.id === proximoHorarioId && dataSelecionadaIso === hojeIso;
                        const v = vagasCor(h.vagasLivres, esgotado);

                        return (
                          <button
                            key={h.id}
                            type="button"
                            disabled={esgotado || encerrado}
                            onClick={() => selecionarHorario(rota.id, h.id)}
                            className={`relative px-1 py-1.5 rounded-xl text-center flex flex-col items-center justify-center transition-all active:scale-95 border ${
                              selecionado
                                ? "bg-[#0d5930] text-white border-[#0d5930] shadow-xs ring-2 ring-emerald-300/50"
                                : encerrado
                                  ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                                  : esgotado
                                    ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-60"
                                    : "bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                            }`}
                          >
                            {isProxima && !selecionado && (
                              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-px rounded-full whitespace-nowrap">
                                Próxima
                              </span>
                            )}
                            {isProxima && selecionado && (
                              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase tracking-wider text-white bg-amber-500 px-1.5 py-px rounded-full whitespace-nowrap">
                                Próxima
                              </span>
                            )}
                            <span
                              className={`text-xs font-bold leading-tight ${encerrado ? "line-through" : ""}`}
                            >
                              {h.horarioSaida}
                            </span>
                            <span
                              className={`text-[8px] font-semibold mt-0.5 ${
                                selecionado
                                  ? "text-white/80"
                                  : encerrado
                                    ? "text-slate-300"
                                    : v.text
                              }`}
                            >
                              {encerrado
                                ? "encerrado"
                                : esgotado
                                  ? "esgotado"
                                  : `${h.vagasLivres} vagas`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rodapé: Ocupação + Preço + CTA */}
                  <div className="mx-3.5 mb-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {horarioAtual.vagasOcupadas}/{horarioAtual.vagasTotais} ocupadas
                        </span>
                        {(() => {
                          const v = vagasCor(
                            horarioAtual.vagasLivres,
                            horarioAtual.vagasLivres === 0,
                          );
                          return (
                            <span className={`flex items-center gap-1 ${v.text} font-bold`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
                              {v.label}
                            </span>
                          );
                        })()}
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">
                        ~{horarioAtual.horarioChegadaPrevisto}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          horarioAtual.categoriaLotacao === "alta" ||
                          horarioAtual.categoriaLotacao === "esgotada"
                            ? "bg-rose-500"
                            : horarioAtual.percentualOcupacao >= 50
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${horarioAtual.percentualOcupacao}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[9px] font-medium text-slate-400 block leading-none">
                          Tarifa
                        </span>
                        <strong className="text-base font-bold text-slate-900 leading-tight">
                          R$ {horarioAtual.valorPassagem.toFixed(2).replace(".", ",")}
                        </strong>
                      </div>

                      <button
                        type="button"
                        disabled={!horarioAtual.podeComprar}
                        onClick={() => iniciarCompra(rota, horarioAtual)}
                        className={`flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-all active:scale-[0.97] cursor-pointer ${
                          horarioAtual.podeComprar
                            ? "bg-[#0d5930] hover:bg-[#147a44]"
                            : "bg-slate-300 cursor-not-allowed"
                        }`}
                      >
                        <Ticket className="h-3.5 w-3.5 text-amber-300" />
                        <span>{horarioAtual.podeComprar ? "Comprar" : "Esgotado"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Motorista + Paradas */}
                  <div className="px-3.5 pb-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={horarioAtual.motoristaFoto}
                        alt={horarioAtual.motoristaNome}
                        className="h-6 w-6 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <span className="text-[11px] text-slate-500 font-medium truncate">
                        {horarioAtual.motoristaNome}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => alternarParadas(rota.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#0d5930] hover:underline shrink-0"
                    >
                      <span>{paradasExpandidas ? "Ocultar trevos" : "Ver trevos"}</span>
                      {paradasExpandidas ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>

                  {paradasExpandidas && (
                    <div className="px-3.5 pb-3.5 border-t border-slate-100 pt-2.5 space-y-1.5 animate-in fade-in">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Pontos de embarque no trajeto
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {rota.paradas.map((parada, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-600 flex items-center gap-2"
                          >
                            <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className="truncate">{parada}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      <ModalCompraPassagem
        aberto={modalCompraAberto}
        onFechar={() => setModalCompraAberto(false)}
        viagem={viagemParaComprar}
      />
    </div>
  );
}
