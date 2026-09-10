import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Layers, Plus, Save, Trash2, X } from "lucide-react";
import {
  useLinhasAdmin,
  usePontosAdmin,
  useSalvarPonto,
  useExcluirPonto,
  useRealtimeTabela,
  type PontoEmbarque,
} from "@/lib/partiu-db";

export const Route = createFileRoute("/app/admin/pontos")({
  head: () => ({
    meta: [
      { title: "Hotspots & Pontos Chave | PARTIU Admin" },
      {
        name: "description",
        content:
          "Cadastre trevos, shoppings, aeroportos e pontos de embarque rápido com referência e coordenadas.",
      },
      { property: "og:title", content: "Hotspots & Pontos Chave | PARTIU Admin" },
      {
        property: "og:description",
        content: "Gestão dos hotspots e pontos estratégicos urbanos da rede PARTIU em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPontosPage,
});

const TIPOS = [
  ["shopping_mall", "Shopping & Centro Comercial"],
  ["aeroporto_terminal", "Aeroporto & Terminal Rodoviário"],
  ["universidade_polo", "Faculdade & Universidade"],
  ["arena_eventos", "Arena de Shows & Eventos"],
  ["hospital_saude", "Hospital & Pronto-Socorro"],
  ["polo_gastronomico", "Bares & Gastronomia"],
  ["posto_combustivel", "Posto de Combustível & Apoio"],
  ["trevo_rodoviario", "Trevo / Acesso Rodoviário"],
  ["ponto_urbano_vip", "Ponto Urbano VIP"],
] as const;

type FormPonto = {
  id?: string;
  linha_id: string;
  nome: string;
  cidade: string;
  tipo: string;
  referencia: string;
  endereco_completo: string;
  minutos_apos_saida: string;
  distancia_km_estimada: string;
  lat: string;
  lng: string;
  observacao_operacional: string;
  ordem: string;
  ativo: boolean;
};

const formVazio: FormPonto = {
  linha_id: "",
  nome: "",
  cidade: "",
  tipo: "trevo_rodoviario",
  referencia: "",
  endereco_completo: "",
  minutos_apos_saida: "0",
  distancia_km_estimada: "0",
  lat: "",
  lng: "",
  observacao_operacional: "",
  ordem: "1",
  ativo: true,
};

function paraFormulario(p: PontoEmbarque): FormPonto {
  return {
    id: p.id,
    linha_id: p.linha_id ?? "",
    nome: p.nome,
    cidade: p.cidade,
    tipo: p.tipo,
    referencia: p.referencia,
    endereco_completo: p.endereco_completo ?? "",
    minutos_apos_saida: String(p.minutos_apos_saida),
    distancia_km_estimada: String(p.distancia_km_estimada ?? 0),
    lat: p.lat != null ? String(p.lat) : "",
    lng: p.lng != null ? String(p.lng) : "",
    observacao_operacional: p.observacao_operacional ?? "",
    ordem: String(p.ordem),
    ativo: p.ativo,
  };
}

export function AdminPontosPage() {
  const { data: linhas = [] } = useLinhasAdmin();
  const [linhaFiltro, setLinhaFiltro] = useState<string>("");
  const { data: pontos = [], isLoading, error } = usePontosAdmin(linhaFiltro || undefined);
  const salvar = useSalvarPonto();
  const excluir = useExcluirPonto();
  const [form, setForm] = useState<FormPonto | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useRealtimeTabela("pontos_embarque", ["admin", "pontos"]);

  function campo(nome: keyof FormPonto, valor: string | boolean) {
    setForm((f) => (f ? { ...f, [nome]: valor } : f));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setMensagem(null);
    try {
      const rotulo = TIPOS.find(([v]) => v === form.tipo)?.[1] ?? form.tipo;
      await salvar.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        linha_id: form.linha_id || null,
        nome: form.nome,
        cidade: form.cidade,
        tipo: form.tipo,
        tipo_rotulo: rotulo,
        referencia: form.referencia,
        endereco_completo: form.endereco_completo || null,
        minutos_apos_saida: Number(form.minutos_apos_saida),
        distancia_km_estimada: Number(form.distancia_km_estimada),
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        observacao_operacional: form.observacao_operacional || null,
        ordem: Number(form.ordem),
        ativo: form.ativo,
      });
      setForm(null);
      setMensagem("Ponto de embarque salvo com sucesso.");
    } catch (err) {
      setMensagem(err instanceof Error ? err.message : "Falha ao salvar o ponto.");
    }
  }

  return (
    <div className="px-5 pt-5 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Pontos de embarque</h1>
          <p className="text-sm text-muted-foreground">
            Trevos, postos e terminais sincronizados em tempo real.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...formVazio, linha_id: linhaFiltro })}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Novo ponto
        </button>
      </header>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block font-semibold text-foreground">Filtrar por linha</span>
        <select
          value={linhaFiltro}
          onChange={(e) => setLinhaFiltro(e.target.value)}
          className="w-full max-w-md rounded-xl border border-border bg-background px-3 py-2 text-foreground"
        >
          <option value="">Todas as linhas</option>
          {linhas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.origem} → {l.destino}
            </option>
          ))}
        </select>
      </label>

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
              {form.id ? "Editar ponto" : "Novo ponto"}
            </h2>
            <button type="button" onClick={() => setForm(null)} aria-label="Fechar formulário">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-foreground">Linha</span>
              <select
                value={form.linha_id}
                onChange={(e) => campo("linha_id", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground"
              >
                <option value="">Sem linha vinculada</option>
                {linhas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.origem} → {l.destino}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-semibold text-foreground">Tipo</span>
              <select
                value={form.tipo}
                onChange={(e) => campo("tipo", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground"
              >
                {TIPOS.map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            {(
              [
                ["nome", "Nome do ponto", "text", true],
                ["cidade", "Cidade", "text", true],
                ["referencia", "Referência", "text", true],
                ["endereco_completo", "Endereço completo", "text", false],
                ["minutos_apos_saida", "Minutos após a saída", "number", true],
                ["distancia_km_estimada", "Distância estimada (km)", "number", false],
                ["lat", "Latitude", "number", false],
                ["lng", "Longitude", "number", false],
                ["ordem", "Ordem da parada", "number", true],
                ["observacao_operacional", "Observação operacional", "text", false],
              ] as const
            ).map(([nome, rotulo, tipo, obrigatorio]) => (
              <label key={nome} className="text-sm">
                <span className="mb-1 block font-semibold text-foreground">{rotulo}</span>
                <input
                  type={tipo}
                  step="any"
                  required={obrigatorio}
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
            Ponto ativo
          </label>

          <button
            type="submit"
            disabled={salvar.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {salvar.isPending ? "Salvando..." : "Salvar ponto"}
          </button>
        </form>
      )}

      <section className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando pontos...</p>}
        {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
        {!isLoading && pontos.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum ponto cadastrado para este filtro.
          </p>
        )}
        {pontos.map((p) => (
          <article
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <Layers className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-bold text-foreground">
                  {p.ordem}. {p.nome} — {p.cidade}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.tipo_rotulo} · {p.referencia} · +{p.minutos_apos_saida} min ·{" "}
                  {p.ativo ? "ativo" : "inativo"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm(paraFormulario(p))}
                className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-accent"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `⚠️ CONFIRMAÇÃO:\n\nTem certeza que deseja remover o ponto "${p.nome}"?`,
                    )
                  ) {
                    excluir.mutate(p.id);
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
