#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
const checks = [];

recordFile("migration", "supabase/migrations/0001_initial.sql");
recordFile("creator registry RPC migration", "supabase/migrations/0002_creator_channel_registry_rpc.sql");
recordFile("API rate-limit RPC migration", "supabase/migrations/0003_api_rate_limit_rpc.sql");
recordFile("Supabase CLI config", "supabase/config.toml");
recordFile("seed", "supabase/seed.sql");
recordFile("manual correction smoke SQL", "supabase/smoke/0001_manual_correction_rpc.sql");
recordFile("ingestion smoke SQL", "supabase/smoke/0002_ingestion_rpc.sql");
recordFile("registry smoke SQL", "supabase/smoke/0003_registry_constraints.sql");
recordFile("retention smoke SQL", "supabase/smoke/0004_source_retention_rpc.sql");
recordFile("API rate-limit smoke SQL", "supabase/smoke/0005_api_rate_limit_rpc.sql");
recordCommand("supabase CLI", "supabase", ["--version"]);
recordCommand("Docker CLI", "docker", ["--version"]);
recordCommand("PostgreSQL client", "psql", ["--version"]);

const dockerAvailable = checks.find((check) => check.id === "docker-cli")?.ok === true;
if (dockerAvailable) {
  const info = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    encoding: "utf8",
    stdio: "pipe"
  });
  checks.push({
    id: "docker-daemon",
    label: "Docker daemon",
    ok: info.status === 0,
    detail: info.status === 0 ? info.stdout.trim() : trimOutput(info.stderr) || "not reachable"
  });
} else {
  checks.push({
    id: "docker-daemon",
    label: "Docker daemon",
    ok: false,
    detail: "Docker CLI is not available"
  });
}

const missing = checks.filter((check) => !check.ok);

if (args.json) {
  console.log(JSON.stringify({ ok: missing.length === 0, checks }, null, 2));
} else {
  console.log("Local Supabase prerequisites:");
  for (const check of checks) {
    console.log(`${check.ok ? "OK" : "MISSING"}: ${check.label} - ${check.detail}`);
  }
  if (missing.length > 0) {
    console.log("\nNext steps:");
    if (isMissing("supabase-cli") || isMissing("docker-cli") || isMissing("docker-daemon")) {
      console.log("- Install the Supabase CLI and Docker Desktop or a compatible Docker runtime.");
    }
    if (isMissing("psql-cli")) {
      console.log("- Install the PostgreSQL client so `psql` is available.");
    }
    if (isMissing("supabase-config-toml")) {
      console.log("- Run `supabase init` and review the generated `supabase/config.toml` before keeping it.");
    }
    console.log("- Then run `supabase start`, `supabase db reset`, and `pnpm smoke:supabase` with a local or staging DB URL.");
  }
}

process.exit(missing.length > 0 ? 2 : 0);

function recordFile(label, path) {
  const absolutePath = resolve(process.cwd(), path);
  checks.push({
    id: path.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").toLowerCase(),
    label,
    ok: existsSync(absolutePath),
    detail: path
  });
}

function recordCommand(label, command, versionArgs) {
  const result = spawnSync(command, versionArgs, {
    encoding: "utf8",
    stdio: "pipe"
  });
  checks.push({
    id: `${command}-cli`,
    label,
    ok: result.status === 0,
    detail:
      result.status === 0
        ? trimOutput(result.stdout) || trimOutput(result.stderr) || "available"
        : result.error?.code === "ENOENT"
          ? "not found on PATH"
          : trimOutput(result.stderr) || result.error?.message || "not available"
  });
}

function trimOutput(value) {
  return String(value ?? "").trim().split(/\r?\n/u)[0] ?? "";
}

function isMissing(id) {
  return checks.some((check) => check.id === id && !check.ok);
}

function parseArgs(argv) {
  return {
    json: argv.includes("--json")
  };
}
