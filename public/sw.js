/* HelixaraAI service worker — shell cache only; never cache secrets/API. */
const SW_VERSION = "helixara-sw-v1";
const SHELL = [
  "/",
  "/console",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

/** Paths that must never be cached (data leakage prevention) */
function isSensitive(url) {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith("/api/")) return true;
    if (u.searchParams.has("token")) return true;
    if (u.searchParams.has("session")) return true;
    if (u.pathname.includes("elevated")) return true;
    if (u.pathname.includes("telegram")) return true;
    return false;
  } catch {
    return true;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SW_VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SW_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = req.url;
  if (isSensitive(url)) {
    // Network-only for APIs / secrets — no SW cache
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(JSON.stringify({ error: "offline", cached: false }), {
            status: 503,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          })
      )
    );
    return;
  }

  // Navigations: network-first for fresh console
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) {
            caches.open(SW_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/console")))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(SW_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "CLEAR_CACHE") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});
