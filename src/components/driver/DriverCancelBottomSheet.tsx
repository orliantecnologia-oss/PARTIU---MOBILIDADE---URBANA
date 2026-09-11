import React, { useState, memo } from "react";
import {
  AlertTriangle,
  X,
  UserX,
  MapPinOff,
  Wrench,
  ShieldAlert,
  Car,
  HeartPulse,
  ChevronRight,
} from "lucide-react";

export type DriverCancelReasonCode =
  | "PASSENGER_REQUESTED"
  | "INACCESSIBLE_LOCATION"
  | "MECHANICAL_FAILURE"
  | "RISK_AREA"
  | "ACCIDENT"
  | "PERSONAL_EMERGENCY";

export interface DriverCancelReason {
  code: DriverCancelReasonCode;
  label: string;
  description: string;
  icon: React.ElementType;
}

export const DRIVER_CANCEL_REASONS: DriverCancelReason[] = [
  {
    code: "PASSENGER_REQUESTED",
    label: "Passageiro pediu cancelamento",
    description: "O passageiro solicitou cancelamento via chat ou ligação",
    icon: UserX,
  },
  {
    code: "INACCESSIBLE_LOCATION",
    label: "Local inacessível / Rua bloqueada",
    description: "Via interditada, obra, alagamento ou sem acesso veicular",
    icon: MapPinOff,
  },
  {
    code: "MECHANICAL_FAILURE",
    label: "Pane mecânica no veículo",
    description: "Pneu furado, superaquecimento ou falha operacional do carro/moto",
    icon: Wrench,
  },
  {
    code: "RISK_AREA",
    label: "Área de risco / Falta de segurança",
    description: "Local com risco iminente ou falta de condições de segurança",
    icon: ShieldAlert,
  },
  {
    code: "ACCIDENT",
    label: "Acidente ou sinistro",
    description: "Colisão ou incidente de trânsito durante o deslocamento",
    icon: Car,
  },
  {
    code: "PERSONAL_EMERGENCY",
    label: "Problema pessoal urgente",
    description: "Necessidade médica ou imprevisto familiar inadiável",
    icon: HeartPulse,
  },
];

interface DriverCancelBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reasonCode: DriverCancelReasonCode, reasonLabel: string) => void;
  isSubmitting?: boolean;
}

export const DriverCancelBottomSheet = memo(function DriverCancelBottomSheet({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: DriverCancelBottomSheetProps) {
  const [selectedCode, setSelectedCode] = useState<DriverCancelReasonCode | null>(null);

  if (!isOpen) return null;

  const selectedReason = DRIVER_CANCEL_REASONS.find((r) => r.code === selectedCode);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 animate-in slide-in-from-bottom duration-300 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Header com barra tátil */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950">Cancelar Corrida</h3>
              <p className="text-xs text-slate-500">Selecione o motivo justificado</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition active:scale-90 cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Motivos com scroll */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {DRIVER_CANCEL_REASONS.map((reason) => {
            const Icon = reason.icon;
            const isSelected = selectedCode === reason.code;

            return (
              <button
                key={reason.code}
                type="button"
                onClick={() => setSelectedCode(reason.code)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? "bg-rose-50/80 border-rose-400 shadow-sm"
                    : "bg-slate-50/70 hover:bg-slate-100/80 border-slate-200"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-rose-600 text-white"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4
                    className={`text-xs font-black truncate ${
                      isSelected ? "text-rose-950" : "text-slate-950"
                    }`}
                  >
                    {reason.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {reason.description}
                  </p>
                </div>
                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isSelected ? "text-rose-600 translate-x-0.5" : "text-slate-400"
                  }`}
                />
              </button>
            );
          })}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed mt-2">
            ⚠️ O cancelamento é auditado e georreferenciado pelo sistema. Cancelamentos sem motivo
            justificado podem impactar seu índice de aceitação.
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-slate-100 space-y-2 bg-white">
          <button
            type="button"
            disabled={!selectedCode || isSubmitting}
            onClick={() => {
              if (selectedReason) {
                onConfirm(selectedReason.code, selectedReason.label);
              }
            }}
            className="w-full h-13 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-xs sm:text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isSubmitting ? "CANCELANDO..." : "CONFIRMAR CANCELAMENTO"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs transition text-center cursor-pointer"
          >
            Voltar para a Corrida
          </button>
        </div>
      </div>
    </div>
  );
});
