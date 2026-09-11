import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GuardiaoAcesso } from "@/components/admin/GuardiaoAcesso";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useBranding } from "@/hooks/useBranding";
import { BRANDING_PRESETS, DEFAULT_BRANDING, type AppBrandingRecord } from "@/lib/branding";
import {
  Sparkles,
  Palette,
  Type,
  Layout,
  Compass,
  Layers,
  DollarSign,
  Globe,
  Smartphone,
  Download,
  Upload,
  RotateCcw,
  Save,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Building2,
  Copy,
  ExternalLink,
  ShieldCheck,
  SmartphoneNfc,
  Tablet,
  Monitor,
  Car,
  Package,
  Bike,
  Truck,
  GraduationCap,
  Bus,
  Crown,
  ShoppingBag,
  Store,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Unlink,
  Sliders,
} from "lucide-react";
import {
  type BusinessVerticalId,
  type FontFamilyOption,
  type BorderRadiusOption,
  type ShadowOption,
  type SpacingScale,
  type CurrencyCode,
  type LocaleCode,
  type WhiteLabelFullConfig,
} from "@/lib/white-label";

export const Route = createFileRoute("/app/admin/whitelabel")({
  head: () => ({
    meta: [
      { title: "White Label Studio OS | PARTIU Enterprise" },
      {
        name: "description",
        content:
          "Plataforma de customização White Label total sem código: Brand Center, Design System, Multi-negócio, Multi-tenant e Live Preview.",
      },
    ],
  }),
  component: WhiteLabelStudioPage,
});

type ActiveTab =
  | "brand"
  | "design"
  | "typography"
  | "home"
  | "menu"
  | "business"
  | "monetization"
  | "geo_app"
  | "tenants";

function WhiteLabelStudioPage() {
  return (
    <GuardiaoAcesso somenteOwner={true}>
      <WhiteLabelStudioContent />
    </GuardiaoAcesso>
  );
}

function WhiteLabelStudioContent() {
  const {
    config,
    brand,
    designSystem,
    typography,
    homePage,
    menuBuilder,
    businessModels,
    monetization,
    geo,
    appConfig,
    activeTenant,
    allTenants,
    updateConfig,
    switchTenant,
    cloneTenant,
    toggleBusinessModel,
    reorderHomeBlocks,
    applyPreset,
    exportThemeJson,
    importThemeJson,
    resetToDefaults,
  } = useBrandTheme();

  const {
    branding,
    activeTenantId: saasTenantId,
    setTenantId: setSaasTenantId,
    updateBranding,
    applyPreset: applySaasPreset,
    uploadAsset,
    isSyncing,
    lastSyncedAt,
    resetToDefault: resetSaasBranding,
  } = useBranding();

  const [activeTab, setActiveTab] = useState<ActiveTab>("brand");
  const [salvoFeedback, setSalvoFeedback] = useState(false);
  const [modalClonarAberto, setModalClonarAberto] = useState(false);
  const [cloneCidadeNome, setCloneCidadeNome] = useState("");
  const [cloneEstadoUf, setCloneEstadoUf] = useState("RJ");
  const [cloneTenantId, setCloneTenantId] = useState("");
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importErro, setImportErro] = useState<string | null>(null);

  // Upload de Mídia para Supabase Storage
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileUpload(file: File, type: "logo" | "splash" | "favicon") {
    try {
      setUploadingField(type);
      setUploadError(null);
      const url = await uploadAsset(file, type);
      if (url) {
        if (type === "logo") {
          updateConfig({
            brandCenter: {
              ...brand,
              logos: { ...brand.logos, logoPrincipalUrl: url },
            },
          });
        } else if (type === "splash") {
          updateConfig({
            brandCenter: {
              ...brand,
              splash: { ...brand.splash, splashAndroidUrl: url, splashIosUrl: url },
            },
          });
        } else if (type === "favicon") {
          updateConfig({
            brandCenter: {
              ...brand,
              favicons: { ...brand.favicons, faviconDesktopUrl: url },
            },
          });
        }
        triggerSaveFeedback();
      }
    } catch (err: any) {
      setUploadError(err?.message || "Erro no upload do arquivo.");
    } finally {
      setUploadingField(null);
    }
  }

  // Live Preview Device Simulator State
  const [previewDevice, setPreviewDevice] = useState<"MOBILE" | "TABLET" | "DESKTOP">("MOBILE");
  const [previewAberto, setPreviewAberto] = useState(true);

  // Helper de persistência manual / auto
  function triggerSaveFeedback() {
    setSalvoFeedback(true);
    setTimeout(() => setSalvoFeedback(false), 2500);
  }

  // 5 Presets Canônicos Solicitados (Azul Tech, Verde, Roxo, Vermelho, Preto Luxo)
  const presets = BRANDING_PRESETS.map((p) => ({
    id: p.id,
    nome: p.name,
    cor: p.previewColors.secondary,
    preset: p,
  }));

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 font-sans pb-24">
      {/* 1. TOP BAR DA PLATAFORMA WHITE LABEL */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-800 text-slate-950 flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                PARTIU White Label Studio OS
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider bg-primary-600/20 text-primary-500 border border-primary-600/30 px-2 py-0.5 rounded-full">
                Enterprise v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Personalização visual, multi-negócio e governança de franquias em tempo real.
            </p>
          </div>
        </div>

        {/* CONTROLES DE TOPO: TENANT, PRESETS E EXPORT/IMPORT */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Franquia / Tenant */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-primary-600" />
            <span className="text-slate-400">Franquia:</span>
            <select
              value={activeTenant?.tenantId}
              onChange={(e) => switchTenant(e.target.value)}
              className="bg-transparent font-bold text-white focus:outline-hidden cursor-pointer"
            >
              {allTenants.map((t) => (
                <option key={t.tenantId} value={t.tenantId} className="bg-slate-900 text-white">
                  {t.cidadeNome} ({t.uf}) — {t.nomeOperacao}
                </option>
              ))}
            </select>
          </div>

          {/* Botão Clonar Cidade */}
          <button
            type="button"
            onClick={() => setModalClonarAberto(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-primary-600" />
            <span>Clonar Cidade</span>
          </button>

          {/* Exportar JSON */}
          <button
            type="button"
            onClick={() => {
              const json = exportThemeJson();
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `partiu-whitelabel-${activeTenant?.cidadeNome || "theme"}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Exportar Configuração em JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* Importar JSON */}
          <button
            type="button"
            onClick={() => {
              setImportErro(null);
              setImportJsonText("");
              setModalImportarAberto(true);
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Importar Configuração em JSON"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          {/* Reset Defaults */}
          <button
            type="button"
            onClick={() => {
              if (confirm("Deseja restaurar todas as configurações para o padrão canônico do PARTIU?")) {
                resetToDefaults();
                triggerSaveFeedback();
              }
            }}
            className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-xl transition cursor-pointer"
            title="Restaurar Padrão de Fábrica"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Alternar Preview Lateral */}
          <button
            type="button"
            onClick={() => setPreviewAberto(!previewAberto)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              previewAberto
                ? "bg-primary-600 text-slate-950 shadow-md"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{previewAberto ? "Ocultar Preview" : "Ver Simulador"}</span>
          </button>
        </div>
      </header>

      {/* 2. BARRA DE PRESETS RÁPIDOS DE MARCAS CONSAGRADAS */}
      <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
          Presets 1-Click:
        </span>
        <div className="flex items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={async () => {
                applyPreset(p.id);
                await applySaasPreset(p.id);
                triggerSaveFeedback();
              }}
              className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 transition cursor-pointer shrink-0"
            >
              <span
                className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: p.cor }}
              />
              <span>{p.nome}</span>
            </button>
          ))}
        </div>
        {salvoFeedback && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Aplicado e salvo em tempo real!</span>
          </div>
        )}
      </div>

      {/* 3. LAYOUT PRINCIPAL: STUDIO (ESQUERDA) + SIMULADOR LIVE PREVIEW (DIREITA) */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* COLUNA ESQUERDA: NAVEGAÇÃO POR ABAS + FORMULÁRIOS DO STUDIO */}
        <div className={`w-full ${previewAberto ? "lg:w-7/12 xl:w-2/3" : "w-full"} space-y-6`}>
          {/* NAVEGAÇÃO POR ABAS */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("brand")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "brand"
                  ? "bg-primary-600 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>1. Brand Center</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("design")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "design"
                  ? "bg-primary-600 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>2. Design System</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("typography")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "typography"
                  ? "bg-primary-600 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Type className="w-4 h-4" />
              <span>3. Tipografia</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "home"
                  ? "bg-primary-600 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Layout className="w-4 h-4" />
              <span>4. Home Builder</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("menu")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "menu"
                  ? "bg-primary-600 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>5. Menu Builder</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("business")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "business"
                  ? "bg-primary-600 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>6. Multi-Negócio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("monetization")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "monetization"
                  ? "bg-primary-600 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>7. Planos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("geo_app")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "geo_app"
                  ? "bg-primary-600 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>8. Geo &amp; App</span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: BRAND CENTER */}
          {/* ================================================================= */}
          {activeTab === "brand" && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl animate-in fade-in">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                  Módulo 1: Brand Center
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Nomes, slogans, logotipos SVG/PNG, favicons e informações institucionais sem mexer em código.
                </p>
              </div>

              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Nome da Plataforma
                  </label>
                  <input
                    type="text"
                    value={brand?.nomePlataforma || ""}
                    onChange={(e) => {
                      updateConfig({
                        brandCenter: { ...brand, nomePlataforma: e.target.value },
                      });
                      triggerSaveFeedback();
                    }}
                    placeholder="ex: PARTIU"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Slogan Principal
                  </label>
                  <input
                    type="text"
                    value={brand?.slogan || ""}
                    onChange={(e) => {
                      updateConfig({
                        brandCenter: { ...brand, slogan: e.target.value },
                      });
                      triggerSaveFeedback();
                    }}
                    placeholder="ex: Mobilidade inteligente para sua cidade"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Descrição Institucional
                </label>
                <textarea
                  rows={3}
                  value={brand?.descricaoInstitucional || ""}
                  onChange={(e) => {
                    updateConfig({
                      brandCenter: { ...brand, descricaoInstitucional: e.target.value },
                    });
                    triggerSaveFeedback();
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              {/* Logotipos */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary-600">
                  Logotipos &amp; Recursos de Mídia (Supabase Storage)
                </h3>

                {uploadError && (
                  <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Upload Cards com Preview ao Vivo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Upload Logo Principal */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center text-center space-y-3">
                    <span className="text-xs font-bold text-slate-300">Logo Principal</span>
                    <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-2 overflow-hidden">
                      {branding?.logo_url ? (
                        <img src={branding.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs text-slate-500 font-bold">Sem Logo</span>
                      )}
                    </div>
                    <label className="w-full cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/svg+xml,image/webp,image/jpeg"
                        className="hidden"
                        disabled={uploadingField === "logo"}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "logo");
                        }}
                      />
                      <span className="inline-flex items-center justify-center gap-1.5 w-full bg-primary-600 hover:bg-primary-500 text-slate-950 font-bold text-xs py-2 px-3 rounded-xl transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingField === "logo" ? "Enviando..." : "Upload Logo (<5MB)"}</span>
                      </span>
                    </label>
                  </div>

                  {/* Upload Splash Logo */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center text-center space-y-3">
                    <span className="text-xs font-bold text-slate-300">Logo Splash Screen</span>
                    <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-2 overflow-hidden">
                      {branding?.splash_logo_url ? (
                        <img src={branding.splash_logo_url} alt="Splash" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs text-slate-500 font-bold">Sem Splash</span>
                      )}
                    </div>
                    <label className="w-full cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/svg+xml,image/webp,image/jpeg"
                        className="hidden"
                        disabled={uploadingField === "splash"}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "splash");
                        }}
                      />
                      <span className="inline-flex items-center justify-center gap-1.5 w-full bg-primary-600 hover:bg-primary-500 text-slate-950 font-bold text-xs py-2 px-3 rounded-xl transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingField === "splash" ? "Enviando..." : "Upload Splash (<5MB)"}</span>
                      </span>
                    </label>
                  </div>

                  {/* Upload Favicon */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center text-center space-y-3">
                    <span className="text-xs font-bold text-slate-300">Favicon do Navegador</span>
                    <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-2 overflow-hidden">
                      {branding?.favicon_url ? (
                        <img src={branding.favicon_url} alt="Favicon" className="w-8 h-8 object-contain" />
                      ) : (
                        <span className="text-xs text-slate-500 font-bold">Sem Favicon</span>
                      )}
                    </div>
                    <label className="w-full cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/svg+xml,image/webp,image/x-icon"
                        className="hidden"
                        disabled={uploadingField === "favicon"}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "favicon");
                        }}
                      />
                      <span className="inline-flex items-center justify-center gap-1.5 w-full bg-primary-600 hover:bg-primary-500 text-slate-950 font-bold text-xs py-2 px-3 rounded-xl transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingField === "favicon" ? "Enviando..." : "Upload Favicon (<5MB)"}</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Logo Principal (URL direta)
                    </label>
                    <input
                      type="text"
                      value={brand?.logos?.logoPrincipalUrl || ""}
                      onChange={(e) => {
                        updateConfig({
                          brandCenter: {
                            ...brand,
                            logos: { ...brand.logos, logoPrincipalUrl: e.target.value },
                          },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Logo Reduzida / Ícone
                    </label>
                    <input
                      type="text"
                      value={brand?.logos?.logoReduzidaUrl || ""}
                      onChange={(e) => {
                        updateConfig({
                          brandCenter: {
                            ...brand,
                            logos: { ...brand.logos, logoReduzidaUrl: e.target.value },
                          },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Logo Versão Branca
                    </label>
                    <input
                      type="text"
                      value={brand?.logos?.logoBrancaUrl || ""}
                      onChange={(e) => {
                        updateConfig({
                          brandCenter: {
                            ...brand,
                            logos: { ...brand.logos, logoBrancaUrl: e.target.value },
                          },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Logo Versão Escura
                    </label>
                    <input
                      type="text"
                      value={brand?.logos?.logoEscuraUrl || ""}
                      onChange={(e) => {
                        updateConfig({
                          brandCenter: {
                            ...brand,
                            logos: { ...brand.logos, logoEscuraUrl: e.target.value },
                          },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Suporte e Contato */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary-600">
                  Canais de Atendimento ao Usuário
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      E-mail Oficial
                    </label>
                    <input
                      type="email"
                      value={brand?.emailContato || ""}
                      onChange={(e) => {
                        updateConfig({
                          brandCenter: { ...brand, emailContato: e.target.value },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Telefone / 0800
                    </label>
                    <input
                      type="text"
                      value={brand?.telefoneSuporte || ""}
                      onChange={(e) => {
                        updateConfig({
                          brandCenter: { ...brand, telefoneSuporte: e.target.value },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      WhatsApp de Suporte
                    </label>
                    <input
                      type="text"
                      value={brand?.whatsappSuporte || ""}
                      onChange={(e) => {
                        updateConfig({
                          brandCenter: { ...brand, whatsappSuporte: e.target.value },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: DESIGN SYSTEM & CORES */}
          {/* ================================================================= */}
          {activeTab === "design" && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl animate-in fade-in">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary-600" />
                  Módulo 2: Design System Manager
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Altere cores primárias, secundárias, semântica, raios e sombras aplicados via variáveis CSS no :root.
                </p>
              </div>

              {/* Paleta Primária */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary-600">
                  Paleta de Cores da Marca
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Cor Primária */}
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Cor Primária (Brand)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={designSystem?.paletaPrimaria?.corPrincipal || "#0088FF"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corPrincipal: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={designSystem?.paletaPrimaria?.corPrincipal || "#0088FF"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corPrincipal: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Cor Primária Hover */}
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Cor Primária (Hover / Active)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={designSystem?.paletaPrimaria?.corPrincipalHover || "#006ACC"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corPrincipalHover: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={designSystem?.paletaPrimaria?.corPrincipalHover || "#006ACC"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corPrincipalHover: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Cor Secundária */}
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Cor Secundária (Acentos)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={designSystem?.paletaPrimaria?.corSecundaria || "#00C6FF"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corSecundaria: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={designSystem?.paletaPrimaria?.corSecundaria || "#00C6FF"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corSecundaria: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Cor de Texto Principal */}
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Texto Sobre Primária
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={designSystem?.paletaPrimaria?.corTextoPrincipal || "#0F172A"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corTextoPrincipal: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={designSystem?.paletaPrimaria?.corTextoPrincipal || "#0F172A"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corTextoPrincipal: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Cor Fundo do App */}
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Fundo das Páginas
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={designSystem?.paletaPrimaria?.corFundoApp || "#F8FAFC"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corFundoApp: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={designSystem?.paletaPrimaria?.corFundoApp || "#F8FAFC"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corFundoApp: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Superfície Cards */}
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Superfície dos Cards
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={designSystem?.paletaPrimaria?.corSuperficieCard || "#FFFFFF"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corSuperficieCard: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={designSystem?.paletaPrimaria?.corSuperficieCard || "#FFFFFF"}
                        onChange={(e) => {
                          updateConfig({
                            designSystem: {
                              ...designSystem,
                              paletaPrimaria: {
                                ...designSystem.paletaPrimaria,
                                corSuperficieCard: e.target.value,
                              },
                            },
                          });
                          triggerSaveFeedback();
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Gradiente do Cabeçalho Padrão 99 (Início) */}
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Cabeçalho Curvo (Início Gradiente)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={branding?.header_gradient_start || "#0088FF"}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isSynced = branding?.footer_sync_with_header !== false;
                          updateBranding({
                            header_gradient_start: val,
                            ...(isSynced ? { footer_gradient_start: val } : {}),
                          });
                          triggerSaveFeedback();
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={branding?.header_gradient_start || "#0088FF"}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isSynced = branding?.footer_sync_with_header !== false;
                          updateBranding({
                            header_gradient_start: val,
                            ...(isSynced ? { footer_gradient_start: val } : {}),
                          });
                          triggerSaveFeedback();
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Gradiente do Cabeçalho Padrão 99 (Fim) */}
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Cabeçalho Curvo (Fim Gradiente)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={branding?.header_gradient_end || "#003366"}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isSynced = branding?.footer_sync_with_header !== false;
                          updateBranding({
                            header_gradient_end: val,
                            ...(isSynced ? { footer_gradient_end: val } : {}),
                          });
                          triggerSaveFeedback();
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={branding?.header_gradient_end || "#003366"}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isSynced = branding?.footer_sync_with_header !== false;
                          updateBranding({
                            header_gradient_end: val,
                            ...(isSynced ? { footer_gradient_end: val } : {}),
                          });
                          triggerSaveFeedback();
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* ============================================================= */}
                  {/* SINCRONIZAÇÃO E CUSTOMIZAÇÃO DO RODAPÉ (FOOTER BRANDING)      */}
                  {/* ============================================================= */}
                  <div className="col-span-full p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            Cor do Rodapé (Navegação Inferior)
                          </span>
                          {branding?.footer_sync_with_header !== false ? (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Link2 className="w-3 h-3" /> Sincronizado com Cabeçalho
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Unlink className="w-3 h-3" /> Customização Separada
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {branding?.footer_sync_with_header !== false
                            ? "Por padrão, o rodapé segue automaticamente as mesmas cores e degradê do cabeçalho em tempo real."
                            : "O rodapé está operando com cores personalizadas independentes do cabeçalho."}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const currentlySynced = branding?.footer_sync_with_header !== false;
                          if (currentlySynced) {
                            // Alternar para customização separada mantendo as cores atuais como ponto de partida
                            updateBranding({
                              footer_sync_with_header: false,
                              footer_gradient_start: branding?.footer_gradient_start || branding?.header_gradient_start || "#0088FF",
                              footer_gradient_end: branding?.footer_gradient_end || branding?.header_gradient_end || "#003366",
                            });
                          } else {
                            // Voltar a sincronizar com o cabeçalho
                            updateBranding({
                              footer_sync_with_header: true,
                              footer_gradient_start: branding?.header_gradient_start || "#0088FF",
                              footer_gradient_end: branding?.header_gradient_end || "#003366",
                            });
                          }
                          triggerSaveFeedback();
                        }}
                        className={`text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
                          branding?.footer_sync_with_header !== false
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                        }`}
                      >
                        {branding?.footer_sync_with_header !== false ? (
                          <>
                            <Sliders className="w-3.5 h-3.5 text-primary-400" />
                            <span>Customizar Rodapé Separadamente</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Sincronizar com Cabeçalho</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Controles de Cores Independentes para o Rodapé (quando desvinculado) */}
                    {branding?.footer_sync_with_header === false && (
                      <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-300 block">
                            Rodapé (Início Gradiente)
                          </label>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="color"
                              value={branding?.footer_gradient_start || branding?.header_gradient_start || "#0088FF"}
                              onChange={(e) => {
                                updateBranding({ footer_gradient_start: e.target.value });
                                triggerSaveFeedback();
                              }}
                              className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                            />
                            <input
                              type="text"
                              value={branding?.footer_gradient_start || branding?.header_gradient_start || "#0088FF"}
                              onChange={(e) => {
                                updateBranding({ footer_gradient_start: e.target.value });
                                triggerSaveFeedback();
                              }}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-300 block">
                            Rodapé (Fim Gradiente)
                          </label>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="color"
                              value={branding?.footer_gradient_end || branding?.header_gradient_end || "#003366"}
                              onChange={(e) => {
                                updateBranding({ footer_gradient_end: e.target.value });
                                triggerSaveFeedback();
                              }}
                              className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                            />
                            <input
                              type="text"
                              value={branding?.footer_gradient_end || branding?.header_gradient_end || "#003366"}
                              onChange={(e) => {
                                updateBranding({ footer_gradient_end: e.target.value });
                                triggerSaveFeedback();
                              }}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cor de Destaque / Acentos */}
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Cor de Destaque (Accent / Cyan)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={branding?.accent_color || "#00C6FF"}
                        onChange={(e) => {
                          updateBranding({ accent_color: e.target.value });
                          triggerSaveFeedback();
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={branding?.accent_color || "#00C6FF"}
                        onChange={(e) => {
                          updateBranding({ accent_color: e.target.value });
                          triggerSaveFeedback();
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Botão de Ação: Salvar e Sincronizar em Tempo Real no Supabase */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-slate-300 font-medium">
                      {isSyncing
                        ? "Sincronizando com Supabase..."
                        : lastSyncedAt
                        ? `Sincronizado às ${lastSyncedAt.toLocaleTimeString()}`
                        : "Conectado ao Supabase Realtime"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await updateBranding({
                        primary_color: designSystem?.paletaPrimaria?.corPrincipal || branding.primary_color,
                        secondary_color: designSystem?.paletaPrimaria?.corSecundaria || branding.secondary_color,
                        background_color: designSystem?.paletaPrimaria?.corFundoApp || branding.background_color,
                        surface_color: designSystem?.paletaPrimaria?.corSuperficieCard || branding.surface_color,
                        text_primary: designSystem?.paletaPrimaria?.corTextoPrincipal || branding.text_primary,
                        header_gradient_start: branding.header_gradient_start,
                        header_gradient_end: branding.header_gradient_end,
                        footer_sync_with_header: branding.footer_sync_with_header !== false,
                        footer_gradient_start: branding.footer_gradient_start || branding.header_gradient_start,
                        footer_gradient_end: branding.footer_gradient_end || branding.header_gradient_end,
                      });
                      triggerSaveFeedback();
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-slate-950 font-black text-xs py-2.5 px-5 rounded-xl shadow-lg transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar e Aplicar Imediatamente (Realtime)</span>
                  </button>
                </div>
              </div>

              {/* Raio das Bordas e Sombras */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Arredondamento das Bordas (Border Radius)
                  </label>
                  <select
                    value={designSystem?.raioBordas || "2xl"}
                    onChange={(e) => {
                      updateConfig({
                        designSystem: {
                          ...designSystem,
                          raioBordas: e.target.value as BorderRadiusOption,
                        },
                      });
                      triggerSaveFeedback();
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white cursor-pointer"
                  >
                    <option value="sm">sm (Pequeno - 4px)</option>
                    <option value="md">md (Médio - 8px)</option>
                    <option value="lg">lg (Grande - 12px)</option>
                    <option value="xl">xl (Extra Grande - 16px)</option>
                    <option value="2xl">2xl (Super Arredondado - 20px - Padrão)</option>
                    <option value="3xl">3xl (Ultra - 24px)</option>
                    <option value="full">full (Pílula Total)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Estilo de Sombra dos Cards
                  </label>
                  <select
                    value={designSystem?.sombraCards || "medium"}
                    onChange={(e) => {
                      updateConfig({
                        designSystem: {
                          ...designSystem,
                          sombraCards: e.target.value as ShadowOption,
                        },
                      });
                      triggerSaveFeedback();
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white cursor-pointer"
                  >
                    <option value="none">Nenhuma (Plano / Flat)</option>
                    <option value="light">Suave (Light)</option>
                    <option value="medium">Média (Padrão 99)</option>
                    <option value="strong">Marcante (Strong)</option>
                    <option value="elevated">Elevada (3D Float)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: TIPOGRAFIA */}
          {/* ================================================================= */}
          {activeTab === "typography" && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl animate-in fade-in">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Type className="w-5 h-5 text-primary-600" />
                  Módulo 3: Typography Center
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Selecione as fontes do Google Fonts, escala de títulos, entrelinha e pesos de botões.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Família da Fonte Principal
                  </label>
                  <select
                    value={typography?.familiaPrincipal || "Plus Jakarta Sans"}
                    onChange={(e) => {
                      updateConfig({
                        typography: {
                          ...typography,
                          familiaPrincipal: e.target.value as FontFamilyOption,
                        },
                      });
                      triggerSaveFeedback();
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white cursor-pointer"
                  >
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans (Padrão PARTIU)</option>
                    <option value="Inter">Inter (Estilo Uber)</option>
                    <option value="Poppins">Poppins (Geométrica e Moderna)</option>
                    <option value="Roboto">Roboto (Google Material)</option>
                    <option value="Montserrat">Montserrat (Impacto Comercial)</option>
                    <option value="Nunito">Nunito (Amigável e Arredondada)</option>
                    <option value="Open Sans">Open Sans (Alta Legibilidade)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Família para Títulos &amp; Números
                  </label>
                  <select
                    value={typography?.familiaTitulos || "Plus Jakarta Sans"}
                    onChange={(e) => {
                      updateConfig({
                        typography: {
                          ...typography,
                          familiaTitulos: e.target.value as FontFamilyOption,
                        },
                      });
                      triggerSaveFeedback();
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white cursor-pointer"
                  >
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="Inter">Inter</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Nunito">Nunito</option>
                    <option value="Open Sans">Open Sans</option>
                  </select>
                </div>
              </div>

              {/* Escala de Tamanhos */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary-600">
                  Escala Tipográfica (Valores em REM)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1 font-bold">Títulos</span>
                    <input
                      type="number"
                      step="0.05"
                      value={typography?.tamanhoTitulosRem || 1.5}
                      onChange={(e) => {
                        updateConfig({
                          typography: {
                            ...typography,
                            tamanhoTitulosRem: parseFloat(e.target.value) || 1.5,
                          },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1 font-bold">Subtítulos</span>
                    <input
                      type="number"
                      step="0.05"
                      value={typography?.tamanhoSubtitulosRem || 1.125}
                      onChange={(e) => {
                        updateConfig({
                          typography: {
                            ...typography,
                            tamanhoSubtitulosRem: parseFloat(e.target.value) || 1.125,
                          },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1 font-bold">Corpo / Base</span>
                    <input
                      type="number"
                      step="0.05"
                      value={typography?.tamanhoTextoBaseRem || 0.875}
                      onChange={(e) => {
                        updateConfig({
                          typography: {
                            ...typography,
                            tamanhoTextoBaseRem: parseFloat(e.target.value) || 0.875,
                          },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-1 font-bold">Botões</span>
                    <input
                      type="number"
                      step="0.05"
                      value={typography?.tamanhoBotoesRem || 0.875}
                      onChange={(e) => {
                        updateConfig({
                          typography: {
                            ...typography,
                            tamanhoBotoesRem: parseFloat(e.target.value) || 0.875,
                          },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: HOME BUILDER */}
          {/* ================================================================= */}
          {activeTab === "home" && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl animate-in fade-in">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Layout className="w-5 h-5 text-primary-600" />
                  Módulo 4: Home Page Builder
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ordene blocos, ative/desative componentes e configure a experiência da tela inicial.
                </p>
              </div>

              {/* Lista de Blocos Reordenáveis */}
              <div className="space-y-2.5">
                {homePage?.blocos
                  ?.sort((a, b) => a.ordem - b.ordem)
                  ?.map((bloco, idx, arr) => (
                    <div
                      key={bloco.id}
                      className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-2xl gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono font-bold flex items-center justify-center">
                          {bloco.ordem}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {bloco.titulo}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Tipo: {bloco.tipo}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle Ativo */}
                        <button
                          type="button"
                          onClick={() => {
                            const updatedBlocos = homePage.blocos.map((b) =>
                              b.id === bloco.id ? { ...b, ativo: !b.ativo } : b
                            );
                            reorderHomeBlocks(updatedBlocos);
                            triggerSaveFeedback();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            bloco.ativo
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {bloco.ativo ? "Visível" : "Oculto"}
                        </button>

                        {/* Mover para Cima */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            if (idx > 0) {
                              const newArr = [...arr];
                              const prev = newArr[idx - 1];
                              const curr = newArr[idx];
                              if (prev && curr) {
                                const temp = prev.ordem;
                                prev.ordem = curr.ordem;
                                curr.ordem = temp;
                                reorderHomeBlocks(newArr);
                                triggerSaveFeedback();
                              }
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 cursor-pointer"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Mover para Baixo */}
                        <button
                          type="button"
                          disabled={idx === arr.length - 1}
                          onClick={() => {
                            if (idx < arr.length - 1) {
                              const newArr = [...arr];
                              const next = newArr[idx + 1];
                              const curr = newArr[idx];
                              if (next && curr) {
                                const temp = next.ordem;
                                next.ordem = curr.ordem;
                                curr.ordem = temp;
                                reorderHomeBlocks(newArr);
                                triggerSaveFeedback();
                              }
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 cursor-pointer"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: MENU BUILDER */}
          {/* ================================================================= */}
          {activeTab === "menu" && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl animate-in fade-in">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-primary-600" />
                  Módulo 5: Menu &amp; Navigation Builder
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Adicione, renomeie ou ordene itens no Menu Drawer lateral e abas da barra de navegação inferior.
                </p>
              </div>

              {/* Itens do Drawer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary-600">
                    Itens do Menu Drawer Lateral
                  </h3>
                </div>

                <div className="space-y-2">
                  {menuBuilder?.itensDrawer?.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white">{item.rotulo}</span>
                        <span className="text-slate-400 font-mono">{item.rota}</span>
                        {item.badge && (
                          <span className="bg-primary-600/20 text-primary-500 px-2 py-0.5 rounded text-[10px] font-bold">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = menuBuilder.itensDrawer.map((i) =>
                              i.id === item.id ? { ...i, visivel: !i.visivel } : i
                            );
                            updateConfig({
                              menuBuilder: { ...menuBuilder, itensDrawer: updated },
                            });
                            triggerSaveFeedback();
                          }}
                          className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                            item.visivel
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {item.visivel ? "Ativo" : "Inativo"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 6: BUSINESS MODEL ENGINE (MULTI-NEGÓCIO) */}
          {/* ================================================================= */}
          {activeTab === "business" && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl animate-in fade-in">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary-600" />
                  Módulo 6: Business Model Engine (Multi-Negócio)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ative ou desative as 11 verticais operacionais da sua plataforma, configure tarifas base e comissões.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {businessModels?.verticais &&
                  Object.values(businessModels.verticais).map((v) => (
                    <div
                      key={v.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        v.ativo
                          ? "bg-slate-900 border-primary-600/40 shadow-sm"
                          : "bg-slate-900/40 border-slate-800 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 text-primary-600 flex items-center justify-center font-bold text-xs">
                            {v.icone}
                          </div>
                          <div>
                            <span className="text-xs font-black text-white block">
                              {v.nomeExibicao}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {v.descricao}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            toggleBusinessModel(v.id, !v.ativo);
                            triggerSaveFeedback();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            v.ativo
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {v.ativo ? "Habilitado" : "Desabilitado"}
                        </button>
                      </div>

                      {/* Tarifa Base e Comissão */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-400 block font-medium">Tarifa Base</span>
                          <span className="font-bold text-white font-mono">
                            R$ {v.tarifaBaseBrl.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Comissão Padrão</span>
                          <span className="font-bold text-primary-600 font-mono">
                            {v.comissaoPadraoPercentual}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 7: PLANOS & MONETIZAÇÃO */}
          {/* ================================================================= */}
          {activeTab === "monetization" && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl animate-in fade-in">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary-600" />
                  Módulo 7: Planos &amp; Monetização
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Gerencie os planos dos motoristas parceiros (Bronze, Prata, Ouro, etc.) e regras financeiras.
                </p>
              </div>

              <div className="space-y-4">
                {monetization?.planos?.map((plano) => (
                  <div
                    key={plano.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-white">{plano.nome}</span>
                        <span
                          style={{ backgroundColor: plano.badgeCor }}
                          className="text-slate-950 px-2 py-0.5 rounded text-[10px] font-black"
                        >
                          {plano.comissaoPercentual === 0 ? "Taxa Zero" : `${plano.comissaoPercentual}%`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{plano.descricao}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Mensalidade</span>
                        <span className="font-bold text-emerald-400">
                          R$ {plano.mensalidadeBrl.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Diária</span>
                        <span className="font-bold text-white">
                          R$ {plano.diariaBrl.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Despacho VIP</span>
                        <span className="font-bold text-primary-600">
                          {plano.pesoDespacho}x
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 8: GEO & APP */}
          {/* ================================================================= */}
          {activeTab === "geo_app" && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl animate-in fade-in">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary-600" />
                  Módulo 8: Geo Configuration &amp; App Center
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Cidade sede, moeda, fuso horário, pacotes nativos Android/iOS e links legais de LGPD.
                </p>
              </div>

              {/* Geo Config */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Cidade Sede
                  </label>
                  <input
                    type="text"
                    value={geo?.cidadeSede || ""}
                    onChange={(e) => {
                      updateConfig({
                        geo: { ...geo, cidadeSede: e.target.value },
                      });
                      triggerSaveFeedback();
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={geo?.estadoUf || ""}
                    onChange={(e) => {
                      updateConfig({
                        geo: { ...geo, estadoUf: e.target.value },
                      });
                      triggerSaveFeedback();
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Moeda Simbolo &amp; Código
                  </label>
                  <input
                    type="text"
                    value={`${geo?.moedaSimbolo || "R$"} (${geo?.moedaCodigo || "BRL"})`}
                    disabled
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400"
                  />
                </div>
              </div>

              {/* App Nativo */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary-600">
                  Identificadores de Publicação (Lojas)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Package Android (Google Play)
                    </label>
                    <input
                      type="text"
                      value={appConfig?.pacoteAndroid || ""}
                      onChange={(e) => {
                        updateConfig({
                          nativeApp: { ...appConfig, pacoteAndroid: e.target.value },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Bundle Identifier (Apple iOS)
                    </label>
                    <input
                      type="text"
                      value={appConfig?.bundleIos || ""}
                      onChange={(e) => {
                        updateConfig({
                          nativeApp: { ...appConfig, bundleIos: e.target.value },
                        });
                        triggerSaveFeedback();
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* COLUNA DIREITA: LIVE DEVICE PREVIEW (SIMULADOR RESPONSIVO) */}
        {/* =================================================================== */}
        {previewAberto && (
          <aside className="w-full lg:w-5/12 xl:w-1/3 sticky top-20 z-30">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-4">
              {/* Controles do Simulador */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <SmartphoneNfc className="w-4 h-4 text-primary-600" />
                  <span className="text-xs font-black text-white">Live Device Preview</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("MOBILE")}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      previewDevice === "MOBILE"
                        ? "bg-primary-600 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Simular Mobile (390px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewDevice("TABLET")}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      previewDevice === "TABLET"
                        ? "bg-primary-600 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Simular Tablet (768px)"
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewDevice("DESKTOP")}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      previewDevice === "DESKTOP"
                        ? "bg-primary-600 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Simular Desktop"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* MOLDURA DO DISPOSITIVO */}
              <div className="w-full flex justify-center py-2">
                <div
                  style={{
                    width:
                      previewDevice === "MOBILE"
                        ? "360px"
                        : previewDevice === "TABLET"
                        ? "440px"
                        : "100%",
                    fontFamily: typography?.familiaPrincipal || "Plus Jakarta Sans",
                  }}
                  className="rounded-[36px] border-4 border-slate-800 bg-white text-slate-900 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 min-h-[580px]"
                >
                  {/* Status bar simulada */}
                  <div className="bg-slate-950 text-white px-5 py-2 text-[11px] font-bold flex items-center justify-between">
                    <span>9:41</span>
                    <div className="w-16 h-3.5 bg-slate-800 rounded-full mx-auto" />
                    <span>5G 100%</span>
                  </div>

                  {/* Header do App Simulado com Curvatura em Arco Padrão 99 */}
                  <div className="relative w-full h-[74px] overflow-visible bg-slate-100">
                    <svg
                      className="absolute top-0 left-0 w-full h-[74px] pointer-events-auto overflow-visible"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      style={{
                        filter: "drop-shadow(0 6px 12px rgba(0, 51, 102, 0.35))",
                      }}
                    >
                      <defs>
                        <linearGradient id="simHeaderGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={branding?.header_gradient_start || "#0088FF"} />
                          <stop offset="100%" stopColor={branding?.header_gradient_end || "#003366"} />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0,0 L 100,0 L 100,54 C 74,98 26,98 0,54 Z"
                        fill="url(#simHeaderGradient)"
                      />
                    </svg>
                    <div className="relative z-10 px-4 pt-2.5 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/20 ring-2 ring-white/80 overflow-hidden flex items-center justify-center font-black text-[10px]">
                          {branding?.logo_url ? (
                            <img src={branding.logo_url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            branding?.app_name?.slice(0, 2) || "PA"
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/80">
                            {branding?.app_name || "PARTIU"}
                          </span>
                          <span className="text-xs font-bold truncate">Olá, Passageiro! 👋</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                        {geo?.cidadeSede || "Itaperuna"}
                      </span>
                    </div>
                  </div>

                  {/* Conteúdo Simulado (Home Blocks) */}
                  <div className="flex-1 p-3.5 space-y-3 bg-slate-50 overflow-y-auto max-h-[420px]">
                    {/* Mapa Preview */}
                    <div className="h-28 rounded-2xl bg-slate-200 border border-slate-300 relative overflow-hidden flex items-center justify-center shadow-xs">
                      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px] opacity-70" />
                      <div className="relative z-10 text-center">
                        <span className="text-[11px] font-bold text-slate-600 block">
                          📍 {geo?.cidadeSede || "Itaperuna, RJ"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Radar em tempo real ativo
                        </span>
                      </div>
                    </div>

                    {/* Card de Busca */}
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-slate-700">Para onde vamos hoje?</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-xl px-3 py-2 text-xs text-slate-400">
                        Digite seu endereço de destino...
                      </div>
                    </div>

                    {/* Verticais Rápidas */}
                    <div className="grid grid-cols-4 gap-2">
                      {businessModels?.verticais &&
                        Object.values(businessModels.verticais)
                          .filter((v) => v.ativo)
                          .slice(0, 4)
                          .map((v) => (
                            <div
                              key={v.id}
                              className="p-2 bg-white rounded-xl border border-slate-200 text-center shadow-2xs"
                            >
                              <span className="text-xs font-bold text-slate-800 block truncate">
                                {v.nomeExibicao}
                              </span>
                              <span className="text-[9px] text-primary-700 font-bold block">
                                R$ {v.tarifaBaseBrl.toFixed(0)}
                              </span>
                            </div>
                          ))}
                    </div>

                    {/* Banner Simulado */}
                    <div
                      style={{
                        backgroundColor: designSystem?.paletaPrimaria?.corSecundaria || "#00C6FF",
                      }}
                      className="p-3 rounded-2xl text-white shadow-xs"
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">
                        {brand?.slogan || "Mobilidade Inteligente"}
                      </span>
                      <span className="text-xs font-bold">
                        Taxa Zero para motoristas no Plano Ouro!
                      </span>
                    </div>
                  </div>

                  {/* Barra de Navegação Inferior Simulada (Sincronizada por Padrão ou Customizada) */}
                  {(() => {
                    const isSynced = branding?.footer_sync_with_header !== false;
                    const fStart = isSynced
                      ? (branding?.header_gradient_start || "#0088FF")
                      : (branding?.footer_gradient_start || branding?.header_gradient_start || "#0088FF");
                    const fEnd = isSynced
                      ? (branding?.header_gradient_end || "#003366")
                      : (branding?.footer_gradient_end || branding?.header_gradient_end || "#003366");

                    return (
                      <div
                        style={{
                          background: `linear-gradient(180deg, ${fStart} 0%, ${fEnd} 100%)`,
                          borderTopLeftRadius: "18px",
                          borderTopRightRadius: "18px",
                          boxShadow: "0 -4px 18px rgba(0, 51, 102, 0.35)",
                        }}
                        className="border-t border-white/20 px-4 py-2.5 flex items-center justify-around"
                      >
                        <div
                          style={{
                            backgroundColor: "#FFFFFF",
                            color: fEnd,
                          }}
                          className="px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm"
                        >
                          <Car className="w-3.5 h-3.5" />
                          <span>Corridas</span>
                        </div>

                        <div className="px-3 py-1 text-xs font-bold text-white/80 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" />
                          <span>Entregas</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* MODAL CLONAR FRANQUIA */}
      {modalClonarAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Copy className="w-5 h-5 text-primary-600" />
              Clonar Franquia com 1-Click
            </h3>
            <p className="text-xs text-slate-400">
              Duplica 100% da configuração visual, comercial e operacional para uma nova cidade.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Nome da Nova Cidade</label>
                <input
                  type="text"
                  placeholder="ex: Campos dos Goytacazes"
                  value={cloneCidadeNome}
                  onChange={(e) => {
                    setCloneCidadeNome(e.target.value);
                    setCloneTenantId(
                      `tenant-${e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
                    );
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Estado (UF)</label>
                <input
                  type="text"
                  placeholder="ex: RJ"
                  value={cloneEstadoUf}
                  onChange={(e) => setCloneEstadoUf(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">ID da Franquia (Slug)</label>
                <input
                  type="text"
                  placeholder="ex: tenant-campos"
                  value={cloneTenantId}
                  onChange={(e) => setCloneTenantId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalClonarAberto(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!cloneCidadeNome || !cloneTenantId}
                onClick={() => {
                  cloneTenant(cloneTenantId, cloneCidadeNome, cloneEstadoUf);
                  switchTenant(cloneTenantId);
                  setModalClonarAberto(false);
                  triggerSaveFeedback();
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-primary-600 hover:bg-amber-300 text-slate-950 disabled:opacity-40 cursor-pointer shadow-md"
              >
                Criar e Ativar Franquia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR JSON */}
      {modalImportarAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary-600" />
              Importar Configuração JSON White Label
            </h3>
            <p className="text-xs text-slate-400">
              Cole abaixo o payload JSON completo exportado previamente de outra franquia ou ambiente.
            </p>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='{ "versaoSchema": 1, "brandCenter": { ... } }'
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono"
            />

            {importErro && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{importErro}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalImportarAberto(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!importJsonText.trim()}
                onClick={() => {
                  const res = importThemeJson(importJsonText);
                  if (res.success) {
                    setModalImportarAberto(false);
                    triggerSaveFeedback();
                  } else {
                    setImportErro(res.error || "Erro ao importar JSON.");
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-primary-600 hover:bg-amber-300 text-slate-950 disabled:opacity-40 cursor-pointer shadow-md"
              >
                Validar e Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
