// Minimal offline service worker: precache the app shell and serve a
// network-first strategy for navigations (so updates win when online, cache
// rescues you when the conference wifi dies).

const CACHE = "te-companion-v5";
const SHELL = ["/", "/search", "/agenda", "/speakers", "/companies", "/meet", "/me", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  // Precache the shell, but DON'T skipWaiting automatically — a new worker waits
  // until the user accepts the update (see the SKIP_WAITING message below), so we
  // never swap assets mid-session.
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

// The page posts this when the user taps "Reload" on the update prompt.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Tapping a session reminder focuses an open tab or opens the app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Only handle our own http(s) assets. Skip blob:/data: (e.g. .ics/CSV
  // downloads, which revoke their URL immediately) and cross-origin requests —
  // intercepting those just produces failed fetches.
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/")))
  );
});
