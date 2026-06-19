#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  readiness: "docs/release-readiness.md",
  nodeVersion: ".node-version",
  packageJson: "package.json",
  readme: "README.md",
  setupGuide: "docs/setup-deploy.md",
  testingGuide: "docs/testing-strategy.md"
};

const checks = [];

function readProjectFile(path) {
  return readFileSync(join(root, path), "utf8");
}

const readiness = readProjectFile(files.readiness);
const packageJson = JSON.parse(readProjectFile(files.packageJson));
const readme = readProjectFile(files.readme);
const setupGuide = readProjectFile(files.setupGuide);
const testingGuide = readProjectFile(files.testingGuide);

function expect(label, pass, detail) {
  checks.push({ label, pass, detail });
}

function expectContains(label, value, needle) {
  expect(label, value.includes(needle), needle);
}

for (const path of Object.values(files)) {
  expect(`required file exists: ${path}`, existsSync(join(root, path)), path);
}

for (const heading of [
  "## Proven In This Repository",
  "## External Proof Still Required",
  "## Required Release Commands",
  "## Environment Gate",
  "## Primary References",
  "## Completion Rule"
]) {
  expectContains(`readiness audit includes ${heading}`, readiness, heading);
}

for (const phrase of [
  "Supabase CLI",
  "Docker runtime",
  "psql",
  "SUPABASE_DB_URL=... pnpm smoke:supabase",
  "YouTube Data API",
  "X API",
  "VAPID",
  "CRON_SECRET",
  "RATE_LIMIT_BACKEND=supabase",
  "HOST_RATE_LIMIT_CONFIGURED=true",
  "pnpm test:e2e:admin",
  "pnpm capture:release-previews",
  "pnpm verify:release-previews",
  "RateLimit-Backend",
  "`ADMIN_JOB_TOKEN` and `CRON_SECRET` are distinct values",
  ".node-version",
  "deployed URL",
  "Do not claim production completion"
]) {
  expectContains(`readiness audit states ${phrase}`, readiness, phrase);
}

for (const command of [
  "pnpm verify",
  "pnpm check:release-preflight",
  "corepack enable",
  "corepack prepare pnpm@10.26.0 --activate",
  "pnpm check:supabase-local",
  "supabase start",
  "supabase db reset",
  "pnpm smoke:supabase",
  "pnpm verify:security-headers",
  "pnpm verify:production-config -- --strict-production --env-file .env.production.local",
  "pnpm smoke:production-dry-run -- --strict",
  "pnpm test:e2e:admin",
  "PREVIEW_ADMIN_TOKEN=... pnpm capture:release-previews",
  "pnpm verify:release-previews",
  "$BASE_URL/api/jobs/ingest?dryRun=1",
  "$BASE_URL/api/jobs/alerts?dryRun=1&demo=1",
  "$BASE_URL/api/jobs/retention?dryRun=1&provider=youtube"
]) {
  expectContains(`readiness audit lists ${command}`, readiness, command);
}

for (const envName of [
  "NEXT_PUBLIC_DEMO_MODE=false",
  "OSHI_DEMO_MODE=false",
  "STREAMS_READ_SOURCE=supabase",
  "RATE_LIMIT_BACKEND=supabase",
  "RATE_LIMIT_KEY_SALT",
  "HOST_RATE_LIMIT_CONFIGURED=true",
  "NEXT_PUBLIC_CONTACT_EMAIL",
  "ADMIN_JOB_TOKEN",
  "CRON_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY"
]) {
  expectContains(`readiness audit gates ${envName}`, readiness, envName);
}

for (const url of [
  "https://supabase.com/docs/guides/local-development/cli/getting-started",
  "https://supabase.com/docs/guides/local-development/cli/config",
  "https://supabase.com/docs/guides/local-development/seeding-your-database",
  "https://supabase.com/docs/guides/database/functions",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://developers.google.com/youtube/terms/developer-policies",
  "https://developers.google.com/youtube/v3/docs/search/list",
  "https://developers.google.com/youtube/v3/docs/videos/list",
  "https://docs.x.com/developer-terms/policy",
  "https://docs.x.com/developer-guidelines",
  "https://docs.x.com/x-api/fundamentals/rate-limits",
  "https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting",
  "https://vercel.com/docs/cron-jobs/manage-cron-jobs",
  "https://nextjs.org/docs/app/api-reference/config/next-config-js/headers"
]) {
  expectContains(`readiness audit references ${url}`, readiness, url);
}

expect(
  "package exposes release preflight checker",
  packageJson.scripts?.["check:release-preflight"] === "node scripts/check_release_preflight.mjs",
  "scripts.check:release-preflight"
);
expect(
  "package verify does not require external release preflight",
  typeof packageJson.scripts?.verify === "string" &&
    !packageJson.scripts.verify.includes("pnpm check:release-preflight"),
  "scripts.verify"
);
expect(
  "package exposes release readiness validator",
  packageJson.scripts?.["verify:readiness"] === "node scripts/validate_release_readiness.mjs",
  "scripts.verify:readiness"
);
expect(
  "package verify includes release readiness validator",
  typeof packageJson.scripts?.verify === "string" &&
    packageJson.scripts.verify.includes("pnpm verify:readiness"),
  "scripts.verify"
);

for (const doc of [
  { label: "readme", value: readme },
  { label: "setup guide", value: setupGuide },
  { label: "testing guide", value: testingGuide }
]) {
  expectContains(`${doc.label} links release readiness audit`, doc.value, "docs/release-readiness.md");
  expectContains(`${doc.label} documents verify:readiness`, doc.value, "pnpm verify:readiness");
  expectContains(`${doc.label} documents release preflight`, doc.value, "pnpm check:release-preflight");
}

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "OK" : "FAIL"}: ${check.label}`);
}

if (failed.length > 0) {
  console.error("\nRelease readiness validation failed:");
  for (const check of failed) {
    console.error(`- ${check.label}: expected ${check.detail}`);
  }
  process.exit(1);
}
