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
  Car,
  Navigation,
  Share2,
  PhoneCall,
  Shield,
} from "lucide-react";
import { deliveryTrackingEngine, PublicTrackingData } from "@/lib/delivery";
import {
  rideLiveTrackingService,
  PublicRideTrackingData,
} from "@/lib/tracking/ride-live-tracking-service";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export const Route = createFileRoute("/rastreio/$token")({
  head: () => ({
    meta: [
      { title: "Siga Minha Viagem & Rastreamento | PARTIU" },
      {
        name: "description",
        content:
          "Acompanhe o trajeto de corridas e entregas PARTIU em tempo real com localização ao vivo e segurança monitorada.",
      },
    ],
  }),
  component: PublicTrackingPage,
});

export function PublicTrackingPage() {
  const { token } = Route.useParams();
  const { nomeApp, corPrimaria, corTextoPrimaria } = useBrandTheme();

  const [rideData, setRideData] = useState<PublicRideTrackingData | null>(() =>
    rideLiveTrackingService.getPublicTrackingView(token)
  );
  const [deliveryData, setDeliveryData] = useState<PublicTrackingData | null>(() =>
    deliveryTrackingEngine.getPublicTrackingView(token)
  );
  const [copiado, setCopiado] = useState(false);

  // Polling / Realtime Refresh
  useEffect(() => {
    function refresh() {
      const rData = rideLiveTrackingService.getPublicTrackingView(token);
      setRideData(rData);

      if (!rData) {
        const dData = deliveryTrackingEngine.getPublicTrackingView(token);
        setDeliveryData(dData);
      }
    }

    refresh();
    const interval = setInterval(refresh, 2500);

    const handleDeliveryUpdate = () => refresh();
    const handleRideUpdate = () => refresh();

    window.addEventListener("partiu:delivery-atualizada", handleDeliveryUpdate);
    window.addEventListener("partiu:ride-tracking-updated", handleRideUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("partiu:delivery-atualizada", handleDeliveryUpdate);
      window.removeEventListener("partiu:ride-tracking-updated", handleRideUpdate);
    };
  }, [token]);

  function handleCopiarPin() {
    if (deliveryData?.expectedOtp) {
      navigator.clipboard.writeText(deliveryData.expectedOtp);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  function handleCompartilhar() {
    if (rideData) {
      const msg = rideLiveTrackingService.buildShareMessage(
        rideData.trackingToken,
        rideData.vehicleModel,
        rideData.vehiclePlate
      );
      if (typeof navigator !== "undefined" && navigator.share) {
        navigator
          .share({
            title: `Siga Minha Viagem — ${nomeApp}`,
            text: msg,
            url: rideLiveTrackingService.buildShareUrl(rideData.trackingToken),
          })
          .catch(() => {});
        return;
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    }
  }

  // CASO 1: CORRIDA DE PASSAGEIRO (SIGA MINHA VIAGEM)
  if (rideData) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 w-full max-w-md mx-auto pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="space-y-4">
          {/* Top Header */}
          <header className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div
                style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                className="w-10 h-10 rounded-2xl font-black flex items-center justify-center text-lg shadow-sm"
              >
                🚗
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                  {nomeApp} Siga Minha Viagem
                </span>
                <h1 className="text-base font-black text-slate-100 leading-tight">
                  {rideData.passengerFirstName} está em rota
                </h1>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Ao Vivo
            </span>
          </header>

          {/* Status Card */}
          <div className="p-4 rounded-3xl bg-slate-800/90 border border-slate-700 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Status do Trajeto</span>
              <span className="text-[11px] font-bold text-emerald-400">
                {rideData.distanceKm ? `${rideData.distanceKm.toFixed(1)} km` : "Monitorado"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Car className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-base font-black text-slate-100 leading-tight">
                {rideData.statusLabel}
              </h2>
            </div>

            {/* Endereços de Origem e Destino */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-2 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Embarque:</span>
                  <p className="font-semibold text-slate-200 truncate">{rideData.origem}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Destino:</span>
                  <p className="font-semibold text-slate-200 truncate">{rideData.destino}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card do Motorista & Veículo */}
          {rideData.driverName && (
            <div className="p-4 rounded-3xl bg-slate-800/90 border border-slate-700 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                {rideData.driverPhoto ? (
                  <img
                    src={rideData.driverPhoto}
                    alt={rideData.driverName}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-600"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-slate-700 font-black text-slate-200 flex items-center justify-center border border-slate-600">
                    {rideData.driverName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-black text-slate-100">
                    {rideData.driverName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {rideData.vehicleModel} •{" "}
                    <span className="font-mono text-emerald-400 font-bold">
                      {rideData.vehiclePlate}
                    </span>
                  </p>
                  <span className="text-[10px] text-amber-400 font-bold">
                    ★ {rideData.driverRating || 4.9}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Banner de Proteção / Telemetria */}
          <div className="p-4 rounded-3xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Viagem Monitorada por Satélite</span>
            </div>
            <p className="text-[11px] text-emerald-300/80 leading-relaxed">
              O trajeto e a velocidade do veículo estão sendo registrados em tempo real no Centro de Controle de Operações da plataforma {nomeApp}.
            </p>
          </div>

          {/* Ações Rápidas */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCompartilhar}
              className="flex-1 py-3 px-3 rounded-2xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer shadow-md"
            >
              <Share2 className="w-4 h-4" />
              Reenviar Trajeto
            </button>
            <a
              href="tel:190"
              className="py-3 px-4 rounded-2xl font-bold text-xs bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 text-rose-400" />
              Ligar 190
            </a>
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

  // CASO 2: ENCOMENDA / PACOTE DE ENTREGA
  if (deliveryData) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 w-full max-w-md mx-auto pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
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
                  {deliveryData.trackingCode}
                </h1>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Ao Vivo
            </span>
          </header>

          <div className="p-4 rounded-3xl bg-slate-800/90 border border-slate-700 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Status da Encomenda</span>
              <span className="text-[11px] font-bold text-primary-600">
                {deliveryData.vehicleType}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {deliveryData.isReturnActive ? (
                <RotateCcw className="w-5 h-5 text-rose-400 animate-spin" />
              ) : (
                <Package className="w-5 h-5 text-[#0088FF]" />
              )}
              <h2 className="text-lg font-black text-slate-100 leading-tight">
                {deliveryData.statusLabel}
              </h2>
            </div>

            {deliveryData.isReturnActive && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                <span className="font-bold block">⚠️ Devolução em Andamento</span>
                <p className="text-[11px] text-rose-300/80">
                  O entregador não conseguiu localizar o destinatário e está retornando a encomenda ao remetente ({deliveryData.senderFirstName}).
                </p>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Destino Atual:</span>
                <p className="font-semibold text-slate-200 truncate">{deliveryData.currentStopAddress}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Destinatário: <span className="text-slate-300 font-bold">{deliveryData.recipientName}</span> ({deliveryData.recipientMaskedPhone})
                </p>
              </div>
            </div>
          </div>

          {deliveryData.expectedOtp && !deliveryData.isReturnActive && deliveryData.status !== "COMPLETED" && (
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
                  {deliveryData.expectedOtp}
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

          {deliveryData.driverInfo && (
            <div className="p-4 rounded-3xl bg-slate-800/90 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-700 font-black text-slate-200 flex items-center justify-center border border-slate-600">
                  {deliveryData.driverInfo.firstName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">
                    {deliveryData.driverInfo.firstName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {deliveryData.driverInfo.vehicleModel} •{" "}
                    <span className="font-mono text-primary-600 font-bold">
                      {deliveryData.driverInfo.vehiclePlate}
                    </span>
                  </p>
                  <span className="text-[10px] text-primary-600 font-bold">
                    ★ {deliveryData.driverInfo.rating}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 rounded-3xl bg-slate-800/90 border border-slate-700 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Linha do Tempo
            </h4>
            <div className="space-y-2.5 pt-1">
              {deliveryData.stopsTimeline.map((stop, idx) => (
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

        <footer className="pt-6 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Rastreamento Oficial Criptografado {nomeApp}</span>
        </footer>
      </div>
    );
  }

  // CASO 3: NÃO LOCALIZADO / EXPIRADO
  return (
    <div className="min-h-[100dvh] bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-primary-600 mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-black text-slate-100">Rastreamento Não Localizado</h1>
      <p className="text-sm text-slate-400 mt-2 max-w-xs">
        O link de rastreamento pode ter expirado ou o código informado é inválido.
      </p>
      <Link
        to="/"
        className="mt-6 px-6 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm active:scale-95 transition"
      >
        Voltar ao Início
      </Link>
    </div>
  );
}
