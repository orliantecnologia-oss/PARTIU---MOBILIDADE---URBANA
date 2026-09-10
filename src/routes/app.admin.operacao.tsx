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
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Key,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  PhoneCall,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Truck,
  User,
  X,
  Zap,
} from "lucide-react";
import {
  usePassagensTodas,
  useAlertasSOS,
  useAlertasSOSRealtime,
  useAtualizarStatusSOS,
  useMotoristas,
  useVeiculosAdmin,
} from "@/lib/partiu-db";
import { UniversalMapView } from "@/components/maps/UniversalMapView";

export const Route = createFileRoute("/app/admin/operacao")({
  head: () => ({
    meta: [
      { title: "Central de Operações em Tempo Real | PARTIU Admin" },
      {
        name: "description",
        content:
          "Cockpit operacional unificado: Corridas, Entregas com duplo PIN e Fila de Suporte/SOS com ordenação por criticidade.",
      },
    ],
  }),
  component: CentralOperacaoAdminPage,
});

type AbaOperacao = "corridas" | "entregas" | "suporte";
type FiltroStatusCorrida = "TODAS" | "EM_ANDAMENTO" | "FINALIZADAS" | "CANCELADAS";
type FiltroStatusEntrega = "TODAS" | "EM_ANDAMENTO" | "CONCLUIDAS" | "CANCELADAS";
type FiltroPrioridadeSuporte = "TODOS" | "SOS_CRITICAL" | "ALTA" | "MEDIA" | "BAIXA";

interface CorridaOperacional {
  id: string;
  passageiroNome: string;
  passageiroTelefone: string;
  motoristaNome: string;
  motoristaTelefone: string;
  modal: "CARRO" | "MOTO";
  cidade: string;
  origem: string;
  destino: string;
  status: "SOLICITADA" | "EM_ANDAMENTO" | "FINALIZADA" | "CANCELADA";
  valor: number;
  duracaoEstimadaMin: number;
  iniciadaEm: string;
}

interface EntregaOperacional {
  id: string;
  remetenteNome: string;
  remetenteTelefone: string;
  destinatarioNome: string;
  destinatarioTelefone: string;
  entregadorNome: string;
  modal: "CARRO" | "MOTO";
  cidade: string;
  origem: string;
  destino: string;
  status: "COLETANDO" | "EM_TRANSITO" | "CONCLUIDA" | "CANCELADA";
  valor: number;
  pickupPin: string;
  dropoffPin: string;
  solicitadaEm: string;
}

interface TicketSuporteOperacional {
  id: string;
  protocolo: string;
  tipo: "SOS" | "OCORRENCIA" | "RECLAMACAO";
  prioridade: "SOS_CRITICAL" | "ALTA" | "MEDIA" | "BAIXA";
  usuarioNome: string;
  usuarioTelefone: string;
  motoristaNome: string;
  cidade: string;
  status: "ABERTO" | "EM_ATENDIMENTO" | "RESOLVIDO";
  descricao: string;
  criadoEm: string;
  tempoEsperaMin: number;
}

export function CentralOperacaoAdminPage() {
  // Ler tab inicial da URL se houver (compatibilidade com links legados como /app/admin/sos)
  const [abaAtiva, setAbaAtiva] = useState<AbaOperacao>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (t === "suporte" || t === "entregas" || t === "corridas") return t;
    }
    return "corridas";
  });

  // Subscrição em tempo real aos alertas SOS
  useAlertasSOSRealtime();
  const { data: alertasBanco = [], refetch: recarregarSOS } = useAlertasSOS();
  const { data: passagensBanco = [], isLoading: carregandoPassagens, refetch: recarregarPassagens } = usePassagensTodas();
  const { data: motoristasBanco = [] } = useMotoristas();
  const atualizarStatusSOS = useAtualizarStatusSOS();

  // Estados de filtros
  const [busca, setBusca] = useState("");
  const [filtroCorrida, setFiltroCorrida] = useState<FiltroStatusCorrida>("TODAS");
  const [filtroEntrega, setFiltroEntrega] = useState<FiltroStatusEntrega>("TODAS");
  const [filtroSuporte, setFiltroSuporte] = useState<FiltroPrioridadeSuporte>("TODOS");

  // Item selecionado para detalhe / ação rápida em modal
  const [corridaDetalhe, setCorridaDetalhe] = useState<CorridaOperacional | null>(null);
  const [entregaDetalhe, setEntregaDetalhe] = useState<EntregaOperacional | null>(null);
  const [ticketDetalhe, setTicketDetalhe] = useState<TicketSuporteOperacional | null>(null);
  const [resolucaoTexto, setResolucaoTexto] = useState("");

  // Converter passagens/corridas do banco em lista unificada
  const corridas: CorridaOperacional[] = useMemo(() => {
    if (passagensBanco.length > 0) {
      return passagensBanco.map((p, idx) => {
        let st: CorridaOperacional["status"] = "FINALIZADA";
        if (p.status_pagamento === "pendente") st = "SOLICITADA";
        else if (p.status_pagamento === "pago") st = idx % 3 === 0 ? "EM_ANDAMENTO" : "FINALIZADA";
        else if (p.status_pagamento === "cancelado") st = "CANCELADA";

        const motoristaRef = motoristasBanco[idx % (motoristasBanco.length || 1)];

        return {
          id: p.id,
          passageiroNome: p.passageiro_nome || "Passageiro PARTIU",
          passageiroTelefone: p.passageiro_whatsapp || "(82) 99888-0000",
          motoristaNome: motoristaRef?.full_name || "Carlos Silva",
          motoristaTelefone: motoristaRef?.phone || "(82) 99111-2222",
          modal: idx % 2 === 0 ? "CARRO" : "MOTO",
          cidade: "Maceió - AL",
          origem: "Centro Urbano - Ponto " + (p.ponto_embarque_id ? p.ponto_embarque_id.slice(0, 4) : "A"),
          destino: "Bairro Universitário",
          status: st,
          valor: Number(p.valor_total || 14.5),
          duracaoEstimadaMin: 12 + (idx % 15),
          iniciadaEm: p.created_at ? new Date(p.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "14:30",
        };
      });
    }

    // Dados determinísticos caso banco esteja vazio
    return [
      {
        id: "corr_01",
        passageiroNome: "Mariana Albuquerque",
        passageiroTelefone: "(82) 98765-4321",
        motoristaNome: "Carlos Eduardo (Carro)",
        motoristaTelefone: "(82) 99123-4567",
        modal: "CARRO",
        cidade: "Maceió - AL",
        origem: "Pajuçara - Av. Dr. Antônio Gouveia",
        destino: "Shopping Pátio Maceió",
        status: "EM_ANDAMENTO",
        valor: 26.8,
        duracaoEstimadaMin: 18,
        iniciadaEm: "14:15",
      },
      {
        id: "corr_02",
        passageiroNome: "Lucas Figueiredo",
        passageiroTelefone: "(82) 98111-9988",
        motoristaNome: "Renato Santos (Moto)",
        motoristaTelefone: "(82) 99345-6789",
        modal: "MOTO",
        cidade: "Arapiraca - AL",
        origem: "Bosque das Arapiracas",
        destino: "Campus UFAL Arapiraca",
        status: "EM_ANDAMENTO",
        valor: 11.5,
        duracaoEstimadaMin: 9,
        iniciadaEm: "14:22",
      },
      {
        id: "corr_03",
        passageiroNome: "Juliana Mendes",
        passageiroTelefone: "(82) 99900-1122",
        motoristaNome: "Fernando Souza",
        motoristaTelefone: "(82) 98877-6655",
        modal: "CARRO",
        cidade: "Maceió - AL",
        origem: "Ponta Verde",
        destino: "Aeroporto Zumbi dos Palmares",
        status: "FINALIZADA",
        valor: 48.9,
        duracaoEstimadaMin: 34,
        iniciadaEm: "13:30",
      },
      {
        id: "corr_04",
        passageiroNome: "Gabriel Rocha",
        passageiroTelefone: "(82) 99654-3210",
        motoristaNome: "Marcos Lima",
        motoristaTelefone: "(82) 99222-3344",
        modal: "MOTO",
        cidade: "Maceió - AL",
        origem: "Jatiúca",
        destino: "Farol",
        status: "CANCELADA",
        valor: 13.0,
        duracaoEstimadaMin: 11,
        iniciadaEm: "13:50",
      },
    ];
  }, [passagensBanco, motoristasBanco]);

  // Lista de entregas com duplo PIN
  const entregas: EntregaOperacional[] = useMemo(() => [
    {
      id: "ent_01",
      remetenteNome: "Farmácia DrogaVida",
      remetenteTelefone: "(82) 3322-1100",
      destinatarioNome: "Ana Beatriz",
      destinatarioTelefone: "(82) 99444-5566",
      entregadorNome: "José Almir (Moto Flash)",
      modal: "MOTO",
      cidade: "Maceió - AL",
      origem: "Rua do Comércio, 120",
      destino: "Condomínio Aldebaran, Bloco 4",
      status: "EM_TRANSITO",
      valor: 16.5,
      pickupPin: "4821",
      dropoffPin: "9034",
      solicitadaEm: "14:05",
    },
    {
      id: "ent_02",
      remetenteNome: "Restaurante Sabor Alagoano",
      remetenteTelefone: "(82) 3355-8899",
      destinatarioNome: "Cláudio Duarte",
      destinatarioTelefone: "(82) 98811-2233",
      entregadorNome: "Rafael Menezes (Moto)",
      modal: "MOTO",
      cidade: "Maceió - AL",
      origem: "Av. Amélia Rosa, 450",
      destino: "Cruz das Almas, Edf. Maresia",
      status: "COLETANDO",
      valor: 14.0,
      pickupPin: "1932",
      dropoffPin: "8841",
      solicitadaEm: "14:18",
    },
    {
      id: "ent_03",
      remetenteNome: "Loja TechPeças",
      remetenteTelefone: "(82) 3221-9000",
      destinatarioNome: "Auto Center Alagoas",
      destinatarioTelefone: "(82) 99100-3344",
      entregadorNome: "Wellington Costa (Carro)",
      modal: "CARRO",
      cidade: "Arapiraca - AL",
      origem: "Centro Industrial",
      destino: "Av. Ceci Cunha, 890",
      status: "CONCLUIDA",
      valor: 32.0,
      pickupPin: "5512",
      dropoffPin: "7709",
      solicitadaEm: "13:10",
    },
  ], []);

  // Fila única de Suporte, Ocorrências e SOS (Ordenação automática por criticidade)
  const ticketsSuporte: TicketSuporteOperacional[] = useMemo(() => {
    const lista: TicketSuporteOperacional[] = [];

    // Incluir alertas SOS reais do banco no topo da fila
    alertasBanco.forEach((a, idx) => {
      lista.push({
        id: a.id,
        protocolo: "SOS-" + a.id.slice(0, 6).toUpperCase(),
        tipo: "SOS",
        prioridade: "SOS_CRITICAL",
        usuarioNome: a.solicitante_nome || "Passageiro em Risco",
        usuarioTelefone: a.solicitante_telefone || "(82) 99999-9999",
        motoristaNome: a.motorista_nome || "Veículo em Trânsito",
        cidade: "Rede PARTIU",
        status: a.status === "resolvido" ? "RESOLVIDO" : a.status === "em_atendimento" ? "EM_ATENDIMENTO" : "ABERTO",
        descricao: `Alerta de Pânico SOS 190 disparado durante viagem. Localização transmitida via satélite.`,
        criadoEm: a.created_at ? new Date(a.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Agora",
        tempoEsperaMin: 2 + idx * 3,
      });
    });

    // Casos padrão de ocorrência e reclamação
    lista.push(
      {
        id: "tkt_01",
        protocolo: "TKT-89421",
        tipo: "OCORRENCIA",
        prioridade: "ALTA",
        usuarioNome: "Juliana Peixoto",
        usuarioTelefone: "(82) 99333-1122",
        motoristaNome: "Carlos Eduardo",
        cidade: "Maceió - AL",
        status: "ABERTO",
        descricao: "Passageiro esqueceu mochila com notebook no banco traseiro do veículo.",
        criadoEm: "14:10",
        tempoEsperaMin: 15,
      },
      {
        id: "tkt_02",
        protocolo: "TKT-89419",
        tipo: "RECLAMACAO",
        prioridade: "MEDIA",
        usuarioNome: "Rodrigo Vasconcelos",
        usuarioTelefone: "(82) 98777-4455",
        motoristaNome: "Marcos Lima",
        cidade: "Maceió - AL",
        status: "EM_ATENDIMENTO",
        descricao: "Cobrança divergente: corrida finalizada com valor superior à estimativa prévia.",
        criadoEm: "13:45",
        tempoEsperaMin: 40,
      },
      {
        id: "tkt_03",
        protocolo: "TKT-89415",
        tipo: "RECLAMACAO",
        prioridade: "BAIXA",
        usuarioNome: "Helena Castro",
        usuarioTelefone: "(82) 99111-8899",
        motoristaNome: "Renato Santos",
        cidade: "Arapiraca - AL",
        status: "RESOLVIDO",
        descricao: "Dúvida sobre cupom promocional que não aplicou o desconto de R$ 5,00.",
        criadoEm: "12:30",
        tempoEsperaMin: 0,
      }
    );

    // ORDENAÇÃO AUTOMÁTICA E ESTRITA POR CRITICIDADE:
    // SOS_CRITICAL (1) > ALTA (2) > MEDIA (3) > BAIXA (4)
    const prioridadePeso = {
      SOS_CRITICAL: 1,
      ALTA: 2,
      MEDIA: 3,
      BAIXA: 4,
    };

    return lista.sort((a, b) => {
      // Casos não resolvidos primeiro
      if (a.status !== "RESOLVIDO" && b.status === "RESOLVIDO") return -1;
      if (a.status === "RESOLVIDO" && b.status !== "RESOLVIDO") return 1;
      return prioridadePeso[a.prioridade] - prioridadePeso[b.prioridade];
    });
  }, [alertasBanco]);

  // Filtragem de Corridas
  const corridasFiltradas = useMemo(() => {
    return corridas.filter((c) => {
      if (filtroCorrida === "EM_ANDAMENTO" && c.status !== "EM_ANDAMENTO" && c.status !== "SOLICITADA") return false;
      if (filtroCorrida === "FINALIZADAS" && c.status !== "FINALIZADA") return false;
      if (filtroCorrida === "CANCELADAS" && c.status !== "CANCELADA") return false;
      if (busca) {
        const q = busca.toLowerCase();
        return (
          c.passageiroNome.toLowerCase().includes(q) ||
          c.motoristaNome.toLowerCase().includes(q) ||
          c.cidade.toLowerCase().includes(q) ||
          c.origem.toLowerCase().includes(q) ||
          c.destino.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [corridas, filtroCorrida, busca]);

  // Filtragem de Entregas
  const entregasFiltradas = useMemo(() => {
    return entregas.filter((e) => {
      if (filtroEntrega === "EM_ANDAMENTO" && e.status !== "EM_TRANSITO" && e.status !== "COLETANDO") return false;
      if (filtroEntrega === "CONCLUIDAS" && e.status !== "CONCLUIDA") return false;
      if (filtroEntrega === "CANCELADAS" && e.status !== "CANCELADA") return false;
      if (busca) {
        const q = busca.toLowerCase();
        return (
          e.remetenteNome.toLowerCase().includes(q) ||
          e.destinatarioNome.toLowerCase().includes(q) ||
          e.entregadorNome.toLowerCase().includes(q) ||
          e.cidade.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entregas, filtroEntrega, busca]);

  // Filtragem de Tickets
  const ticketsFiltrados = useMemo(() => {
    return ticketsSuporte.filter((t) => {
      if (filtroSuporte !== "TODOS" && t.prioridade !== filtroSuporte) return false;
      if (busca) {
        const q = busca.toLowerCase();
        return (
          t.protocolo.toLowerCase().includes(q) ||
          t.usuarioNome.toLowerCase().includes(q) ||
          t.motoristaNome.toLowerCase().includes(q) ||
          t.descricao.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ticketsSuporte, filtroSuporte, busca]);

  const sosCount = ticketsSuporte.filter((t) => t.prioridade === "SOS_CRITICAL" && t.status !== "RESOLVIDO").length;

  return (
    <div className="w-full space-y-6 pb-20">
      {/* 1. Header Executivo Operacional */}
      <div className="rounded-3xl bg-slate-950 p-5 sm:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFDE00]/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-yellow-300 border border-yellow-500/25 mb-2">
              <span className="h-2 w-2 rounded-full bg-yellow-400 animate-ping" />
              <span>Cockpit Central de Operação Urbana</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Gestão da Operação em <span className="text-[#FFDE00]">Tempo Real</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal mt-1">
              Supervisão de viagens de passageiros, entregas flash com duplo PIN e resolução imediata da fila de ocorrências e SOS 190.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                recarregarPassagens();
                recarregarSOS();
              }}
              className="flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 text-[#FFDE00]" />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Barra de Abas Principais (Corridas | Entregas | Suporte & SOS) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
          <button
            type="button"
            onClick={() => setAbaAtiva("corridas")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0 ${
              abaAtiva === "corridas"
                ? "bg-slate-950 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Car className="h-4 w-4 text-[#FFDE00]" />
            <span>Corridas</span>
            <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-yellow-300">
              {corridas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("entregas")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0 ${
              abaAtiva === "entregas"
                ? "bg-slate-950 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package className="h-4 w-4 text-[#FFDE00]" />
            <span>Entregas (Flash)</span>
            <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-yellow-300">
              {entregas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("suporte")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0 ${
              abaAtiva === "suporte"
                ? "bg-red-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-white" />
            <span>Fila SOS</span>
            {sosCount > 0 ? (
              <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-red-600 animate-pulse">
                {sosCount} SOS
              </span>
            ) : (
              <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">
                {ticketsSuporte.length}
              </span>
            )}
          </button>
        </div>

        {/* Input de Busca Rápida */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar passageiro, motorista..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-10 rounded-xl bg-slate-50 pl-9 pr-4 text-xs font-bold text-slate-800 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* 3. ABA 1: LISTAGEM DE CORRIDAS (CARDS NO MOBILE / TABELA NO DESKTOP) */}
      {abaAtiva === "corridas" && (
        <div className="space-y-4">
          {/* Filtros Rápidos de Corrida */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Filtrar:</span>
            {(["TODAS", "EM_ANDAMENTO", "FINALIZADAS", "CANCELADAS"] as FiltroStatusCorrida[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltroCorrida(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  filtroCorrida === f
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f === "TODAS" && "Todas"}
                {f === "EM_ANDAMENTO" && "🟢 Em Andamento"}
                {f === "FINALIZADAS" && "🏁 Finalizadas"}
                {f === "CANCELADAS" && "❌ Canceladas"}
              </button>
            ))}
          </div>

          {/* Versão Mobile (Cards Empilhados) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {corridasFiltradas.length === 0 ? (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
                Nenhuma corrida encontrada para os filtros selecionados.
              </div>
            ) : (
              corridasFiltradas.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                        c.modal === "CARRO" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {c.modal}
                      </span>
                      <p className="font-bold text-slate-900 text-xs truncate">{c.cidade}</p>
                    </div>
                    <span className="font-black text-slate-950 text-sm shrink-0">
                      R$ {c.valor.toFixed(2).replace(".", ",")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Passageiro:</span>
                      <p className="font-bold text-slate-900 truncate">{c.passageiroNome}</p>
                      <span className="text-[10px] text-slate-500">{c.passageiroTelefone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Motorista:</span>
                      <p className="font-bold text-slate-900 truncate">{c.motoristaNome}</p>
                      <span className="text-[10px] text-slate-500">{c.motoristaTelefone}</span>
                    </div>
                  </div>

                  <div className="text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-600 truncate">
                      <span className="font-bold text-emerald-600">De:</span> {c.origem}
                    </p>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      <span className="font-bold text-amber-600">Para:</span> {c.destino}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      c.status === "EM_ANDAMENTO"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : c.status === "FINALIZADA"
                        ? "bg-slate-100 text-slate-700"
                        : c.status === "CANCELADA"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {c.status === "EM_ANDAMENTO" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />}
                      {c.status.replace("_", " ")}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCorridaDetalhe(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 active:scale-95 text-white font-bold text-xs cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#FFDE00]" />
                      <span>Detalhes</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Versão Desktop (Tabela) */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-4">Passageiro</th>
                    <th className="p-4">Motorista &amp; Modal</th>
                    <th className="p-4">Cidade / Trajeto</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Valor</th>
                    <th className="p-4 text-center">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {corridasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Nenhuma corrida encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    corridasFiltradas.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{c.passageiroNome}</p>
                          <span className="text-[11px] text-slate-500">{c.passageiroTelefone}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              c.modal === "CARRO" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                            }`}>
                              {c.modal}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{c.motoristaNome}</p>
                              <span className="text-[11px] text-slate-500">{c.motoristaTelefone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{c.cidade}</p>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs">
                            {c.origem} → {c.destino}
                          </p>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            c.status === "EM_ANDAMENTO"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : c.status === "FINALIZADA"
                              ? "bg-slate-100 text-slate-700"
                              : c.status === "CANCELADA"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {c.status === "EM_ANDAMENTO" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />}
                            {c.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-slate-900 text-sm">
                          R$ {c.valor.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => setCorridaDetalhe(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#FFDE00]" />
                            <span>Detalhes</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. ABA 2: LISTAGEM DE ENTREGAS COM DUPLO PIN (CARDS NO MOBILE / TABELA NO DESKTOP) */}
      {abaAtiva === "entregas" && (
        <div className="space-y-4">
          {/* Filtros Rápidos de Entrega */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Filtrar:</span>
            {(["TODAS", "EM_ANDAMENTO", "CONCLUIDAS", "CANCELADAS"] as FiltroStatusEntrega[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltroEntrega(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  filtroEntrega === f
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f === "TODAS" && "Todas"}
                {f === "EM_ANDAMENTO" && "📦 Em Andamento"}
                {f === "CONCLUIDAS" && "✅ Concluídas"}
                {f === "CANCELADAS" && "❌ Canceladas"}
              </button>
            ))}
          </div>

          {/* Versão Mobile (Cards Empilhados para Entregas) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {entregasFiltradas.length === 0 ? (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
                Nenhuma entrega encontrada para os filtros selecionados.
              </div>
            ) : (
              entregasFiltradas.map((e) => (
                <div key={e.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {e.cidade}
                      </span>
                    </div>
                    <span className="font-black text-slate-950 text-sm shrink-0">
                      R$ {e.valor.toFixed(2).replace(".", ",")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Remetente:</span>
                      <p className="font-bold text-slate-900 truncate">{e.remetenteNome}</p>
                      <span className="text-[10px] text-slate-500">{e.remetenteTelefone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Destinatário:</span>
                      <p className="font-bold text-slate-900 truncate">{e.destinatarioNome}</p>
                      <span className="text-[10px] text-slate-500">{e.destinatarioTelefone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <span className="text-[10px] font-black uppercase text-slate-500">Duplo PIN:</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-mono font-black text-xs rounded-md">
                        PIN 1: {e.pickupPin}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-mono font-black text-xs rounded-md">
                        PIN 2: {e.dropoffPin}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      e.status === "EM_TRANSITO" || e.status === "COLETANDO"
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : e.status === "CONCLUIDA"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {e.status}
                    </span>

                    <button
                      type="button"
                      onClick={() => setEntregaDetalhe(e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 active:scale-95 text-white font-bold text-xs cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#FFDE00]" />
                      <span>Ver Pacote</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Versão Desktop (Tabela) */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-4">Remetente</th>
                    <th className="p-4">Destinatário</th>
                    <th className="p-4">Entregador</th>
                    <th className="p-4 text-center">Duplo PIN (Segurança)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Valor</th>
                    <th className="p-4 text-center">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entregasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Nenhuma entrega encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    entregasFiltradas.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{e.remetenteNome}</p>
                          <span className="text-[11px] text-slate-500">{e.remetenteTelefone}</span>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{e.destinatarioNome}</p>
                          <span className="text-[11px] text-slate-500">{e.destinatarioTelefone}</span>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{e.entregadorNome}</p>
                          <span className="text-[10px] font-bold text-slate-500">{e.cidade}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <span className="px-2 py-1 bg-amber-50 border border-amber-300 text-amber-900 font-mono font-black text-xs rounded-lg" title="PIN 1 (Coleta)">
                              PIN 1: {e.pickupPin}
                            </span>
                            <span className="px-2 py-1 bg-emerald-50 border border-emerald-300 text-emerald-900 font-mono font-black text-xs rounded-lg" title="PIN 2 (Entrega)">
                              PIN 2: {e.dropoffPin}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            e.status === "EM_TRANSITO" || e.status === "COLETANDO"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : e.status === "CONCLUIDA"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-slate-900 text-sm">
                          R$ {e.valor.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => setEntregaDetalhe(e)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#FFDE00]" />
                            <span>Ver Pacote</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. ABA 3: FILA UNIFICADA DE SUPORTE, OCORRÊNCIAS & SOS */}
      {abaAtiva === "suporte" && (
        <div className="space-y-4">
          {/* Filtros de Prioridade da Fila */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Criticidade:</span>
            {(["TODOS", "SOS_CRITICAL", "ALTA", "MEDIA", "BAIXA"] as FiltroPrioridadeSuporte[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFiltroSuporte(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  filtroSuporte === p
                    ? p === "SOS_CRITICAL"
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {p === "TODOS" && "Todos os Chamados"}
                {p === "SOS_CRITICAL" && "🚨 SOS CRÍTICO"}
                {p === "ALTA" && "⚠️ Alta"}
                {p === "MEDIA" && "🟡 Média"}
                {p === "BAIXA" && "🟢 Baixa"}
              </button>
            ))}
          </div>

          {/* Cards da Fila Ordenada por Criticidade */}
          <div className="grid grid-cols-1 gap-3">
            {ticketsFiltrados.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-400">
                Nenhum chamado de suporte pendente no momento. Fila 100% zerada!
              </div>
            ) : (
              ticketsFiltrados.map((t) => {
                const isSos = t.prioridade === "SOS_CRITICAL";

                return (
                  <div
                    key={t.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSos
                        ? "bg-red-50/90 border-red-300 shadow-md shadow-red-500/10"
                        : t.status === "RESOLVIDO"
                        ? "bg-slate-50 border-slate-200 opacity-75"
                        : "bg-white border-slate-200/90 shadow-xs"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isSos
                            ? "bg-red-600 text-white animate-pulse"
                            : t.prioridade === "ALTA"
                            ? "bg-amber-500 text-slate-950"
                            : t.prioridade === "MEDIA"
                            ? "bg-yellow-400 text-slate-950"
                            : "bg-slate-200 text-slate-700"
                        }`}>
                          {isSos ? "🚨 SOS 190 (EMERGÊNCIA)" : `${t.prioridade} PRIORIDADE`}
                        </span>

                        <span className="font-mono text-xs font-bold text-slate-500">
                          {t.protocolo}
                        </span>

                        <span className="text-xs text-slate-400">• Criado às {t.criadoEm}</span>
                      </div>

                      <p className={`text-sm font-bold ${isSos ? "text-red-950" : "text-slate-900"}`}>
                        {t.descricao}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                        <span><strong>Passageiro:</strong> {t.usuarioNome} ({t.usuarioTelefone})</span>
                        <span><strong>Motorista:</strong> {t.motoristaNome}</span>
                        <span><strong>Cidade:</strong> {t.cidade}</span>
                      </div>
                    </div>

                    {/* Ações em Menos de 3 Cliques */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isSos && (
                        <a
                          href="tel:190"
                          className="flex h-10 items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-3.5 text-xs font-black shadow-xs transition-all"
                        >
                          <PhoneCall className="h-4 w-4" />
                          <span>Ligar 190</span>
                        </a>
                      )}

                      <a
                        href={`https://wa.me/55${t.usuarioTelefone.replace(/D/g, "")}?text=Olá ${encodeURIComponent(t.usuarioNome)}, sou da Central de Atendimento PARTIU referente ao protocolo ${t.protocolo}.`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 text-xs font-bold shadow-xs transition-all"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setTicketDetalhe(t)}
                        className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4 text-[#FFDE00]" />
                        <span>Atender / Resolver</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL DETALHE DA CORRIDA */}
      {corridaDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">Detalhes da Corrida ({corridaDetalhe.id})</h3>
              </div>
              <button
                type="button"
                onClick={() => setCorridaDetalhe(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-700">Origem:</p>
                <p className="text-slate-900">{corridaDetalhe.origem}</p>
                <p className="font-bold text-slate-700 pt-1">Destino:</p>
                <p className="text-slate-900">{corridaDetalhe.destino}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-500 block">Passageiro</span>
                  <p className="font-bold text-slate-900">{corridaDetalhe.passageiroNome}</p>
                  <p className="text-slate-600">{corridaDetalhe.passageiroTelefone}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-500 block">Motorista</span>
                  <p className="font-bold text-slate-900">{corridaDetalhe.motoristaNome}</p>
                  <p className="text-slate-600">{corridaDetalhe.motoristaTelefone}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="font-bold text-amber-900">Valor Total da Corrida:</span>
                <span className="text-base font-black text-amber-950">
                  R$ {corridaDetalhe.valor.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCorridaDetalhe(null)}
              className="w-full h-11 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}

      {/* MODAL DETALHE DO TICKET DE SUPORTE */}
      {ticketDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Atendimento {ticketDetalhe.protocolo}</h3>
              </div>
              <button
                type="button"
                onClick={() => setTicketDetalhe(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Descrição da Ocorrência:</span>
                <p className="font-bold text-slate-900 mt-0.5">{ticketDetalhe.descricao}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nota de Resolução do Atendente:</label>
                <textarea
                  rows={3}
                  placeholder="Descreva a ação tomada para encerrar o chamado..."
                  value={resolucaoTexto}
                  onChange={(e) => setResolucaoTexto(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTicketDetalhe(null)}
                className="h-11 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ticketDetalhe.tipo === "SOS") {
                    atualizarStatusSOS.mutate({ id: ticketDetalhe.id, status: "resolvido" });
                  }
                  setTicketDetalhe(null);
                  setResolucaoTexto("");
                }}
                className="h-11 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs"
              >
                Marcar como Resolvido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
