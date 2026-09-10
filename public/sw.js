// ==============================================================================
// 🔔 PARTIU SERVICE WORKER — WEB PUSH NOTIFICATIONS & OFFLINE CACHE
// ==============================================================================

const CACHE_NAME = "partiu-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        "/favicon.ico",
        "/icon-192.png",
        "/icon-512.png",
        "/apple-touch-icon.png",
        "/manifest.json",
      ]);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Manipulador de Push Notifications recebidas em segundo plano
self.addEventListener("push", (event) => {
  let data = {
    title: "PARTIU • Viagem & Entregas",
    body: "Seu motorista parceiro está a caminho do ponto de embarque!",
    url: "/app/bilhetes",
    icon: "/icon-192.png",
    tag: "partiu-ride-alert",
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || "/app/bilhetes",
    },
    tag: data.tag || "partiu-alert",
    renotify: true,
    actions: [
      { action: "ver_corrida", title: "Ver Corrida / Entrega" },
      { action: "fechar", title: "Entendido" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Clique na notificação abre o app no bilhete / tela correta
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "fechar") {
    return;
  }

  const urlToOpen = event.notification.data?.url || "/app/bilhetes";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    }),
  );
});
