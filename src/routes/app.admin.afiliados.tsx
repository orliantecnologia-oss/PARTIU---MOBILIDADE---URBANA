import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Copy,
  DollarSign,
  Gift,
  HeartHandshake,
  Percent,
  Plus,
  Radio,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
  Users,
  Wrench,
  Fuel,
  Car,
  Bike,
  Package,
} from "lucide-react";

export const Route = createFileRoute("/app/admin/afiliados")({
  head: () => ({
    meta: [
      { title: "Cupons, Campanhas & Clube de Vantagens | PARTIU Admin" },
      {
        name: "description",
        content:
          "Gerencie códigos de desconto para passageiros e o clube de benefícios e convênios para motoristas parceiros.",
      },
    ],
  }),
  component: AdminCuponsEVantagensPage,
});

export interface CupomDesconto {
  id: string;
  codigo: string;
  descricao: string;
  tipo: "porcentagem" | "fixo";
  valor: number;
  categoria: "todas" | "pop" | "moto" | "flash";
  valorMinimoCorrida: number;
  usosTotais: number;
  limiteUsos: number;
  expiraEm: string;
  ativo: boolean;
}

export interface ParceiroVantagem {
  id: string;
  nomeParceiro: string;
  categoria: "combustivel" | "manutencao" | "lavajato" | "saude_seguro";
  desconto: string;
  cidade: string;
  descricao: string;
  contatoOuLink: string;
  ativo: boolean;
}

const CUPONS_INICIAIS: CupomDesconto[] = [
  {
    id: "cup-1",
    codigo: "PARTIU10",
    descricao: "10% OFF na primeira corrida urbana ou moto",
    tipo: "porcentagem",
    valor: 10,
    categoria: "todas",
    valorMinimoCorrida: 12,
    usosTotais: 148,
    limiteUsos: 1000,
    expiraEm: "2026-12-31",
    ativo: true,
  },
  {
    id: "cup-2",
    codigo: "PRIMEIRACORRIDA",
    descricao: "R$ 7,00 OFF para novos passageiros cadastrados",
    tipo: "fixo",
    valor: 7,
    categoria: "pop",
    valorMinimoCorrida: 15,
    usosTotais: 320,
    limiteUsos: 500,
    expiraEm: "2026-11-30",
    ativo: true,
  },
  {
    id: "cup-3",
    codigo: "FLASH5",
    descricao: "R$ 5,00 OFF no primeiro envio de encomenda expressa",
    tipo: "fixo",
    valor: 5,
    categoria: "flash",
    valorMinimoCorrida: 10,
    usosTotais: 89,
    limiteUsos: 300,
    expiraEm: "2026-12-15",
    ativo: true,
  },
  {
    id: "cup-4",
    codigo: "SEXTOU_PARTIU",
    descricao: "15% OFF nas corridas de sexta-feira à noite",
    tipo: "porcentagem",
    valor: 15,
    categoria: "pop",
    valorMinimoCorrida: 20,
    usosTotais: 412,
    limiteUsos: 2000,
    expiraEm: "2026-10-31",
    ativo: true,
  },
];

const PARCEIROS_INICIAIS: ParceiroVantagem[] = [
  {
    id: "parc-1",
    nomeParceiro: "Rede Postos Ipiranga & Shell Parceiros",
    categoria: "combustivel",
    desconto: "R$ 0,25/litro de desconto na Gasolina e GNV",
    cidade: "Maceió e Região Metropolitana",
    descricao: "Apresente o QR Code do app motorista diretamente no caixa do posto conveniado.",
    contatoOuLink: "Convenio #99281",
    ativo: true,
  },
  {
    id: "parc-2",
    nomeParceiro: "Centro Automotivo & Pneus AutoFix",
    categoria: "manutencao",
    desconto: "20% OFF em Troca de Óleo, Filtros e Pastilhas",
    cidade: "Maceió / Arapiraca",
    descricao: "Mão de obra grátis na troca de óleo com óleo e filtros comprados na loja.",
    contatoOuLink: "Whats: (82) 99888-1122",
    ativo: true,
  },
  {
    id: "parc-3",
    nomeParceiro: "EcoLava Express - Estética Automotiva",
    categoria: "lavajato",
    desconto: "Lavagem Completa por apenas R$ 25,00",
    cidade: "Maceió - Mangabeiras",
    descricao: "Lavagem a seco rápida e higienização interna para motoristas parceiros PARTIU.",
    contatoOuLink: "Av. Fernandes Lima, 450",
    ativo: true,
  },
  {
    id: "parc-4",
    nomeParceiro: "Clube MedSaúde & Seguro Acidentes",
    categoria: "saude_seguro",
    desconto: "Consultas médicas a R$ 35 + Seguro APP Gratuito",
    cidade: "Todo Estado de Alagoas",
    descricao: "Atendimento ambulatorial, telemedicina 24h e cobertura de acidentes pessoais para motoristas e entregadores.",
    contatoOuLink: "0800 700 8090",
    ativo: true,
  },
];

export function AdminCuponsEVantagensPage() {
  const [abaAtiva, setAbaAtiva] = useState<"cupons" | "vantagens" | "indicacao">("cupons");
  const [cupons, setCupons] = useState<CupomDesconto[]>(() => {
    try {
      const salvo = localStorage.getItem("partiu_cupons_db");
      return salvo ? JSON.parse(salvo) : CUPONS_INICIAIS;
    } catch {
      return CUPONS_INICIAIS;
    }
  });

  const [parceiros, setParceiros] = useState<ParceiroVantagem[]>(() => {
    try {
      const salvo = localStorage.getItem("partiu_vantagens_db");
      return salvo ? JSON.parse(salvo) : PARCEIROS_INICIAIS;
    } catch {
      return PARCEIROS_INICIAIS;
    }
  });

  const [copiado, setCopiado] = useState<string | null>(null);
  const [salvoFeedback, setSalvoFeedback] = useState(false);

  // Form Novo Cupom
  const [novoCodigo, setNovoCodigo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoTipo, setNovoTipo] = useState<"porcentagem" | "fixo">("porcentagem");
  const [novoValor, setNovoValor] = useState("10");
  const [novaCategoria, setNovaCategoria] = useState<"todas" | "pop" | "moto" | "flash">("todas");
  const [novoValorMinimo, setNovoValorMinimo] = useState("15");
  const [novoLimiteUsos, setNovoLimiteUsos] = useState("500");
  const [novaDataExpira, setNovaDataExpira] = useState("2026-12-31");

  // Form Novo Parceiro
  const [novoParceiroNome, setNovoParceiroNome] = useState("");
  const [novoParceiroCat, setNovoParceiroCat] = useState<"combustivel" | "manutencao" | "lavajato" | "saude_seguro">("combustivel");
  const [novoParceiroDesconto, setNovoParceiroDesconto] = useState("");
  const [novoParceiroCidade, setNovoParceiroCidade] = useState("Maceió e Região");
  const [novoParceiroDesc, setNovoParceiroDesc] = useState("");
  const [novoParceiroContato, setNovoParceiroContato] = useState("");

  function salvarCuponsStorage(novos: CupomDesconto[]) {
    setCupons(novos);
    localStorage.setItem("partiu_cupons_db", JSON.stringify(novos));
    setSalvoFeedback(true);
    setTimeout(() => setSalvoFeedback(false), 2500);
  }

  function salvarParceirosStorage(novos: ParceiroVantagem[]) {
    setParceiros(novos);
    localStorage.setItem("partiu_vantagens_db", JSON.stringify(novos));
    setSalvoFeedback(true);
    setTimeout(() => setSalvoFeedback(false), 2500);
  }

  function handleCriarCupom(e: FormEvent) {
    e.preventDefault();
    if (!novoCodigo.trim() || !novaDescricao.trim()) return;

    const novo: CupomDesconto = {
      id: `cup-${Date.now()}`,
      codigo: novoCodigo.toUpperCase().replace(/\s+/g, ""),
      descricao: novaDescricao,
      tipo: novoTipo,
      valor: parseFloat(novoValor) || 0,
      categoria: novaCategoria,
      valorMinimoCorrida: parseFloat(novoValorMinimo) || 0,
      usosTotais: 0,
      limiteUsos: parseInt(novoLimiteUsos) || 100,
      expiraEm: novaDataExpira,
      ativo: true,
    };

    salvarCuponsStorage([novo, ...cupons]);
    setNovoCodigo("");
    setNovaDescricao("");
    setNovoValor("10");
  }

  function handleCriarParceiro(e: FormEvent) {
    e.preventDefault();
    if (!novoParceiroNome.trim() || !novoParceiroDesconto.trim()) return;

    const novo: ParceiroVantagem = {
      id: `parc-${Date.now()}`,
      nomeParceiro: novoParceiroNome,
      categoria: novoParceiroCat,
      desconto: novoParceiroDesconto,
      cidade: novoParceiroCidade,
      descricao: novoParceiroDesc,
      contatoOuLink: novoParceiroContato,
      ativo: true,
    };

    salvarParceirosStorage([novo, ...parceiros]);
    setNovoParceiroNome("");
    setNovoParceiroDesconto("");
    setNovoParceiroDesc("");
    setNovoParceiroContato("");
  }

  function toggleAtivoCupom(id: string) {
    const atualizados = cupons.map((c) => (c.id === id ? { ...c, ativo: !c.ativo } : c));
    salvarCuponsStorage(atualizados);
  }

  function removerCupom(id: string) {
    if (confirm("Deseja realmente remover este cupom de desconto?")) {
      salvarCuponsStorage(cupons.filter((c) => c.id !== id));
    }
  }

  function toggleAtivoParceiro(id: string) {
    const atualizados = parceiros.map((p) => (p.id === id ? { ...p, ativo: !p.ativo } : p));
    salvarParceirosStorage(atualizados);
  }

  function removerParceiro(id: string) {
    if (confirm("Deseja remover este parceiro do clube de vantagens?")) {
      salvarParceirosStorage(parceiros.filter((p) => p.id !== id));
    }
  }

  function copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo);
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <div className="w-full space-y-6 pb-24">
      {/* 1. Header do Painel */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0088FF]/20 px-3 py-1 text-[10px] font-black uppercase text-[#0088FF] border border-[#0088FF]/30 mb-2">
            <Ticket className="h-3.5 w-3.5" />
            <span>Marketing, Aquisição & Retenção de Motoristas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            Cupons, Campanhas & Clube de Vantagens
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Crie códigos promocionais para aumentar o volume de corridas dos passageiros e mantenha
            parcerias exclusivas de combustível e manutenção para fidelizar motoristas parceiros.
          </p>
        </div>

        {/* Abas */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => setAbaAtiva("cupons")}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              abaAtiva === "cupons"
                ? "bg-[#0088FF] text-slate-950 shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Ticket className="h-3.5 w-3.5" /> Cupons de Desconto
          </button>
          <button
            onClick={() => setAbaAtiva("vantagens")}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              abaAtiva === "vantagens"
                ? "bg-[#0088FF] text-slate-950 shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Fuel className="h-3.5 w-3.5" /> Clube de Vantagens (Motoristas)
          </button>
          <button
            onClick={() => setAbaAtiva("indicacao")}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              abaAtiva === "indicacao"
                ? "bg-[#0088FF] text-slate-950 shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <HeartHandshake className="h-3.5 w-3.5" /> Indique e Ganhe
          </button>
        </div>
      </div>

      {salvoFeedback && (
        <div className="rounded-2xl bg-emerald-500 text-white p-4 text-xs font-black flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="h-5 w-5" /> Configurações salvas e ativas na plataforma com sucesso!
        </div>
      )}

      {/* ABA 1: CUPONS DE DESCONTO */}
      {abaAtiva === "cupons" && (
        <div className="space-y-6">
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cupons Ativos</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {cupons.filter((c) => c.ativo).length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total de Usos</span>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                {cupons.reduce((acc, c) => acc + c.usosTotais, 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Desconto Médio</span>
              <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1">12% / R$ 6</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Retenção Estimada</span>
              <p className="text-xl sm:text-2xl font-black text-primary-600 mt-1">+28.4%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulário Novo Cupom */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2 mb-1">
                <Plus className="h-5 w-5 text-primary-600" /> Criar Novo Cupom
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Defina o código, porcentagem ou desconto fixo em reais.
              </p>

              <form onSubmit={handleCriarCupom} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase">Código Promocional</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PARTIU20, DOMINGO10"
                    value={novoCodigo}
                    onChange={(e) => setNovoCodigo(e.target.value.toUpperCase())}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-sm uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0088FF]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase">Descrição da Promoção</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: R$ 5 OFF na volta da balada"
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0088FF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase">Tipo de Desconto</label>
                    <select
                      value={novoTipo}
                      onChange={(e) => setNovoTipo(e.target.value as any)}
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                    >
                      <option value="porcentagem">Porcentagem (%)</option>
                      <option value="fixo">Fixo (R$)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase">
                      Valor ({novoTipo === "porcentagem" ? "%" : "R$"})
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase">Categoria Válida</label>
                    <select
                      value={novaCategoria}
                      onChange={(e) => setNovaCategoria(e.target.value as any)}
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                    >
                      <option value="todas">Todas as Corridas</option>
                      <option value="pop">Partiu Pop (Carro)</option>
                      <option value="moto">Partiu Moto</option>
                      <option value="flash">Entregas Flash</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase">Valor Mínimo (R$)</label>
                    <input
                      type="number"
                      min="0"
                      value={novoValorMinimo}
                      onChange={(e) => setNovoValorMinimo(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase">Limite de Usos</label>
                    <input
                      type="number"
                      min="1"
                      value={novoLimiteUsos}
                      onChange={(e) => setNovoLimiteUsos(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase">Validade até</label>
                    <input
                      type="date"
                      value={novaDataExpira}
                      onChange={(e) => setNovaDataExpira(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#0088FF] text-slate-950 font-black text-xs uppercase tracking-wider hover:bg-[#00A3FF] transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Cadastrar Cupom Ativo
                </button>
              </form>
            </div>

            {/* Lista de Cupons Existentes */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800">
                  Cupons Cadastrados ({cupons.length})
                </h3>
                <span className="text-xs text-slate-500">Validados no checkout do app</span>
              </div>

              <div className="space-y-2.5">
                {cupons.map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl border transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
                      c.ativo ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-primary-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                          {c.codigo}
                          <button
                            onClick={() => copiarCodigo(c.codigo)}
                            title="Copiar Código"
                            className="text-amber-700 hover:text-amber-950"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </span>
                        {copiado === c.codigo && (
                          <span className="text-[10px] font-black text-emerald-600">Copiado!</span>
                        )}
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                            c.tipo === "porcentagem"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {c.tipo === "porcentagem" ? `${c.valor}% OFF` : `R$ ${c.valor.toFixed(2)} OFF`}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 capitalize">
                          {c.categoria === "todas"
                            ? "Todas as Categorias"
                            : c.categoria === "pop"
                              ? "Partiu Pop"
                              : c.categoria === "moto"
                                ? "Partiu Moto"
                                : "Entregas Flash"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{c.descricao}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span>Min: R$ {c.valorMinimoCorrida.toFixed(2)}</span>
                        <span>•</span>
                        <span>
                          Usos: <strong>{c.usosTotais}</strong> / {c.limiteUsos}
                        </span>
                        <span>•</span>
                        <span>Expira: {c.expiraEm}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => toggleAtivoCupom(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          c.ativo
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        {c.ativo ? "Ativo" : "Pausado"}
                      </button>
                      <button
                        onClick={() => removerCupom(c.id)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Excluir Cupom"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CLUBE DE VANTAGENS (MOTORISTAS) */}
      {abaAtiva === "vantagens" && (
        <div className="space-y-6">
          <div className="bg-primary-50 border border-amber-200 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary-600 text-slate-950 flex items-center justify-center shrink-0 font-black">
                <Fuel className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Parcerias Exclusivas para Motoristas & Entregadores
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Estes parceiros aparecem na aba "Clube de Vantagens" do app do motorista, garantindo descontos reais em combustível, peças, pneus e alimentação.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Novo Parceiro */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2 mb-1">
                <Plus className="h-5 w-5 text-primary-600" /> Adicionar Convênio
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Cadastre um posto, oficina, autopeças ou seguro parceiro.
              </p>

              <form onSubmit={handleCriarParceiro} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase">Nome do Parceiro / Empresa</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Posto BR Trevo Sul"
                    value={novoParceiroNome}
                    onChange={(e) => setNovoParceiroNome(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase">Categoria</label>
                  <select
                    value={novoParceiroCat}
                    onChange={(e) => setNovoParceiroCat(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    <option value="combustivel">⛽ Combustível & GNV</option>
                    <option value="manutencao">🔧 Auto Peças & Manutenção</option>
                    <option value="lavajato">🧼 Lavajato & Estética</option>
                    <option value="saude_seguro">🩺 Saúde & Seguros</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase">Desconto em Destaque</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: R$ 0,20/litro ou 15% OFF"
                    value={novoParceiroDesconto}
                    onChange={(e) => setNovoParceiroDesconto(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase">Cidade / Região</label>
                  <input
                    type="text"
                    placeholder="Ex: Maceió, Arapiraca"
                    value={novoParceiroCidade}
                    onChange={(e) => setNovoParceiroCidade(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase">Instruções / Regras</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Apresente o aplicativo com cadastro aprovado no caixa."
                    value={novoParceiroDesc}
                    onChange={(e) => setNovoParceiroDesc(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase">Contato / Endereço</label>
                  <input
                    type="text"
                    placeholder="Ex: Whats (82) 99999-0000 ou Endereço"
                    value={novoParceiroContato}
                    onChange={(e) => setNovoParceiroContato(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#0088FF] text-slate-950 font-black text-xs uppercase tracking-wider hover:bg-[#00A3FF] transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Cadastrar Parceria no App
                </button>
              </form>
            </div>

            {/* Lista de Parceiros */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800">
                  Parceiros Cadastrados ({parceiros.length})
                </h3>
              </div>

              <div className="space-y-3">
                {parceiros.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all bg-white flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-sm ${
                      p.ativo ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{p.nomeParceiro}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {p.desconto}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{p.descricao}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span>📍 {p.cidade}</span>
                        <span>•</span>
                        <span>📞 {p.contatoOuLink}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start">
                      <button
                        onClick={() => toggleAtivoParceiro(p.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          p.ativo
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        {p.ativo ? "Visível" : "Oculto"}
                      </button>
                      <button
                        onClick={() => removerParceiro(p.id)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Remover Parceiro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: INDIQUE E GANHE */}
      {abaAtiva === "indicacao" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-blue-700 border border-blue-200">
              <Users className="h-3.5 w-3.5" /> Passageiros
            </div>
            <h3 className="text-base font-black text-slate-900">
              Programa Indique um Amigo (Passageiro)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cada passageiro possui um código único de convite. Ao enviar para um amigo que nunca usou o PARTIU:
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-medium text-slate-700">
              <p>🎁 <strong>O Convidado ganha:</strong> R$ 5,00 de desconto na 1ª corrida.</p>
              <p>💰 <strong>O Amigo ganha:</strong> R$ 5,00 de crédito em saldo assim que a corrida do convidado for concluída.</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
              <span>Status da Campanha:</span>
              <span className="px-2 py-0.5 bg-emerald-200 rounded-lg text-emerald-900 uppercase text-[10px]">Ativa no App</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[10px] font-black uppercase text-amber-700 border border-amber-200">
              <Car className="h-3.5 w-3.5" /> Motoristas Parceiros
            </div>
            <h3 className="text-base font-black text-slate-900">
              Bônus de Indicação de Condutores
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Estimule sua base atual de motoristas a recrutar novos condutores para suprir a demanda da cidade:
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-medium text-slate-700">
              <p>🚗 <strong>Indicação de Carro:</strong> R$ 100,00 creditados via PIX após o indicado completar 25 corridas.</p>
              <p>🛵 <strong>Indicação de Moto / Flash:</strong> R$ 50,00 creditados via PIX após 20 corridas ou entregas.</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
              <span>Status do Bônus:</span>
              <span className="px-2 py-0.5 bg-emerald-200 rounded-lg text-emerald-900 uppercase text-[10px]">Ativo no App</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
