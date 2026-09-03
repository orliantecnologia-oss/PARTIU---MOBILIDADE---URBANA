import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  MapPin,
  Navigation,
  Play,
  Send,
  Star,
  Truck,
} from "lucide-react";
import { paradasRota } from "@/lib/admin-data";

export const Route = createFileRoute("/app/admin/despacho")({
  head: () => ({
    meta: [
      { title: "Detalhes da Rota & Despacho | UniVans" },
      {
        name: "description",
        content:
          "Acompanhamento passo a passo da rota, tracking de última parada e avaliação de qualidade.",
      },
    ],
  }),
  component: DespachoDetalhesRota,
});

export function DespachoDetalhesRota() {
  const [estadoViagem, setEstadoViagem] = useState<
    "aguardando" | "em_rota" | "ultima_parada" | "finalizada"
  >("aguardando");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comentarios, setComentarios] = useState("");
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);

  return (
    <div className="px-5 pt-4 pb-10">
      {/* 1. Header com Voltar e Notificações */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/admin"
          className="rounded-full bg-card p-2 text-foreground shadow-sm hover:bg-accent transition-colors"
          aria-label="Voltar para o Painel Admin"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">Detalhes da Rota</h1>
        <button
          type="button"
          className="rounded-full bg-card p-2 text-foreground shadow-sm hover:bg-accent transition-colors"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>

      {/* MÓDULO 6: Fase de Execução (Aguardando ou Em Rota) */}
      {estadoViagem === "aguardando" || estadoViagem === "em_rota" ? (
        <div className="mt-5 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                Linha Regular Intermunicipal
              </span>
              <h2 className="text-2xl font-black tracking-tight text-foreground mt-1">
                Maceió ➔ Arapiraca
              </h2>
              <p className="text-sm font-bold text-[#0d5930]">
                Van 03 · Mercedes Sprinter VIP (RJP-2F14)
              </p>
            </div>
            <span className="rounded-2xl bg-accent px-4 py-2 font-black text-xs text-[#0d5930] border border-[#0d5930]/20">
              Starlink Satélite Ativo
            </span>
          </div>

          {/* Timeline Sequencial dos Pontos de Parada Reais */}
          <div className="rounded-2xl bg-card p-6 shadow-lg border border-border/40 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Pontos de Embarque & Trevos Rodoviários (Alagoas)
            </h3>
            {paradasRota.map((p, idx) => (
              <div key={p.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full ring-4 ${
                      p.status === "concluido"
                        ? "bg-[#0d5930] ring-[#0d5930]/20"
                        : p.status === "em_andamento"
                          ? "bg-[#e5a93c] ring-[#e5a93c]/20 animate-pulse"
                          : "bg-slate-300 ring-slate-200"
                    }`}
                  />
                  {idx < paradasRota.length - 1 && (
                    <span className="h-10 w-0.5 bg-border/80 my-1" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-foreground text-sm">{p.nome}</p>
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      {p.horario}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.endereco}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Card de Duração Estimada */}
          <div className="rounded-2xl bg-card p-5 shadow-lg border border-border/40 flex items-center justify-between">
            <div>
              <p className="font-extrabold text-foreground text-sm">Tempo de Viagem Estimado</p>
              <p className="text-xs text-muted-foreground">Trecho Rodoviário AL-110 · 135 km</p>
            </div>
            <span className="rounded-2xl bg-accent px-4 py-2 font-black text-sm text-[#0d5930]">
              2h 15 min
            </span>
          </div>

          {/* Botão de Controle de Estado da Rota */}
          <div className="pt-2">
            {estadoViagem === "aguardando" ? (
              <button
                type="button"
                onClick={() => setEstadoViagem("em_rota")}
                className="flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0d5930] text-sm font-extrabold text-white shadow-xl transition-all duration-200 hover:brightness-105 active:scale-[0.99]"
              >
                <Play className="h-4 w-4 fill-white" /> Iniciar Rota
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEstadoViagem("ultima_parada")}
                className="flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-full bg-[#e5a93c] text-sm font-extrabold text-slate-900 shadow-xl transition-all duration-200 hover:brightness-105 active:scale-[0.99]"
              >
                <Navigation className="h-4 w-4" /> Avançar para Última Parada (Terminal Arapiraca)
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* MÓDULO 7: Tracking de Última Parada & Finalização/Qualidade */}
      {estadoViagem === "ultima_parada" || estadoViagem === "finalizada" ? (
        <div className="mt-4 space-y-4 animate-in fade-in duration-200">
          {/* Mapa Focado na Chegada ao Destino */}
          <div className="relative h-60 w-full overflow-hidden rounded-2xl border border-border/40 bg-[#dbe7dc] shadow-lg">
            <div
              className="absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  "linear-gradient(#cad8cb 1.5px, transparent 1.5px), linear-gradient(90deg, #cad8cb 1.5px, transparent 1.5px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Trajeto Curvo Final */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d="M 15,80 Q 40,75 55,45 T 85,25"
                fill="none"
                stroke="#ffffff"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 15,80 Q 40,75 55,45 T 85,25"
                fill="none"
                stroke="#e5a93c"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>

            {/* Van Branca se aproximando */}
            <div className="absolute left-[55%] top-[45%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-16 rounded-xl bg-white text-slate-900 shadow-xl border border-slate-300 font-bold text-[10px]">
              🚐 Van 03 VIP
            </div>

            {/* Floating Badge: Terminal Central de Arapiraca */}
            <div className="absolute right-4 top-4 rounded-2xl bg-[#0d5930] px-4 py-2 text-white shadow-xl flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-300" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-emerald-200">Destino</p>
                <p className="text-xs font-black">Terminal Central de Arapiraca</p>
              </div>
            </div>
          </div>

          {/* Bottom Card: Resumo da Rota, Rating & Feedback */}
          <div className="rounded-2xl bg-card p-5 shadow-lg border border-border/40">
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Chegada: Terminal Central de Arapiraca
            </h2>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">Resumo da Rota</p>

            {/* Dados do Motorista Cooperado */}
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/40">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                  alt="Carlos Eduardo Santos"
                  className="h-11 w-11 rounded-full object-cover border border-border/60 shadow-sm"
                />
                <div>
                  <p className="font-extrabold text-foreground text-sm">Carlos Eduardo Santos</p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Mercedes Sprinter VIP · 4,95 ★
                  </p>
                </div>
              </div>

              {/* Seletor de 5 Estrelas Douradas */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (hoverRating ?? rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-0.5 transition-transform hover:scale-125"
                      aria-label={`${star} estrelas`}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          filled ? "fill-[#f79e1b] text-[#f79e1b]" : "text-border"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input de Feedback Qualitativo */}
            <div className="mt-4">
              <textarea
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Comentários sobre a rota..."
                rows={2}
                className="w-full rounded-2xl bg-accent/60 px-4 py-3 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none border border-border/40 focus:ring-2 focus:ring-[#0d5930]"
              />
            </div>

            {/* Ação de Conclusão / Envio */}
            <div className="mt-4">
              {avaliacaoEnviada ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#0d5930]/10 py-3 text-xs font-bold text-[#0d5930]">
                  <CheckCircle2 className="h-4 w-4" /> Viagem concluída e avaliação salva!
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAvaliacaoEnviada(true);
                    setEstadoViagem("finalizada");
                  }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0d5930] text-xs font-extrabold text-white shadow-lg transition-all duration-200 hover:brightness-105 active:scale-[0.99]"
                >
                  <CheckCircle2 className="h-4 w-4" /> Finalizar Viagem e Enviar Feedback
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
