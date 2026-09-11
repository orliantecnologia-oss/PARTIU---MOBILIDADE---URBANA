/**
 * ==============================================================================
 * 🚀 PARTIU DRIVER SUBSCRIPTION SCREEN (HIGH CONVERSION SaaS PAYWALL)
 * ==============================================================================
 * Tela otimizada de alta conversão para acesso de motoristas e entregadores:
 * - Cabeçalho de autoridade: "Aqui a corrida é sua. Ganhe até 100% do valor das viagens."
 * - Seletor de Ciclo: Diária (24h), Semanal (7 dias) e Mensal (30 dias).
 * - Cards comparativos com economia estimada vs Uber/99 e pesos de despacho.
 * - Geração dinâmica de PIX Copia e Cola e QR Code de alta legibilidade.
 * - Zero botões de "já paguei": Liberação automática via Webhook + Realtime em < 2s.
 * ==============================================================================
 */

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Clock,
  TrendingUp,
  CreditCard,
  QrCode,
  Layers,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { SubscriptionSuccessModal } from "@/components/driver/SubscriptionSuccessModal";

export function DriverSubscriptionScreen() {
  const {
    plans,
    selectedPlan,
    setSelectedPlan,
    cycleType,
    setCycleType,
    activeBilling,
    generateBilling,
    showCelebration,
    dismissCelebration,
    accessDecision,
  } = useSubscription();

  const { corPrimaria, corTextoPrimaria } = useBrandTheme();

  const [copiado, setCopiado] = useState(false);
  const [tabPagamento, setTabPagamento] = useState<"copiacola" | "qrcode">("copiacola");
  const [isGerandoPix, setIsGerandoPix] = useState(false);

  // Gera cobrança inicial automaticamente caso não haja nenhuma pendente
  useEffect(() => {
    if (!activeBilling && selectedPlan) {
      setIsGerandoPix(true);
      void generateBilling(selectedPlan.id).finally(() => setIsGerandoPix(false));
    }
  }, [selectedPlan, cycleType]);

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setIsGerandoPix(true);
    void generateBilling(plan.id).finally(() => setIsGerandoPix(false));
  };

  const handleSelectCycle = (cycle: "DAILY" | "WEEKLY" | "MONTHLY") => {
    setCycleType(cycle);
  };

  const handleCopiarPix = () => {
    if (activeBilling?.pix_code) {
      navigator.clipboard.writeText(activeBilling.pix_code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  const currentPrice = selectedPlan
    ? cycleType === "MONTHLY"
      ? selectedPlan.monthly_fee
      : cycleType === "WEEKLY"
      ? selectedPlan.weekly_fee
      : selectedPlan.daily_fee
    : 14.90;

  // Estimativa de economia mensal vs taxa de 20-30% da concorrência
  const estimativaFaturamento = 4500;
  const economiaEstimada = Math.round(estimativaFaturamento * 0.22 - (selectedPlan?.monthly_fee || 199.90));

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 text-white overflow-y-auto flex flex-col justify-between p-4 sm:p-6">
      {/* Modal de Celebração de Liberação Instantânea */}
      <SubscriptionSuccessModal
        isOpen={showCelebration}
        onComplete={dismissCelebration}
      />

      <div className="w-full max-w-xl mx-auto space-y-6 pb-12">
        {/* =================================================================== */}
        {/* 1. CABEÇALHO DE ALTA CONVERSÃO                                      */}
        {/* =================================================================== */}
        <div className="text-center space-y-2 pt-2 sm:pt-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/30">
            <Flame className="w-3.5 h-3.5" />
            <span>0% Comissão • Modelo SaaS</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Aqui a corrida é sua. <br />
            <span className="text-emerald-400">Ganhe até 100% do valor das viagens.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Esqueça taxas abusivas de 25% a 40%. No PARTIU você adquire sua diária pré-paga e fica com todo o dinheiro que faturar no dia.
          </p>
        </div>

        {/* =================================================================== */}
        {/* 2. DESTAQUES DE VALOR (PROPOSTA IRRECUSÁVEL)                       */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-bold block text-slate-200">Sem Comissão</span>
            <span className="text-[9px] text-slate-500 block leading-tight">Zero desconto por corrida</span>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1">
            <Zap className="w-4 h-4 text-primary-600" />
            <span className="text-[11px] font-bold block text-slate-200">PIX D+0</span>
            <span className="text-[9px] text-slate-500 block leading-tight">Receba na hora na sua chave</span>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-[11px] font-bold block text-slate-200">Ilimitadas</span>
            <span className="text-[9px] text-slate-500 block leading-tight">Faça quantas corridas quiser</span>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span className="text-[11px] font-bold block text-slate-200">Prioritário</span>
            <span className="text-[9px] text-slate-500 block leading-tight">Suporte humanizado 24h</span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 3. SELETOR DE CICLO: DIÁRIA / SEMANAL / MENSAL                     */}
        {/* =================================================================== */}
        <div className="bg-slate-900/80 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSelectCycle("DAILY")}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
              cycleType === "DAILY"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Diária (24h)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectCycle("WEEKLY")}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
              cycleType === "WEEKLY"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Semanal</span>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-primary-600 text-slate-950">
              -15%
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectCycle("MONTHLY")}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
              cycleType === "MONTHLY"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Mensal</span>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-300 text-slate-950">
              Top
            </span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* 4. CARDS DE PLANOS CONFIGURÁVEIS                                    */}
        {/* =================================================================== */}
        <div className="space-y-3">
          {plans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            const price = cycleType === "MONTHLY"
              ? plan.monthly_fee
              : cycleType === "WEEKLY"
              ? plan.weekly_fee
              : plan.daily_fee;

            return (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan(plan)}
                className={`p-4 rounded-3xl border-2 transition cursor-pointer relative ${
                  isSelected
                    ? "bg-slate-900 border-emerald-400 shadow-xl shadow-emerald-500/10"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                {plan.is_popular && (
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-primary-600 text-slate-950 text-[10px] font-black shadow-sm">
                    MAIS ESCOLHIDO
                  </span>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">{plan.plan_name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {plan.priority_weight}x Despacho
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{plan.description}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-500 font-semibold block uppercase">
                      {cycleType === "MONTHLY" ? "30 Dias" : cycleType === "WEEKLY" ? "7 Dias" : "24 Horas"}
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      R$ {price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Card de Economia Estimada */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 to-slate-900 rounded-2xl border border-emerald-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">Economia Estimada no Mês:</span>
              <span className="text-slate-400 text-[11px]">Comparado a 20% retido pelas plataformas tradicionais</span>
            </div>
          </div>
          <span className="text-base font-black text-emerald-400 shrink-0">
            +R$ {economiaEstimada.toFixed(2)}
          </span>
        </div>

        {/* =================================================================== */}
        {/* 5. ÁREA DE PAGAMENTO PIX AUTOMATIZADA                               */}
        {/* =================================================================== */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl text-center">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Pagamento Instantâneo via PIX</h4>
                <p className="text-[11px] text-slate-400">Liberação automática em segundos pelo Webhook</p>
              </div>
            </div>

            <div className="flex gap-1 bg-slate-950 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTabPagamento("copiacola")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  tabPagamento === "copiacola"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Copia e Cola
              </button>
              <button
                type="button"
                onClick={() => setTabPagamento("qrcode")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  tabPagamento === "qrcode"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                QR Code
              </button>
            </div>
          </div>

          {isGerandoPix ? (
            <div className="py-8 space-y-2">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Gerando cobrança PIX oficial...</p>
            </div>
          ) : tabPagamento === "copiacola" ? (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 text-left font-mono text-xs text-slate-400 break-all select-all max-h-20 overflow-y-auto">
                {activeBilling?.pix_code || "Carregando código..."}
              </div>

              <button
                type="button"
                onClick={handleCopiarPix}
                style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                className="w-full h-14 rounded-2xl font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiado ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                <span>{copiado ? "CÓDIGO PIX COPIADO!" : `COPIAR PIX • R$ ${currentPrice.toFixed(2)}`}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBilling?.qr_code_url ? (
                <div className="w-48 h-48 mx-auto p-2 bg-white rounded-2xl shadow-md">
                  <img
                    src={activeBilling.qr_code_url}
                    alt="QR Code PIX"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500">
                  <QrCode className="w-12 h-12" />
                </div>
              )}
              <p className="text-xs text-slate-400">
                Abra o app do seu banco e aponte a câmera para o QR Code acima.
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Aguardando confirmação bancária. A tela liberará automaticamente.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
