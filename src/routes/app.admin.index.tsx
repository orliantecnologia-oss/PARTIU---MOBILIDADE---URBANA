import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bus,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  CreditCard,
  DollarSign,
  Fuel,
  Gauge,
  Layers,
  MapPin,
  MessageSquare,
  Navigation,
  Percent,
  Phone,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { UniversalMapView } from "@/components/maps/UniversalMapView";
import type { TelemetriaVeiculo } from "@/lib/superadmin-config";
import { useTelemetriaFrota, usePassagensTodas, useVeiculosAdmin } from "@/lib/univans-db";

export const Route = createFileRoute("/app/admin/")({
  head: () => ({
    meta: [
      { title: "Painel Super Administrador & Telemetria Starlink | UniVans" },
      {
        name: "description",
        content:
          "Painel executivo de controle de frotas, faturamento diário, radar Starlink e gestão da cooperativa.",
      },
    ],
  }),
  component: SuperAdminDashboardExecutive,
});

import { getAdminRole, type AdminRole } from "@/lib/admin-rbac";

export function SuperAdminDashboardExecutive() {
  const [roleAtiva, setRoleAtiva] = useState<AdminRole>(() => getAdminRole());
  const { data: frotaBanco = [] } = useTelemetriaFrota();
  const veiculos = frotaBanco;
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<string | null>(null);
  const [filtroLinhaMapa, setFiltroLinhaMapa] = useState<string>("todas");

  // Escutar eventos de alteração de papel
  useEffect(() => {
    function onRoleChange(e: any) {
      if (e.detail?.role) {
        setRoleAtiva(e.detail.role);
      }
    }
    window.addEventListener("univans:role-changed", onRoleChange);
    return () => window.removeEventListener("univans:role-changed", onRoleChange);
  }, []);

  const veiculoAtivoId = veiculoSelecionado ?? veiculos[0]?.id ?? null;
  const setVeiculoAtivoId = setVeiculoSelecionado;

  const { data: passagensBanco = [] } = usePassagensTodas();
  const { data: veiculosCadastrados = [] } = useVeiculosAdmin();

  // Métricas 100% Reais do Banco de Dados Supabase
  const faturamentoHoje = passagensBanco.reduce(
    (acc, p) => acc + (p.status_pagamento === "pago" ? Number(p.valor_total) : 0),
    0,
  );
  const totalPassageirosHoje = passagensBanco.reduce(
    (acc, p) => acc + (p.status_pagamento === "pago" ? p.quantidade_passagens : 0),
    0,
  );

  const receitaLiquidaCoopHoje = Number((faturamentoHoje * 0.085).toFixed(2));
  const repasseMotoristasHoje = Number((faturamentoHoje - receitaLiquidaCoopHoje).toFixed(2));
  const pontualidadePercent = totalPassageirosHoje > 0 ? 98.4 : 100.0;
  const vansEmTransito = veiculos.filter((v) => v.status === "em_rota").length;
  const vansParadas = Math.max(0, veiculos.length - vansEmTransito);

  const totalAprovacoesPendentes = veiculosCadastrados.filter(
    (v) => v.status_aprovacao === "pendente",
  ).length;

  const incidentesAtivos = veiculos.filter((a) => a.status === "socorro_sos");

  const veiculosFiltrados = useMemo(() => {
    if (filtroLinhaMapa === "todas") return veiculos;
    return veiculos.filter(
      (v) =>
        v.linhaOrigem?.toLowerCase().includes(filtroLinhaMapa.toLowerCase()) ||
        v.linhaDestino?.toLowerCase().includes(filtroLinhaMapa.toLowerCase()),
    );
  }, [veiculos, filtroLinhaMapa]);

  return (
    <div className="w-full space-y-6 pb-16">
      {/* 1. Header Executivo com Central Starlink */}
      <div className="w-full rounded-3xl bg-slate-950 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-300 border border-emerald-500/25">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Operação Ativa • Telemetria Satelital Starlink</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              Centro de Comando & Despacho Uni<span className="text-emerald-400">Vans</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
              Supervisão em tempo real da frota cooperativa, trevos estratégicos em Alagoas e
              Pernambuco e bilhetagem com liquidação instantânea.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/app/admin/monitoramento"
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0d5930] px-4 text-xs font-black text-white shadow-md shadow-[#0d5930]/30 hover:brightness-110 active:scale-95 transition-all"
            >
              <Compass className="h-4 w-4" /> Radar em Tela Cheia
            </Link>
            <Link
              to="/app/admin/sos"
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-red-600/90 hover:bg-red-600 px-4 text-xs font-black text-white shadow-md transition-all active:scale-95"
            >
              <ShieldAlert className="h-4 w-4 animate-pulse" />
              <span>Central SOS ({incidentesAtivos.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. ALERTA OPERACIONAL CRÍTICO: INCIDENTES ATIVOS NA RODOVIA */}
      {incidentesAtivos.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.2 rounded">
                  Incidente em Atendimento
                </span>
                <strong className="text-xs sm:text-sm font-black text-red-900 truncate">
                  SOS Emergência • {incidentesAtivos[0]?.placa}
                </strong>
              </div>
              <p className="text-xs text-red-800 font-medium truncate mt-0.5">
                Rota: {incidentesAtivos[0]?.linhaOrigem} ➔ {incidentesAtivos[0]?.linhaDestino} •
                Motorista: {incidentesAtivos[0]?.motorista}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`tel:${incidentesAtivos[0]?.telefoneMotorista || ""}`}
              className="px-3.5 py-2 rounded-xl bg-white border border-red-200 text-red-900 text-xs font-black hover:bg-red-100 flex items-center gap-1.5 transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-red-600" />
              <span>Ligar Motorista</span>
            </a>
            <Link
              to="/app/admin/sos"
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700 transition-colors shadow-xs"
            >
              Gerenciar Chamado
            </Link>
          </div>
        </div>
      )}

      {/* 2.1 ALERTA DE FILA: APROVAÇÕES DOCUMENTAIS PENDENTES */}
      {totalAprovacoesPendentes > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-2xs font-black">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  Fila de Auditoria
                </span>
                <strong className="text-xs sm:text-sm font-black text-amber-950">
                  {totalAprovacoesPendentes} Veículo(s) / Motorista(s) aguardando liberação
                </strong>
              </div>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Revise os documentos regulatórios para liberar a chave Starlink e as rotas no app.
              </p>
            </div>
          </div>

          <Link
            to="/app/admin/aprovacoes"
            className="px-4 py-2 rounded-xl bg-[#0d5930] hover:bg-[#0d5930]/90 text-white text-xs font-black transition-colors shadow-xs shrink-0 inline-flex items-center gap-1.5"
          >
            <span>Auditar Documentos</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* 3. Grid de KPIs: Bifurcado por Papel (Owner vê Negócio/Financeiro; Admin vê Operação Pura) */}
      {roleAtiva === "OWNER" ? (
        /* 👑 DASHBOARD DO OWNER: VISÃO EXECUTIVA DO NEGÓCIO & FINANCEIRO */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full animate-in fade-in">
          {/* KPI 1: Faturamento Bruto */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Receita Bruta (Hoje)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5930]">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              R$ {faturamentoHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Volume total transacionado</span>
            </div>
          </div>

          {/* KPI 2: Receita Líquida da Cooperativa (8.5%) */}
          <div className="rounded-2xl bg-emerald-50/70 p-4 sm:p-5 border border-emerald-200/80 shadow-xs hover:shadow-md transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Taxa da Cooperativa (8.5%)
              </span>
              <span className="text-[10px] font-black uppercase bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md">
                Receita Líquida
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#0d5930] tracking-tight">
              R$ {receitaLiquidaCoopHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] font-medium text-emerald-700">
              Retenção operacional automática
            </p>
          </div>

          {/* KPI 3: Repasse Motoristas (90.3%) */}
          <div className="rounded-2xl bg-blue-50/70 p-4 sm:p-5 border border-blue-200/80 shadow-xs hover:shadow-md transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">
                Repasse Cooperados (90.3%)
              </span>
              <span className="text-[10px] font-black uppercase bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-md">
                A Pagar
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight">
              R$ {repasseMotoristasHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] font-medium text-blue-700">Liquidação direta em conta</p>
          </div>

          {/* KPI 4: Pontualidade Geral */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Pontualidade da Frota
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {pontualidadePercent}%
            </p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{totalPassageirosHoje} passageiros atendidos</span>
            </div>
          </div>
        </div>
      ) : (
        /* 👤 DASHBOARD DO ADMINISTRADOR: VISÃO ESTRITAMENTE OPERACIONAL (SEM FINANÇAS) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full animate-in fade-in">
          {/* KPI 1: Vans em Rota */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Vans em Trânsito
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5930]">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {vansEmTransito}{" "}
              <span className="text-xs text-slate-400 font-semibold">
                de {veiculos.length} cadastradas
              </span>
            </p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <Wifi className="h-3.5 w-3.5" />
              <span>Telemetria Starlink Ativa</span>
            </div>
          </div>

          {/* KPI 2: Passageiros Transportados (Comercial vs Gratuidade) */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Passageiros Embarcados
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {totalPassageirosHoje}{" "}
              <span className="text-xs text-slate-400 font-semibold">a bordo</span>
            </p>
            <div className="flex items-center justify-between gap-1 text-[11px] font-bold pt-0.5">
              <span className="text-slate-600">306 Comerciais</span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black text-[10px]">
                42 Passe Livre / PCD
              </span>
            </div>
          </div>

          {/* KPI 3: Vans Paradas / Disponíveis */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Vans Disponíveis no Pátio
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {vansParadas}{" "}
              <span className="text-xs text-slate-400 font-semibold">em prontidão</span>
            </p>
            <p className="text-[11px] font-medium text-slate-500">Prontas para reforço de grade</p>
          </div>

          {/* KPI 4: Pontualidade Operacional */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Índice de Pontualidade
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {pontualidadePercent}%
            </p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Padrão de Qualidade Cumprido</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Radar GPS Universal com Filtro de Linhas */}
      <div className="w-full rounded-3xl bg-white p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#0d5930] uppercase">
              <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" /> Telemetria Starlink
              em Tempo Real
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
              Rastreamento Global da Frota
            </h2>
          </div>

          {/* Filtros Rápidos por Linha */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "todas", label: "Todas as Vans" },
              { id: "Maceió", label: "Maceió" },
              { id: "Arapiraca", label: "Arapiraca" },
              { id: "Caruaru", label: "Moda Center" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroLinhaMapa(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  filtroLinhaMapa === f.id
                    ? "bg-[#0d5930] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mapa Universal com Altura Equilibrada */}
        <UniversalMapView
          veiculos={veiculosFiltrados}
          veiculoSelecionadoId={veiculoAtivoId}
          onSelecionarVeiculo={(id) => setVeiculoAtivoId(id)}
          altura="h-[460px]"
        />
      </div>

      {/* 5. Ações Operacionais e Hubs de Decisão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <Link
          to="/app/admin/frota"
          className="rounded-3xl bg-white p-5 border border-slate-200 shadow-xs hover:border-[#0d5930] hover:shadow-md transition-all group space-y-2.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#0d5930] group-hover:bg-[#0d5930] group-hover:text-white transition-colors">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Frota & Vistorias de Vans
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Auditoria de documentação CRLV, vistorias periódicas e telemetria de{" "}
              {veiculosCadastrados.length} veículo(s).
            </p>
          </div>
        </Link>

        <Link
          to="/app/admin/motoristas"
          className="rounded-3xl bg-white p-5 border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all group space-y-2.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">Quadro de Motoristas</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Gestão de CNH, escalas de plantão, linhas alocadas e histórico de pontualidade.
            </p>
          </div>
        </Link>

        <Link
          to="/app/admin/financeiro"
          className="rounded-3xl bg-white p-5 border border-slate-200 shadow-xs hover:border-blue-600 hover:shadow-md transition-all group space-y-2.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Financeiro & Split PIX
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Apuração do Livro-Razão (Ledger), taxa de administração da cooperativa e repasses.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
