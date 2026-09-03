import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  Lightbulb,
  MapPin,
  Plus,
  Share2,
  Sparkles,
  ThumbsUp,
  Truck,
  Users,
} from "lucide-react";
import { demandasRotasMock, type DemandaRota } from "@/lib/admin-data";

export const Route = createFileRoute("/app/demanda")({
  head: () => ({
    meta: [
      { title: "Sugerir Nova Linha & Demanda | UniVans" },
      {
        name: "description",
        content:
          "Sugira novas rotas e horários de vans intermunicipais. Quando a demanda atinge a meta, a cooperativa abre a linha.",
      },
    ],
  }),
  component: DemandaRotasPage,
});

export function DemandaRotasPage() {
  const [demandas, setDemandas] = useState<DemandaRota[]>(demandasRotasMock);
  const [apoiosUsuario, setApoiosUsuario] = useState<string[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Formulário
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [horario, setHorario] = useState("");
  const [dias, setDias] = useState("Segunda a Sexta");

  function handleApoiar(id: string) {
    if (apoiosUsuario.includes(id)) return;
    setDemandas((prev) =>
      prev.map((d) => (d.id === id ? { ...d, apoiadoresQtd: d.apoiadoresQtd + 1 } : d)),
    );
    setApoiosUsuario([...apoiosUsuario, id]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nova: DemandaRota = {
      id: `dem-${Date.now()}`,
      origem,
      destino,
      horarioDesejado: horario,
      diasSemana: dias,
      apoiadoresQtd: 1,
      metaApoiadores: 50,
      status: "em_votacao",
      dataCriacao: "Agora",
    };
    setDemandas([nova, ...demandas]);
    setApoiosUsuario([...apoiosUsuario, nova.id]);
    setMostrarForm(false);
    setOrigem("");
    setDestino("");
    setHorario("");
  }

  return (
    <div className="px-3 sm:px-4 pt-3 pb-28 w-full max-w-full mx-auto">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/app"
            className="flex min-h-[40px] min-w-[40px] h-10 w-10 items-center justify-center rounded-xl bg-card p-2 text-foreground shadow-sm hover:bg-accent active:scale-95 transition-all cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#0d5930] uppercase">
              <Lightbulb className="h-3.5 w-3.5" /> Voz do Passageiro
            </span>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Sugerir Novas Rotas
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMostrarForm(!mostrarForm)}
          className="inline-flex items-center gap-1 rounded-full bg-[#0d5930] px-3.5 py-2 text-xs font-extrabold text-white shadow-md hover:brightness-105"
        >
          <Plus className="h-4 w-4" /> {mostrarForm ? "Fechar" : "Sugerir Rota"}
        </button>
      </div>

      {/* 2. Formulário de Nova Sugestão */}
      {mostrarForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-3 rounded-3xl bg-card p-5 shadow-xl border border-border/40 animate-in fade-in duration-200"
        >
          <h2 className="text-sm font-black text-foreground">
            Qual trajeto você precisa que tenha van?
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Cidade de Saída *
              </label>
              <input
                required
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                placeholder="Ex: Maceió, Itaperuna..."
                className="w-full rounded-2xl bg-accent/50 px-3 py-2.5 text-xs text-foreground outline-none border border-border/40"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Cidade de Chegada *
              </label>
              <input
                required
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Ex: Penedo, Macaé..."
                className="w-full rounded-2xl bg-accent/50 px-3 py-2.5 text-xs text-foreground outline-none border border-border/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Horário Ideal *
              </label>
              <input
                required
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                placeholder="Ex: 06:30 ou 18:00"
                className="w-full rounded-2xl bg-accent/50 px-3 py-2.5 text-xs text-foreground outline-none border border-border/40"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Dias de Frequência
              </label>
              <input
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                placeholder="Segunda a Sexta"
                className="w-full rounded-2xl bg-accent/50 px-3 py-2.5 text-xs text-foreground outline-none border border-border/40"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0d5930] text-xs font-black text-white shadow-md hover:brightness-105"
          >
            <CheckCircle2 className="h-4 w-4" /> Publicar Demanda para Votação
          </button>
        </form>
      )}

      {/* 3. Lista de Demandas em Votação */}
      <div className="mt-5 space-y-4">
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Rotas Solicitadas pela Comunidade:
        </p>

        {demandas.map((item) => {
          const porcentagem = Math.min(
            100,
            Math.round((item.apoiadoresQtd / item.metaApoiadores) * 100),
          );
          const jaApoiou = apoiosUsuario.includes(item.id);

          return (
            <div
              key={item.id}
              className="rounded-3xl bg-card p-5 shadow-lg border border-border/40 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-foreground">
                    {item.origem} ⇄ {item.destino}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Horário:{" "}
                    <span className="font-semibold text-foreground">{item.horarioDesejado}</span> (
                    {item.diasSemana})
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                    item.status === "em_analise_cooperativa"
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-amber-500/15 text-amber-700"
                  }`}
                >
                  {item.status === "em_analise_cooperativa" ? "● Em Análise" : "● Votação Aberta"}
                </span>
              </div>

              {/* Barra de Progresso de Apoiadores */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1.5">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-[#0d5930]" />
                    <span className="text-foreground">{item.apoiadoresQtd}</span> de{" "}
                    {item.metaApoiadores} interessados
                  </span>
                  <span className="text-[#0d5930]">{porcentagem}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
                  <div
                    className="h-full rounded-full bg-[#0d5930] transition-all duration-300"
                    style={{ width: `${porcentagem}%` }}
                  />
                </div>
              </div>

              {/* Botão de Apoiar */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-[10px] text-muted-foreground">Criado {item.dataCriacao}</span>

                <button
                  type="button"
                  onClick={() => handleApoiar(item.id)}
                  disabled={jaApoiou}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold shadow-sm transition-all ${
                    jaApoiou
                      ? "bg-emerald-600/15 text-emerald-700 cursor-default"
                      : "bg-[#0d5930] text-white hover:brightness-105 active:scale-95"
                  }`}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {jaApoiou ? "Você apoiou! ✓" : "Quero essa rota (+1)"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
