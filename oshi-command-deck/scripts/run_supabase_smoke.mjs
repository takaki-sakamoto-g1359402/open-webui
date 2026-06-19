#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const defaultSmokeFiles = [
  "supabase/smoke/0001_manual_correction_rpc.sql",
  "supabase/smoke/0002_ingestion_rpc.sql",
  "supabase/smoke/0003_registry_constraints.sql",
  "supabase/smoke/0004_source_retention_rpc.sql",
  "supabase/smoke/0005_api_rate_limit_rpc.sql"
];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const smokeFiles = args.files.length > 0 ? args.files : defaultSmokeFiles;
const missingFiles = smokeFiles.filter((file) => !existsSync(resolve(process.cwd(), file)));
if (missingFiles.length > 0) {
  console.error("Supabase smoke files were not found:");
  for (const file of missingFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const databaseUrl = args.databaseUrl ?? process.env.SUPABASE_DB_URL;

if (args.dryRun) {
  console.log("Supabase smoke dry run:");
  console.log(`- files: ${smokeFiles.join(", ")}`);
  console.log(`- database URL: ${databaseUrl ? redactConnectionString(databaseUrl) : "not configured"}`);
  process.exit(0);
}

if (!databaseUrl) {
  console.error(
    "Missing explicit Supabase staging database URL. Set SUPABASE_DB_URL or pass --database-url."
  );
  process.exit(2);
}

const psqlCheck = spawnSync("psql", ["--version"], {
  encoding: "utf8",
  stdio: "pipe"
});

if (psqlCheck.error?.code === "ENOENT") {
  console.error("psql was not found. Install the PostgreSQL client before running Supabase smoke SQL.");
  process.exit(2);
}

if (psqlCheck.status !== 0) {
  console.error("Unable to execute psql --version.");
  if (psqlCheck.stderr) {
    console.error(psqlCheck.stderr.trim());
  }
  process.exit(2);
}

console.log("Supabase staging smoke:");
console.log(`- database URL: ${redactConnectionString(databaseUrl)}`);
console.log(`- files: ${smokeFiles.join(", ")}`);

for (const file of smokeFiles) {
  console.log(`\nRunning ${file}`);
  const result = spawnSync(
    "psql",
    ["--no-psqlrc", "-v", "ON_ERROR_STOP=1", "-f", resolve(process.cwd(), file)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        PGDATABASE: databaseUrl
      }
    }
  );

  if (result.error) {
    console.error(`Failed to run ${file}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Supabase smoke failed in ${file}.`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nOK: Supabase smoke SQL completed. Smoke scripts roll back their test rows.");

function parseArgs(argv) {
  const parsed = {
    databaseUrl: undefined,
    dryRun: false,
    files: [],
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--database-url") {
      parsed.databaseUrl = readValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--database-url=")) {
      parsed.databaseUrl = arg.slice("--database-url=".length);
      continue;
    }
    if (arg === "--file") {
      parsed.files.push(readValue(argv, index, arg));
      index += 1;
      continue;
    }
    if (arg.startsWith("--file=")) {
      parsed.files.push(arg.slice("--file=".length));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function readValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function redactConnectionString(value) {
  try {
    const url = new URL(value);
    if (url.username) {
      url.username = "***";
    }
    if (url.password) {
      url.password = "***";
    }
    return url.toString();
  } catch {
    return "<redacted>";
  }
}

function printHelp() {
  console.log(`Run rollback-only Supabase smoke SQL against a migrated staging database.

Usage:
  pnpm smoke:supabase
  SUPABASE_DB_URL=postgresql://... pnpm smoke:supabase
  pnpm smoke:supabase -- --dry-run

Options:
  --database-url <url>  Explicit staging/local Supabase database URL. Prefer SUPABASE_DB_URL to avoid shell history.
  --file <path>         Run one smoke SQL file. Repeat to run multiple files.
  --dry-run             Print selected files and connection status without running psql.
  --help                Show this help.
`);
}
