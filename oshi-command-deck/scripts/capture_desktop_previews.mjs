import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.PREVIEW_BASE_URL?.replace(/\/$/u, "") ?? "http://127.0.0.1:3001";
const outputDir = path.resolve(
  process.cwd(),
  process.env.PREVIEW_OUTPUT_DIR ?? "artifacts/screenshots"
);
const locale = process.env.PREVIEW_LOCALE ?? "ja";
const timezone = process.env.PREVIEW_TIMEZONE ?? "Asia/Tokyo";
const defaultViewport = {
  width: Number(process.env.PREVIEW_WIDTH ?? 1440),
  height: Number(process.env.PREVIEW_HEIGHT ?? 900)
};
const adminToken = process.env.PREVIEW_ADMIN_TOKEN ?? process.env.ADMIN_JOB_TOKEN;

const profiles = [
  {
    id: "macos-desktop",
    name: "macOS desktop Chrome",
    platform: "MacIntel",
    locale,
    viewport: defaultViewport,
    rateLimitIp: "203.0.113.11",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
  },
  {
    id: "windows-desktop",
    name: "Windows desktop Chrome",
    platform: "Win32",
    locale,
    viewport: defaultViewport,
    rateLimitIp: "203.0.113.12",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
  },
  {
    id: "mobile-phone",
    name: "Mobile phone Chrome",
    platform: "Linux armv8l",
    locale,
    viewport: { width: 390, height: 844 },
    rateLimitIp: "203.0.113.13",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
  },
  {
    id: "rtl-mobile",
    name: "RTL mobile Chrome",
    platform: "Linux armv8l",
    locale: "ar-EG",
    viewport: { width: 390, height: 844 },
    rateLimitIp: "203.0.113.14",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
  }
];

const defaultRoutes = [
  { id: "home", pathname: "/", expectedFinalPathnames: ["/"] },
  { id: "favorites", pathname: "/favorites", expectedFinalPathnames: ["/favorites"] },
  { id: "minecraft", pathname: "/minecraft", expectedFinalPathnames: ["/minecraft"] },
  { id: "watch-route", pathname: "/route", expectedFinalPathnames: ["/route"] },
  { id: "settings", pathname: "/settings", expectedFinalPathnames: ["/settings"] },
  { id: "data-sources", pathname: "/data-sources", expectedFinalPathnames: ["/data-sources"] },
  { id: "admin", pathname: "/admin", expectedFinalPathnames: ["/admin", "/admin/login"] },
  ...(adminToken
    ? [
        {
          id: "admin-protected",
          pathname: "/admin",
          expectedFinalPathnames: ["/admin"],
          requiresAdminToken: true
        }
      ]
    : [])
];

await assertServerReady();
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const captures = [];

try {
  for (const profile of profiles) {
    const selectedLocale = profile.locale ?? locale;
    const context = await browser.newContext({
      locale: toBrowserLocale(selectedLocale),
      timezoneId: timezone,
      userAgent: profile.userAgent,
      viewport: profile.viewport ?? defaultViewport,
      deviceScaleFactor: 1,
      serviceWorkers: "block",
      extraHTTPHeaders: {
        "x-forwarded-for": profile.rateLimitIp
      }
    });

    await context.addInitScript(
      ({ locale: selectedLocale, profilePlatform, selectedTimezone }) => {
        Object.defineProperty(window.navigator, "platform", {
          configurable: true,
          get: () => profilePlatform
        });
        window.localStorage.setItem(
          "oshi-command-deck.preferences.v1",
          JSON.stringify({
            locale: selectedLocale,
            timezone: selectedTimezone
          })
        );
      },
      {
        locale: selectedLocale,
        profilePlatform: profile.platform,
        selectedTimezone: timezone
      }
    );

    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    for (const route of parseRoutes()) {
      const consoleBaseline = consoleErrors.length;
      const pageErrorBaseline = pageErrors.length;
      const url = `${baseUrl}${route.pathname}`;
      const response = await page.goto(url, { waitUntil: "networkidle" });
      if (!response?.ok()) {
        throw new Error(`${profile.id} ${route.pathname} returned HTTP ${response?.status()}`);
      }

      if (route.requiresAdminToken) {
        await unlockProtectedAdmin(page, adminToken);
        await page.getByRole("heading", {
          name: /Admin authorization active|管理者認可が有効/u
        }).waitFor();
      }

      const finalUrl = new URL(page.url());
      const expectedFinalPathnames = route.expectedFinalPathnames ?? [route.pathname];
      if (!expectedFinalPathnames.includes(finalUrl.pathname)) {
        throw new Error(
          `${profile.id} ${route.pathname} ended at unexpected path ${finalUrl.pathname}; expected ${expectedFinalPathnames.join(", ")}`
        );
      }

      const routeConsoleErrors = consoleErrors.slice(consoleBaseline);
      const routePageErrors = pageErrors.slice(pageErrorBaseline);
      if (routeConsoleErrors.length > 0 || routePageErrors.length > 0) {
        throw new Error(
          `${profile.id} ${route.pathname} emitted browser errors: ${[
            ...routeConsoleErrors,
            ...routePageErrors
          ].join(" | ")}`
        );
      }

      const audit = await page.evaluate(() => {
        const root = document.documentElement;
        const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
          .map((heading) => heading.textContent?.trim() ?? "")
          .filter(Boolean);
        const statusText = document.querySelector('[role="status"]')?.textContent?.trim() ?? "";
        return {
          title: document.title,
          finalUrl: window.location.href,
          lang: root.lang,
          dir: root.dir,
          h1: document.querySelector("h1")?.textContent?.trim() ?? "",
          headings,
          statusText,
          adminAuthorizationActive: headings.some((heading) =>
            /Admin authorization active|管理者認可が有効/u.test(heading)
          ),
          adminDemoSurfaceVisible: headings.some((heading) =>
            /Demo admin surface|デモ管理画面/u.test(heading)
          ),
          adminLoginVisible: headings.some((heading) => /Admin sign in|管理者サインイン/u.test(heading)),
          scrollWidth: root.scrollWidth,
          innerWidth: window.innerWidth,
          horizontalOverflow: root.scrollWidth > window.innerWidth + 1,
          interactiveElements: document.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
          ).length
        };
      });

      if (audit.interactiveElements === 0) {
        throw new Error(`${profile.id} ${route.pathname} has no interactive elements`);
      }

      const fileName = `${profile.id}-${route.id}-${selectedLocale}.png`;
      const screenshotPath = path.join(outputDir, fileName);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false
      });

      captures.push({
        profile: profile.id,
        profileName: profile.name,
        platform: profile.platform,
        locale: selectedLocale,
        viewport: profile.viewport ?? defaultViewport,
        rateLimitIp: profile.rateLimitIp,
        route: route.pathname,
        routeId: route.id,
        screenshotPath,
        audit
      });
    }

    await context.close();
  }
} finally {
  await browser.close();
}

const manifest = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  locale,
  timezone,
  viewport: defaultViewport,
  adminProtectedCaptureEnabled: Boolean(adminToken),
  captures
};
const manifestPath = path.join(outputDir, `release-preview-manifest-${locale}.json`);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const failures = captures.filter((capture) => capture.audit.horizontalOverflow);
if (failures.length > 0) {
  throw new Error(
    `Release preview overflow detected: ${failures
      .map((failure) => `${failure.profile}:${failure.route}`)
      .join(", ")}`
  );
}

console.log(`Wrote ${captures.length} release previews to ${outputDir}`);
console.log(`Wrote manifest to ${manifestPath}`);

async function assertServerReady() {
  try {
    const response = await fetch(baseUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Preview server is not reachable at ${baseUrl}. Start it with "pnpm dev" or set PREVIEW_BASE_URL. ${
        error instanceof Error ? error.message : ""
      }`
    );
  }
}

function parseRoutes() {
  const raw = process.env.PREVIEW_ROUTES?.trim();
  if (!raw) {
    return defaultRoutes;
  }

  return raw.split(",").map((entry) => {
    const pathname = entry.trim().startsWith("/") ? entry.trim() : `/${entry.trim()}`;
    return {
      id: pathname.replace(/^\//u, "").replace(/[^a-z0-9]+/giu, "-") || "home",
      pathname,
      expectedFinalPathnames: pathname === "/admin" ? ["/admin", "/admin/login"] : [pathname]
    };
  });
}

function toBrowserLocale(selectedLocale) {
  if (selectedLocale === "ja") {
    return "ja-JP";
  }
  if (selectedLocale === "en") {
    return "en-US";
  }
  return selectedLocale;
}

async function unlockProtectedAdmin(page, token) {
  if (!token) {
    throw new Error("Protected admin preview requires PREVIEW_ADMIN_TOKEN or ADMIN_JOB_TOKEN.");
  }

  const currentPathname = new URL(page.url()).pathname;
  if (currentPathname === "/admin") {
    return;
  }

  if (currentPathname !== "/admin/login") {
    throw new Error(`Protected admin preview reached unexpected route ${currentPathname}`);
  }

  await page.getByLabel(/Admin token|管理トークン/u).fill(token);
  await page.getByRole("button", { name: /Unlock admin|管理画面を開く/u }).click();
  await page.waitForURL("**/admin");
  await page.getByRole("heading", {
    name: /Protected admin console|保護された管理コンソール/u
  }).waitFor();
}
