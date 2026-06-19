import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  migrationDir: "supabase/migrations",
  packageJson: "package.json",
  setupGuide: "docs/setup-deploy.md",
  testingGuide: "docs/testing-strategy.md",
  architectureGuide: "docs/architecture-data-flow.md"
};

const expectedTables = [
  "admin_members",
  "branches",
  "creator_channels",
  "live_events",
  "source_items",
  "event_sources",
  "public_event_links",
  "ingestion_runs",
  "provider_errors",
  "push_subscriptions",
  "push_delivery_receipts",
  "manual_corrections",
  "audit_logs",
  "api_rate_limits"
];

const sensitiveTables = [
  "admin_members",
  "source_items",
  "event_sources",
  "ingestion_runs",
  "provider_errors",
  "push_subscriptions",
  "push_delivery_receipts",
  "manual_corrections",
  "audit_logs",
  "api_rate_limits"
];

const publicColumnGrants = {
  branches: [
    "id",
    "label",
    "locale_hints",
    "coverage",
    "notes"
  ],
  creator_channels: [
    "id",
    "provider",
    "provider_channel_id",
    "display_name",
    "slug",
    "branch",
    "languages",
    "tags",
    "aliases",
    "confidence",
    "is_active"
  ],
  live_events: [
    "id",
    "creator_id",
    "canonical_key",
    "title",
    "category",
    "branch",
    "languages",
    "collaborators",
    "status",
    "scheduled_start_at",
    "actual_start_at",
    "ended_at",
    "visibility",
    "confidence",
    "stale_after_minutes",
    "conflict_ids",
    "provider_error_summary",
    "admin_corrected_fields",
    "admin_correction_note",
    "admin_corrected_at",
    "is_demo",
    "deleted_at",
    "updated_at"
  ],
  public_event_links: ["live_event_id", "provider", "url", "label", "embeddable"]
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
const normalizedMigration = normalizeSql(migration);
const statements = splitStatements(migration).map(normalizeSql);
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

const createdTables = [...normalizedMigration.matchAll(/create table(?: if not exists)? public\.([a-z_]+)/gu)].map(
  (match) => match[1]
);
expect(
  "migration creates exactly the expected public tables",
  sameMembers(createdTables, expectedTables),
  expectedTables.join(", ")
);

for (const table of expectedTables) {
  expectContains(
    `${table} has RLS enabled`,
    normalizedMigration,
    `alter table public.${table} enable row level security;`
  );
}

expectContains(
  "public creator view is security_invoker",
  normalizedMigration,
  "create view public.public_creator_channels with (security_invoker = true) as"
);
expectContains(
  "public live event view is security_invoker",
  normalizedMigration,
  "create view public.public_live_events with (security_invoker = true) as"
);

expectContains(
  "anon/auth can select sanitized creator view",
  normalizedMigration,
  "grant select on public.public_creator_channels to anon, authenticated;"
);
expectContains(
  "anon/auth can select sanitized event view",
  normalizedMigration,
  "grant select on public.public_live_events to anon, authenticated;"
);

for (const [table, columns] of Object.entries(publicColumnGrants)) {
  expect(
    `${table} exposes only the required public columns`,
    hasExactColumnGrant(table, columns),
    `grant select (${columns.join(", ")}) on public.${table} to anon, authenticated`
  );
}

for (const table of sensitiveTables) {
  expect(
    `${table} has no direct anon/auth/public grant`,
    !hasGrantToClientRole(table),
    `no grant to anon, authenticated, or public on public.${table}`
  );
}

for (const table of Object.keys(publicColumnGrants)) {
  expect(
    `${table} does not grant full-table select to clients`,
    !hasFullTableClientSelectGrant(table),
    `avoid grant select on public.${table} to anon/authenticated`
  );
}

expect(
  "public grants stay on the allowlist",
  findUnexpectedClientGrants().length === 0,
  findUnexpectedClientGrants().join("; ") || "only view, public column, and admin helper grants"
);

expectContains("is_admin helper is no-argument", normalizedMigration, "create function public.is_admin()");
expectContains("is_admin helper is security definer", functionBlock("public.is_admin()"), "security definer");
expectContains("is_admin helper pins search_path", functionBlock("public.is_admin()"), "set search_path = public");
expect(
  "is_admin helper does not accept arbitrary user ids",
  !normalizedMigration.includes("public.is_admin(uid uuid)") &&
    !normalizedMigration.includes("public.is_admin(auth.uid())"),
  "use public.is_admin() with auth.uid() inside the helper"
);
expectContains(
  "can_admin_write helper is no-argument",
  normalizedMigration,
  "create function public.can_admin_write()"
);
expectContains(
  "can_admin_write helper is security definer",
  functionBlock("public.can_admin_write()"),
  "security definer"
);
expectContains(
  "can_admin_write helper pins search_path",
  functionBlock("public.can_admin_write()"),
  "set search_path = public"
);
expectContains(
  "can_admin_write excludes reviewer writes",
  functionBlock("public.can_admin_write()"),
  "role in ('owner', 'admin')"
);

expectContains(
  "branch coverage enum exists",
  normalizedMigration,
  "create type public.branch_coverage as enum ('active', 'demo', 'manual_only', 'future');"
);
expectContains(
  "branch registry seeds future branch",
  normalizedMigration,
  "('future', 'future sources', '{}', 'future'"
);
expectContains(
  "public read branches policy exists",
  policyBlock("public read branches"),
  "using (true)"
);

expectContains(
  "creator channels branch references registry",
  normalizedMigration,
  "branch text not null references public.branches(id) on update cascade"
);
expectContains(
  "live events branch references registry",
  normalizedMigration,
  "branch text not null references public.branches(id) on update cascade"
);
expectContains(
  "creator channels validate provider id formats",
  normalizedMigration,
  "provider_channel_id ~ '^(uc[a-za-z0-9_-]{20,}|demo_[a-z0-9_]+)$'"
);
expectContains(
  "creator channel registry trigger rejects live providers on manual-only branches",
  functionBlock("public.validate_creator_channel_registry"),
  "branch_not_open_for_live_provider"
);
expectContains(
  "creator channel registry trigger is installed",
  normalizedMigration,
  "create trigger creator_channels_validate_registry before insert or update on public.creator_channels"
);

expectContains(
  "is_admin execute is closed to anon/public",
  normalizedMigration,
  "revoke execute on function public.is_admin() from public, anon;"
);
expectContains(
  "is_admin execute is available to authenticated policies",
  normalizedMigration,
  "grant execute on function public.is_admin() to authenticated;"
);
expectContains(
  "can_admin_write execute is closed to anon/public",
  normalizedMigration,
  "revoke execute on function public.can_admin_write() from public, anon;"
);
expectContains(
  "can_admin_write execute is available to authenticated policies",
  normalizedMigration,
  "grant execute on function public.can_admin_write() to authenticated;"
);

for (const policy of [
  "admins write branches",
  "admins write creator channels",
  "admins write live events",
  "admins write event links",
  "admins write manual corrections"
]) {
  expectContains(
    `${policy} uses writer RBAC`,
    policyBlock(policy),
    "public.can_admin_write()"
  );
}

for (const table of sensitiveTables) {
  if (table === "api_rate_limits") {
    continue;
  }
  const hasReadPolicy =
    table === "admin_members"
      ? policyBlock("admin members read own role").includes("public.is_admin()")
      : policyBlock(`admins read ${readPolicySuffix(table)}`).includes("public.is_admin()");
  expect(`${table} admin reads use admin RBAC`, hasReadPolicy, "public.is_admin()");
}

expectContains(
  "public event links check parent event visibility",
  policyBlock("public read event links"),
  "where e.id = public.public_event_links.live_event_id and e.deleted_at is null"
);

for (const [label, indexSql] of [
  [
    "creator channels branch FK is indexed",
    "create index creator_channels_branch_active_idx on public.creator_channels(branch, is_active);"
  ],
  [
    "live events creator FK is indexed",
    "create index live_events_creator_time_idx on public.live_events(creator_id, scheduled_start_at desc);"
  ],
  [
    "public live events scheduled reads use partial index",
    "create index live_events_public_scheduled_idx on public.live_events(scheduled_start_at) where deleted_at is null;"
  ],
  [
    "event sources source item FK is indexed",
    "create index event_sources_source_item_idx on public.event_sources(source_item_id);"
  ],
  [
    "public event links event FK is indexed",
    "create index public_event_links_event_idx on public.public_event_links(live_event_id);"
  ],
  [
    "provider errors run FK is indexed",
    "create index provider_errors_run_idx on public.provider_errors(run_id);"
  ],
  [
    "provider cooldown reads use transient retry-time index",
    "create index provider_errors_transient_retry_time_idx on public.provider_errors(retry_after_at desc) where is_transient = true;"
  ],
  [
    "push delivery receipts subscription FK is indexed",
    "create index push_delivery_receipts_subscription_time_idx on public.push_delivery_receipts(subscription_id, created_at desc);"
  ],
  [
    "manual corrections event FK is indexed",
    "create index manual_corrections_event_time_idx on public.manual_corrections(event_id, created_at desc);"
  ],
  [
    "manual corrections admin user FK is indexed",
    "create index manual_corrections_admin_user_time_idx on public.manual_corrections(admin_user_id, created_at desc);"
  ],
  [
    "audit logs actor FK is indexed",
    "create index audit_logs_actor_time_idx on public.audit_logs(actor_user_id, created_at desc);"
  ]
]) {
  expectContains(label, normalizedMigration, indexSql);
}

expectContains(
  "manual correction RPC pins search_path",
  functionBlock("public.apply_manual_correction"),
  "set search_path = public"
);
expect(
  "manual correction RPC is not security definer",
  !functionBlock("public.apply_manual_correction").includes("security definer"),
  "service_role-only execution should not add an extra definer bypass"
);
expectContains(
  "manual correction RPC execute is revoked from clients",
  normalizedMigration,
  "revoke execute on function public.apply_manual_correction(text, text, jsonb, text, text, uuid, inet, text) from public, anon, authenticated;"
);
expectContains(
  "manual correction RPC execute is service-role only",
  normalizedMigration,
  "grant execute on function public.apply_manual_correction(text, text, jsonb, text, text, uuid, inet, text) to service_role;"
);
expectContains(
  "creator channel registry RPC pins search_path",
  functionBlock("public.upsert_creator_channel_registry"),
  "set search_path = public"
);
expect(
  "creator channel registry RPC is not security definer",
  !functionBlock("public.upsert_creator_channel_registry").includes("security definer"),
  "service_role-only execution should not add an extra definer bypass"
);
expectContains(
  "creator channel registry RPC upserts atomically",
  functionBlock("public.upsert_creator_channel_registry"),
  "on conflict (provider, provider_channel_id) do update"
);
expectContains(
  "creator channel registry RPC records audit trail",
  functionBlock("public.upsert_creator_channel_registry"),
  "insert into public.audit_logs"
);
expectContains(
  "creator channel registry RPC keeps transaction bounded",
  functionBlock("public.upsert_creator_channel_registry"),
  "set_config('statement_timeout', '10s', true)"
);
expectContains(
  "creator channel registry RPC execute is revoked from clients",
  normalizedMigration,
  "revoke execute on function public.upsert_creator_channel_registry(public.provider_kind, text, text, text, text, text[], text[], text[], numeric, boolean, text, uuid, inet, text) from public, anon, authenticated;"
);
expectContains(
  "creator channel registry RPC execute is service-role only",
  normalizedMigration,
  "grant execute on function public.upsert_creator_channel_registry(public.provider_kind, text, text, text, text, text[], text[], text[], numeric, boolean, text, uuid, inet, text) to service_role;"
);
expectContains(
  "ingestion persistence RPC pins search_path",
  functionBlock("public.persist_ingestion_run"),
  "set search_path = public"
);
expect(
  "ingestion persistence RPC is not security definer",
  !functionBlock("public.persist_ingestion_run").includes("security definer"),
  "service_role-only execution should not add an extra definer bypass"
);
expectContains(
  "ingestion persistence RPC uses transaction advisory lock",
  functionBlock("public.persist_ingestion_run"),
  "pg_advisory_xact_lock(hashtext('oshi_command_deck_ingestion')::bigint)"
);
expectContains(
  "ingestion persistence RPC keeps transaction bounded",
  functionBlock("public.persist_ingestion_run"),
  "set_config('statement_timeout', '15s', true)"
);
expectContains(
  "ingestion persistence RPC upserts live events atomically",
  functionBlock("public.persist_ingestion_run"),
  "on conflict (canonical_key) do update"
);
expectContains(
  "ingestion persistence RPC upserts source items atomically",
  functionBlock("public.persist_ingestion_run"),
  "on conflict (provider, provider_item_id) do update"
);
expectContains(
  "ingestion persistence RPC reconciles stale event source edges",
  functionBlock("public.persist_ingestion_run"),
  "delete from public.event_sources"
);
expectContains(
  "ingestion persistence RPC requires explicit reconcile flag",
  functionBlock("public.persist_ingestion_run"),
  "coalesce((p_payload ->> 'reconcileedges')::boolean, false)"
);
expectContains(
  "ingestion persistence RPC reconciles stale public links",
  functionBlock("public.persist_ingestion_run"),
  "delete from public.public_event_links"
);
expectContains(
  "ingestion persistence RPC rejects duplicate run adapters",
  functionBlock("public.persist_ingestion_run"),
  "duplicate_run_adapter"
);
expectContains(
  "ingestion persistence RPC rejects provider errors without a run",
  functionBlock("public.persist_ingestion_run"),
  "provider_error_without_matching_run"
);
expectContains(
  "ingestion persistence RPC records provider errors",
  functionBlock("public.persist_ingestion_run"),
  "insert into public.provider_errors"
);
expectContains(
  "ingestion persistence RPC preserves existing source etags",
  functionBlock("public.persist_ingestion_run"),
  "etag = source_items.etag"
);
expectContains(
  "ingestion persistence RPC execute is revoked from clients",
  normalizedMigration,
  "revoke execute on function public.persist_ingestion_run(jsonb) from public, anon, authenticated;"
);
expectContains(
  "ingestion persistence RPC execute is service-role only",
  normalizedMigration,
  "grant execute on function public.persist_ingestion_run(jsonb) to service_role;"
);
expectContains(
  "source retention RPC pins search_path",
  functionBlock("public.purge_stale_source_items"),
  "set search_path = public"
);
expect(
  "source retention RPC is not security definer",
  !functionBlock("public.purge_stale_source_items").includes("security definer"),
  "service_role-only execution should not add an extra definer bypass"
);
expectContains(
  "source retention RPC keeps transaction bounded",
  functionBlock("public.purge_stale_source_items"),
  "set_config('statement_timeout', '10s', true)"
);
expectContains(
  "source retention RPC uses transaction advisory lock",
  functionBlock("public.purge_stale_source_items"),
  "pg_advisory_xact_lock(hashtext('oshi_command_deck_source_retention')::bigint)"
);
expectContains(
  "source retention RPC deletes stale event source edges first",
  functionBlock("public.purge_stale_source_items"),
  "delete from public.event_sources"
);
expectContains(
  "source retention RPC deletes stale source items",
  functionBlock("public.purge_stale_source_items"),
  "delete from public.source_items"
);
expectContains(
  "source retention RPC records audit trail",
  functionBlock("public.purge_stale_source_items"),
  "source_items.retention_purge"
);
expectContains(
  "source retention RPC execute is revoked from clients",
  normalizedMigration,
  "revoke execute on function public.purge_stale_source_items(public.provider_kind, timestamptz, boolean) from public, anon, authenticated;"
);
expectContains(
  "source retention RPC execute is service-role only",
  normalizedMigration,
  "grant execute on function public.purge_stale_source_items(public.provider_kind, timestamptz, boolean) to service_role;"
);

expectContains(
  "API rate-limit reset index exists",
  normalizedMigration,
  "create index if not exists api_rate_limits_reset_at_idx on public.api_rate_limits(reset_at);"
);
expectContains(
  "API rate-limit RPC exists",
  normalizedMigration,
  "create or replace function public.check_api_rate_limit"
);
expectContains(
  "API rate-limit RPC pins search_path",
  functionBlock("public.check_api_rate_limit"),
  "set search_path = public"
);
expect(
  "API rate-limit RPC stays invoker scoped",
  !functionBlock("public.check_api_rate_limit").includes("security definer"),
  "avoid security definer for rate-limit RPC"
);
expectContains(
  "API rate-limit RPC uses atomic upsert",
  functionBlock("public.check_api_rate_limit"),
  "on conflict (bucket_key) do update"
);
expectContains(
  "API rate-limit RPC sets statement timeout",
  functionBlock("public.check_api_rate_limit"),
  "set_config('statement_timeout', '5s', true)"
);
expectContains(
  "API rate-limit RPC cleans stale buckets",
  functionBlock("public.check_api_rate_limit"),
  "delete from public.api_rate_limits"
);
expectContains(
  "API rate-limit RPC execute is revoked from clients",
  normalizedMigration,
  "revoke execute on function public.check_api_rate_limit(text, integer, integer, timestamptz) from public, anon, authenticated;"
);
expectContains(
  "API rate-limit RPC execute is service-role only",
  normalizedMigration,
  "grant execute on function public.check_api_rate_limit(text, integer, integer, timestamptz) to service_role;"
);

expect(
  "package exposes verify:rls",
  packageJson.scripts?.["verify:rls"] === "node scripts/validate_supabase_rls.mjs",
  "scripts.verify:rls"
);
expect(
  "package verify includes RLS guard",
  typeof packageJson.scripts?.verify === "string" &&
    packageJson.scripts.verify.includes("pnpm verify:rls"),
  "scripts.verify"
);
expectContains("setup guide documents RLS guard", setupGuide, "pnpm verify:rls");
expectContains("testing guide documents RLS guard", testingGuide, "Supabase RLS guard");
expectContains(
  "architecture guide documents sanitized public reads",
  architectureGuide,
  "security_invoker"
);

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  const prefix = check.pass ? "OK" : "FAIL";
  console.log(`${prefix}: ${check.label}`);
}

if (failed.length > 0) {
  console.error("\nSupabase RLS validation failed:");
  for (const check of failed) {
    console.error(`- ${check.label}: expected ${check.detail}`);
  }
  process.exit(1);
}

function normalizeSql(value) {
  return value
    .replace(/--.*$/gmu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function splitStatements(value) {
  const statements = [];
  let current = "";
  let dollarQuoteTag = null;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (!dollarQuoteTag && char === "-" && value[index + 1] === "-") {
      const lineEnd = value.indexOf("\n", index + 2);
      if (lineEnd === -1) {
        break;
      }
      current += " ";
      index = lineEnd;
      continue;
    }

    if (char === "$") {
      const tagMatch = /^\$[A-Za-z0-9_]*\$/u.exec(value.slice(index));
      if (tagMatch) {
        const tag = tagMatch[0];
        if (!dollarQuoteTag) {
          dollarQuoteTag = tag;
        } else if (dollarQuoteTag === tag) {
          dollarQuoteTag = null;
        }
        current += tag;
        index += tag.length - 1;
        continue;
      }
    }

    current += char;

    if (char === ";" && !dollarQuoteTag) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = "";
    }
  }

  const trailing = current.trim();
  if (trailing) {
    statements.push(trailing.endsWith(";") ? trailing : `${trailing};`);
  }

  return statements;
}

function sameMembers(actual, expected) {
  return (
    actual.length === expected.length &&
    expected.every((item) => actual.includes(item)) &&
    actual.every((item) => expected.includes(item))
  );
}

function hasExactColumnGrant(table, columns) {
  const expected = columns.join(",");
  const pattern = new RegExp(
    `grant\\s+select\\s*\\(([^)]*)\\)\\s+on\\s+public\\.${table}\\s+to\\s+anon\\s*,\\s*authenticated\\s*;`,
    "iu"
  );
  const match = pattern.exec(migration);
  if (!match) {
    return false;
  }
  const actual = match[1]
    .split(",")
    .map((column) => column.trim().toLowerCase())
    .filter(Boolean)
    .join(",");
  return actual === expected;
}

function hasGrantToClientRole(table) {
  return statements.some(
    (statement) =>
      statement.startsWith("grant ") &&
      statement.includes(` on public.${table} `) &&
      /\bto\s+.*\b(anon|authenticated|public)\b/u.test(statement)
  );
}

function hasFullTableClientSelectGrant(table) {
  const pattern = new RegExp(
    `^grant\\s+(?:all(?:\\s+privileges)?|select(?:\\s*,|\\s+on))[^;]*\\son\\s+public\\.${table}\\s+to\\s+.*\\b(anon|authenticated|public)\\b`,
    "u"
  );
  return statements.some((statement) => pattern.test(statement));
}

function findUnexpectedClientGrants() {
  return statements.filter((statement) => {
    if (!statement.startsWith("grant ")) {
      return false;
    }
    if (!/\bto\s+.*\b(anon|authenticated|public)\b/u.test(statement)) {
      return false;
    }
    return !isAllowedClientGrant(statement);
  });
}

function isAllowedClientGrant(statement) {
  const allowedExact = new Set([
    "grant usage on schema public to anon, authenticated;",
    "grant select on public.public_creator_channels to anon, authenticated;",
    "grant select on public.public_live_events to anon, authenticated;",
    "grant execute on function public.is_admin() to authenticated;",
    "grant execute on function public.can_admin_write() to authenticated;"
  ]);
  if (allowedExact.has(statement)) {
    return true;
  }
  return Object.entries(publicColumnGrants).some(([table, columns]) =>
    matchesAllowedColumnGrant(statement, table, columns)
  );
}

function matchesAllowedColumnGrant(statement, table, columns) {
  const pattern = new RegExp(
    `^grant\\s+select\\s*\\(([^)]*)\\)\\s+on\\s+public\\.${table}\\s+to\\s+anon\\s*,\\s*authenticated\\s*;$`,
    "u"
  );
  const match = pattern.exec(statement);
  if (!match) {
    return false;
  }
  const actual = match[1]
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean)
    .join(",");
  return actual === columns.join(",");
}

function functionBlock(signature) {
  let start = normalizedMigration.indexOf(`create function ${signature}`);
  if (start === -1) {
    start = normalizedMigration.indexOf(`create or replace function ${signature}`);
  }
  if (start === -1) {
    return "";
  }
  const end = normalizedMigration.indexOf("$$;", start);
  return end === -1 ? normalizedMigration.slice(start) : normalizedMigration.slice(start, end + 3);
}

function policyBlock(name) {
  const start = normalizedMigration.indexOf(`create policy "${name}"`);
  if (start === -1) {
    return "";
  }
  const end = normalizedMigration.indexOf(";", start);
  return end === -1 ? normalizedMigration.slice(start) : normalizedMigration.slice(start, end + 1);
}

function readPolicySuffix(table) {
  return {
    source_items: "raw source items",
    event_sources: "event sources",
    ingestion_runs: "ingestion runs",
    provider_errors: "provider errors",
    push_subscriptions: "push subscriptions",
    push_delivery_receipts: "push delivery receipts",
    manual_corrections: "manual corrections",
    audit_logs: "audit logs"
  }[table];
}
