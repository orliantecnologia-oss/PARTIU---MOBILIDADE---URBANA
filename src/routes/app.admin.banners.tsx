import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Flame,
  Image as ImageIcon,
  Layers,
  Plus,
  Radio,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  getSuperAdminConfig,
  saveSuperAdminConfig,
  type BannerApp,
  type ConfigSuperAdmin,
} from "@/lib/superadmin-config";

export const Route = createFileRoute("/app/admin/banners")({
  head: () => ({
    meta: [
      { title: "Gerenciador de Banners do App | Super Admin UniVans" },
      {
        name: "description",
        content: "Gerencie o carrossel promocional da tela inicial do aplicativo em tempo real.",
      },
    ],
  }),
  component: AdminBannersPage,
});

export function AdminBannersPage() {
  const [config, setConfig] = useState<ConfigSuperAdmin>(getSuperAdminConfig);
  const [salvo, setSalvo] = useState(false);

  // Formulário de novo banner
  const [badge, setBadge] = useState("EXCURSÕES • STARLINK VIP");
  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [extra, setExtra] = useState("Wi-Fi Grátis a Bordo");
  const [imagem, setImagem] = useState("");
  const [linkDestino, setLinkDestino] = useState("/app/linhas");

  function handleSalvarBanners(novosBanners: BannerApp[]) {
    const novaConfig = { ...config, banners: novosBanners };
    setConfig(novaConfig);
    saveSuperAdminConfig(novaConfig);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  }

  function handleCriarBanner(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !subtitulo.trim()) return;

    const novo: BannerApp = {
      id: `banner-${Date.now()}`,
      badge,
      titulo,
      subtitulo,
      extra,
      imagem:
        imagem ||
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
      linkDestino,
      ordem: config.banners.length + 1,
      ativo: true,
    };

    handleSalvarBanners([...config.banners, novo]);
    setTitulo("");
    setSubtitulo("");
    setImagem("");
  }

  function toggleAtivo(id: string) {
    const atualizados = config.banners.map((b) => (b.id === id ? { ...b, ativo: !b.ativo } : b));
    handleSalvarBanners(atualizados);
  }

  function removerBanner(id: string) {
    const atualizados = config.banners.filter((b) => b.id !== id);
    handleSalvarBanners(atualizados);
  }

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Header em Tela Cheia com Fontes Grandes */}
      <div className="w-full bg-slate-950 p-5 sm:p-6 rounded-2xl text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-4 py-1.5 text-xs sm:text-sm font-black uppercase text-amber-300 border border-amber-400/30">
            <ImageIcon className="h-4 w-4" />
            <span>Marketing & Destaques da Tela Inicial</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-xl sm:text-2xl font-black tracking-tight">
            Gerenciador de Banners do App
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl font-medium leading-relaxed">
            Adicione, edite e ative campanhas promocionais do Moda Center, rotas turísticas e avisos
            no carrossel do passageiro em tempo real.
          </p>
        </div>
      </div>

      {salvo && (
        <div className="rounded-2xl bg-emerald-500 text-white p-5 text-base font-bold flex items-center gap-3 shadow-xl animate-in fade-in">
          <CheckCircle2 className="h-6 w-6" /> Banners sincronizados com sucesso no aplicativo de
          todos os passageiros!
        </div>
      )}

      {/* Grid de 2 Colunas em Tela Cheia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        {/* Coluna 1: Criador de Banners (5/12) */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleCriarBanner}
            className="w-full rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-sm space-y-6"
          >
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                <Plus className="h-6 w-6 text-[#0d5930]" /> Criar Novo Banner Promocional
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Preencha os campos para publicar imediatamente no aplicativo.
              </p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                Badge / Categoria Superior
              </label>
              <input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Ex: EXCURSÕES • STARLINK VIP"
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                Título Principal
              </label>
              <input
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Vem viajar para o Moda Center!"
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                Subtítulo / Cidades Atendidas
              </label>
              <input
                required
                value={subtitulo}
                onChange={(e) => setSubtitulo(e.target.value)}
                placeholder="Ex: SANTA CRUZ • CARUARU • TORITAMA"
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                  Tag Destacada
                </label>
                <input
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Ex: Wi-Fi Grátis"
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                  Link de Destino
                </label>
                <select
                  value={linkDestino}
                  onChange={(e) => setLinkDestino(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none border border-slate-200"
                >
                  <option value="/app/linhas">Lista de Vans (/app/linhas)</option>
                  <option value="/app/shop">Shop Afiliados (/app/shop)</option>
                  <option value="/app/shop-videos">Shop Vídeos (/app/shop-videos)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                URL da Imagem em Alta Resolução
              </label>
              <input
                value={imagem}
                onChange={(e) => setImagem(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0d5930] text-base font-black text-white shadow-xl shadow-[#0d5930]/30 hover:brightness-105 active:scale-[0.98] transition-all"
            >
              <Plus className="h-5 w-5" /> Publicar Banner no Aplicativo
            </button>
          </form>
        </div>

        {/* Coluna 2: Banners Cadastrados e Preview Real (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="w-full rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Banners Cadastrados no Carrossel ({config.banners.length})
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Visualize exatamente como os passageiros enxergam cada campanha.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {config.banners.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-slate-900 text-white relative group"
                >
                  <div className="relative aspect-[16/7] w-full overflow-hidden">
                    <img
                      src={b.imagem}
                      alt={b.titulo}
                      className="h-full w-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300 border border-white/20">
                          {b.badge}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            b.ativo ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {b.ativo ? "✓ Ativo no App" : "Pausado"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl sm:text-2xl font-black">{b.titulo}</h3>
                        <p className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5">
                          {b.subtitulo}
                        </p>
                        <span className="inline-block text-xs font-extrabold text-amber-400 mt-2 bg-black/40 px-2.5 py-0.5 rounded-lg">
                          {b.extra}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 flex items-center justify-between gap-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleAtivo(b.id)}
                      className={`flex-1 h-11 rounded-2xl text-xs sm:text-sm font-black transition-all ${
                        b.ativo
                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {b.ativo ? "Pausar Banner" : "Ativar Banner no App"}
                    </button>

                    <button
                      type="button"
                      onClick={() => removerBanner(b.id)}
                      className="flex h-11 px-4 items-center justify-center gap-2 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-xs sm:text-sm font-bold"
                    >
                      <Trash2 className="h-4 w-4" /> Excluir
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
