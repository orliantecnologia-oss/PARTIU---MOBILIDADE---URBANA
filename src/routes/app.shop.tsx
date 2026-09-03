import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Search,
  Filter,
  Flame,
  Star,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import {
  getProdutosAfiliados,
  getAfiliadosConfig,
  type ProdutoAfiliado,
} from "@/lib/afiliados-data";

export const Route = createFileRoute("/app/shop")({
  head: () => ({
    meta: [
      { title: "Shop de Viagem | Shopee & Mercado Livre | UniVans" },
      {
        name: "description",
        content:
          "Acessórios de viagem, almofadas, suportes para celular e achadinhos das melhores lojas parceiras.",
      },
    ],
  }),
  component: ShopPage,
});

export function ShopPage() {
  const config = getAfiliadosConfig();
  const [produtos] = useState<ProdutoAfiliado[]>(() => getProdutosAfiliados());
  const [lojaFiltro, setLojaFiltro] = useState<"todas" | "shopee" | "mercadolivre">("todas");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  const produtosFiltrados = produtos.filter((p) => {
    if (!p.ativo) return false;
    if (lojaFiltro !== "todas" && p.loja !== lojaFiltro) return false;
    if (categoriaFiltro !== "todas" && p.categoria !== categoriaFiltro) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return p.titulo.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-24">
      {/* Header do Shop */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">UniVans Shop</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Shopee • Mercado Livre
              </p>
            </div>
          </div>

          <Link
            to="/app/shop-videos"
            className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-600 border border-rose-200"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>Vídeos / Reels</span>
          </Link>
        </div>

        {/* Barra de Busca */}
        <div className="mt-3 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar almofadas, suportes, mochilas..."
            className="w-full rounded-2xl bg-slate-100 pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
          />
        </div>

        {/* Filtros por Loja */}
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setLojaFiltro("todas")}
            className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 transition-all ${
              lojaFiltro === "todas"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todas as Lojas
          </button>
          <button
            onClick={() => setLojaFiltro("shopee")}
            className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
              lojaFiltro === "shopee"
                ? "bg-[#ee4d2d] text-white shadow-xs"
                : "bg-orange-50 text-[#ee4d2d] border border-orange-200 hover:bg-orange-100"
            }`}
          >
            <span>🟠 Shopee Oficial</span>
          </button>
          <button
            onClick={() => setLojaFiltro("mercadolivre")}
            className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
              lojaFiltro === "mercadolivre"
                ? "bg-[#ffe600] text-slate-900 shadow-xs"
                : "bg-yellow-50 text-slate-900 border border-yellow-200 hover:bg-yellow-100"
            }`}
          >
            <span>🟡 Mercado Livre</span>
          </button>
        </div>
      </header>

      {/* Banner de Oferta Especial */}
      <div className="p-4">
        <div className="rounded-3xl bg-gradient-to-r from-[#0d5930] to-[#147a44] p-4 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
              <Flame className="h-3 w-3" /> Achadinhos da Viagem
            </span>
            <h2 className="mt-1.5 text-base font-black leading-tight">
              Ofertas Especiais para Passageiros & Motoristas
            </h2>
            <p className="mt-1 text-[11px] text-white/90 leading-relaxed">
              Compre direto com frete grátis e cupons na Shopee e Mercado Livre.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Produtos */}
      <main className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            {produtosFiltrados.length} Produtos Recomendados
          </h3>
          <span className="text-[11px] font-bold text-slate-500">Parceiros Oficiais</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {produtosFiltrados.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                {/* Imagem do Produto */}
                <div className="relative aspect-square bg-slate-100">
                  <img src={p.imagem} alt={p.titulo} className="h-full w-full object-cover" />
                  {p.desconto && (
                    <span className="absolute top-2 left-2 rounded-lg bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                      {p.desconto}
                    </span>
                  )}
                  <span
                    className={`absolute bottom-2 right-2 rounded-lg px-2 py-0.5 text-[9px] font-black shadow-xs ${
                      p.loja === "shopee"
                        ? "bg-[#ee4d2d] text-white"
                        : "bg-[#ffe600] text-slate-900 font-extrabold"
                    }`}
                  >
                    {p.loja === "shopee" ? "Shopee" : "Mercado Livre"}
                  </span>
                </div>

                {/* Detalhes */}
                <div className="p-3">
                  <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                    {p.titulo}
                  </p>

                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-[#0d5930]">
                      R$ {p.preco.toFixed(2).replace(".", ",")}
                    </span>
                    {p.precoOriginal && (
                      <span className="text-[10px] text-slate-400 line-through">
                        R$ {p.precoOriginal.toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {p.avaliacao}
                    </span>
                    <span>{p.vendas}</span>
                  </div>
                </div>
              </div>

              {/* Botão de Compra com Link de Afiliado */}
              <div className="p-3 pt-0">
                <a
                  href={p.linkAfiliado}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-all shadow-xs active:scale-[0.98] ${
                    p.loja === "shopee"
                      ? "bg-[#ee4d2d] text-white hover:brightness-105"
                      : "bg-[#ffe600] text-slate-900 hover:brightness-105"
                  }`}
                >
                  <span>{p.loja === "shopee" ? "Ver na Shopee" : "Ver no Mercado Livre"}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
