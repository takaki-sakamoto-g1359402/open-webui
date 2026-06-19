const CACHE_NAME = "oshi-command-deck-shell-v3";
const APP_SHELL = [
  "/",
  "/?source=pwa",
  "/favorites",
  "/minecraft",
  "/route",
  "/settings",
  "/privacy",
  "/terms",
  "/data-sources",
  "/contact-takedown",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];
const PUBLIC_NAVIGATION_PATHS = new Set([
  "/",
  "/favorites",
  "/minecraft",
  "/route",
  "/settings",
  "/privacy",
  "/terms",
  "/data-sources",
  "/contact-takedown",
  "/offline"
]);
const NEVER_CACHE_PREFIXES = [
  "/api/",
  "/admin",
  "/_next/server",
  "/_next/data",
  "/_next/webpack-hmr"
];
const STATIC_CACHE_PREFIXES = ["/_next/static/", "/icons/"];

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET" || request.cache === "only-if-cached") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (shouldBypassCache(url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request, url));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstNavigation(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok && PUBLIC_NAVIGATION_PATHS.has(url.pathname)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = PUBLIC_NAVIGATION_PATHS.has(url.pathname)
      ? await matchPublicNavigationFromCache(request, url)
      : undefined;
    return cached ?? (await caches.match("/offline")) ?? Response.error();
  }
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const staticAssetUrls = new Set();

  await Promise.all(
    APP_SHELL.map(async (path) => {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (!response.ok) {
          return;
        }

        const htmlCopy = response.clone();
        await cache.put(path, response.clone());

        if (isHtmlResponse(response)) {
          for (const assetUrl of extractStaticAssetUrls(await htmlCopy.text())) {
            staticAssetUrls.add(assetUrl);
          }
        }
      } catch {
        // A partial shell is still better than a failed service worker install.
      }
    })
  );

  await Promise.all(
    [...staticAssetUrls].map(async (assetUrl) => {
      try {
        const response = await fetch(assetUrl, { cache: "reload" });
        if (response.ok) {
          await cache.put(assetUrl, response.clone());
        }
      } catch {
        // Static chunks can be refreshed by stale-while-revalidate when online again.
      }
    })
  );
}

async function matchPublicNavigationFromCache(request, url) {
  const candidates = [request, url.pathname + url.search, url.pathname];
  for (const candidate of candidates) {
    const cached = await caches.match(candidate);
    if (cached) {
      return cached;
    }
  }
  return undefined;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached ?? (await network) ?? Response.error();
}

function shouldBypassCache(url) {
  return NEVER_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function isStaticAsset(url) {
  return (
    STATIC_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
    url.pathname === "/manifest.webmanifest"
  );
}

function isHtmlResponse(response) {
  return response.headers.get("content-type")?.includes("text/html");
}

function extractStaticAssetUrls(html) {
  const urls = new Set();
  const attributePattern = /\b(?:href|src)=["']([^"']+)["']/gu;
  let match;

  while ((match = attributePattern.exec(html)) !== null) {
    try {
      const url = new URL(match[1], self.location.origin);
      if (url.origin === self.location.origin && isStaticAsset(url)) {
        urls.add(url.pathname + url.search);
      }
    } catch {
      // Ignore malformed attributes in server-rendered HTML.
    }
  }

  return urls;
}

self.addEventListener("push", (event) => {
  const data = parsePushPayload(event);
  if (!data) {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      tag: data.tag || "oshi-command-deck",
      data: data.data || { url: "/" }
    })
  );
});

function parsePushPayload(event) {
  try {
    const data = event.data?.json?.();
    if (typeof data?.title === "string" && typeof data?.body === "string") {
      return data;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  const targetUrl = new URL(url, self.location.origin);

  if (targetUrl.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const focused = clients.find((client) => "focus" in client);
      if (focused) {
        focused.navigate(targetUrl.href);
        return focused.focus();
      }
      return self.clients.openWindow(targetUrl.href);
    })
  );
});
