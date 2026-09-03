import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Filter,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { solicitacoesMotoristasPendentes, type SolicitacaoMotorista } from "@/lib/admin-data";

export const Route = createFileRoute("/app/admin/aprovacoes")({
  head: () => ({
    meta: [
      { title: "Aprovações de Motoristas | Painel Admin" },
      {
        name: "description",
        content:
          "Central de auditoria documental e aprovação de motoristas autônomos e permissionários da cooperativa.",
      },
    ],
  }),
  component: AdminAprovacoesPage,
});

export function AdminAprovacoesPage() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoMotorista[]>(
    solicitacoesMotoristasPendentes,
  );
  const [filtro, setFiltro] = useState<"todas" | "pendente" | "aprovado" | "rejeitado">("todas");
  const [modalDocumento, setModalDocumento] = useState<SolicitacaoMotorista | null>(null);

  function alterarStatus(id: string, novoStatus: "aprovado" | "rejeitado") {
    setSolicitacoes((prev) => prev.map((s) => (s.id === id ? { ...s, status: novoStatus } : s)));
  }

  const listaFiltrada = solicitacoes.filter((s) => filtro === "todas" || s.status === filtro);

  return (
    <div className="px-5 pt-4 pb-12">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/app/admin"
            className="rounded-full bg-card p-2 text-foreground shadow-sm hover:bg-accent transition-colors"
            aria-label="Voltar para o Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Aprovação de Motoristas
            </h1>
            <p className="text-xs text-muted-foreground">
              Auditoria de CNH, EAR, CRLV e Concessões Regulatórias
            </p>
          </div>
        </div>
      </div>

      {/* 2. Filtros de Status */}
      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: "todas", label: `Todas (${solicitacoes.length})` },
          {
            id: "pendente",
            label: `Pendentes (${solicitacoes.filter((s) => s.status === "pendente").length})`,
          },
          {
            id: "aprovado",
            label: `Aprovados (${solicitacoes.filter((s) => s.status === "aprovado").length})`,
          },
          {
            id: "rejeitado",
            label: `Rejeitados (${solicitacoes.filter((s) => s.status === "rejeitado").length})`,
          },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFiltro(item.id as "todas" | "pendente" | "aprovado" | "rejeitado")}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              filtro === item.id
                ? "bg-[#0d5930] text-white shadow-md"
                : "bg-card text-muted-foreground border border-border/40 hover:bg-accent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 3. Lista de Solicitações */}
      <div className="mt-4 space-y-4">
        {listaFiltrada.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-card p-5 shadow-lg border border-border/40 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-black text-foreground">
                    {item.nomeCompleto}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      item.status === "pendente"
                        ? "bg-amber-500/15 text-amber-700"
                        : item.status === "aprovado"
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    ● {item.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  CPF: <span className="font-semibold text-foreground">{item.cpf}</span> ·
                  Solicitado {item.dataSolicitacao}
                </p>
              </div>

              <span className="rounded-2xl bg-accent px-2.5 py-1 text-[11px] font-bold text-[#0d5930]">
                {item.orgaoRegulador}
              </span>
            </div>

            {/* Dados do Veículo & Linha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-accent/40 p-4 border border-border/30 text-xs">
              <div>
                <p className="font-bold text-foreground">🚐 Veículo:</p>
                <p className="text-muted-foreground">
                  {item.veiculoMarcaModelo} ({item.veiculoAno})
                </p>
                <p className="text-muted-foreground font-semibold uppercase">
                  Placa: {item.veiculoPlaca} · {item.veiculoCapacidade} Lugares
                </p>
              </div>

              <div>
                <p className="font-bold text-foreground">🛣️ Linha de Atuação:</p>
                <p className="text-[#0d5930] font-bold">
                  {item.linhaOrigem} ⇄ {item.linhaDestino}
                </p>
                <p className="text-muted-foreground">Horários: {item.horariosSaida.join(", ")}</p>
              </div>
            </div>

            {/* Checklist de Documentos */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-foreground font-medium">
                  <ShieldCheck className="h-4 w-4 text-[#0d5930]" /> CNH Categoria{" "}
                  {item.cnhCategoria}
                </span>
                <span className="text-[11px] font-bold text-[#0d5930]">EAR Verificado ✓</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-foreground font-medium">
                  <FileText className="h-4 w-4 text-[#0d5930]" /> Autorização:{" "}
                  {item.numeroAutorizacao}
                </span>
                <span className="text-[11px] font-bold text-[#0d5930]">Em conformidade</span>
              </div>
            </div>

            {/* Botões de Ação do Administrador */}
            {item.status === "pendente" && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => alterarStatus(item.id, "rejeitado")}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-card text-xs font-extrabold text-destructive border border-destructive/30 hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4" /> Recusar
                </button>

                <button
                  type="button"
                  onClick={() => alterarStatus(item.id, "aprovado")}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#0d5930] text-xs font-extrabold text-white shadow-md hover:brightness-105"
                >
                  <CheckCircle2 className="h-4 w-4" /> Aprovar Motorista
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
