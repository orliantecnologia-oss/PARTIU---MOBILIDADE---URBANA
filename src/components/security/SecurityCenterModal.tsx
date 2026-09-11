import React, { useState } from "react";
import {
  Shield,
  PhoneCall,
  Share2,
  UserX,
  X,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Lock,
  Copy,
  Check,
} from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { getCorridaAtiva } from "@/lib/partiu-engine";
import { rideLiveTrackingService } from "@/lib/tracking/ride-live-tracking-service";

interface SecurityCenterModalProps {
  open: boolean;
  onClose: () => void;
  targetUserId?: string;
  targetName?: string;
}

export function SecurityCenterModal({
  open,
  onClose,
  targetUserId,
  targetName,
}: SecurityCenterModalProps) {
  const { nomeApp, corPrimaria, corTextoPrimaria } = useBrandTheme();
  const [confirmando190, setConfirmando190] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [usuarioBloqueado, setUsuarioBloqueado] = useState(false);
  const [bloqueando, setBloqueando] = useState(false);

  if (!open) return null;

  const corridaAtiva = getCorridaAtiva();
  const driverName = corridaAtiva?.motorista?.nome || targetName || "Motorista Parceiro";
  const driverId = corridaAtiva?.motorista?.id || targetUserId;
  const vehicleModel = corridaAtiva?.motorista?.veiculo || "Carro Particular";
  const vehiclePlate = corridaAtiva?.motorista?.placa || "PARTIU";
  const trackingToken = corridaAtiva?.trackingToken;

  function handleLigar190() {
    window.location.href = "tel:190";
    setConfirmando190(false);
  }

  async function handleCompartilharTrajeto() {
    let shareText = "";
    let shareUrl = "";

    if (trackingToken) {
      shareText = rideLiveTrackingService.buildShareMessage(trackingToken, vehicleModel, vehiclePlate);
      shareUrl = rideLiveTrackingService.buildShareUrl(trackingToken);
    } else {
      shareUrl = typeof window !== "undefined" ? window.location.origin : "https://partiumobilidade.com.br";
      shareText = `Estou utilizando a plataforma de segurança ${nomeApp} para minhas viagens. Conheça e viaje com proteção: ${shareUrl}`;
    }

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Siga Minha Viagem — ${nomeApp}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Usuário cancelou ou fallback
      }
    }

    // Fallback WhatsApp
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");
  }

  function handleCopiarLinkRastreio() {
    if (trackingToken) {
      const url = rideLiveTrackingService.buildShareUrl(trackingToken);
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(url);
        setLinkCopiado(true);
        setTimeout(() => setLinkCopiado(false), 2500);
      }
    }
  }

  async function handleBloquearUsuario() {
    if (!driverId) return;
    setBloqueando(true);
    try {
      // Registra bloqueio em armazenamento local e emite evento
      const pastBlocks = JSON.parse(localStorage.getItem("partiu_user_blocks_v1") || "[]");
      if (!pastBlocks.includes(driverId)) {
        pastBlocks.push(driverId);
        localStorage.setItem("partiu_user_blocks_v1", JSON.stringify(pastBlocks));
      }
      setUsuarioBloqueado(true);
    } finally {
      setBloqueando(false);
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

      {/* Painel Central de Segurança */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
        {/* Header Escudo */}
        <div className="p-5 pb-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-white">Central de Segurança</h2>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  24 HORAS
                </span>
              </div>
              <p className="text-xs text-slate-400">Proteção ativa e suporte de emergência</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Card 1: Emergência 190 */}
          {confirmando190 ? (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-500 space-y-3 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                <AlertTriangle className="h-5 w-5" />
                <span>Confirmar Chamada para 190?</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                Você será conectado diretamente à central de emergência da Polícia Militar do seu estado.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmando190(false)}
                  className="flex-1 py-2.5 text-xs font-bold bg-white text-slate-700 rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleLigar190}
                  className="flex-1 py-2.5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="h-4 w-4" />
                  Ligar 190
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando190(true)}
              className="w-full p-4 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100/70 active:scale-[0.99] transition text-left flex items-center gap-3.5 group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-rose-900">Ligar para a Polícia (190)</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-200/60 px-2 py-0.5 rounded-full">
                    Emergência
                  </span>
                </div>
                <p className="text-xs text-rose-700 mt-0.5">
                  Acionamento imediato em situações de perigo ou risco à integridade
                </p>
              </div>
            </button>
          )}

          {/* Card 2: Compartilhar Trajeto (Siga Minha Viagem) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Share2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-900">Compartilhar Trajeto ao Vivo</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Familiares acompanham seu deslocamento no mapa em tempo real pelo WhatsApp sem login.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleCompartilharTrajeto}
                className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                WhatsApp / Compartilhar
              </button>
              {trackingToken && (
                <button
                  type="button"
                  onClick={handleCopiarLinkRastreio}
                  className="py-2.5 px-3 rounded-xl font-bold text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
                  title="Copiar link"
                >
                  {linkCopiado ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-slate-500" />
                  )}
                  <span>{linkCopiado ? "Copiado!" : "Copiar"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 3: Bloqueio Mútuo de Pareamento */}
          {driverId && (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <UserX className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-black text-amber-900">Bloqueio Mútuo Permanente</h3>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    Você e {driverName} não serão mais emparelhados em nenhuma viagem futura na plataforma.
                  </p>
                </div>
              </div>

              {usuarioBloqueado ? (
                <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Condutor bloqueado com sucesso para pareamentos futuros.</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleBloquearUsuario}
                  disabled={bloqueando}
                  className="w-full mt-1 py-2 px-3 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <UserX className="h-3.5 w-3.5" />
                  <span>{bloqueando ? "Bloqueando..." : `Não viajar novamente com ${driverName}`}</span>
                </button>
              )}
            </div>
          )}

          {/* Card 4: Dicas Essenciais de Segurança 99 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              Diretrizes de Segurança {nomeApp}:
            </h4>
            <ul className="space-y-1.5 pl-1 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <strong>Confira a Placa:</strong> Sempre confira se a placa e o modelo do veículo coincidem com as informações exibidas no app.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <strong>Rastreamento GPS Contínuo:</strong> Toda a viagem é monitorada por satélite e registrada em nossa central de telemetria.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <strong>Compartilhe Sempre:</strong> Avise um contato de confiança através do link Siga Minha Viagem ao embarcar.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
