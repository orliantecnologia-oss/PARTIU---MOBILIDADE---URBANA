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
} from "lucide-react";
import {
  pushNotificationService,
  type AppNotification,
  type NotificationCategory,
} from "@/services/PushNotificationService";
import { useBrandTheme } from "@/hooks/useBrandTheme";

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
  };

  const handleRequestPush = async () => {
    setIsRequestingPush(true);
    const res = await pushNotificationService.requestPermission(userId);
    setIsRequestingPush(false);
    if (res.granted) {
      setPushGranted(true);
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
      <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[88vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-900 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Bell className="w-5 h-5 text-brand-primary-deep" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-brand-primary-deep">
                  Notificações
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs">
                    {unreadCount} nova{unreadCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {userRole === "DRIVER" ? "Avisos e alertas da sua operação" : "Novidades e avisos de viagens"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas e Botão Marcar Todas */}
        <div className="px-4 py-2.5 bg-white/70 backdrop-blur-xs border-b border-slate-200/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("todas")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "todas"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("nao_lidas")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "nao_lidas"
                  ? "bg-white text-brand-primary-deep shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
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

        {/* Banner para Ativação de Push Nativo no Celular / Navegador */}
        {!pushGranted && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-amber-900 leading-tight">
                  Ativar Notificações no Celular
                </h4>
                <p className="text-[10px] text-amber-700 leading-tight truncate">
                  Receba alertas instantâneos mesmo com o app fechado
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isRequestingPush}
              onClick={handleRequestPush}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-black shrink-0 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isRequestingPush ? "Ativando..." : "Ativar"}
            </button>
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
                  if (!item.isRead) handleMarkAsRead(item.id);
                  if (onNotificationClick) onNotificationClick(item);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                  !item.isRead
                    ? "bg-white border-brand-border-active shadow-xs"
                    : "bg-white/80 border-slate-200/70 hover:bg-white"
                }`}
              >
                {!item.isRead && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-brand-primary-vibrant ring-2 ring-blue-100" />
                )}

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
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
      </div>
    </div>
  );
};
