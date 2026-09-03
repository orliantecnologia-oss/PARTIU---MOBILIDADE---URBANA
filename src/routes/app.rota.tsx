import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Clock, Wallet, Zap } from "lucide-react";
import { UniversalMapView } from "@/components/maps/UniversalMapView";
import { brl, rotas } from "@/lib/mock-data";

export const Route = createFileRoute("/app/rota")({
  head: () => ({
    meta: [
      { title: "Escolha seu itinerário | Frota de Van" },
      {
        name: "description",
        content: "Compare rotas mais rápidas e econômicas entre cidades e confirme seu trajeto.",
      },
      { property: "og:title", content: "Escolha seu itinerário | Frota de Van" },
      {
        property: "og:description",
        content: "Compare rotas mais rápidas e econômicas entre cidades e confirme seu trajeto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RouteSelect,
});

function RouteSelect() {
  const [selecionada, setSelecionada] = useState<string>(rotas[0]?.id ?? "");

  return (
    <div className="relative min-h-[80vh]">
      <div className="relative h-[52vh]">
        <UniversalMapView altura="h-full w-full" mostrarCardInferior={false} />
        <Link
          to="/app"
          className="absolute left-4 top-4 rounded-full bg-card p-3 text-foreground shadow-lg transition-all duration-200 ease-in-out hover:bg-accent"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="-mt-8 rounded-t-3xl bg-card px-5 pb-6 pt-6 shadow-lg">
        <h1 className="text-xl font-bold text-foreground">Escolha seu itinerário</h1>
        <p className="text-sm text-muted-foreground">Rodovia BR-356 · 2 opções disponíveis</p>

        <div className="mt-5 space-y-3">
          {rotas.map((rota) => {
            const ativa = rota.id === selecionada;
            return (
              <button
                key={rota.id}
                type="button"
                onClick={() => setSelecionada(rota.id)}
                className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 ease-in-out ${
                  ativa ? "bg-accent ring-2 ring-primary" : "bg-input hover:bg-accent"
                }`}
              >
                <span className="rounded-2xl bg-card p-3 text-brand">
                  {rota.tipo === "rapido" ? (
                    <Zap className="h-5 w-5" />
                  ) : (
                    <Wallet className="h-5 w-5" />
                  )}
                </span>
                <span className="flex-1">
                  <span className="block font-bold text-foreground">
                    {rota.tipo === "rapido" ? "Mais rápido" : "Econômico"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {rota.duracaoMin} min · saída {rota.saida}
                  </span>
                </span>
                <span className="text-lg font-bold text-foreground">{brl(rota.preco)}</span>
              </button>
            );
          })}
        </div>

        <Link
          to="/app/viagem"
          className="mt-6 flex h-11 sm:h-12 w-full items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground shadow-lg transition-all duration-200 ease-in-out hover:brightness-105 active:scale-[0.99]"
        >
          Confirmar trajeto
        </Link>
      </div>
    </div>
  );
}
