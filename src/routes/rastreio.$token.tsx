import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Package,
  MapPin,
  Clock,
  ShieldCheck,
  Phone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { deliveryTrackingEngine, PublicTrackingData } from "@/lib/delivery";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export const Route = createFileRoute("/rastreio/$token")({
  head: () => ({
    meta: [
      { title: "Rastreamento da Encomenda | PARTIU" },
      {
        name: "description",
        content: "Acompanhe a sua entrega PARTIU em tempo real com localização ao vivo e código de liberação.",
      },
    ],
  }),
  component: PublicTrackingPage,
});

export function PublicTrackingPage() {
  const { token } = Route.useParams();
  const { nomeApp, corPrimaria, corTextoPrimaria } = useBrandTheme();

  const [trackingData, setTrackingData] = useState<PublicTrackingData | null>(() =>
    deliveryTrackingEngine.getPublicTrackingView(token)
  );
  const [copiado, setCopiado] = useState(false);

  // Polling / Realtime Refresh
  useEffect(() => {
    function refresh() {
      const data = deliveryTrackingEngine.getPublicTrackingView(token);
      setTrackingData(data);
    }

    refresh();
    const interval = setInterval(refresh, 2500);

    const handleUpdate = () => refresh();
    window.addEventListener("partiu:delivery-atualizada", handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("partiu:delivery-atualizada", handleUpdate);
    };
  }, [token]);

  function handleCopiarPin() {
    if (trackingData?.expectedOtp) {
      navigator.clipboard.writeText(trackingData.expectedOtp);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  if (!trackingData) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-primary-600 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-slate-100">Entrega Não Localizada</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-xs">
          O link de rastreamento pode ter expirado ou o código informado é inválido.
        </p>
        <Link
          to="/"
          className="mt-6 px-6 py-3 rounded-2xl bg-[#0088FF] text-slate-950 font-black text-sm active:scale-95 transition"
        >
          Voltar ao Início
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 w-full max-w-md mx-auto pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      {/* Top Header */}
      <div className="space-y-4">
        <header className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
              className="w-10 h-10 rounded-2xl font-black flex items-center justify-center text-lg shadow-sm"
            >
              📦
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0088FF] block">
                {nomeApp} Entrega ao Vivo
              </span>
              <h1 className="text-base font-black text-slate-100 leading-tight">
                {trackingData.trackingCode}
              </h1>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Ao Vivo
          </span>
        </header>

        {/* Status Card com Alerta de Logística Reversa se Ativa */}
        <div className="p-4 rounded-3xl bg-slate-800/90 border border-slate-700 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Status da Encomenda</span>
            <span className="text-[11px] font-bold text-primary-600">
              {trackingData.vehicleType}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {trackingData.isReturnActive ? (
              <RotateCcw className="w-5 h-5 text-rose-400 animate-spin" />
            ) : (
              <Package className="w-5 h-5 text-[#0088FF]" />
            )}
            <h2 className="text-lg font-black text-slate-100 leading-tight">
              {trackingData.statusLabel}
            </h2>
          </div>

          {trackingData.isReturnActive && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
              <span className="font-bold block">⚠️ Devolução em Andamento</span>
              <p className="text-[11px] text-rose-300/80">
                O entregador não conseguiu localizar o destinatário e está retornando a encomenda ao remetente ({trackingData.senderFirstName}).
              </p>
            </div>
          )}

          {/* Endereço de Destino Atual */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex items-start gap-2.5 text-xs">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Destino Atual:</span>
              <p className="font-semibold text-slate-200 truncate">{trackingData.currentStopAddress}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Destinatário: <span className="text-slate-300 font-bold">{trackingData.recipientName}</span> ({trackingData.recipientMaskedPhone})
              </p>
            </div>
          </div>
        </div>

        {/* BOX DE DESTAQUE: CÓDIGO DE LIBERAÇÃO / PIN PARA O DESTINATÁRIO */}
        {trackingData.expectedOtp && !trackingData.isReturnActive && trackingData.status !== "COMPLETED" && (
          <div className="p-4 rounded-3xl bg-primary-600/10 border-2 border-primary-600/50 shadow-lg text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-primary-600 text-xs font-black uppercase tracking-wider">
              <KeyRound className="w-4 h-4" />
              <span>Seu Código de Liberação</span>
            </div>
            <p className="text-xs text-slate-300">
              Informe estes 4 dígitos ao entregador para receber seu pacote:
            </p>
            <div className="flex items-center justify-center gap-3 py-1">
              <span className="font-mono text-3xl font-black tracking-widest text-[#0088FF] bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 shadow-inner">
                {trackingData.expectedOtp}
              </span>
              <button
                type="button"
                onClick={handleCopiarPin}
                className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition"
                title="Copiar código"
              >
                {copiado ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* Informações do Entregador */}
        {trackingData.driverInfo && (
          <div className="p-4 rounded-3xl bg-slate-800/90 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-700 font-black text-slate-200 flex items-center justify-center border border-slate-600">
                {trackingData.driverInfo.firstName.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100">
                  {trackingData.driverInfo.firstName}
                </h3>
                <p className="text-xs text-slate-400">
                  {trackingData.driverInfo.vehicleModel} •{" "}
                  <span className="font-mono text-primary-600 font-bold">
                    {trackingData.driverInfo.vehiclePlate}
                  </span>
                </p>
                <span className="text-[10px] text-primary-600 font-bold">
                  ★ {trackingData.driverInfo.rating}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Linha do Tempo das Paradas */}
        <div className="p-4 rounded-3xl bg-slate-800/90 border border-slate-700 space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Linha do Tempo
          </h4>
          <div className="space-y-2.5 pt-1">
            {trackingData.stopsTimeline.map((stop, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs">
                <div className="mt-0.5">
                  {stop.status === "COMPLETED" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-600 flex items-center justify-center text-[9px] text-slate-400">
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-200 truncate">{stop.address}</p>
                  <span className="text-[10px] text-slate-400">
                    {stop.type === "PICKUP" ? "Coleta no Remetente" : "Entrega no Destinatário"} •{" "}
                    {stop.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Seguro */}
      <footer className="pt-6 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Rastreamento Oficial Criptografado {nomeApp}</span>
      </footer>
    </div>
  );
}
