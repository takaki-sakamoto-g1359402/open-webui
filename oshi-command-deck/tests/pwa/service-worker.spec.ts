import { expect, test } from "@playwright/test";

const cacheNamePrefix = "oshi-command-deck-shell";
const offlineRoutes = [
  {
    path: "/?source=pwa",
    heading: /Today command deck|今日のコマンドデッキ/
  },
  {
    path: "/favorites",
    heading: /Favorites|お気に入り/
  },
  {
    path: "/minecraft",
    heading: /Minecraft sessions|Minecraft セッション/
  },
  {
    path: "/route",
    heading: /Watch Route|視聴ルート/
  },
  {
    path: "/settings",
    heading: /Settings|設定/
  },
  {
    path: "/privacy",
    heading: /Privacy|プライバシー/
  },
  {
    path: "/terms",
    heading: /Terms|利用規約/
  },
  {
    path: "/data-sources",
    heading: /Data Sources|データソース/
  },
  {
    path: "/contact-takedown",
    heading: /Contact|連絡/
  }
];

test("service worker serves public app shell offline and never caches API responses", async ({
  context,
  page
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Today command deck|今日のコマンドデッキ/ })).toBeVisible();

  const registrationState = await page.evaluate(async ({ cacheNamePrefix }) => {
    await navigator.serviceWorker.register("/sw.js");
    const registration = await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) {
        resolve();
        return;
      }
      navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
    });

    const cacheNames = await caches.keys();
    const appCacheName = cacheNames.find((name) => name.startsWith(cacheNamePrefix));
    if (!appCacheName) {
      return {
        controlled: Boolean(navigator.serviceWorker.controller),
        appCacheName: null,
        cachedUrls: []
      };
    }

    const appCache = await caches.open(appCacheName);
    const cachedRequests = await appCache.keys();
    return {
      controlled: Boolean(navigator.serviceWorker.controller),
      scope: registration.scope,
      appCacheName,
      cachedUrls: cachedRequests.map((request) => new URL(request.url).pathname + new URL(request.url).search)
    };
  }, { cacheNamePrefix });

  expect(registrationState.controlled).toBe(true);
  expect(registrationState.scope).toBe("http://127.0.0.1:3002/");
  expect(registrationState.appCacheName).toMatch(/^oshi-command-deck-shell/);
  expect(registrationState.cachedUrls).toEqual(
    expect.arrayContaining(["/", "/?source=pwa", "/offline", "/manifest.webmanifest"])
  );
  expect(registrationState.cachedUrls.some((url) => url.startsWith("/api/"))).toBe(false);
  expect(registrationState.cachedUrls.some((url) => url.startsWith("/admin"))).toBe(false);

  const streamsResponseOk = await page.evaluate(async () => {
    const response = await fetch("/api/streams", { headers: { accept: "application/json" } });
    return response.ok;
  });
  expect(streamsResponseOk).toBe(true);

  const cacheStateAfterApi = await page.evaluate(async ({ cacheNamePrefix }) => {
    const cacheNames = await caches.keys();
    const appCacheName = cacheNames.find((name) => name.startsWith(cacheNamePrefix));
    if (!appCacheName) {
      return {
        appCacheName: null,
        cachedUrls: []
      };
    }

    const appCache = await caches.open(appCacheName);
    const cachedRequests = await appCache.keys();
    return {
      appCacheName,
      cachedUrls: cachedRequests.map((request) => new URL(request.url).pathname + new URL(request.url).search)
    };
  }, { cacheNamePrefix });

  expect(cacheStateAfterApi.cachedUrls.some((url) => url.startsWith("/api/streams"))).toBe(false);

  await context.setOffline(true);
  for (const route of offlineRoutes) {
    await page.goto(route.path);
    await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
    await expect(page.getByText(/Offline cache is active|オフラインキャッシュが有効/)).toBeVisible();
    await expect(page.getByText("DEMO").first()).toBeVisible();
  }

  const offlineApiFetch = await page.evaluate(async () => {
    try {
      await fetch("/api/streams", { cache: "no-store" });
      return "unexpected-success";
    } catch {
      return "network-failed";
    }
  });
  expect(offlineApiFetch).toBe("network-failed");

  await context.setOffline(false);
});
