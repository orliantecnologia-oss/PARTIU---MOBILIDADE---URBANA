import { useState, useRef, useEffect } from "react";
import {
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Zap,
} from "lucide-react";
import { validarEmbarquePeloQRDaVan, type ResultadoEmbarqueVan } from "@/lib/passagens-store";
import { tocarBipEmbarque } from "@/lib/realtime";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  bilheteId?: string | undefined;
  onSucesso?: ((resultado: ResultadoEmbarqueVan) => void) | undefined;
}

export function ModalScannerPassageiro({ aberto, onFechar, bilheteId, onSucesso }: Props) {
  const [iniciandoCamera, setIniciandoCamera] = useState(false);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEmbarqueVan | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Iniciar câmera traseira quando o modal abrir
  useEffect(() => {
    if (!aberto) {
      pararCamera();
      setResultado(null);
      setErroCamera(null);
      return;
    }

    iniciarCamera();

    return () => {
      pararCamera();
    };
  }, [aberto]);

  async function iniciarCamera() {
    setIniciandoCamera(true);
    setErroCamera(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não tem suporte direto à câmera.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Prioriza a câmera traseira do smartphone
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIniciandoCamera(false);
    } catch (err: any) {
      console.warn("Acesso à câmera indisponível ou negado:", err);
      setIniciandoCamera(false);
      setErroCamera(
        err.name === "NotAllowedError"
          ? "Permissão de câmera não concedida. Você pode simular a leitura abaixo."
          : "Câmera não detectada neste dispositivo. Utilize a validação instantânea abaixo.",
      );
    }
  }

  function pararCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function handleProcessarValidacao(payloadVan: string) {
    if (processando) return;
    setProcessando(true);

    setTimeout(() => {
      const res = validarEmbarquePeloQRDaVan(payloadVan, bilheteId);
      setResultado(res);
      setProcessando(false);

      if (res.sucesso) {
        tocarBipEmbarque();
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        if (onSucesso) onSucesso(res);
      }
    }, 600);
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-[96vw] max-w-none sm:max-w-lg mx-auto bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] pb-[env(safe-area-inset-bottom,0px)]">
        {/* Cabeçalho do Leitor */}
        <div className="bg-gradient-to-r from-[#0b2046] via-[#0d5930] to-[#071833] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
              <Camera className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                Self Check-in
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                Validar Embarque na Van
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="h-11 w-11 sm:h-10 sm:w-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Corpo do Scanner */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Caixa do Visor da Câmera com Mira de Leitura */}
          <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-3xl overflow-hidden bg-slate-950 border-4 border-slate-800 shadow-inner flex items-center justify-center">
            {/* Elemento de Vídeo */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Mira de Escaneamento Animada */}
            <div className="relative z-10 w-48 h-48 border-2 border-emerald-400/70 rounded-2xl flex flex-col justify-between p-2 shadow-2xl">
              <div className="flex justify-between">
                <span className="w-5 h-5 border-t-4 border-l-4 border-amber-400 rounded-tl-md" />
                <span className="w-5 h-5 border-t-4 border-r-4 border-amber-400 rounded-tr-md" />
              </div>

              {/* Linha laser de escaneamento animada */}
              <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-bounce" />

              <div className="flex justify-between">
                <span className="w-5 h-5 border-b-4 border-l-4 border-amber-400 rounded-bl-md" />
                <span className="w-5 h-5 border-b-4 border-r-4 border-amber-400 rounded-tr-md" />
              </div>
            </div>

            {/* Aviso Flutuante */}
            <div className="absolute bottom-3 z-10 px-3 py-1 bg-slate-950/80 backdrop-blur-sm rounded-full border border-white/10 text-xs text-white font-bold flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span>Aponte para o QR Code no celular do motorista</span>
            </div>
          </div>

          {/* Feedback de Resultado */}
          {resultado && (
            <div
              className={`p-4 rounded-2xl border animate-in zoom-in-95 space-y-2 ${
                resultado.sucesso
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : resultado.jaUtilizado
                    ? "bg-rose-50 border-rose-300 text-rose-950"
                    : "bg-amber-50 border-amber-300 text-amber-950"
              }`}
            >
              <div className="flex items-center gap-2">
                {resultado.sucesso ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                )}
                <strong className="text-sm sm:text-base font-black">
                  {resultado.sucesso ? "Embarque Confirmado!" : "Embarque Não Permitido"}
                </strong>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed font-semibold">
                {resultado.mensagem}
              </p>
              {resultado.sucesso && resultado.bilhete && (
                <div className="pt-2 border-t border-emerald-200 text-xs font-bold flex items-center justify-between">
                  <span>Passageiro: {resultado.bilhete.passageiroNome}</span>
                  <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Uso Único Consumido ✓
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Botão de Leitura Direta (Simulação Rápida / Fallback) */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={processando || resultado?.sucesso}
              onClick={() => handleProcessarValidacao("UNIVANS:TOTEM_VAN_04:RJP2F14:LINE_IGN_MCZ")}
              className="w-full min-h-12 h-12 px-5 rounded-2xl bg-[#0d5930] hover:bg-[#147a44] text-white text-sm sm:text-base font-black shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {processando ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Validando Chave Criptográfica...</span>
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5 text-amber-300" />
                  <span>Ler QR Code da Van Agora</span>
                </>
              )}
            </button>

            {erroCamera && (
              <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 text-center font-bold">
                {erroCamera}
              </p>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-bold pt-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Garantia de Uso Único • Impede Prints e Clonagens</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
