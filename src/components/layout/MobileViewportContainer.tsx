import { useState, useEffect, type ReactNode } from "react";
import { useRouterState, Link } from "@tanstack/react-router";
import {
  Smartphone,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  Wifi,
  ExternalLink,
  BatteryCharging,
  Radio,
  Sparkles,
  X,
} from "lucide-react";
import { RealQrCodePix } from "@/components/passagens/RealQrCodePix";

export interface MobileViewportContainerProps {
  children: ReactNode;
}

export function MobileViewportContainer({ children }: MobileViewportContainerProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/app/admin");

  const [currentUrl, setCurrentUrl] = useState("https://apk-uni-vans-coop.vercel.app");
  const [copiado, setCopiado] = useState(false);
  const [modalQrAberto, setModalQrAberto] = useState(false);
  const [horaAtual, setHoraAtual] = useState("12:00");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
      const updateHora = () => {
        const d = new Date();
        setHoraAtual(d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      };
      updateHora();
      const timer = setInterval(updateHora, 30000);
      return () => clearInterval(timer);
    }
  }, []);

  // O Painel Administrativo permanece 100% liberado para tela cheia no Desktop e Mobile
  if (isAdmin) {
    return <>{children}</>;
  }

  function handleCopiarLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start relative overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      {/* Grade de fundo aeroespacial no Desktop */}
      <div className="fixed inset-0 bg-[radial-gradient(#0d593033_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50" />

      {/* BANNER SUPERIOR DESKTOP: Aviso amigável que o app foi desenvolvido para celular */}
      <header className="hidden lg:flex items-center justify-between w-full max-w-5xl px-5 py-2.5 my-2 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl z-30 text-xs backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-[#0d5930] text-white flex items-center justify-center border border-emerald-400/40 shrink-0 shadow-sm">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-sm">UniVans Mobile</span>
              <span className="text-[10px] text-emerald-400 font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                📱 Desenvolvido para Celular
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Esta aplicação foi desenhada para a melhor experiência em smartphones. No computador,
              você visualiza no formato mobile idêntico ao celular.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setModalQrAberto(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <QrCode className="h-3.5 w-3.5 text-emerald-400" />
            <span>Abrir no Celular</span>
          </button>

          <Link
            to="/app/admin"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold transition-all active:scale-95"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Painel Admin (Desktop)</span>
          </Link>
        </div>
      </header>

      {/* CONTAINER DO SMARTPHONE — 100% CENTRALIZADO NA TELA DO DESKTOP */}
      <div className="w-full flex-1 flex items-start sm:items-center justify-center sm:py-3 z-10">
        <main className="w-full max-w-[430px] min-h-screen sm:min-h-[850px] sm:max-h-[92vh] sm:rounded-[2.5rem] bg-background text-foreground relative shadow-[0_0_70px_rgba(0,0,0,0.6)] sm:border sm:border-slate-800/80 flex flex-col overflow-y-auto overflow-x-hidden">
          {/* BARRA SUPERIOR SIMULADA DE SMARTPHONE (VISÍVEL APENAS NO DESKTOP) */}
          <div className="hidden sm:flex items-center justify-between px-6 pt-3 pb-2 text-[11px] font-bold text-slate-400 bg-background/95 border-b border-border/40 select-none sticky top-0 z-50 backdrop-blur-md">
            <span className="font-mono text-xs font-black text-foreground">{horaAtual}</span>

            {/* Dynamic Island simulada */}
            <div className="h-4 w-28 bg-slate-950 rounded-full flex items-center justify-center gap-1.5 shadow-inner">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="h-2 w-2 rounded-full bg-slate-800" />
            </div>

            <div className="flex items-center gap-2 text-foreground">
              <Radio className="h-3 w-3 text-emerald-500" />
              <Wifi className="h-3 w-3" />
              <BatteryCharging className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* CONTEÚDO REAL DO APP */}
          <div className="flex-1 w-full flex flex-col relative">{children}</div>
        </main>
      </div>

      {/* MODAL QR CODE PARA ABRIR NO CELULAR */}
      {modalQrAberto && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setModalQrAberto(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <QrCode className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Abra no seu Celular</h3>
              <p className="text-xs text-slate-400">
                Aponte a câmera do seu smartphone para o QR Code abaixo para abrir o app
                diretamente:
              </p>
            </div>

            <div className="inline-block p-3 rounded-2xl bg-white shadow-2xl ring-4 ring-emerald-500/20">
              <RealQrCodePix textoChave={currentUrl} tamanho={160} tipo="bilhete" />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCopiarLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/10 transition-all cursor-pointer active:scale-95"
              >
                {copiado ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-400">Link Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-400" />
                    <span>Copiar Link do Aplicativo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalQrAberto(false)}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Continuar visualizando no computador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
