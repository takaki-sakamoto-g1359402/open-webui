#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { validateProductionConfig } from "../lib/security/production-config.ts";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const envFile = args.envFile ?? defaultEnvFile();
const checks = [];
let env = {};

recordRepositoryFiles();
recordToolchain();
recordSupabaseTools();
recordVercelCron();
recordProductionEnv();
recordReleasePreviewEvidence();

const errors = checks.filter((check) => check.level === "error" && !check.ok);
const warnings = checks.filter((check) => check.level === "warning" && !check.ok);
const summary = {
  ok: errors.length === 0,
  strictProduction: args.strictProduction,
  envFile,
  totals: {
    checks: checks.length,
    errors: errors.length,
    warnings: warnings.length
  },
  checks
};

if (args.json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printTextReport(summary);
}

process.exit(errors.length > 0 ? 2 : 0);

function recordRepositoryFiles() {
  const requiredFiles = [
    ".node-version",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "vercel.json",
    "next.config.ts",
    ".env.example",
    "public/manifest.webmanifest",
    "public/sw.js",
    "docs/policy-review.md",
    "docs/release-readiness.md",
    "docs/setup-deploy.md",
    "docs/testing-strategy.md",
    "supabase/config.toml",
    "supabase/seed.sql",
    "supabase/migrations/0001_initial.sql",
    "supabase/migrations/0002_creator_channel_registry_rpc.sql",
    "supabase/migrations/0003_api_rate_limit_rpc.sql",
    "supabase/smoke/0001_manual_correction_rpc.sql",
    "supabase/smoke/0002_ingestion_rpc.sql",
    "supabase/smoke/0003_registry_constraints.sql",
    "supabase/smoke/0004_source_retention_rpc.sql",
    "supabase/smoke/0005_api_rate_limit_rpc.sql",
    "scripts/validate_production_config.mjs",
    "scripts/check_local_supabase_prereqs.mjs",
    "scripts/run_supabase_smoke.mjs",
    "scripts/run_production_dry_run.mjs",
    "scripts/validate_release_preview_manifest.mjs"
  ];

  for (const path of requiredFiles) {
    recordFile("repo", `required file: ${path}`, path, { required: true });
  }
}

function recordToolchain() {
  const nodeResult = recordCommand("toolchain", "Node.js runtime", process.execPath, ["--version"], {
    required: true
  });
  const expectedNode = readOptionalFile(".node-version")?.trim();
  const actualNode = nodeResult.detail.replace(/^v/u, "").trim();
  if (expectedNode) {
    addCheck({
      category: "toolchain",
      label: "Node.js matches .node-version",
      ok: actualNode === expectedNode,
      level: "error",
      detail: `expected ${expectedNode}, got ${actualNode || "unknown"}`
    });
  }
  recordCommand("toolchain", "Corepack", "corepack", ["--version"], {
    required: false,
    nextStep: "Install or enable Corepack so the packageManager-pinned pnpm version can be reproduced."
  });
  const pnpmResult = recordCommand("toolchain", "pnpm", "pnpm", ["--version"], { required: true });
  const expectedPnpm = readExpectedPnpmVersion();
  if (expectedPnpm) {
    addCheck({
      category: "toolchain",
      label: "pnpm matches packageManager",
      ok: pnpmResult.ok && pnpmResult.detail === expectedPnpm,
      level: "error",
      detail: `expected ${expectedPnpm}, got ${pnpmResult.detail || "unknown"}`,
      nextStep: `Run corepack prepare pnpm@${expectedPnpm} --activate before install/build/release verification.`
    });
  }
}

function recordSupabaseTools() {
  recordCommand("external", "Supabase CLI", "supabase", ["--version"], {
    required: true,
    nextStep: "Install the Supabase CLI via Homebrew/Scoop/standalone binary, or add a local dev dependency before running supabase start."
  });
  const dockerCli = recordCommand("external", "Docker CLI", "docker", ["--version"], {
    required: true,
    nextStep: "Install Docker Desktop or a Docker-compatible runtime for the Supabase local stack."
  });
  recordCommand("external", "PostgreSQL client psql", "psql", ["--version"], {
    required: true,
    nextStep: "Install the PostgreSQL client so rollback-only Supabase smoke SQL can run."
  });

  if (dockerCli.ok) {
    recordCommand("external", "Docker daemon", "docker", ["info", "--format", "{{.ServerVersion}}"], {
      required: true,
      nextStep: "Start Docker Desktop or the compatible Docker daemon before running supabase start."
    });
  } else {
    addCheck({
      category: "external",
      label: "Docker daemon",
      ok: false,
      level: "error",
      detail: "Docker CLI is not available",
      nextStep: "Install and start Docker Desktop or a Docker-compatible runtime."
    });
  }

  recordCommand("external", "Vercel CLI", "vercel", ["--version"], {
    required: false,
    nextStep: "Optional locally if deployments are managed by Vercel Git integration, but useful for deployment diagnostics."
  });
}

function recordVercelCron() {
  const vercelPath = "vercel.json";
  if (!existsSync(resolve(root, vercelPath))) {
    addCheck({
      category: "vercel",
      label: "vercel.json exists",
      ok: false,
      level: "error",
      detail: vercelPath
    });
    return;
  }

  let config;
  try {
    config = JSON.parse(readFileSync(resolve(root, vercelPath), "utf8"));
    addCheck({
      category: "vercel",
      label: "vercel.json parses",
      ok: true,
      level: "error",
      detail: vercelPath
    });
  } catch (error) {
    addCheck({
      category: "vercel",
      label: "vercel.json parses",
      ok: false,
      level: "error",
      detail: error instanceof Error ? error.message : "invalid JSON"
    });
    return;
  }

  const crons = Array.isArray(config.crons) ? config.crons : [];
  const expected = [
    { path: "/api/jobs/ingest", schedule: "*/30 * * * *" },
    { path: "/api/jobs/alerts", schedule: "*/10 * * * *" },
    { path: "/api/jobs/retention", schedule: "15 3 * * *" }
  ];

  for (const job of expected) {
    const match = crons.find((cron) => cron?.path === job.path);
    addCheck({
      category: "vercel",
      label: `Vercel Cron route ${job.path}`,
      ok: Boolean(match) && match.schedule === job.schedule,
      level: "error",
      detail: `expected ${job.schedule}`
    });
  }
}

function recordProductionEnv() {
  if (!existsSync(resolve(root, envFile))) {
    addCheck({
      category: "env",
      label: "environment file exists",
      ok: false,
      level: args.strictProduction ? "error" : "warning",
      detail: envFile,
      nextStep: "Create .env.production.local from .env.example and fill only server-side secrets locally."
    });
    return;
  }

  try {
    env = readEnvFile(envFile);
    addCheck({
      category: "env",
      label: "environment file parses",
      ok: true,
      level: "error",
      detail: envFile
    });
  } catch (error) {
    addCheck({
      category: "env",
      label: "environment file parses",
      ok: false,
      level: "error",
      detail: error instanceof Error ? error.message : "invalid env file"
    });
    return;
  }

  const validation = validateProductionConfig(env, {
    strictProduction: args.strictProduction
  });
  addCheck({
    category: "env",
    label: "production config profile",
    ok: validation.profile === "production",
    level: args.strictProduction ? "error" : "warning",
    detail: `profile=${validation.profile}, streamReadSource=${validation.summary.streamReadSource}, rateLimitBackend=${validation.summary.rateLimitBackend}`,
    nextStep: "Set NEXT_PUBLIC_DEMO_MODE=false, OSHI_DEMO_MODE=false, and STREAMS_READ_SOURCE=supabase for production proof."
  });

  for (const issue of validation.issues) {
    addCheck({
      category: "env",
      label: `production config issue: ${issue.code}`,
      ok: false,
      level: args.strictProduction && issue.level === "error" ? "error" : "warning",
      detail: issue.message
    });
  }

  addCheck({
    category: "env",
    label: "production config validation",
    ok: validation.ok,
    level: args.strictProduction ? "error" : "warning",
    detail: `youtube=${validation.summary.youtubeConfigured}, x=${validation.summary.xConfigured}, supabase=${validation.summary.supabaseConfigured}, cronSecret=${validation.summary.cronSecretConfigured}, push=${validation.summary.pushConfigured}`
  });
}

function recordReleasePreviewEvidence() {
  const manifestPath = resolve(root, "artifacts/screenshots/release-preview-manifest-ja.json");
  const manifestExists = existsSync(manifestPath);
  addCheck({
    category: "evidence",
    label: "release preview manifest exists",
    ok: manifestExists,
    level: args.strictProduction ? "error" : "warning",
    detail: "artifacts/screenshots/release-preview-manifest-ja.json",
    nextStep: "Run PREVIEW_ADMIN_TOKEN=... pnpm capture:release-previews and pnpm verify:release-previews."
  });

  if (!manifestExists) {
    return;
  }

  const result = spawnSync(process.execPath, ["scripts/validate_release_preview_manifest.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PREVIEW_LOCALE: "ja",
      REQUIRE_PROTECTED_ADMIN_PREVIEW: "true"
    },
    stdio: "pipe"
  });
  addCheck({
    category: "evidence",
    label: "release preview manifest validates",
    ok: result.status === 0,
    level: "error",
    detail: result.status === 0 ? "macOS, Windows, mobile, RTL, protected Admin evidence validated" : trimOutput(result.stderr) || trimOutput(result.stdout) || "validation failed",
    nextStep: "Regenerate release previews with a protected Admin token and fix any viewport or authorization failures."
  });
}

function recordFile(category, label, path, options) {
  addCheck({
    category,
    label,
    ok: existsSync(resolve(root, path)),
    level: options.required ? "error" : "warning",
    detail: path
  });
}

function recordCommand(category, label, command, commandArgs, options) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe"
  });
  const ok = result.status === 0;
  const check = {
    category,
    label,
    ok,
    level: options.required ? "error" : "warning",
    detail: ok
      ? trimOutput(result.stdout) || trimOutput(result.stderr) || "available"
      : result.error?.code === "ENOENT"
        ? "not found on PATH"
        : trimOutput(result.stderr) || result.error?.message || "not available",
    nextStep: options.nextStep
  };
  addCheck(check);
  return check;
}

function addCheck(check) {
  checks.push({
    category: check.category,
    label: check.label,
    ok: check.ok,
    level: check.level,
    detail: check.detail,
    ...(check.nextStep ? { nextStep: check.nextStep } : {})
  });
}

function printTextReport(result) {
  console.log("Release preflight:");
  console.log(`Mode: ${result.strictProduction ? "strict production" : "advisory"}`);
  console.log(`Env file: ${result.envFile}`);
  console.log("");

  for (const category of unique(checks.map((check) => check.category))) {
    console.log(`${titleCase(category)}:`);
    for (const check of checks.filter((candidate) => candidate.category === category)) {
      const status = check.ok ? "OK" : check.level === "error" ? "BLOCKER" : "WARN";
      console.log(`${status}: ${check.label} - ${check.detail}`);
    }
    console.log("");
  }

  const nextSteps = unique(
    checks
      .filter((check) => !check.ok && check.nextStep)
      .map((check) => check.nextStep)
  );
  if (nextSteps.length > 0) {
    console.log("Next steps:");
    for (const step of nextSteps) {
      console.log(`- ${step}`);
    }
    console.log("");
  }

  console.log(
    `Summary: ${result.totals.checks - result.totals.errors - result.totals.warnings} OK, ${result.totals.warnings} warnings, ${result.totals.errors} blockers`
  );
}

function parseArgs(argv) {
  const parsed = {
    envFile: undefined,
    json: false,
    strictProduction: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--env-file") {
      parsed.envFile = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--json") {
      parsed.json = true;
      continue;
    }
    if (arg === "--strict" || arg === "--strict-production") {
      parsed.strictProduction = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function defaultEnvFile() {
  return existsSync(resolve(root, ".env.production.local")) ? ".env.production.local" : ".env.example";
}

function readEnvFile(path) {
  const resolved = resolve(root, path);
  const envValues = {};
  const text = readFileSync(resolved, "utf8");
  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    envValues[key] = unquote(rawValue);
  }
  return envValues;
}

function readOptionalFile(path) {
  const resolved = resolve(root, path);
  if (!existsSync(resolved)) {
    return undefined;
  }
  return readFileSync(resolved, "utf8");
}

function readExpectedPnpmVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    const packageManager = typeof packageJson.packageManager === "string" ? packageJson.packageManager : "";
    const match = /^pnpm@(.+)$/u.exec(packageManager);
    return match?.[1];
  } catch {
    return undefined;
  }
}

function unquote(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function trimOutput(value) {
  return String(value ?? "").trim().split(/\r?\n/u)[0] ?? "";
}

function unique(values) {
  return Array.from(new Set(values));
}

function titleCase(value) {
  return value
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}
