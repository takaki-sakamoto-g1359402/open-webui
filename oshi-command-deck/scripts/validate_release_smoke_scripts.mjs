import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  packageJson: "package.json",
  envExample: ".env.example",
  releasePreflightRunner: "scripts/check_release_preflight.mjs",
  vercelPreviewDeployRunner: "scripts/deploy_vercel_preview.mjs",
  supabasePrereqRunner: "scripts/check_local_supabase_prereqs.mjs",
  supabaseRunner: "scripts/run_supabase_smoke.mjs",
  productionRunner: "scripts/run_production_dry_run.mjs",
  previewRunner: "scripts/capture_desktop_previews.mjs",
  previewManifestValidator: "scripts/validate_release_preview_manifest.mjs",
  protectedAdminPlaywrightConfig: "playwright.admin.config.ts",
  vercelConfig: "vercel.json",
  vercelPreviewConfig: "vercel.preview.json",
  vercelProductionConfig: "vercel.production.json",
  supabaseConfig: "supabase/config.toml",
  setupGuide: "docs/setup-deploy.md",
  testingGuide: "docs/testing-strategy.md",
  readme: "README.md"
};

function readProjectFile(path) {
  return readFileSync(join(root, path), "utf8");
}

const packageJson = JSON.parse(readProjectFile(files.packageJson));
const envExample = readProjectFile(files.envExample);
const releasePreflightRunner = readProjectFile(files.releasePreflightRunner);
const vercelPreviewDeployRunner = readProjectFile(files.vercelPreviewDeployRunner);
const supabasePrereqRunner = readProjectFile(files.supabasePrereqRunner);
const supabaseRunner = readProjectFile(files.supabaseRunner);
const productionRunner = readProjectFile(files.productionRunner);
const previewRunner = readProjectFile(files.previewRunner);
const previewManifestValidator = readProjectFile(files.previewManifestValidator);
const protectedAdminPlaywrightConfig = readProjectFile(files.protectedAdminPlaywrightConfig);
const vercelConfig = readProjectFile(files.vercelConfig);
const vercelPreviewConfig = readProjectFile(files.vercelPreviewConfig);
const vercelProductionConfig = readProjectFile(files.vercelProductionConfig);
const supabaseConfig = readProjectFile(files.supabaseConfig);
const setupGuide = readProjectFile(files.setupGuide);
const testingGuide = readProjectFile(files.testingGuide);
const readme = readProjectFile(files.readme);
const checks = [];

function expect(label, pass, detail) {
  checks.push({ label, pass, detail });
}

function expectContains(label, value, needle) {
  expect(label, value.includes(needle), needle);
}

for (const path of [
  files.releasePreflightRunner,
  files.vercelPreviewDeployRunner,
  files.supabasePrereqRunner,
  files.supabaseRunner,
  files.productionRunner,
  files.previewRunner,
  files.previewManifestValidator,
  files.protectedAdminPlaywrightConfig,
  files.vercelConfig,
  files.vercelPreviewConfig,
  files.vercelProductionConfig,
  files.supabaseConfig,
	  "supabase/smoke/0001_manual_correction_rpc.sql",
	  "supabase/migrations/0002_creator_channel_registry_rpc.sql",
	  "supabase/smoke/0002_ingestion_rpc.sql",
	  "supabase/smoke/0003_registry_constraints.sql",
	  "supabase/smoke/0004_source_retention_rpc.sql",
	  "supabase/migrations/0003_api_rate_limit_rpc.sql",
	  "supabase/smoke/0005_api_rate_limit_rpc.sql"
	]) {
	  expect(`required file exists: ${path}`, existsSync(join(root, path)), path);
	}

expect(
  "package exposes release preflight checker",
  packageJson.scripts?.["check:release-preflight"] === "node scripts/check_release_preflight.mjs",
  "scripts.check:release-preflight"
);
expect(
  "package exposes local Supabase prerequisite checker",
  packageJson.scripts?.["check:supabase-local"] === "node scripts/check_local_supabase_prereqs.mjs",
  "scripts.check:supabase-local"
);
expect(
  "package exposes Supabase smoke runner",
  packageJson.scripts?.["smoke:supabase"] === "node scripts/run_supabase_smoke.mjs",
  "scripts.smoke:supabase"
);
expect(
  "package exposes production dry-run runner",
  packageJson.scripts?.["smoke:production-dry-run"] === "node scripts/run_production_dry_run.mjs",
  "scripts.smoke:production-dry-run"
);
expect(
  "package exposes protected Admin E2E runner",
  packageJson.scripts?.["test:e2e:admin"] === "playwright test -c playwright.admin.config.ts",
  "scripts.test:e2e:admin"
);
expect(
  "package exposes release preview capture",
  packageJson.scripts?.["capture:release-previews"] === "node scripts/capture_desktop_previews.mjs",
  "scripts.capture:release-previews"
);
expect(
  "package exposes release preview manifest validator",
  packageJson.scripts?.["verify:release-previews"] === "node scripts/validate_release_preview_manifest.mjs",
  "scripts.verify:release-previews"
);
expect(
  "package exposes Vercel Hobby preview deploy",
  packageJson.scripts?.["deploy:vercel-preview"] === "node scripts/deploy_vercel_preview.mjs",
  "scripts.deploy:vercel-preview"
);
expect(
  "package exposes release smoke validator",
  packageJson.scripts?.["verify:release-smoke"] === "node scripts/validate_release_smoke_scripts.mjs",
  "scripts.verify:release-smoke"
);
expect(
  "package verify includes release smoke validator",
  typeof packageJson.scripts?.verify === "string" &&
    packageJson.scripts.verify.includes("pnpm verify:release-smoke"),
  "scripts.verify"
);
expect(
  "package verify does not require external release preflight",
  typeof packageJson.scripts?.verify === "string" &&
    !packageJson.scripts.verify.includes("pnpm check:release-preflight"),
  "scripts.verify"
);
expect(
  "package verify does not require external Supabase smoke",
  typeof packageJson.scripts?.verify === "string" &&
    !packageJson.scripts.verify.includes("pnpm smoke:supabase"),
  "scripts.verify"
);
expect(
  "package verify does not require running app smoke",
  typeof packageJson.scripts?.verify === "string" &&
    !packageJson.scripts.verify.includes("pnpm smoke:production-dry-run"),
  "scripts.verify"
);
expect(
  "package verify includes protected Admin E2E",
  typeof packageJson.scripts?.verify === "string" &&
    packageJson.scripts.verify.includes("pnpm test:e2e:admin"),
  "scripts.verify"
);

expectContains("env example declares server-only Supabase DB URL", envExample, "SUPABASE_DB_URL=");
expectContains("env example declares server-only Vercel cron secret", envExample, "CRON_SECRET=");
expectContains("env example declares server-only demo override", envExample, "OSHI_DEMO_MODE=");
expect(
  "env example does not expose DB URL as public env",
  !envExample.includes("NEXT_PUBLIC_SUPABASE_DB_URL"),
  "NEXT_PUBLIC_SUPABASE_DB_URL must not exist"
);

expectContains("release preflight imports production config validator", releasePreflightRunner, "validateProductionConfig");
expectContains("release preflight checks Supabase CLI", releasePreflightRunner, '"Supabase CLI"');
expectContains("release preflight requires Vercel preview deploy runner", releasePreflightRunner, "scripts/deploy_vercel_preview.mjs");
expectContains("release preflight checks Docker daemon", releasePreflightRunner, '"Docker daemon"');
expectContains("release preflight checks psql", releasePreflightRunner, '"PostgreSQL client psql"');
expectContains("release preflight checks Vercel Cron", releasePreflightRunner, "Vercel Cron route");
expectContains("release preflight checks production Vercel config", releasePreflightRunner, "vercel.production.json");
expectContains("release preflight checks root Vercel config omits Cron", releasePreflightRunner, "Vercel root deploy config omits Cron");
expectContains("release preflight checks Vercel Hobby preview config", releasePreflightRunner, "Vercel Hobby preview config omits Cron");
expectContains("release preflight checks release previews", releasePreflightRunner, "validate_release_preview_manifest.mjs");
expectContains("release preflight checks pinned pnpm", releasePreflightRunner, "pnpm matches packageManager");
expectContains("release preflight supports strict production", releasePreflightRunner, "--strict-production");
expectContains("release preflight supports env file", releasePreflightRunner, "--env-file");
expectContains("release preflight reports blockers", releasePreflightRunner, "BLOCKER");
expect(
  "release preflight does not print raw env secrets",
  !releasePreflightRunner.includes("console.log(env") &&
    !releasePreflightRunner.includes("console.error(env") &&
    !releasePreflightRunner.includes("console.log(process.env") &&
    !releasePreflightRunner.includes("console.error(process.env"),
  "no raw env object console output"
);

for (const file of [
	  "supabase/smoke/0001_manual_correction_rpc.sql",
	  "supabase/smoke/0002_ingestion_rpc.sql",
	  "supabase/smoke/0003_registry_constraints.sql",
	  "supabase/smoke/0004_source_retention_rpc.sql",
	  "supabase/smoke/0005_api_rate_limit_rpc.sql"
	]) {
	  expectContains(`Supabase runner includes ${file}`, supabaseRunner, file);
	}
expectContains("Supabase runner checks psql availability", supabaseRunner, '"psql", ["--version"]');
expectContains("Supabase runner uses ON_ERROR_STOP", supabaseRunner, "ON_ERROR_STOP=1");
expectContains("Supabase runner uses PGDATABASE instead of URL argv", supabaseRunner, "PGDATABASE: databaseUrl");
expectContains("Supabase runner redacts connection strings", supabaseRunner, "redactConnectionString");
expectContains("Supabase runner supports dry run", supabaseRunner, "--dry-run");
expectContains("Supabase runner requires explicit Supabase DB URL", supabaseRunner, "process.env.SUPABASE_DB_URL");
expect(
  "Supabase runner avoids generic database URL fallbacks",
  !supabaseRunner.includes("process.env.DATABASE_URL") &&
    !supabaseRunner.includes("process.env.POSTGRES_URL"),
  "do not fall back to DATABASE_URL or POSTGRES_URL"
);
expectContains("Supabase prerequisite checker checks Supabase CLI", supabasePrereqRunner, '"supabase", ["--version"]');
expectContains("Supabase prerequisite checker checks Docker CLI", supabasePrereqRunner, '"docker", ["--version"]');
expectContains("Supabase prerequisite checker checks psql", supabasePrereqRunner, '"psql", ["--version"]');
expectContains("Supabase prerequisite checker checks CLI config", supabasePrereqRunner, "supabase/config.toml");
expectContains("Supabase prerequisite checker checks migration file", supabasePrereqRunner, "supabase/migrations/0001_initial.sql");
expectContains("Supabase prerequisite checker checks creator registry migration", supabasePrereqRunner, "supabase/migrations/0002_creator_channel_registry_rpc.sql");
expectContains("Supabase prerequisite checker checks API rate-limit migration", supabasePrereqRunner, "supabase/migrations/0003_api_rate_limit_rpc.sql");
for (const file of [
  "supabase/smoke/0001_manual_correction_rpc.sql",
  "supabase/smoke/0002_ingestion_rpc.sql",
  "supabase/smoke/0003_registry_constraints.sql",
  "supabase/smoke/0004_source_retention_rpc.sql",
  "supabase/smoke/0005_api_rate_limit_rpc.sql"
]) {
  expectContains(`Supabase prerequisite checker checks ${file}`, supabasePrereqRunner, file);
}

expectContains("Supabase config declares project id", supabaseConfig, 'project_id = "oshi-command-deck"');
expectContains("Supabase config enables local API", supabaseConfig, "[api]");
expectContains("Supabase config exposes sanitized public schema", supabaseConfig, 'schemas = ["public", "graphql_public"]');
expectContains("Supabase config sets local database port", supabaseConfig, "port = 54322");
expectContains("Supabase config pins database major version", supabaseConfig, "major_version = 15");
expectContains("Supabase config seeds local demo rows", supabaseConfig, 'sql_paths = ["./seed.sql"]');
expectContains("Supabase config points auth to local app", supabaseConfig, 'site_url = "http://127.0.0.1:3001"');
expectContains("Supabase config disables self-service signup", supabaseConfig, "enable_signup = false");
expect(
  "Supabase config does not commit secrets",
  !/service_role|anon_key|jwt_secret|password\s*=|secret\s*=/iu.test(supabaseConfig),
  "no service_role, anon_key, jwt_secret, password, or secret literals"
);
expect(
  "Vercel root config omits crons",
  !vercelConfig.includes('"crons"'),
  "vercel.json must not define crons"
);
expectContains("Vercel preview deploy runner uses preview config", vercelPreviewDeployRunner, "vercel.preview.json");
expectContains("Vercel preview deploy runner publishes public demo", vercelPreviewDeployRunner, '"--prod"');
expectContains("Vercel preview deploy runner sets demo build env", vercelPreviewDeployRunner, "NEXT_PUBLIC_DEMO_MODE=true");
expectContains("Vercel preview deploy runner protects Admin", vercelPreviewDeployRunner, "ADMIN_JOB_TOKEN");
expectContains("Vercel preview deploy runner avoids printing generated token", vercelPreviewDeployRunner, "the token is not printed");
expect(
  "Vercel Hobby preview config omits crons",
  !vercelPreviewConfig.includes('"crons"'),
  "vercel.preview.json must not define crons"
);
expectContains("Vercel production config keeps ingest cron", vercelProductionConfig, '"path": "/api/jobs/ingest"');
expectContains("Vercel production config keeps alert cron", vercelProductionConfig, '"path": "/api/jobs/alerts"');
expectContains("Vercel production config keeps retention cron", vercelProductionConfig, '"path": "/api/jobs/retention"');
expectContains("Vercel production config keeps frequent ingest cadence", vercelProductionConfig, '"schedule": "*/30 * * * *"');
expectContains("Vercel production config keeps frequent alert cadence", vercelProductionConfig, '"schedule": "*/10 * * * *"');
expectContains("setup guide documents Vercel Hobby preview", setupGuide, "pnpm deploy:vercel-preview");
expectContains("testing guide documents Vercel Hobby preview", testingGuide, "pnpm deploy:vercel-preview");
expectContains("readme documents Vercel Hobby preview", readme, "pnpm deploy:vercel-preview");
expectContains("setup guide documents production Vercel config", setupGuide, "vercel.production.json");
expectContains("testing guide documents production Vercel config", testingGuide, "vercel.production.json");
expectContains("readme documents production Vercel config", readme, "vercel.production.json");

for (const endpoint of [
	  "/api/streams",
	  "/api/ingestion/run",
	  "/api/ingestion/run?persist=1",
	  "/api/admin/session",
	  "/api/admin/creator-channels",
	  "/api/admin/ingestion-runs",
	  "/api/admin/audit-logs",
	  "/api/admin/corrections",
	  "/api/jobs/ingest?dryRun=1",
	  "/api/jobs/alerts?dryRun=1&demo=1",
	  "/api/jobs/retention?dryRun=1&provider=youtube"
	]) {
	  expectContains(`production dry-run checks ${endpoint}`, productionRunner, endpoint);
	}
expectContains("production dry-run checks unauthorized gates", productionRunner, "unauthorized gate");
expectContains("production dry-run expects HTTP 401", productionRunner, "401");
expectContains("production dry-run checks admin token reads", productionRunner, "runAuthorizedAdminChecks");
expectContains("production dry-run checks admin write validation without writes", productionRunner, "validates before writes");
expectContains("production dry-run checks Vercel cron isolation from admin", productionRunner, "runCronAdminIsolationChecks");
expectContains("production dry-run checks protected writes", productionRunner, "protectedWriteSkipped");
expectContains("production dry-run checks runtime security headers", productionRunner, "expectSecurityHeaders");
expectContains("production dry-run checks CSP runtime header", productionRunner, "Content-Security-Policy");
expectContains("production dry-run checks HSTS runtime header", productionRunner, "Strict-Transport-Security");
expectContains("production dry-run checks frame protection runtime header", productionRunner, "X-Frame-Options");
expectContains("production dry-run checks runtime rate-limit 429", productionRunner, "runRateLimit429HeaderProbe");
expectContains("production dry-run checks rate-limit helper", productionRunner, "expectRateLimitHeaders");
expectContains("production dry-run checks Retry-After", productionRunner, "retry-after");
expectContains("production dry-run checks RateLimit-Policy", productionRunner, "ratelimit-policy");
expectContains("production dry-run checks RateLimit-Backend", productionRunner, "ratelimit-backend");
expectContains("production dry-run checks admin-login limiter", productionRunner, "admin-login");
expectContains("production dry-run expects throttling HTTP 429", productionRunner, "429");
expectContains("production dry-run supports admin token", productionRunner, "ADMIN_JOB_TOKEN");
expectContains("production dry-run supports Vercel cron token", productionRunner, "CRON_SECRET");
expectContains("production dry-run supports cron token flag", productionRunner, "--cron-token");
expectContains("production dry-run injects CLI admin token into started server", productionRunner, "ADMIN_JOB_TOKEN: adminToken");
expectContains("production dry-run injects CLI cron token into started server", productionRunner, "CRON_SECRET: cronToken");
expectContains("production dry-run supports strict mode", productionRunner, "--strict");
expectContains("production dry-run supports local server start", productionRunner, "--start-server");
expectContains("production dry-run starts production server", productionRunner, '"pnpm"');
expectContains("production dry-run waits for server readiness", productionRunner, "waitForServerReady");
expect(
  "production dry-run does not print bearer token in logs",
  !productionRunner.includes("console.log(adminToken") &&
    !productionRunner.includes("console.log(cronToken") &&
    !productionRunner.includes("console.error(adminToken"),
  "no direct adminToken console output"
);

expectContains("protected Admin config uses dedicated port", protectedAdminPlaywrightConfig, "3005");
expectContains("protected Admin config sets deterministic ADMIN_JOB_TOKEN", protectedAdminPlaywrightConfig, "playwright-admin-");
expectContains("protected Admin config greps protected admin flow", protectedAdminPlaywrightConfig, "admin token gate redirects");
expectContains("protected Admin config starts Next production server", protectedAdminPlaywrightConfig, "next start");

expectContains("release preview captures mobile profile", previewRunner, "mobile-phone");
expectContains("release preview captures RTL mobile profile", previewRunner, "rtl-mobile");
expectContains("release preview supports protected Admin token", previewRunner, "PREVIEW_ADMIN_TOKEN");
expectContains("release preview can unlock protected Admin", previewRunner, "unlockProtectedAdmin");
expectContains("release preview writes release manifest", previewRunner, "release-preview-manifest");
expectContains("release preview records overflow audit", previewRunner, "horizontalOverflow");
expectContains("release preview records authorization audit", previewRunner, "adminAuthorizationActive");
expectContains("release preview records demo Admin audit", previewRunner, "adminDemoSurfaceVisible");
expectContains("release preview records login audit", previewRunner, "adminLoginVisible");

expectContains("release preview validator checks macOS profile", previewManifestValidator, "macos-desktop");
expectContains("release preview validator checks Windows profile", previewManifestValidator, "windows-desktop");
expectContains("release preview validator checks mobile profile", previewManifestValidator, "mobile-phone");
expectContains("release preview validator checks RTL profile", previewManifestValidator, "rtl-mobile");
expectContains("release preview validator requires protected Admin evidence", previewManifestValidator, "REQUIRE_PROTECTED_ADMIN_PREVIEW");
expectContains("release preview validator checks screenshot files", previewManifestValidator, "screenshot exists");
expectContains("release preview validator checks lang/dir", previewManifestValidator, "uses expected direction");
expectContains("release preview validator checks overflow", previewManifestValidator, "has no horizontal overflow");
expectContains("release preview validator checks authorization", previewManifestValidator, "adminAuthorizationActive=true");

for (const doc of [
  { label: "setup guide", value: setupGuide },
  { label: "testing guide", value: testingGuide },
  { label: "readme", value: readme }
]) {
  expectContains(`${doc.label} documents pnpm check:supabase-local`, doc.value, "pnpm check:supabase-local");
  expectContains(`${doc.label} documents pnpm check:release-preflight`, doc.value, "pnpm check:release-preflight");
  expectContains(`${doc.label} documents pnpm smoke:supabase`, doc.value, "pnpm smoke:supabase");
  expectContains(
    `${doc.label} documents pnpm smoke:production-dry-run`,
    doc.value,
    "pnpm smoke:production-dry-run"
  );
  expectContains(`${doc.label} documents production dry-run --start-server`, doc.value, "--start-server");
  expectContains(`${doc.label} documents protected Admin E2E`, doc.value, "pnpm test:e2e:admin");
  expectContains(`${doc.label} documents release previews`, doc.value, "pnpm capture:release-previews");
  expectContains(`${doc.label} documents release preview validation`, doc.value, "pnpm verify:release-previews");
}

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  const prefix = check.pass ? "OK" : "FAIL";
  console.log(`${prefix}: ${check.label}`);
}

if (failed.length > 0) {
  console.error("\nRelease smoke validation failed:");
  for (const check of failed) {
    console.error(`- ${check.label}: expected ${check.detail}`);
  }
  process.exit(1);
}
