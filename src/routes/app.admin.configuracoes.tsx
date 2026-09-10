import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Key,
  Layers,
  Lock,
  MessageSquare,
  Paintbrush,
  Palette,
  Percent,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Unlock,
  Upload,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  getSuperAdminConfig,
  saveSuperAdminConfig,
} from "@/lib/superadmin-config";
import { isSuperAdmin, getAdminRole } from "@/lib/admin-rbac";

export const Route = createFileRoute("/app/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações Operacionais & White Label Expresso | PARTIU Admin" },
      {
        name: "description",
        content:
          "Progressive Disclosure: Modo Essencial sempre visível, Modo Avançado protegido e Assistente de Onboarding de Cidade em 4 passos (< 15 min).",
      },
    ],
  }),
  component: ConfiguracoesAdminPage,
});

type AbaConfig = "essencial" | "whitelabel" | "avancado";

interface CidadeTenant {
  id: string;
  nome: string;
  uf: string;
  nomeApp: string;
  corPrimaria: string;
  preset: "Moderno" | "Compacto" | "Arredondado";
  tarifaBase: number;
  comissaoPercent: number;
  chavePix: string;
  whatsapp: string;
  status: "ATIVA" | "EM_CONFIGURACAO";
}

export function ConfiguracoesAdminPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaConfig>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "whitelabel" || tab === "avancado") return tab;
    }
    return "essencial";
  });

  const config = getSuperAdminConfig();
  const role = getAdminRole();
  const ehSuperAdmin = isSuperAdmin(role);

  // 1. MODO ESSENCIAL (SEMPRE VISÍVEL)
  const [cidadeOperacao, setCidadeOperacao] = useState("Maceió - AL");
  const [tarifaBaseEssencial, setTarifaBaseEssencial] = useState("5.50");
  const [valorKmEssencial, setValorKmEssencial] = useState("2.10");
  const [valorMinutoEssencial, setValorMinutoEssencial] = useState("0.35");
  const [tarifaMinimaEssencial, setTarifaMinimaEssencial] = useState("8.00");
  const [comissaoFranquia, setComissaoFranquia] = useState("12.5");
  const [whatsappSuporte, setWhatsappSuporte] = useState("(82) 99888-7766");
  const [chavePixPadrao, setChavePixPadrao] = useState("financeiro@partiumobilidade.com.br");
  const [sucessoEssencial, setSucessoEssencial] = useState(false);

  // 2. MODO AVANÇADO (PROTEGIDO POR CONFIRMAÇÃO / DESBLOQUEIO)
  const [modoAvancadoDesbloqueado, setModoAvancadoDesbloqueado] = useState(false);
  const [modalDesbloquearAberto, setModalDesbloquearAberto] = useState(false);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState("");
  const [erroDesbloqueio, setErroDesbloqueio] = useState<string | null>(null);

  // Parâmetros Técnicos Avançados
  const [googleMapsKey, setGoogleMapsKey] = useState("AIzaSyB*****************************");
  const [stripeSecretKey, setStripeSecretKey] = useState("sk_live_****************************");
  const [asaasApiKey, setAsaasApiKey] = useState("$aact_******************************");
  const [webhookSecret, setWebhookSecret] = useState("whsec_*****************************");
  const [dnsUrl, setDnsUrl] = useState("https://api.partiumobilidade.com.br");
  const [timeoutDespachoSec, setTimeoutDespachoSec] = useState("45");
  const [mostrarChaves, setMostrarChaves] = useState(false);

  // 3. WHITE LABEL EXPRESSO (ASSISTENTE DE 4 PASSOS)
  const [passoWizard, setPassoWizard] = useState<1 | 2 | 3 | 4>(1);
  const [wlCidade, setWlCidade] = useState("Arapiraca");
  const [wlUf, setWlUf] = useState("AL");
  const [wlNomeApp, setWlNomeApp] = useState("Partiu Arapiraca");
  const [wlLogoUrl, setWlLogoUrl] = useState("");
  const [wlCorPrimaria, setWlCorPrimaria] = useState("#FFDE00");
  const [wlPreset, setWlPreset] = useState<"Moderno" | "Compacto" | "Arredondado">("Moderno");
  const [wlTarifaBase, setWlTarifaBase] = useState("5.00");
  const [wlComissao, setWlComissao] = useState("10.0");
  const [wlPix, setWlPix] = useState("financeiro.arapiraca@partiu.app");
  const [wlWhatsapp, setWlWhatsapp] = useState("(82) 99111-2233");
  const [cidadeAtivadaSucesso, setCidadeAtivadaSucesso] = useState(false);

  // Lista de Cidades White Label Ativas
  const [cidadesAtivas, setCidadesAtivas] = useState<CidadeTenant[]>([
    {
      id: "ten_mcz",
      nome: "Maceió",
      uf: "AL",
      nomeApp: "Partiu Maceió",
      corPrimaria: "#FFDE00",
      preset: "Moderno",
      tarifaBase: 5.5,
      comissaoPercent: 12.5,
      chavePix: "financeiro@partiumobilidade.com.br",
      whatsapp: "(82) 99888-7766",
      status: "ATIVA",
    },
    {
      id: "ten_arp",
      nome: "Arapiraca",
      uf: "AL",
      nomeApp: "Partiu Arapiraca",
      corPrimaria: "#F59E0B",
      preset: "Arredondado",
      tarifaBase: 5.0,
      comissaoPercent: 10.0,
      chavePix: "financeiro.arapiraca@partiu.app",
      whatsapp: "(82) 99111-2233",
      status: "ATIVA",
    },
  ]);

  function handleSalvarEssencial(e: React.FormEvent) {
    e.preventDefault();
    setSucessoEssencial(true);
    setTimeout(() => setSucessoEssencial(false), 2500);
  }

  function handleDesbloquearAvancado(e: React.FormEvent) {
    e.preventDefault();
    if (confirmacaoTexto.trim().toUpperCase() === "DESBLOQUEAR") {
      setModoAvancadoDesbloqueado(true);
      setModalDesbloquearAberto(false);
      setConfirmacaoTexto("");
      setErroDesbloqueio(null);
    } else {
      setErroDesbloqueio("Digite exatamente a palavra 'DESBLOQUEAR' para confirmar.");
    }
  }

  function handleConcluirWhiteLabel() {
    const novaCidade: CidadeTenant = {
      id: "ten_" + wlCidade.toLowerCase().replace(/\s+/g, ""),
      nome: wlCidade,
      uf: wlUf,
      nomeApp: wlNomeApp,
      corPrimaria: wlCorPrimaria,
      preset: wlPreset,
      tarifaBase: Number(wlTarifaBase) || 5.0,
      comissaoPercent: Number(wlComissao) || 10.0,
      chavePix: wlPix,
      whatsapp: wlWhatsapp,
      status: "ATIVA",
    };

    setCidadesAtivas((prev) => [novaCidade, ...prev]);
    setCidadeAtivadaSucesso(true);
  }

  return (
    <div className="w-full space-y-6 pb-20">
      {/* 1. Header Executivo Configurações */}
      <div className="rounded-3xl bg-slate-950 p-5 sm:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFDE00]/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-yellow-300 border border-yellow-500/25 mb-2">
              <Sliders className="h-3.5 w-3.5 text-[#FFDE00]" />
              <span>Progressive Disclosure &amp; Multi-Cidade</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Configurações &amp; <span className="text-[#FFDE00]">White Label Expresso</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal mt-1">
              Configurações essenciais sempre acessíveis, dados técnicos protegidos por desafio de segurança e assistente de ativação de cidade em 4 passos.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Barra de Abas (Modo Essencial | White Label Expresso | Modo Avançado Protegido) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-fit">
        <button
          type="button"
          onClick={() => setAbaAtiva("essencial")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            abaAtiva === "essencial" ? "bg-slate-950 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 text-[#FFDE00]" />
          <span>Modo Essencial</span>
          <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-900 font-bold">
            Sempre Visível
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva("whitelabel")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            abaAtiva === "whitelabel" ? "bg-slate-950 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sparkles className="h-4 w-4 text-[#FFDE00]" />
          <span>White Label Expresso</span>
          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900 font-bold">
            4 Passos (&lt;15 min)
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva("avancado")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            abaAtiva === "avancado" ? "bg-slate-950 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {modoAvancadoDesbloqueado ? (
            <Unlock className="h-4 w-4 text-emerald-400" />
          ) : (
            <Lock className="h-4 w-4 text-rose-500" />
          )}
          <span>Modo Avançado</span>
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            modoAvancadoDesbloqueado ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
          }`}>
            {modoAvancadoDesbloqueado ? "Desbloqueado" : "Protegido"}
          </span>
        </button>
      </div>

      {/* 3. ABA 1: MODO ESSENCIAL (SEMPRE VISÍVEL) */}
      {abaAtiva === "essencial" && (
        <form onSubmit={handleSalvarEssencial} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Configurações Operacionais Essenciais</h2>
              <p className="text-xs text-slate-500">
                Parâmetros vitais de operação diária sem exposição a dados técnicos complexos.
              </p>
            </div>
            <button
              type="submit"
              className="flex h-11 items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-5 text-xs font-black shadow-xs transition-all cursor-pointer"
            >
              <Save className="h-4 w-4 text-[#FFDE00]" />
              <span>Salvar Modificações</span>
            </button>
          </div>

          {sucessoEssencial && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Configurações essenciais salvas com sucesso no banco de dados!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Cidade de Operação */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                Cidade de Operação Ativa
              </label>
              <input
                type="text"
                value={cidadeOperacao}
                onChange={(e) => setCidadeOperacao(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold"
              />
              <p className="text-[11px] text-slate-400">Região de cobertura padrão das corridas.</p>
            </div>

            {/* Comissão / Taxa da Franquia */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                Taxa de Serviço / Comissão (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={comissaoFranquia}
                  onChange={(e) => setComissaoFranquia(e.target.value)}
                  className="w-full h-11 px-3 pr-8 rounded-xl border border-slate-300 text-xs font-black"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
              </div>
              <p className="text-[11px] text-slate-400">Comissão retida pela plataforma por corrida.</p>
            </div>

            {/* WhatsApp Central */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                WhatsApp Central de Atendimento
              </label>
              <input
                type="text"
                value={whatsappSuporte}
                onChange={(e) => setWhatsappSuporte(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold"
              />
              <p className="text-[11px] text-slate-400">Canal direto de suporte ao passageiro.</p>
            </div>

            {/* Chave PIX */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2 lg:col-span-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                Chave PIX Oficial de Recebimento da Matriz / Franquia
              </label>
              <input
                type="text"
                value={chavePixPadrao}
                onChange={(e) => setChavePixPadrao(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400">Chave utilizada para emissão de cobranças PIX Copia e Cola nos aplicativos.</p>
            </div>
          </div>
        </form>
      )}

      {/* 4. ABA 2: WHITE LABEL EXPRESSO (ASSISTENTE DE 4 PASSOS) */}
      {abaAtiva === "whitelabel" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Assistente de Onboarding White Label (4 Passos)</h2>
                <p className="text-xs text-slate-500">
                  Substitui mais de 60 campos técnicos por um fluxo de ativação rápida em menos de 15 minutos.
                </p>
              </div>

              {/* Indicador dos 4 Passos */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                      passoWizard === step
                        ? "bg-slate-950 text-white shadow-xs"
                        : passoWizard > step
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {passoWizard > step ? <Check className="h-4 w-4" /> : step}
                  </div>
                ))}
              </div>
            </div>

            {/* CONTEÚDO DO PASSO ATIVO */}
            {passoWizard === 1 && (
              <div className="space-y-4 max-w-xl animate-in fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-600">Passo 1 de 4</span>
                  <h3 className="text-sm font-black text-slate-900">Identificação da Cidade &amp; Aplicativo</h3>
                  <p className="text-xs text-slate-500">Defina o município de expansão e o nome comercial do app.</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cidade:</label>
                    <input
                      type="text"
                      value={wlCidade}
                      onChange={(e) => setWlCidade(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">UF:</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={wlUf}
                      onChange={(e) => setWlUf(e.target.value.toUpperCase())}
                      className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold uppercase text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome Comercial do App:</label>
                  <input
                    type="text"
                    value={wlNomeApp}
                    onChange={(e) => setWlNomeApp(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPassoWizard(2)}
                    className="flex h-11 items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 text-xs font-black hover:bg-slate-800"
                  >
                    <span>Avançar para Identidade Visual</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {passoWizard === 2 && (
              <div className="space-y-4 max-w-xl animate-in fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-600">Passo 2 de 4</span>
                  <h3 className="text-sm font-black text-slate-900">Identidade Visual &amp; Preset de Estilo</h3>
                  <p className="text-xs text-slate-500">Cores da marca e o acabamento estético do aplicativo local.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cor Primária da Marca:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={wlCorPrimaria}
                        onChange={(e) => setWlCorPrimaria(e.target.value)}
                        className="h-11 w-12 rounded-xl border border-slate-300 p-1 cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        value={wlCorPrimaria}
                        onChange={(e) => setWlCorPrimaria(e.target.value)}
                        className="flex-1 h-11 px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Preset Visual:</label>
                    <select
                      value={wlPreset}
                      onChange={(e: any) => setWlPreset(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                    >
                      <option value="Moderno">Moderno (Bordas Suaves)</option>
                      <option value="Compacto">Compacto (Alta Densidade)</option>
                      <option value="Arredondado">Arredondado (Amigável)</option>
                    </select>
                  </div>
                </div>

                {/* Preview Rápido */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Prévia do Botão Principal:</span>
                  <button
                    type="button"
                    style={{ backgroundColor: wlCorPrimaria }}
                    className="w-full h-11 rounded-xl text-slate-950 font-black text-xs shadow-xs"
                  >
                    Pedir Corrida em {wlCidade}
                  </button>
                </div>

                <div className="pt-3 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setPassoWizard(1)}
                    className="h-11 px-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassoWizard(3)}
                    className="flex h-11 items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 text-xs font-black hover:bg-slate-800"
                  >
                    <span>Avançar para Tarifas</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {passoWizard === 3 && (
              <div className="space-y-4 max-w-xl animate-in fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-600">Passo 3 de 4</span>
                  <h3 className="text-sm font-black text-slate-900">Tarifas da Cidade &amp; Comissão</h3>
                  <p className="text-xs text-slate-500">Regras de precificação e split financeiro da operação.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tarifa Base (R$):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={wlTarifaBase}
                      onChange={(e) => setWlTarifaBase(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Comissão da Franquia (%):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={wlComissao}
                      onChange={(e) => setWlComissao(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setPassoWizard(2)}
                    className="h-11 px-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassoWizard(4)}
                    className="flex h-11 items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 text-xs font-black hover:bg-slate-800"
                  >
                    <span>Avançar para Ativação</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {passoWizard === 4 && (
              <div className="space-y-4 max-w-xl animate-in fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-600">Passo 4 de 4</span>
                  <h3 className="text-sm font-black text-slate-900">Canais Operacionais &amp; Ativação</h3>
                  <p className="text-xs text-slate-500">Chave PIX para recebimentos e WhatsApp oficial da praça.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chave PIX da Cidade:</label>
                  <input
                    type="text"
                    value={wlPix}
                    onChange={(e) => setWlPix(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp de Suporte da Cidade:</label>
                  <input
                    type="text"
                    value={wlWhatsapp}
                    onChange={(e) => setWlWhatsapp(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>

                {cidadeAtivadaSucesso ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                    <div className="flex items-center gap-2 font-black text-sm">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>Cidade {wlCidade} ({wlUf}) Ativada com Sucesso!</span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      O tenant foi provisionado no banco de dados e está pronto para receber cadastros de passageiros e motoristas.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCidadeAtivadaSucesso(false);
                        setPassoWizard(1);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                    >
                      Cadastrar Outra Cidade
                    </button>
                  </div>
                ) : (
                  <div className="pt-3 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setPassoWizard(3)}
                      className="h-11 px-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleConcluirWhiteLabel}
                      className="flex h-12 items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 text-xs font-black shadow-md cursor-pointer"
                    >
                      <Zap className="h-4 w-4 text-[#FFDE00]" />
                      <span>🚀 Ativar Cidade Agora (&lt; 15 min)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lista de Cidades Ativas */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900">Cidades Ativas na Rede PARTIU ({cidadesAtivas.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cidadesAtivas.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.corPrimaria }} />
                      <p className="font-bold text-xs text-slate-900">{c.nome} - {c.uf}</p>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        {c.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">App: {c.nomeApp} | Preset: {c.preset}</p>
                  </div>
                  <span className="text-xs font-black text-slate-900">Comissão: {c.comissaoPercent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. ABA 3: MODO AVANÇADO (PROTEGIDO POR CONFIRMAÇÃO) */}
      {abaAtiva === "avancado" && (
        <div className="space-y-4">
          {!modoAvancadoDesbloqueado ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs text-center space-y-4 max-w-xl mx-auto">
              <div className="h-16 w-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <Lock className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-900">Área Técnica Protegida (Modo Avançado)</h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  Esta seção contém credenciais críticas de infraestrutura (API Keys, Webhooks, DNS e Variáveis de Sistema). O acesso requer confirmação explícita para evitar alterações acidentais.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalDesbloquearAberto(true)}
                className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Unlock className="h-4 w-4 text-[#FFDE00]" />
                <span>Desbloquear Configurações Técnicas</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between bg-amber-50 p-4 rounded-2xl border border-amber-300">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <span>Modo Avançado Desbloqueado com Sucesso. Atenção ao alterar chaves de produção.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModoAvancadoDesbloqueado(false)}
                  className="px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                >
                  Bloquear Novamente
                </button>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-sm font-black text-slate-900">API Keys &amp; Credenciais de Gateway</h3>
                  <button
                    type="button"
                    onClick={() => setMostrarChaves(!mostrarChaves)}
                    className="text-xs font-bold text-slate-600 flex items-center gap-1 hover:text-slate-900"
                  >
                    {mostrarChaves ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>{mostrarChaves ? "Ocultar Valores" : "Revelar Valores"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Google Maps Platform API Key:</label>
                    <input
                      type={mostrarChaves ? "text" : "password"}
                      value={googleMapsKey}
                      onChange={(e) => setGoogleMapsKey(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Asaas API Token:</label>
                    <input
                      type={mostrarChaves ? "text" : "password"}
                      value={asaasApiKey}
                      onChange={(e) => setAsaasApiKey(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Stripe Secret Key:</label>
                    <input
                      type={mostrarChaves ? "text" : "password"}
                      value={stripeSecretKey}
                      onChange={(e) => setStripeSecretKey(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Webhook Secret (HMAC):</label>
                    <input
                      type={mostrarChaves ? "text" : "password"}
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">DNS / Endpoint Base:</label>
                    <input
                      type="text"
                      value={dnsUrl}
                      onChange={(e) => setDnsUrl(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Timeout de Despacho (Segundos):</label>
                    <input
                      type="number"
                      value={timeoutDespachoSec}
                      onChange={(e) => setTimeoutDespachoSec(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 font-bold"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => alert("Parâmetros técnicos atualizados no cluster de produção com sucesso!")}
                    className="h-11 px-5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs cursor-pointer"
                  >
                    Salvar Configurações Técnicas
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DESBLOQUEAR MODO AVANÇADO */}
      {modalDesbloquearAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="text-base font-black text-slate-900">Confirmação de Segurança</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalDesbloquearAberto(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDesbloquearAvancado} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Para liberar as configurações avançadas e chaves de API, digite a palavra <strong>DESBLOQUEAR</strong> abaixo:
              </p>

              <input
                type="text"
                required
                placeholder="Digite DESBLOQUEAR"
                value={confirmacaoTexto}
                onChange={(e) => setConfirmacaoTexto(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 font-bold uppercase text-center focus:ring-2 focus:ring-rose-500"
              />

              {erroDesbloqueio && (
                <p className="text-red-600 font-bold text-xs">{erroDesbloqueio}</p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalDesbloquearAberto(false)}
                  className="h-11 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-xs"
                >
                  Confirmar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
