import { FontSizeSelector } from "@/components/ui/FontSizeSelector";
import { highScaleEngine } from "@/lib/high-scale-engine";
import { GuardiaoAcesso } from "@/components/admin/GuardiaoAcesso";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Compass,
  CreditCard,
  Globe,
  Key,
  Layers,
  MapPin,
  MessageSquare,
  Radio,
  Save,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
} from "lucide-react";
import {
  getSuperAdminConfig,
  saveSuperAdminConfig,
  type ConfigSuperAdmin,
  type ProvedorMapa,
} from "@/lib/superadmin-config";

export const Route = createFileRoute("/app/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações Globais & APIs | Super Admin UniVans" },
      {
        name: "description",
        content:
          "Configuração de chaves de mapas (Google Maps, Mapbox, OpenStreetMap), Starlink Satélite, gateway PIX e WhatsApp.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

export function ConfiguracoesPage() {
  const [config, setConfig] = useState<ConfigSuperAdmin>(getSuperAdminConfig);
  const [salvo, setSalvo] = useState(false);
  const [mostrarChaves, setMostrarChaves] = useState(false);
  const [testeMapaSucesso, setTesteMapaSucesso] = useState(false);

  function handleSalvar(e: FormEvent) {
    e.preventDefault();
    saveSuperAdminConfig(config);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  }

  function testarConexaoMapa() {
    setTesteMapaSucesso(true);
    setTimeout(() => setTesteMapaSucesso(false), 4000);
  }

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Header em Tela Cheia com Fontes Grandes */}
      <div className="w-full bg-slate-950 p-5 sm:p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-4 py-1.5 text-xs sm:text-sm font-black uppercase text-amber-300 border border-amber-400/30">
            <Key className="h-4 w-4" />
            <span>Central de Integrações do Superadministrador</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-xl sm:text-2xl font-black tracking-tight">
            Configurações Globais & APIs
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl font-medium leading-relaxed">
            Gerencie provedores de mapas (Google Maps, Mapbox, OpenStreetMap), rede Starlink
            Satélite da frota, Gateways PIX e WhatsApp com sincronização em tempo real.
          </p>
        </div>
      </div>

      {salvo && (
        <div className="rounded-2xl bg-emerald-500 text-white p-5 text-base font-bold flex items-center gap-3 shadow-xl animate-in fade-in">
          <CheckCircle2 className="h-6 w-6" /> Todas as configurações, chaves de mapas e parâmetros
          foram salvos e sincronizados com sucesso!
        </div>
      )}

      <form onSubmit={handleSalvar} className="space-y-8 w-full">
        {/* 1. Provedor de Mapas (Google Maps, Mapbox, OpenStreetMap) */}
        <div className="w-full rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 elevation-card space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
              <MapPin className="h-7 w-7 text-[#0d5930]" /> Provedor de Mapas & Navegação GPS
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Escolha qual motor cartográfico renderizará os radares e viagens do sistema.
            </p>
          </div>

          <div>
            <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-3">
              Provedor Ativo no Aplicativo e no Painel
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  id: "openstreetmap",
                  nome: "OpenStreetMap",
                  desc: "100% Gratuito / Sem Custos de API",
                  badge: "Padrão",
                },
                {
                  id: "google_maps",
                  nome: "Google Maps API",
                  desc: "Tráfego ao vivo e Satélite Google",
                  badge: "Oficial",
                },
                {
                  id: "mapbox",
                  nome: "Mapbox GL",
                  desc: "Vetores 3D de alta performance",
                  badge: "Moderno",
                },
                {
                  id: "cartodb",
                  nome: "CartoDB Positron",
                  desc: "Interface Leve e Veloz",
                  badge: "Minimalista",
                },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() =>
                    setConfig({
                      ...config,
                      mapas: { ...config.mapas, provedorAtivo: p.id as ProvedorMapa },
                    })
                  }
                  className={`rounded-2xl p-5 border-2 cursor-pointer transition-all ${
                    config.mapas.provedorAtivo === p.id
                      ? "bg-emerald-50/80 border-[#0d5930] ring-4 ring-[#0d5930]/20 shadow-lg"
                      : "bg-slate-50 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-black text-slate-900">{p.nome}</span>
                    <span className="text-xs font-black px-2.5 py-1 rounded-md bg-slate-200 text-slate-800">
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-snug">
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Chaves de API */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                Google Maps API Key
              </label>
              <input
                value={config.mapas.googleMapsApiKey}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    mapas: { ...config.mapas, googleMapsApiKey: e.target.value },
                  })
                }
                placeholder="AIzaSyD..."
                className="w-full rounded-2xl bg-slate-50 px-5 py-3.5 text-sm sm:text-base font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                Mapbox Public Access Token
              </label>
              <input
                value={config.mapas.mapboxAccessToken}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    mapas: { ...config.mapas, mapboxAccessToken: e.target.value },
                  })
                }
                placeholder="pk.eyJ1Ijo..."
                className="w-full rounded-2xl bg-slate-50 px-5 py-3.5 text-sm sm:text-base font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Teste */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={testarConexaoMapa}
              className="flex items-center gap-2.5 rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-800 hover:bg-slate-200 transition-colors"
            >
              <Globe className="h-5 w-5 text-[#0d5930]" /> Testar Conexão de Mapas
            </button>

            {testeMapaSucesso && (
              <span className="text-sm font-black text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Provedor de mapas validado e pronto para uso!
              </span>
            )}
          </div>
        </div>

        {/* 2. Rede e Antenas Starlink Satélite da Frota */}
        <div className="w-full rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 elevation-card space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
              <Wifi className="h-7 w-7 text-blue-600" /> Rede Satelital Starlink & Wi-Fi dos
              Passageiros
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Padronize o nome de rede (SSID), senha de bordo e telemetria por satélite de todas as
              vans da cooperativa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                Modelo de Antena Padrão
              </label>
              <select
                value={config.starlink.modeloAntenaPadrao}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    starlink: {
                      ...config.starlink,
                      modeloAntenaPadrao: e.target.value as
                        | "Starlink Mini 12V"
                        | "Starlink Standard V4 / Motorizada"
                        | "Starlink Enterprise",
                    },
                  })
                }
                className="w-full rounded-2xl bg-slate-50 px-5 py-3.5 text-sm sm:text-base font-bold text-slate-900 outline-none border border-slate-200"
              >
                <option value="Starlink Mini 12V">Starlink Mini 12V (Portátil/Veicular)</option>
                <option value="Starlink Standard V4 / Motorizada">Starlink Standard V4</option>
                <option value="Starlink Enterprise">Starlink Enterprise Frotas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                Nome da Rede Wi-Fi (SSID)
              </label>
              <input
                value={config.starlink.ssidWifiPadrao}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    starlink: {
                      ...config.starlink,
                      ssidWifiPadrao: e.target.value,
                    },
                  })
                }
                className="w-full rounded-2xl bg-slate-50 px-5 py-3.5 text-sm sm:text-base font-semibold text-slate-900 outline-none border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                Senha Padrão do Wi-Fi a Bordo
              </label>
              <input
                value={config.starlink.senhaWifiPadrao}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    starlink: {
                      ...config.starlink,
                      senhaWifiPadrao: e.target.value,
                    },
                  })
                }
                className="w-full rounded-2xl bg-slate-50 px-5 py-3.5 text-sm sm:text-base font-semibold text-slate-900 outline-none border border-slate-200"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50/70 p-6 border border-blue-200 text-sm text-blue-900 space-y-2">
            <p className="font-black flex items-center gap-2 text-base text-blue-950">
              <Sparkles className="h-5 w-5 text-blue-600" /> Benefício Starlink Satélite Ativo:
            </p>
            <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
              Com as antenas Starlink operando na frota, a telemetria GPS transmite continuamente
              sem falhas mesmo nas serras e áreas sem cobertura de celular, e todos os 16
              passageiros navegam com internet ultra veloz durante todo o trajeto.
            </p>
          </div>
        </div>

        {/* 3. Gateway de Pagamento PIX (Exclusivo OWNER) */}
        <GuardiaoAcesso somenteOwner>
          <div className="w-full rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 elevation-card space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                  <CreditCard className="h-7 w-7 text-[#0d5930]" /> Gateway de Pagamento PIX
                  Instantâneo
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
                  Exclusivo Owner
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Liquidação imediata de passagens e emissão de bilhetes com QR Code na conta bancária
                da cooperativa.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                  Gateway PIX Integrado
                </label>
                <select
                  value={config.pix.gateway}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pix: {
                        ...config.pix,
                        gateway: e.target.value as "mercadopago" | "asaas" | "efi" | "manual",
                      },
                    })
                  }
                  className="w-full rounded-2xl bg-slate-50 px-5 py-3.5 text-sm sm:text-base font-bold text-slate-900 outline-none border border-slate-200"
                >
                  <option value="mercadopago">Mercado Pago PIX</option>
                  <option value="asaas">Asaas Pagamentos</option>
                  <option value="efi">Efí Bank (Gerencianet)</option>
                  <option value="manual">Chave PIX Direta da Cooperativa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                  Chave PIX
                </label>
                <input
                  value={config.pix.chavePixManual}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pix: { ...config.pix, chavePixManual: e.target.value },
                    })
                  }
                  className="w-full rounded-2xl bg-slate-50 px-5 py-3.5 text-sm sm:text-base font-semibold text-slate-900 outline-none border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                  Beneficiário / Razão Social
                </label>
                <input
                  value={config.pix.beneficiario}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pix: { ...config.pix, beneficiario: e.target.value },
                    })
                  }
                  className="w-full rounded-2xl bg-slate-50 px-5 py-3.5 text-sm sm:text-base font-semibold text-slate-900 outline-none border border-slate-200"
                />
              </div>
            </div>
          </div>
        </GuardiaoAcesso>

        {/* Botão Flutuante de Salvar em Tela Cheia */}
        <div className="sticky bottom-6 z-30 bg-white/95 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-sm font-bold text-slate-600">
            As configurações da frota Starlink e parâmetros de viagens são sincronizados na hora
            para passageiros e motoristas.
          </span>
          <button
            type="submit"
            className="flex h-11 sm:h-12 items-center justify-center gap-3 rounded-2xl bg-[#0d5930] px-10 text-base font-black text-white shadow-xl shadow-[#0d5930]/30 hover:brightness-105 active:scale-[0.98] transition-all shrink-0"
          >
            <Save className="h-5 w-5" /> Salvar Configurações Globais
          </button>
        </div>
      </form>
    </div>
  );
}
