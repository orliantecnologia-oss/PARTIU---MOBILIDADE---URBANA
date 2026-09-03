/**
 * ==============================================================================
 * 🔔 UNIVANS WEB PUSH NOTIFICATION ENGINE
 * Gerenciamento de Permissões, Service Worker e Disparos de Notificações Push
 * ==============================================================================
 */

export interface OpcoesNotificacao {
  titulo: string;
  corpo: string;
  rota?: string;
  icone?: string;
  tag?: string;
}

/**
 * Registra o Service Worker em navegadores compatíveis
 */
export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return registration;
  } catch (err) {
    console.warn("[Push Engine] Falha ao registrar Service Worker:", err);
    return null;
  }
}

/**
 * Detecta se o app está rodando dentro do navegador interno do Facebook, Instagram, WhatsApp, etc.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  return /FBAN|FBAV|Instagram|WhatsApp|Line|musical_ly|BytedanceWebview/i.test(ua);
}

/**
 * Retorna se o navegador atual tem suporte a Web Push Notifications reais
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator;
}

/**
 * Retorna o estado atual da permissão de notificações
 */
export function getStatusPermissaoPush(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

export interface ResultadoSolicitacaoPush {
  sucesso: boolean;
  motivo?: "in_app_browser" | "nao_suportado" | "negado" | "concedido";
  mensagem?: string;
}

/**
 * Solicita autorização de Notificações Push ao usuário com diagnóstico de ambiente
 */
export async function solicitarPermissaoPush(): Promise<ResultadoSolicitacaoPush> {
  if (typeof window === "undefined") {
    return { sucesso: false, motivo: "nao_suportado" };
  }

  // Detectar navegador embutido (ex: Facebook do screenshot)
  if (isInAppBrowser()) {
    return {
      sucesso: false,
      motivo: "in_app_browser",
      mensagem:
        "O navegador do Facebook não suporta notificações em segundo plano. Abra no Google Chrome para ativar.",
    };
  }

  if (!("Notification" in window)) {
    return {
      sucesso: false,
      motivo: "nao_suportado",
      mensagem:
        "Este navegador não suporta notificações push do sistema. Abra no Google Chrome ou adicione o app à tela inicial.",
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registrarServiceWorker();
      return { sucesso: true, motivo: "concedido" };
    }
    return {
      sucesso: false,
      motivo: "negado",
      mensagem: "Permissão de notificações não foi concedida.",
    };
  } catch (err) {
    console.warn("[Push Engine] Falha ao solicitar permissão de push:", err);
    return {
      sucesso: false,
      motivo: "nao_suportado",
      mensagem: "Não foi possível ativar notificações push neste navegador.",
    };
  }
}

/**
 * Envia uma notificação nativa do sistema (Web Push)
 */
export async function dispararNotificacaoPush({
  titulo,
  corpo,
  rota = "/app/bilhetes",
  icone = "/icon-192.png",
  tag = "univans-push",
}: OpcoesNotificacao): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    const aceitou = await solicitarPermissaoPush();
    if (!aceitou.sucesso) return false;
  }

  try {
    // 1. Tenta via Service Worker Registration (mais robusto no mobile/PWA)
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(titulo, {
          body: corpo,
          icon: icone,
          badge: icone,
          tag,
          data: { url: rota },
        });
        return true;
      }
    }

    // 2. Fallback via Notification API direta
    const notif = new Notification(titulo, {
      body: corpo,
      icon: icone,
      tag,
    });

    notif.onclick = () => {
      window.focus();
      window.location.href = rota;
    };

    return true;
  } catch (err) {
    console.error("[Push Engine] Erro ao disparar notificação:", err);
    return false;
  }
}

/**
 * Atalhos Preditivos
 */
export async function notificarAproximacaoTrevo(vanNome: string, minutos: number, trevo: string) {
  return dispararNotificacaoPush({
    titulo: `🟢 ${vanNome} se aproximando!`,
    corpo: `Sua van chega em ~${minutos} minutos no ${trevo}. Dirija-se ao ponto de embarque.`,
    rota: "/app/bilhetes",
    tag: "trevo-arrival",
  });
}

export async function notificarBilheteConfirmado(origem: string, destino: string, assento: string) {
  return dispararNotificacaoPush({
    titulo: "🎫 Passagem Confirmada!",
    corpo: `Assento ${assento} reservado: ${origem} ➔ ${destino}. Tenha o QR Code em mãos.`,
    rota: "/app/bilhetes",
    tag: "ticket-confirmed",
  });
}

export async function notificarEncomendaStatus(codigo: string, statusTexto: string) {
  return dispararNotificacaoPush({
    titulo: `📦 Encomenda ${codigo}`,
    corpo: `Atualização de status: ${statusTexto}.`,
    rota: "/app/encomendas",
    tag: "encomenda-status",
  });
}
