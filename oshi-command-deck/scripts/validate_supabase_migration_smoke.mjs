import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
	  migrationDir: "supabase/migrations",
	  smoke: "supabase/smoke/0001_manual_correction_rpc.sql",
	  ingestionSmoke: "supabase/smoke/0002_ingestion_rpc.sql",
	  registrySmoke: "supabase/smoke/0003_registry_constraints.sql",
	  retentionSmoke: "supabase/smoke/0004_source_retention_rpc.sql",
	  rateLimitSmoke: "supabase/smoke/0005_api_rate_limit_rpc.sql",
	  packageJson: "package.json",
  setupGuide: "docs/setup-deploy.md",
  testingGuide: "docs/testing-strategy.md"
};

function readProjectFile(path) {
  return readFileSync(join(root, path), "utf8");
}

function readMigrationFiles() {
  return readdirSync(join(root, files.migrationDir))
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readProjectFile(join(files.migrationDir, file)))
    .join("\n\n");
}

const migration = readMigrationFiles();
const smoke = readProjectFile(files.smoke);
const ingestionSmoke = readProjectFile(files.ingestionSmoke);
const registrySmoke = readProjectFile(files.registrySmoke);
const retentionSmoke = readProjectFile(files.retentionSmoke);
const rateLimitSmoke = readProjectFile(files.rateLimitSmoke);
const setupGuide = readProjectFile(files.setupGuide);
const testingGuide = readProjectFile(files.testingGuide);
const packageJson = JSON.parse(readProjectFile(files.packageJson));

const checks = [];

function expectContains(label, value, needle) {
  checks.push({ label, pass: value.includes(needle), detail: needle });
}

function expectMatches(label, value, pattern) {
  checks.push({ label, pass: pattern.test(value), detail: String(pattern) });
}

function expectFalse(label, value, needle) {
  checks.push({ label, pass: !value.includes(needle), detail: needle });
}

expectContains(
  "migration creates correction RPC",
  migration,
  "create function public.apply_manual_correction"
);
expectContains("migration locks target event", migration, "for update;");
expectContains(
  "migration records correction trail",
  migration,
  "insert into public.manual_corrections"
);
expectContains("migration records audit trail", migration, "insert into public.audit_logs");
expectContains(
  "migration revokes direct client execution",
  migration,
  "revoke execute on function public.apply_manual_correction(text, text, jsonb, text, text, uuid, inet, text) from public, anon, authenticated;"
);
expectContains(
  "migration grants service-role execution",
  migration,
  "grant execute on function public.apply_manual_correction(text, text, jsonb, text, text, uuid, inet, text) to service_role;"
);
expectContains(
  "migration creates source retention RPC",
  migration,
  "create function public.purge_stale_source_items"
);
expectContains(
  "migration revokes source retention direct client execution",
  migration,
  "revoke execute on function public.purge_stale_source_items(public.provider_kind, timestamptz, boolean) from public, anon, authenticated;"
);
expectContains(
  "migration grants source retention service-role execution",
  migration,
  "grant execute on function public.purge_stale_source_items(public.provider_kind, timestamptz, boolean) to service_role;"
);
expectContains(
  "migration creates API rate-limit table",
  migration,
  "create table if not exists public.api_rate_limits"
);
expectContains(
  "migration creates API rate-limit RPC",
  migration,
  "create or replace function public.check_api_rate_limit"
);
expectContains(
  "migration rate-limit RPC uses atomic upsert",
  migration,
  "on conflict (bucket_key) do update"
);
expectContains(
  "migration revokes rate-limit direct client execution",
  migration,
  "revoke execute on function public.check_api_rate_limit(text, integer, integer, timestamptz)\n  from public, anon, authenticated;"
);
expectContains(
  "migration grants rate-limit service-role execution",
  migration,
  "grant execute on function public.check_api_rate_limit(text, integer, integer, timestamptz)\n  to service_role;"
);

expectMatches("smoke uses explicit transaction", smoke, /^\s*begin;/im);
expectMatches("smoke rolls back all data", smoke, /^\s*rollback;/im);
expectFalse("smoke never commits data", smoke.toLowerCase(), "commit;");
expectContains("smoke inserts deterministic event", smoke, "manual:SMOKE_CORRECTION_RPC");
expectContains("smoke checks anon public view read", smoke, "set local role anon");
expectContains("smoke checks public live event view", smoke, "public.public_live_events");
expectContains("smoke checks public event links", smoke, "public.public_event_links");
expectContains("smoke checks sensitive table direct SELECT denial", smoke, "direct SELECT on sensitive table");
expectContains("smoke checks sensitive table direct INSERT denial", smoke, "direct INSERT on sensitive table");
expectContains("smoke checks source item table denial", smoke, "'source_items'");
expectContains("smoke checks audit log table denial", smoke, "'audit_logs'");
expectContains("smoke calls correction RPC", smoke, "public.apply_manual_correction");
expectContains("smoke asserts corrected field marker", smoke, "'title' = any(admin_corrected_fields)");
expectContains("smoke asserts manual correction row", smoke, "from public.manual_corrections");
expectContains("smoke asserts audit row", smoke, "manual_corrections.apply");
expectContains("smoke checks anon privilege", smoke, "has_function_privilege(\n    'anon'");
expectContains(
  "smoke checks authenticated privilege",
  smoke,
  "has_function_privilege(\n    'authenticated'"
);
expectContains("smoke checks service role privilege", smoke, "has_function_privilege(\n    'service_role'");

expectMatches("ingestion smoke uses explicit transaction", ingestionSmoke, /^\s*begin;/im);
expectMatches("ingestion smoke rolls back all data", ingestionSmoke, /^\s*rollback;/im);
expectFalse("ingestion smoke never commits data", ingestionSmoke.toLowerCase(), "commit;");
expectContains(
  "ingestion smoke calls persistence RPC",
  ingestionSmoke,
  "public.persist_ingestion_run"
);
expectContains(
  "ingestion smoke inserts deterministic event",
  ingestionSmoke,
  "manual:SMOKE_INGESTION_RPC"
);
expectContains(
  "ingestion smoke checks raw evidence",
  ingestionSmoke,
  "payload_jsonb #>> '{rawEvidence,0,rawExcerpt}'"
);
expectContains(
  "ingestion smoke reruns the same payload for idempotency",
  ingestionSmoke,
  "smoke_ingestion_rpc_idempotency_result"
);
expectContains(
  "ingestion smoke checks idempotent canonical/source/link counts",
  ingestionSmoke,
  "idempotent ingestion did not keep canonical/source/link counts stable"
);
expectContains(
  "ingestion smoke checks provider error status",
  ingestionSmoke,
  "http_status = 429"
);
expectContains(
  "ingestion smoke checks admin correction guard",
  ingestionSmoke,
  "admin-corrected fields were not guarded during ingestion"
);
expectContains(
  "ingestion smoke checks stale event source reconcile",
  ingestionSmoke,
  "stale event_sources rows were not reconciled"
);
expectContains(
  "ingestion smoke opts into stale edge reconcile",
  ingestionSmoke,
  "'reconcileEdges', true"
);
expectContains(
  "ingestion smoke checks stale public link reconcile",
  ingestionSmoke,
  "stale public_event_links rows were not reconciled"
);
expectContains(
  "ingestion smoke checks service role privilege",
  ingestionSmoke,
  "has_function_privilege(\n    'service_role'"
);

expectMatches("registry smoke uses explicit transaction", registrySmoke, /^\s*begin;/im);
expectMatches("registry smoke rolls back all data", registrySmoke, /^\s*rollback;/im);
expectFalse("registry smoke never commits data", registrySmoke.toLowerCase(), "commit;");
expectContains("registry smoke checks anon branch read", registrySmoke, "from public.branches");
expectContains(
  "registry smoke calls atomic registry RPC",
  registrySmoke,
  "public.upsert_creator_channel_registry"
);
expectContains(
  "registry smoke checks registry RPC audit trail",
  registrySmoke,
  "registry RPC did not write the audit row atomically"
);
expectContains(
  "registry smoke checks registry RPC anon denial",
  registrySmoke,
  "anon_registry_rpc_denied"
);
expectContains(
  "registry smoke checks registry RPC authenticated denial",
  registrySmoke,
  "authenticated_registry_rpc_denied"
);
expectContains(
  "registry smoke checks registry RPC service role privilege",
  registrySmoke,
  "service_role_registry_rpc_allowed"
);
expectContains("registry smoke checks unknown branch rejection", registrySmoke, "unknown_branch");
expectContains("registry smoke checks invalid X handle rejection", registrySmoke, "invalid X handle insert unexpectedly succeeded");
expectContains(
  "registry smoke checks manual-only branch live-provider rejection",
  registrySmoke,
  "branch_not_open_for_live_provider"
);
expectContains(
  "registry smoke allows inactive manual-only provider rows",
  registrySmoke,
  "inactive-manual-branch-smoke"
);

expectMatches("retention smoke uses explicit transaction", retentionSmoke, /^\s*begin;/im);
expectMatches("retention smoke rolls back all data", retentionSmoke, /^\s*rollback;/im);
expectFalse("retention smoke never commits data", retentionSmoke.toLowerCase(), "commit;");
expectContains(
  "retention smoke calls source retention RPC",
  retentionSmoke,
  "public.purge_stale_source_items"
);
expectContains(
  "retention smoke checks dry-run counts",
  retentionSmoke,
  "source retention dry-run did not return expected counts"
);
expectContains(
  "retention smoke checks stale source deletion",
  retentionSmoke,
  "stale YouTube source item was not deleted"
);
expectContains(
  "retention smoke checks fresh source preservation",
  retentionSmoke,
  "fresh YouTube source item was unexpectedly deleted"
);
expectContains(
  "retention smoke checks audit trail",
  retentionSmoke,
  "source_items.retention_purge"
);
expectContains(
  "retention smoke checks service role privilege",
  retentionSmoke,
  "has_function_privilege(\n      'service_role'"
);

expectMatches("rate-limit smoke uses explicit transaction", rateLimitSmoke, /^\s*begin;/im);
expectMatches("rate-limit smoke rolls back all data", rateLimitSmoke, /^\s*rollback;/im);
expectFalse("rate-limit smoke never commits data", rateLimitSmoke.toLowerCase(), "commit;");
expectContains(
  "rate-limit smoke calls RPC",
  rateLimitSmoke,
  "public.check_api_rate_limit"
);
expectContains(
  "rate-limit smoke checks table denial for anon",
  rateLimitSmoke,
  "anon_rate_limit_table_denied"
);
expectContains(
  "rate-limit smoke checks table denial for authenticated",
  rateLimitSmoke,
  "authenticated_rate_limit_table_denied"
);
expectContains(
  "rate-limit smoke checks RPC anon denial",
  rateLimitSmoke,
  "anon_rate_limit_rpc_denied"
);
expectContains(
  "rate-limit smoke checks RPC authenticated denial",
  rateLimitSmoke,
  "authenticated_rate_limit_rpc_denied"
);
expectContains(
  "rate-limit smoke checks RPC service role privilege",
  rateLimitSmoke,
  "service_role_rate_limit_rpc_allowed"
);
expectContains(
  "rate-limit smoke checks blocked third call",
  rateLimitSmoke,
  "third rate-limit call should be blocked"
);
expectContains(
  "rate-limit smoke checks reset call",
  rateLimitSmoke,
  "rate-limit bucket should reset after the window"
);

checks.push({
  label: "package exposes verify:supabase",
  pass:
    packageJson.scripts?.["verify:supabase"] ===
    "node scripts/validate_supabase_migration_smoke.mjs",
  detail: "scripts.verify:supabase"
});
checks.push({
  label: "package verify includes Supabase guard",
  pass: typeof packageJson.scripts?.verify === "string" && packageJson.scripts.verify.includes("pnpm verify:supabase"),
  detail: "scripts.verify"
});

expectContains("setup guide documents smoke SQL", setupGuide, "supabase/smoke/0001_manual_correction_rpc.sql");
expectContains("setup guide documents ingestion smoke SQL", setupGuide, "supabase/smoke/0002_ingestion_rpc.sql");
expectContains("setup guide documents registry smoke SQL", setupGuide, "supabase/smoke/0003_registry_constraints.sql");
expectContains("setup guide documents retention smoke SQL", setupGuide, "supabase/smoke/0004_source_retention_rpc.sql");
expectContains("setup guide documents API rate-limit smoke SQL", setupGuide, "supabase/smoke/0005_api_rate_limit_rpc.sql");
expectContains("testing guide documents Supabase smoke", testingGuide, "Supabase migration smoke");

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  const prefix = check.pass ? "OK" : "FAIL";
  console.log(`${prefix}: ${check.label}`);
}

if (failed.length > 0) {
  console.error("\nSupabase migration smoke validation failed:");
  for (const check of failed) {
    console.error(`- ${check.label}: expected ${check.detail}`);
  }
  process.exit(1);
}
