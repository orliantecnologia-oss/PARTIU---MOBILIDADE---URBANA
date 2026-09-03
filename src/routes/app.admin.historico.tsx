import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  SlidersHorizontal,
  Truck,
  User,
} from "lucide-react";
import { rotasHistorico } from "@/lib/admin-data";

export const Route = createFileRoute("/app/admin/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Rotas | UniVans" },
      {
        name: "description",
        content: "Log detalhado de viagens por modalidade: rotas escolares e shuttles de empresa.",
      },
    ],
  }),
  component: HistoricoRotas,
});

const filtros = ["Rotas Escolares", "Shuttles de Empresa", "Todas"] as const;

export function HistoricoRotas() {
  const [filtroAtivo, setFiltroAtivo] = useState<(typeof filtros)[number]>("Rotas Escolares");

  const lista = rotasHistorico.filter((r) =>
    filtroAtivo === "Todas" ? true : r.modalidade === filtroAtivo,
  );

  return (
    <div className="px-5 pt-4 pb-8">
      {/* 1. Header com Voltar e Filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/app/admin"
            className="rounded-full bg-card p-2 text-foreground shadow-sm hover:bg-accent transition-colors"
            aria-label="Voltar para o Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Histórico de Rotas
          </h1>
        </div>
        <button
          type="button"
          className="rounded-full bg-card p-2 text-foreground shadow-sm hover:bg-accent transition-colors"
          aria-label="Filtros avançados"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* 2. Pílulas de Modalidade de Serviço */}
      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {filtros.map((filtro) => {
          const isAtivo = filtroAtivo === filtro;
          return (
            <button
              key={filtro}
              type="button"
              onClick={() => setFiltroAtivo(filtro)}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all duration-200 ease-in-out ${
                isAtivo
                  ? "bg-[#0d5930] text-white shadow-md"
                  : "bg-card text-muted-foreground border border-border/40 hover:bg-accent"
              }`}
            >
              {filtro}
            </button>
          );
        })}
      </div>

      {/* 3. Log de Viagens / Cards de Histórico */}
      <div className="mt-5 space-y-4">
        {lista.map((rota, idx) => (
          <div
            key={rota.id}
            className="overflow-hidden rounded-2xl bg-card p-5 shadow-lg border border-border/40 transition-all duration-200 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              {/* Lado Esquerdo: Ícone da Van + Detalhes */}
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  <Truck className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-extrabold text-foreground text-sm tracking-tight truncate">
                    {rota.nome}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">{rota.data}</p>

                  <div className="pt-2 text-xs text-muted-foreground space-y-1 font-medium">
                    <p className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">Stops</span> {rota.paradas}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">
                        {rota.inicio} - {rota.fim}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">{rota.tipoRegistro}</p>
                  </div>
                </div>
              </div>

              {/* Lado Direito: Mini Mapa Estático do Trajeto */}
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-[#e8f0e9]">
                {/* SVG estilizado do mini mapa */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 80">
                  <path
                    d={idx % 2 === 0 ? "M15,65 C30,60 40,20 85,25" : "M15,20 C45,15 55,65 85,60"}
                    fill="none"
                    stroke="#2b7a4b"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  {/* Ponto Inicial */}
                  <circle cx="15" cy={idx % 2 === 0 ? "65" : "20"} r="4" fill="#0d5930" />
                  {/* Ponto Final */}
                  <circle cx="85" cy={idx % 2 === 0 ? "25" : "60"} r="5" fill="#eb001b" />
                </svg>
              </div>
            </div>

            {/* Rodapé do Card: Ícones e Status de Conclusão */}
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/40">
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="flex items-center gap-1 text-xs">
                  <User className="h-3.5 w-3.5" /> 16 passageiros
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <Clock className="h-3.5 w-3.5" /> 45 min
                </span>
              </div>

              {/* Badge Concluído */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0d5930]/10 px-3 py-1 text-xs font-bold text-[#0d5930]">
                {rota.status} <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
