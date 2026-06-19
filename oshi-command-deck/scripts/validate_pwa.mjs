import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  manifest: "public/manifest.webmanifest",
  serviceWorker: "public/sw.js",
  pwaConfig: "playwright.pwa.config.ts",
  pwaSmoke: "tests/pwa/service-worker.spec.ts",
  appProvider: "components/app/app-provider.tsx",
  catalogs: "lib/i18n/catalogs.ts",
  packageJson: "package.json",
  setupGuide: "docs/setup-deploy.md",
  testingGuide: "docs/testing-strategy.md",
  architectureGuide: "docs/architecture-data-flow.md"
};

function readProjectFile(path) {
  return readFileSync(join(root, path), "utf8");
}

const manifest = JSON.parse(readProjectFile(files.manifest));
const sw = readProjectFile(files.serviceWorker);
const pwaConfig = readProjectFile(files.pwaConfig);
const pwaSmoke = readProjectFile(files.pwaSmoke);
const appProvider = readProjectFile(files.appProvider);
const catalogs = readProjectFile(files.catalogs);
const packageJson = JSON.parse(readProjectFile(files.packageJson));
const setupGuide = readProjectFile(files.setupGuide);
const testingGuide = readProjectFile(files.testingGuide);
const architectureGuide = readProjectFile(files.architectureGuide);
const checks = [];

function expect(label, pass, detail) {
  checks.push({ label, pass, detail });
}

function expectContains(label, value, needle) {
  expect(label, value.includes(needle), needle);
}

expect("manifest name is present", manifest.name === "Oshi Command Deck", "name");
expect("manifest short_name is present", manifest.short_name === "Command Deck", "short_name");
expect("manifest has stable app id", manifest.id === "/?source=pwa", "id");
expect("manifest starts in app scope", manifest.start_url === "/?source=pwa", "start_url");
expect("manifest is scoped to root", manifest.scope === "/", "scope");
expect("manifest display is standalone", manifest.display === "standalone", "display=standalone");
expect("manifest declares portrait orientation", manifest.orientation === "portrait-primary", "orientation");
expect("manifest declares default language", manifest.lang === "en", "lang=en");
expect("manifest declares default direction", manifest.dir === "ltr", "dir=ltr");
expect(
  "manifest includes Japanese localized metadata",
  manifest.description_localized?.ja && manifest.name_localized?.ja,
  "name_localized.ja and description_localized.ja"
);
expect(
  "manifest has maskable SVG and PNG icons",
  Array.isArray(manifest.icons) &&
    manifest.icons.some(
      (icon) =>
        icon.src === "/icons/icon.svg" &&
        icon.sizes === "any" &&
        icon.type === "image/svg+xml" &&
        String(icon.purpose).includes("maskable")
    ) &&
    manifest.icons.some(
      (icon) =>
        icon.src === "/icons/icon-192.png" &&
        icon.sizes === "192x192" &&
        icon.type === "image/png" &&
        String(icon.purpose).includes("maskable")
    ) &&
    manifest.icons.some(
      (icon) =>
        icon.src === "/icons/icon-512.png" &&
        icon.sizes === "512x512" &&
        icon.type === "image/png" &&
        String(icon.purpose).includes("maskable")
    ),
  "icons[] SVG, 192 PNG, and 512 PNG maskable"
);
expect("192px PNG icon file exists", existsSync(join(root, "public/icons/icon-192.png")), "public/icons/icon-192.png");
expect("512px PNG icon file exists", existsSync(join(root, "public/icons/icon-512.png")), "public/icons/icon-512.png");
expect(
  "manifest shortcuts stay in scope",
  Array.isArray(manifest.shortcuts) &&
    manifest.shortcuts.length >= 3 &&
    manifest.shortcuts.every((shortcut) => typeof shortcut.url === "string" && shortcut.url.startsWith("/")),
  "shortcuts[].url"
);
expect(
  "manifest shortcuts include Japanese localized labels",
  Array.isArray(manifest.shortcuts) &&
    manifest.shortcuts.every(
      (shortcut) => shortcut.name_localized?.ja && shortcut.description_localized?.ja
    ),
  "shortcuts[].name_localized.ja and shortcuts[].description_localized.ja"
);

for (const path of [
  '"/"',
  '"/?source=pwa"',
  '"/favorites"',
  '"/minecraft"',
  '"/route"',
  '"/settings"',
  '"/privacy"',
  '"/terms"',
  '"/data-sources"',
  '"/contact-takedown"',
  '"/offline"',
  '"/manifest.webmanifest"',
  '"/icons/icon.svg"',
  '"/icons/icon-192.png"',
  '"/icons/icon-512.png"'
]) {
  expectContains(`service worker precaches ${path}`, sw, path);
}

for (const path of ['"/api/"', '"/admin"', '"/_next/server"', '"/_next/data"']) {
  expectContains(`service worker bypasses ${path}`, sw, path);
}

expectContains("service worker handles navigations network-first", sw, "networkFirstNavigation");
expectContains("service worker uses stale-while-revalidate only for static assets", sw, "staleWhileRevalidate");
expectContains("service worker limits public navigation cache", sw, "PUBLIC_NAVIGATION_PATHS");
expectContains("service worker checks same origin", sw, "url.origin !== self.location.origin");
expectContains("service worker handles push events", sw, 'addEventListener("push"');
expectContains("service worker displays push notifications", sw, "showNotification");
expectContains("service worker handles notification clicks", sw, 'addEventListener("notificationclick"');
expectContains("service worker keeps notification clicks same-origin", sw, "targetUrl.origin !== self.location.origin");
expect(
  "service worker avoids broad runtime cache.put for every GET",
  !/fetch\(request\)[\s\S]*cache\.put\(request,\s*copy\)/u.test(sw),
  "no unqualified fetch(request)->cache.put(request, copy)"
);
expect(
  "service worker does not cache API responses",
  !/cache\.put\(request[\s\S]{0,120}api/u.test(sw.toLowerCase()),
  "no API cache.put"
);

expectContains("app provider reads offline snapshots", appProvider, "readOfflineSnapshotFromStorage");
expectContains("app provider writes successful stream snapshots", appProvider, "writeOfflineSnapshotToStorage");
expectContains("app provider marks cached source health stale", appProvider, "markSourceHealthAsOfflineCached");
expectContains("app provider keeps webdriver service worker opt-out", appProvider, "navigator.webdriver");
expectContains("catalog has English offline snapshot label", catalogs, '"offline.snapshotCoverage"');
expectContains(
  "catalog has Japanese offline snapshot label",
  catalogs,
  "読み取り専用のキャッシュ済みスナップショット"
);

expect(
  "package exposes verify:pwa",
  packageJson.scripts?.["verify:pwa"] === "node scripts/validate_pwa.mjs",
  "scripts.verify:pwa"
);
expect(
  "package exposes test:pwa",
  packageJson.scripts?.["test:pwa"] === "playwright test -c playwright.pwa.config.ts",
  "scripts.test:pwa"
);
expect(
  "package exposes isolated PWA start script",
  packageJson.scripts?.["start:pwa-test"] === "next start -H 127.0.0.1 -p 3002",
  "scripts.start:pwa-test"
);
expect(
  "package verify includes PWA guard",
  typeof packageJson.scripts?.verify === "string" && packageJson.scripts.verify.includes("pnpm verify:pwa"),
  "scripts.verify"
);
expect(
  "package verify includes PWA smoke",
  typeof packageJson.scripts?.verify === "string" && packageJson.scripts.verify.includes("pnpm test:pwa"),
  "scripts.verify"
);
expectContains("PWA Playwright config allows service workers", pwaConfig, 'serviceWorkers: "allow"');
expectContains("PWA Playwright config uses isolated port", pwaConfig, "http://127.0.0.1:3002");
expectContains("PWA smoke manually registers service worker", pwaSmoke, 'navigator.serviceWorker.register("/sw.js")');
expectContains("PWA smoke tests offline start URL", pwaSmoke, 'path: "/?source=pwa"');
for (const route of ["/favorites", "/minecraft", "/route", "/settings", "/privacy", "/terms", "/data-sources", "/contact-takedown"]) {
  expectContains(`PWA smoke tests offline ${route}`, pwaSmoke, `"${route}"`);
}
expectContains("PWA smoke asserts API fetch fails offline", pwaSmoke, 'fetch("/api/streams"');
expectContains("PWA smoke asserts API is not cached", pwaSmoke, 'startsWith("/api/streams")');
expectContains("setup guide documents PWA guard", setupGuide, "pnpm verify:pwa");
expectContains("setup guide documents PWA smoke", setupGuide, "pnpm test:pwa");
expectContains("testing guide documents PWA cache guard", testingGuide, "PWA cache guard");
expectContains("testing guide documents PWA smoke", testingGuide, "PWA smoke");
expectContains("architecture guide documents offline snapshot", architectureGuide, "offline snapshot");

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  const prefix = check.pass ? "OK" : "FAIL";
  console.log(`${prefix}: ${check.label}`);
}

if (failed.length > 0) {
  console.error("\nPWA validation failed:");
  for (const check of failed) {
    console.error(`- ${check.label}: expected ${check.detail}`);
  }
  process.exit(1);
}
