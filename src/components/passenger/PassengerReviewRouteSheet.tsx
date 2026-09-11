import React, { useState, useCallback, memo } from "react";
import {
  Bike,
  Car,
  Clock,
  Navigation,
  ArrowLeft,
  Banknote,
  QrCode,
  CreditCard,
  X,
  Plus,
  ChevronRight,
  User,
  Pencil,
  Check,
  ShieldCheck,
} from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useBottomSheetGesture } from "@/hooks/useBottomSheetGesture";
import { hapticFeedback } from "@/lib/haptics/haptic-feedback";
import { CategoryQuoteSkeleton } from "@/components/ui/skeleton";

/**
 * 🚗 PASSENGER REVIEW ROUTE SHEET (MODAL INFERIOR "CONFIRMAÇÃO DE CORRIDA")
 * ==============================================================================
 * Refatorado com arquitetura "Above the Fold":
 * 1. Altura compacta travada em ~46% a 50% da tela (sem rolagem/scroll).
 * 2. Seleção de Veículos lado a lado em Grid 2 colunas (Partiu Moto vs Partiu Carro).
 * 3. Seção de Pagamento compacta em linha única (célula com ChevronRight + modal secundário).
 * 4. Botão de Confirmação principal sempre visível e ancorado no rodapé.
 * 5. Mapa livre e respirando no fundo com máxima visibilidade do trajeto.
 * ==============================================================================
 */
export const PassengerReviewRouteSheet = memo(function PassengerReviewRouteSheet() {
  const {
    categoriaVeiculo,
    selectVehicle,
    formaPagamento,
    selectPaymentMethod,
    cotacoes,
    multiCategoryQuotes,
    distanciaKm,
    duracaoMin,
    origem,
    destino,
    startSearch,
    confirmPickupAndFindDriver,
    resetToIdle,
    pagamentoNaMaquininha,
    setPagamentoNaMaquininha,
    viajanteOutraPessoa,
    nomeOutroPassageiro,
    telefoneOutroPassageiro,
    setViajanteOutraPessoa,
    setNomeOutroPassageiro,
    paradas,
    adicionarParada,
    removerParada,
    paradaIntermediaria,
    setParadaIntermediaria,
    horarioDesembarquePrevisto,
    preferences,
    togglePreference,
  } = usePassengerRide();

  const { corPrimaria, corSecundaria, corTextoPrimaria } = useBrandTheme();

  // Modais secundários compactos para manter a tela principal 100% "Above the Fold"
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [modalParadaAberto, setModalParadaAberto] = useState(false);
  const [modalPassageiroAberto, setModalPassageiroAberto] = useState(false);
  const [inputParada, setInputParada] = useState(paradaIntermediaria || "");

  // Hook Gestual com Física de Mola e Snap Points calibrados para Zero Scroll (HALF 48% / COLLAPSED 38%)
  const { currentHeight, isDragging, handlers, activeSnapKey, snapTo } = useBottomSheetGesture({
    snapPoints: [
      { key: "COLLAPSED", height: 0.38 },
      { key: "HALF", height: 0.48 },
    ],
    initialSnapKey: "HALF",
  });

  const handleSelectCategory = useCallback((cat: "MOTO" | "CARRO") => {
    hapticFeedback.medium();
    selectVehicle(cat);
  }, [selectVehicle]);

  const handleOpenPayment = useCallback(() => {
    hapticFeedback.light();
    setModalPagamentoAberto(true);
  }, []);

  const handleConfirm = useCallback(() => {
    hapticFeedback.heavy();
    confirmPickupAndFindDriver();
  }, [confirmPickupAndFindDriver]);

  const handleBack = useCallback(() => {
    hapticFeedback.light();
    startSearch();
  }, [startSearch]);

  const handleCancel = useCallback(() => {
    hapticFeedback.light();
    resetToIdle();
  }, [resetToIdle]);

  // Cotações e métricas oficiais das duas categorias homologadas
  const isMoto = categoriaVeiculo === "MOTO";
  const quoteMoto = multiCategoryQuotes?.["PARTIU_MOTO"];
  const quoteCarro = multiCategoryQuotes?.["PARTIU_CARRO"];

  const precoMoto =
    quoteMoto?.formattedPrice ||
    (cotacoes?.moto?.precoBrl
      ? `R$ ${cotacoes.moto.precoBrl.toFixed(2).replace(".", ",")}`
      : "R$ 7,50");

  const precoCarro =
    quoteCarro?.formattedPrice ||
    (cotacoes?.carro?.precoBrl
      ? `R$ ${cotacoes.carro.precoBrl.toFixed(2).replace(".", ",")}`
      : "R$ 11,50");

  const pickupMinMoto = quoteMoto?.driverPickupMinutes ?? 3;
  const pickupMinCarro = quoteCarro?.driverPickupMinutes ?? 4;

  const precoAtivo = isMoto ? precoMoto : precoCarro;
  const nomeVeiculoAtivo = isMoto ? "Partiu Moto" : "Partiu Carro";

  // Metadados visuais do pagamento atual
  function getPaymentInfo() {
    if (pagamentoNaMaquininha) {
      return {
        label: "Maquininha do Motorista",
        sublabel: "Débito ou Crédito na maquininha",
        icon: CreditCard,
        color: "text-blue-600 bg-blue-50 border-blue-200",
      };
    }
    if (formaPagamento === "pix") {
      return {
        label: "PIX Direto",
        sublabel: "Pagar na chave do motorista",
        icon: QrCode,
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    }
    return {
      label: "Dinheiro em Espécie",
      sublabel: "Pagar ao motorista no desembarque",
      icon: Banknote,
      color: "text-amber-700 bg-primary-50 border-amber-200",
    };
  }

  const paymentInfo = getPaymentInfo();
  const PaymentIcon = paymentInfo.icon;

  function handleAdicionarParada() {
    if (inputParada.trim()) {
      adicionarParada(inputParada.trim());
      setInputParada("");
    }
  }

  return (
    <div
      data-hide-bottom-nav="true"
      className="w-full max-w-md mx-auto px-2.5 sm:px-4 pb-0.5 sm:pb-1 z-20 animate-in slide-in-from-bottom duration-300 pointer-events-auto"
    >
      {/* CARD PRINCIPAL: Altura compactada "Above the Fold" sem scroll vertical */}
      <div
        style={{
          height: currentHeight > 0 ? `${currentHeight}px` : undefined,
          transition: isDragging
            ? "none"
            : "height 260ms cubic-bezier(0.32, 0.72, 0, 1)",
          willChange: isDragging ? "height" : "auto",
        }}
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col text-left overflow-hidden select-none"
      >
        {/* ════════════════════════════════════════════════════════════════════
            SEÇÃO A — HEADER FIXO (NUNCA ROLA)
            ════════════════════════════════════════════════════════════════════ */}
        <div className="px-3.5 sm:px-4 pt-1 shrink-0">
          {/* BARRA SUPERIOR INDICADORA DE ARRASTE GESTUAL COM SPRING */}
          <div
            {...handlers}
            onClick={() => snapTo(activeSnapKey === "COLLAPSED" ? "HALF" : "COLLAPSED")}
            className="w-full pt-0.5 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none group"
            aria-label={activeSnapKey === "COLLAPSED" ? "Expandir detalhes da corrida" : "Recolher para visão compacta"}
          >
            <div
              className={`h-1.5 rounded-full transition-all duration-200 ${
                isDragging ? "bg-primary-600 w-12" : "bg-slate-300 w-10 group-hover:bg-slate-400"
              }`}
            />
          </div>

          {/* 1. HEADER COMPACTO: Voltar, Estimativas e Cancelar */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            {/* Botão Voltar */}
            <button
              type="button"
              onClick={handleBack}
              className="min-w-[38px] min-h-[38px] px-2 py-1 -ml-1 text-slate-700 hover:text-slate-950 hover:bg-slate-100 active:scale-95 rounded-xl transition cursor-pointer flex items-center gap-1 font-bold text-xs border border-slate-200/80 bg-white shadow-2xs"
              title="Voltar e alterar endereço"
              aria-label="Voltar para busca de endereço"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.4]" />
              <span>Voltar</span>
            </button>

            {/* Estimativas de Rota no Topo */}
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="text-slate-700 flex items-center gap-0.5">
                <Navigation className="w-3 h-3 text-primary-600" />
                {distanciaKm} km
              </span>
              <span className="text-slate-300">•</span>
              <span
                style={{
                  backgroundColor: `${corPrimaria || "#0088FF"}20`,
                  borderColor: `${corPrimaria || "#0088FF"}50`,
                }}
                className="text-slate-950 border px-2 py-0.5 rounded-full flex items-center gap-0.5 text-[11px] font-black"
              >
                <Clock className="w-2.5 h-2.5 text-primary-700 stroke-[2.5]" />
                ~{horarioDesembarquePrevisto || `${duracaoMin || 8} min`}
              </span>
            </div>

            {/* Botão Sair / Fechar */}
            <button
              type="button"
              onClick={handleCancel}
              className="min-w-[38px] min-h-[38px] rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:scale-90 transition cursor-pointer flex items-center justify-center border border-slate-200/60 bg-white shadow-2xs"
              title="Cancelar e voltar ao mapa"
              aria-label="Cancelar e voltar ao mapa"
            >
              <X className="w-3.5 h-3.5 stroke-[2.4]" />
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SEÇÃO B — CONTEÚDO PRINCIPAL (100% VISÍVEL, ZERO SCROLL)
            Flexbox puro e responsivo sem scrollbars ou containers roláveis
            ════════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col justify-between px-3.5 sm:px-4 py-1 space-y-1.5 overflow-hidden">

          {/* 1.1 FITA MINIMALISTA DE TRAJETO (EMBARQUE -> DESTINO) */}
          <div
            onClick={startSearch}
            className="flex items-center justify-between gap-2 py-1 px-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition cursor-pointer text-xs shrink-0"
            title="Clique para editar rota"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-200" />
              <span className="font-semibold text-slate-800 truncate max-w-[42%]">
                {origem || "Local Atual"}
              </span>
              <span className="text-slate-400 font-black">→</span>
              <div
                style={{ backgroundColor: corPrimaria || "#0088FF" }}
                className="w-2 h-2 rounded-full shrink-0 ring-2 ring-slate-400/40"
              />
              <span className="font-bold text-slate-950 truncate max-w-[42%]">
                {destino || "Destino"}
              </span>
            </div>
            <Pencil className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </div>

          {/* 2. SELEÇÃO DE VEÍCULOS (LADO A LADO - GRID DE 2 COLUNAS ESTILO 99) */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            {/* CARD 1: PARTIU MOTO */}
            <button
              type="button"
              onClick={() => handleSelectCategory("MOTO")}
              style={
                isMoto
                  ? {
                      borderColor: corPrimaria || "#0088FF",
                      backgroundColor: `${corPrimaria || "#0088FF"}15`,
                      boxShadow: `0 4px 14px -2px ${corPrimaria || "#0088FF"}70`,
                    }
                  : undefined
              }
              className={`p-2 sm:p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden active:scale-[0.97] hover:scale-[1.01] duration-150 ${
                isMoto
                  ? "ring-2 ring-primary-600/50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  style={
                    isMoto
                      ? {
                          backgroundColor: corPrimaria || "#0088FF",
                          color: "#FFFFFF",
                        }
                      : undefined
                  }
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    isMoto ? "shadow-2xs" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Bike className="w-4 h-4 stroke-[2.4]" />
                </div>
                <span className="text-[9.5px] font-black uppercase tracking-wide text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-md">
                  Econômico
                </span>
              </div>

              <div className="mt-1">
                <span className="text-xs sm:text-[13px] font-black text-slate-950 block truncate">
                  Partiu Moto
                </span>
                <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium block truncate">
                  ~{pickupMinMoto} min • 1 pessoa
                </span>
                <span
                  style={isMoto ? { color: corSecundaria || "#0F172A" } : undefined}
                  className="text-sm sm:text-base font-black text-slate-950 block mt-0.5 tracking-tight"
                >
                  {precoMoto}
                </span>
              </div>
            </button>

            {/* CARD 2: PARTIU CARRO */}
            <button
              type="button"
              onClick={() => handleSelectCategory("CARRO")}
              style={
                !isMoto
                  ? {
                      borderColor: corPrimaria || "#0088FF",
                      backgroundColor: `${corPrimaria || "#0088FF"}15`,
                      boxShadow: `0 4px 14px -2px ${corPrimaria || "#0088FF"}70`,
                    }
                  : undefined
              }
              className={`p-2 sm:p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden active:scale-[0.97] hover:scale-[1.01] duration-150 ${
                !isMoto
                  ? "ring-2 ring-primary-600/50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  style={
                    !isMoto
                      ? {
                          backgroundColor: corPrimaria || "#0088FF",
                          color: "#FFFFFF",
                        }
                      : undefined
                  }
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    !isMoto ? "shadow-2xs" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Car className="w-4 h-4 stroke-[2.4]" />
                </div>
                <span className="text-[9.5px] font-black uppercase tracking-wide text-amber-900 bg-primary-50/90 px-1.5 py-0.5 rounded-md">
                  Conforto
                </span>
              </div>

              <div className="mt-1">
                <span className="text-xs sm:text-[13px] font-black text-slate-950 block truncate">
                  Partiu Carro
                </span>
                <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium block truncate">
                  ~{pickupMinCarro} min • 4 lugares
                </span>
                <span
                  style={!isMoto ? { color: corSecundaria || "#0F172A" } : undefined}
                  className="text-sm sm:text-base font-black text-slate-950 block mt-0.5 tracking-tight"
                >
                  {precoCarro}
                </span>
              </div>
            </button>
          </div>

          {/* 3. SEÇÃO DE PAGAMENTO (COMPACTA EM LINHA ÚNICA / CÉLULA) */}
          <div
            onClick={handleOpenPayment}
            className="min-h-[40px] flex items-center justify-between p-1.5 sm:p-2 rounded-xl bg-slate-50/95 border border-slate-200/80 hover:bg-slate-100/80 active:scale-[0.99] transition-all duration-150 cursor-pointer shadow-2xs group shrink-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs ${paymentInfo.color}`}
              >
                <PaymentIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-black text-slate-950 truncate">
                    {paymentInfo.label}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 transition">
                    • Trocar
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 block truncate">
                  {paymentInfo.sublabel}
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-900 group-hover:translate-x-0.5 transition shrink-0" />
          </div>

          {/* 3.1 CHIPS DE OPÇÕES EXTRAS (PARADA / PASSAGEIRO) */}
          <div className="flex items-center justify-between gap-1.5 shrink-0">
            {/* Chip de Parada */}
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  hapticFeedback.light();
                  setModalParadaAberto(true);
                }}
                className={`min-h-[34px] sm:min-h-[36px] w-full flex items-center justify-between gap-1 font-bold text-[11px] px-2 py-0.5 rounded-xl border transition active:scale-95 cursor-pointer ${
                  paradas.length > 0
                    ? "bg-primary-50 text-amber-950 border-primary-500"
                    : "bg-slate-100/90 text-slate-700 hover:text-slate-950 border-slate-200/80"
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  <Plus className="w-3 h-3 text-primary-700 stroke-[2.5] shrink-0" />
                  <span className="truncate">
                    {paradas.length === 0
                      ? "+ Parada"
                      : paradas.length === 1
                      ? `1 Parada: ${paradas[0].endereco.slice(0, 10)}...`
                      : `2 Paradas (+R$ 5,00)`}
                  </span>
                </div>
                {paradas.length > 0 && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Remover paradas intermediárias"
                    onClick={(e) => {
                      e.stopPropagation();
                      hapticFeedback.light();
                      setParadaIntermediaria(null);
                    }}
                    className="w-5 h-5 -mr-0.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center font-black active:scale-90 transition shrink-0 text-[10px]"
                  >
                    ✕
                  </span>
                )}
              </button>
            </div>

            {/* Chip de Passageiro */}
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  hapticFeedback.light();
                  setModalPassageiroAberto(true);
                }}
                className={`min-h-[34px] sm:min-h-[36px] w-full flex items-center justify-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-xl border transition active:scale-95 cursor-pointer ${
                  viajanteOutraPessoa
                    ? "bg-blue-50 text-blue-950 border-blue-300"
                    : "bg-slate-100/90 text-slate-700 hover:text-slate-950 border-slate-200/80"
                }`}
              >
                <User className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="truncate">
                  {viajanteOutraPessoa
                    ? (nomeOutroPassageiro ? `Para: ${nomeOutroPassageiro.slice(0, 12)}` : "Outra pessoa")
                    : "Para mim"}
                </span>
              </button>
            </div>

            {/* Chip 99Mulher (Segurança Feminina) */}
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  hapticFeedback.medium();
                  togglePreference("isFemaleOnly");
                }}
                className={`min-h-[34px] sm:min-h-[36px] w-full flex items-center justify-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-xl border transition active:scale-95 cursor-pointer ${
                  preferences?.isFemaleOnly
                    ? "bg-purple-100 text-purple-950 border-purple-400 shadow-2xs font-black"
                    : "bg-slate-100/90 text-slate-700 hover:text-slate-950 border-slate-200/80"
                }`}
                title="99Mulher — Apenas motoristas mulheres"
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${preferences?.isFemaleOnly ? "text-purple-700 stroke-[2.4]" : "text-slate-500"} shrink-0`} />
                <span className="truncate">
                  {preferences?.isFemaleOnly ? "99Mulher" : "99Mulher"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SEÇÃO C — FOOTER FIXO (NUNCA ROLA, NUNCA SAI DA TELA)
            Ancorado ao Safe Area inferior com visibilidade permanente e sombra
            ════════════════════════════════════════════════════════════════════ */}
        <div className="px-3.5 sm:px-4 pt-1.5 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))] shrink-0 border-t border-slate-100/90 bg-white/80 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
              color: "#FFFFFF",
              borderRadius: 16,
              boxShadow: "0 8px 24px -4px rgba(0, 51, 102, 0.35), 0 4px 12px -2px rgba(0, 136, 255, 0.25)",
            }}
            className="w-full py-3 px-4 min-h-[50px] font-bold text-sm sm:text-base active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer hover:brightness-105 touch-manipulation"
          >
            <span>Confirmar {nomeVeiculoAtivo}</span>
            <span className="text-sm opacity-90 font-bold">• {precoAtivo}</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL SECUNDÁRIO COMPACTO: SELEÇÃO DA FORMA DE PAGAMENTO */}
      {/* ===================================================================== */}
      {modalPagamentoAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-4 sm:p-5 space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-250">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-950">Forma de Pagamento</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Pagamento direto ao motorista no desembarque
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalPagamentoAberto(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {/* OPÇÃO 1: PIX DIRETO */}
              <button
                type="button"
                onClick={() => {
                  selectPaymentMethod("pix");
                  setPagamentoNaMaquininha(false);
                  setModalPagamentoAberto(false);
                }}
                className={`w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between transition cursor-pointer ${
                  formaPagamento === "pix" && !pagamentoNaMaquininha
                    ? "border-emerald-500 bg-emerald-50/50 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-950 block">PIX Direto</span>
                    <span className="text-[10.5px] text-slate-500 block">
                      Transferência instantânea para a chave do motorista
                    </span>
                  </div>
                </div>
                {formaPagamento === "pix" && !pagamentoNaMaquininha && (
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                )}
              </button>

              {/* OPÇÃO 2: DINHEIRO EM ESPÉCIE */}
              <button
                type="button"
                onClick={() => {
                  selectPaymentMethod("dinheiro");
                  setPagamentoNaMaquininha(false);
                  setModalPagamentoAberto(false);
                }}
                className={`w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between transition cursor-pointer ${
                  formaPagamento === "dinheiro" && !pagamentoNaMaquininha
                    ? "border-primary-600 bg-primary-50/50 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Banknote className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-950 block">Dinheiro</span>
                    <span className="text-[10.5px] text-slate-500 block">
                      Pagar em espécie diretamente ao condutor
                    </span>
                  </div>
                </div>
                {formaPagamento === "dinheiro" && !pagamentoNaMaquininha && (
                  <Check className="w-4 h-4 text-primary-700 stroke-[3]" />
                )}
              </button>

              {/* OPÇÃO 3: MAQUININHA DO MOTORISTA */}
              <button
                type="button"
                onClick={() => {
                  selectPaymentMethod("dinheiro");
                  setPagamentoNaMaquininha(true);
                  setModalPagamentoAberto(false);
                }}
                className={`w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between transition cursor-pointer ${
                  pagamentoNaMaquininha
                    ? "border-blue-500 bg-blue-50/50 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-950 block">
                      Maquininha do Motorista
                    </span>
                    <span className="text-[10.5px] text-slate-500 block">
                      Cartão de Débito ou Crédito na maquininha própria
                    </span>
                  </div>
                </div>
                {pagamentoNaMaquininha && (
                  <Check className="w-4 h-4 text-blue-600 stroke-[3]" />
                )}
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setModalPagamentoAberto(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL SECUNDÁRIO: ADICIONAR PARADA INTERMEDIÁRIA */}
      {/* ===================================================================== */}
      {modalParadaAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-black text-slate-950">
                  Paradas no Trajeto
                </h3>
                <p className="text-[10px] text-slate-500">
                  Adicione até 2 paradas intermediárias (+ R$ 2,50/parada)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalParadaAberto(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TRAJETO DETALHADO */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
              {/* Ponto 1: Origem */}
              <div className="flex items-center gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Embarque</span>
                  <span className="font-semibold text-slate-800 truncate block text-[11px]">{origem}</span>
                </div>
              </div>

              {/* Lista de Paradas Cadastradas */}
              {paradas.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-xl animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase font-black text-amber-700 block">Parada {idx + 1}</span>
                      <span className="font-bold text-amber-950 truncate block text-[11px]">{p.endereco}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      hapticFeedback.light();
                      removerParada(p.id);
                    }}
                    className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100/60 rounded-lg text-[10px] font-bold shrink-0 transition"
                  >
                    Remover
                  </button>
                </div>
              ))}

              {/* Campo para Adicionar Parada (se < 2) */}
              {paradas.length < 2 ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={inputParada}
                      onChange={(e) => setInputParada(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAdicionarParada();
                        }
                      }}
                      placeholder={paradas.length === 0 ? "Endereço da 1ª parada..." : "Endereço da 2ª parada..."}
                      className="flex-1 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={!inputParada.trim()}
                      onClick={() => {
                        hapticFeedback.light();
                        handleAdicionarParada();
                      }}
                      className="px-3 py-2.5 rounded-xl bg-primary-600 disabled:opacity-40 text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs transition active:scale-95"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-xl text-center font-medium border border-amber-100">
                  ✓ Limite máximo de 2 paradas intermediárias atingido.
                </p>
              )}

              {/* Ponto Final: Destino */}
              <div className="flex items-center gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Destino</span>
                  <span className="font-semibold text-slate-800 truncate block text-[11px]">{destino}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setModalParadaAberto(false)}
                style={{
                  backgroundColor: corPrimaria || "#0088FF",
                  color: "#FFFFFF",
                }}
                className="w-full py-2.5 rounded-xl text-xs font-black shadow-md cursor-pointer hover:brightness-105 active:scale-98 transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL SECUNDÁRIO: ESCOLHA DO PASSAGEIRO */}
      {/* ===================================================================== */}
      {modalPassageiroAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-950">Quem vai embarcar?</h3>
              <button
                type="button"
                onClick={() => setModalPassageiroAberto(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setViajanteOutraPessoa(false)}
                style={
                  !viajanteOutraPessoa
                    ? {
                        backgroundColor: corPrimaria || "#0088FF",
                        color: "#FFFFFF",
                      }
                    : undefined
                }
                className={`py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                  !viajanteOutraPessoa
                    ? "border-transparent shadow-xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Para mim
              </button>

              <button
                type="button"
                onClick={() => setViajanteOutraPessoa(true)}
                style={
                  viajanteOutraPessoa
                    ? {
                        backgroundColor: corPrimaria || "#0088FF",
                        color: "#FFFFFF",
                      }
                    : undefined
                }
                className={`py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                  viajanteOutraPessoa
                    ? "border-transparent shadow-xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Outra pessoa
              </button>
            </div>

            {viajanteOutraPessoa && (
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Nome de quem vai embarcar
                  </label>
                  <input
                    type="text"
                    value={nomeOutroPassageiro}
                    onChange={(e) => setNomeOutroPassageiro(e.target.value)}
                    placeholder="Nome completo (ex: Maria Silva)..."
                    className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#0088FF]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Telefone para o motorista ligar / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={telefoneOutroPassageiro}
                    onChange={(e) => setTelefoneOutroPassageiro(e.target.value)}
                    placeholder="(22) 99999-9999"
                    className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#0088FF]"
                  />
                </div>
                <p className="text-[10.5px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  💡 O motorista verá que a corrida foi pedida por você e poderá falar diretamente com quem vai embarcar.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setModalPassageiroAberto(false)}
              style={{
                backgroundColor: corPrimaria || "#0088FF",
                color: "#FFFFFF",
              }}
              className="w-full py-2.5 rounded-xl text-xs font-black shadow-md cursor-pointer mt-1"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
