/**
 * ==============================================================================
 * 📱 PARTIU DELIVERY PIN NUMPAD BOTTOM SHEET (v4.0)
 * ==============================================================================
 * Teclado numérico de alta precisão e ergonomia solar para o parceiro condutor.
 *
 * Funcionalidades:
 * 1. 4 slots numéricos OTP com visualização de alto contraste (sol aberto).
 * 2. Numpad nativo in-app com botões de 56px a 64px, sem abrir o teclado do celular.
 * 3. Animação de "shake" suave + bordas vermelhas + limpeza automática em caso de erro.
 * 4. Botão de emergência "Problemas com o PIN?" para suporte ou devolução reversa.
 * ==============================================================================
 */

import React, { useState, useEffect, memo } from "react";
import {
  KeyRound,
  ShieldCheck,
  Phone,
  RotateCcw,
  AlertTriangle,
  X,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { deliveryDualPinService } from "@/services/DeliveryDualPinService";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export interface DeliveryPinNumpadBottomSheetProps {
  isOpen: boolean;
  mode: "PICKUP" | "DROPOFF";
  deliveryId: string;
  driverId?: string;
  customerName?: string;
  expectedPinFallback?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  onStartReturn?: () => void;
}

export const DeliveryPinNumpadBottomSheet = memo(function DeliveryPinNumpadBottomSheet({
  isOpen,
  mode,
  deliveryId,
  driverId,
  customerName,
  expectedPinFallback,
  onSuccess,
  onCancel,
  onStartReturn,
}: DeliveryPinNumpadBottomSheetProps) {
  const { corPrimaria, corTextoPrimaria, corCabecalhoInicio, corCabecalhoFim, branding } = useBrandTheme();
  const accentColor = branding?.accent_color || corPrimaria || "#0088FF";
  const brandGradient = `linear-gradient(135deg, var(--header-gradient-start, ${corCabecalhoInicio}) 0%, var(--header-gradient-end, ${corCabecalhoFim}) 100%)`;

  const [digits, setDigits] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Reseta estado ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setDigits("");
      setErrorMessage(null);
      setIsShaking(false);
      setShowSupportModal(false);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const isPickup = mode === "PICKUP";
  const title = isPickup ? "Confirmar Coleta da Encomenda" : "Confirmar Entrega da Encomenda";
  const subtitle = isPickup
    ? `Solicite o PIN de Coleta (PIN 1) ao remetente ${customerName ? `(${customerName})` : ""} para iniciar a viagem.`
    : `Solicite o PIN de Entrega (PIN 2) a quem está recebendo o pacote ${customerName ? `(${customerName})` : ""}.`;

  const handlePressDigit = (num: string) => {
    if (digits.length >= 4 || isValidating) return;
    const nextDigits = digits + num;
    setDigits(nextDigits);
    setErrorMessage(null);

    // Auto-valida ao completar o 4º dígito
    if (nextDigits.length === 4) {
      void submitPin(nextDigits);
    }
  };

  const handleBackspace = () => {
    if (isValidating) return;
    setDigits((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    if (isValidating) return;
    setDigits("");
    setErrorMessage(null);
  };

  const triggerErrorShake = (msg: string) => {
    setErrorMessage(msg);
    setIsShaking(true);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    setTimeout(() => {
      setIsShaking(false);
      setDigits(""); // Limpeza automática dos campos
    }, 500);
  };

  const submitPin = async (pinValue: string) => {
    if (pinValue.length !== 4) return;
    setIsValidating(true);
    setErrorMessage(null);

    try {
      let result;
      if (isPickup) {
        result = await deliveryDualPinService.validatePickupPin(deliveryId, pinValue, driverId);
      } else {
        result = await deliveryDualPinService.validateDropoffPin(deliveryId, pinValue, driverId);
      }

      // Se não passou no backend mas bate com o fallback esperado (modo offline/demo)
      if (!result.success && expectedPinFallback && pinValue === expectedPinFallback) {
        result = {
          success: true,
          code: "VERIFIED" as const,
          message: isPickup ? "PIN 1 validado com sucesso!" : "PIN 2 validado com sucesso!",
        };
      }

      if (result.success) {
        onSuccess();
      } else {
        triggerErrorShake(result.message || "PIN incorreto. Verifique com o cliente.");
      }
    } catch (err: any) {
      triggerErrorShake("Erro de comunicação ao validar PIN. Tente novamente.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in slide-in-from-bottom duration-200 text-left">
          {/* Barra tátil superior */}
          <div className="w-12 h-1 rounded-full bg-slate-300 mx-auto" />

          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md inline-block border"
                style={{
                  backgroundColor: `${corPrimaria}10`,
                  color: corPrimaria,
                  borderColor: `${corPrimaria}25`,
                }}
              >
                {isPickup ? "● ETAPA 1 — COLETA" : "● ETAPA 2 — ENTREGA FINAL"}
              </span>
              <h2 className="text-lg font-black text-slate-950 mt-1">{title}</h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>
            </div>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center active:scale-95 transition"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Display dos 4 Dígitos OTP com Shake Animation */}
          <div
            className={`flex items-center justify-center gap-3 py-2 transition-transform ${
              isShaking ? "animate-shake" : ""
            }`}
          >
            {[0, 1, 2, 3].map((idx) => {
              const digit = digits[idx];
              const isCurrent = digits.length === idx;
              return (
                <div
                  key={idx}
                  className={`w-14 h-16 rounded-2xl flex items-center justify-center font-mono text-2xl font-black transition-all ${
                    errorMessage
                      ? "bg-rose-50 text-rose-700 border-2 border-rose-500 shadow-sm"
                      : digit
                      ? "bg-slate-50 text-slate-950 border-2 shadow-sm"
                      : isCurrent
                      ? "bg-white text-slate-950 border-2 border-slate-950 animate-pulse shadow-xs"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                  style={digit ? { borderColor: corPrimaria } : {}}
                >
                  {digit || "•"}
                </div>
              );
            })}
          </div>

          {/* Mensagem de Erro com Shake */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Teclado Numérico Solar de Alto Contraste (Numpad In-App) */}
          <div className="grid grid-cols-3 gap-2 pt-1 max-w-[320px] mx-auto">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePressDigit(num)}
                disabled={isValidating}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-950 font-black text-2xl flex items-center justify-center border-2 border-slate-200 active:scale-95 transition shadow-xs cursor-pointer select-none"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              disabled={isValidating}
              className="h-14 rounded-2xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 font-black text-xs flex items-center justify-center border border-rose-200 active:scale-95 transition cursor-pointer select-none"
            >
              Limpar
            </button>

            <button
              type="button"
              onClick={() => handlePressDigit("0")}
              disabled={isValidating}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-950 font-black text-2xl flex items-center justify-center border-2 border-slate-200 active:scale-95 transition shadow-xs cursor-pointer select-none"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              disabled={isValidating}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-lg flex items-center justify-center border border-slate-200 active:scale-95 transition cursor-pointer select-none"
            >
              ⌫
            </button>
          </div>

          {/* Botão de Validação Principal */}
          <button
            type="button"
            onClick={() => submitPin(digits)}
            disabled={digits.length < 4 || isValidating}
            style={{ background: brandGradient, color: corTextoPrimaria }}
            className="w-full h-14 rounded-2xl font-black text-sm shadow-xl transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {isValidating ? (
              <span>VALIDANDO CÓDIGO...</span>
            ) : (
              <>
                <span>{isPickup ? "CONFIRMAR COLETA & INICIAR" : "CONFIRMAR ENTREGA FINAL"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Botão de Emergência: Problemas com o PIN? */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold transition underline underline-offset-4 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Problemas com o PIN?</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Suporte de Emergência e Devolução */}
      {showSupportModal && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm" style={{ color: corPrimaria }}>
                <AlertTriangle className="w-5 h-5" style={{ color: accentColor }} />
                <span>Suporte ao Condutor</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Caso o cliente não saiba ou não tenha recebido a senha de 4 dígitos, escolha uma das opções
              abaixo:
            </p>

            <div className="space-y-2 pt-1">
              <a
                href="https://wa.me/5522999605162?text=Olá!%20Estou%20com%20problemas%20para%20validar%20o%20PIN%20de%20entrega%20no%20app%20Partiu."
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 transition"
              >
                <Phone className="w-4 h-4" style={{ color: corPrimaria }} />
                <span>Ligar para a Central {nomeApp}</span>
              </a>

              {onStartReturn && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSupportModal(false);
                    onStartReturn();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>Destinatário Ausente • Devolver Pacote</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2.5 text-center text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Voltar à digitação do PIN
            </button>
          </div>
        </div>
      )}

      {/* Animação CSS Shake Inline para garantia de compatibilidade */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </>
  );
});
