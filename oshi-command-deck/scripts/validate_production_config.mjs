import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateProductionConfig } from "../lib/security/production-config.ts";

const args = parseArgs(process.argv.slice(2));
const env = args.envFile ? readEnvFile(args.envFile) : process.env;
const validation = validateProductionConfig(env, {
  strictProduction: args.strictProduction
});

console.log(`Profile: ${validation.profile}`);
console.log(`Stream read source: ${validation.summary.streamReadSource}`);
console.log(`Rate-limit backend: ${validation.summary.rateLimitBackend}`);
console.log(`Host rate limit configured: ${validation.summary.hostRateLimitConfigured}`);
console.log(`YouTube configured: ${validation.summary.youtubeConfigured}`);
console.log(`X configured: ${validation.summary.xConfigured}`);
console.log(`Supabase configured: ${validation.summary.supabaseConfigured}`);
console.log(`Cron secret configured: ${validation.summary.cronSecretConfigured}`);
console.log(`Push configured: ${validation.summary.pushConfigured}`);
console.log(`AI fallback enabled: ${validation.summary.aiFallbackEnabled}`);
console.log(`YouTube API data retention days: ${validation.summary.youtubeDataRetentionDays}`);

for (const issue of validation.issues) {
  const prefix = issue.level === "error" ? "FAIL" : "WARN";
  console.log(`${prefix}: ${issue.code}: ${issue.message}`);
}

if (!validation.ok) {
  process.exit(1);
}

console.log("OK: production configuration rules passed");

function parseArgs(argv) {
  const parsed = {
    envFile: undefined,
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
    if (arg === "--strict-production") {
      parsed.strictProduction = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function readEnvFile(path) {
  const resolved = resolve(process.cwd(), path);
  if (!existsSync(resolved)) {
    throw new Error(`Env file not found: ${path}`);
  }

  const env = {};
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
    env[key] = unquote(rawValue);
  }
  return env;
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
