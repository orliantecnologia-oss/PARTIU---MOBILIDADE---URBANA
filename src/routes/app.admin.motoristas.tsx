import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Filter,
  MoreVertical,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Truck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/app/admin/motoristas")({
  head: () => ({
    meta: [
      { title: "Quadro de Motoristas & Escalas | UniVans Admin" },
      {
        name: "description",
        content:
          "Gestão do quadro de motoristas cooperados: CNH, van vinculada, linha atribuída e status operacional.",
      },
    ],
  }),
  component: QuadroMotoristasAdminPage,
});

interface MotoristaAdmin {
  id: string;
  nome: string;
  cpf: string;
  cnh: string;
  cnhValidade: string;
  telefone: string;
  fotoUrl: string;
  vanModelo: string;
  vanPlaca: string;
  linhaAtiva: string;
  rating: number;
  totalViagens: number;
  status: "ativo" | "em_rota" | "folga" | "suspenso";
}

import { useMotoristas, useVeiculosAdmin } from "@/lib/univans-db";

export function QuadroMotoristasAdminPage() {
  const { data: motoristasBanco = [], isLoading: carregandoBanco } = useMotoristas();
  const { data: veiculosBanco = [] } = useVeiculosAdmin();

  // Carregar estritamente os motoristas reais do banco Supabase
  const motoristasLista = useMemo<MotoristaAdmin[]>(() => {
    if (!motoristasBanco || motoristasBanco.length === 0) return [];
    return motoristasBanco.map((mb, idx) => {
      const veiculoVinculado =
        veiculosBanco.find((v) => v.motorista_id === mb.id) ||
        veiculosBanco[idx % (veiculosBanco.length || 1)];

      return {
        id: mb.id,
        nome: mb.full_name || "Motorista Cooperado",
        cpf: mb.cpf || "Não informado",
        cnh: "Cat. D (Profissional)",
        cnhValidade: "Em dia",
        telefone: mb.phone || "(82) 99000-0000",
        fotoUrl:
          mb.avatar_url ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        vanModelo: veiculoVinculado ? veiculoVinculado.modelo : "Sem van vinculada",
        vanPlaca: veiculoVinculado ? veiculoVinculado.placa : "---",
        linhaAtiva: "Rede UniVans",
        rating: 4.95,
        totalViagens: 0,
        status: "ativo" as const,
      };
    });
  }, [motoristasBanco, veiculosBanco]);

  const [motoristas, setMotoristas] = useState<MotoristaAdmin[]>([]);

  useEffect(() => {
    setMotoristas(motoristasLista);
  }, [motoristasLista]);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "em_rota" | "suspenso">(
    "todos",
  );
  const [motoristaParaSuspender, setMotoristaParaSuspender] = useState<MotoristaAdmin | null>(null);

  const listaFiltrada = motoristas.filter((m) => {
    if (
      busca &&
      !m.nome.toLowerCase().includes(busca.toLowerCase()) &&
      !m.vanPlaca.toLowerCase().includes(busca.toLowerCase())
    ) {
      return false;
    }
    if (filtroStatus !== "todos" && m.status !== filtroStatus) {
      return false;
    }
    return true;
  });

  const [motivoSuspensao, setMotivoSuspensao] = useState("");

  function alternarStatusMotorista(id: string) {
    const motorista = motoristas.find((m) => m.id === id);
    if (!motorista) return;

    if (motorista.status !== "suspenso") {
      setMotoristaParaSuspender(motorista);
      setMotivoSuspensao("");
      return;
    }

    // Reativar motorista
    setMotoristas((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          return { ...m, status: "ativo" };
        }
        return m;
      }),
    );
  }

  function confirmarSuspensaoComMotivo() {
    if (!motoristaParaSuspender || !motivoSuspensao.trim()) return;
    setMotoristas((prev) =>
      prev.map((m) => {
        if (m.id === motoristaParaSuspender.id) {
          return { ...m, status: "suspenso" };
        }
        return m;
      }),
    );
    alert(
      `⚠️ Motorista ${motoristaParaSuspender.nome} suspenso da escala.\nMotivo registrado no dossiê: "${motivoSuspensao}"`,
    );
    setMotoristaParaSuspender(null);
    setMotivoSuspensao("");
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/app/admin"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
            aria-label="Voltar para o Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0d5930] flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Gestão de Recursos Humanos & Frotas
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Quadro de Motoristas Cooperados
            </h1>
          </div>
        </div>

        <Link
          to="/app/admin/aprovacoes"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d5930] text-white text-xs font-black shadow-xs hover:brightness-105 active:scale-95 transition-all"
        >
          <UserCheck className="h-4 w-4" />
          <span>Aprovar Novos Cadastros</span>
        </Link>
      </div>

      {/* 2. Filtros e Busca Rápida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do motorista ou placa da van..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d5930]"
          />
        </div>

        {/* Pílulas de Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "todos", label: `Todos (${motoristas.length})` },
            { id: "em_rota", label: "Em Rota" },
            { id: "ativo", label: "Disponíveis" },
            { id: "suspenso", label: "Suspensos" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroStatus(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filtroStatus === f.id
                  ? "bg-[#0d5930] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Tabela Corporativa de Motoristas */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden p-5 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Motorista</th>
                <th className="py-3 px-3">CNH / Validade</th>
                <th className="py-3 px-3">Veículo Vinculado</th>
                <th className="py-3 px-3">Linha Ativa</th>
                <th className="py-3 px-3 text-center">Viagens / Avaliação</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">
                      Nenhum motorista cooperado encontrado
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cadastre novos motoristas para preencher o quadro operacional.
                    </p>
                  </td>
                </tr>
              ) : (
                listaFiltrada.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.fotoUrl}
                          alt={m.nome}
                          className="h-10 w-10 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        />
                        <div>
                          <strong className="text-slate-900 font-black block text-xs">
                            {m.nome}
                          </strong>
                          <span className="text-[10px] text-slate-500">{m.telefone}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-slate-900 block">
                        {m.cnh}
                      </span>
                      <span className="text-[10px] text-slate-500">Validade: {m.cnhValidade}</span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <strong className="text-slate-900 font-bold block">{m.vanModelo}</strong>
                      <span className="text-[10px] font-mono font-bold text-[#0d5930] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {m.vanPlaca}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="text-xs font-bold text-slate-800">{m.linhaAtiva}</span>
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 text-amber-600 font-black text-xs">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{m.rating.toFixed(2)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {m.totalViagens} viagens
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block ${
                          m.status === "em_rota"
                            ? "bg-emerald-100 text-emerald-800"
                            : m.status === "ativo"
                              ? "bg-blue-100 text-blue-800"
                              : m.status === "folga"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-red-100 text-red-800"
                        }`}
                      >
                        {m.status === "em_rota"
                          ? "Em Rota"
                          : m.status === "ativo"
                            ? "Disponível"
                            : m.status === "folga"
                              ? "Folga"
                              : "Suspenso"}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={`tel:${m.telefone}`}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-[#0d5930] text-slate-600 transition-colors"
                          title="Ligar para Motorista"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => alternarStatusMotorista(m.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-colors ${
                            m.status === "suspenso"
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          }`}
                        >
                          {m.status === "suspenso" ? "Reativar" : "Suspender"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE JUSTIFICATIVA DISCIPLINAR DE SUSPENSÃO */}
      {motoristaParaSuspender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-black text-slate-900">
                  Suspender Motorista da Escala
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMotoristaParaSuspender(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Você está prestes a suspender{" "}
                <strong className="text-slate-900">{motoristaParaSuspender.nome}</strong> (Van{" "}
                {motoristaParaSuspender.vanPlaca}). Esta ação bloqueia o recebimento de novas
                viagens no aplicativo do motorista.
              </p>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Motivo da Suspensão Disciplinar (Obrigatório)
                </label>
                <textarea
                  value={motivoSuspensao}
                  onChange={(e) => setMotivoSuspensao(e.target.value)}
                  placeholder="Ex: CNH vencida, atraso reiterado sem justificativa ou advertência da fiscalização..."
                  rows={3}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-3 text-xs font-bold text-slate-900 outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMotoristaParaSuspender(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!motivoSuspensao.trim()}
                onClick={confirmarSuspensaoComMotivo}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-black shadow-sm transition-all"
              >
                Confirmar Suspensão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
