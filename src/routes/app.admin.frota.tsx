import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Search, ShieldBan, Truck, XCircle } from "lucide-react";
import { useVeiculosAdmin, useAtualizarStatusVeiculo } from "@/lib/univans-db";

export const Route = createFileRoute("/app/admin/frota")({
  head: () => ({
    meta: [
      { title: "Aprovação de Veículos | UniVans Admin" },
      {
        name: "description",
        content:
          "Audite a documentação da frota e aprove, rejeite ou bloqueie os veículos cadastrados pelos motoristas.",
      },
      { property: "og:title", content: "Aprovação de Veículos | UniVans Admin" },
      {
        property: "og:description",
        content: "Auditoria e aprovação da frota cooperativa UniVans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminFrotaPage,
});

const FILTROS = ["todos", "pendente", "aprovado", "rejeitado", "bloqueado"] as const;
type Filtro = (typeof FILTROS)[number];

const CORES: Record<string, string> = {
  pendente: "bg-warning/15 text-warning-foreground",
  aprovado: "bg-primary/15 text-primary",
  rejeitado: "bg-destructive/15 text-destructive",
  bloqueado: "bg-muted text-muted-foreground",
};

export function AdminFrotaPage() {
  const { data: veiculos = [], isLoading, error } = useVeiculosAdmin();
  const atualizar = useAtualizarStatusVeiculo();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");

  const lista = veiculos.filter((v) => {
    if (filtro !== "todos" && v.status_aprovacao !== filtro) return false;
    if (busca) {
      const termo = busca.toLowerCase();
      const placaMatch = v.placa.toLowerCase().includes(termo);
      const modeloMatch = v.modelo.toLowerCase().includes(termo);
      const anoMatch = v.ano ? String(v.ano).includes(termo) : false;
      if (!placaMatch && !modeloMatch && !anoMatch) return false;
    }
    return true;
  });

  return (
    <div className="px-4 sm:px-6 pt-5 pb-16 max-w-4xl mx-auto space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Aprovação e Vistoria de Veículos
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Frota cadastrada pelos motoristas cooperados com sincronização em tempo real.
          </p>
        </div>

        {/* Input de Busca Rápida por Placa */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por placa, modelo ou ano..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full min-h-12 h-12 rounded-2xl bg-white pl-11 pr-4 py-2.5 text-sm sm:text-base font-medium text-slate-800 placeholder:text-slate-400 border border-slate-200 shadow-2xs outline-none focus:border-[#0d5930] transition-colors"
          />
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`min-h-[40px] rounded-full px-4 py-2 text-xs sm:text-sm font-bold capitalize transition-colors cursor-pointer flex items-center ${
              filtro === f
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <section className="mt-6 space-y-3.5">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando frota...</p>}
        {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
        {!isLoading && lista.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum veículo neste filtro.
          </p>
        )}
        {lista.map((v) => (
          <article
            key={v.id}
            className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-6 w-6 text-primary" />
                <div>
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {v.placa} · {v.modelo}
                    {v.ano ? ` (${v.ano})` : ""}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {v.capacidade_vagas} vagas · Wi-Fi {v.starlink_wifi_ssid ?? "—"}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${CORES[v.status_aprovacao] ?? ""}`}
              >
                {v.status_aprovacao}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
              {v.crlv_foto_url ? (
                <a
                  href={v.crlv_foto_url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[36px] inline-flex items-center font-bold text-primary underline"
                >
                  Ver CRLV
                </a>
              ) : (
                <span className="min-h-[36px] inline-flex items-center text-muted-foreground">
                  CRLV não enviado
                </span>
              )}
              {v.cnh_foto_url ? (
                <a
                  href={v.cnh_foto_url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[36px] inline-flex items-center font-bold text-primary underline"
                >
                  Ver CNH
                </a>
              ) : (
                <span className="min-h-[36px] inline-flex items-center text-muted-foreground">
                  CNH não enviada
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                disabled={atualizar.isPending}
                onClick={() => atualizar.mutate({ id: v.id, status: "aprovado" })}
                className="min-h-12 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-black text-primary-foreground disabled:opacity-60 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="h-4.5 w-4.5" /> Aprovar
              </button>
              <button
                type="button"
                disabled={atualizar.isPending}
                onClick={() => atualizar.mutate({ id: v.id, status: "rejeitado" })}
                className="min-h-12 inline-flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2.5 text-xs sm:text-sm font-black text-destructive hover:bg-destructive/10 disabled:opacity-60 cursor-pointer transition-colors"
              >
                <XCircle className="h-4.5 w-4.5" /> Rejeitar
              </button>
              <button
                type="button"
                disabled={atualizar.isPending}
                onClick={() => atualizar.mutate({ id: v.id, status: "bloqueado" })}
                className="min-h-12 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs sm:text-sm font-black text-foreground hover:bg-accent disabled:opacity-60 cursor-pointer transition-colors"
              >
                <ShieldBan className="h-4.5 w-4.5" /> Bloquear
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
