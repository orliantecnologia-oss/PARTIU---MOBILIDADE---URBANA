import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  MapPin,
  Navigation,
  Play,
  Send,
  Star,
  Car,
  Package,
  KeyRound,
  ShieldCheck,
  Phone,
  MessageCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Users,
  Activity,
  DollarSign,
  Flame,
  Zap,
} from "lucide-react";
import { getCorridaAtiva, obterPainelSaudeCidade, type CorridaPartiu, type CityHealthDashboardData } from "@/lib/partiu-engine";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/admin/despacho")({
  head: () => ({
    meta: [
      { title: "Central de Despacho & Entregas Flash | PARTIU Admin" },
      {
        name: "description",
        content:
          "Controle de chamadas de corridas urbanas, entregas expressas, PIN de segurança e despacho de motoristas.",
      },
    ],
  }),
  component: DespachoCentralCorridas,
});

interface ItemDespachoMock {
  id: string;
  tipo: "CORRIDA_POP" | "CORRIDA_MOTO" | "CORRIDA_PLUS" | "CORRIDA_MULHER" | "ENTREGA_FLASH";
  passageiro: string;
  telefone: string;
  origem: string;
  destino: string;
  motorista: string;
  veiculo: string;
  placa: string;
  valor: number;
  pin: string;
  status: "PROCURANDO" | "A_CAMINHO" | "EM_VIAGEM" | "CONCLUIDA";
  tempoDecorrido: string;
}

const DESPACHOS_MOCK: ItemDespachoMock[] = [
  {
    id: "partiu-101",
    tipo: "CORRIDA_POP",
    passageiro: "Rodrigo Almeida",
    telefone: "(22) 99960-5162",
    origem: "Rua José da Silva Almeida, 45",
    destino: "Rua Amadeu Tinoco Lacerda, 492",
    motorista: "Carlos Eduardo Silva",
    veiculo: "Chevrolet Onix Plus",
    placa: "MOB-8K99",
    valor: 16.08,
    pin: "4829",
    status: "EM_VIAGEM",
    tempoDecorrido: "6 min",
  },
  {
    id: "partiu-102",
    tipo: "ENTREGA_FLASH",
    passageiro: "Loja Fluminense Express",
    telefone: "(22) 99888-1122",
    origem: "Av. Vinhosa, 280",
    destino: "Centro Médico São José",
    motorista: "Lucas Motoboy Flash",
    veiculo: "Honda CG 160 Titan",
    placa: "MOT-7799",
    valor: 9.9,
    pin: "8312",
    status: "A_CAMINHO",
    tempoDecorrido: "3 min",
  },
  {
    id: "partiu-103",
    tipo: "CORRIDA_MULHER",
    passageiro: "Camila Vasconcelos",
    telefone: "(22) 99777-3344",
    origem: "Shopping Calçadão",
    destino: "Bairro Presidente Costa e Silva",
    motorista: "Mariana Santos",
    veiculo: "Hyundai HB20 Sedan",
    placa: "PAR-5P20",
    valor: 14.5,
    pin: "9102",
    status: "PROCURANDO",
    tempoDecorrido: "1 min",
  },
];

export function DespachoCentralCorridas() {
  const [itens, setItens] = useState<ItemDespachoMock[]>(DESPACHOS_MOCK);
  const [filtro, setFiltro] = useState<"TODAS" | "CORRIDAS" | "ENTREGAS">("TODAS");
  const [busca, setBusca] = useState("");
  const saudeCidade = obterPainelSaudeCidade();

  // Sincronizar corridas reais do Supabase e eventos distribuídos
  useEffect(() => {
    async function carregarCorridasDoBanco() {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await (supabase as any)
            .from("partiu_corridas")
            .select("*, partiu_motoristas(nome, veiculo_marca_modelo, veiculo_placa)")
            .in("status", ["PROCURANDO", "OFERTADA", "A_CAMINHO", "CHEGOU", "EM_VIAGEM"])
            .order("created_at", { ascending: false })
            .limit(20);

          if (!error && data && data.length > 0) {
            const reais: ItemDespachoMock[] = data.map((c: any) => ({
              id: c.codigo_viagem || c.id,
              tipo: c.is_entrega || c.modalidade?.startsWith("ENTREGA")
                ? "ENTREGA_FLASH"
                : c.modalidade === "MOTO"
                  ? "CORRIDA_MOTO"
                  : c.modalidade === "PLUS"
                    ? "CORRIDA_PLUS"
                    : c.modalidade === "MULHER"
                      ? "CORRIDA_MULHER"
                      : "CORRIDA_POP",
              passageiro: c.passageiro_nome,
              telefone: c.passageiro_telefone,
              origem: c.origem_endereco,
              destino: c.destino_endereco,
              motorista: c.partiu_motoristas?.nome || "Buscando parceiro...",
              veiculo: c.partiu_motoristas?.veiculo_marca_modelo || "Aguardando aceite",
              placa: c.partiu_motoristas?.veiculo_placa || "---",
              valor: (c.valor_bruto_cents || 1600) / 100,
              pin: c.pin_seguranca || "----",
              status: c.status === "EM_VIAGEM" || c.status === "CHEGOU"
                ? "EM_VIAGEM"
                : c.status === "A_CAMINHO"
                  ? "A_CAMINHO"
                  : c.status === "CONCLUIDA"
                    ? "CONCLUIDA"
                    : "PROCURANDO",
              tempoDecorrido: "Ao vivo",
            }));

            setItens((prev) => {
              const idsReais = new Set(reais.map((r) => r.id));
              const outros = prev.filter((p) => !idsReais.has(p.id));
              return [...reais, ...outros];
            });
          }
        } catch (err) {
          console.warn("[AdminDespacho] Falha ao consultar corridas:", err);
        }
      }
    }

    void carregarCorridasDoBanco();

    function verificarCorridaAtiva() {
      const real = getCorridaAtiva();
      if (real && real.status !== "IDLE") {
        const itemReal: ItemDespachoMock = {
          id: real.id,
          tipo: real.isEntrega || real.modalidade?.startsWith("ENTREGA")
            ? "ENTREGA_FLASH"
            : (real.modalidade === "MOTO"
              ? "CORRIDA_MOTO"
              : real.modalidade === "PLUS"
                ? "CORRIDA_PLUS"
                : real.modalidade === "MULHER"
                  ? "CORRIDA_MULHER"
                  : "CORRIDA_POP"),
          passageiro: real.passageiroNome,
          telefone: real.passageiroTelefone,
          origem: real.origem,
          destino: real.destino,
          motorista: real.motorista?.nome || "Buscando parceiro...",
          veiculo: real.motorista?.veiculo || "Aguardando aceite",
          placa: real.motorista?.placa || "---",
          valor: real.valor,
          pin: real.pin,
          status: real.status === "EM_VIAGEM" || real.status === "CHEGOU"
            ? "EM_VIAGEM"
            : real.status === "A_CAMINHO"
              ? "A_CAMINHO"
              : real.status === "CONCLUIDA"
                ? "CONCLUIDA"
                : "PROCURANDO",
          tempoDecorrido: "Tempo real",
        };

        setItens((prev) => {
          const filtered = prev.filter((i) => i.id !== real.id);
          return [itemReal, ...filtered];
        });
      }
    }

    verificarCorridaAtiva();
    window.addEventListener("partiu:corrida-atualizada", verificarCorridaAtiva);
    window.addEventListener("partiu:corrida-atualizada", carregarCorridasDoBanco);
    return () => {
      window.removeEventListener("partiu:corrida-atualizada", verificarCorridaAtiva);
      window.removeEventListener("partiu:corrida-atualizada", carregarCorridasDoBanco);
    };
  }, []);

  const itensFiltrados = itens.filter((item) => {
    if (filtro === "CORRIDAS" && item.tipo === "ENTREGA_FLASH") return false;
    if (filtro === "ENTREGAS" && item.tipo !== "ENTREGA_FLASH") return false;
    if (busca.trim()) {
      const b = busca.toLowerCase();
      return (
        item.passageiro.toLowerCase().includes(b) ||
        item.origem.toLowerCase().includes(b) ||
        item.destino.toLowerCase().includes(b) ||
        item.motorista.toLowerCase().includes(b) ||
        item.pin.includes(b)
      );
    }
    return true;
  });

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Header com Identidade PARTIU */}
      <div className="w-full bg-slate-950 p-6 rounded-3xl text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFDE00]/20 px-4 py-1.5 text-xs font-black uppercase text-yellow-300 border border-yellow-400/30">
            <Package className="h-4 w-4" />
            <span>Torre de Despacho &amp; Radar em Tempo Real</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
            Central de Despacho &amp; Entregas Flash
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl font-medium leading-relaxed">
            Monitore a alocação de motoristas, confirmação por código PIN de 4 dígitos e atendimento de corridas e pacotes expressos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Despacho Automático Ativo
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* PAINEL DE SAÚDE DA CIDADE (MARKETPLACE & CITY HEALTH MONITOR)    */}
      {/* ================================================================= */}
      <div className="w-full bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              Observabilidade Operacional
            </span>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#EAB308]" />
              Painel de Saúde da Cidade &amp; Marketplace
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Liquidez Saudável: 94.2% Atendimento</span>
          </div>
        </div>

        {/* 6 KPIs Estratégicos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold">Motoristas Online</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-2xl font-black text-slate-950">{saudeCidade.motoristasOnline}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              {saudeCidade.motoristasEmViagem} em rota ativa
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold">Corridas Ativas</span>
              <Car className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-2xl font-black text-slate-950">{saudeCidade.corridasAtivas}</span>
            <span className="text-[10px] text-amber-600 font-bold block mt-0.5">Tempo real</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold">Tempo Médio Espera</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-2xl font-black text-slate-950">{saudeCidade.tempoMedioEsperaMinutos} min</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">-18s vs média semanal</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold">Taxa de Aceite</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-black text-slate-950">{saudeCidade.taxaAceitePercent}%</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Meta &gt; 90% atingida</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold">Cancelamento</span>
              <AlertTriangle className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-2xl font-black text-slate-950">{saudeCidade.taxaCancelamentoPercent}%</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Abaixo do teto de 5%</span>
          </div>

          <div className="bg-[#FFDE00]/15 p-4 rounded-2xl border border-[#FFDE00]/40">
            <div className="flex items-center justify-between text-amber-900 mb-1">
              <span className="text-[11px] font-bold">Receita Bruta Hoje</span>
              <DollarSign className="w-4 h-4 text-amber-700" />
            </div>
            <span className="text-2xl font-black text-slate-950">R$ {saudeCidade.receitaBrutaHojeBrl.toFixed(2)}</span>
            <span className="text-[10px] text-slate-700 font-bold block mt-0.5">
              Take-rate Híbrido: R$ {saudeCidade.receitaLiquidaPlataformaBrl.toFixed(2)}
            </span>
          </div>
        </div>

        {/* HeatMap e Zonas de Pressão de Demanda */}
        <div className="pt-2">
          <span className="text-xs font-black text-slate-900 block mb-2 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-500 fill-current" />
            Zonas Urbanas em Monitoramento (Hotspots Ativos):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {saudeCidade.zonasHotspots.map((z, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl border bg-slate-50 flex items-center justify-between border-slate-200/80"
              >
                <div>
                  <span className="text-xs font-black text-slate-900 block truncate">{z.zona}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{z.status}</span>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                      z.surgeMultiplier > 1.2
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : z.surgeMultiplier > 1.0
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {z.surgeMultiplier.toFixed(1)}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          {(["TODAS", "CORRIDAS", "ENTREGAS"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                filtro === f
                  ? "bg-[#FFDE00] text-slate-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {f === "TODAS" ? "Todas as Chamadas" : f === "CORRIDAS" ? "Corridas Urbanas" : "Entregas Flash"}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por passageiro, rua, PIN..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-[#FFDE00]"
          />
        </div>
      </div>

      {/* Grid de Chamadas Ativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {itensFiltrados.map((item) => {
          const isEntrega = item.tipo === "ENTREGA_FLASH";

          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 hover:shadow-md transition"
            >
              {/* Topo do Card */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                      isEntrega
                        ? "bg-amber-100 text-amber-900"
                        : item.tipo === "CORRIDA_MOTO"
                          ? "bg-orange-100 text-orange-900"
                          : item.tipo === "CORRIDA_MULHER"
                            ? "bg-rose-100 text-rose-900"
                            : "bg-[#FFDE00] text-slate-950"
                    }`}
                  >
                    {isEntrega ? <Package className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-950 block">
                      {isEntrega ? "PARTIU Entrega Flash" : item.tipo.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      ID: #{item.id} • {item.tempoDecorrido}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-black text-slate-950 block">
                    {item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      item.status === "PROCURANDO"
                        ? "bg-amber-100 text-amber-800 animate-pulse"
                        : item.status === "EM_VIAGEM"
                          ? "bg-blue-100 text-blue-800"
                          : item.status === "CONCLUIDA"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Rota */}
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Origem</span>
                    <span className="text-slate-800 font-medium truncate block">{item.origem}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FA6400] mt-1 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Destino</span>
                    <span className="text-slate-800 font-medium truncate block">{item.destino}</span>
                  </div>
                </div>
              </div>

              {/* Bloco do PIN & Dados do Passageiro */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{item.passageiro}</span>
                  <span className="text-[10px] text-slate-500">{item.telefone}</span>
                </div>

                <div className="text-center px-3 py-1 bg-[#FFDE00] rounded-xl text-slate-950 shadow-2xs">
                  <span className="text-[8px] font-black uppercase block text-slate-800">PIN 4 DÍGITOS</span>
                  <span className="text-base font-mono font-black tracking-wider">{item.pin}</span>
                </div>
              </div>

              {/* Condutor Atribuído */}
              <div className="text-xs pt-1 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Condutor Parceiro</span>
                  <span className="font-black text-slate-900">{item.motorista}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {item.veiculo} • <strong className="text-slate-900">{item.placa}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://wa.me/55${item.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                  <a
                    href={`tel:${item.telefone.replace(/\D/g, "")}`}
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    title="Ligar"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
