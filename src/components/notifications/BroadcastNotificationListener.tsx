import { useState, useEffect, useCallback } from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BellRing,
  AlertTriangle,
  Info,
  Sparkles,
  Zap,
  X,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import {
  type NotificacaoBroadcast,
  type CategoriaDestinatario,
  marcarNotificacaoComoLida,
  isNotificacaoLida,
  obterNotificacoesParaCategoria,
} from "@/lib/broadcast-notifications";
import { getBeneficiarioGratuidade } from "@/lib/passagens-store";
import { silentCatchWarn } from "@/lib/structured-logger";


function tocarSinalNotificacao() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) { silentCatchWarn("BroadcastNotificationListener", err); }
}

export function BroadcastNotificationListener() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [notificacaoAtiva, setNotificacaoAtiva] = useState<NotificacaoBroadcast | null>(null);

  // Determinar a categoria do usuário no contexto atual
  const detectarCategoriaAtual = useCallback((): "usuario" | "gratis" | "motorista" => {
    if (pathname.includes("/motorista")) {
      return "motorista";
    }
    if (pathname.includes("/beneficios") || getBeneficiarioGratuidade() !== null) {
      return "gratis";
    }
    return "usuario";
  }, [pathname]);

  // Escuta novos disparos emitidos pelo Painel Admin
  useEffect(() => {
    function handleNovaNotificacao(e: Event) {
      const customEvent = e as CustomEvent<NotificacaoBroadcast>;
      const notif = customEvent.detail;
      if (!notif) return;

      const categoria = detectarCategoriaAtual();
      const ehParaMim = notif.categoria === "todos" || notif.categoria === categoria;

      if (ehParaMim && !isNotificacaoLida(notif.id)) {
        setNotificacaoAtiva(notif);
        tocarSinalNotificacao();
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate([100, 50, 100]);
          } catch (_err) {
            // Ignorado se não permitido
          }
        }
      }
    }

    window.addEventListener("partiu:nova_notificacao_broadcast", handleNovaNotificacao);
    window.addEventListener("univans:nova_notificacao_broadcast", handleNovaNotificacao);
    return () => {
      window.removeEventListener("partiu:nova_notificacao_broadcast", handleNovaNotificacao);
      window.removeEventListener("univans:nova_notificacao_broadcast", handleNovaNotificacao);
    };
  }, [detectarCategoriaAtual]);

  // Checar ao montar se há alguma notificação recente não lida
  useEffect(() => {
    const categoria = detectarCategoriaAtual();
    const lista = obterNotificacoesParaCategoria(categoria);
    const naoLidas = lista.filter((n) => !isNotificacaoLida(n.id));
    if (naoLidas.length > 0) {
      // Exibe a mais recente
      const maisRecente = naoLidas[0];
      if (maisRecente) {
        const visualizadaNaSessao = sessionStorage.getItem(`partiu_visto_${maisRecente.id}`);
        if (!visualizadaNaSessao) {
          setNotificacaoAtiva(maisRecente);
          sessionStorage.setItem(`partiu_visto_${maisRecente.id}`, "true");
        }
      }
    }
  }, [detectarCategoriaAtual]);

  // No fluxo principal de corridas e encomendas, notificações são acessadas pelo sino do cabeçalho
  // Nunca sobrepor modais intrusivos durante a definição de rota e solicitação de corrida
  const isPassengerFlow = pathname === "/app" || pathname === "/app/" || pathname.startsWith("/app/encomendas");
  if (isPassengerFlow) return null;

  if (!notificacaoAtiva) return null;

  function handleFechar() {
    if (notificacaoAtiva) {
      marcarNotificacaoComoLida(notificacaoAtiva.id);
      setNotificacaoAtiva(null);
    }
  }

  function handleAcessar() {
    if (notificacaoAtiva) {
      marcarNotificacaoComoLida(notificacaoAtiva.id);
      const rota = notificacaoAtiva.rotaDestino || "/app";
      setNotificacaoAtiva(null);
      navigate({ to: rota as any });
    }
  }

  const badgesCategoria: Record<
    CategoriaDestinatario,
    { label: string; bg: string; text: string }
  > = {
    todos: { label: "COMUNICADO GERAL", bg: "bg-slate-800", text: "text-slate-100 font-black" },
    usuario: { label: "PASSAGEIROS PARTIU", bg: "bg-[#0088FF]", text: "text-slate-950 font-black" },
    gratis: { label: "CUPONS & BENEFÍCIOS", bg: "bg-emerald-500", text: "text-slate-950 font-black" },
    motorista: { label: "CONDUTORES & ENTREGADORES", bg: "bg-cyan-400", text: "text-slate-950 font-black" },
  };

  const estilosUrgencia = {
    info: {
      borda: "border-emerald-500/40",
      fundo: "bg-slate-900/95",
      icone: <Info className="h-5 w-5 text-emerald-400" />,
    },
    alerta: {
      borda: "border-primary-600/60",
      fundo: "bg-slate-900/95",
      icone: <AlertTriangle className="h-5 w-5 text-primary-600 animate-pulse" />,
    },
    urgente: {
      borda: "border-rose-500/70",
      fundo: "bg-slate-950/98",
      icone: <ShieldAlert className="h-5 w-5 text-rose-500 animate-bounce" />,
    },
    promocao: {
      borda: "border-purple-500/50",
      fundo: "bg-slate-900/95",
      icone: <Sparkles className="h-5 w-5 text-purple-400" />,
    },
  }[notificacaoAtiva.urgencia];

  const infoBadge = badgesCategoria[notificacaoAtiva.categoria] || badgesCategoria.todos;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[400px] z-[9999] animate-in slide-in-from-top-4 duration-300">
      <div
        className={`p-3.5 rounded-2xl ${estilosUrgencia.fundo} text-white shadow-2xl border ${estilosUrgencia.borda} backdrop-blur-md space-y-2`}
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/10 shrink-0">{estilosUrgencia.icone}</div>
            <div>
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${infoBadge.bg} ${infoBadge.text}`}
              >
                {infoBadge.label}
              </span>
              <h4 className="text-xs sm:text-sm font-black text-white leading-tight mt-1">
                {notificacaoAtiva.titulo}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFechar}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-normal">
          {notificacaoAtiva.mensagem}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <span className="text-[10px] text-slate-400 font-medium">
            {notificacaoAtiva.enviadoPor}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleFechar}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Dispensar
            </button>
            {notificacaoAtiva.rotaDestino && (
              <button
                type="button"
                onClick={handleAcessar}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#0d5930] hover:bg-[#147a44] text-white text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <span>Ver Agora</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
