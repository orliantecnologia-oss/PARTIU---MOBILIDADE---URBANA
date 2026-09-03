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
 * Retorna o estado atual da permissão de notificações
 */
export function getStatusPermissaoPush(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Solicita autorização de Notificações Push ao usuário
 */
export async function solicitarPermissaoPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    alert("Seu navegador não suporta notificações do sistema.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registrarServiceWorker();
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Push Engine] Erro ao solicitar permissão:", err);
    return false;
  }
}

/**
 * Envia uma notificação nativa do sistema (Web Push)
 */
export async function dispararNotificacaoPush({
  titulo,
  corpo,
  rota = "/app/bilhetes",
  icone = "/favicon.ico",
  tag = "univans-push",
}: OpcoesNotificacao): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    const aceitou = await solicitarPermissaoPush();
    if (!aceitou) return false;
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
