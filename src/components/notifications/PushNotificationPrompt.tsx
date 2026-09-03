import { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  X,
  ExternalLink,
  Copy,
  AlertTriangle,
} from "lucide-react";
import {
  getStatusPermissaoPush,
  solicitarPermissaoPush,
  notificarAproximacaoTrevo,
  isInAppBrowser,
} from "@/lib/push-notifications";

export function PushNotificationPrompt() {
  const [permissao, setPermissao] = useState<NotificationPermission>("default");
  const [visivel, setVisivel] = useState(false);
  const [testado, setTestado] = useState(false);
  const [mostrarInstrucaoInApp, setMostrarInstrucaoInApp] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [avisoErro, setAvisoErro] = useState<string | null>(null);

  useEffect(() => {
    const status = getStatusPermissaoPush();
    setPermissao(status);

    // Mostra o prompt se o usuário ainda não decidiu ou se quiser permitir teste
    const descartado = sessionStorage.getItem("univans_push_prompt_dismissed");
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (status !== "granted" && !descartado) {
      timer = setTimeout(() => setVisivel(true), 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  async function handleAtivar() {
    setAvisoErro(null);
    const resultado = await solicitarPermissaoPush();
    if (resultado.sucesso) {
      setPermissao("granted");
      await notificarAproximacaoTrevo("Mercedes Sprinter VIP #02", 6, "Trevo do Francês");
      setTestado(true);
      setTimeout(() => setVisivel(false), 4000);
    } else if (resultado.motivo === "in_app_browser") {
      setMostrarInstrucaoInApp(true);
    } else {
      setAvisoErro(resultado.mensagem || "Notificações push não suportadas neste navegador.");
    }
  }

  function handleFechar() {
    setVisivel(false);
    sessionStorage.setItem("univans_push_prompt_dismissed", "true");
  }

  if (!visivel) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 rounded-3xl bg-slate-950 text-white shadow-2xl border border-emerald-500/30 space-y-3 relative overflow-hidden">
        {/* Fundo com gradiente sutil */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 animate-pulse">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Notificações de Bordo
              </span>
              <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                Receba alertas quando a van estiver chegando no seu trevo
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFechar}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed relative z-10">
          Você será avisado no celular quando a van estiver a 6 minutos do ponto de embarque, mesmo
          com a tela bloqueada.
        </p>

        {mostrarInstrucaoInApp ? (
          <div className="space-y-3 pt-1 relative z-10 animate-in fade-in">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 space-y-1.5 text-left">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                <ExternalLink className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Navegador do Facebook Detectado</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed">
                O navegador interno do Facebook bloqueia notificações em segundo plano. Para receber
                alertas quando a van estiver chegando:
              </p>
              <ol className="text-[11px] text-amber-100 list-decimal list-inside space-y-1 font-semibold pt-1">
                <li>
                  Toque nos <strong>3 pontinhos (⋮)</strong> no canto superior direito
                </li>
                <li>
                  Selecione <strong>&quot;Abrir no navegador&quot;</strong> ou{" "}
                  <strong>&quot;Abrir no Chrome&quot;</strong>
                </li>
              </ol>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                    setLinkCopiado(true);
                    setTimeout(() => setLinkCopiado(false), 2500);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                {linkCopiado ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>Copiar Link para o Chrome</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleFechar}
                className="px-3.5 py-2.5 rounded-xl bg-[#0d5930] hover:bg-[#147a44] text-white text-xs font-bold transition-all cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        ) : testado ? (
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Notificação de teste enviada para o seu dispositivo!</span>
          </div>
        ) : (
          <div className="space-y-2 pt-1 relative z-10">
            {avisoErro && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-medium flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                <span>{avisoErro}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAtivar}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#0d5930] to-[#147a44] hover:brightness-110 text-white text-xs font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Ativar Notificações Push</span>
              </button>

              <button
                type="button"
                onClick={handleFechar}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Depois
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
