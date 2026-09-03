import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Key,
  Clock,
  Copy,
  MessageCircle,
  Phone,
  Radio,
  Share2,
  ShieldCheck,
  Wifi,
  BellRing,
  Gauge,
  MapPin,
  Sparkles,
  Check,
  Zap,
} from "lucide-react";
import { UniversalMapView } from "@/components/maps/UniversalMapView";
import { getTelemetriaVeiculos, type TelemetriaVeiculo } from "@/lib/superadmin-config";
import { useViagensDoDia, useViagemRealtime } from "@/lib/univans-db";
import { calcularDistanciaKm } from "@/lib/use-geolocation";
import { temPassagemAtivaParaRadar } from "@/lib/passagens-store";

export const Route = createFileRoute("/app/viagem")({
  head: () => ({
    meta: [
      { title: "Van ao Vivo no Radar | UniVans Starlink" },
      {
        name: "description",
        content:
          "Acompanhe o deslocamento da sua van em tempo real com telemetria Starlink, previsão de chegada e contato com o motorista.",
      },
    ],
  }),
  component: ViagemAoVivoPassageiro,
});

export function ViagemAoVivoPassageiro() {
  const [temAcessoRadar] = useState<boolean>(() => temPassagemAtivaParaRadar());
  const [veiculosFallback] = useState<TelemetriaVeiculo[]>(getTelemetriaVeiculos);
  const { data: viagensBanco } = useViagensDoDia();
  const viagemReal = viagensBanco?.[0];

  // Escutar atualizações via Supabase Realtime
  useViagemRealtime(viagemReal?.id);

  const vanViagem: TelemetriaVeiculo =
    viagemReal?.posicao_lat_atual && viagemReal?.posicao_lng_atual
      ? {
          ...veiculosFallback[0]!,
          lat: viagemReal.posicao_lat_atual,
          lng: viagemReal.posicao_lng_atual,
          status: viagemReal.status === "em_transito" ? "em_rota" : "parado",
          linhaOrigem: viagemReal.linhas?.origem || veiculosFallback[0]!.linhaOrigem,
          linhaDestino: viagemReal.linhas?.destino || veiculosFallback[0]!.linhaDestino,
        }
      : veiculosFallback[0]!;

  // Coordenadas de referência do Trevo de chegada (ex: Trevo da Barra / Tabuleiro)
  const destinoLat = -9.6459;
  const destinoLng = -35.7255;

  // ETA dinâmico: calcula distância em km e assume velocidade média de 60km/h (1 min por km)
  const distanciaAteTrevoKm = useMemo(() => {
    return calcularDistanciaKm(vanViagem.lat, vanViagem.lng, destinoLat, destinoLng);
  }, [vanViagem.lat, vanViagem.lng, destinoLat, destinoLng]);

  const etaEstimadoMinutos = useMemo(() => {
    // Estimativa: distância / (velocidade média 55km/h) * 60 minutos
    const min = Math.round((distanciaAteTrevoKm / 55) * 60);
    return Math.max(1, min);
  }, [distanciaAteTrevoKm]);

  const [copiado, setCopiado] = useState(false);
  const [alarmeProximidadeAtivo, setAlarmeProximidadeAtivo] = useState(false);
  const [sinalPistaEnviado, setSinalPistaEnviado] = useState(false);
  const [linkFamiliarCopiado, setLinkFamiliarCopiado] = useState(false);

  function copiarSenhaWifi() {
    navigator.clipboard.writeText(vanViagem.starlinkWifiSenha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  function toggleAlarmeProximidade() {
    setAlarmeProximidadeAtivo((prev) => !prev);
    if (!alarmeProximidadeAtivo && typeof window !== "undefined" && "Notification" in window) {
      try {
        Notification.requestPermission();
      } catch {
        // Ignore
      }
    }
  }

  function enviarSinalNaPista() {
    setSinalPistaEnviado(true);
    setTimeout(() => setSinalPistaEnviado(false), 5000);
  }

  function compartilharLinkFamiliar() {
    const link = "http://localhost:8080/app/viagem?tracking=UV-8412";
    const texto = encodeURIComponent(
      `🛡️ *ACOMPANHE MINHA VIAGEM UNIVANS AO VIVO!*\n\nEstou viajando na Van Mercedes Sprinter (*${vanViagem.placa}* • Motorista ${vanViagem.motorista}).\n\nAcompanhe meu trajeto em tempo real no radar:\n${link}`,
    );
    window.open(`https://wa.me/?text=${texto}`, "_blank");
    setLinkFamiliarCopiado(true);
    setTimeout(() => setLinkFamiliarCopiado(false), 3000);
  }

  function ligarMotorista() {
    window.open(`tel:${vanViagem.telefoneMotorista.replace(/\D/g, "")}`, "_self");
  }

  function abrirWhatsAppMotorista() {
    const texto = encodeURIComponent(
      `Olá ${vanViagem.motorista}! Sou passageiro da van ${vanViagem.placa} e estou no Trevo da Barra de São Miguel aguardando para embarcar.`,
    );
    const telLimpo = vanViagem.telefoneMotorista.replace(/\D/g, "");
    window.open(`https://wa.me/55${telLimpo}?text=${texto}`, "_blank");
  }

  if (!temAcessoRadar) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f8faf9] text-slate-900 justify-between p-2 sm:p-6 w-full">
        {/* Cabeçalho */}
        <header className="w-full max-w-full sm:max-w-2xl mx-auto flex items-center justify-between">
          <Link
            to="/app"
            className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-xs font-black uppercase tracking-wider text-[#0d5930] flex items-center gap-1">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
            Acesso Restrito
          </span>
          <div className="w-11" />
        </header>

        {/* Card de Bloqueio Seguro */}
        <main className="w-full max-w-full sm:max-w-2xl mx-auto flex-1 flex flex-col justify-center py-4 text-center">
          <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="h-16 w-16 bg-amber-50 text-amber-600 border-2 border-amber-200 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Radio className="h-8 w-8 text-[#0d5930] animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase text-amber-800 bg-amber-100/70 px-3 py-1 rounded-full border border-amber-300">
                🔒 Radar Exclusivo para Passageiros
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                Rastreamento em Tempo Real Bloqueado
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Por motivos de <strong>segurança da frota e privacidade dos passageiros</strong>, a
                visualização da van em movimento só fica disponível para usuários com{" "}
                <strong>ao menos uma passagem ativa</strong> no sistema.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs sm:text-sm space-y-1 text-slate-600">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" /> Como liberar o acesso ao vivo:
              </p>
              <p>• Adquira uma passagem para qualquer linha ou trecho;</p>
              <p>• Ou credencie-se no Passe Livre se tiver direito à gratuidade;</p>
              <p>• O mapa via satélite Starlink será desbloqueado na hora!</p>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                to="/app/linhas"
                className="w-full min-h-[48px] h-12 rounded-xl bg-[#0d5930] hover:bg-[#147a44] text-white text-sm sm:text-base font-black shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Comprar Passagem &amp; Desbloquear Radar</span>
                <ArrowLeft className="h-4 w-4 rotate-180 text-amber-300" />
              </Link>

              <Link
                to="/cadastro-gratuidade"
                className="w-full min-h-[44px] h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all flex items-center justify-center cursor-pointer active:scale-95"
              >
                Sou Beneficiário do Passe Livre (Gratuito)
              </Link>
            </div>
          </div>
        </main>

        <footer className="text-center text-[10px] text-slate-400 font-medium">
          UniVans Cooperativa Oficial • Política de Segurança e Privacidade
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8faf9] text-slate-900 pb-36">
      {/* 1. CABEÇALHO DO RADAR AO VIVO */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-2 sm:px-4 py-2.5 border-b border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/app"
            className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
            Ao Vivo
          </span>
        </div>

        <div className="text-center truncate px-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Van em Trânsito
          </span>
          <h1 className="text-xs sm:text-base font-black text-slate-900 truncate">
            {vanViagem.linhaOrigem} ➔ {vanViagem.linhaDestino}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 shadow-2xs">
          <Wifi className="h-3.5 w-3.5 text-amber-600" />
          <span>VIP</span>
        </div>
      </header>

      {/* 2. BARRA DE PREVISÃO E TELEMETRIA */}
      <div className="w-full max-w-full sm:max-w-2xl mx-auto px-1.5 sm:px-4 pt-2">
        <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-white p-3 sm:p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5930] border border-emerald-200 shrink-0">
              <Radio className="h-4.5 w-4.5 animate-pulse text-[#0d5930]" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block truncate">
                Previsão de Chegada ({distanciaAteTrevoKm} km)
              </span>
              <strong className="text-xs sm:text-base font-black text-[#0d5930] leading-tight block truncate">
                Chega em ~{etaEstimadoMinutos} minutos
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pl-2.5 border-l border-slate-100">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                Velocidade
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-800 font-mono flex items-center gap-1 justify-end">
                <Gauge className="h-3.5 w-3.5 text-emerald-600" />
                {vanViagem.velocidadeKmH} km/h
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTAINER DO MAPA AO VIVO */}
      <div className="p-1.5 sm:p-4 w-full max-w-full sm:max-w-2xl mx-auto">
        <div className="relative h-[48dvh] sm:h-[54dvh] min-h-[300px] w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-slate-950">
          <UniversalMapView altura="h-full min-h-[300px]" mostrarCardInferior={false} />
        </div>
      </div>

      {/* 4. PAINEL PRINCIPAL COM DETALHES DO MOTORISTA E AÇÕES */}
      <div className="w-full max-w-full sm:max-w-2xl mx-auto px-1.5 sm:px-4 space-y-2.5">
        {/* Card do Motorista & Contato Rápido */}
        <div className="flex items-center justify-between rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-13 w-13 shrink-0 rounded-2xl overflow-hidden ring-2 ring-emerald-100 shadow-2xs">
              <img
                src={vanViagem.fotoMotorista}
                alt={vanViagem.motorista}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-[#0d5930] text-center text-[9px] font-black text-white py-0.2">
                VIP
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <strong className="text-sm sm:text-base font-black text-slate-900 truncate block">
                  {vanViagem.motorista}
                </strong>
                <span className="text-xs text-amber-500 font-black">★ 4.9</span>
              </div>
              <span className="text-xs text-slate-500 font-medium block truncate mt-0.5">
                {vanViagem.modelo} • <strong>{vanViagem.placa}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={abrirWhatsAppMotorista}
              className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="WhatsApp Motorista"
              aria-label="WhatsApp Motorista"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={ligarMotorista}
              className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Ligar para Motorista"
              aria-label="Ligar para Motorista"
            >
              <Phone className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Card do Wi-Fi Starlink */}
        <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 p-3 sm:p-3.5 text-white shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-white/10 text-amber-300 flex items-center justify-center shrink-0">
              <Wifi className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-slate-400 block">
                Wi-Fi a Bordo (Starlink)
              </span>
              <strong className="text-xs sm:text-sm font-black text-white">
                {vanViagem.starlinkWifiSsid}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={copiarSenhaWifi}
            className={`min-h-[40px] h-10 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              copiado
                ? "bg-emerald-600 text-white"
                : "bg-white/10 hover:bg-white/20 text-amber-300 border border-white/20"
            }`}
          >
            {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiado ? "Copiada!" : "Copiar Senha"}</span>
          </button>
        </div>

        {/* Botão de Acenar na Pista */}
        <button
          type="button"
          onClick={enviarSinalNaPista}
          className={`w-full min-h-[48px] h-12 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.98] ${
            sinalPistaEnviado
              ? "bg-emerald-600 text-white"
              : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200"
          }`}
        >
          <Zap
            className={`h-4.5 w-4.5 ${sinalPistaEnviado ? "text-amber-300" : "text-[#0d5930]"}`}
          />
          <span>
            {sinalPistaEnviado
              ? "Sinal Enviado ao Tablet da Van com Sucesso!"
              : "Estou no Ponto de Embarque (Avisar Motorista)"}
          </span>
        </button>
      </div>
    </div>
  );
}
