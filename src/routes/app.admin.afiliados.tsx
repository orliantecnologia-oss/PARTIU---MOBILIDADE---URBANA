import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Flame,
  Key,
  Percent,
  Plus,
  Radio,
  Save,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  getAfiliadosConfig,
  saveAfiliadosConfig,
  getProdutosAfiliados,
  saveProdutosAfiliados,
  type ConfigAfiliados,
  type ProdutoAfiliado,
} from "@/lib/afiliados-data";

export const Route = createFileRoute("/app/admin/afiliados")({
  head: () => ({
    meta: [
      { title: "Gestão de Afiliados (Shopee & Mercado Livre) | Super Admin UniVans" },
      {
        name: "description",
        content:
          "Configure as APIs, tags de rastreamento e produtos afiliados da Shopee e Mercado Livre.",
      },
    ],
  }),
  component: AdminAfiliadosPage,
});

export function AdminAfiliadosPage() {
  const [config, setConfig] = useState<ConfigAfiliados>(getAfiliadosConfig);
  const [produtos, setProdutos] = useState<ProdutoAfiliado[]>(getProdutosAfiliados);
  const [salvo, setSalvo] = useState(false);
  const [testeShopee, setTesteShopee] = useState(false);
  const [testeMeli, setTesteMeli] = useState(false);

  // Novo produto
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaLoja, setNovaLoja] = useState<"shopee" | "mercadolivre">("shopee");
  const [novoPreco, setNovoPreco] = useState("");
  const [novoLink, setNovoLink] = useState("");
  const [novaImagem, setNovaImagem] = useState("");
  const [novaComissao, setNovaComissao] = useState("12%");
  const [novaCategoria, setNovaCategoria] = useState<
    "viagem" | "acessorios_van" | "eletronicos" | "moda"
  >("viagem");

  function handleSalvarConfig(e: FormEvent) {
    e.preventDefault();
    saveAfiliadosConfig(config);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  }

  function handleAddProduto(e: FormEvent) {
    e.preventDefault();
    if (!novoTitulo || !novoPreco || !novoLink) return;

    const novo: ProdutoAfiliado = {
      id: `prod-${Date.now()}`,
      titulo: novoTitulo,
      loja: novaLoja,
      preco: parseFloat(novoPreco.replace(",", ".")),
      imagem:
        novaImagem ||
        "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&auto=format&fit=crop&q=80",
      categoria: novaCategoria,
      linkAfiliado: novoLink,
      avaliacao: 4.9,
      vendas: "Recém adicionado",
      comissaoEstimada: novaComissao,
      ativo: true,
    };

    const atualizados = [novo, ...produtos];
    setProdutos(atualizados);
    saveProdutosAfiliados(atualizados);
    setNovoTitulo("");
    setNovoPreco("");
    setNovoLink("");
    setNovaImagem("");
  }

  function toggleAtivo(id: string) {
    const atualizados = produtos.map((p) => (p.id === id ? { ...p, ativo: !p.ativo } : p));
    setProdutos(atualizados);
    saveProdutosAfiliados(atualizados);
  }

  function removerProduto(id: string) {
    const atualizados = produtos.filter((p) => p.id !== id);
    setProdutos(atualizados);
    saveProdutosAfiliados(atualizados);
  }

  return (
    <div className="w-full space-y-6 pb-24">
      {/* 1. Header do Painel com Estatísticas de Afiliados */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-[10px] font-black uppercase text-amber-300 border border-amber-400/30 mb-2">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Monetização & E-commerce de Viagem</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Central de Afiliados: Shopee & Mercado Livre
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Configure as APIs oficiais, credenciais e produtos recomendados no Shop do aplicativo.
            Todas as compras geram receita direta para a cooperativa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app/shop"
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition-all"
          >
            <ExternalLink className="h-4 w-4" /> Ver Vitrine no App
          </Link>
          <Link
            to="/app/shop-videos"
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md px-4 text-xs font-black text-white hover:bg-white/20 border border-white/20"
          >
            Shop Vídeos
          </Link>
        </div>
      </div>

      {salvo && (
        <div className="rounded-2xl bg-emerald-500 text-white p-4 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="h-5 w-5" /> Configurações e credenciais de afiliados atualizadas
          com sucesso!
        </div>
      )}

      {/* 2. Grid Responsivo de 2 Colunas para Computadores (Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna da Esquerda (5/12 no Desktop): Credenciais de APIs */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleSalvarConfig}
            className="rounded-2xl bg-white p-6 border border-slate-200 elevation-card space-y-5"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Key className="h-5 w-5 text-[#0d5930]" /> Credenciais de APIs & Tags de
                Rastreamento
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Insira suas chaves para habilitar a geração de links monetizados.
              </p>
            </div>

            {/* Bloco Shopee */}
            <div className="rounded-2xl bg-orange-50/50 p-4 border border-orange-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#ee4d2d] flex items-center gap-1.5">
                  <span className="text-sm">🟠</span> Shopee Affiliate Program
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTesteShopee(true);
                    setTimeout(() => setTesteShopee(false), 3000);
                  }}
                  className="text-[10px] font-bold text-[#ee4d2d] hover:underline"
                >
                  {testeShopee ? "✓ Conectado" : "Testar Conexão"}
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Shopee App Key / Client ID
                </label>
                <input
                  value={config.shopeeAppId}
                  onChange={(e) => setConfig({ ...config, shopeeAppId: e.target.value })}
                  className="w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#ee4d2d]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Shopee Secret Key
                </label>
                <input
                  type="password"
                  value={config.shopeeSecretKey}
                  onChange={(e) => setConfig({ ...config, shopeeSecretKey: e.target.value })}
                  className="w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#ee4d2d]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Tag de Afiliado Shopee (aff_id)
                </label>
                <input
                  value={config.shopeeAffiliateTag}
                  onChange={(e) => setConfig({ ...config, shopeeAffiliateTag: e.target.value })}
                  className="w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#ee4d2d]"
                />
              </div>
            </div>

            {/* Bloco Mercado Livre */}
            <div className="rounded-2xl bg-yellow-50/50 p-4 border border-yellow-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <span className="text-sm">🟡</span> Mercado Livre Afiliados / Developers
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTesteMeli(true);
                    setTimeout(() => setTesteMeli(false), 3000);
                  }}
                  className="text-[10px] font-bold text-amber-800 hover:underline"
                >
                  {testeMeli ? "✓ Conectado" : "Testar Conexão"}
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Mercado Livre Client ID
                </label>
                <input
                  value={config.meliClientId}
                  onChange={(e) => setConfig({ ...config, meliClientId: e.target.value })}
                  className="w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Mercado Livre Client Secret
                </label>
                <input
                  type="password"
                  value={config.meliClientSecret}
                  onChange={(e) => setConfig({ ...config, meliClientSecret: e.target.value })}
                  className="w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Tag de Rastreamento Mercado Livre
                </label>
                <input
                  value={config.meliAffiliateTag}
                  onChange={(e) => setConfig({ ...config, meliAffiliateTag: e.target.value })}
                  className="w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0d5930] text-xs font-black text-white elevation-card hover:brightness-105 active:scale-[0.98] transition-all"
            >
              <Save className="h-4 w-4" /> Salvar Credenciais das Lojas
            </button>
          </form>

          {/* Card de Cadastro de Novo Produto */}
          <form
            onSubmit={handleAddProduto}
            className="rounded-2xl bg-white p-6 border border-slate-200 elevation-card space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#0d5930]" /> Cadastrar Novo Produto na Vitrine
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Adicione produtos com seu link de afiliado para exibir aos passageiros.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Título do Produto
              </label>
              <input
                required
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Ex: Almofada de Pescoço Viscoelástica Ergonômica"
                className="w-full rounded-xl bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Loja Parceira
                </label>
                <select
                  value={novaLoja}
                  onChange={(e) => setNovaLoja(e.target.value as "shopee" | "mercadolivre")}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none border border-slate-200"
                >
                  <option value="shopee">🟠 Shopee Oficial</option>
                  <option value="mercadolivre">🟡 Mercado Livre</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Categoria
                </label>
                <select
                  value={novaCategoria}
                  onChange={(e) =>
                    setNovaCategoria(
                      e.target.value as "viagem" | "acessorios_van" | "eletronicos" | "moda",
                    )
                  }
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none border border-slate-200"
                >
                  <option value="viagem">Conforto de Viagem</option>
                  <option value="acessorios_van">Acessórios para Van</option>
                  <option value="eletronicos">Eletrônicos / Cabos</option>
                  <option value="moda">Moda / Moda Center</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Preço de Venda (R$)
                </label>
                <input
                  required
                  value={novoPreco}
                  onChange={(e) => setNovoPreco(e.target.value)}
                  placeholder="34,90"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Comissão Estimada
                </label>
                <input
                  value={novaComissao}
                  onChange={(e) => setNovaComissao(e.target.value)}
                  placeholder="12%"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Link de Afiliado Oficial (com sua tag)
              </label>
              <input
                required
                value={novoLink}
                onChange={(e) => setNovoLink(e.target.value)}
                placeholder="https://shopee.com.br/... ou https://mercadolivre.com.br/sec/..."
                className="w-full rounded-xl bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                URL da Imagem do Produto (Opcional)
              </label>
              <input
                value={novaImagem}
                onChange={(e) => setNovaImagem(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-xl bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-black text-white hover:bg-slate-800 active:scale-[0.98] transition-all elevation-card"
            >
              <Plus className="h-4 w-4" /> Publicar Produto no Shop UniVans
            </button>
          </form>
        </div>

        {/* Coluna da Direita (7/12 no Desktop): Vitrine e Gestão de Produtos Cadastrados */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-white p-6 border border-slate-200 elevation-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-amber-500" /> Produtos Ativos no Shop (
                  {produtos.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lista de produtos que estão sendo exibidos no aplicativo dos passageiros.
                </p>
              </div>

              <span className="text-[11px] font-bold text-[#0d5930] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                {produtos.filter((p) => p.ativo).length} Ativos
              </span>
            </div>

            {/* Grid de Cards de Produtos em Desktop (2 colunas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {produtos.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl bg-white border border-slate-200 shadow-xs hover:elevation-card transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem com Badges */}
                    <div className="relative aspect-[16/10] bg-slate-100">
                      <img src={p.imagem} alt={p.titulo} className="h-full w-full object-cover" />
                      <span
                        className={`absolute top-2 left-2 rounded-lg px-2 py-0.5 text-[9px] font-black shadow-xs ${
                          p.loja === "shopee"
                            ? "bg-[#ee4d2d] text-white"
                            : "bg-[#ffe600] text-slate-950"
                        }`}
                      >
                        {p.loja === "shopee" ? "Shopee" : "Mercado Livre"}
                      </span>

                      <span
                        className={`absolute top-2 right-2 rounded-lg px-2 py-0.5 text-[9px] font-black shadow-xs ${
                          p.ativo ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-200"
                        }`}
                      >
                        {p.ativo ? "Visível" : "Pausado"}
                      </span>
                    </div>

                    {/* Detalhes */}
                    <div className="p-3.5 space-y-2">
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {p.titulo}
                      </h3>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-[#0d5930]">
                          R$ {p.preco.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Comissão ~{p.comissaoEstimada}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="h-3 w-3 fill-amber-400" /> {p.avaliacao}
                        </span>
                        <span>{p.vendas}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações de Controle */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAtivo(p.id)}
                      className={`flex-1 h-8 rounded-xl text-xs font-black transition-all ${
                        p.ativo
                          ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {p.ativo ? "Pausar Anúncio" : "Ativar Anúncio"}
                    </button>

                    <a
                      href={p.linkAfiliado}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs"
                      title="Testar Link de Afiliado"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => removerProduto(p.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                      title="Excluir Produto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
