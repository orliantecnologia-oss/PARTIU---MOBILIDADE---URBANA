import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Layers,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Plus,
  Edit2,
  Copy,
  Check,
  X,
  RefreshCw,
  DollarSign,
  PieChart,
  Percent,
  Sliders,
  Users,
  Calendar,
  Zap,
  ArrowUpRight,
  ShieldAlert,
  QrCode,
  FileSpreadsheet,
  Save,
} from "lucide-react";
import { GuardiaoAcesso } from "@/components/admin/GuardiaoAcesso";
import {
  subscriptionEngine,
  commissionEngine,
  billingEngine,
  driverWalletEngine,
  financialAuditEngine,
  revenueDashboardEngine,
  type DriverPlan,
  type ProtectionFundConfig,
  type PlatformRevenueMetrics,
} from "@/lib/revenue";
import { RealQrCodePix } from "@/components/passagens/RealQrCodePix";
import { appSettingsService, type AppSettings } from "@/lib/ecosystem/app-settings-service";
import {
  driverSubscriptionService,
  type DriverSubscriptionRecord,
} from "@/lib/ecosystem/driver-subscription-service";

export const Route = createFileRoute("/app/admin/monetizacao")({
  head: () => ({
    meta: [
      { title: "Monetização & Planos SaaS | PARTIU Admin" },
      {
        name: "description",
        content:
          "Centro Executivo de Monetização: gestão de diárias SaaS, planos de assinatura, comissões variáveis e controle de receita.",
      },
    ],
  }),
  component: AdminMonetizacaoPage,
});

type AbaMonetizacao = "diarias_saas" | "planos" | "taxas" | "cobranca" | "inadimplencia" | "dashboard";

export function AdminMonetizacaoPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaMonetizacao>("diarias_saas");
  const [appSettings, setAppSettings] = useState<AppSettings>(() => appSettingsService.getSettings());
  const [diariaCarroInput, setDiariaCarroInput] = useState(() => appSettings.daily_fee_car.toFixed(2));
  const [diariaMotoInput, setDiariaMotoInput] = useState(() => appSettings.daily_fee_moto.toFixed(2));
  const [saasMetrics, setSaasMetrics] = useState(() => driverSubscriptionService.getSaaSMetrics());
  const [subscriptionsList, setSubscriptionsList] = useState<DriverSubscriptionRecord[]>(() =>
    driverSubscriptionService.getAllSubscriptions()
  );
  const [planos, setPlanos] = useState<DriverPlan[]>(() =>
    subscriptionEngine.getAllPlans(true)
  );
  const [protectionConfig, setProtectionConfig] = useState<ProtectionFundConfig>(() =>
    commissionEngine.getProtectionConfig()
  );
  const [goldProtectionConfig, setGoldProtectionConfig] = useState(() =>
    commissionEngine.getGoldProtectionConfig()
  );
  const [metrics, setMetrics] = useState<PlatformRevenueMetrics>(() =>
    revenueDashboardEngine.calculateMetrics()
  );

  // Modal de Edição / Criação de Plano
  const [modalPlanoAberto, setModalPlanoAberto] = useState(false);
  const [planoEmEdicao, setPlanoEmEdicao] = useState<Partial<DriverPlan> | null>(null);

  // Modal de Cobrança PIX Avulsa
  const [modalPixAvulsoAberto, setModalPixAvulsoAberto] = useState(false);
  const [pixMotoristaNome, setPixMotoristaNome] = useState("Carlos Eduardo (Onix Prata)");
  const [pixValorBrl, setPixValorBrl] = useState("49.90");
  const [pixGeradoPayload, setPixGeradoPayload] = useState<string | null>(null);

  // Feedback Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function mostrarToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  function recarregarDados() {
    setAppSettings(appSettingsService.getSettings());
    setSaasMetrics(driverSubscriptionService.getSaaSMetrics());
    setSubscriptionsList(driverSubscriptionService.getAllSubscriptions());
    setPlanos(subscriptionEngine.getAllPlans(true));
    setProtectionConfig(commissionEngine.getProtectionConfig());
    setGoldProtectionConfig(commissionEngine.getGoldProtectionConfig());
    setMetrics(revenueDashboardEngine.calculateMetrics());
  }

  async function handleSalvarDiariasSaaS(e: React.FormEvent) {
    e.preventDefault();
    const carVal = parseFloat(diariaCarroInput.replace(",", "."));
    const motoVal = parseFloat(diariaMotoInput.replace(",", "."));

    if (isNaN(carVal) || carVal <= 0 || isNaN(motoVal) || motoVal <= 0) {
      mostrarToast("Insira valores válidos para as diárias de Carro e Moto.");
      return;
    }

    const updated = await appSettingsService.updateSettings({
      daily_fee_car: carVal,
      daily_fee_moto: motoVal,
    });
    setAppSettings(updated);
    mostrarToast("Diárias SaaS atualizadas com sucesso! Refletidas no app do motorista.");
  }

  // Ações de Planos
  function handleAbrirCriarPlano() {
    setPlanoEmEdicao({
      name: "",
      description: "",
      monthlyFeeBrl: 29.9,
      commissionPercent: 4.0,
      features: ["Taxa reduzida", "Repasse PIX D+0"],
      badgeColor: "bg-indigo-600",
      active: true,
      isPopular: false,
    });
    setModalPlanoAberto(true);
  }

  function handleAbrirEditarPlano(plano: DriverPlan) {
    setPlanoEmEdicao({ ...plano });
    setModalPlanoAberto(true);
  }

  function handleSalvarPlano(e: React.FormEvent) {
    e.preventDefault();
    if (!planoEmEdicao || !planoEmEdicao.name) return;

    if (planoEmEdicao.id) {
      // Atualizar existente
      subscriptionEngine.updatePlan(planoEmEdicao.id, {
        name: planoEmEdicao.name,
        description: planoEmEdicao.description || "",
        monthlyFeeBrl: Number(planoEmEdicao.monthlyFeeBrl) || 0,
        dailyFeeBrl: Number(planoEmEdicao.dailyFeeBrl) || 0,
        weeklyFeeBrl: Number(planoEmEdicao.weeklyFeeBrl) || 0,
        billingCycle: planoEmEdicao.billingCycle || "MONTHLY",
        commissionPercent: planoEmEdicao.commissionPercent !== undefined ? Number(planoEmEdicao.commissionPercent) : 0,
        features: Array.isArray(planoEmEdicao.features)
          ? planoEmEdicao.features
          : String(planoEmEdicao.features).split("\n").filter(Boolean),
        badgeColor: planoEmEdicao.badgeColor || "bg-slate-500",
        active: planoEmEdicao.active ?? true,
        isPopular: planoEmEdicao.isPopular ?? false,
      });
      mostrarToast(`Plano "${planoEmEdicao.name}" atualizado com sucesso!`);
    } else {
      // Criar novo
      subscriptionEngine.createPlan({
        name: planoEmEdicao.name,
        description: planoEmEdicao.description || "",
        monthlyFeeBrl: Number(planoEmEdicao.monthlyFeeBrl) || 0,
        dailyFeeBrl: Number(planoEmEdicao.dailyFeeBrl) || 0,
        weeklyFeeBrl: Number(planoEmEdicao.weeklyFeeBrl) || 0,
        billingCycle: planoEmEdicao.billingCycle || "MONTHLY",
        commissionPercent: planoEmEdicao.commissionPercent !== undefined ? Number(planoEmEdicao.commissionPercent) : 0,
        features: Array.isArray(planoEmEdicao.features)
          ? planoEmEdicao.features
          : String(planoEmEdicao.features).split("\n").filter(Boolean),
        badgeColor: planoEmEdicao.badgeColor || "bg-indigo-600",
      });
      mostrarToast(`Novo plano "${planoEmEdicao.name}" criado com sucesso!`);
    }

    setModalPlanoAberto(false);
    recarregarDados();
  }

  function handleDuplicarPlano(planoId: string) {
    const novo = subscriptionEngine.duplicatePlan(planoId);
    mostrarToast(`Plano duplicado como "${novo.name}".`);
    recarregarDados();
  }

  function handleToggleStatusPlano(planoId: string) {
    const atualizado = subscriptionEngine.togglePlanStatus(planoId);
    mostrarToast(
      `Plano "${atualizado.name}" agora está ${atualizado.active ? "ATIVO" : "INATIVO"}.`
    );
    recarregarDados();
  }

  // Ações de Taxas & Proteção
  function handleSalvarProtecao(e: React.FormEvent) {
    e.preventDefault();
    commissionEngine.updateProtectionConfig({
      enabled: protectionConfig.enabled,
      retentionPerTripBrl: Number(protectionConfig.retentionPerTripBrl) || 0.3,
      targetCapBrl: Number(protectionConfig.targetCapBrl) || 30.0,
    });
    mostrarToast("Parâmetros do Fundo de Proteção salvos com sucesso!");
    recarregarDados();
  }

  function handleSalvarProtecaoOuro(e: React.FormEvent) {
    e.preventDefault();
    commissionEngine.updateGoldProtectionConfig({
      thresholdMonthlyBrl: Number(goldProtectionConfig.thresholdMonthlyBrl) || 8000,
      postThresholdCommissionPercent: Number(goldProtectionConfig.postThresholdCommissionPercent) || 0.5,
    });
    mostrarToast(
      `Proteção do Plano Ouro salva: 0% até R$ ${Number(goldProtectionConfig.thresholdMonthlyBrl) || 8000}/mês + ${Number(goldProtectionConfig.postThresholdCommissionPercent) || 0.5}% excedente.`
    );
    recarregarDados();
  }

  // Gerador de PIX Avulso
  function handleGerarPixAvulso(e: React.FormEvent) {
    e.preventDefault();
    const payload = `00020126580014br.gov.bcb.pix0136partiu-recuperacao-finops-001520400005303986540${pixValorBrl.replace(".", "")}5802BR5915PARTIU BRASIL6009SAO PAULO62070503***6304ABCD`;
    setPixGeradoPayload(payload);
    mostrarToast("QR Code PIX gerado para regularização.");
  }

  return (
    <GuardiaoAcesso permissao="financial:configure_fees" somenteOwner={true}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 animate-in fade-in duration-200">
        {/* TOAST FLUTUANTE */}
        {toastMsg && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-in slide-in-from-top-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* CABEÇALHO EXECUTIVO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                FASE 19 • REVENUE OS
              </span>
              <span className="text-xs font-bold text-slate-500">Governança Econômica</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 mt-1">
              Monetização, Comissões &amp; Planos SaaS
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Modelo econômico híbrido: assinaturas mensais, comissões variáveis por corrida,
              fundo de proteção e esteira de cobrança em cascata.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={recarregarDados}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              title="Recarregar Indicadores"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              type="button"
              onClick={handleAbrirCriarPlano}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-2 transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Plano</span>
            </button>
          </div>
        </div>

        {/* KPI CARDS RESUMIDOS (TOP BAR) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              MRR (Recorrente)
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-950">
              {metrics.mrrBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              ARR {metrics.arrBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Take-Rate Médio
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-700">
              {metrics.effectiveTakeRatePercent.toFixed(2)}%
            </div>
            <span className="text-[10px] text-slate-500 font-bold">
              Uber: 20-30% | 99: 18-25%
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Receita Líquida Total
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">
              {metrics.totalNetRevenueBrl.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
            <span className="text-[10px] text-emerald-800 font-bold">
              Assinaturas + Comissões
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Inadimplência
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-950">
              {metrics.delinquencyRatePercent}%
            </div>
            <span className="text-[10px] text-emerald-700 font-bold">
              {metrics.defaultingDriversCount} em carência / {metrics.activeDriversCount} adimplentes
            </span>
          </div>
        </div>

        {/* SELETOR DE ABAS PRINCIPAIS */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pb-1 scrollbar-none">
          {[
            { id: "diarias_saas", label: "Diárias SaaS (Zero Comissão)", icon: Zap },
            { id: "planos", label: "Planos Legados", icon: Layers },
            { id: "taxas", label: "Taxas & Fundo Proteção", icon: ShieldCheck },
            { id: "cobranca", label: "Cobrança & Meios", icon: CreditCard },
            { id: "inadimplencia", label: "Inadimplência & Réguas", icon: AlertTriangle },
            { id: "dashboard", label: "Dashboard Financeiro", icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = abaAtiva === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAbaAtiva(tab.id as AbaMonetizacao)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? "bg-slate-950 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* =================================================================== */}
        {/* ABA 0: GESTÃO FINANCEIRA & DIÁRIAS SAAS (ZERO COMISSÃO)             */}
        {/* =================================================================== */}
        {abaAtiva === "diarias_saas" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header com Regra de Ouro */}
            <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-400/30 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-yellow-400 text-slate-950 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Modelo SaaS Puro • 100% Repasse Líquido
                </div>
                <h2 className="text-xl font-black text-slate-950">
                  Gestão de Diárias dos Motoristas & Receita SaaS
                </h2>
                <p className="text-xs text-slate-600 max-w-2xl">
                  O Partiu não retém comissão de corridas. A receita da plataforma provém exclusivamente
                  das diárias pré-pagas (24 horas) via PIX cobradas de motoristas de Carro e Moto.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={recarregarDados}
                  className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> Atualizar
                </button>
              </div>
            </div>

            {/* KPI Cards de Diárias Pagas (Hoje vs Mês) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Diárias Pagas Hoje (PIX)
                </span>
                <div className="text-2xl font-black text-emerald-600">
                  R$ {saasMetrics.totalRevenueToday.toFixed(2).replace(".", ",")}
                </div>
                <span className="text-[10px] text-slate-500 font-medium block">
                  Liquidação imediata D+0
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Receita Diárias no Mês
                </span>
                <div className="text-2xl font-black text-slate-900">
                  R$ {saasMetrics.totalRevenueMonth.toFixed(2).replace(".", ",")}
                </div>
                <span className="text-[10px] text-slate-500 font-medium block">
                  100% SaaS Recorrente
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Motoristas com Diária Ativa
                </span>
                <div className="text-2xl font-black text-amber-600">
                  {saasMetrics.activeDriversCount}
                </div>
                <span className="text-[10px] text-emerald-600 font-bold block">
                  Habilitados para receber chamados
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Diárias Vencidas / Bloqueadas
                </span>
                <div className="text-2xl font-black text-rose-600">
                  {saasMetrics.expiredDriversCount}
                </div>
                <span className="text-[10px] text-rose-700 font-bold block">
                  Cockpit bloqueado pela trava
                </span>
              </div>
            </div>

            {/* Configurador Rápido de Valores de Diária */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-950">
                  Configurador Rápido de Diárias (PostgreSQL / Supabase)
                </h3>
                <p className="text-xs text-slate-500">
                  Altere os valores cobrados por diária de 24 horas. Os novos valores são sincronizados
                  imediatamente na tabela <code>app_settings</code> e exibidos no app do motorista.
                </p>
              </div>

              <form onSubmit={handleSalvarDiariasSaaS} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 block">
                    Diária Carro (R$ / 24h):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.50"
                      min="1.00"
                      value={diariaCarroInput}
                      onChange={(e) => setDiariaCarroInput(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-black text-slate-900 focus:bg-white focus:border-amber-400 focus:outline-hidden"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Valor atual: R$ {appSettings.daily_fee_car.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 block">
                    Diária Moto (R$ / 24h):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.50"
                      min="1.00"
                      value={diariaMotoInput}
                      onChange={(e) => setDiariaMotoInput(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-black text-slate-900 focus:bg-white focus:border-amber-400 focus:outline-hidden"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Valor atual: R$ {appSettings.daily_fee_moto.toFixed(2)}
                  </span>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 active:scale-95 text-white text-xs font-black transition shadow-md flex items-center justify-center gap-2 cursor-pointer h-[42px]"
                  >
                    <Save className="w-4 h-4 text-yellow-400" />
                    <span>Salvar Valores de Diária</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Tabela de Diárias Recentes dos Motoristas */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-950">
                    Assinaturas de Diárias Recentes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Histórico de liquidações PIX de 24 horas registradas no banco de dados.
                  </p>
                </div>
              </div>

              {subscriptionsList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  Nenhuma assinatura registrada ainda. Assim que os motoristas pagarem a diária via PIX, os registros aparecerão aqui em tempo real.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-black uppercase text-slate-400">
                        <th className="pb-3">Motorista ID</th>
                        <th className="pb-3">Veículo</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Valor Pago</th>
                        <th className="pb-3">Início</th>
                        <th className="pb-3">Expiração (24h)</th>
                        <th className="pb-3">TXID PIX</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {subscriptionsList.map((sub) => {
                        const isExpired = new Date(sub.expires_at).getTime() < Date.now();
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 font-mono font-bold text-slate-900">{sub.driver_id}</td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                                {sub.vehicle_type}
                              </span>
                            </td>
                            <td className="py-3">
                              {sub.status === "ACTIVE" && !isExpired ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ativa
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Expirada
                                </span>
                              )}
                            </td>
                            <td className="py-3 font-bold text-slate-900">
                              R$ {sub.amount_paid.toFixed(2).replace(".", ",")}
                            </td>
                            <td className="py-3 text-slate-500">
                              {new Date(sub.starts_at).toLocaleDateString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3 text-slate-500">
                              {new Date(sub.expires_at).toLocaleDateString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3 font-mono text-[10px] text-slate-400">
                              {sub.pix_txid || "---"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ABA 1: PLANOS DE ASSINATURA (CRUD)                                  */}
        {/* =================================================================== */}
        {abaAtiva === "planos" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950">
                  Planos Cadastrados na Plataforma
                </h2>
                <p className="text-xs text-slate-500">
                  O motorista escolhe livremente o equilíbrio ideal entre mensalidade fixa e comissão
                  por corrida.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {planos.map((plano) => (
                <div
                  key={plano.id}
                  className={`p-5 rounded-3xl border transition flex flex-col justify-between ${
                    plano.active
                      ? "bg-white border-slate-200 shadow-xs hover:border-slate-300"
                      : "bg-slate-50 border-slate-200 opacity-60"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header do Card */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${plano.badgeColor}`} />
                        <h3 className="text-base font-black text-slate-950">{plano.name}</h3>
                      </div>
                      {plano.isPopular && (
                        <span className="text-[9px] font-black uppercase bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full">
                          Mais Popular
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">{plano.description}</p>

                    {/* Preço e Taxa */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-500">Mensalidade:</span>
                        <span className="text-base font-black text-slate-950">
                          {plano.monthlyFeeBrl === 0
                            ? "R$ 0,00"
                            : plano.monthlyFeeBrl.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-500">Taxa p/ Corrida:</span>
                        <span className="text-sm font-black text-amber-700">
                          {plano.commissionPercent}%
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1 border-t border-slate-200/60">
                        <span className="text-[10px] text-slate-400">Peso no Despacho:</span>
                        <span className="text-[10px] font-bold text-slate-600">
                          {plano.dispatchWeightPercent}% (Máx 5%)
                        </span>
                      </div>
                    </div>

                    {/* Benefícios */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Benefícios Inclusos:
                      </span>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {plano.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="text-emerald-600 text-xs font-bold">✓</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStatusPlano(plano.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition ${
                        plano.active
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      }`}
                    >
                      {plano.active ? "Desativar" : "Ativar"}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicarPlano(plano.id)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                        title="Duplicar Plano"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAbrirEditarPlano(plano)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ABA 2: TAXAS & FUNDO DE PROTEÇÃO                                    */}
        {/* =================================================================== */}
        {abaAtiva === "taxas" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
            {/* Configuração do Fundo de Proteção */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-950">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">
                      Parâmetros do Fundo de Proteção Operacional
                    </h3>
                    <p className="text-xs text-slate-500">
                      Micro-retenção automática retida de cada corrida para cobrir calotes de dinheiro,
                      inadimplência e socorro mútuo.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSalvarProtecao} className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Status do Fundo de Proteção
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Quando ativado, retém automaticamente a fração definida até atingir o teto
                      individual.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={protectionConfig.enabled}
                      onChange={(e) =>
                        setProtectionConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Retenção por Corrida (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={protectionConfig.retentionPerTripBrl}
                        onChange={(e) =>
                          setProtectionConfig((prev) => ({
                            ...prev,
                            retentionPerTripBrl: Number(e.target.value),
                          }))
                        }
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-bold text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Padrão sugerido: R$ 0,30 a R$ 0,50 por corrida concluída.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Teto Máximo de Reserva por Condutor (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                        R$
                      </span>
                      <input
                        type="number"
                        step="1.00"
                        min="10"
                        value={protectionConfig.targetCapBrl}
                        onChange={(e) =>
                          setProtectionConfig((prev) => ({
                            ...prev,
                            targetCapBrl: Number(e.target.value),
                          }))
                        }
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-bold text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Após atingir o teto (ex: R$ 30,00), a cobrança é pausada automaticamente.
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs transition shadow-sm"
                  >
                    Salvar Parâmetros
                  </button>
                </div>
              </form>
            </div>

            {/* AUDITORIA FASE 1: Proteção Financeira do Plano Ouro (Taxa Zero até R$ 8k + 0.5% excedente) */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black">
                    🏆
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">
                      Proteção Financeira de Sustentabilidade — Plano Ouro (VIP)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Isenção de 0% garantida até o limite mensal configurado. Acima deste teto,
                      aplica-se a comissão mínima de proteção da plataforma.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                  Fase 1 Homologada
                </span>
              </div>

              <form onSubmit={handleSalvarProtecaoOuro} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Teto Mensal de Faturamento Isento (0%)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                        R$
                      </span>
                      <input
                        type="number"
                        step="500"
                        min="1000"
                        value={goldProtectionConfig.thresholdMonthlyBrl}
                        onChange={(e) =>
                          setGoldProtectionConfig((prev) => ({
                            ...prev,
                            thresholdMonthlyBrl: Number(e.target.value),
                          }))
                        }
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-bold text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Padrão: R$ 8.000,00/mês. Dentro deste limite o repasse é 100% líquido.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Comissão Excedente Pós-Teto (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={goldProtectionConfig.postThresholdCommissionPercent}
                        onChange={(e) =>
                          setGoldProtectionConfig((prev) => ({
                            ...prev,
                            postThresholdCommissionPercent: Number(e.target.value),
                          }))
                        }
                        className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 font-bold text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                        %
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Padrão: 0,5% aplicada exclusivamente sobre os valores que excederem o teto.
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs transition shadow-sm"
                  >
                    Salvar Regra do Plano Ouro
                  </button>
                </div>
              </form>
            </div>

            {/* Painel de Reserva & Benchmark */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-black text-slate-950">Reserva de Contingência</h3>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-800">
                  Saldo Total Acumulado em Conta
                </span>
                <div className="text-2xl font-black text-emerald-700">
                  {metrics.protectionFundReserveTotalBrl.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <p className="text-[11px] text-emerald-800">
                  Fundo líquido pronto para resgate de despesas e cobertura imediata.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Benchmark de Mercado vs Concorrentes
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-600">PARTIU (Média):</span>
                    <span className="font-black text-emerald-600">
                      {metrics.effectiveTakeRatePercent}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-900">
                    <span>Uber (Brasil):</span>
                    <span className="font-black">20% a 35%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-900">
                    <span>99 Pop / Moto:</span>
                    <span className="font-black">18% a 28%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ABA 3: COBRANÇA EM CASCATA & PIX                                    */}
        {/* =================================================================== */}
        {abaAtiva === "cobranca" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
            {/* Diagrama da Cascata */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-slate-900" />
                  <h3 className="text-base font-black text-slate-950">
                    Cascata de Cobrança Automática de 4 Níveis
                  </h3>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  100% Automatizado
                </span>
              </div>

              <p className="text-xs text-slate-600">
                O motorista nunca tem o plano suspenso sem antes passar por todas as tentativas
                amigáveis de liquidação na seguinte ordem estrita:
              </p>

              <div className="space-y-3">
                {[
                  {
                    passo: "1º Nível",
                    titulo: "Saldo em Carteira (Instantâneo D+0)",
                    desc: "Deduz diretamente do saldo disponível acumulado das corridas no app.",
                    cor: "border-emerald-300 bg-emerald-50/60 text-emerald-900",
                  },
                  {
                    passo: "2º Nível",
                    titulo: "Faturamento das Próximas Corridas",
                    desc: "Retém uma porcentagem controlada (máx 30%) de cada nova corrida até quitar.",
                    cor: "border-teal-300 bg-teal-50/60 text-teal-900",
                  },
                  {
                    passo: "3º Nível",
                    titulo: "PIX Automático com QR Code Dinâmico",
                    desc: "Gera notificação push com chave copia-e-cola e QR Code de liquidação imediata.",
                    cor: "border-amber-300 bg-amber-50/60 text-amber-900",
                  },
                  {
                    passo: "4º Nível",
                    titulo: "Cartão de Crédito Cadastrado",
                    desc: "Dispara cobrança segura no gateway se o condutor possuir cartão ativo.",
                    cor: "border-slate-300 bg-slate-50 text-slate-900",
                  },
                ].map((item, idx) => (
                  <div key={idx} className={`p-3.5 rounded-2xl border ${item.cor} flex items-start gap-3`}>
                    <span className="px-2 py-1 rounded-lg bg-white font-black text-[10px] shadow-xs shrink-0">
                      {item.passo}
                    </span>
                    <div>
                      <h4 className="text-xs font-black">{item.titulo}</h4>
                      <p className="text-[11px] opacity-80 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gerador Manual de PIX para Regularização */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-950">Cobrança Avulsa via PIX</h3>
              </div>

              <p className="text-xs text-slate-500">
                Gere um QR Code PIX avulso para regularização imediata de mensalidades ou dívidas em
                carência de qualquer condutor.
              </p>

              <form onSubmit={handleGerarPixAvulso} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motorista Parceiro
                  </label>
                  <input
                    type="text"
                    value={pixMotoristaNome}
                    onChange={(e) => setPixMotoristaNome(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor da Cobrança (R$)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={pixValorBrl}
                    onChange={(e) => setPixValorBrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-black text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition"
                >
                  Gerar QR Code PIX
                </button>
              </form>

              {pixGeradoPayload && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2 animate-in fade-in">
                  <div className="flex justify-center">
                    <RealQrCodePix textoChave={pixGeradoPayload} tamanho={120} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 block break-all">
                    {pixGeradoPayload.slice(0, 32)}...
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(pixGeradoPayload);
                      mostrarToast("Chave PIX copiada!");
                    }}
                    className="px-3 py-1 bg-white hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 shadow-xs"
                  >
                    Copiar Código PIX
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ABA 4: INADIMPLÊNCIA & RÉGUAS                                       */}
        {/* =================================================================== */}
        {abaAtiva === "inadimplencia" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h3 className="text-xs font-black text-amber-950">
                    Régua de Carência: 3 Dias Sem Bloqueio Abrupto
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    O motorista continua operando normalmente durante os primeiros 3 dias de atraso.
                    Bloqueios operacionais só ocorrem após expiração da carência e avisos reiterados.
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-amber-900 bg-white px-3 py-1.5 rounded-xl border border-amber-300 shrink-0">
                Trava Ativa: Pós-Carência
              </span>
            </div>

            {/* Tabela de Inadimplentes e Monitoramento */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-950">
                  Condutores em Acompanhamento Financeiro
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {metrics.defaultingDriversCount} registros
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="p-3 pl-5">Motorista</th>
                      <th className="p-3">Plano Atual</th>
                      <th className="p-3">Dívida Acumulada</th>
                      <th className="p-3">Status Cobrança</th>
                      <th className="p-3">Prazo Carência</th>
                      <th className="p-3 text-right pr-5">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 pl-5 font-bold text-slate-950">
                        Marcos Vinicius (mot-004)
                        <span className="block text-[10px] font-normal text-slate-400">
                          Ford Ka • (11) 98765-4321
                        </span>
                      </td>
                      <td className="p-3 font-semibold">Plano Prata</td>
                      <td className="p-3 font-black text-rose-600">R$ 49,90</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                          EM CARÊNCIA (Dia 2/3)
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">Restam 24h</td>
                      <td className="p-3 text-right pr-5">
                        <button
                          type="button"
                          onClick={() => {
                            subscriptionEngine.clearDebt("mot-004", 4990);
                            mostrarToast("Dívida regularizada com sucesso via PIX!");
                            recarregarDados();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs mr-1"
                        >
                          Quitar
                        </button>
                        <button
                          type="button"
                          onClick={() => mostrarToast("Notificação amigável enviada no WhatsApp!")}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition"
                        >
                          Avisar
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 pl-5 font-bold text-slate-950">
                        Rafael Silveira (mot-009)
                        <span className="block text-[10px] font-normal text-slate-400">
                          HB20 • (11) 91234-5678
                        </span>
                      </td>
                      <td className="p-3 font-semibold">Plano Ouro</td>
                      <td className="p-3 font-black text-rose-600">R$ 99,90</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-900">
                          SUSPENSO
                        </span>
                      </td>
                      <td className="p-3 text-rose-600 font-bold">Carência Vencida</td>
                      <td className="p-3 text-right pr-5">
                        <button
                          type="button"
                          onClick={() => {
                            subscriptionEngine.clearDebt("mot-009", 9990);
                            mostrarToast("Motorista reativado no Trip Radar!");
                            recarregarDados();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs mr-1"
                        >
                          Reativar
                        </button>
                        <button
                          type="button"
                          onClick={() => mostrarToast("Proposta de parcelamento gerada!")}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition"
                        >
                          Renegociar
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ABA 5: DASHBOARD FINANCEIRO SAAS EXECUTIVO                          */}
        {/* =================================================================== */}
        {abaAtiva === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Grid Detalhado de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase">GMV Total Transacionado</span>
                  <DollarSign className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-2xl font-black text-slate-950">
                  {metrics.totalGmvBrl.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <span className="text-[11px] text-slate-500 block">
                  {metrics.totalRidesCount} corridas • Ticket Médio R${" "}
                  {metrics.averageTicketBrl.toFixed(2)}
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase">Receita de Comissões</span>
                  <Percent className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-700">
                  {metrics.monthlyCommissionRevenueBrl.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Take-rate ponderado de {metrics.effectiveTakeRatePercent}%
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase">Receita de Assinaturas</span>
                  <Layers className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black text-indigo-700">
                  {metrics.monthlySubscriptionRevenueBrl.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Mensalidades fixas recorrentes (MRR)
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase">Economia Gerada p/ Frota</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-emerald-600">
                  +R$ 19.813,50
                </div>
                <span className="text-[11px] text-emerald-800 font-bold block">
                  Retido no bolso dos motoristas vs Uber
                </span>
              </div>
            </div>

            {/* Health Metrics (LTV, CAC, Churn) */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-950">
                  Indicadores de Saúde SaaS do Marketplace
                </h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Unidade Econômica Altamente Eficiente
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Driver LTV
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {metrics.driverLtvBrl.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Driver CAC
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {metrics.driverCacBrl.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Razão LTV / CAC
                  </span>
                  <span className="text-lg font-black text-emerald-700">
                    {(metrics.driverLtvBrl / metrics.driverCacBrl).toFixed(0)}x
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Churn Mensal
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {metrics.churnRatePercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* MODAL: CRIAR OU EDITAR PLANO                                        */}
        {/* =================================================================== */}
        {modalPlanoAberto && planoEmEdicao && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-950">
                  {planoEmEdicao.id ? `Editar Plano: ${planoEmEdicao.name}` : "Criar Novo Plano"}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalPlanoAberto(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSalvarPlano} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome do Plano
                  </label>
                  <input
                    type="text"
                    required
                    value={planoEmEdicao.name || ""}
                    onChange={(e) =>
                      setPlanoEmEdicao((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ex: Diamante, Prata Plus"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descrição Comercial
                  </label>
                  <input
                    type="text"
                    value={planoEmEdicao.description || ""}
                    onChange={(e) =>
                      setPlanoEmEdicao((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Para quem roda 8h+ por dia..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Ciclo Principal
                    </label>
                    <select
                      value={planoEmEdicao.billingCycle || "MONTHLY"}
                      onChange={(e) =>
                        setPlanoEmEdicao((prev) => ({
                          ...prev,
                          billingCycle: e.target.value as "DAILY" | "WEEKLY" | "MONTHLY",
                        }))
                      }
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                    >
                      <option value="DAILY">Diário</option>
                      <option value="WEEKLY">Semanal</option>
                      <option value="MONTHLY">Mensal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Mensalidade (R$)
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={planoEmEdicao.monthlyFeeBrl ?? 0}
                      onChange={(e) =>
                        setPlanoEmEdicao((prev) => ({
                          ...prev,
                          monthlyFeeBrl: Number(e.target.value),
                        }))
                      }
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Taxa Corrida (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={planoEmEdicao.commissionPercent ?? 0}
                      onChange={(e) =>
                        setPlanoEmEdicao((prev) => ({
                          ...prev,
                          commissionPercent: Number(e.target.value),
                        }))
                      }
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-black text-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tarifa Diária (R$ - opcional)
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={planoEmEdicao.dailyFeeBrl ?? ""}
                      onChange={(e) =>
                        setPlanoEmEdicao((prev) => ({
                          ...prev,
                          dailyFeeBrl: Number(e.target.value),
                        }))
                      }
                      placeholder="Ex: 6.90"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tarifa Semanal (R$ - opcional)
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={planoEmEdicao.weeklyFeeBrl ?? ""}
                      onChange={(e) =>
                        setPlanoEmEdicao((prev) => ({
                          ...prev,
                          weeklyFeeBrl: Number(e.target.value),
                        }))
                      }
                      placeholder="Ex: 34.90"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Benefícios (Um por linha)
                  </label>
                  <textarea
                    rows={3}
                    value={
                      Array.isArray(planoEmEdicao.features)
                        ? planoEmEdicao.features.join("\n")
                        : (planoEmEdicao.features as any) || ""
                    }
                    onChange={(e) =>
                      setPlanoEmEdicao((prev) => ({
                        ...prev,
                        features: e.target.value.split("\n"),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={planoEmEdicao.isPopular ?? false}
                      onChange={(e) =>
                        setPlanoEmEdicao((prev) => ({ ...prev, isPopular: e.target.checked }))
                      }
                      className="rounded text-amber-500"
                    />
                    <span>Destacar como Mais Popular</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={planoEmEdicao.active ?? true}
                      onChange={(e) =>
                        setPlanoEmEdicao((prev) => ({ ...prev, active: e.target.checked }))
                      }
                      className="rounded text-emerald-500"
                    />
                    <span>Plano Ativo</span>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalPlanoAberto(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs shadow-sm"
                  >
                    Salvar Plano
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </GuardiaoAcesso>
  );
}
