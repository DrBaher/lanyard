// Offline service worker. Strategy per request type so the app holds up when
// the conference wifi dies:
//   - content-hashed/immutable assets (/_next/static, /tesseract) → cache-first
//   - navigations (HTML) → network-first, falling back to cache then "/"
//   - everything else (data, images) → stale-while-revalidate
// Assets are cached as they're fetched, so browse the app once online and it
// keeps working offline.

const CACHE = "te-companion-v6";
const SHELL = [
  "/", "/search", "/agenda", "/speakers", "/companies", "/meet", "/me",
  "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png",
];

self.addEventListener("install", (event) => {
  // Precache the shell, but DON'T skipWaiting automatically — a new worker waits
  // until the user accepts the update (see the SKIP_WAITING message below).
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

// The page posts this when the user taps "Reload" on the update prompt.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Tapping a session reminder focuses an open tab or opens the app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) if ("focus" in c) return c.focus();
      return self.clients.openWindow("/");
    })
  );
});

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) c.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch {
    return (await c.match(req)) || (await c.match("/")) || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res.ok) c.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || network;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Only our own http(s) assets. Skip blob:/data: (.ics/CSV downloads) and
  // cross-origin requests — intercepting those just produces failed fetches.
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/tesseract/")) {
    event.respondWith(cacheFirst(req));
  } else if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(staleWhileRevalidate(req));
  }
});
