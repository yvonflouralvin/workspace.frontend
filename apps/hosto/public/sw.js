// Service Worker — notifications Web Push (affichées même onglet/navigateur fermé).

// Prise de contrôle immédiate : le SW s'active et contrôle la page sans attendre un reload,
// pour que getSubscription()/pushManager fonctionnent dès l'activation.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Notification";
  const options = {
    body: data.body || "",
    data: { url: data.url || "/" },
    tag: data.tag,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    renotify: Boolean(data.tag),
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            if ("navigate" in client) client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});
