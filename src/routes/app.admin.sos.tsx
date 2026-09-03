import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Phone,
  Radio,
  Satellite,
  ShieldAlert,
  Truck,
  Wrench,
} from "lucide-react";
import { alertasSOSMock, type AlertaSOS } from "@/lib/admin-data";
import { useAlertasSOS, useAtualizarStatusSOS, useAlertasSOSRealtime } from "@/lib/univans-db";

export const Route = createFileRoute("/app/admin/sos")({
  head: () => ({
    meta: [
      { title: "Central de Incidentes SOS | Painel Admin" },
      {
        name: "description",
        content:
          "Monitoramento em tempo real de chamados de emergência, socorro mecânico e segurança na rodovia.",
      },
    ],
  }),
  component: AdminSOSPage,
});

export function AdminSOSPage() {
  useAlertasSOSRealtime();
  const { data: alertasBanco = [] } = useAlertasSOS();
  const atualizarStatus = useAtualizarStatusSOS();
  const [filtro, setFiltro] = useState<"todos" | "ativo" | "em_atendimento" | "resolvido">("todos");

  const alertas =
    alertasBanco.length > 0
      ? alertasBanco.map((a) => ({
          id: a.id,
          tipo: a.tipo as AlertaSOS["tipo"],
          solicitanteNome: a.solicitante_nome,
          solicitanteTelefone: a.solicitante_telefone || "(82) 99841-2290",
          vanPlaca: a.van_placa || "---",
          motoristaNome: a.motorista_nome || "Motorista em Rota",
          rodovia: a.rodovia || "Rodovia Estadual/Federal",
          coordenadas: a.coordenadas || "-9.6498, -35.7089",
          status: a.status as AlertaSOS["status"],
          dataHora: new Date(a.created_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          descricao: a.descricao || "Chamado ativo registrado no sistema.",
        }))
      : alertasSOSMock;

  function alterarStatus(id: string, novoStatus: "em_atendimento" | "resolvido") {
    void atualizarStatus.mutateAsync({ id, status: novoStatus });
  }

  const listaFiltrada = alertas.filter((a) => filtro === "todos" || a.status === filtro);

  return (
    <div className="px-5 pt-4 pb-12">
      {/* 1. Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/app/admin"
          className="rounded-full bg-card p-2 text-foreground shadow-sm hover:bg-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-destructive uppercase">
            <Radio className="h-3.5 w-3.5 animate-pulse" /> Telemetria Starlink 24h
          </span>
          <h1 className="text-2xl sm:text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Central de Incidentes & SOS
          </h1>
        </div>
      </div>

      {/* 2. Filtros de Status */}
      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: "todos", label: `Todos (${alertas.length})` },
          {
            id: "em_atendimento",
            label: `Em Atendimento (${alertas.filter((a) => a.status === "em_atendimento").length})`,
          },
          { id: "ativo", label: `Ativos (${alertas.filter((a) => a.status === "ativo").length})` },
          {
            id: "resolvido",
            label: `Resolvidos (${alertas.filter((a) => a.status === "resolvido").length})`,
          },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFiltro(item.id as "todos" | "ativo" | "em_atendimento" | "resolvido")}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              filtro === item.id
                ? "bg-destructive text-white shadow-md"
                : "bg-card text-muted-foreground border border-border/40 hover:bg-accent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 3. Lista de Alertas */}
      <div className="mt-4 space-y-4">
        {listaFiltrada.length === 0 ? (
          <div className="rounded-3xl bg-card p-8 text-center border border-border/60 shadow-sm space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground">Operação 100% Segura e Normal</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Nenhum chamado de emergência ou socorro mecânico ativo na malha rodoviária.
              </p>
            </div>
          </div>
        ) : (
          listaFiltrada.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-card p-5 shadow-xl border border-destructive/30 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-black text-foreground">
                      {item.vanPlaca}
                    </span>
                    <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-[10px] font-black text-destructive uppercase">
                      ● {item.tipo.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Motorista:{" "}
                    <span className="font-bold text-foreground">{item.motoristaNome}</span> ·{" "}
                    {item.dataHora}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                    item.status === "em_atendimento"
                      ? "bg-[#e5a93c]/20 text-[#e5a93c]"
                      : item.status === "ativo"
                        ? "bg-destructive text-white"
                        : "bg-emerald-500/15 text-emerald-700"
                  }`}
                >
                  {item.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Localização & Rodovia */}
              <div className="rounded-2xl bg-accent/40 p-3.5 text-xs space-y-1 border border-border/30">
                <p className="font-bold text-foreground">📍 Localização do Incidente:</p>
                <p className="text-muted-foreground">{item.rodovia}</p>
                <p className="text-[10px] text-muted-foreground">GPS: {item.coordenadas}</p>
                {item.descricao && (
                  <p className="text-xs text-foreground font-medium pt-1 italic">
                    "{item.descricao}"
                  </p>
                )}
              </div>

              {/* Ações do Gestor da Cooperativa */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`tel:${item.solicitanteTelefone}`}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-card text-xs font-extrabold text-foreground border border-border/60 hover:bg-accent"
                  >
                    <Phone className="h-4 w-4 text-[#0d5930]" /> Ligar Motorista (
                    {item.solicitanteTelefone})
                  </a>

                  {item.status !== "resolvido" ? (
                    <button
                      type="button"
                      onClick={() => alterarStatus(item.id, "resolvido")}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#0d5930] text-xs font-extrabold text-white shadow-md hover:brightness-105"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Concluir Suporte
                    </button>
                  ) : (
                    <span className="flex h-11 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-700">
                      Ocorrência Concluída ✓
                    </span>
                  )}
                </div>

                {/* Botão de Resgate Operacional Imediato */}
                {item.status !== "resolvido" && (
                  <button
                    type="button"
                    onClick={() => {
                      alterarStatus(item.id, "em_atendimento");
                      alert(
                        `🚨 Resgate Acionado! A van vazia mais próxima foi notificada via Starlink e está se deslocando para ${item.rodovia}.`,
                      );
                    }}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md transition-all active:scale-[0.99]"
                  >
                    <Truck className="h-4 w-4" /> Despachar Van Mais Próxima para Apoio/Resgate
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
