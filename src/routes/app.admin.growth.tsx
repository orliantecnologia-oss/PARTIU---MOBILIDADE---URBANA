import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import {
  TrendingUp,
  Users,
  ShieldCheck,
  Gift,
  Award,
  AlertTriangle,
  Send,
  Zap,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  Sliders,
  RefreshCw,
  Sparkles,
  Phone,
  BarChart3,
  Percent,
  Star,
} from "lucide-react";
import { GuardiaoAcesso } from "@/components/admin/GuardiaoAcesso";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import {
  retentionIntelligenceEngine,
  type DriverRetentionRecord,
} from "@/lib/retention/retention-intelligence-engine";
import {
  referralEngine,
  type ReferralRecord,
  type ReferralRewardConfig,
} from "@/lib/referral/referral-engine";
import {
  driverLoyaltyEngine,
  type LoyaltyTierThreshold,
} from "@/lib/loyalty/driver-loyalty-engine";
import {
  commissionEngine,
  type EconomicSimulatorInput,
  type EconomicSimulatorOutput,
} from "@/lib/revenue/commission-engine";

export const Route = createFileRoute("/app/admin/growth")({
  component: GrowthAndRetentionCenterPage,
});

export function GrowthAndRetentionCenterPage() {
  return (
    <GuardiaoAcesso>
      <GrowthAndRetentionCenter />
    </GuardiaoAcesso>
  );
}

export function GrowthAndRetentionCenter() {
  const { corPrimaria, corTextoPrimaria } = useBrandTheme();

  // Estados dos Motores
  const [tabAtiva, setTabAtiva] = useState<"RETENCAO" | "INDICACOES" | "FIDELIDADE" | "SIMULADOR">("RETENCAO");
  const [retentionRecords, setRetentionRecords] = useState(() => retentionIntelligenceEngine.getAllRecords());
  const [retentionMetrics, setRetentionMetrics] = useState(() => retentionIntelligenceEngine.getMetrics());
  const [referrals, setReferrals] = useState(() => referralEngine.getAllReferrals());
  const [referralMetrics, setReferralMetrics] = useState(() => referralEngine.getMetrics());
  const [referralConfig, setReferralConfig] = useState<ReferralRewardConfig>(() => referralEngine.getConfig());
  const [loyaltyTiers] = useState<LoyaltyTierThreshold[]>(() => driverLoyaltyEngine.getAllTiers());

  // Estado do Simulador Econômico
  const [simInput, setSimInput] = useState<EconomicSimulatorInput>({
    activeDriversCount: 350,
    avgTripsPerDriverPerMonth: 120,
    avgGrossFareBrl: 22.5,
    distribution: {
      freePercent: 40,
      bronzePercent: 35,
      silverPercent: 15,
      goldPercent: 10,
    },
    serverCostPerTripBrl: 0.08,
    supportCostPerDriverBrl: 4.5,
    paymentGatewayPixPercent: 0.3,
  });

  const [simOutput, setSimOutput] = useState<EconomicSimulatorOutput>(() =>
    commissionEngine.simulatePlatformEconomics(simInput)
  );

  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  function handleRecalcularSimulador(updates: Partial<EconomicSimulatorInput>) {
    const updated = { ...simInput, ...updates };
    setSimInput(updated);
    setSimOutput(commissionEngine.simulatePlatformEconomics(updated));
  }

  function handleTriggerWinback(driverId: string, action: "OFFER_48H_GOLD" | "SEND_WINBACK_PUSH") {
    try {
      const result = retentionIntelligenceEngine.triggerWinbackAction(driverId, action);
      setRetentionRecords(retentionIntelligenceEngine.getAllRecords());
      setRetentionMetrics(retentionIntelligenceEngine.getMetrics());
      setMensagemSucesso(result.message);
      setTimeout(() => setMensagemSucesso(null), 6000);
    } catch (e: any) {
      alert(e.message);
    }
  }

  function handleUpdateReferralConfig(updates: Partial<ReferralRewardConfig>) {
    const updated = referralEngine.updateConfig(updates);
    setReferralConfig(updated);
    setReferralMetrics(referralEngine.getMetrics());
    setMensagemSucesso("Configurações do Programa de Indicações salvas com sucesso!");
    setTimeout(() => setMensagemSucesso(null), 4000);
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header Executivo */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950">
              Growth, Retenção & Sustentabilidade
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Monitoramento de churn, viralidade por indicações, tiers de fidelidade e simulador financeiro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Retenção Ativa: {(100 - retentionMetrics.churnRatePercent).toFixed(1)}%</span>
          </span>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {mensagemSucesso && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensagemSucesso(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Taxa de Churn Mensal
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{retentionMetrics.churnRatePercent}%</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Ideal &lt; 5%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            {retentionMetrics.criticalCount} motoristas em risco crítico
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Motoristas Monitorados
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{retentionMetrics.totalMonitored}</span>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              {retentionMetrics.atRiskCount} em alerta
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            {retentionMetrics.recoveredCount} recuperados este mês
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Programa de Indicações
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{referralMetrics.totalReferrals}</span>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              K={referralMetrics.kFactor}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            R$ {referralMetrics.paidBonusesBrl.toFixed(2)} em bônus pagos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Eficiência LTV / CAC
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600">{simOutput.ltvCacRatio}x</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Excelente (&gt; 3x)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            LTV R$ {simOutput.ltvEstimatedBrl.toFixed(0)} / CAC R$ {simOutput.cacEstimatedBrl}
          </span>
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 max-w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => setTabAtiva("RETENCAO")}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition ${
            tabAtiva === "RETENCAO"
              ? "bg-white text-slate-950 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          🚨 Inteligência de Retenção & Churn
        </button>

        <button
          type="button"
          onClick={() => setTabAtiva("INDICACOES")}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition ${
            tabAtiva === "INDICACOES"
              ? "bg-white text-slate-950 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          🤝 Indicações & Antifraude
        </button>

        <button
          type="button"
          onClick={() => setTabAtiva("FIDELIDADE")}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition ${
            tabAtiva === "FIDELIDADE"
              ? "bg-white text-slate-950 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          🎖️ Tiers de Fidelidade
        </button>

        <button
          type="button"
          onClick={() => setTabAtiva("SIMULADOR")}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition ${
            tabAtiva === "SIMULADOR"
              ? "bg-white text-slate-950 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          📊 Simulador Econômico
        </button>
      </div>

      {/* ABA 1: INTELIGÊNCIA DE RETENÇÃO */}
      {tabAtiva === "RETENCAO" && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-950">Motoristas em Risco de Evasão</h3>
              <p className="text-xs text-slate-500">
                Condutores identificados por inatividade prolongada ou queda de receita semanal.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {retentionRecords.length} condutores mapeados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                  <th className="py-2.5 px-3">Motorista</th>
                  <th className="py-2.5 px-3">Status / Veículo</th>
                  <th className="py-2.5 px-3">Dias Inativo</th>
                  <th className="py-2.5 px-3">Queda Receita</th>
                  <th className="py-2.5 px-3">Risco</th>
                  <th className="py-2.5 px-3 text-right">Ação Rápida de Retenção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {retentionRecords.map((r) => (
                  <tr key={r.driverId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3">
                      <div className="font-black text-slate-950">{r.driverName}</div>
                      <div className="text-[11px] text-slate-500">{r.phone}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{r.vehicle}</div>
                      <div className="text-[10px] text-slate-400">
                        {r.status === "CAMPAIGN_SENT"
                          ? "📢 Campanha enviada"
                          : r.status === "RECOVERED"
                          ? "✅ Recuperado"
                          : "⚠️ Identificado"}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700">
                      {r.daysInactive === 0 ? "Hoje" : `${r.daysInactive} dias`}
                    </td>
                    <td className="py-3 px-3">
                      {r.earningsDropPercent > 0 ? (
                        <span className="font-black text-rose-600">-{r.earningsDropPercent}%</span>
                      ) : (
                        <span className="font-bold text-emerald-600">Estável</span>
                      )}
                      <div className="text-[10px] text-slate-400">
                        R$ {r.weeklyEarningsBrl.toFixed(0)} vs R$ {r.previousWeekEarningsBrl.toFixed(0)}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                          r.riskLevel === "CRITICO"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : r.riskLevel === "ALTO"
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.riskLevel} ({r.riskScore})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTriggerWinback(r.driverId, "OFFER_48H_GOLD")}
                          className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] shadow-xs active:scale-95 transition flex items-center gap-1"
                          title="Conceder 48h de Plano Ouro (Taxa Zero 0%) para retorno imediato"
                        >
                          <Zap className="w-3 h-3 fill-slate-950" />
                          <span>48h Ouro</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerWinback(r.driverId, "SEND_WINBACK_PUSH")}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 active:scale-95 transition flex items-center gap-1"
                          title="Disparar push de reengajamento"
                        >
                          <Send className="w-3 h-3" />
                          <span>Push</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: PROGRAMA DE INDICAÇÕES & ANTIFRAUDE */}
      {tabAtiva === "INDICACOES" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 e 2: Tabela de Indicações */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-950">Histórico de Indicações</h3>
                <p className="text-xs text-slate-500">
                  Acompanhamento de bônus, metas qualificadoras e filtros de prevenção a fraudes.
                </p>
              </div>
              <span className="text-xs font-black text-slate-500">
                {referrals.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-2.5 px-3">Quem Indicou</th>
                    <th className="py-2.5 px-3">Indicado</th>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Progresso</th>
                    <th className="py-2.5 px-3">Bônus</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-950">{ref.referrerName}</div>
                        <div className="text-[10px] text-slate-400">{ref.referrerRole}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {ref.referredName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800">
                          {ref.referralCode}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900">
                          {ref.completedTripsCount} / {ref.targetTripsCount}
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 mt-1 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{
                              width: `${Math.min(100, (ref.completedTripsCount / ref.targetTripsCount) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900">
                        R$ {ref.bonusAmountBrl.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-md font-black text-[10px] inline-block ${
                            ref.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : ref.status === "PENDING"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {ref.status === "PAID"
                            ? "PAGO D+0"
                            : ref.status === "PENDING"
                            ? "PENDENTE"
                            : "BLOQUEADO (FRAUDE)"}
                        </span>
                        {ref.fraudSignals.length > 0 && (
                          <div className="text-[9px] text-rose-600 font-bold mt-0.5">
                            {ref.fraudSignals[0]}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Coluna 3: Configurações do Programa */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-950">Parametrização Sem Código</h3>
            <p className="text-xs text-slate-500">
              Ajuste valores de bônus, metas e ative campanhas sazonais.
            </p>

            <div className="space-y-3.5 pt-2">
              <div>
                <label className="text-[11px] font-black text-slate-700 block mb-1">
                  Bônus Motorista-Indica-Motorista (R$)
                </label>
                <input
                  type="number"
                  value={referralConfig.driverFixedBonusBrl}
                  onChange={(e) =>
                    handleUpdateReferralConfig({ driverFixedBonusBrl: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-700 block mb-1">
                  Meta de Corridas Qualificadoras do Indicado
                </label>
                <input
                  type="number"
                  value={referralConfig.driverTargetTrips}
                  onChange={(e) =>
                    handleUpdateReferralConfig({ driverTargetTrips: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Bônus liberado somente após o indicado completar {referralConfig.driverTargetTrips} viagens.
                </span>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-700 block mb-1">
                  Desconto Passageiro-Indica-Passageiro (R$)
                </label>
                <input
                  type="number"
                  value={referralConfig.passengerDiscountBonusBrl}
                  onChange={(e) =>
                    handleUpdateReferralConfig({ passengerDiscountBonusBrl: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Toggle Campanha Temporária */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950">Campanha de Expansão</span>
                  <input
                    type="checkbox"
                    checked={referralConfig.temporaryCampaignActive}
                    onChange={(e) =>
                      handleUpdateReferralConfig({ temporaryCampaignActive: e.target.checked })
                    }
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </div>
                <span className="text-[10px] text-amber-800 font-medium block">
                  Aplica multiplicador de {referralConfig.temporaryCampaignMultiplier}x em todos os bônus.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: PROGRAMA DE FIDELIDADE (TIERS) */}
      {tabAtiva === "FIDELIDADE" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-950">Níveis de Fidelidade dos Condutores</h3>
            <p className="text-xs text-slate-500">
              Progressão baseada em mérito, regularidade e satisfação dos passageiros. Sem alteração de taxas ou ganhos.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {loyaltyTiers.map((tier) => (
                <div
                  key={tier.tier}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{tier.badgeIcon}</span>
                    <span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${tier.badgeColor}`}>
                      {tier.name}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-950">{tier.badgeLabel}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{tier.description}</p>
                  </div>

                  {/* Requisitos de Entrada */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Corridas mínimas:</span>
                      <span className="font-black">{tier.minCompletedTrips}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Nota mínima:</span>
                      <span className="font-black">★ {tier.minRating.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Cancelamento máx:</span>
                      <span className="font-black">&le; {tier.maxCancellationRatePercent}%</span>
                    </div>
                  </div>

                  {/* Benefícios */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Benefícios Ativos
                    </span>
                    <ul className="text-[11px] text-slate-600 space-y-1">
                      {tier.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: SIMULADOR ECONÔMICO & SUSTENTABILIDADE */}
      {tabAtiva === "SIMULADOR" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controles de Entrada */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-black text-slate-950">Parâmetros da Simulação</h3>
            </div>
            <p className="text-xs text-slate-500">
              Ajuste as premissas de condutores e ticket médio para testar o equilíbrio financeiro da operação.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700">Motoristas Ativos</span>
                  <span className="font-black text-amber-600">{simInput.activeDriversCount}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="25"
                  value={simInput.activeDriversCount}
                  onChange={(e) => handleRecalcularSimulador({ activeDriversCount: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700">Corridas / Motorista / Mês</span>
                  <span className="font-black text-amber-600">{simInput.avgTripsPerDriverPerMonth}</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="10"
                  value={simInput.avgTripsPerDriverPerMonth}
                  onChange={(e) => handleRecalcularSimulador({ avgTripsPerDriverPerMonth: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700">Ticket Médio da Corrida (R$)</span>
                  <span className="font-black text-amber-600">R$ {simInput.avgGrossFareBrl.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="45"
                  step="1"
                  value={simInput.avgGrossFareBrl}
                  onChange={(e) => handleRecalcularSimulador({ avgGrossFareBrl: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 font-medium">
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  Distribuição de Planos
                </span>
                <div className="flex justify-between text-slate-700">
                  <span>Livre (5%): 40%</span>
                  <span>Bronze: 35%</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Prata: 15%</span>
                  <span>Ouro (R$ 99): 10%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resultados Econômicos */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-950">Demonstração de Resultados (DRE Mensal)</h3>
                <p className="text-xs text-slate-500">
                  GMV total movimentado, receitas combinadas e margem líquida sustentável.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-black text-xs">
                Take-rate Efetivo: {simOutput.effectiveTakeRatePercent}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black uppercase text-slate-400 block">GMV Total</span>
                <span className="text-xl font-black text-slate-900 block mt-1">
                  R$ {(simOutput.totalMarketplaceGMVBrl / 1000).toFixed(1)}k
                </span>
                <span className="text-[10px] text-slate-500">{simOutput.totalMonthlyTrips} corridas/mês</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Receita SaaS</span>
                <span className="text-xl font-black text-slate-900 block mt-1">
                  R$ {simOutput.saasSubscriptionRevenueBrl.toLocaleString("pt-BR")}
                </span>
                <span className="text-[10px] text-slate-500">Mensalidades pré-pagas</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Comissões</span>
                <span className="text-xl font-black text-slate-900 block mt-1">
                  R$ {simOutput.takeRateCommissionsRevenueBrl.toLocaleString("pt-BR")}
                </span>
                <span className="text-[10px] text-slate-500">Corridas variáveis</span>
              </div>
            </div>

            {/* Balanço Final: Lucro & Margem */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                  Lucro Líquido da Plataforma
                </span>
                <span className="text-3xl font-black text-emerald-700 block mt-0.5">
                  R$ {simOutput.netPlatformProfitBrl.toLocaleString("pt-BR")} / mês
                </span>
                <span className="text-xs text-emerald-800 font-semibold block mt-0.5">
                  Margem Líquida de {simOutput.netMarginPercent}% (após hosting, suporte e PIX)
                </span>
              </div>

              <div className="text-right sm:border-l sm:border-emerald-200 sm:pl-6">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Economia dos Motoristas vs 20%
                </span>
                <span className="text-xl font-black text-slate-900 block mt-0.5">
                  +R$ {simOutput.totalDriverSavingsVsUber20Brl.toLocaleString("pt-BR")}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">
                  Guardados no bolso dos parceiros
                </span>
              </div>
            </div>

            {/* Ponto de Equilíbrio & Sustentabilidade */}
            <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
              <span>
                Ponto de Equilíbrio (Breakeven): <b>{simOutput.breakevenDriversCount} motoristas ativos</b>
              </span>
              <span className="text-emerald-700 font-black">
                Sustentabilidade Financeira Comprovada ✓
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
