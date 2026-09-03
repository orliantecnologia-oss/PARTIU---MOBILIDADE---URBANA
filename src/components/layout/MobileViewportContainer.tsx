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

  // O Painel Administrativo é 100% responsivo para Desktop e Mobile sem restrição
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
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col lg:flex-row items-center justify-center relative overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      {/* Grade de fundo aeroespacial no Desktop */}
      <div className="absolute inset-0 bg-[radial-gradient(#0d593033_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />

      {/* PAINEL LATERAL DESKTOP: Aviso amigável de app mobile + QR Code para escanear */}
      <aside className="hidden lg:flex flex-col justify-between w-[380px] xl:w-[420px] p-8 z-10 space-y-6 text-left shrink-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-[#0d5930] flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400/40">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                UniVans <span className="text-emerald-400 font-extrabold text-xs">Mobile</span>
              </h1>
              <p className="text-[11px] text-emerald-400/90 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Telemetria Starlink Ativa
              </p>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              Desenvolvido para Celular
            </div>
            <h2 className="text-sm font-black text-white leading-snug">
              Este aplicativo foi desenvolvido e otimizado com foco na experiência móvel em
              smartphones.
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              No computador você visualiza a interface no formato mobile exato. Para a experiência
              completa com GPS e notificações em tempo real, abra no seu smartphone.
            </p>
          </div>

          {/* QR Code para escanear no celular */}
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 text-center space-y-3 shadow-lg">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300">
              <QrCode className="h-4 w-4 text-emerald-400" />
              <span>Aponte a câmera do seu celular:</span>
            </div>

            <div className="inline-block p-2 rounded-2xl bg-white shadow-2xl ring-4 ring-emerald-500/20">
              <RealQrCodePix textoChave={currentUrl} tamanho={120} tipo="bilhete" />
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleCopiarLink}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/10 transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                {copiado ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>Copiar Link do App</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé do painel lateral: Link para o Painel Admin */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <Link
            to="/app/admin"
            className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold hover:underline transition-colors"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Painel Administrativo (Desktop)</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </aside>

      {/* CONTAINER MÓVEL CENTRAL (CHASSIS DO SMARTPHONE) */}
      <main className="w-full max-w-[430px] min-h-screen bg-background text-foreground relative z-20 shadow-[0_0_80px_rgba(0,0,0,0.6)] sm:border-x sm:border-slate-800/50 flex flex-col flex-1 overflow-x-hidden">
        {/* BARRA DE STATUS SIMULADA (VISÍVEL APENAS EM COMPUTADORES) */}
        <div className="hidden sm:flex items-center justify-between px-5 pt-2 pb-1 text-[11px] font-bold text-slate-400 bg-background/95 border-b border-border/40 select-none sticky top-0 z-50">
          <span className="font-mono text-xs font-black text-foreground">{horaAtual}</span>

          {/* Notch / Câmera frontal simulada */}
          <div className="h-4 w-24 bg-slate-950/80 rounded-full flex items-center justify-center gap-1.5 shadow-inner">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-slate-800" />
          </div>

          <div className="flex items-center gap-2">
            <Radio className="h-3 w-3 text-emerald-500" />
            <Wifi className="h-3 w-3 text-foreground" />
            <BatteryCharging className="h-3.5 w-3.5 text-foreground" />
          </div>
        </div>

        {/* Conteúdo Real das Rotas */}
        <div className="flex-1 w-full flex flex-col relative">{children}</div>
      </main>
    </div>
  );
}
