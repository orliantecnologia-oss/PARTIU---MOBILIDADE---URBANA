import React, { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Clock,
  ChevronRight,
  Star,
  Flame,
  ArrowRight,
  Package,
  GraduationCap,
  Building2,
  Sparkles,
  ShoppingBag,
  Umbrella,
  Compass,
} from "lucide-react";
import {
  ROTAS_OFICIAIS,
  calcularHorariosDisponiveisRota,
  type RotaBase,
} from "@/lib/horarios-inteligentes";
import { getBilhetesPassagens } from "@/lib/passagens-store";

interface SecaoTrajetosFrequentesProps {
  origemAtual: string;
  destinoAtual: string;
  onSelecionarRota: (origem: string, destino: string) => void;
  onConsultarHorarios: (origem: string, destino: string) => void;
}

interface DestinoPopularItem {
  id: string;
  nome: string;
  polo: string;
  origemPadrao: string;
  destinoPadrao: string;
  icone: React.ComponentType<{ className?: string }>;
  tag: string;
}

const DESTINOS_POPULARES: DestinoPopularItem[] = [
  {
    id: "sulanca",
    nome: "Feira da Sulanca",
    polo: "Caruaru • PE",
    origemPadrao: "Maceió",
    destinoPadrao: "Caruaru",
    icone: ShoppingBag,
    tag: "Polo de Confecções",
  },
  {
    id: "moda-center",
    nome: "Moda Center",
    polo: "Toritama / Santa Cruz • PE",
    origemPadrao: "Tapera",
    destinoPadrao: "Toritama",
    icone: Sparkles,
    tag: "Maior Polo do País",
  },
  {
    id: "praia-frances",
    nome: "Praia do Francês",
    polo: "Marechal Deodoro • AL",
    origemPadrao: "Maceió",
    destinoPadrao: "Marechal Deodoro",
    icone: Umbrella,
    tag: "Litoral Sul & Turismo",
  },
  {
    id: "sao-francisco",
    nome: "Foz do São Francisco",
    polo: "Penedo / Piaçabuçu • AL",
    origemPadrao: "Maceió",
    destinoPadrao: "Penedo",
    icone: Compass,
    tag: "Ecoturismo Histórico",
  },
];

export function SecaoTrajetosFrequentes({
  origemAtual,
  destinoAtual,
  onSelecionarRota,
  onConsultarHorarios,
}: SecaoTrajetosFrequentesProps) {
  // 1. Diagnóstico e Inteligência de Histórico de Viagens Reais do Usuário
  const { temHistoricoReal, rotaMaisUsadaKey } = useMemo(() => {
    const bilhetes = getBilhetesPassagens();
    if (!bilhetes || bilhetes.length === 0) {
      return { temHistoricoReal: false, rotaMaisUsadaKey: null };
    }

    // Contagem de frequência por par origem -> destino
    const contagem = new Map<string, number>();
    bilhetes.forEach((b) => {
      const orig = b.origem.split("(")[0]?.trim().toLowerCase();
      const dest = b.destino.split("(")[0]?.trim().toLowerCase();
      if (orig && dest) {
        const key = `${orig}__${dest}`;
        contagem.set(key, (contagem.get(key) || 0) + 1);
      }
    });

    let maxKey = "";
    let maxCount = 0;
    contagem.forEach((count, key) => {
      if (count > maxCount) {
        maxCount = count;
        maxKey = key;
      }
    });

    return {
      temHistoricoReal: maxCount > 0,
      rotaMaisUsadaKey: maxKey,
    };
  }, []);

  // 2. Mapear Rotas Disponíveis e Enriquecer com Próxima Saída e Tarifa Real
  const rotasCardData = useMemo(() => {
    return ROTAS_OFICIAIS.map((rota) => {
      const horarios = calcularHorariosDisponiveisRota(rota);
      const proximo =
        horarios.find((h) => h.status !== "encerrado" && h.status !== "lotado") || horarios[0];

      const origLimpa = rota.origem.split("(")[0]?.trim() || rota.origem;
      const destLimpa = rota.destino.split("(")[0]?.trim() || rota.destino;

      const keyPair = `${origLimpa.toLowerCase()}__${destLimpa.toLowerCase()}`;
      const isSuaRota = temHistoricoReal && rotaMaisUsadaKey === keyPair;
      const isRotaAtual =
        origemAtual.toLowerCase().includes(origLimpa.toLowerCase()) &&
        destinoAtual.toLowerCase().includes(destLimpa.toLowerCase());

      return {
        id: rota.id,
        origemTexto: origLimpa,
        origemTerminal: rota.pontosDetalhados[0]?.referencia || "Terminal Central",
        destinoTexto: destLimpa,
        destinoTerminal:
          rota.pontosDetalhados[rota.pontosDetalhados.length - 1]?.referencia || "Terminal Urbano",
        distanciaKm: rota.distanciaKm,
        duracaoTexto: proximo?.tempoEstimadoTexto || `${Math.round(rota.duracaoBaseMinutos / 60)}h`,
        tarifa: rota.valorPassagem,
        proximaSaida: proximo?.horarioSaida || rota.gradeHorarios[0] || "06:30",
        tipoVan: rota.tipoVan,
        isSuaRota,
        isRotaAtual,
      };
    });
  }, [origemAtual, destinoAtual, temHistoricoReal, rotaMaisUsadaKey]);

  return (
    <section className="space-y-4 pt-1" aria-labelledby="titulo-secao-trajetos">
      {/* ======================================================== */}
      {/* 1. HEADER DA SEÇÃO COM HIERARQUIA TIPOGRÁFICA CLARA      */}
      {/* ======================================================== */}
      <div className="flex items-end justify-between px-1">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            {temHistoricoReal ? (
              <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                Personalizado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                <Flame className="h-3 w-3 text-emerald-600" />
                Alta Demanda
              </span>
            )}
          </div>
          <h2
            id="titulo-secao-trajetos"
            className="text-base sm:text-lg font-black text-slate-900 tracking-tight"
          >
            {temHistoricoReal ? "Seus trajetos frequentes" : "Rotas populares"}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Toque em uma rota para consultar horários e disponibilidade
          </p>
        </div>

        <Link
          to="/app/linhas"
          className="text-xs font-black text-[#0d5930] hover:text-emerald-700 flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer py-1"
        >
          <span>Ver todas</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ======================================================== */}
      {/* 2. CARROSSEL HORIZONTAL DE CARDS DE MOBILIDADE           */}
      {/* ======================================================== */}
      <div className="relative -mx-1 px-1">
        <div
          className="flex gap-3 overflow-x-auto pb-2 pt-0.5 no-scrollbar scroll-smooth snap-x snap-mandatory"
          role="region"
          aria-label="Carrossel de rotas populares e frequentes"
        >
          {rotasCardData.map((rota) => (
            <div
              key={rota.id}
              onClick={() => onSelecionarRota(rota.origemTexto, rota.destinoTexto)}
              className={`w-[250px] sm:w-[275px] shrink-0 snap-start rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-md active:scale-[0.98] relative overflow-hidden group ${
                rota.isRotaAtual
                  ? "bg-emerald-50/70 border-[#0d5930] ring-1 ring-[#0d5930]"
                  : "bg-white border-slate-200/90 hover:border-emerald-300"
              }`}
            >
              {/* Badge de Destaque Superior */}
              <div className="flex items-center justify-between gap-1 mb-2.5">
                {rota.isSuaRota ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                    Sua Rota
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                    Expresso Diário
                  </span>
                )}

                <span className="text-[11px] font-bold text-slate-400">{rota.duracaoTexto}</span>
              </div>

              {/* Trajeto Visual Conector */}
              <div className="space-y-1.5 my-1">
                {/* Ponto de Partida */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-1 flex flex-col items-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0" />
                    <span className="w-0.5 h-4.5 bg-slate-200 my-0.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                      Origem
                    </span>
                    <strong className="text-sm font-black text-slate-900 truncate block group-hover:text-[#0d5930] transition-colors">
                      {rota.origemTexto}
                    </strong>
                  </div>
                </div>

                {/* Ponto de Chegada */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-1 flex flex-col items-center">
                    <span className="h-2.5 w-2.5 rounded-xs bg-amber-500 ring-2 ring-amber-100 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                      Destino
                    </span>
                    <strong className="text-sm font-black text-slate-900 truncate block group-hover:text-amber-700 transition-colors">
                      {rota.destinoTexto}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Informações Decisivas: Próxima Saída & Preço */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    Próxima saída
                  </span>
                  <div className="flex items-center gap-1 text-slate-800 font-black text-xs mt-0.5">
                    <Clock className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span>{rota.proximaSaida}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    A partir de
                  </span>
                  <strong className="text-sm sm:text-base font-black text-[#0d5930] block">
                    R$ {rota.tarifa.toFixed(2).replace(".", ",")}
                  </strong>
                </div>
              </div>

              {/* Botão de Ação Direta */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConsultarHorarios(rota.origemTexto, rota.destinoTexto);
                }}
                className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100/90 hover:bg-[#0d5930] hover:text-white text-slate-700 text-xs font-black transition-all cursor-pointer group-hover:bg-[#0d5930] group-hover:text-white"
                aria-label={`Consultar horários de ${rota.origemTexto} para ${rota.destinoTexto}`}
              >
                <span>Consultar horários</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. DESTINOS POPULARES (POLOS DE COMPRAS & FEIRAS)         */}
      {/* ======================================================== */}
      <div className="pt-2">
        <div className="flex items-center justify-between px-1 mb-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
              Destinos populares • Polos de compras & turismo
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Acesso direto aos maiores centros de comércio e lazer
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {DESTINOS_POPULARES.map((dest) => {
            const Icone = dest.icone;
            const selecionado = destinoAtual
              .toLowerCase()
              .includes(dest.destinoPadrao.toLowerCase());

            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => onSelecionarRota(dest.origemPadrao, dest.destinoPadrao)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all active:scale-95 cursor-pointer shadow-2xs ${
                  selecionado
                    ? "bg-emerald-50/90 border-[#0d5930] ring-1 ring-[#0d5930]"
                    : "bg-white border-slate-200/80 hover:border-emerald-300 hover:bg-slate-50/80"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-[#0d5930] flex items-center justify-center shrink-0 border border-emerald-100">
                  <Icone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 block truncate">
                    {dest.tag}
                  </span>
                  <strong className="text-xs font-black text-slate-900 block truncate leading-snug">
                    {dest.nome}
                  </strong>
                  <span className="text-[10px] text-slate-500 font-medium block truncate">
                    {dest.polo}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. PROGRAMAS & SERVIÇOS COOPERATIVOS (HIERARQUIA SUBORDINADA) */}
      {/* ======================================================== */}
      <div className="pt-2">
        <div className="px-1 mb-2">
          <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
            Mais serviços & benefícios
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Gratuidades legais, tarifas com desconto e frete expresso
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Card 1: Passe Livre Social */}
          <Link
            to="/cadastro-gratuidade"
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border border-emerald-200/80 hover:border-emerald-400 transition-all shadow-2xs active:scale-95 cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-lg bg-white shadow-2xs border border-emerald-100 flex items-center justify-center shrink-0 text-[#0d5930]">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="text-xs font-black text-[#0d5930] block truncate">
                Passe Livre Social
              </strong>
              <span className="text-[10px] text-emerald-800 font-medium block truncate">
                2 Vagas/Van • Lei nº 6.557
              </span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>

          {/* Card 2: Passe Estudantil */}
          <Link
            to="/app/passe-universitario"
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-50/80 to-yellow-50/60 border border-amber-200/80 hover:border-amber-400 transition-all shadow-2xs active:scale-95 cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-lg bg-white shadow-2xs border border-amber-100 flex items-center justify-center shrink-0 text-amber-800">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="text-xs font-black text-amber-950 block truncate">
                Passe Estudantil
              </strong>
              <span className="text-[10px] text-amber-800 font-medium block truncate">
                15% OFF Universitário
              </span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-amber-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>

          {/* Card 3: Encomendas Express */}
          <Link
            to="/app/encomendas"
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-200/70 transition-all shadow-2xs active:scale-95 cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center shrink-0 text-slate-700">
              <Package className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="text-xs font-black text-slate-900 block truncate">
                Encomendas Express
              </strong>
              <span className="text-[10px] text-slate-500 font-medium block truncate">
                Despacho e Rastreio Rodoviário
              </span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        </div>
      </div>
    </section>
  );
}
