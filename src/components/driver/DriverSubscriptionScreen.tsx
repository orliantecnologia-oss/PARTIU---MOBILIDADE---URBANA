/**
 * ==============================================================================
 * 🚀 PARTIU DRIVER SUBSCRIPTION SCREEN (HIGH CONVERSION WHITE LABEL PAYWALL)
 * ==============================================================================
 * Tela otimizada e fluida para adesão/diária de motoristas e entregadores:
 * - 100% sincronizada com a paleta do administrador (ThemeEngine / useBrandTheme).
 * - Cabeçalho integrado com retorno ao Modo Passageiro e logo dinâmico.
 * - Seletor de Ciclo: Diária (24h), Semanal (7 dias) e Mensal (30 dias).
 * - Cards com destaque na cor primária/acento do tenant ativo.
 * - Geração dinâmica de PIX Copia e Cola e QR Code de alta legibilidade.
 * - Botão de ativação em modo de demonstração para testes rápidos sem atrito.
 * ==============================================================================
 */

import React, { useState, useEffect, memo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  TrendingUp,
  CreditCard,
  QrCode,
  Flame,
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { SubscriptionSuccessModal } from "@/components/driver/SubscriptionSuccessModal";
import { driverSubscriptionService } from "@/lib/ecosystem/driver-subscription-service";

export const DriverSubscriptionScreen = memo(function DriverSubscriptionScreen() {
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

  const {
    nomeApp,
    corPrimaria,
    corSecundaria,
    corTextoPrimaria,
    corCabecalhoInicio,
    corCabecalhoFim,
    branding,
  } = useBrandTheme();

  const [copiado, setCopiado] = useState(false);
  const [tabPagamento, setTabPagamento] = useState<"copiacola" | "qrcode">("copiacola");
  const [isGerandoPix, setIsGerandoPix] = useState(false);
  const [isSimulando, setIsSimulando] = useState(false);

  const accentColor = branding?.accent_color || corSecundaria || "#00C6FF";
  const surfaceColor = branding?.surface_color || "#1C2541";
  const bgColor = branding?.background_color || "#0B132B";
  const logoUrl = branding?.logo_url || "/favicon.svg";

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

  const handleSimularAtivacaoDemo = async () => {
    setIsSimulando(true);
    try {
      const driverId = accessDecision?.driverId || "demo-driver-01";
      await driverSubscriptionService.simulateDailyFeePayment(driverId, "CARRO");
      window.location.reload();
    } catch {
      window.location.reload();
    } finally {
      setIsSimulando(false);
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
    <div
      style={{ backgroundColor: bgColor }}
      className="fixed inset-0 z-40 text-white overflow-y-auto flex flex-col justify-between"
    >
      {/* Modal de Celebração de Liberação Instantânea */}
      <SubscriptionSuccessModal
        isOpen={showCelebration}
        onComplete={dismissCelebration}
      />

      {/* =================================================================== */}
      {/* 0. BARRA SUPERIOR DE NAVEGAÇÃO E RETORNO AO MODO PASSAGEIRO         */}
      {/* =================================================================== */}
      <div className="w-full border-b border-white/10 bg-black/20 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Modo Passageiro</span>
        </Link>

        <div className="flex items-center gap-2">
          {logoUrl && (
            <img src={logoUrl} alt={nomeApp} className="w-6 h-6 object-contain rounded-md" />
          )}
          <span className="font-black text-sm tracking-tight text-white">{nomeApp} Condutor</span>
        </div>

        <div
          style={{ backgroundColor: `${corPrimaria}30`, borderColor: `${accentColor}50`, color: accentColor }}
          className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wider hidden sm:block"
        >
          {branding?.tenant_id || "Oficial"}
        </div>
      </div>

      <div className="w-full max-w-xl mx-auto space-y-6 px-4 sm:px-6 pt-4 pb-12">
        {/* =================================================================== */}
        {/* 1. CABEÇALHO DE ALTA CONVERSÃO                                      */}
        {/* =================================================================== */}
        <div className="text-center space-y-2 pt-2">
          <div
            style={{
              backgroundColor: `${corPrimaria}25`,
              borderColor: `${accentColor}40`,
              color: accentColor,
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>0% Comissão • Modelo SaaS</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Aqui a corrida é sua. <br />
            <span style={{ color: accentColor }}>Ganhe até 100% do valor das viagens.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
            Esqueça taxas abusivas de 25% a 40%. No {nomeApp} você adquire sua diária pré-paga e fica com todo o dinheiro que faturar no dia.
          </p>
        </div>

        {/* =================================================================== */}
        {/* 2. DESTAQUES DE VALOR (PROPOSTA IRRECUSÁVEL)                       */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
          <div
            style={{ backgroundColor: `${surfaceColor}CC` }}
            className="p-3 rounded-2xl border border-white/10 space-y-1 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
            <span className="text-[11px] font-bold block text-slate-200">Sem Comissão</span>
            <span className="text-[9px] text-slate-400 block leading-tight">Zero desconto por corrida</span>
          </div>

          <div
            style={{ backgroundColor: `${surfaceColor}CC` }}
            className="p-3 rounded-2xl border border-white/10 space-y-1 shadow-sm"
          >
            <Zap className="w-4 h-4" style={{ color: corSecundaria }} />
            <span className="text-[11px] font-bold block text-slate-200">PIX D+0</span>
            <span className="text-[9px] text-slate-400 block leading-tight">Receba na hora na sua chave</span>
          </div>

          <div
            style={{ backgroundColor: `${surfaceColor}CC` }}
            className="p-3 rounded-2xl border border-white/10 space-y-1 shadow-sm"
          >
            <TrendingUp className="w-4 h-4" style={{ color: accentColor }} />
            <span className="text-[11px] font-bold block text-slate-200">Ilimitadas</span>
            <span className="text-[9px] text-slate-400 block leading-tight">Faça quantas corridas quiser</span>
          </div>

          <div
            style={{ backgroundColor: `${surfaceColor}CC` }}
            className="p-3 rounded-2xl border border-white/10 space-y-1 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" style={{ color: corSecundaria }} />
            <span className="text-[11px] font-bold block text-slate-200">Prioritário</span>
            <span className="text-[9px] text-slate-400 block leading-tight">Suporte humanizado 24h</span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 3. SELETOR DE CICLO: DIÁRIA / SEMANAL / MENSAL                     */}
        {/* =================================================================== */}
        <div
          style={{ backgroundColor: `${surfaceColor}AA` }}
          className="p-1 rounded-2xl border border-white/10 flex items-center gap-1 shadow-inner"
        >
          <button
            type="button"
            onClick={() => handleSelectCycle("DAILY")}
            style={
              cycleType === "DAILY"
                ? {
                    background: `linear-gradient(135deg, ${corCabecalhoInicio}, ${corCabecalhoFim})`,
                    color: corTextoPrimaria,
                    boxShadow: `0 4px 14px ${corPrimaria}40`,
                  }
                : {}
            }
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
              cycleType === "DAILY" ? "" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Diária (24h)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectCycle("WEEKLY")}
            style={
              cycleType === "WEEKLY"
                ? {
                    background: `linear-gradient(135deg, ${corCabecalhoInicio}, ${corCabecalhoFim})`,
                    color: corTextoPrimaria,
                    boxShadow: `0 4px 14px ${corPrimaria}40`,
                  }
                : {}
            }
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
              cycleType === "WEEKLY" ? "" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Semanal</span>
            <span
              style={{ backgroundColor: accentColor, color: "#0B132B" }}
              className="text-[9px] font-black px-1.5 py-0.2 rounded"
            >
              -15%
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectCycle("MONTHLY")}
            style={
              cycleType === "MONTHLY"
                ? {
                    background: `linear-gradient(135deg, ${corCabecalhoInicio}, ${corCabecalhoFim})`,
                    color: corTextoPrimaria,
                    boxShadow: `0 4px 14px ${corPrimaria}40`,
                  }
                : {}
            }
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
              cycleType === "MONTHLY" ? "" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Mensal</span>
            <span
              style={{ backgroundColor: accentColor, color: "#0B132B" }}
              className="text-[9px] font-black px-1.5 py-0.2 rounded"
            >
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
            const price =
              cycleType === "MONTHLY"
                ? plan.monthly_fee
                : cycleType === "WEEKLY"
                ? plan.weekly_fee
                : plan.daily_fee;

            return (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan(plan)}
                style={
                  isSelected
                    ? {
                        backgroundColor: `${surfaceColor}EE`,
                        borderColor: accentColor,
                        boxShadow: `0 8px 30px -4px ${corPrimaria}50`,
                      }
                    : {
                        backgroundColor: `${surfaceColor}88`,
                      }
                }
                className={`p-4 rounded-3xl border-2 transition cursor-pointer relative ${
                  isSelected ? "" : "border-white/10 hover:border-white/20"
                }`}
              >
                {plan.is_popular && (
                  <span
                    style={{
                      background: `linear-gradient(135deg, ${corCabecalhoInicio}, ${corCabecalhoFim})`,
                      color: corTextoPrimaria,
                    }}
                    className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-md border border-white/20"
                  >
                    MAIS ESCOLHIDO
                  </span>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">{plan.plan_name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                        {plan.priority_weight}x Despacho
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{plan.description}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-400 font-semibold block uppercase">
                      {cycleType === "MONTHLY" ? "30 Dias" : cycleType === "WEEKLY" ? "7 Dias" : "24 Horas"}
                    </span>
                    <span
                      style={{ color: accentColor }}
                      className="text-xl font-black"
                    >
                      R$ {price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-200">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
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
        <div
          style={{
            background: `linear-gradient(135deg, ${corPrimaria}25, ${surfaceColor})`,
            borderColor: `${corPrimaria}50`,
          }}
          className="p-3.5 rounded-2xl border flex items-center justify-between text-xs shadow-md"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 shrink-0" style={{ color: accentColor }} />
            <div>
              <span className="font-bold text-white block">Economia Estimada no Mês:</span>
              <span className="text-slate-400 text-[11px]">Comparado a 20% retido pelas plataformas tradicionais</span>
            </div>
          </div>
          <span
            style={{ color: accentColor }}
            className="text-base font-black shrink-0"
          >
            +R$ {economiaEstimada.toFixed(2)}
          </span>
        </div>

        {/* =================================================================== */}
        {/* 5. ÁREA DE PAGAMENTO PIX AUTOMATIZADA                               */}
        {/* =================================================================== */}
        <div
          style={{ backgroundColor: `${surfaceColor}F0` }}
          className="border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl text-center"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-left">
              <div
                style={{ backgroundColor: `${corPrimaria}30`, color: accentColor }}
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black"
              >
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Pagamento Instantâneo via PIX</h4>
                <p className="text-[11px] text-slate-400">Liberação automática em segundos pelo Webhook</p>
              </div>
            </div>

            <div className="flex gap-1 bg-black/40 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTabPagamento("copiacola")}
                style={tabPagamento === "copiacola" ? { backgroundColor: corPrimaria, color: corTextoPrimaria } : {}}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  tabPagamento === "copiacola" ? "" : "text-slate-400 hover:text-white"
                }`}
              >
                Copia e Cola
              </button>
              <button
                type="button"
                onClick={() => setTabPagamento("qrcode")}
                style={tabPagamento === "qrcode" ? { backgroundColor: corPrimaria, color: corTextoPrimaria } : {}}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  tabPagamento === "qrcode" ? "" : "text-slate-400 hover:text-white"
                }`}
              >
                QR Code
              </button>
            </div>
          </div>

          {isGerandoPix ? (
            <div className="py-8 space-y-2">
              <div
                style={{ borderColor: accentColor, borderTopColor: "transparent" }}
                className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
              />
              <p className="text-xs text-slate-400">Gerando cobrança PIX oficial...</p>
            </div>
          ) : tabPagamento === "copiacola" ? (
            <div className="space-y-3">
              <div className="p-3 bg-black/40 rounded-2xl border border-white/10 text-left font-mono text-xs text-slate-300 break-all select-all max-h-20 overflow-y-auto">
                {activeBilling?.pix_code || "Carregando código..."}
              </div>

              <button
                type="button"
                onClick={handleCopiarPix}
                style={{
                  background: `linear-gradient(135deg, ${corCabecalhoInicio}, ${corCabecalhoFim})`,
                  color: corTextoPrimaria,
                  boxShadow: `0 8px 25px -4px ${corPrimaria}60`,
                }}
                className="w-full h-14 rounded-2xl font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-white/20"
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
                <div className="w-48 h-48 mx-auto bg-black/30 rounded-2xl flex items-center justify-center text-slate-500">
                  <QrCode className="w-12 h-12" />
                </div>
              )}
              <p className="text-xs text-slate-400">
                Abra o app do seu banco e aponte a câmera para o QR Code acima.
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
            <span
              style={{ backgroundColor: accentColor }}
              className="w-2 h-2 rounded-full animate-ping"
            />
            <span>Aguardando confirmação bancária. A tela liberará automaticamente.</span>
          </div>

          {/* Botão de Liberação de Teste / Demonstração */}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleSimularAtivacaoDemo}
              disabled={isSimulando}
              className="w-full py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Zap className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>{isSimulando ? "Ativando acesso..." : "Entrar no Cockpit em Modo Demonstração (Teste)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
