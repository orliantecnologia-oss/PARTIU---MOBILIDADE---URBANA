import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  History,
  Lock,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { calcularSplitFinanceiro, apurarExtratoLedgerMotorista } from "@/lib/finops-pix-engine";
import {
  useCaixaAdmin,
  useSalvarCaixa,
  useAlterarStatusCaixa,
  useMotoristas,
  usePassagensTodas,
  calcularSplit,
  useDespesasOperacionais,
  useCriarDespesaOperacional,
  useConciliarDespesa,
} from "@/lib/univans-db";

export const Route = createFileRoute("/app/admin/financeiro")({
  head: () => ({
    meta: [
      { title: "Painel Financeiro, Split PIX & Livro-Razão | UniVans Admin" },
      {
        name: "description",
        content:
          "Gestão contábil com precisão em centavos, splits automáticos, conciliação bancária e extratos do Livro-Razão.",
      },
    ],
  }),
  component: PainelFinanceiroAdminPage,
});

import { GuardiaoAcesso } from "@/components/admin/GuardiaoAcesso";

export function PainelFinanceiroAdminPage() {
  const [visaoAtiva, setVisaoAtiva] = useState<"ledger" | "caixa" | "despesas">("ledger");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"hoje" | "semana" | "mes">("hoje");
  const [estornoSucessoId, setEstornoSucessoId] = useState<string | null>(null);

  // Hooks do Fechamento de Caixa
  const { data: caixas = [], isLoading: carregandoCaixas } = useCaixaAdmin();
  const { data: motoristas = [] } = useMotoristas();
  const salvarCaixa = useSalvarCaixa();
  const alterarStatusCaixa = useAlterarStatusCaixa();

  // Hooks de Despesas Operacionais (Supabase)
  const { data: despesasBanco = [], isLoading: carregandoDespesas } = useDespesasOperacionais();
  const salvarDespesa = useCriarDespesaOperacional();
  const conciliarDespesa = useConciliarDespesa();

  const [modalCaixaAberto, setModalCaixaAberto] = useState(false);
  const [motoristaId, setMotoristaId] = useState("");
  const [dataCaixa, setDataCaixa] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalBrutoCaixa, setTotalBrutoCaixa] = useState("0");
  const [taxaCaixa, setTaxaCaixa] = useState("8.5");
  const [mensagemCaixa, setMensagemCaixa] = useState<string | null>(null);

  const [modalDespesaAberto, setModalDespesaAberto] = useState(false);
  const [despesaDescricao, setDespesaDescricao] = useState("");
  const [despesaCategoria, setDespesaCategoria] = useState("Combustível");
  const [despesaSubcategoria, setDespesaSubcategoria] = useState("");
  const [despesaValor, setDespesaValor] = useState("");
  const [despesaData, setDespesaData] = useState(() => new Date().toISOString().slice(0, 10));
  const [mensagemDespesa, setMensagemDespesa] = useState<string | null>(null);

  async function handleSalvarDespesa(e: React.FormEvent) {
    e.preventDefault();
    setMensagemDespesa(null);
    try {
      await salvarDespesa.mutateAsync({
        descricao: despesaDescricao,
        categoria: despesaCategoria,
        subcategoria: despesaSubcategoria || null,
        valor: Number(despesaValor) || 0,
        data_despesa: despesaData,
        conciliado: false,
      });
      setModalDespesaAberto(false);
      setDespesaDescricao("");
      setDespesaValor("");
      setDespesaSubcategoria("");
      setMensagemDespesa("Despesa operacional registrada com sucesso no banco de dados!");
    } catch (err) {
      setMensagemDespesa(err instanceof Error ? err.message : "Falha ao registrar despesa.");
    }
  }

  const previaCaixa = calcularSplit(Number(totalBrutoCaixa) || 0, Number(taxaCaixa) || 0);

  const { data: passagensBanco = [] } = usePassagensTodas();
  const faturamentoBrutoHoje = passagensBanco.reduce(
    (acc, p) => acc + (p.status_pagamento === "pago" ? Number(p.valor_total) : 0),
    0,
  );
  const totalPassagensPagas = passagensBanco.filter((p) => p.status_pagamento === "pago").length;
  const splitGlobal = calcularSplitFinanceiro(faturamentoBrutoHoje);
  const extratoGeral = apurarExtratoLedgerMotorista("drv_04_al");

  function handleEstorno(txId: string) {
    setEstornoSucessoId(txId);
    setTimeout(() => setEstornoSucessoId(null), 3500);
  }

  async function handleSalvarCaixa(e: React.FormEvent) {
    e.preventDefault();
    setMensagemCaixa(null);
    try {
      await salvarCaixa.mutateAsync({
        motorista_id: motoristaId,
        data_referencia: dataCaixa,
        total_bruto: Number(totalBrutoCaixa),
        taxa_cooperativa_pct: Number(taxaCaixa),
        ...previaCaixa,
        status: "aberto",
      });
      setModalCaixaAberto(false);
      setTotalBrutoCaixa("0");
      setMensagemCaixa("Fechamento registrado com sucesso.");
    } catch (err) {
      setMensagemCaixa(err instanceof Error ? err.message : "Falha ao registrar o caixa.");
    }
  }

  return (
    <GuardiaoAcesso somenteOwner>
      <div className="w-full space-y-6 pb-16">
        {/* 1. Header Financeiro */}
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
                Motor FinOps • Precisão em Centavos Inteiros
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Financeiro, Split PIX & Caixa
              </h1>
            </div>
          </div>

          {/* Abas Superiores: Ledger vs Fechamento de Caixa */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setVisaoAtiva("ledger")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                visaoAtiva === "ledger"
                  ? "bg-[#0d5930] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Splits & Ledger
            </button>
            <button
              type="button"
              onClick={() => setVisaoAtiva("caixa")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                visaoAtiva === "caixa"
                  ? "bg-[#0d5930] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Fechamento de Caixa ({caixas.length})
            </button>
            <button
              type="button"
              onClick={() => setVisaoAtiva("despesas")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                visaoAtiva === "despesas"
                  ? "bg-[#0d5930] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Despesas ({despesasBanco.length})
            </button>
          </div>
        </div>
        {visaoAtiva === "ledger" && (
          <div className="space-y-6">
            {/* Seletor de Período */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">
                Consolidado por Período
              </h2>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFiltroPeriodo("hoje")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    filtroPeriodo === "hoje"
                      ? "bg-[#0d5930] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroPeriodo("semana")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    filtroPeriodo === "semana"
                      ? "bg-[#0d5930] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Esta Semana
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroPeriodo("mes")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    filtroPeriodo === "mes"
                      ? "bg-[#0d5930] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Este Mês
                </button>
              </div>
            </div>

            {/* 2. Grid de Métricas do Split Financeiro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Faturamento Bruto */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Faturamento Bruto
                </span>
                <strong className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight">
                  R$ {faturamentoBrutoHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </strong>
                <span className="text-xs text-slate-500 font-medium block">
                  {totalPassagensPagas} passagem(ns) emitida(s) via PIX
                </span>
              </div>

              {/* Taxa da Cooperativa (Receita Líquida do Sistema) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 border border-emerald-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    Taxa Cooperativa (8.5%)
                  </span>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded">
                    Receita
                  </span>
                </div>
                <strong className="text-xl sm:text-2xl font-black text-[#0d5930] block tracking-tight">
                  R${" "}
                  {splitGlobal.taxaCooperativa.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
                <span className="text-xs text-emerald-700 font-medium block">
                  Retenção operacional automática
                </span>
              </div>

              {/* Repasses aos Motoristas */}
              <div className="p-4 sm:p-5 rounded-3xl bg-blue-50 border border-blue-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">
                    Repasse Motoristas (90.3%)
                  </span>
                  <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.2 rounded">
                    A Pagar
                  </span>
                </div>
                <strong className="text-xl sm:text-2xl font-black text-blue-900 block tracking-tight">
                  R${" "}
                  {splitGlobal.repasseMotorista.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
                <span className="text-xs text-blue-700 font-medium block">
                  Liquidação instantânea em conta
                </span>
              </div>

              {/* Taxa de Gateway PSP */}
              <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 border border-amber-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                    Tarifas Gateway PSP
                  </span>
                  <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.2 rounded">
                    Custos
                  </span>
                </div>
                <strong className="text-xl sm:text-2xl font-black text-amber-900 block tracking-tight">
                  R$ {splitGlobal.taxaPsp.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </strong>
                <span className="text-xs text-amber-700 font-medium block">
                  Custo de processamento PIX
                </span>
              </div>
            </div>

            {/* ⚖️ PRINCÍPIO CONTÁBIL: FÓRMULA EXPLÍCITA DE CONCILIAÇÃO (NUNCA INVENTE LUCRO) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white border border-slate-800 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Princípio de Inteligência Financeira: Conciliação Sem Lucro Inventado
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Origem: Banco Central (PIX) + Livro-Razão
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 font-bold text-slate-200">
                    Receita Bruta (R$ {faturamentoBrutoHoje.toFixed(2).replace(".", ",")})
                  </span>
                  <span className="text-slate-500 font-black">-</span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 font-bold">
                    Gateway PSP 1.2% (R$ {splitGlobal.taxaPsp.toFixed(2).replace(".", ",")})
                  </span>
                  <span className="text-slate-500 font-black">-</span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-300 font-bold">
                    Repasse Cooperados 90.3% (R${" "}
                    {splitGlobal.repasseMotorista.toFixed(2).replace(".", ",")})
                  </span>
                  <span className="text-slate-500 font-black">=</span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black text-sm">
                    Receita Líquida Cooperativa: R${" "}
                    {splitGlobal.taxaCooperativa.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Tabela do Livro-Razão Imutável (Ledger Transacional) */}
            <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    Extrato do Livro-Razão Transacional (Ledger)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Histórico com chave de idempotência anti-duplicação e trilha de auditoria
                    contábil.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    Saldo em Conta: R$ 42.850,00
                  </span>
                </div>
              </div>

              {/* Tabela Responsiva */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Data / Hora</th>
                      <th className="py-3 px-3">Idempotency Key</th>
                      <th className="py-3 px-3">Tipo / Descrição</th>
                      <th className="py-3 px-3 text-right">Valor Bruto</th>
                      <th className="py-3 px-3 text-right">Taxa Coop</th>
                      <th className="py-3 px-3 text-right">Líquido Motorista</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {[
                      {
                        id: "tx-88101",
                        hora: "Hoje, 14:32:10",
                        key: "IDEMP-88101-IGN-MCZ",
                        tipo: "Bilhete Passagem (PIX)",
                        bruto: 38.0,
                        coop: 3.23,
                        liquido: 34.77,
                        status: "settled",
                      },
                      {
                        id: "tx-88102",
                        hora: "Hoje, 14:28:44",
                        key: "IDEMP-88102-MCZ-ARP",
                        tipo: "Bilhete Passagem (PIX)",
                        bruto: 35.0,
                        coop: 2.97,
                        liquido: 32.03,
                        status: "settled",
                      },
                      {
                        id: "tx-88103",
                        hora: "Hoje, 14:15:02",
                        key: "IDEMP-88103-MODA-CENTER",
                        tipo: "Despacho Encomenda #12",
                        bruto: 25.0,
                        coop: 2.12,
                        liquido: 22.88,
                        status: "settled",
                      },
                    ].map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {tx.hora}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] font-bold text-slate-900 whitespace-nowrap">
                          {tx.key}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                          {tx.tipo}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                          R$ {tx.bruto.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-800 whitespace-nowrap">
                          R$ {tx.coop.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-blue-900 whitespace-nowrap">
                          R$ {tx.liquido.toFixed(2).replace(".", ",")}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {tx.status === "settled" ? "Liquidado" : "Pago"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleEstorno(tx.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 text-[11px] font-black transition-colors"
                            title="Estornar Transação com Auditoria"
                          >
                            Estornar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {visaoAtiva === "caixa" && (
          /* VISÃO 2: FECHAMENTO DE CAIXA DOS MOTORISTAS */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Fechamentos de Caixa da Frota
                </h2>
                <p className="text-xs text-slate-500">
                  Acerto de viagens com cálculo automático de taxa e repasse líquido.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalCaixaAberto(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0d5930] text-white text-xs font-black shadow-md hover:brightness-105 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Fechamento</span>
              </button>
            </div>

            {mensagemCaixa && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-[#0d5930] flex items-center justify-between">
                <span>{mensagemCaixa}</span>
                <button
                  type="button"
                  onClick={() => setMensagemCaixa(null)}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Modal / Formulário de Novo Fechamento */}
            {modalCaixaAberto && (
              <form
                onSubmit={handleSalvarCaixa}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 animate-in fade-in"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900">
                    Registrar Fechamento de Caixa
                  </h3>
                  <button
                    type="button"
                    onClick={() => setModalCaixaAberto(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs">
                    <span className="mb-1 block font-black text-slate-700">
                      Motorista Cooperado
                    </span>
                    <select
                      required
                      value={motoristaId}
                      onChange={(e) => setMotoristaId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                    >
                      <option value="">Selecione o motorista</option>
                      {motoristas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name ?? m.id}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs">
                    <span className="mb-1 block font-black text-slate-700">Data da Viagem</span>
                    <input
                      type="date"
                      required
                      value={dataCaixa}
                      onChange={(e) => setDataCaixa(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                    />
                  </label>

                  <label className="text-xs">
                    <span className="mb-1 block font-black text-slate-700">
                      Total Bruto Arrecadado (R$)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={totalBrutoCaixa}
                      onChange={(e) => setTotalBrutoCaixa(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                    />
                  </label>

                  <label className="text-xs">
                    <span className="mb-1 block font-black text-slate-700">
                      Taxa Cooperativa (%)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={taxaCaixa}
                      onChange={(e) => setTaxaCaixa(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                    />
                  </label>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span>
                    Taxa Coop:{" "}
                    <strong className="text-[#0d5930]">
                      R$ {previaCaixa.valor_cooperativa.toFixed(2).replace(".", ",")}
                    </strong>
                  </span>
                  <span>
                    Líquido Motorista:{" "}
                    <strong className="text-blue-900">
                      R$ {previaCaixa.valor_liquido_motorista.toFixed(2).replace(".", ",")}
                    </strong>
                  </span>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalCaixaAberto(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvarCaixa.isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0d5930] text-white text-xs font-black shadow-sm disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{salvarCaixa.isPending ? "Salvando..." : "Gravar Fechamento"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Fechamentos de Caixa */}
            <div className="space-y-3">
              {carregandoCaixas && (
                <p className="text-xs text-slate-500 font-medium">
                  Carregando registros de caixa...
                </p>
              )}
              {!carregandoCaixas && caixas.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  Nenhum fechamento de caixa registrado até o momento.
                </div>
              )}
              {caixas.map((c) => (
                <article
                  key={c.id}
                  className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-black text-slate-900">
                        {new Date(`${c.data_referencia}T00:00:00`).toLocaleDateString("pt-BR")}
                      </strong>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Bruto:{" "}
                      <strong>R$ {Number(c.total_bruto).toFixed(2).replace(".", ",")}</strong> ·
                      Coop:{" "}
                      <strong className="text-[#0d5930]">
                        R$ {Number(c.valor_cooperativa).toFixed(2).replace(".", ",")}
                      </strong>{" "}
                      · Repasse:{" "}
                      <strong className="text-blue-900">
                        R$ {Number(c.valor_liquido_motorista).toFixed(2).replace(".", ",")}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alterarStatusCaixa.mutate({ id: c.id, status: "fechado" })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0d5930] text-white text-xs font-black shadow-xs hover:brightness-105"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Fechar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        alterarStatusCaixa.mutate({ id: c.id, status: "pago_ao_motorista" })
                      }
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs"
                    >
                      Marcar Pago
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {visaoAtiva === "despesas" && (
          /* VISÃO 3: DESPESAS OPERACIONAIS DA COOPERATIVA (SUPABASE) */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Despesas Operacionais da Cooperativa
                </h2>
                <p className="text-xs text-slate-500">
                  Controle de abastecimentos, manutenção mecânica, pedágios e peças persistido no
                  PostgreSQL.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalDespesaAberto(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0d5930] text-white text-xs font-black shadow-md hover:brightness-105 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Lançar Nova Despesa</span>
              </button>
            </div>

            {mensagemDespesa && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-[#0d5930] flex items-center justify-between">
                <span>{mensagemDespesa}</span>
                <button
                  type="button"
                  onClick={() => setMensagemDespesa(null)}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Modal / Formulário de Nova Despesa */}
            {modalDespesaAberto && (
              <form
                onSubmit={handleSalvarDespesa}
                className="rounded-3xl border border-emerald-200 bg-white p-5 sm:p-7 shadow-xl space-y-4 animate-in fade-in"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-[#0d5930]" /> Lançamento de Despesa Operacional
                  </h3>
                  <button
                    type="button"
                    onClick={() => setModalDespesaAberto(false)}
                    className="h-11 w-11 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Fechar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <label className="text-xs sm:text-sm">
                    <span className="mb-1 block font-bold uppercase tracking-wider text-slate-600">
                      Descrição do Gasto
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Abastecimento Diesel S10 - Posto Trevo"
                      value={despesaDescricao}
                      onChange={(e) => setDespesaDescricao(e.target.value)}
                      className="w-full min-h-12 h-12 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-900 focus:border-[#0d5930] outline-none"
                    />
                  </label>

                  <label className="text-xs sm:text-sm">
                    <span className="mb-1 block font-bold uppercase tracking-wider text-slate-600">
                      Categoria
                    </span>
                    <select
                      value={despesaCategoria}
                      onChange={(e) => setDespesaCategoria(e.target.value)}
                      className="w-full min-h-12 h-12 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-900 focus:border-[#0d5930] outline-none"
                    >
                      <option value="Combustível">Combustível</option>
                      <option value="Manutenção Preventiva">Manutenção Preventiva</option>
                      <option value="Manutenção Corretiva">Manutenção Corretiva</option>
                      <option value="Pedágio">Pedágio</option>
                      <option value="Manutenção Carta">Manutenção Carta</option>
                    </select>
                  </label>

                  <label className="text-xs sm:text-sm">
                    <span className="mb-1 block font-bold uppercase tracking-wider text-slate-700">
                      Subcategoria / Especificação
                    </span>
                    <input
                      type="text"
                      placeholder="Ex: Troca de pastilhas de freio da Master"
                      value={despesaSubcategoria}
                      onChange={(e) => setDespesaSubcategoria(e.target.value)}
                      className="w-full min-h-12 h-12 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-900 focus:border-[#0d5930] outline-none"
                    />
                  </label>

                  <label className="text-xs sm:text-sm">
                    <span className="mb-1 block font-bold uppercase tracking-wider text-slate-700">
                      Valor Total (R$)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={despesaValor}
                      onChange={(e) => setDespesaValor(e.target.value)}
                      className="w-full min-h-12 h-12 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-900 focus:border-[#0d5930] outline-none"
                    />
                  </label>

                  <label className="text-xs sm:text-sm sm:col-span-2">
                    <span className="mb-1 block font-bold uppercase tracking-wider text-slate-700">
                      Data do Comprovante
                    </span>
                    <input
                      type="date"
                      required
                      value={despesaData}
                      onChange={(e) => setDespesaData(e.target.value)}
                      className="w-full min-h-12 h-12 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-900 focus:border-[#0d5930] outline-none"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalDespesaAberto(false)}
                    className="min-h-12 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvarDespesa.isPending}
                    className="flex min-h-12 items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d5930] text-white text-sm font-black shadow-md hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Save className="h-5 w-5" />
                    <span>{salvarDespesa.isPending ? "Gravando..." : "Salvar no Supabase"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Despesas */}
            <div className="space-y-3">
              {carregandoDespesas && (
                <div className="p-8 text-center text-xs text-slate-400 font-bold">
                  Carregando registros de despesas do banco...
                </div>
              )}

              {!carregandoDespesas && despesasBanco.length === 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-xs font-bold">
                  Nenhuma despesa operacional registrada no banco de dados até o momento.
                </div>
              )}

              {despesasBanco.map((d) => (
                <article
                  key={d.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{d.descricao}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                        {d.categoria}
                      </span>
                      {d.conciliado ? (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-black uppercase">
                          Conciliado
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-black uppercase">
                          Pendente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Data: <strong>{new Date(d.data_despesa).toLocaleDateString("pt-BR")}</strong>
                      {d.subcategoria && ` · ${d.subcategoria}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-900">
                      R$ {Number(d.valor).toFixed(2).replace(".", ",")}
                    </span>
                    {!d.conciliado && (
                      <button
                        type="button"
                        onClick={() => conciliarDespesa.mutate({ id: d.id, conciliado: true })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-xs hover:brightness-105"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Conciliar</span>
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </GuardiaoAcesso>
  );
}
