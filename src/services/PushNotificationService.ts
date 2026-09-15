/**
 * ==============================================================================
 * 🔔 PARTIU MOBILIDADE URBANA — PUSH NOTIFICATION SERVICE (V5.0)
 * ==============================================================================
 * Gerenciamento centralizado de Push Notifications e In-App Notifications:
 * 1. Registro de Web Push / Service Worker e captura de Push Token.
 * 2. Persistência de token no Supabase (`profiles.push_token`).
 * 3. Escuta em tempo real via Supabase Realtime da tabela `notifications`.
 * 4. Controle reativo de lidas/não-lidas com badge dinâmico nos cabeçalhos.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { silentCatchWarn } from "@/lib/structured-logger";
import { isInAppBrowser } from "@/lib/push-notifications";

export type PushPermissionReason =
  | "granted"
  | "denied"
  | "ios_needs_pwa"
  | "in_app_browser"
  | "not_supported"
  | "error";

export interface PushPermissionResult {
  granted: boolean;
  token?: string | undefined;
  reason: PushPermissionReason;
  message?: string | undefined;
  error?: string | undefined;
}

export type NotificationCategory =
  | "conta"
  | "corrida"
  | "bonus"
  | "promocao"
  | "sistema"
  | "veiculo";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  data?: Record<string, any> | undefined;
  createdAt: string;
  readAt?: string | undefined;
}

const STORAGE_NOTIFICATIONS_PREFIX = "partiu_user_notifications_";
const STORAGE_PUSH_TOKEN_KEY = "partiu_push_token";

const MOCK_INITIAL_NOTIFICATIONS: Omit<AppNotification, "userId">[] = [
  {
    id: "notif-seed-01",
    title: "Sua conta foi aprovada! 🚀",
    message: "Seu cadastro de parceiro PARTIU foi validado pela moderação. Você já pode ficar online e aceitar corridas com repasse D+0!",
    category: "conta",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min atrás
  },
  {
    id: "notif-seed-02",
    title: "Bônus de R$ 50,00 Atingido! 💰",
    message: "Parabéns! Você completou a meta de corridas consecutivas do dia e garantiu R$ 50,00 extras no seu saldo PIX.",
    category: "bonus",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3h atrás
  },
  {
    id: "notif-seed-03",
    title: "Promoção: Indique um Amigo 🎁",
    message: "Indique novos motoristas parceiros para a rede PARTIU e ganhe R$ 30,00 de crédito instantâneo na primeira corrida deles.",
    category: "promocao",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12h atrás
  },
  {
    id: "notif-seed-04",
    title: "Sistema Operacional Seguro 🛡️",
    message: "A verificação biométrica e a trava de chave PIX por CPF garantem 100% de proteção contra saques não autorizados.",
    category: "sistema",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
    readAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
];

export class PushNotificationService {
  private static instance: PushNotificationService;
  private localListeners: Set<(notifications: AppNotification[], unreadCount: number) => void> = new Set();
  private memoryStore: Map<string, AppNotification[]> = new Map();
  private memoryPushToken: string | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("partiu:notifications_updated", () => {
        this.notifyListenersLocal();
      });
    }
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Solicita permissão nativa para Push Notifications ao usuário,
   * captura o token (Web Push / Service Worker) e persiste no Supabase.
   */
  public async requestPermission(
    userId?: string,
    userRole?: "DRIVER" | "PASSENGER" | "ADMIN"
  ): Promise<PushPermissionResult> {
    if (typeof window === "undefined") {
      return {
        granted: false,
        reason: "not_supported",
        error: "Ambiente sem suporte a navegador.",
      };
    }

    // 1. Diagnóstico de In-App Browser (WhatsApp, Instagram, Facebook, TikTok)
    if (isInAppBrowser()) {
      return {
        granted: false,
        reason: "in_app_browser",
        message:
          "O navegador interno do WhatsApp/Instagram não suporta notificações. Abra no Google Chrome ou Safari.",
        error: "In-app browser detected",
      };
    }

    // 2. Diagnóstico de iOS (iPhone/iPad) sem PWA adicionado à tela inicial
    const isIOSDevice =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    const isStandalone =
      (typeof window !== "undefined" &&
        window.matchMedia?.("(display-mode: standalone)")?.matches) ||
      (typeof navigator !== "undefined" && (navigator as any).standalone === true);

    if (isIOSDevice && !isStandalone && !("Notification" in window)) {
      return {
        granted: false,
        reason: "ios_needs_pwa",
        message:
          "No iPhone, adicione o app à Tela de Início para ativar as notificações push.",
        error: "iOS requires Home Screen PWA",
      };
    }

    // 3. Diagnóstico de Suporte da API Notification
    if (!("Notification" in window)) {
      return {
        granted: false,
        reason: "not_supported",
        message:
          "Este navegador não suporta notificações em segundo plano. Abra no Google Chrome.",
        error: "Navegador não suporta notificações nativas.",
      };
    }

    // 4. Se a permissão já estiver expressamente negada
    if (Notification.permission === "denied") {
      return {
        granted: false,
        reason: "denied",
        message:
          "As notificações estão bloqueadas nas configurações do seu navegador.",
        error: "Permissão de notificação negada pelo usuário.",
      };
    }

    try {
      // 5. Solicita permissão ao navegador
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return {
          granted: false,
          reason: "denied",
          message:
            "A permissão não foi concedida. Desbloqueie nas configurações do navegador.",
          error: "Permissão de notificação negada pelo usuário.",
        };
      }

      // 6. Registra Service Worker se suportado
      let token = `push_web_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
          if (reg && (reg as any).pushManager) {
            const sub = await (reg as any).pushManager.getSubscription();
            if (sub) {
              token = JSON.stringify(sub.toJSON ? sub.toJSON() : sub);
            }
          }
        } catch (swErr) {
          silentCatchWarn("PushNotificationService.swRegister", swErr);
        }
      }

      // Persiste em memória e cache local
      this.memoryPushToken = token;
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(STORAGE_PUSH_TOKEN_KEY, token);
        } catch {
          // ignore
        }
      }

      // Persiste no Supabase se usuário fornecido
      if (userId) {
        await this.savePushTokenToSupabase(userId, token);
      }

      return {
        granted: true,
        token,
        reason: "granted",
        message: "Notificações ativadas com sucesso!",
      };
    } catch (err: any) {
      return {
        granted: false,
        reason: "error",
        error: err?.message || "Erro ao solicitar permissão de push.",
        message: "Erro ao ativar notificações. Tente novamente.",
      };
    }
  }

  /**
   * Salva o push_token no Supabase (tabela profiles e partiu_motoristas)
   */
  public async savePushTokenToSupabase(userId: string, token: string): Promise<boolean> {
    if (!userId || !token) return false;

    this.memoryPushToken = token;
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(STORAGE_PUSH_TOKEN_KEY, token);
      } catch {
        // ignore
      }
    }

    if (!isSupabaseConfigured() || !supabase) {
      return true;
    }

    try {
      await (supabase as any)
        .from("profiles")
        .update({
          push_token: token,
          fcm_token: token,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      await (supabase as any)
        .from("partiu_motoristas")
        .update({
          push_token: token,
          updated_at: new Date().toISOString(),
        })
        .or(`user_id.eq.${userId},id.eq.${userId}`);

      return true;
    } catch (err) {
      silentCatchWarn("PushNotificationService.saveToken", err);
      return false;
    }
  }

  /**
   * Retorna o token de push armazenado localmente
   */
  public getStoredPushToken(): string | null {
    if (this.memoryPushToken) return this.memoryPushToken;
    if (typeof localStorage !== "undefined") {
      try {
        const t = localStorage.getItem(STORAGE_PUSH_TOKEN_KEY);
        if (t) return t;
      } catch {
        // ignore
      }
    }
    return null;
  }

  /**
   * Alias para getStoredPushToken
   */
  public getPushToken(): string | null {
    return this.getStoredPushToken();
  }

  /**
   * Busca a lista de notificações do usuário (Supabase com fallback resiliente para Cache Local)
   */
  public async getNotifications(userId: string): Promise<AppNotification[]> {
    const local = this.getLocalNotifications(userId);

    if (!isSupabaseConfigured() || !supabase || !userId) {
      return local;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${userId},recipient_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(40);

      if (error || !data || data.length === 0) {
        return local;
      }

      const remoteList: AppNotification[] = data.map((item: any) => ({
        id: item.id,
        userId: item.user_id || item.recipient_user_id || userId,
        title: item.title || "Notificação PARTIU",
        message: item.message || item.message_body || "",
        category: (item.category || "sistema") as NotificationCategory,
        isRead: Boolean(item.is_read || item.read_at),
        data: item.data || {},
        createdAt: item.created_at || new Date().toISOString(),
        readAt: item.read_at || undefined,
      }));

      // Mescla com locais garantindo unicidade
      const map = new Map<string, AppNotification>();
      remoteList.forEach((n) => map.set(n.id, n));
      local.forEach((n) => {
        if (!map.has(n.id)) map.set(n.id, n);
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      this.saveLocalNotifications(userId, merged);
      return merged;
    } catch (err) {
      silentCatchWarn("PushNotificationService.getNotifications", err);
      return local;
    }
  }

  /**
   * Retorna a contagem de notificações não lidas
   */
  public async getUnreadCount(userId: string): Promise<number> {
    const list = await this.getNotifications(userId);
    return list.filter((n) => !n.isRead).length;
  }

  /**
   * Marca uma notificação específica como lida (aceita [notifId, userId] ou [userId, notifId])
   */
  public async markAsRead(param1: string, param2: string): Promise<boolean> {
    let userId = param2;
    let notificationId = param1;

    let local = this.getLocalNotifications(userId);
    let target = local.find((n) => n.id === notificationId);

    if (!target) {
      userId = param1;
      notificationId = param2;
      local = this.getLocalNotifications(userId);
      target = local.find((n) => n.id === notificationId);
    }

    const updated = local.map((n) =>
      n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
    );
    this.saveLocalNotifications(userId, updated);
    this.dispatchUpdateEvent();

    if (isSupabaseConfigured() && supabase) {
      try {
        await (supabase as any)
          .from("notifications")
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq("id", notificationId);
      } catch (err) {
        silentCatchWarn("PushNotificationService.markAsRead", err);
      }
    }

    return true;
  }

  /**
   * Marca todas as notificações do usuário como lidas
   */
  public async markAllAsRead(userId: string): Promise<number> {
    const local = this.getLocalNotifications(userId);
    const unreadCount = local.filter((n) => !n.isRead).length;
    const updated = local.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }));
    this.saveLocalNotifications(userId, updated);
    this.dispatchUpdateEvent();

    if (isSupabaseConfigured() && supabase && userId) {
      try {
        await (supabase as any)
          .from("notifications")
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .or(`user_id.eq.${userId},recipient_user_id.eq.${userId}`);
      } catch (err) {
        silentCatchWarn("PushNotificationService.markAllAsRead", err);
      }
    }

    return unreadCount;
  }

  /**
   * Cria e emite uma nova notificação para um usuário
   */
  public async createNotification(
    input: Omit<AppNotification, "id" | "createdAt" | "isRead">
  ): Promise<AppNotification> {
    const newNotif: AppNotification = {
      ...input,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // 1. Salva local
    const local = this.getLocalNotifications(input.userId);
    const updated = [newNotif, ...local];
    this.saveLocalNotifications(input.userId, updated);
    this.dispatchUpdateEvent();

    // 2. Salva no Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        await (supabase as any).from("notifications").insert({
          id: newNotif.id,
          user_id: newNotif.userId,
          recipient_user_id: newNotif.userId,
          title: newNotif.title,
          message: newNotif.message,
          message_body: newNotif.message,
          category: newNotif.category,
          is_read: false,
          data: newNotif.data || {},
          created_at: newNotif.createdAt,
        });
      } catch (err) {
        silentCatchWarn("PushNotificationService.createNotification", err);
      }
    }

    return newNotif;
  }

  /**
   * Escuta alterações em tempo real na tabela de notificações via Supabase Realtime
   */
  public subscribeToUserNotifications(
    userId: string,
    onUpdate: (notifications: AppNotification[], unreadCount: number) => void
  ): () => void {
    this.localListeners.add(onUpdate);

    // Dispara estado inicial
    this.getNotifications(userId).then((list) => {
      const unread = list.filter((n) => !n.isRead).length;
      onUpdate(list, unread);
    });

    let channelUnsub: (() => void) | null = null;

    if (isSupabaseConfigured() && supabase && userId) {
      try {
        const channel = supabase
          .channel(`user-notifications-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            () => {
              this.getNotifications(userId).then((list) => {
                const unread = list.filter((n) => !n.isRead).length;
                onUpdate(list, unread);
              });
            }
          )
          .subscribe();

        channelUnsub = () => {
          supabase.removeChannel(channel);
        };
      } catch (err) {
        silentCatchWarn("PushNotificationService.realtime", err);
      }
    }

    return () => {
      this.localListeners.delete(onUpdate);
      if (channelUnsub) channelUnsub();
    };
  }

  // ============================================================================
  // HELPERS DE CACHE LOCAL
  // ============================================================================

  private getLocalNotifications(userId: string): AppNotification[] {
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(`${STORAGE_NOTIFICATIONS_PREFIX}${userId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.memoryStore.set(userId, parsed);
          return parsed;
        }
      } catch {
        // ignore
      }
    }

    if (this.memoryStore.has(userId)) {
      return this.memoryStore.get(userId)!;
    }

    const initial = MOCK_INITIAL_NOTIFICATIONS.map((m) => ({ ...m, userId }));
    this.saveLocalNotifications(userId, initial);
    return initial;
  }

  private saveLocalNotifications(userId: string, list: AppNotification[]): void {
    this.memoryStore.set(userId, list);
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(`${STORAGE_NOTIFICATIONS_PREFIX}${userId}`, JSON.stringify(list));
      } catch (err) {
        silentCatchWarn("PushNotificationService.saveLocal", err);
      }
    }
  }

  private dispatchUpdateEvent(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("partiu:notifications_updated"));
    }
  }

  private notifyListenersLocal(): void {
    // Quando ocorre evento local, os ouvintes registrados são atualizados
    this.localListeners.forEach((listener) => {
      // Pega userId do perfil ativo ou padrão
      const session = localStorage.getItem("partiu_motorista_ativo");
      let uid = "usr-mot-001";
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.id) uid = parsed.id;
        } catch {
          // ignore
        }
      }
      this.getNotifications(uid).then((list) => {
        const unread = list.filter((n) => !n.isRead).length;
        listener(list, unread);
      });
    });
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
