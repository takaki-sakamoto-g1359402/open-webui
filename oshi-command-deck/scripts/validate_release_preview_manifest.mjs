#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const root = process.cwd();
const locale = process.env.PREVIEW_LOCALE ?? "ja";
const manifestPath = resolve(
  root,
  process.env.PREVIEW_MANIFEST_PATH ?? `artifacts/screenshots/release-preview-manifest-${locale}.json`
);
const requireProtectedAdmin = process.env.REQUIRE_PROTECTED_ADMIN_PREVIEW !== "false";
const checks = [];

function expect(label, pass, detail) {
  checks.push({ label, pass, detail });
}

function readManifest() {
  if (!existsSync(manifestPath)) {
    expect("release preview manifest exists", false, manifestPath);
    return undefined;
  }

  expect("release preview manifest exists", true, manifestPath);
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    expect(
      "release preview manifest parses as JSON",
      false,
      error instanceof Error ? error.message : "invalid JSON"
    );
    return undefined;
  }
}

const manifest = readManifest();

if (manifest) {
  const captures = Array.isArray(manifest.captures) ? manifest.captures : [];
  const requiredProfiles = [
    {
      id: "macos-desktop",
      expectedLocale: locale,
      expectedDir: "ltr",
      minWidth: 1024,
      minHeight: 700
    },
    {
      id: "windows-desktop",
      expectedLocale: locale,
      expectedDir: "ltr",
      minWidth: 1024,
      minHeight: 700
    },
    {
      id: "mobile-phone",
      expectedLocale: locale,
      expectedDir: "ltr",
      maxWidth: 480,
      minHeight: 640
    },
    {
      id: "rtl-mobile",
      expectedLocale: "ar-EG",
      expectedDir: "rtl",
      maxWidth: 480,
      minHeight: 640
    }
  ];
  const requiredRoutes = [
    "home",
    "favorites",
    "minecraft",
    "watch-route",
    "settings",
    "data-sources",
    "admin",
    ...(requireProtectedAdmin ? ["admin-protected"] : [])
  ];

  expect(
    "release preview manifest has ISO generatedAt",
    typeof manifest.generatedAt === "string" && !Number.isNaN(Date.parse(manifest.generatedAt)),
    "generatedAt"
  );
  expect(
    "release preview manifest records a base URL",
    typeof manifest.baseUrl === "string" && /^https?:\/\//u.test(manifest.baseUrl),
    "baseUrl"
  );
  expect(
    "release preview manifest records requested locale",
    manifest.locale === locale,
    `locale=${locale}`
  );
  expect(
    "release preview manifest records timezone",
    typeof manifest.timezone === "string" && manifest.timezone.length > 0,
    "timezone"
  );
  expect(
    "release preview manifest includes captures",
    captures.length >= requiredProfiles.length * requiredRoutes.length,
    `${requiredProfiles.length * requiredRoutes.length} captures`
  );
  expect(
    "protected Admin capture is enabled",
    !requireProtectedAdmin || manifest.adminProtectedCaptureEnabled === true,
    "adminProtectedCaptureEnabled=true"
  );

  for (const profile of requiredProfiles) {
    const profileCaptures = captures.filter((capture) => capture.profile === profile.id);
    expect(
      `${profile.id} profile is captured`,
      profileCaptures.length >= requiredRoutes.length,
      requiredRoutes.join(", ")
    );

    for (const routeId of requiredRoutes) {
      const capture = profileCaptures.find((candidate) => candidate.routeId === routeId);
      expect(`${profile.id}/${routeId} capture exists`, Boolean(capture), routeId);
      if (!capture) {
        continue;
      }

      const audit = capture.audit ?? {};
      const screenshotPath =
        typeof capture.screenshotPath === "string"
          ? isAbsolute(capture.screenshotPath)
            ? capture.screenshotPath
            : resolve(root, capture.screenshotPath)
          : "";

      expect(`${profile.id}/${routeId} screenshot exists`, existsSync(screenshotPath), screenshotPath);
      expect(
        `${profile.id}/${routeId} uses expected locale`,
        capture.locale === profile.expectedLocale && audit.lang === profile.expectedLocale,
        profile.expectedLocale
      );
      expect(
        `${profile.id}/${routeId} uses expected direction`,
        audit.dir === profile.expectedDir,
        profile.expectedDir
      );
      expect(
        `${profile.id}/${routeId} has no horizontal overflow`,
        audit.horizontalOverflow === false && audit.scrollWidth <= audit.innerWidth + 1,
        "horizontalOverflow=false"
      );
      expect(
        `${profile.id}/${routeId} has interactive controls`,
        Number(audit.interactiveElements) > 0,
        "interactiveElements > 0"
      );
      expect(
        `${profile.id}/${routeId} has a page title and heading`,
        typeof audit.title === "string" &&
          audit.title.length > 0 &&
          typeof audit.h1 === "string" &&
          audit.h1.length > 0,
        "title and h1"
      );

      if (profile.minWidth) {
        expect(
          `${profile.id}/${routeId} desktop width is release-sized`,
          Number(capture.viewport?.width) >= profile.minWidth,
          `width >= ${profile.minWidth}`
        );
      }
      if (profile.maxWidth) {
        expect(
          `${profile.id}/${routeId} mobile width is phone-sized`,
          Number(capture.viewport?.width) <= profile.maxWidth,
          `width <= ${profile.maxWidth}`
        );
      }
      expect(
        `${profile.id}/${routeId} viewport height is usable`,
        Number(capture.viewport?.height) >= profile.minHeight,
        `height >= ${profile.minHeight}`
      );

      if (routeId === "admin-protected") {
        const finalPathname = parsePathname(audit.finalUrl);
        expect(
          `${profile.id}/admin-protected ends on /admin`,
          finalPathname === "/admin",
          "finalUrl pathname /admin"
        );
        expect(
          `${profile.id}/admin-protected shows authorized Admin`,
          audit.adminAuthorizationActive === true,
          "adminAuthorizationActive=true"
        );
        expect(
          `${profile.id}/admin-protected hides demo Admin surface`,
          audit.adminDemoSurfaceVisible === false,
          "adminDemoSurfaceVisible=false"
        );
        expect(
          `${profile.id}/admin-protected is not the login screen`,
          audit.adminLoginVisible === false,
          "adminLoginVisible=false"
        );
      }
    }
  }
}

function parsePathname(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return "";
  }
}

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "OK" : "FAIL"}: ${check.label}`);
}

if (failed.length > 0) {
  console.error("\nRelease preview manifest validation failed:");
  for (const check of failed) {
    console.error(`- ${check.label}: expected ${check.detail}`);
  }
  process.exit(1);
}
