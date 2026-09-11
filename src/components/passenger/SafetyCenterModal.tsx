import React, { memo, useState } from "react";
import {
  ShieldCheck,
  Share2,
  PhoneCall,
  Headphones,
  X,
  Check,
  AlertTriangle,
  MapPin,
  Lock,
} from "lucide-react";

export interface SafetyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverName?: string | undefined;
  driverPlate?: string | undefined;
  origin?: string | undefined;
  destination?: string | undefined;
  rideId?: string | undefined;
}

export const SafetyCenterModal = memo(function SafetyCenterModal({
  isOpen,
  onClose,
  driverName = "Motorista Parceiro",
  driverPlate = "ABC1D23",
  origin = "Local de Embarque",
  destination = "Destino Selecionado",
  rideId = "partiu-ride",
}: SafetyCenterModalProps) {
  const [copied, setCopied] = useState(false);
  const [showPoliceConfirm, setShowPoliceConfirm] = useState(false);

  if (!isOpen) return null;

  const shareText = `Estou a bordo da PARTIU em viagem com o motorista ${driverName} (${driverPlate}). Destino: ${destination}. Rota acompanhada em tempo real.`;

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Acompanhar minha viagem PARTIU",
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch (err) {
        // Fallback para cópia
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText} Link: ${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCallPolice = () => {
    window.location.href = "tel:190";
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-center-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-left animate-in slide-in-from-bottom duration-200 select-none max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra tátil mobile */}
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-3 sm:hidden" />

        {/* Header Acessível */}
        <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="safety-center-title" className="text-sm font-black text-slate-900 leading-tight">
                Central de Segurança
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Recursos de proteção em tempo real</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Central de Segurança"
            className="w-11 h-11 flex items-center justify-center rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all touch-manipulation cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo de Segurança */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto">
          {/* Status de Proteção Ativa */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 leading-relaxed font-medium">
              <span className="font-black block text-emerald-900">Viagem Monitorada por Satélite</span>
              Sua rota é transmitida em tempo real com telemetria ativa e criptografia de ponta a ponta.
            </div>
          </div>

          {/* Ação 1: Compartilhar Rota em Tempo Real */}
          <button
            type="button"
            onClick={handleShare}
            className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-[0.99] transition border border-slate-200/80 flex items-center justify-between gap-3 text-left touch-manipulation cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary-600 text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-black">
                {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-slate-900">
                  {copied ? "Link Copiado com Sucesso!" : "Compartilhar Viagem"}
                </h4>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                  Envie sua localização e dados do motorista para familiares
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-amber-700 shrink-0">
              {copied ? "Copiado ✓" : "Enviar"}
            </span>
          </button>

          {/* Ação 2: Suporte Operacional PARTIU 24h */}
          <a
            href="tel:08007278482"
            className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-[0.99] transition border border-slate-200/80 flex items-center justify-between gap-3 text-left touch-manipulation cursor-pointer block"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-slate-900">Suporte Operacional 24h</h4>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                  Fale com a equipe de operações da PARTIU
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 shrink-0">0800</span>
          </a>

          {/* Ação 3: Emergência 190 (Polícia Militar) */}
          {showPoliceConfirm ? (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2.5 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="text-xs font-black">Ligar para a Polícia Militar (190)?</h4>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                Esta chamada deve ser utilizada exclusivamente em situações de emergência de segurança.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPoliceConfirm(false)}
                  className="flex-1 h-10 rounded-xl bg-white text-slate-700 font-bold text-xs border border-slate-200 touch-manipulation cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCallPolice}
                  className="flex-1 h-10 rounded-xl bg-rose-600 text-white font-black text-xs shadow-md active:scale-95 transition touch-manipulation cursor-pointer flex items-center justify-center gap-1"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>LIGAR 190</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPoliceConfirm(true)}
              className="w-full p-3.5 rounded-2xl bg-rose-50/70 hover:bg-rose-100/80 active:scale-[0.99] transition border border-rose-200 flex items-center justify-between gap-3 text-left touch-manipulation cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs font-black">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-rose-900">Emergência Policial (190)</h4>
                  <p className="text-[11px] text-rose-700 truncate mt-0.5">
                    Ligue diretamente para a central de emergência
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-rose-700 shrink-0">190</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 active:scale-95 transition touch-manipulation cursor-pointer"
          >
            Fechar Central de Segurança
          </button>
        </div>
      </div>
    </div>
  );
});
