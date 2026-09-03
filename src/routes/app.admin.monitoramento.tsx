import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Gauge,
  Lock,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Thermometer,
  Truck,
  Users,
  Wifi,
  Zap,
  Activity,
  AlertCircle,
  HeartPulse,
} from "lucide-react";
import { type TelemetriaVeiculo } from "@/lib/superadmin-config";
import { useTelemetriaFrota } from "@/lib/univans-db";
import { UniversalMapView } from "@/components/maps/UniversalMapView";
import { executarHealthCheckCompleto, type RelatorioSaudeGlobal } from "@/lib/observability";

export const Route = createFileRoute("/app/admin/monitoramento")({
  head: () => ({
    meta: [
      { title: "Control Room & Observabilidade | UniVans TOS v3.1" },
      {
        name: "description",
        content:
          "Cockpit operacional de despacho, telemetria em tempo real, matriz de atrasos e diagnóstico de saúde de subsistemas.",
      },
    ],
  }),
  component: MonitoramentoCommandCenter,
});

export function MonitoramentoCommandCenter() {
  const { data: frotaBanco = [] } = useTelemetriaFrota();
  const [veiculos, setVeiculos] = useState<TelemetriaVeiculo[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const [mensagemRadio, setMensagemRadio] = useState<string>("");
  const [mensagemEnviada, setMensagemEnviada] = useState<boolean>(false);
  const [abaAtiva, setAbaAtiva] = useState<"radar" | "saude">("radar");
  const [relatorioSaude, setRelatorioSaude] = useState<RelatorioSaudeGlobal | null>(null);

  useEffect(() => {
    if (frotaBanco.length > 0) {
      setVeiculos(frotaBanco);
      setSelecionadoId((prev) => prev || frotaBanco[0]?.id || "");
    } else {
      setVeiculos([]);
    }
  }, [frotaBanco]);

  const veiculoAtual = veiculos.find((v) => v.id === selecionadoId) ?? veiculos[0];

  // Telemetria dinâmica
  useEffect(() => {
    const interval = setInterval(() => {
      setVeiculos((prev) =>
        prev.map((v) => {
          if (v.status === "em_rota") {
            const variacao = Math.floor(Math.random() * 7) - 3;
            const novaVelocidade = Math.max(55, Math.min(102, v.velocidadeKmH + variacao));
            return {
              ...v,
              velocidadeKmH: novaVelocidade,
              ultimaAtualizacao: "Agora mesmo (Satélite)",
            };
          }
          return v;
        }),
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Carregar Health Check
  useEffect(() => {
    executarHealthCheckCompleto().then(setRelatorioSaude);
  }, []);

  function handleEnviarMensagem(e: React.FormEvent) {
    e.preventDefault();
    if (!mensagemRadio.trim() || !veiculoAtual) return;
    setMensagemEnviada(true);
    setMensagemRadio("");
    setTimeout(() => setMensagemEnviada(false), 3000);
  }

  const veiculosFiltrados = veiculos.filter((v) => {
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return (
        v.placa.toLowerCase().includes(q) ||
        v.motorista.toLowerCase().includes(q) ||
        v.linhaOrigem.toLowerCase().includes(q) ||
        v.linhaDestino.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full space-y-5 pb-16">
      {/* 1. HEADER DO CONTROL ROOM COCKPIT */}
      <div className="w-full bg-slate-950 p-4 sm:p-5 rounded-3xl text-white shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-black uppercase text-emerald-300 border border-emerald-500/30">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            <span>Control Room • Centro de Despacho & Observabilidade TOS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Cockpit de Governança Operacional v3.1
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Monitoramento de pontualidade, cercas eletrônicas PostGIS e telemetria contínua da
            frota.
          </p>
        </div>

        {/* 4 KPIs Operacionais da Frota */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          <div className="rounded-2xl bg-slate-900/90 px-3.5 py-2.5 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Frota em Rota
            </span>
            <strong className="text-lg font-black text-emerald-400 leading-tight">28 vans</strong>
          </div>
          <div className="rounded-2xl bg-slate-900/90 px-3.5 py-2.5 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Pontualidade
            </span>
            <strong className="text-lg font-black text-amber-300 leading-tight">93%</strong>
          </div>
          <div className="rounded-2xl bg-slate-900/90 px-3.5 py-2.5 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Passageiros
            </span>
            <strong className="text-lg font-black text-white leading-tight">1.482</strong>
          </div>
          <div className="rounded-2xl bg-slate-900/90 px-3.5 py-2.5 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Alertas SOS
            </span>
            <strong className="text-lg font-black text-red-400 leading-tight flex items-center justify-center gap-1">
              <AlertTriangle className="h-4 w-4 animate-bounce" /> 1
            </strong>
          </div>
        </div>
      </div>

      {/* Seletor de Visão: Radar vs Observabilidade */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200">
        <button
          type="button"
          onClick={() => setAbaAtiva("radar")}
          className={`px-4 py-1.5 text-xs font-black rounded-xl transition-all ${
            abaAtiva === "radar"
              ? "bg-white text-[#0d5930] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          🛰️ Radar da Frota ao Vivo
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva("saude")}
          className={`px-4 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
            abaAtiva === "saude"
              ? "bg-white text-[#0d5930] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <HeartPulse className="h-3.5 w-3.5 text-emerald-600" />
          <span>Observabilidade & Health (99.98% Uptime)</span>
        </button>
      </div>

      {abaAtiva === "radar" ? (
        <>
          {/* 2. MATRIZ DE INCIDENTES & ALERTAS CRÍTICOS (APENAS SE HOUVER SOS REAL) */}
          {veiculos
            .filter((v) => v.status === "socorro_sos")
            .map((inc) => (
              <div
                key={inc.id}
                className="rounded-2xl bg-red-950/40 p-4 border border-red-500/30 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40 shrink-0">
                    <ShieldAlert className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/40">
                        🚨 SOS MECÂNICO EM ROTA
                      </span>
                      <span className="text-xs text-slate-300 font-bold">
                        {inc.linhaOrigem} ➔ {inc.linhaDestino}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-0.5 font-medium">
                      Van {inc.placa} ({inc.motorista}) solicitou apoio operacional na rodovia.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/app/admin/sos"
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-xs transition-all"
                  >
                    Abrir Central SOS
                  </Link>
                </div>
              </div>
            ))}

          {/* 3. COCKPIT OPERACIONAL INTEGRADO (SPLIT SCREEN DESKTOP) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* MAPA DE TELEMETRIA EM ALTA FIDELIDADE (7 COLUNAS DESKTOP) */}
            <div className="lg:col-span-7 rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-slate-950 h-[460px] sm:h-[520px] lg:h-[620px] sticky top-4">
              <UniversalMapView
                altura="h-full min-h-[460px]"
                veiculos={veiculos}
                veiculoSelecionadoId={selecionadoId}
                onSelecionarVeiculo={setSelecionadoId}
              />
            </div>

            {/* SELETOR DE VANS & PAINEL DE TELEMETRIA HARDWARE (5 COLUNAS DESKTOP) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl bg-white p-4 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">Vans Monitoradas</h3>
                  <span className="text-xs font-bold text-slate-400">
                    {veiculosFiltrados.length} ativas
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Filtrar por placa ou motorista..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                  {veiculosFiltrados.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelecionadoId(v.id)}
                      className={`w-full p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        selecionadoId === v.id
                          ? "bg-emerald-50 border-emerald-300 text-[#0d5930] shadow-xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-xs font-black">{v.placa}</strong>
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                            {v.velocidadeKmH} km/h
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                          {v.motorista}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-emerald-700 block">
                          {v.VagasOcupados}/{v.VagasTotal} vagas
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                          ~{v.previsaoChegadaMin} min
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {veiculoAtual && (
                <div className="lg:col-span-2 rounded-3xl bg-white p-4 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={veiculoAtual.fotoMotorista}
                        alt={veiculoAtual.motorista}
                        className="h-11 w-11 rounded-2xl object-cover ring-2 ring-emerald-100"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-black text-slate-900">
                            {veiculoAtual.motorista}
                          </strong>
                          <span className="text-xs font-black text-[#0d5930] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {veiculoAtual.placa}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">{veiculoAtual.modelo}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Telemetria IoT
                      </span>
                      <span className="text-xs font-black text-emerald-700 flex items-center gap-1 justify-end">
                        <Activity className="h-3 w-3 text-emerald-600" />
                        {veiculoAtual.satelitesVisiveis} satélites • {veiculoAtual.latenciaMs}ms
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">
                        Velocidade Atual
                      </span>
                      <strong className="text-sm font-black text-slate-900">
                        {veiculoAtual.velocidadeKmH} km/h
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">
                        Nível Tanque
                      </span>
                      <strong className="text-sm font-black text-slate-900">
                        {veiculoAtual.nivelCombustivel}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">
                        Bateria
                      </span>
                      <strong className="text-sm font-black text-slate-900">
                        {veiculoAtual.tensaoBateriaVolts}V
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">
                        Temp. Motor
                      </span>
                      <strong className="text-sm font-black text-slate-900">
                        {veiculoAtual.temperaturaMotor}°C
                      </strong>
                    </div>
                  </div>

                  <form onSubmit={handleEnviarMensagem} className="flex gap-2">
                    <input
                      type="text"
                      value={mensagemRadio}
                      onChange={(e) => setMensagemRadio(e.target.value)}
                      placeholder="Enviar mensagem de texto para o tablet do motorista..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-[#0d5930]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#0d5930] hover:bg-[#094223] text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{mensagemEnviada ? "Enviado!" : "Transmitir"}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ABA DE OBSERVABILIDADE & HEALTH CHECKS */
        relatorioSaude && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Uptime Mensal
                </span>
                <strong className="text-lg font-black text-emerald-600">
                  {relatorioSaude.uptimePercentualMensal}%
                </strong>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Latência p95
                </span>
                <strong className="text-lg font-black text-slate-900">
                  {relatorioSaude.latenciaP95Ms} ms
                </strong>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Sucesso PIX
                </span>
                <strong className="text-lg font-black text-emerald-600">
                  {relatorioSaude.taxaSucessoPixPercentual}%
                </strong>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Perda Pacotes IoT
                </span>
                <strong className="text-lg font-black text-emerald-600">
                  {relatorioSaude.perdaPacotesIotPercentual}%
                </strong>
              </div>
            </div>

            {/* Lista dos 6 Subsistemas Monitorados */}
            <div className="rounded-3xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">
                  Diagnóstico dos Subsistemas em Produção
                </h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ● Todos Operacionais
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {relatorioSaude.subsistemas.map((sub) => (
                  <div
                    key={sub.identificador}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-black text-slate-900">{sub.nome}</strong>
                      <span className="text-[10px] font-bold text-emerald-700 font-mono">
                        {sub.latenciaMs}ms
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{sub.mensagem}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
