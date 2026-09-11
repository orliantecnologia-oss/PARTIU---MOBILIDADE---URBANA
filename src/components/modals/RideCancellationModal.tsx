import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  X,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import {
  cancellationPolicyService,
  CANCELLATION_REASONS_PASSENGER,
  CANCELLATION_REASONS_DRIVER,
  type CancellationReason,
} from "@/services/CancellationPolicyService";

export interface RideCancellationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmCancel: (reason: CancellationReason) => void;
  userType?: "PASSENGER" | "DRIVER";
  acceptedAt?: string | number | Date | null;
  customFeeBrl?: number;
  isCancelling?: boolean;
}

export function RideCancellationModal({
  open,
  onClose,
  onConfirmCancel,
  userType = "PASSENGER",
  acceptedAt,
  customFeeBrl = 5.0,
  isCancelling = false,
}: RideCancellationModalProps) {
  const reasons =
    userType === "PASSENGER"
      ? CANCELLATION_REASONS_PASSENGER
      : CANCELLATION_REASONS_DRIVER;

  const [selectedReasonCode, setSelectedReasonCode] = useState<string>(
    reasons[0]?.code || "WAIT_TOO_LONG"
  );

  const policy = useMemo(() => {
    return cancellationPolicyService.evaluatePolicy(acceptedAt, 2, customFeeBrl);
  }, [acceptedAt, customFeeBrl]);

  if (!open) return null;

  const selectedReason =
    reasons.find((r) => r.code === selectedReasonCode) || reasons[0];

  // Se o motivo isentar de taxa (ex: motorista parado), avisa ao usuário
  const isExemptByReason = !selectedReason?.appliesFeeWhenLate;
  const willChargeFee = policy.shouldChargeFee && !isExemptByReason && userType === "PASSENGER";

  function handleConfirm() {
    if (selectedReason) {
      onConfirmCancel(selectedReason);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-end sm:items-center justify-center text-slate-900 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel do Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Cancelar Viagem?
              </h3>
              <p className="text-xs text-slate-400">
                Selecione o motivo para nos ajudar a melhorar o serviço
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Banner de Tolerância / Taxa */}
          {userType === "PASSENGER" && (
            <div>
              {willChargeFee ? (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-black text-amber-900 block">
                      Taxa de cancelamento: R$ {policy.cancellationFee.toFixed(2).replace(".", ",")}
                    </span>
                    <p className="text-amber-800/90 text-[11px] mt-0.5 leading-relaxed">
                      O motorista já se deslocou em sua direção por mais de 2 minutos. A taxa será
                      repassada integralmente ao condutor pelo combustível utilizado.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-black text-emerald-900 block">
                      {isExemptByReason
                        ? "Cancelamento Isento de Cobrança"
                        : `Cancelamento Gratuito (${cancellationPolicyService.formatFreeUntilTime(policy.freeCancellationUntil)})`}
                    </span>
                    <p className="text-emerald-800/90 text-[11px] mt-0.5 leading-relaxed">
                      {isExemptByReason
                        ? "Por se tratar de um imprevisto atribuído ao deslocamento, nenhuma taxa será cobrada."
                        : "Você está dentro da janela de carência de 2 minutos. Nenhuma taxa será cobrada."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista de Motivos */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Motivo do cancelamento:
            </label>
            {reasons.map((reason) => {
              const isSelected = selectedReasonCode === reason.code;
              return (
                <div
                  key={reason.code}
                  onClick={() => setSelectedReasonCode(reason.code)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-md"
                      : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationReason"
                    checked={isSelected}
                    onChange={() => setSelectedReasonCode(reason.code)}
                    className="mt-1 text-primary-600 focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold leading-tight ${isSelected ? "text-white" : "text-slate-900"}`}>
                      {reason.label}
                    </p>
                    <p className={`text-[11px] mt-0.5 line-clamp-2 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                      {reason.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé com botões de ação */}
        <div className="p-4 pb-6 bg-slate-50/70 border-t border-slate-100 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
          >
            Manter Corrida
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isCancelling}
            className="flex-1 py-3 px-4 rounded-xl font-black text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isCancelling ? "Cancelando..." : "Confirmar Cancelamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
