/* Service Worker – macht die App in Chrome installierbar (PWA) */
const CACHE_NAME = "wop-party-v9";
const PRECACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/wop-socket-client.js",
  "./js/sileo-bundle.js",
  "./js/sileo-bundle.css",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./apple-touch-icon-180.png",
  "./favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first für HTML/JS (Spiel bleibt aktuell), Cache-Fallback offline
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // WebSockets & REST APIs niemals cachen
  if (url.pathname.startsWith("/socket.io/") ||
      url.pathname.startsWith("/api/") ||
      url.hostname.includes("googleapis.com") ||
      url.hostname.includes("gstatic.com")) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          try { cache.put(req, copy); } catch (e) {}
        });
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});


/* System-Benachrichtigungen (Hintergrund / geschlossene App / installierte PWA) */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          client.postMessage({ type: "NOTIFICATION_CLICK", data: data });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

let lastClientVisibleAt = 0;

try {
  const visChannel = new BroadcastChannel("wop_visibility_channel");
  visChannel.onmessage = (event) => {
    const msg = event.data || {};
    if (msg.type === "CLIENT_VISIBILITY") {
      lastClientVisibleAt = msg.visible ? (msg.timestamp || Date.now()) : 0;
    }
  };
} catch (e) {}

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "CLIENT_VISIBILITY") {
    lastClientVisibleAt = msg.visible ? (msg.timestamp || Date.now()) : 0;
    return;
  }
  if (msg.type === "SHOW_NOTIFICATION") {
    event.waitUntil(
      self.registration.showNotification(msg.title || "Wahrheit oder Pflicht", {
        body: msg.body || "",
        icon: msg.icon || "./icon-192.png",
        badge: msg.badge || "./favicon-48.png",
        tag: msg.tag || "wop-notify",
        renotify: true,
        requireInteraction: false,
        data: msg.data || {}
      })
    );
  }
});

// Push-Events: auch bei geschlossener App (wenn Server/FCM einen Push schickt)
self.addEventListener("push", (event) => {
  let payload = { title: "Wahrheit oder Pflicht", body: "", data: {} };
  try {
    if (event.data) {
      const json = event.data.json();
      if (json) {
        payload.title = json.title || payload.title;
        payload.body = json.body || json.message || "";
        payload.data = json.data || {};
        if (json.icon) payload.icon = json.icon;
        if (json.tag) payload.tag = json.tag;
      } else {
        payload.body = event.data.text() || "";
      }
    }
  } catch (e) {
    try { payload.body = event.data ? event.data.text() : ""; } catch (e2) {}
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Prüfen, ob die App aktuell geöffnet und im Vordergrund (visible oder focused) ist:
      const hasVisibleClient = clientList && clientList.some((client) => client.visibilityState === "visible" || client.focused === true);
      const isRecentlyVisible = (Date.now() - lastClientVisibleAt) < 15000;
      const isAppVisible = Boolean(hasVisibleClient || isRecentlyVisible);

      if (isAppVisible) {
        // App ist im Vordergrund geöffnet: Nur In-App-Benachrichtigung (Sileo Toast), KEINE System-Benachrichtigung!
        console.log("[SW] Push-Event empfangen, aber App ist im Vordergrund aktiv. System-Benachrichtigung wird unterdrückt.");
        return;
      }

      return self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || "./icon-192.png",
        badge: "./favicon-48.png",
        tag: payload.tag || "wop-push",
        renotify: true,
        data: Object.assign({ url: "./" }, payload.data || {})
      });
    })
  );
});
