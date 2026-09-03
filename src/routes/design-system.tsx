import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/navigation/TopNav";

export const Route = createFileRoute("/design-system")({
  component: DesignSystemPage,
  head: () => ({
    meta: [
      { title: "Design System | Frota de Van" },
      {
        name: "description",
        content:
          "Tokens de cor, tipografia, raios, sombras e componentes base do aplicativo Frota de Van.",
      },
      { property: "og:title", content: "Design System | Frota de Van" },
      {
        property: "og:description",
        content: "Referência visual dos tokens e componentes usados no app Frota de Van.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const coresBase = [
  { nome: "background", token: "--background" },
  { nome: "foreground", token: "--foreground" },
  { nome: "card", token: "--card" },
  { nome: "surface", token: "--surface" },
  { nome: "muted", token: "--muted" },
  { nome: "muted-foreground", token: "--muted-foreground" },
  { nome: "border", token: "--border" },
  { nome: "input", token: "--input" },
];

const coresMarca = [
  { nome: "primary", token: "--primary" },
  { nome: "primary-foreground", token: "--primary-foreground" },
  { nome: "brand", token: "--brand" },
  { nome: "brand-foreground", token: "--brand-foreground" },
  { nome: "brand-soft", token: "--brand-soft" },
  { nome: "accent", token: "--accent" },
  { nome: "accent-foreground", token: "--accent-foreground" },
  { nome: "destructive", token: "--destructive" },
];

const escalaPrimaria = [
  { nome: "primary-900", token: "--primary-900" },
  { nome: "primary-800", token: "--primary-800" },
  { nome: "primary-700", token: "--primary-700" },
  { nome: "primary-600", token: "--primary-600" },
  { nome: "primary-500", token: "--primary-500" },
  { nome: "primary-400", token: "--primary-400" },
  { nome: "primary-100", token: "--primary-100" },
  { nome: "primary-50", token: "--primary-50" },
];

const coresSemanticas = [
  { nome: "success", token: "--success" },
  { nome: "success-soft", token: "--success-soft" },
  { nome: "warning", token: "--warning" },
  { nome: "warning-soft", token: "--warning-soft" },
  { nome: "danger", token: "--danger" },
  { nome: "danger-soft", token: "--danger-soft" },
  { nome: "info", token: "--info" },
  { nome: "info-soft", token: "--info-soft" },
];

const sombras = [
  { nome: "shadow-soft", classe: "shadow-soft" },
  { nome: "shadow-card", classe: "shadow-card" },
  { nome: "shadow-elevated", classe: "shadow-elevated" },
];

const espacos = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];

const graficos = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

const raios = [
  { nome: "rounded-sm", classe: "rounded-sm" },
  { nome: "rounded-md", classe: "rounded-md" },
  { nome: "rounded-lg", classe: "rounded-lg" },
  { nome: "rounded-xl", classe: "rounded-xl" },
  { nome: "rounded-2xl", classe: "rounded-2xl" },
  { nome: "rounded-full", classe: "rounded-full" },
];

function Amostra({ nome, token }: { nome: string; token: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div
        className="mb-2 h-12 w-full rounded-md border border-border"
        style={{ backgroundColor: `var(${token})` }}
      />
      <p className="text-sm font-medium text-foreground">{nome}</p>
      <p className="text-xs text-muted-foreground">var({token})</p>
    </div>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{titulo}</h2>
        {descricao ? <p className="text-sm text-muted-foreground">{descricao}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-5 pb-16">
        <div className="mx-auto w-full max-w-4xl space-y-12">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Frota de Van
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Design System</h1>
            <p className="text-sm text-muted-foreground">
              Tokens semânticos definidos em <code>src/styles.css</code> e aplicados em todas as
              telas do aplicativo. Use sempre os tokens, nunca cores fixas.
            </p>
          </header>

          <Secao titulo="Cores base" descricao="Superfícies, textos e bordas.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {coresBase.map((c) => (
                <Amostra key={c.nome} {...c} />
              ))}
            </div>
          </Secao>

          <Secao titulo="Marca e estados" descricao="Verde esmeralda como cor primária.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {coresMarca.map((c) => (
                <Amostra key={c.nome} {...c} />
              ))}
            </div>
          </Secao>

          <Secao
            titulo="Escala primária"
            descricao="Verde profundo como identidade institucional (#08763D como primary)."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {escalaPrimaria.map((c) => (
                <Amostra key={c.nome} {...c} />
              ))}
            </div>
          </Secao>

          <Secao
            titulo="Cores semânticas"
            descricao="Verde = normal, amarelo = atenção, vermelho = intervenção, azul = informação."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {coresSemanticas.map((c) => (
                <Amostra key={c.nome} {...c} />
              ))}
            </div>
          </Secao>

          <Secao titulo="Status" descricao="Ponto colorido + fundo suave.">
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                <span className="h-2 w-2 rounded-full bg-success" /> Concluído
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
                <span className="h-2 w-2 rounded-full bg-warning" /> Atenção
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-danger-soft px-3 py-1 text-xs font-semibold text-danger">
                <span className="h-2 w-2 rounded-full bg-danger" /> Atrasado
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-info">
                <span className="h-2 w-2 rounded-full bg-info" /> Em rota
              </span>
            </div>
          </Secao>

          <Secao titulo="Sombras" descricao="A profundidade deve ser percebida, não exibida.">
            <div className="flex flex-wrap gap-5">
              {sombras.map((s) => (
                <div key={s.nome} className="text-center">
                  <div className={`h-20 w-32 rounded-2xl bg-card ${s.classe}`} />
                  <p className="mt-2 text-xs text-muted-foreground">{s.nome}</p>
                </div>
              ))}
            </div>
          </Secao>

          <Secao titulo="Espaçamento" descricao="Escala baseada em múltiplos de 4px.">
            <div className="flex flex-wrap items-end gap-3">
              {espacos.map((e) => (
                <div key={e} className="text-center">
                  <div className="rounded-md bg-primary" style={{ width: e, height: e }} />
                  <p className="mt-1 text-xs text-muted-foreground">{e}px</p>
                </div>
              ))}
            </div>
          </Secao>

          <Secao titulo="KPIs da frota" descricao="Números com alto contraste e leitura imediata.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { rotulo: "Vans ativas", valor: "12" },
                { rotulo: "Em rota", valor: "8" },
                { rotulo: "Manutenção", valor: "2" },
                { rotulo: "Alertas", valor: "3" },
              ].map((k) => (
                <div
                  key={k.rotulo}
                  className="rounded-2xl border border-border-soft bg-card p-5 shadow-soft"
                >
                  <p className="text-3xl font-bold text-foreground">{k.valor}</p>
                  <p className="text-xs font-semibold text-text-secondary">{k.rotulo}</p>
                </div>
              ))}
            </div>
          </Secao>

          <Secao titulo="Timeline de rota" descricao="Sequência da operação.">
            <ol className="rounded-2xl border border-border-soft bg-card p-5 shadow-soft">
              {[
                { t: "Partida", d: "Terminal Central", h: "07:00" },
                { t: "Parada", d: "Av. Brasil, 120", h: "07:14" },
                { t: "Parada", d: "Rua Victor Hugo", h: "07:26" },
                { t: "Destino", d: "Universidade", h: "07:45" },
              ].map((e, i, arr) => (
                <li key={e.d} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 h-3 w-3 rounded-full bg-primary" />
                    {i < arr.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
                  </div>
                  <div className="pb-5">
                    <p className="text-sm font-semibold text-foreground">{e.t}</p>
                    <p className="text-xs text-text-tertiary">{e.d}</p>
                    <p className="text-xs font-medium text-text-secondary">{e.h}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Secao>

          <Secao titulo="Alertas" descricao="Amarelo = atenção. Vermelho = ação urgente.">
            <div className="space-y-3">
              <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Manutenção agendada</p>
                <p className="text-sm text-text-secondary">Van 04 precisa de revisão.</p>
              </div>
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Tráfego intenso</p>
                <p className="text-sm text-text-secondary">Rota 2 apresenta atraso.</p>
              </div>
            </div>
          </Secao>

          <Secao titulo="Gráficos">
            <div className="flex flex-wrap gap-3">
              {graficos.map((g) => (
                <div key={g} className="text-center">
                  <div
                    className="h-12 w-12 rounded-full border border-border"
                    style={{ backgroundColor: `var(--${g})` }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{g}</p>
                </div>
              ))}
            </div>
          </Secao>

          <Secao titulo="Tipografia" descricao="Família Inter, com pesos 400/500/600/700.">
            <div className="space-y-2 rounded-xl border border-border bg-card p-5">
              <p className="text-3xl font-bold text-foreground">Título 3xl bold</p>
              <p className="text-xl font-semibold text-foreground">Subtítulo xl semibold</p>
              <p className="text-base text-foreground">
                Corpo base regular — informações de viagem e rotas.
              </p>
              <p className="text-sm text-muted-foreground">
                Texto auxiliar sm muted — descrições e legendas.
              </p>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Rótulo xs uppercase
              </p>
            </div>
          </Secao>

          <Secao
            titulo="Raios"
            descricao="Base --radius: 1rem — cards 16–20px, botões 12–16px, badges full."
          >
            <div className="flex flex-wrap gap-3">
              {raios.map((r) => (
                <div key={r.nome} className="text-center">
                  <div
                    className={`h-12 sm:h-11 sm:h-12 w-16 border border-border bg-accent ${r.classe}`}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{r.nome}</p>
                </div>
              ))}
            </div>
          </Secao>

          <Secao titulo="Botões">
            <div className="flex flex-wrap gap-3">
              <button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                Primário
              </button>
              <button className="rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground">
                Secundário
              </button>
              <button className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground">
                Destaque
              </button>
              <button className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground">
                Contorno
              </button>
              <button className="rounded-xl bg-destructive px-5 py-3 text-sm font-semibold text-destructive-foreground">
                Destrutivo
              </button>
            </div>
          </Secao>

          <Secao titulo="Cartões e listas">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="text-sm font-semibold text-foreground">Van 12 — Linha Centro</p>
                <p className="text-sm text-muted-foreground">Chega em 4 minutos</p>
                <span className="mt-3 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  A caminho
                </span>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <p className="text-sm font-semibold text-foreground">Histórico</p>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li className="flex justify-between">
                    <span>Centro → Bairro Alto</span>
                    <span className="text-foreground">R$ 8,50</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Terminal → Universidade</span>
                    <span className="text-foreground">R$ 6,00</span>
                  </li>
                </ul>
              </div>
            </div>
          </Secao>

          <Secao titulo="Campos de formulário">
            <div className="max-w-sm space-y-3">
              <label className="block text-sm font-medium text-foreground">
                E-mail
                <input
                  type="email"
                  placeholder="voce@email.com"
                  className="mt-1 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Mensagem de erro de exemplo.
              </p>
            </div>
          </Secao>
        </div>
      </main>
    </div>
  );
}
