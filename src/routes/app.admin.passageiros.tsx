import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { IdCard, Phone, Plus, Ticket, UserPlus, Users } from "lucide-react";
import {
  atualizarPassageiro,
  cadastrarPassageiro,
  listarPassageiros,
  type PassageiroAdmin,
} from "@/lib/passageiros.functions";

export const Route = createFileRoute("/app/admin/passageiros")({
  head: () => ({
    meta: [
      { title: "Cadastro de Passageiros | UniVans Admin" },
      {
        name: "description",
        content:
          "Cadastre passageiros, vincule CPF e WhatsApp e libere acesso automático aos bilhetes no app.",
      },
      { property: "og:title", content: "Cadastro de Passageiros | UniVans Admin" },
      {
        property: "og:description",
        content: "Gestão de passageiros da cooperativa com CPF, WhatsApp e acesso aos bilhetes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPassageiros,
});

const CAMPO =
  "mt-1 w-full min-h-12 h-12 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-800 focus:border-[#0d5930] outline-none transition-colors";

function AdminPassageiros() {
  const qc = useQueryClient();
  const listar = useServerFn(listarPassageiros);
  const cadastrar = useServerFn(cadastrarPassageiro);
  const atualizar = useServerFn(atualizarPassageiro);

  const {
    data: passageiros = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "passageiros"],
    queryFn: () => listar(),
  });

  const [form, setForm] = useState({ nome: "", email: "", senha: "", cpf: "", whatsapp: "" });
  const [editando, setEditando] = useState<PassageiroAdmin | null>(null);

  const criar = useMutation({
    mutationFn: (dados: typeof form) => cadastrar({ data: dados }),
    onSuccess: () => {
      setForm({ nome: "", email: "", senha: "", cpf: "", whatsapp: "" });
      void qc.invalidateQueries({ queryKey: ["admin", "passageiros"] });
    },
  });

  const salvarEdicao = useMutation({
    mutationFn: (dados: { id: string; nome: string; cpf: string; whatsapp: string }) =>
      atualizar({ data: dados }),
    onSuccess: () => {
      setEditando(null);
      void qc.invalidateQueries({ queryKey: ["admin", "passageiros"] });
    },
  });

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <header>
        <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-black text-slate-900">
          <Users className="h-6 w-6 text-[#0d5930]" /> Cadastro de passageiros
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Crie o acesso do passageiro, vincule CPF e WhatsApp. Ao entrar, ele já usa a área de
          bilhetes.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm sm:text-base font-black text-slate-800">
          <UserPlus className="h-5 w-5 text-[#0d5930]" /> Novo passageiro
        </h2>
        <div className="mt-3 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["nome", "Nome completo", "text"],
              ["email", "E-mail de acesso", "email"],
              ["senha", "Senha inicial", "text"],
              ["cpf", "CPF", "text"],
              ["whatsapp", "WhatsApp", "text"],
            ] as const
          ).map(([campo, rotulo, tipo]) => (
            <label key={campo} className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              {rotulo}
              <input
                type={tipo}
                value={form[campo]}
                onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                className={CAMPO}
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={criar.isPending}
          onClick={() => criar.mutate(form)}
          className="mt-4 min-h-12 inline-flex items-center gap-2 rounded-xl bg-[#0d5930] px-5 py-3 text-sm sm:text-base font-black text-white hover:brightness-105 disabled:opacity-50 cursor-pointer transition-all shadow-xs"
        >
          <Plus className="h-5 w-5" />
          {criar.isPending ? "Cadastrando..." : "Cadastrar e liberar acesso"}
        </button>
        {criar.isError && (
          <p className="mt-2 text-xs font-bold text-rose-600">{(criar.error as Error).message}</p>
        )}
        {criar.isSuccess && (
          <p className="mt-2 text-xs font-bold text-emerald-700">
            Passageiro cadastrado com acesso a /app/bilhetes.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="text-sm font-black text-slate-800">Passageiros ({passageiros.length})</h2>
          <Link
            to="/app/bilhetes"
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#0d5930]"
          >
            <Ticket className="h-4 w-4" /> Ver área de bilhetes
          </Link>
        </div>

        {isLoading && <p className="p-4 text-sm text-slate-500">Carregando...</p>}
        {error && <p className="p-4 text-sm font-bold text-rose-600">{(error as Error).message}</p>}

        <ul className="divide-y divide-slate-100">
          {passageiros.map((p) => (
            <li key={p.id} className="p-4">
              {editando?.id === p.id ? (
                <div className="grid gap-2 sm:grid-cols-4">
                  <input
                    className={CAMPO}
                    value={editando.full_name ?? ""}
                    onChange={(e) => setEditando({ ...editando, full_name: e.target.value })}
                  />
                  <input
                    className={CAMPO}
                    value={editando.cpf ?? ""}
                    onChange={(e) => setEditando({ ...editando, cpf: e.target.value })}
                  />
                  <input
                    className={CAMPO}
                    value={editando.phone ?? ""}
                    onChange={(e) => setEditando({ ...editando, phone: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={salvarEdicao.isPending}
                      onClick={() =>
                        salvarEdicao.mutate({
                          id: editando.id,
                          nome: editando.full_name ?? "",
                          cpf: editando.cpf ?? "",
                          whatsapp: editando.phone ?? "",
                        })
                      }
                      className="flex-1 rounded-xl bg-[#0d5930] px-3 py-2 text-xs font-black text-white"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditando(null)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">
                      {p.full_name ?? "Sem nome"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{p.email ?? "—"}</p>
                    <p className="mt-1 flex flex-wrap gap-3 text-[11px] font-bold text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <IdCard className="h-3.5 w-3.5" /> {p.cpf ?? "CPF não vinculado"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {p.phone ?? "WhatsApp não vinculado"}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditando(p)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700"
                  >
                    Vincular CPF / WhatsApp
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {salvarEdicao.isError && (
          <p className="p-4 text-xs font-bold text-rose-600">
            {(salvarEdicao.error as Error).message}
          </p>
        )}
      </section>
    </div>
  );
}
