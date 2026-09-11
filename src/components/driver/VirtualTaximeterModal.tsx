import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  Square,
  RotateCcw,
  Settings2,
  QrCode,
  Banknote,
  CheckCircle2,
  Copy,
  Clock,
  Gauge,
  MapPin,
  TrendingUp,
} from "lucide-react";
import QRCode from "qrcode";
import {
  virtualTaximeterService,
  type TaximeterState,
  type TaximeterReceipt,
  type TaximeterConfig,
} from "@/services/VirtualTaximeterService";
import { useBrandTheme } from "@/hooks/useBrandTheme";

interface VirtualTaximeterModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId?: string;
}

export const VirtualTaximeterModal: React.FC<VirtualTaximeterModalProps> = ({
  isOpen,
  onClose,
  driverId = "motorista-padrao",
}) => {
  const { corPrimaria, corSecundaria, corTextoPrimaria } = useBrandTheme();
  const brandGradient = `linear-gradient(135deg, ${corPrimaria}, ${corSecundaria})`;
  const [state, setState] = useState<TaximeterState>(() => virtualTaximeterService.getState());
  const [receipt, setReceipt] = useState<TaximeterReceipt | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [showConfig, setShowConfig] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Estados de edição de configuração
  const [baseFare, setBaseFare] = useState<string>(() => String(state.baseFareBrl));
  const [kmRate, setKmRate] = useState<string>(() => String(state.kmRateBrl));
  const [minuteRate, setMinuteRate] = useState<string>(() => String(state.minuteRateBrl));
  const [minFare, setMinFare] = useState<string>(() => String(state.minFareBrl));

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = virtualTaximeterService.subscribe((s) => {
      setState(s);
    });

    return unsubscribe;
  }, [isOpen]);

  // Gera o QR Code PIX quando um recibo é finalizado
  useEffect(() => {
    if (receipt?.pixCopiaECola) {
      QRCode.toDataURL(receipt.pixCopiaECola, {
        width: 240,
        margin: 1,
        color: {
          dark: "#020617",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.warn("[Taximeter] Falha ao gerar QR Code:", err));
    }
  }, [receipt]);

  if (!isOpen) return null;

  const handleStart = () => {
    virtualTaximeterService.start();
    setReceipt(null);
  };

  const handlePause = () => {
    virtualTaximeterService.pause();
  };

  const handleResume = () => {
    virtualTaximeterService.resume();
  };

  const handleFinish = () => {
    try {
      const rec = virtualTaximeterService.finish(driverId);
      setReceipt(rec);
    } catch (e: any) {
      alert(e.message || "Erro ao finalizar taxímetro.");
    }
  };

  const handleReset = () => {
    virtualTaximeterService.reset();
    setReceipt(null);
    setQrCodeDataUrl("");
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Partial<TaximeterConfig> = {
      baseFareBrl: parseFloat(baseFare) || 6.0,
      kmRateBrl: parseFloat(kmRate) || 2.5,
      minuteRateBrl: parseFloat(minuteRate) || 0.35,
      minFareBrl: parseFloat(minFare) || 10.0,
    };
    virtualTaximeterService.updateConfig(updated);
    setShowConfig(false);
  };

  const handleCopyPix = () => {
    if (receipt?.pixCopiaECola) {
      navigator.clipboard.writeText(receipt.pixCopiaECola);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const formatElapsed = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black shadow-xs"
              style={{ background: brandGradient, color: corTextoPrimaria }}
            >
              ⏱️
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Taxímetro Virtual Inteligente</h2>
              <span className="text-[11px] text-slate-400 font-medium">Corrida de Rua • Pega Direto</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {state.status === "IDLE" && (
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
                title="Ajustar Tarifas"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corpo do Taxímetro */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Se estiver no modo de ajuste de tarifa */}
          {showConfig ? (
            <form onSubmit={handleSaveConfig} className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-400" />
                Configurar Tarifas do Taxímetro
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Bandeirada (R$)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={baseFare}
                    onChange={(e) => setBaseFare(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-800 text-white font-bold text-sm border border-slate-700 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Valor por Km (R$)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={kmRate}
                    onChange={(e) => setKmRate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-800 text-white font-bold text-sm border border-slate-700 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Valor por Minuto (R$)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={minuteRate}
                    onChange={(e) => setMinuteRate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-800 text-white font-bold text-sm border border-slate-700 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Tarifa Mínima (R$)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={minFare}
                    onChange={(e) => setMinFare(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-800 text-white font-bold text-sm border border-slate-700 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer"
                >
                  Salvar Tarifas
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-4 h-11 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : receipt ? (
            /* Tela de Recibo Final e Pagamento PIX */
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                  Corrida Finalizada
                </span>
                <span className="text-3xl font-black text-white block">
                  {receipt.fareBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <span className="text-[11px] text-emerald-400/80 block">
                  Líquido Condutor: R$ {receipt.netDriverBrl.toFixed(2)} • Taxa Plataforma (10%): R$ {receipt.platformFeeBrl.toFixed(2)}
                </span>
              </div>

              {/* QR Code PIX */}
              {qrCodeDataUrl && (
                <div className="p-4 bg-white rounded-2xl text-center space-y-3 shadow-md">
                  <span className="text-xs font-black text-slate-900 block">
                    Escaneie para Pagar via PIX
                  </span>
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code PIX Taxímetro"
                    className="w-44 h-44 mx-auto rounded-xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedPix ? "Chave PIX Copiada!" : "Copiar Código PIX"}</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Pago em Dinheiro</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Nova Corrida</span>
                </button>
              </div>
            </div>
          ) : (
            /* Painel Principal de Telemetria e Velocímetro (Display LCD / OLED) */
            <div className="space-y-4">
              {/* Visor Principal do Taxímetro */}
              <div className="p-5 rounded-3xl bg-slate-950 border-2 border-slate-800 shadow-inner text-center space-y-1 relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2 pb-1 border-b border-slate-800/80">
                  <span>Tarifa Acumulada</span>
                  <span
                    className={`flex items-center gap-1 font-black ${
                      state.status === "RUNNING"
                        ? "text-emerald-400"
                        : state.status === "PAUSED"
                        ? "text-amber-400"
                        : "text-slate-500"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        state.status === "RUNNING"
                          ? "bg-emerald-400 animate-pulse"
                          : state.status === "PAUSED"
                          ? "bg-amber-400"
                          : "bg-slate-600"
                      }`}
                    />
                    {state.status === "RUNNING" ? "RODANDO" : state.status === "PAUSED" ? "EM ESPERA" : "AGUARDANDO"}
                  </span>
                </div>

                <div className="py-2">
                  <span className="text-4xl sm:text-5xl font-mono font-black text-emerald-400 tracking-tight block">
                    {state.currentFareBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center justify-center gap-2 pt-1 border-t border-slate-800/80">
                  <span>Bandeirada R$ {state.baseFareBrl.toFixed(2)}</span>
                  <span>•</span>
                  <span>R$ {state.kmRateBrl.toFixed(2)}/km</span>
                  <span>•</span>
                  <span>R$ {state.minuteRateBrl.toFixed(2)}/min</span>
                </div>
              </div>

              {/* 3 Mostradores Auxiliares (Velocidade, Distância e Tempo) */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Velocímetro */}
                <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-center text-slate-400 mb-1">
                    <Gauge className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xl font-mono font-black text-white block">
                    {state.currentSpeedKmH}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">km/h</span>
                </div>

                {/* Odômetro */}
                <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-center text-slate-400 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <span className="text-xl font-mono font-black text-white block">
                    {state.distanceKm.toFixed(2)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">km rodados</span>
                </div>

                {/* Cronômetro */}
                <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-center text-slate-400 mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="text-xl font-mono font-black text-white block">
                    {formatElapsed(state.elapsedSeconds)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">tempo</span>
                </div>
              </div>

              {/* Controles do Taxímetro */}
              <div className="pt-2">
                {state.status === "IDLE" ? (
                  <button
                    type="button"
                    onClick={handleStart}
                    style={{ background: brandGradient, color: corTextoPrimaria }}
                    className="w-full h-14 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 shadow-xl transition active:scale-98 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>INICIAR TAXÍMETRO (CORRIDA)</span>
                  </button>
                ) : state.status === "RUNNING" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handlePause}
                      className="h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md"
                    >
                      <Pause className="w-5 h-5 fill-current" />
                      <span>PAUSAR (ESPERA)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFinish}
                      className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md"
                    >
                      <Square className="w-5 h-5 fill-current" />
                      <span>FINALIZAR CORRIDA</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleResume}
                      className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>RETOMAR</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFinish}
                      className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md"
                    >
                      <Square className="w-5 h-5 fill-current" />
                      <span>FINALIZAR CORRIDA</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
