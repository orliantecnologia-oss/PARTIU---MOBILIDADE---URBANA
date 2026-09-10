import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
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
  Eye,
  Check,
  Tag,
  AlertTriangle,
} from "lucide-react";
import {
  getSuperAdminConfig,
  saveSuperAdminConfig,
  type BannerApp,
  type ConfigSuperAdmin,
} from "@/lib/superadmin-config";
import {
  bannerService,
  type BannerItem,
  type BannerCategory,
} from "@/lib/ecosystem/banner-service";

export const Route = createFileRoute("/app/admin/banners")({
  head: () => ({
    meta: [
      { title: "Gerenciador de Banners do App | PARTIU Admin" },
      {
        name: "description",
        content: "Gerencie o carrossel de banners da tela inicial do aplicativo do passageiro em tempo real.",
      },
    ],
  }),
  component: AdminBannersPage,
});

const IMAGENS_PRESET = [
  {
    nome: "Carro Urbano Moderno",
    url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop&q=80",
  },
  {
    nome: "Motoboy Entrega Flash",
    url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80",
  },
  {
    nome: "Motorista Parceiro Sorridente",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
  },
  {
    nome: "Partiu Mulher & Segurança",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80",
  },
  {
    nome: "Cidade Noturna & Dinâmica",
    url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop&q=80",
  },
];

export function AdminBannersPage() {
  const [banners, setBanners] = useState<BannerItem[]>(() => bannerService.getAllBanners());
  const [salvo, setSalvo] = useState(false);

  // Formulário de novo banner
  const [categoria, setCategoria] = useState<BannerCategory>("PASSENGER");
  const [badge, setBadge] = useState("CORRIDAS COM DESCONTO");
  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [extra, setExtra] = useState("Ar-condicionado garantido");
  const [imagem, setImagem] = useState(IMAGENS_PRESET[0]?.url ?? "");
  const [linkDestino, setLinkDestino] = useState("/app");
  const [validacaoDimensoes, setValidacaoDimensoes] = useState<{
    isValid: boolean;
    message: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
  } | null>(null);

  // Validação em tempo real de dimensões de imagem
  useEffect(() => {
    if (imagem && imagem.startsWith("http")) {
      void bannerService.validateBannerDimensions(imagem).then(setValidacaoDimensoes);
    } else {
      setValidacaoDimensoes(null);
    }
  }, [imagem]);

  // Inscrição reativa para sincronização com o banco
  useEffect(() => {
    return bannerService.subscribe((list) => {
      setBanners(list);
    });
  }, []);

  async function handleCriarBanner(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !subtitulo.trim()) return;

    await bannerService.createBanner({
      title: titulo.trim(),
      subtitle: subtitulo.trim(),
      badge: badge.trim(),
      image_url: imagem || IMAGENS_PRESET[0]?.url || "",
      link_url: linkDestino,
      category: categoria,
      order_index: banners.length + 1,
      is_active: true,
    });

    setTitulo("");
    setSubtitulo("");
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  }

  async function toggleAtivo(id: string) {
    await bannerService.toggleBannerStatus(id);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  async function removerBanner(id: string) {
    await bannerService.deleteBanner(id);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Header em Tela Cheia */}
      <div className="w-full bg-slate-950 p-6 rounded-3xl text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFDE00]/20 px-4 py-1.5 text-xs font-black uppercase text-yellow-300 border border-yellow-400/30">
            <ImageIcon className="h-4 w-4" />
            <span>CMS de Campanhas &amp; Banners da Tela Inicial</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
            Carrossel de Imagens do Passageiro
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl font-medium leading-relaxed">
            Adicione, edite ou desative os slides promocionais que aparecem em tempo real na tela inicial do app de todos os passageiros.
          </p>
        </div>
      </div>

      {salvo && (
        <div className="rounded-2xl bg-emerald-500 text-slate-950 p-4 text-sm font-black flex items-center gap-3 shadow-xl animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-slate-950" /> Banners sincronizados com sucesso no aplicativo do passageiro!
        </div>
      )}

      {/* Grid: Formulário (Coluna Esquerda) + Lista com Pré-visualização (Coluna Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        {/* Formulário: Criar Novo Banner (5/12) */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleCriarBanner}
            className="w-full rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-5"
          >
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                <Plus className="h-5 w-5 text-amber-500" /> Publicar Novo Slide Promocional
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Os dados aparecerão imediatamente no carrossel da home do app.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Badge / Categoria
                </label>
                <select
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none border border-slate-200 focus:border-[#FFDE00]"
                >
                  <option value="CORRIDAS COM DESCONTO">CORRIDAS COM DESCONTO</option>
                  <option value="ENTREGAS URBANAS FLASH">ENTREGAS URBANAS FLASH</option>
                  <option value="MOTORISTAS & ENTREGADORES">MOTORISTAS &amp; ENTREGADORES</option>
                  <option value="PARTIU MULHER">PARTIU MULHER (SEGURANÇA)</option>
                  <option value="CASHBACK & BENEFÍCIOS">CASHBACK &amp; BENEFÍCIOS</option>
                  <option value="NOVIDADES PARTIU">NOVIDADES PARTIU</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Público Alvo do Banner
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as BannerCategory)}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none border border-slate-200 focus:border-[#FFDE00]"
                >
                  <option value="PASSENGER">Passageiro (Home)</option>
                  <option value="DRIVER">Motorista (Cockpit)</option>
                  <option value="ALL">Ambos os Apps</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Título Principal
              </label>
              <input
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Vá de Partiu Pop com 20% OFF"
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#FFDE00]"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Subtítulo / Descrição
              </label>
              <input
                required
                value={subtitulo}
                onChange={(e) => setSubtitulo(e.target.value)}
                placeholder="Ex: Use o cupom PARTIU10 na sua próxima viagem"
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#FFDE00]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Tag Destacada
                </label>
                <input
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Ex: R$ 10 OFF"
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#FFDE00]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Ação ao Clicar
                </label>
                <select
                  value={linkDestino}
                  onChange={(e) => setLinkDestino(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none border border-slate-200"
                >
                  <option value="/app">Solicitar Corrida (/app)</option>
                  <option value="/app/encomendas">PARTIU Entrega Flash (/app/encomendas)</option>
                  <option value="/app/motorista">Cockpit do Motorista (/app/motorista)</option>
                  <option value="/app/bilhetes">Histórico de Atividades (/app/bilhetes)</option>
                  <option value="/app/perfil">Carteira &amp; Perfil (/app/perfil)</option>
                </select>
              </div>
            </div>

            {/* Seletor de Imagens Preset */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Escolha uma Foto ou Cole URL (Validação Mobile)
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {IMAGENS_PRESET.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImagem(p.url)}
                    className={`p-2 rounded-xl text-left text-[11px] font-bold border transition flex items-center gap-2 ${
                      imagem === p.url
                        ? "bg-amber-50 border-[#FFDE00] text-slate-950 ring-2 ring-[#FFDE00]"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <img src={p.url} alt={p.nome} className="w-8 h-8 rounded-lg object-cover" />
                    <span className="truncate">{p.nome}</span>
                  </button>
                ))}
              </div>

              <input
                value={imagem}
                onChange={(e) => setImagem(e.target.value)}
                placeholder="Ou cole a URL direta de uma imagem personalizada..."
                className="w-full rounded-2xl bg-slate-50 px-4 py-2.5 text-xs font-mono text-slate-700 outline-none border border-slate-200 focus:border-[#FFDE00]"
              />

              {/* Feedback de Validação de Dimensões Mobile */}
              {validacaoDimensoes && (
                <div
                  className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    validacaoDimensoes.isValid
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  <span className="shrink-0">{validacaoDimensoes.isValid ? "✅" : "⚠️"}</span>
                  <span className="font-medium">{validacaoDimensoes.message}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-[#FFDE00] hover:bg-[#FDD835] active:scale-[0.99] text-slate-950 font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="h-5 w-5" /> Adicionar Slide ao Carrossel
            </button>
          </form>
        </div>

        {/* Lista de Banners Ativos e Gerenciador (7/12) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-500" /> Slides Publicados no App ({banners.length})
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {banners.filter((b) => b.is_active).length} ativos no carrossel
            </span>
          </div>

          <div className="space-y-4">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`rounded-3xl border overflow-hidden transition-all shadow-sm ${
                  banner.is_active ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200 opacity-60"
                }`}
              >
                {/* Visual Preview Real do Slide */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 flex flex-col justify-between text-white">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-[#FFDE00] text-slate-950 font-black text-[10px] uppercase tracking-wider">
                        {banner.badge}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-yellow-300 font-bold text-[9px] uppercase border border-yellow-400/30">
                          {banner.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-black/60 text-white font-mono text-[10px] backdrop-blur-xs">
                          #{banner.order_index || index + 1}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white leading-tight drop-shadow-md">
                        {banner.title}
                      </h3>
                      <p className="text-xs text-slate-200 font-medium mt-1 line-clamp-1">
                        {banner.subtitle}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-amber-300 font-bold">
                          ➔ {banner.link_url}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controles do Banner */}
                <div className="p-4 bg-white flex items-center justify-between gap-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAtivo(banner.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        banner.is_active
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      {banner.is_active ? "● Ativo no App" : "○ Pausado"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removerBanner(banner.id)}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Excluir Slide"
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
  );
}
