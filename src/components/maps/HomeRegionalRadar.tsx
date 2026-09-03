import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Radio,
  MapPin,
  Compass,
  Wifi,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Gauge,
  Check,
  Layers,
  Lock,
} from "lucide-react";
import { UniversalMapView } from "@/components/maps/UniversalMapView";
import { getTelemetriaVeiculos, type TelemetriaVeiculo } from "@/lib/superadmin-config";
import { getPontosEmbarqueConfig, type PontoEmbarqueConfig } from "@/lib/pontos-embarque-store";
import { useGeolocation, calcularDistanciaKm } from "@/lib/use-geolocation";
import { temPassagemAtivaParaRadar } from "@/lib/passagens-store";

interface HomeRegionalRadarProps {
  onSelecionarPontoOrigem?: (cidadeOuPonto: string) => void;
  onComprarPassagemVan?: (van: TelemetriaVeiculo) => void;
}

export function HomeRegionalRadar({ onSelecionarPontoOrigem }: HomeRegionalRadarProps) {
  const [modoVisualizacao, setModoVisualizacao] = useState<"vans" | "pontos">("vans");
  const [pontoAtivoId, setPontoAtivoId] = useState<string>("emb-mcz-01");
  const [vanAtivaId, setVanAtivaId] = useState<string | null>("van-01");
  const [temPassagemAtiva] = useState<boolean>(() => temPassagemAtivaParaRadar());

  const { coords } = useGeolocation();
  const veiculos = useMemo(() => getTelemetriaVeiculos(), []);
  const pontos = useMemo(() => getPontosEmbarqueConfig().filter((p) => p.ativo), []);

  const pontoSelecionado = useMemo(() => {
    return pontos.find((p) => p.id === pontoAtivoId) || pontos[0]!;
  }, [pontos, pontoAtivoId]);

  // Detector de Geofence: se o usuário estiver a menos de 300m (0.3km) do ponto selecionado
  const noRaioDoTrevo = useMemo(() => {
    if (!coords || pontoSelecionado.lat === undefined || pontoSelecionado.lng === undefined) return false;
    const dist = calcularDistanciaKm(
      coords.latitude,
      coords.longitude,
      pontoSelecionado.lat,
      pontoSelecionado.lng,
    );
    return dist <= 0.3;
  }, [coords, pontoSelecionado]);

  const vanSelecionada = useMemo(() => {
    if (!vanAtivaId) return veiculos[0]!;
    return veiculos.find((v) => v.id === vanAtivaId) || veiculos[0]!;
  }, [veiculos, vanAtivaId]);

  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden space-y-3 p-4 sm:p-5">
      {/* 1. CABEÇALHO DO RADAR COM CONTROLES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
              Radar Regional em Tempo Real
            </span>
          </div>
          <h2 className="text-sm font-black text-slate-900 mt-0.5">
            {modoVisualizacao === "vans"
              ? "Vans em Trânsito na Região"
              : "Pontos de Embarque nos Trevos"}
          </h2>
        </div>

        {/* Pílulas de Alternância Real (Vans vs Pontos) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setModoVisualizacao("vans");
              setVanAtivaId("van-01");
            }}
            className={`flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 ${
              modoVisualizacao === "vans"
                ? "bg-[#0d5930] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Radio
              className={`h-4 w-4 ${modoVisualizacao === "vans" ? "animate-pulse text-amber-300" : ""}`}
            />
            <span>Vans (28)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModoVisualizacao("pontos");
              setPontoAtivoId("emb-mcz-01");
            }}
            className={`flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 ${
              modoVisualizacao === "pontos"
                ? "bg-[#0d5930] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Trevos ({pontos.length})</span>
          </button>
        </div>
      </div>

      {/* 2. CONTAINER DO MAPA INTERATIVO COM FLYTO REAL */}
      <div className="relative h-[290px] sm:h-[340px] w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-inner bg-slate-950">
        <UniversalMapView
          altura="h-[290px] sm:h-[340px]"
          mostrarCardInferior={false}
          modo={modoVisualizacao}
          veiculoSelecionadoId={modoVisualizacao === "vans" ? vanAtivaId : undefined}
          pontoSelecionadoId={modoVisualizacao === "pontos" ? pontoAtivoId : undefined}
          onSelecionarVeiculo={(id) => setVanAtivaId(id)}
          onSelecionarPonto={(id) => setPontoAtivoId(id)}
        />

        {/* OVERLAY DE SEGURANÇA SE NÃO TIVER PASSAGEM ATIVA E TENTAR VER VANS AO VIVO */}
        {modoVisualizacao === "vans" && !temPassagemAtiva && (
          <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center text-white space-y-2.5 animate-in fade-in">
            <div className="h-11 w-11 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shadow-lg">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                🔒 Radar em Tempo Real Restrito
              </span>
              <h4 className="text-xs sm:text-sm font-black text-white">
                Rastreamento ao Vivo da Frota
              </h4>
              <p className="text-[11px] text-slate-300 leading-snug">
                Disponível exclusivamente para passageiros com <strong>passagem ativa</strong> no
                sistema.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Link
                to="/app/linhas"
                className="px-3.5 py-2 rounded-xl bg-[#0d5930] hover:bg-[#147a44] text-white text-xs font-black shadow-md active:scale-95 transition-all"
              >
                Comprar Passagem
              </Link>
              <button
                type="button"
                onClick={() => setModoVisualizacao("pontos")}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all border border-white/10"
              >
                Ver Trevos & Pontos
              </button>
            </div>
          </div>
        )}

        {/* Overlay Superior de Status Flutuante (com margem direita para os botões do mapa) */}
        <div className="absolute top-2.5 left-2.5 right-14 sm:right-16 flex items-center justify-between pointer-events-none z-10">
          <div className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold border border-white/20 flex items-center gap-1.5 pointer-events-auto shadow-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate">
              {modoVisualizacao === "vans"
                ? `${veiculos.length} Vans Starlink`
                : `${pontos.length} Trevos`}
            </span>
          </div>

          <Link
            to="/app/viagem"
            className="bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black border border-slate-200 shadow-md flex items-center gap-1 pointer-events-auto active:scale-95 transition-all shrink-0"
          >
            <span>Tela Cheia</span>
            <ChevronRight className="h-3 w-3 text-slate-500" />
          </Link>
        </div>
      </div>

      {/* 3. TIRA INFERIOR INTELIGENTE DE ACORDO COM A ABA ATIVA */}
      {modoVisualizacao === "vans" && vanSelecionada && (
        <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={vanSelecionada.fotoMotorista}
              alt={vanSelecionada.motorista}
              className="h-10 w-10 rounded-xl object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <strong className="text-xs font-black text-slate-900 truncate">
                  {vanSelecionada.motorista}
                </strong>
                <span className="text-[10px] font-black text-amber-500">★ 4.9</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate font-medium">
                {vanSelecionada.linhaOrigem} ➔ {vanSelecionada.linhaDestino} •{" "}
                <strong>{vanSelecionada.placa}</strong>
              </p>
            </div>
          </div>

          <Link
            to="/app/linhas"
            className="flex items-center gap-1.5 min-h-[44px] h-11 px-4 py-2 rounded-xl bg-[#0d5930] hover:bg-[#147a44] text-white text-xs sm:text-sm font-black shrink-0 active:scale-95 transition-all shadow-xs"
          >
            <span>Ver Horários</span>
            <ChevronRight className="h-4 w-4 text-amber-300" />
          </Link>
        </div>
      )}

      {modoVisualizacao === "pontos" && pontoSelecionado && (
        <div className="space-y-2">
          {/* Seletor Rápido dos Pontos mais Próximos */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {pontos.slice(0, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPontoAtivoId(p.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all active:scale-95 cursor-pointer ${
                  p.id === pontoAtivoId
                    ? "bg-emerald-100 text-[#0d5930] border-emerald-300 font-black shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.nome.split("•")[1]?.trim() || p.nome}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-slate-50/90 p-3.5 border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#0d5930] flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <strong className="text-xs sm:text-sm font-black text-slate-900 truncate block">
                    {pontoSelecionado.nome}
                  </strong>
                  {noRaioDoTrevo && (
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                      Você está neste ponto
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 truncate block">
                  Ref: {pontoSelecionado.referencia}
                </span>
              </div>
            </div>

            {onSelecionarPontoOrigem && (
              <button
                type="button"
                onClick={() => onSelecionarPontoOrigem(pontoSelecionado.cidade)}
                className="flex items-center gap-1.5 min-h-[44px] h-11 px-4 py-2 rounded-xl bg-[#0d5930] hover:bg-[#147a44] text-white text-xs sm:text-sm font-black shrink-0 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <span>Embarcar Aqui</span>
                <ArrowRight className="h-4 w-4 text-amber-300" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
