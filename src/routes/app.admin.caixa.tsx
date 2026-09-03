import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Banknote, Lock, Plus, RotateCcw, Save, Wallet, X } from "lucide-react";
import {
  useCaixaAdmin,
  useSalvarCaixa,
  useAlterarStatusCaixa,
  useMotoristas,
  calcularSplit,
} from "@/lib/univans-db";

export const Route = createFileRoute("/app/admin/caixa")({
  head: () => ({
    meta: [
      { title: "Fechamento de Caixa | UniVans Admin" },
      {
        name: "description",
        content:
          "Feche o caixa dos motoristas com cálculo automático da taxa da cooperativa e do valor líquido a repassar.",
      },
      { property: "og:title", content: "Fechamento de Caixa | UniVans Admin" },
      {
        property: "og:description",
        content: "Split financeiro da cooperativa UniVans conectado ao banco de dados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCaixaPage,
});

import { GuardiaoAcesso } from "@/components/admin/GuardiaoAcesso";

const brl = (v: number | string) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AdminCaixaPage() {
  const { data: caixas = [], isLoading, error } = useCaixaAdmin();
  const { data: motoristas = [] } = useMotoristas();
  const salvar = useSalvarCaixa();
  const alterarStatus = useAlterarStatusCaixa();

  const [aberto, setAberto] = useState(false);
  const [motoristaId, setMotoristaId] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalBruto, setTotalBruto] = useState("0");
  const [taxa, setTaxa] = useState("8");
  const [mensagem, setMensagem] = useState<string | null>(null);

  const previa = calcularSplit(Number(totalBruto) || 0, Number(taxa) || 0);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);
    try {
      await salvar.mutateAsync({
        motorista_id: motoristaId,
        data_referencia: data,
        total_bruto: Number(totalBruto),
        taxa_cooperativa_pct: Number(taxa),
        ...previa,
        status: "aberto",
      });
      setAberto(false);
      setTotalBruto("0");
      setMensagem("Fechamento registrado.");
    } catch (err) {
      setMensagem(err instanceof Error ? err.message : "Falha ao registrar o caixa.");
    }
  }

  const consolidado = caixas.reduce(
    (acc, c) => ({
      bruto: acc.bruto + Number(c.total_bruto),
      cooperativa: acc.cooperativa + Number(c.valor_cooperativa),
      motoristas: acc.motoristas + Number(c.valor_liquido_motorista),
    }),
    { bruto: 0, cooperativa: 0, motoristas: 0 },
  );

  return (
    <GuardiaoAcesso somenteOwner>
      <div className="px-5 pt-5 pb-12">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Fechamento de caixa
            </h1>
            <p className="text-sm text-muted-foreground">
              Split da cooperativa gravado direto no banco de dados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo fechamento
          </button>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Bruto consolidado", consolidado.bruto, Wallet],
            ["Cooperativa", consolidado.cooperativa, Banknote],
            ["Repasse motoristas", consolidado.motoristas, Banknote],
          ].map(([rotulo, valor, Icone]) => {
            const I = Icone as typeof Wallet;
            return (
              <div key={rotulo as string} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <I className="h-4 w-4" /> {rotulo as string}
                </div>
                <p className="mt-1 text-xl font-black text-foreground">{brl(valor as number)}</p>
              </div>
            );
          })}
        </div>

        {mensagem && (
          <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
            {mensagem}
          </p>
        )}

        {aberto && (
          <form
            onSubmit={enviar}
            className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Novo fechamento</h2>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar formulário">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-foreground">Motorista</span>
                <select
                  required
                  value={motoristaId}
                  onChange={(e) => setMotoristaId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                >
                  <option value="">Selecione</option>
                  {motoristas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? m.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-foreground">Data de referência</span>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-foreground">Total bruto (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={totalBruto}
                  onChange={(e) => setTotalBruto(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-foreground">
                  Taxa cooperativa (%)
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={taxa}
                  onChange={(e) => setTaxa(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                />
              </label>
            </div>

            <p className="text-sm text-muted-foreground">
              Cooperativa <strong>{brl(previa.valor_cooperativa)}</strong> · Motorista{" "}
              <strong>{brl(previa.valor_liquido_motorista)}</strong>
            </p>

            <button
              type="submit"
              disabled={salvar.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {salvar.isPending ? "Salvando..." : "Registrar"}
            </button>
          </form>
        )}

        <section className="mt-6 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando caixas...</p>}
          {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
          {!isLoading && caixas.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum fechamento registrado.
            </p>
          )}
          {caixas.map((c) => (
            <article
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div>
                <p className="font-bold text-foreground">
                  {new Date(`${c.data_referencia}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
                  {brl(c.total_bruto)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Taxa {c.taxa_cooperativa_pct}% · cooperativa {brl(c.valor_cooperativa)} ·
                  motorista {brl(c.valor_liquido_motorista)} · {c.status.replace(/_/g, " ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => alterarStatus.mutate({ id: c.id, status: "fechado" })}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground"
                >
                  <Lock className="h-4 w-4" /> Fechar caixa
                </button>
                <button
                  type="button"
                  onClick={() => alterarStatus.mutate({ id: c.id, status: "pago_ao_motorista" })}
                  className="rounded-xl border border-border px-3.5 py-2 text-xs font-bold text-foreground hover:bg-accent"
                >
                  Marcar como pago
                </button>
                <button
                  type="button"
                  onClick={() => alterarStatus.mutate({ id: c.id, status: "aberto" })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-bold text-muted-foreground hover:bg-accent"
                >
                  <RotateCcw className="h-4 w-4" /> Reabrir
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </GuardiaoAcesso>
  );
}
