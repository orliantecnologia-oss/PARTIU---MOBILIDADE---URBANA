import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Bell,
  CheckCheck,
  ShieldCheck,
  Coins,
  Car,
  Tag,
  Info,
  Clock,
  ExternalLink,
  Smartphone,
  ChevronRight,
  Share,
  Lock,
  RotateCcw,
  Copy,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  pushNotificationService,
  type AppNotification,
  type NotificationCategory,
} from "@/services/PushNotificationService";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { toast } from "sonner";

export interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userRole?: "PASSENGER" | "DRIVER" | "ADMIN";
  onNotificationClick?: (notification: AppNotification) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  userId,
  userRole = "DRIVER",
  onNotificationClick,
}) => {
  const { corPrimaria, corSecundaria } = useBrandTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeTab, setActiveTab] = useState<"todas" | "nao_lidas">("todas");
  const [pushGranted, setPushGranted] = useState(false);
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const [instructionModal, setInstructionModal] = useState<"ios" | "denied" | "in_app" | null>(null);

  // Carrega notificações e escuta em tempo real
  useEffect(() => {
    if (!isOpen || !userId) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      setPushGranted(Notification.permission === "granted");
    }

    const unsubscribe = pushNotificationService.subscribeToUserNotifications(
      userId,
      (list) => {
        setNotifications(list);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen, userId]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "nao_lidas") {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, activeTab]);

  if (!isOpen) return null;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await pushNotificationService.markAsRead(id, userId);
  };

  const handleMarkAllAsRead = async () => {
    await pushNotificationService.markAllAsRead(userId);
    toast.success("Todas as notificações foram marcadas como lidas.");
  };

  const handleRequestPush = async () => {
    if (isRequestingPush) return;
    setIsRequestingPush(true);

    try {
      const res = await pushNotificationService.requestPermission(userId, userRole);
      setIsRequestingPush(false);

      if (res.granted) {
        setPushGranted(true);
        toast.success("Notificações no celular ativadas com sucesso! 🔔");

        // Tenta disparar uma notificação nativa imediata
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification("🔔 Notificações Ativadas!", {
              body: "Você receberá alertas instantâneos de viagens, corridas e pagamentos.",
              icon: "/icon-192.png",
            });
          } catch {
            // ignore
          }
        }
        return;
      }

      // Trata diagnósticos móveis detalhados
      if (res.reason === "ios_needs_pwa") {
        setInstructionModal("ios");
      } else if (res.reason === "in_app_browser") {
        setInstructionModal("in_app");
      } else if (res.reason === "denied") {
        setInstructionModal("denied");
      } else if (res.reason === "not_supported") {
        toast.error(res.message || "Navegador não suporta notificações em segundo plano.");
      } else {
        toast.error(res.message || "Não foi possível ativar notificações. Tente novamente.");
      }
    } catch (err: any) {
      setIsRequestingPush(false);
      toast.error(err?.message || "Erro ao solicitar ativação de notificações.");
    }
  };

  const renderCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "conta":
      case "veiculo":
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case "bonus":
        return <Coins className="w-4 h-4 text-amber-500" />;
      case "corrida":
        return <Car className="w-4 h-4 text-brand-primary-vibrant" />;
      case "promocao":
        return <Tag className="w-4 h-4 text-purple-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return "Agora";
    if (diffMinutes < 60) return `Há ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Há ${diffDays}d`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[88vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-900 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-hidden relative">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Bell className="w-5 h-5 text-brand-primary-deep" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Notificações
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {userRole === "DRIVER" ? "Avisos operacionais do condutor" : "Novidades e avisos de corrida"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition active:scale-95 cursor-pointer"
            aria-label="Fechar notificações"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas e Ações Rápidas */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("todas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "todas"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("nao_lidas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "nao_lidas"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Não lidas ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="text-[11px] font-bold text-brand-primary-vibrant hover:underline flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Ler todas</span>
            </button>
          )}
        </div>

        {/* ================================================================= */}
        {/* BANNER CLICÁVEL DE ATIVAÇÃO DE PUSH NO CELULAR                    */}
        {/* ================================================================= */}
        {!pushGranted && (
          <div
            role="button"
            tabIndex={0}
            onClick={handleRequestPush}
            className="mx-4 mt-3 p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100/90 active:scale-[0.98] transition cursor-pointer border border-amber-300 flex items-center justify-between gap-3 shrink-0 shadow-xs select-none"
            aria-label="Ativar Notificações no Celular"
          >
            <div className="flex items-center gap-3 min-w-0 pointer-events-none">
              <div className="w-10 h-10 rounded-2xl bg-amber-200/90 text-amber-950 flex items-center justify-center shrink-0 shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-amber-950 leading-tight flex items-center gap-1.5">
                  <span>Ativar Notificações no Celular</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                </h4>
                <p className="text-[11px] text-amber-800 leading-tight mt-0.5 font-medium">
                  Toque aqui para receber alertas mesmo com app fechado
                </p>
              </div>
            </div>

            <div className="shrink-0 pointer-events-none">
              <div className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black shadow-xs flex items-center gap-1.5">
                {isRequestingPush ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Ativando...</span>
                  </>
                ) : (
                  <span>Ativar</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de Notificações com Scroll Suave */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-600">
                {activeTab === "nao_lidas"
                  ? "Nenhuma notificação não lida!"
                  : "Nenhuma notificação por enquanto."}
              </p>
              <p className="text-[11px] text-slate-400">
                Avisos importantes sobre corridas e saldo aparecerão aqui.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (!item.isRead) {
                    handleMarkAsRead(item.id);
                  }
                  onNotificationClick?.(item);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  !item.isRead
                    ? "bg-white border-blue-200/90 shadow-xs hover:border-brand-primary-vibrant"
                    : "bg-slate-50/60 border-slate-200/60 hover:bg-white"
                }`}
              >
                {/* Ponto indicador de não lida */}
                {!item.isRead && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-brand-primary-vibrant animate-pulse" />
                )}

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {renderCategoryIcon(item.category)}
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-baseline justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-black text-slate-950 truncate">
                        {item.title}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/70">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(item.createdAt)}</span>
                      </div>

                      {!item.isRead ? (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          className="text-[10px] font-bold text-brand-primary-vibrant hover:underline cursor-pointer"
                        >
                          Marcar como lida
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                          ✓ Lida
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé Seguro */}
        <div className="p-3 bg-white border-t border-slate-100 text-center shrink-0">
          <p className="text-[10.5px] text-slate-400 font-medium">
            PARTIU Mobilidade Urbana • Notificações Seguras em Tempo Real
          </p>
        </div>

        {/* ================================================================= */}
        {/* MODAL INSTRUCIONAL: IPHONE (IOS PWA)                              */}
        {/* ================================================================= */}
        {instructionModal === "ios" && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-primary-vibrant flex items-center justify-center">
                    <Share className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Notificações no iPhone</h3>
                    <p className="text-[11px] text-slate-500">Exigência do sistema iOS</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInstructionModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900 leading-snug">
                  No iPhone (Safari), a Apple requer que o app seja adicionado à Tela de Início para habilitar alertas em segundo plano:
                </p>
                <ol className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Toque no botão de <strong>Compartilhar</strong> do Safari (ícone de quadrado com seta para cima no rodapé).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Abra o app pelo novo ícone na tela inicial e ative as notificações!</span>
                  </li>
                </ol>
              </div>

              <button
                type="button"
                onClick={() => setInstructionModal(null)}
                style={{
                  background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
                }}
                className="w-full h-11 rounded-xl text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL INSTRUCIONAL: PERMISSÃO NEGADA / BLOQUEADA                   */}
        {/* ================================================================= */}
        {instructionModal === "denied" && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Notificações Bloqueadas</h3>
                    <p className="text-[11px] text-slate-500">Desbloqueie no seu navegador</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInstructionModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900 leading-snug">
                  As notificações foram bloqueadas nas permissões do site. Para liberar:
                </p>
                <ol className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Toque no ícone de <strong>cadeado ou configurações</strong> na barra de endereço (onde fica o link do site).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Toque em <strong>"Permissões"</strong> &gt; <strong>"Notificações"</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Altere para <strong>"Permitir"</strong> e recarregue a página.</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{
                    background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
                  }}
                  className="w-full h-11 rounded-xl text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Recarregar Página</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInstructionModal(null)}
                  className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL INSTRUCIONAL: IN-APP BROWSER (WHATSAPP/INSTAGRAM)           */}
        {/* ================================================================= */}
        {instructionModal === "in_app" && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Navegador Interno</h3>
                    <p className="text-[11px] text-slate-500">WhatsApp / Instagram / Facebook</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInstructionModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900 leading-snug">
                  Navegadores embutidos em redes sociais não suportam notificações do sistema.
                </p>
                <ol className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Toque nos <strong>três pontinhos (...)</strong> no canto superior da tela.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Selecione <strong>"Abrir no Chrome"</strong> ou <strong>"Abrir no Safari"</strong>.</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Link copiado! Cole no Chrome ou Safari.");
                    }
                    setInstructionModal(null);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
                  }}
                  className="w-full h-11 rounded-xl text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar Link do App</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInstructionModal(null)}
                  className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenterModal;
