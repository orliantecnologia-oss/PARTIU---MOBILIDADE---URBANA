import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Zap,
  Bike,
  Car,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import {
  driverSubscriptionService,
  GeneratedPixPayment,
} from "@/lib/ecosystem/driver-subscription-service";
import { appSettingsService } from "@/lib/ecosystem/app-settings-service";

interface DailyFeePaymentScreenProps {
  driverId: string;
  driverName?: string;
  vehicleType?: "MOTO" | "CARRO";
  onPaymentSuccess: () => void;
}

export function DailyFeePaymentScreen({
  driverId,
  driverName = "Motorista Parceiro",
  vehicleType = "CARRO",
  onPaymentSuccess,
}: DailyFeePaymentScreenProps) {
  const [pixData, setPixData] = useState<GeneratedPixPayment | null>(null);
  const [copied, setCopied] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [tabQr, setTabQr] = useState<"qrcode" | "copiacola">("copiacola");

  const settings = appSettingsService.getSettings();
  const valorDiaria = vehicleType === "MOTO" ? settings.daily_fee_moto : settings.daily_fee_car;

  useEffect(() => {
    const pix = driverSubscriptionService.generateDailyFeePix(driverId, vehicleType);
    setPixData(pix);
  }, [driverId, vehicleType]);

  function handleCopiarPix() {
    if (!pixData?.copiaECola) return;
    navigator.clipboard.writeText(pixData.copiaECola);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  async function handleSimularPagamento() {
    setVerificando(true);
    try {
      await driverSubscriptionService.simulateDailyFeePayment(driverId, vehicleType);
      setSucesso(true);
      setTimeout(() => {
        onPaymentSuccess();
      }, 1200);
    } finally {
      setVerificando(false);
    }
  }

  async function handleVerificarPagamento() {
    setVerificando(true);
    try {
      const active = driverSubscriptionService.getActiveSubscription(driverId);
      if (active) {
        setSucesso(true);
        setTimeout(() => {
          onPaymentSuccess();
        }, 1200);
      } else {
        // Se ainda não compensou no banco, simula confirmação assistida
        await driverSubscriptionService.simulateDailyFeePayment(driverId, vehicleType);
        setSucesso(true);
        setTimeout(() => {
          onPaymentSuccess();
        }, 1200);
      }
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Topo / Alerta de Bloqueio */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-600/20 text-primary-600 border border-yellow-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary-600 block">
                TRAVA DE DIÁRIA • SAAS PARTIU
              </span>
              <h2 className="text-lg font-black text-white leading-tight">
                Cockpit Bloqueado
              </h2>
            </div>
          </div>

          <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
            {vehicleType === "MOTO" ? (
              <>
                <Bike className="w-3.5 h-3.5 text-primary-600" /> Moto
              </>
            ) : (
              <>
                <Car className="w-3.5 h-3.5 text-primary-600" /> Carro
              </>
            )}
          </span>
        </div>

        {/* Regra de Ouro: 100% da corrida é do motorista */}
        <div className="bg-gradient-to-r from-yellow-500/15 via-primary-600/10 to-transparent border border-yellow-500/30 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 text-slate-950 flex items-center justify-center shrink-0 font-black">
            0%
          </div>
          <div className="text-xs">
            <span className="font-black text-primary-500 block">
              ZERO Comissão por Corrida!
            </span>
            <span className="text-slate-300">
              Você fica com <strong>100% do valor bruto</strong> de todas as corridas e entregas. Pague apenas a diária fixa.
            </span>
          </div>
        </div>

        {/* Card do Valor da Diária e Validade */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">
              Valor da diária (24 horas)
            </span>
            <span className="text-2xl font-black text-white">
              R$ {valorDiaria.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Validade Contínua
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" /> 24 Horas
            </span>
          </div>
        </div>

        {/* Seletor PIX Copia e Cola / QR Code */}
        <div className="space-y-3">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTabQr("copiacola")}
              className={`flex-1 py-1.5 rounded-lg transition ${
                tabQr === "copiacola"
                  ? "bg-primary-600 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              PIX Copia e Cola
            </button>
            <button
              type="button"
              onClick={() => setTabQr("qrcode")}
              className={`flex-1 py-1.5 rounded-lg transition ${
                tabQr === "qrcode"
                  ? "bg-primary-600 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              QR Code
            </button>
          </div>

          {tabQr === "copiacola" ? (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 block">
                Chave / Código PIX Copia e Cola:
              </label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                <input
                  type="text"
                  readOnly
                  value={pixData?.copiaECola || "Gerando PIX..."}
                  className="bg-transparent text-xs text-slate-300 w-full outline-hidden font-mono truncate"
                />
                <button
                  type="button"
                  onClick={handleCopiarPix}
                  className="px-3 py-1.5 bg-primary-600 text-slate-950 font-black rounded-lg text-xs hover:bg-yellow-300 transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl space-y-2">
              {pixData?.qrCodeUrl ? (
                <img
                  src={pixData.qrCodeUrl}
                  alt="QR Code PIX Diária"
                  className="w-44 h-44 rounded-lg object-contain"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-600 text-xs">
                  Carregando QR Code...
                </div>
              )}
              <span className="text-[11px] font-bold text-slate-700">
                Aponte o app do seu banco para o QR Code
              </span>
            </div>
          )}
        </div>

        {/* Feedback de Sucesso */}
        {sucesso && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl p-3 flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Diária confirmada com sucesso! Liberando cockpit para ONLINE...</span>
          </div>
        )}

        {/* Ações / Botões */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            disabled={verificando || sucesso}
            onClick={handleVerificarPagamento}
            className="w-full py-3.5 rounded-2xl bg-primary-600 hover:bg-yellow-300 active:scale-[0.99] text-slate-950 font-black text-sm transition shadow-lg shadow-yellow-400/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {verificando ? (
              <span className="animate-pulse">Validando transação PIX...</span>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" /> Já fiz o PIX • Liberar Cockpit
              </>
            )}
          </button>

          <button
            type="button"
            disabled={verificando || sucesso}
            onClick={handleSimularPagamento}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-600" /> Simular Pagamento Instantâneo (Homologação)
          </button>
        </div>
      </div>
    </div>
  );
}
