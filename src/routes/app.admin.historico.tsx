import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Bike,
  Car,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Package,
  SlidersHorizontal,
  User,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/app/admin/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Corridas & Entregas | PARTIU Admin" },
      {
        name: "description",
        content: "Log detalhado de corridas urbanas, moto e entregas expressas finalizadas.",
      },
    ],
  }),
  component: HistoricoRotas,
});

interface CorridaHistorico {
  id: string;
  modalidade: "Partiu Pop" | "Partiu Moto" | "Entregas Flash";
  passageiro: string;
  motorista: string;
  veiculo: string;
  origem: string;
  destino: string;
  data: string;
  duracao: string;
  valor: number;
  status: "Concluída" | "Cancelada";
}

const HISTORICO_MOCK: CorridaHistorico[] = [
  {
    id: "cor-101",
    modalidade: "Partiu Pop",
    passageiro: "Camila Ribeiro",
    motorista: "Carlos Eduardo Silva",
    veiculo: "Chevrolet Onix (BRA-2E19)",
    origem: "Av. Fernandes Lima, 1200",
    destino: "Shopping Pátio Maceió",
    data: "Hoje, 16:42",
    duracao: "18 min",
    valor: 19.5,
    status: "Concluída",
  },
  {
    id: "cor-102",
    modalidade: "Partiu Moto",
    passageiro: "Rodrigo Mendonça",
    motorista: "Marcos Paulo Santos",
    veiculo: "Honda CG 160 (MOC-9J21)",
    origem: "Rua do Comércio, 340",
    destino: "Praia de Pajuçara",
    data: "Hoje, 15:10",
    duracao: "11 min",
    valor: 9.8,
    status: "Concluída",
  },
  {
    id: "cor-103",
    modalidade: "Entregas Flash",
    passageiro: "Drogaria São Paulo (Envio)",
    motorista: "Lucas Ferreira",
    veiculo: "Yamaha Factor 150 (AL-4491)",
    origem: "Av. Menino Marcelo, 500",
    destino: "Condomínio Aldebaran, Lt 14",
    data: "Hoje, 14:05",
    duracao: "22 min",
    valor: 16.0,
    status: "Concluída",
  },
  {
    id: "cor-104",
    modalidade: "Partiu Pop",
    passageiro: "Juliana Duarte",
    motorista: "Alexandre Barros",
    veiculo: "Fiat Argo (MOB-7A33)",
    origem: "Aeroporto Zumbi dos Palmares",
    destino: "Ponta Verde",
    data: "Hoje, 12:30",
    duracao: "34 min",
    valor: 42.0,
    status: "Concluída",
  },
];

import { useEffect } from "react";
import { getHistoricoViagens } from "@/lib/partiu-engine";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

const filtros = ["Todas", "Partiu Pop", "Partiu Moto", "Entregas Flash"] as const;

export function HistoricoRotas() {
  const [filtroAtivo, setFiltroAtivo] = useState<(typeof filtros)[number]>("Todas");
  const [historico, setHistorico] = useState<CorridaHistorico[]>(HISTORICO_MOCK);

  useEffect(() => {
    async function carregarHistoricoReal() {
      // 1. Tenta carregar do Supabase
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await (supabase as any)
            .from("partiu_corridas")
            .select("*, partiu_motoristas(nome, veiculo_marca_modelo, veiculo_placa)")
            .in("status", ["CONCLUIDA", "CANCELADA"])
            .order("created_at", { ascending: false })
            .limit(50);

          if (!error && data && data.length > 0) {
            const convertidos: CorridaHistorico[] = data.map((c: any) => ({
              id: c.codigo_viagem || c.id,
              modalidade: c.is_entrega || c.modalidade?.startsWith("ENTREGA")
                ? "Entregas Flash"
                : c.modalidade === "MOTO"
                  ? "Partiu Moto"
                  : "Partiu Pop",
              passageiro: c.passageiro_nome,
              motorista: c.partiu_motoristas?.nome || "Motorista Parceiro",
              veiculo: `${c.partiu_motoristas?.veiculo_marca_modelo || "Veículo"} (${c.partiu_motoristas?.veiculo_placa || "---"})`,
              origem: c.origem_endereco,
              destino: c.destino_endereco,
              data: new Date(c.created_at).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              duracao: `${c.duracao_min || 15} min`,
              valor: (c.valor_bruto_cents || 1600) / 100,
              status: c.status === "CANCELADA" ? "Cancelada" : "Concluída",
            }));

            setHistorico((prev) => {
              const idsReais = new Set(convertidos.map((r) => r.id));
              const outros = prev.filter((h) => !idsReais.has(h.id));
              return [...convertidos, ...outros];
            });
            return;
          }
        } catch (err) {
          console.warn("[AdminHistorico] Erro ao carregar viagens do Supabase:", err);
        }
      }

      // 2. Fallback do localStorage
      const local = getHistoricoViagens();
      if (local.length > 0) {
        const convertidosLocal: CorridaHistorico[] = local.map((c) => ({
          id: c.id,
          modalidade: c.isEntrega || c.modalidade.startsWith("ENTREGA")
            ? "Entregas Flash"
            : c.modalidade === "MOTO"
              ? "Partiu Moto"
              : "Partiu Pop",
          passageiro: c.passageiroNome,
          motorista: c.motorista?.nome || "Motorista Parceiro",
          veiculo: `${c.motorista?.veiculo || "Veículo"} (${c.motorista?.placa || "---"})`,
          origem: c.origem,
          destino: c.destino,
          data: new Date(c.criadoEm).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          duracao: `${c.duracaoMin} min`,
          valor: c.valor,
          status: c.status === "CANCELADA" ? "Cancelada" : "Concluída",
        }));

        setHistorico((prev) => {
          const ids = new Set(convertidosLocal.map((r) => r.id));
          const outros = prev.filter((h) => !ids.has(h.id));
          return [...convertidosLocal, ...outros];
        });
      }
    }

    void carregarHistoricoReal();
  }, []);

  const lista = historico.filter((r) =>
    filtroAtivo === "Todas" ? true : r.modalidade === filtroAtivo,
  );

  return (
    <div className="px-4 sm:px-6 pt-4 pb-12 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/app/admin"
            className="rounded-2xl bg-white border border-slate-200 p-2.5 text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            aria-label="Voltar para o Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Histórico de Corridas & Entregas
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Auditoria de trajetos urbanos concluídos em tempo real
            </p>
          </div>
        </div>
      </div>

      {/* 2. Filtros de Modalidade */}
      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {filtros.map((filtro) => {
          const isAtivo = filtroAtivo === filtro;
          return (
            <button
              key={filtro}
              type="button"
              onClick={() => setFiltroAtivo(filtro)}
              className={`rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                isAtivo
                  ? "bg-[#0088FF] text-slate-950 shadow-md shadow-[#0088FF]/20 font-black"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {filtro}
            </button>
          );
        })}
      </div>

      {/* 3. Cards de Histórico */}
      <div className="mt-5 space-y-3">
        {lista.map((corrida) => (
          <div
            key={corrida.id}
            className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-slate-200 hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                  {corrida.modalidade === "Partiu Moto" ? (
                    <Bike className="h-5 w-5" />
                  ) : corrida.modalidade === "Entregas Flash" ? (
                    <Package className="h-5 w-5" />
                  ) : (
                    <Car className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900 text-sm">{corrida.modalidade}</p>
                    <span className="text-[10px] text-slate-400 font-bold">• {corrida.data}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate">
                    Passageiro: <strong className="text-slate-900">{corrida.passageiro}</strong>
                  </p>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    Motorista: {corrida.motorista} ({corrida.veiculo})
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-base font-black text-slate-900 block">
                  R$ {corrida.valor.toFixed(2).replace(".", ",")}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> {corrida.status}
                </span>
              </div>
            </div>

            {/* Trajeto */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">
                  <strong className="text-slate-900">Origem:</strong> {corrida.origem}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-2 w-2 rounded-full bg-primary-600 shrink-0" />
                <span className="truncate">
                  <strong className="text-slate-900">Destino:</strong> {corrida.destino}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="h-3.5 w-3.5" /> Duração: {corrida.duracao}
              </span>
              <span className="font-mono text-[11px] text-slate-400">ID: {corrida.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
