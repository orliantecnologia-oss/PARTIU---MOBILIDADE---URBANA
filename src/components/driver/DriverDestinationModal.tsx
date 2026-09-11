import React, { useState, memo } from "react";
import {
  X,
  Compass,
  Home,
  Building2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Trash2,
} from "lucide-react";
import {
  driverDestinationModeService,
  type DriverDestination,
} from "@/services/DriverDestinationModeService";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export interface DriverDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  onDestinationSet: (destination: DriverDestination | null) => void;
}

export const DriverDestinationModal: React.FC<DriverDestinationModalProps> = memo(({
  isOpen,
  onClose,
  driverId,
  onDestinationSet,
}) => {
  const { corPrimaria, corTextoPrimaria, corCabecalhoInicio, corCabecalhoFim, branding } = useBrandTheme();
  const accentColor = branding?.accent_color || corPrimaria || "#0088FF";
  const [addressInput, setAddressInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const remaining = driverDestinationModeService.getRemainingUses(driverId);
  const activeDest = driverDestinationModeService.getActiveDestination(driverId);

  const handleSetQuickDestination = (nome: string, coords: { lat: number; lng: number }) => {
    setErrorMsg(null);
    const res = driverDestinationModeService.setDestination(driverId, nome, coords);
    if (!res.success) {
      setErrorMsg(res.message || "Não foi possível ativar o Modo Destino.");
      return;
    }
    onDestinationSet(res.destination || null);
    onClose();
  };

  const handleSetCustomAddress = () => {
    if (!addressInput.trim()) {
      setErrorMsg("Por favor, digite o endereço de destino.");
      return;
    }
    setErrorMsg(null);
    // Coordenadas padrão em Itaperuna para simulação
    const res = driverDestinationModeService.setDestination(driverId, addressInput.trim(), {
      lat: -21.205,
      lng: -41.89,
    });
    if (!res.success) {
      setErrorMsg(res.message || "Não foi possível ativar o Modo Destino.");
      return;
    }
    onDestinationSet(res.destination || null);
    onClose();
  };

  const handleClearDestination = () => {
    driverDestinationModeService.clearDestination(driverId);
    onDestinationSet(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-900 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: `${corPrimaria}15`,
                color: corPrimaria,
              }}
            >
              <Compass className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950">Modo Destino ("Ir para Casa")</h3>
              <span className="text-[11px] text-slate-500 font-semibold block">
                {remaining} de 2 usos disponíveis hoje
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Destino Ativo Atual se Houver */}
        {activeDest && (
          <div
            className="p-3 rounded-2xl flex items-center justify-between border"
            style={{
              backgroundColor: `${accentColor}10`,
              borderColor: `${accentColor}35`,
            }}
          >
            <div className="min-w-0 pr-2">
              <div
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: corPrimaria }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span>Destino Ativo Agora</span>
              </div>
              <p className="text-xs font-black text-slate-900 truncate mt-0.5">
                {activeDest.address}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearDestination}
              className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black hover:bg-rose-100 transition flex items-center gap-1 shrink-0"
              title="Cancelar Modo Destino"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remover</span>
            </button>
          </div>
        )}

        {/* Mensagem de Erro / Limite */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Atalhos Rápidos */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
            Atalhos Rápidos
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={remaining <= 0 && !activeDest}
              onClick={() =>
                handleSetQuickDestination("Minha Casa - Centro", {
                  lat: -21.205,
                  lng: -41.89,
                })
              }
              className="p-3 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 text-left transition active:scale-95 disabled:opacity-50 flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Home className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-950 block">Minha Casa</span>
                <span className="text-[10px] text-slate-500 block truncate">Centro</span>
              </div>
            </button>

            <button
              type="button"
              disabled={remaining <= 0 && !activeDest}
              onClick={() =>
                handleSetQuickDestination("Garagem Central - Aeroporto", {
                  lat: -21.22,
                  lng: -41.88,
                })
              }
              className="p-3 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 text-left transition active:scale-95 disabled:opacity-50 flex items-center gap-2.5"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${accentColor}18`, color: corPrimaria }}
              >
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-950 block">Garagem</span>
                <span className="text-[10px] text-slate-500 block truncate">Aeroporto</span>
              </div>
            </button>
          </div>
        </div>

        {/* Input Manual de Destino */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
            Ou digite outro endereço:
          </span>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Ex: Rua Dez de Maio, Bairro Aeroporto..."
                className="w-full text-xs font-medium pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <button
              type="button"
              disabled={remaining <= 0 && !activeDest}
              onClick={handleSetCustomAddress}
              style={{
                background: `linear-gradient(135deg, var(--header-gradient-start, ${corCabecalhoInicio}) 0%, var(--header-gradient-end, ${corCabecalhoFim}) 100%)`,
                color: corTextoPrimaria || "#FFFFFF",
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-black shadow-md transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              Definir
            </button>
          </div>
        </div>

        {/* Explicação da Regra */}
        <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          💡 <strong>Como funciona:</strong> Ao ativar o Modo Destino, o Trip Radar filtrará apenas chamados que estejam na mesma direção da sua rota ou com desembarque a até 3,5 km do endereço escolhido.
        </p>

        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
});
