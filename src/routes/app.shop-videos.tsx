import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Heart,
  Share2,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { videosShopIniciais, type VideoShop } from "@/lib/afiliados-data";

export const Route = createFileRoute("/app/shop-videos")({
  head: () => ({
    meta: [
      { title: "Shop Vídeos & Achadinhos | UniVans" },
      {
        name: "description",
        content: "Vídeos curtos de produtos de viagem e compras na Shopee e Mercado Livre.",
      },
    ],
  }),
  component: ShopVideosPage,
});

export function ShopVideosPage() {
  const [videos] = useState<VideoShop[]>(videosShopIniciais);
  const [likes, setLikes] = useState<Record<string, number>>({
    "vid-1": 1240,
    "vid-2": 890,
  });
  const [curtidos, setCurtidos] = useState<Record<string, boolean>>({});

  function toggleLike(id: string) {
    setCurtidos((prev) => ({ ...prev, [id]: !prev[id] }));
    setLikes((prev) => ({
      ...prev,
      [id]: curtidos[id] ? (prev[id] ?? 0) - 1 : (prev[id] ?? 0) + 1,
    }));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Header Transparente */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/10">
        <Link
          to="/app/shop"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-xs font-black uppercase tracking-wider text-amber-400">
          ▶️ Shop Vídeos & Achadinhos
        </span>
        <div className="w-9" />
      </header>

      {/* Feed de Vídeos Estilo Reels */}
      <main className="p-4 space-y-6">
        {videos.map((vid) => (
          <div
            key={vid.id}
            className="rounded-3xl bg-slate-900 border border-white/10 overflow-hidden shadow-2xl relative"
          >
            {/* Player de Vídeo */}
            <div className="relative aspect-[9/14] bg-black">
              <video
                src={vid.videoUrl}
                poster={vid.thumbnail}
                controls
                playsInline
                className="h-full w-full object-cover"
              />

              {/* Tag da Loja */}
              <span
                className={`absolute top-3 left-3 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase shadow-md ${
                  vid.loja === "shopee" ? "bg-[#ee4d2d] text-white" : "bg-[#ffe600] text-slate-900"
                }`}
              >
                {vid.loja === "shopee" ? "Shopee" : "Mercado Livre"}
              </span>

              {/* Botões Laterais */}
              <div className="absolute right-3 bottom-20 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleLike(vid.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md transition-all ${
                      curtidos[vid.id] ? "bg-rose-500 text-white" : "bg-black/50 text-white"
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${curtidos[vid.id] ? "fill-white" : ""}`} />
                  </div>
                  <span className="text-[10px] font-bold text-white shadow-xs">
                    {likes[vid.id] ?? vid.likes}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: vid.titulo, url: window.location.href });
                    }
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white">
                    <Share2 className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold text-white">Compartilhar</span>
                </button>
              </div>

              {/* Card de Produto Sobreposto */}
              <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-slate-950/90 backdrop-blur-md p-3 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-400 uppercase">Produto do Vídeo</p>
                  <p className="text-xs font-bold text-white truncate">{vid.produtoNome}</p>
                  <p className="text-xs font-black text-emerald-400">
                    R$ {vid.preco.toFixed(2).replace(".", ",")}
                  </p>
                </div>

                <a
                  href={vid.linkAfiliado}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex h-9 items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-black shadow-md ${
                    vid.loja === "shopee"
                      ? "bg-[#ee4d2d] text-white"
                      : "bg-[#ffe600] text-slate-900"
                  }`}
                >
                  <span>Comprar</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Descrição abaixo do vídeo */}
            <div className="p-4 border-t border-white/5">
              <h3 className="text-sm font-black text-white">{vid.titulo}</h3>
              <p className="text-xs text-slate-400 mt-1">{vid.descricao}</p>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
