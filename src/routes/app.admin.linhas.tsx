import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layers, MapPin, Plus, Save, Trash2, X } from "lucide-react";
import { useLinhasAdmin, useSalvarLinha, useExcluirLinha, type Linha } from "@/lib/univans-db";

export const Route = createFileRoute("/app/admin/linhas")({
  head: () => ({
    meta: [
      { title: "Cadastro de Linhas | UniVans Admin" },
      {
        name: "description",
        content:
          "Cadastre e edite as linhas oficiais da cooperativa: origem, destino, distância, duração e valor da passagem.",
      },
      { property: "og:title", content: "Cadastro de Linhas | UniVans Admin" },
      {
        property: "og:description",
        content: "Gestão das rotas oficiais da cooperativa UniVans conectada ao banco de dados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLinhasPage,
});

type FormLinha = {
  id?: string;
  origem: string;
  origem_sigla: string;
  origem_lat: string;
  origem_lng: string;
  destino: string;
  destino_sigla: string;
  destino_lat: string;
  destino_lng: string;
  distancia_km: string;
  duracao_base_minutos: string;
  valor_passagem: string;
  tipo_van_padrao: string;
  ativo: boolean;
};

const formVazio: FormLinha = {
  origem: "",
  origem_sigla: "",
  origem_lat: "",
  origem_lng: "",
  destino: "",
  destino_sigla: "",
  destino_lat: "",
  destino_lng: "",
  distancia_km: "",
  duracao_base_minutos: "",
  valor_passagem: "",
  tipo_van_padrao: "Mercedes Sprinter VIP Executiva",
  ativo: true,
};

function paraFormulario(l: Linha): FormLinha {
  return {
    id: l.id,
    origem: l.origem,
    origem_sigla: l.origem_sigla ?? "",
    origem_lat: String(l.origem_lat),
    origem_lng: String(l.origem_lng),
    destino: l.destino,
    destino_sigla: l.destino_sigla ?? "",
    destino_lat: String(l.destino_lat),
    destino_lng: String(l.destino_lng),
    distancia_km: String(l.distancia_km),
    duracao_base_minutos: String(l.duracao_base_minutos),
    valor_passagem: String(l.valor_passagem),
    tipo_van_padrao: l.tipo_van_padrao ?? "",
    ativo: l.ativo,
  };
}

export function AdminLinhasPage() {
  const { data: linhas = [], isLoading, error } = useLinhasAdmin();
  const salvar = useSalvarLinha();
  const excluir = useExcluirLinha();
  const [form, setForm] = useState<FormLinha | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function campo(nome: keyof FormLinha, valor: string | boolean) {
    setForm((f) => (f ? { ...f, [nome]: valor } : f));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setMensagem(null);
    try {
      await salvar.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        origem: form.origem,
        origem_sigla: form.origem_sigla || null,
        origem_lat: Number(form.origem_lat),
        origem_lng: Number(form.origem_lng),
        destino: form.destino,
        destino_sigla: form.destino_sigla || null,
        destino_lat: Number(form.destino_lat),
        destino_lng: Number(form.destino_lng),
        distancia_km: Number(form.distancia_km),
        duracao_base_minutos: Number(form.duracao_base_minutos),
        valor_passagem: Number(form.valor_passagem),
        tipo_van_padrao: form.tipo_van_padrao || null,
        ativo: form.ativo,
      });
      setForm(null);
      setMensagem("Linha salva com sucesso.");
    } catch (err) {
      setMensagem(err instanceof Error ? err.message : "Falha ao salvar a linha.");
    }
  }

  return (
    <div className="px-5 pt-5 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Linhas oficiais</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro conectado ao banco de dados da cooperativa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm(formVazio)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nova linha
        </button>
      </header>

      {mensagem && (
        <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
          {mensagem}
        </p>
      )}

      {form && (
        <form
          onSubmit={enviar}
          className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              {form.id ? "Editar linha" : "Nova linha"}
            </h2>
            <button type="button" onClick={() => setForm(null)} aria-label="Fechar formulário">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["origem", "Cidade de origem", "text"],
                ["origem_sigla", "Sigla origem", "text"],
                ["origem_lat", "Latitude origem", "number"],
                ["origem_lng", "Longitude origem", "number"],
                ["destino", "Cidade de destino", "text"],
                ["destino_sigla", "Sigla destino", "text"],
                ["destino_lat", "Latitude destino", "number"],
                ["destino_lng", "Longitude destino", "number"],
                ["distancia_km", "Distância (km)", "number"],
                ["duracao_base_minutos", "Duração (min)", "number"],
                ["valor_passagem", "Valor da passagem (R$)", "number"],
                ["tipo_van_padrao", "Van padrão", "text"],
              ] as const
            ).map(([nome, rotulo, tipo]) => (
              <label key={nome} className="text-sm">
                <span className="mb-1 block font-semibold text-foreground">{rotulo}</span>
                <input
                  type={tipo}
                  step="any"
                  required={!["origem_sigla", "destino_sigla", "tipo_van_padrao"].includes(nome)}
                  value={String(form[nome])}
                  onChange={(e) => campo(nome, e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => campo("ativo", e.target.checked)}
            />
            Linha ativa
          </label>

          <button
            type="submit"
            disabled={salvar.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {salvar.isPending ? "Salvando..." : "Salvar linha"}
          </button>
        </form>
      )}

      <section className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando linhas...</p>}
        {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
        {!isLoading && linhas.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma linha cadastrada ainda.
          </p>
        )}
        {linhas.map((l) => (
          <article
            key={l.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-bold text-foreground">
                  {l.origem} → {l.destino}
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.distancia_km} km · {l.duracao_base_minutos} min · R$ {l.valor_passagem} ·{" "}
                  {l.ativo ? "ativa" : "inativa"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/app/admin/pontos"
                className="inline-flex items-center gap-1 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-[#0d5930] hover:bg-[#0d5930]/10 border border-[#0d5930]/20"
              >
                <Layers className="h-3.5 w-3.5" /> Trevos & Paradas
              </Link>
              <button
                type="button"
                onClick={() => setForm(paraFormulario(l))}
                className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-accent"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `⚠️ CONFIRMAÇÃO DE SEGURANÇA:\n\nTem certeza que deseja excluir permanentemente a linha "${l.origem} → ${l.destino}"?\nEsta ação cancelará horários e viagens programadas para este trajeto.`,
                    )
                  ) {
                    excluir.mutate(l.id);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-destructive/40 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
