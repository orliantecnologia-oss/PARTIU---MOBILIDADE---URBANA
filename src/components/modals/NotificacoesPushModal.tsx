import { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldCheck,
  Bike,
  PackageCheck,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import {
  getStatusPermissaoPush,
  solicitarPermissaoPush,
  dispararNotificacaoPush,
  isInAppBrowser,
} from "@/lib/push-notifications";

interface NotificacoesPushModalProps {
  aberto: boolean;
  onFechar: () => void;
}

export function NotificacoesPushModal({
  aberto,
  onFechar,
}: NotificacoesPushModalProps) {
  const { corPrimaria, corTextoPrimaria } = useBrandTheme();
  const [permissao, setPermissao] = useState<NotificationPermission>("default");
  const [carregando, setCarregando] = useState(false);
  const [notificacaoTestada, setNotificacaoTestada] = useState(false);
  const [avisoErro, setAvisoErro] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      setPermissao(getStatusPermissaoPush());
      setNotificacaoTestada(false);
      setAvisoErro(null);
    }
  }, [aberto]);

  if (!aberto) return null;

  async function handleAtivarPush() {
    setCarregando(true);
    setAvisoErro(null);

    const resultado = await solicitarPermissaoPush();
    setCarregando(false);

    if (resultado.sucesso) {
      setPermissao("granted");
      await dispararNotificacaoPush({
        titulo: "🔔 Notificações Ativadas!",
        corpo: "Você receberá alertas em tempo real sobre a coleta e entrega de suas encomendas.",
        rota: "/app/encomendas",
        tag: "partiu-push-ativado",
      });
      setNotificacaoTestada(true);
    } else {
      setPermissao(getStatusPermissaoPush());
      setAvisoErro(resultado.mensagem || "Não foi possível conceder permissão.");
    }
  }

  async function handleDispararTeste() {
    setCarregando(true);
    const sucesso = await dispararNotificacaoPush({
      titulo: "📦 PARTIU Entrega - Alerta de Teste",
      corpo: "Seu motoboy parceiro está a caminho do ponto de coleta! (Teste do Sistema)",
      rota: "/app/encomendas",
      tag: "partiu-test-push",
    });
    setCarregando(false);
    if (sucesso) {
      setNotificacaoTestada(true);
      setTimeout(() => setNotificacaoTestada(false), 3500);
    } else {
      setAvisoErro("Não foi possível disparar a notificação. Verifique as permissões.");
    }
  }

  const isBrowserInterno = isInAppBrowser();

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-hide-bottom-nav="true"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex justify-center items-end sm:items-center animate-in fade-in duration-200"
    >
      <div className="w-full max-w-[430px] max-h-[92vh] sm:max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header com estilo elegante */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-400/20 text-amber-900 flex items-center justify-center font-bold">
              <BellRing className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                Notificações em Tempo Real
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 leading-none mt-0.5">
                Atualizações de coletas e entregas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-left">
          
          {/* Status Atual do Push */}
          {permissao === "granted" ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-emerald-950">
                    Notificações Push Ativas
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                    Pronto
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium leading-relaxed mt-1">
                  Seu navegador está configurado para receber alertas em segundo plano quando o entregador aceitar a corrida ou finalizar o trajeto.
                </p>
              </div>
            </div>
          ) : permissao === "denied" ? (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-black text-rose-950 block">
                  Permissão Bloqueada no Navegador
                </span>
                <p className="text-[11px] text-rose-800 font-medium leading-relaxed mt-1">
                  As notificações estão bloqueadas nas configurações do navegador. Clique no ícone de cadeado na barra de endereços para permitir.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-black text-amber-950 block">
                  Ative as Notificações de Bordo
                </span>
                <p className="text-[11px] text-amber-900 font-medium leading-relaxed mt-1">
                  Receba avisos imediatos quando um entregador aceitar sua encomenda e estiver no local de coleta.
                </p>
              </div>
            </div>
          )}

          {/* Aviso In-App Browser (se aplicável) */}
          {isBrowserInterno && (
            <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>Navegador Interno Detectado</span>
              </div>
              <p>
                Para notificações push garantidas mesmo com a tela bloqueada, recomendamos abrir este link no <strong>Google Chrome</strong> ou <strong>Safari</strong>.
              </p>
            </div>
          )}

          {/* O que você recebe */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              Eventos Notificados
            </span>

            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Bike className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    Entregador a caminho
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Alerta de aproximação do ponto de coleta
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    Pacote retirado
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Confirmação de que a carga está em rota
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    PIN & Entrega concluída
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Código de segurança validado no destino
                  </span>
                </div>
              </div>
            </div>
          </div>

          {avisoErro && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{avisoErro}</span>
            </div>
          )}

          {notificacaoTestada && (
            <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Notificação enviada com sucesso para o seu celular!</span>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
          {permissao !== "granted" ? (
            <button
              type="button"
              disabled={carregando}
              onClick={handleAtivarPush}
              style={{
                backgroundColor: corPrimaria,
                color: corTextoPrimaria,
              }}
              className="w-full py-3 px-4 rounded-2xl font-black text-sm shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Bell className="w-4 h-4" />
              <span>{carregando ? "Ativando..." : "Ativar Notificações Push"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={carregando}
                onClick={handleDispararTeste}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-sm active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Testar Notificação</span>
              </button>

              <button
                type="button"
                onClick={onFechar}
                className="py-2.5 px-4 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer"
              >
                Concluir
              </button>
            </div>
          )}

          <p className="text-[10px] text-center text-slate-400 font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Notificações criptografadas com Web Push API</span>
          </p>
        </div>
      </div>
    </div>
  );
}
