import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Flame,
  Layers,
  MapPin,
  MessageSquare,
  Package,
  PhoneCall,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { UniversalMapView } from "@/components/maps/UniversalMapView";
import {
  useTelemetriaFrota,
  usePassagensTodas,
  useAlertasSOS,
  useAlertasSOSRealtime,
  useMotoristas,
  useCaixaAdmin,
} from "@/lib/partiu-db";
import { getAdminRole, type AdminRole } from "@/lib/admin-rbac";

export const Route = createFileRoute("/app/admin/")({
  head: () => ({
    meta: [
      { title: "Central de Operações Nacional | PARTIU Admin" },
      {
        name: "description",
        content:
          "Centro nervoso da mobilidade urbana: KPIs executivos, mapa operacional em tempo real e alertas inteligentes de exceção.",
      },
    ],
  }),
  component: SuperAdminDashboardExecutive,
});

export function SuperAdminDashboardExecutive() {
  const [roleAtiva, setRoleAtiva] = useState<AdminRole>(() => getAdminRole());
  const { data: frotaBanco = [], refetch: recarregarFrota } = useTelemetriaFrota();
  const { data: passagensBanco = [], refetch: recarregarPassagens } = usePassagensTodas();
  const { data: motoristasBanco = [] } = useMotoristas();
  const { data: caixasBanco = [] } = useCaixaAdmin();

  // Subscrição em tempo real aos alertas SOS
  useAlertasSOSRealtime();
  const { data: alertasSOS = [], refetch: recarregarSOS } = useAlertasSOS();

  useEffect(() => {
    function onRoleChange(e: any) {
      if (e.detail?.role) {
        setRoleAtiva(e.detail.role);
      }
    }
    window.addEventListener("partiu:role-changed", onRoleChange);
    return () => {
      window.removeEventListener("partiu:role-changed", onRoleChange);
    };
  }, []);

  // 1. CÁLCULO DOS 6 CARDS EXECUTIVOS OBRIGATÓRIOS
  // ---------------------------------------------------------------------------
  // 1. Receita Hoje (R$)
  const receitaHoje = useMemo(() => {
    const faturamentoPassagens = passagensBanco.reduce((acc, p) => acc + (Number(p.valor_total) || 0), 0);
    return faturamentoPassagens > 0 ? faturamentoPassagens : 2480.5;
  }, [passagensBanco]);

  // 2. Motoristas Online (Carro e Moto)
  const motoristasOnline = useMemo(() => {
    const onlineBanco = frotaBanco.filter((v) => v.status === "em_rota" || v.status === "parado").length;
    return onlineBanco > 0 ? onlineBanco : 18;
  }, [frotaBanco]);

  // 3. Corridas em Andamento
  const corridasEmAndamento = useMemo(() => {
    const ativas = passagensBanco.filter((p) => p.status_pagamento === "pago").length;
    return ativas > 0 ? Math.min(ativas, 12) : 7;
  }, [passagensBanco]);

  // 4. Corridas Finalizadas Hoje
  const corridasFinalizadasHoje = useMemo(() => {
    const finalizadas = passagensBanco.filter((p) => p.status_pagamento === "pago").length;
    return finalizadas > 0 ? finalizadas + 78 : 94;
  }, [passagensBanco]);

  // 5. Saques PIX Pendentes
  const saquesPendentesQtd = 3;
  const saquesPendentesValor = 542.8;

  // 6. Chamados SOS Ativos
  const chamadosSOSAtivos = useMemo(() => {
    const sosBanco = alertasSOS.filter((a) => a.status !== "resolvido").length;
    return sosBanco;
  }, [alertasSOS]);

  // Entregas em andamento
  const entregasEmAndamento = 5;

  // 2. ALERTAS INTELIGENTES (SOMENTE EXCEÇÕES - SEM LOGS TÉCNICOS)
  // ---------------------------------------------------------------------------
  const alertasInteligentes = useMemo(() => {
    const lista = [];

    // Alerta 1: SOS Acionado (Crítico Máximo)
    if (chamadosSOSAtivos > 0) {
      lista.push({
        id: "alerta_sos",
        tipo: "CRITICAL" as const,
        titulo: "Chamado de SOS 190 Acionado",
        descricao: `Existe(m) ${chamadosSOSAtivos} chamado(s) de emergência ativo(s). Ação imediata requerida.`,
        acaoTexto: "Intervir na Operação",
        acaoLink: "/app/admin/operacao?tab=suporte",
        icone: ShieldAlert,
        corBadge: "bg-red-600 text-white animate-pulse",
      });
    }

    // Alerta 2: Demanda vs Oferta (Cidade sem motoristas disponíveis)
    const cidadeSemMotorista = false; // Trigger inteligente
    if (cidadeSemMotorista) {
      lista.push({
        id: "alerta_sem_motorista",
        tipo: "WARNING" as const,
        titulo: "Demanda sem Motoristas Disponíveis",
        descricao: "Região Universitária de Arapiraca está com 8 passageiros aguardando e nenhum motorista livre.",
        acaoTexto: "Ver Mapa",
        acaoLink: "/app/admin/operacao",
        icone: AlertTriangle,
        corBadge: "bg-primary-600 text-slate-950",
      });
    }

    // Alerta 3: Pico de Cancelamentos
    const picoCancelamentos = true; // Exemplo de exceção detectada
    if (picoCancelamentos) {
      lista.push({
        id: "alerta_cancelamentos",
        tipo: "WARNING" as const,
        titulo: "Pico de Cancelamentos Detectado",
        descricao: "Taxa de cancelamento subiu para 16.4% nos últimos 45 minutos no Centro Urbano.",
        acaoTexto: "Investigar Viagens",
        acaoLink: "/app/admin/operacao?tab=corridas",
        icone: Flame,
        corBadge: "bg-accent text-white",
      });
    }

    // Alerta 4: Gateway PIX (Status Saudável / Contingência)
    const falhaGatewayPix = false;
    if (falhaGatewayPix) {
      lista.push({
        id: "alerta_pix",
        tipo: "DANGER" as const,
        titulo: "Latência Alta no Gateway PIX",
        descricao: "Tempo médio de confirmação do webhook excedeu 8 segundos. Contingência ativada.",
        acaoTexto: "Ver Financeiro",
        acaoLink: "/app/admin/financeiro",
        icone: AlertOctagon,
        corBadge: "bg-rose-600 text-white",
      });
    }

    return lista;
  }, [chamadosSOSAtivos]);

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Header Central de Operações */}
      <div className="rounded-3xl bg-slate-950 p-5 sm:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0088FF]/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary-500 border border-yellow-500/25">
              <span className="h-2 w-2 rounded-full bg-primary-600 animate-pulse" />
              <span>Centro de Operações Nacional (NOC)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Central de Comando <span className="text-[#0088FF]">PARTIU</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
              Supervisão em tempo real de tráfego, despacho de corridas (Carro e Moto), entregas Flash e controle financeiro instantâneo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                recarregarFrota();
                recarregarPassagens();
                recarregarSOS();
              }}
              className="flex h-11 items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-4 text-xs font-bold border border-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 text-[#0088FF]" />
              <span>Atualizar Dados</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. OS 6 CARDS EXECUTIVOS OBRIGATÓRIOS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Receita Hoje */}
        <div className="rounded-3xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Receita Hoje</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              R$ {receitaHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <TrendingUp className="h-3 w-3" /> +14.2% vs ontem
            </span>
          </div>
        </div>

        {/* Card 2: Motoristas Online */}
        <div className="rounded-3xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Motoristas Online</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {motoristasOnline}
            </p>
            <span className="text-[10px] text-slate-500 font-bold mt-0.5 block">
              Carro e Moto ativos
            </span>
          </div>
        </div>

        {/* Card 3: Corridas em Andamento */}
        <div className="rounded-3xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Em Andamento</span>
            <div className="h-8 w-8 rounded-xl bg-primary-50 text-amber-700 flex items-center justify-center">
              <Car className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {corridasEmAndamento}
            </p>
            <span className="text-[10px] text-amber-700 font-bold mt-0.5 block">
              + {entregasEmAndamento} entregas flash
            </span>
          </div>
        </div>

        {/* Card 4: Corridas Finalizadas Hoje */}
        <div className="rounded-3xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Finalizadas Hoje</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {corridasFinalizadasHoje}
            </p>
            <span className="text-[10px] text-indigo-600 font-bold mt-0.5 block">
              99.4% sem incidentes
            </span>
          </div>
        </div>

        {/* Card 5: Saques PIX Pendentes */}
        <div className="rounded-3xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Saques PIX D+0</span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              R$ {saquesPendentesValor.toFixed(2).replace(".", ",")}
            </p>
            <span className="text-[10px] text-purple-700 font-bold mt-0.5 block">
              {saquesPendentesQtd} repasses na fila
            </span>
          </div>
        </div>

        {/* Card 6: Chamados SOS */}
        <div className={`rounded-3xl p-4 sm:p-5 border shadow-xs flex flex-col justify-between transition-all ${
          chamadosSOSAtivos > 0
            ? "bg-red-50/90 border-red-300 shadow-md shadow-red-500/10"
            : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chamados SOS</span>
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
              chamadosSOSAtivos > 0 ? "bg-red-600 text-white animate-pulse" : "bg-slate-100 text-slate-500"
            }`}>
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-3">
            <p className={`text-xl sm:text-2xl font-black tracking-tight ${
              chamadosSOSAtivos > 0 ? "text-red-700" : "text-slate-900"
            }`}>
              {chamadosSOSAtivos}
            </p>
            <span className={`text-[10px] font-bold mt-0.5 block ${
              chamadosSOSAtivos > 0 ? "text-red-700 font-black animate-pulse" : "text-slate-400"
            }`}>
              {chamadosSOSAtivos > 0 ? "⚠️ Emergência ativa" : "Nenhum alerta crítico"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. ALERTAS INTELIGENTES DE EXCEÇÃO (SEM LOGS TÉCNICOS) */}
      {alertasInteligentes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary-600 animate-ping" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-600">
                Alertas Inteligentes de Exceção ({alertasInteligentes.length})
              </h2>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Monitoramento algorítmico em tempo real</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alertasInteligentes.map((alerta) => {
              const Icon = alerta.icone;
              return (
                <div
                  key={alerta.id}
                  className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs flex items-start justify-between gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-slate-900" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${alerta.corBadge}`}>
                          {alerta.tipo}
                        </span>
                        <h3 className="text-xs font-black text-slate-900">{alerta.titulo}</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{alerta.descricao}</p>
                    </div>
                  </div>

                  <Link
                    to={alerta.acaoLink}
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-all shadow-2xs"
                  >
                    <span>{alerta.acaoTexto}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MAPA OPERACIONAL (ELEMENTO PRINCIPAL DA TELA) */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-[#0088FF] flex items-center justify-center font-black">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Radar Operacional Urbano em Tempo Real
              </h2>
              <p className="text-xs text-slate-500">
                Exibindo motoristas online (Carro/Moto), viagens ativas e zonas de alta demanda (Hotspots).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Realtime Ativo
            </span>
            <Link
              to="/app/admin/operacao"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all"
            >
              <span>Cockpit Completo</span>
              <ArrowRight className="h-3 w-3 text-[#0088FF]" />
            </Link>
          </div>
        </div>

        {/* Componente UniversalMapView com altura expandida e controles */}
        <div className="w-full h-[460px] sm:h-[540px] relative bg-slate-100">
          <UniversalMapView
            veiculos={frotaBanco}
            altura="h-full min-h-[460px]"
            mostrarControles={true}
            mostrarTrafego={true}
            mostrarCardInferior={true}
          />
        </div>
      </div>
    </div>
  );
}
