const CACHE_VERSION = "v1";
const STATIC_CACHE = `nhiphoc-static-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  "/offline",
  "/maps/vinuni-campus-map.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
  "/icons/apple-touch-icon.png",
];

const SENSITIVE_PATH_PATTERNS = [
  "/api/",
  "/auth/",
  "/oauth/",
  "/login",
  "/logout",
  "/callback",
  "/token",
  "/session",
  "/email",
  "/mail",
  "/ics",
  "/private",
];

const SENSITIVE_QUERY_KEYS = [
  "token",
  "access_token",
  "refresh_token",
  "code",
  "secret",
  "key",
  "email",
  "ics",
];

const STATIC_EXTENSIONS = [
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
];

function isSensitiveRequest(request, url) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true;
  if (request.headers.has("Authorization")) return true;

  const pathname = url.pathname.toLowerCase();
  if (pathname.endsWith(".ics")) return true;

  for (const pattern of SENSITIVE_PATH_PATTERNS) {
    if (pathname.includes(pattern)) return true;
  }

  for (const key of SENSITIVE_QUERY_KEYS) {
    if (url.searchParams.has(key)) return true;
  }

  return false;
}

function isStaticAsset(url) {
  const pathname = url.pathname;
  if (pathname.startsWith("/_next/static/")) return true;
  if (pathname.startsWith("/icons/")) return true;
  if (pathname.startsWith("/maps/")) return true;
  return STATIC_EXTENSIONS.some((ext) => pathname.toLowerCase().endsWith(ext));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("nhiphoc-static-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Unify — Thông báo lịch học",
    body: "Lịch học hoặc phòng học của bạn vừa có cập nhật mới.",
    tag: "unify-schedule",
  };
  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag || "unify-schedule",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
      return undefined;
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never cache sensitive endpoints, emails, tokens, auth APIs, or .ics feeds
  if (isSensitiveRequest(request, url)) {
    return;
  }

  // Navigation requests: network-first with /offline fallback (do not cache private HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedOffline = await caches.match("/offline");
        return (
          cachedOffline ||
          new Response("Bạn đang ngoại tuyến.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }),
    );
    return;
  }

  // Only cache same-origin static assets
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {
            const cacheControl = response.headers.get("Cache-Control") || "";
            if (!cacheControl.includes("no-store") && !cacheControl.includes("private")) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
          }
          return response;
        });
      }),
    );
  }
});
