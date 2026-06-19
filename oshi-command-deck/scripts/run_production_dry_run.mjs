#!/usr/bin/env node
import { spawn } from "node:child_process";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const baseUrl = normalizeBaseUrl(
  args.baseUrl ?? process.env.PRODUCTION_DRY_RUN_BASE_URL ?? "http://127.0.0.1:3001"
);
const adminToken = args.adminToken ?? process.env.ADMIN_JOB_TOKEN;
const cronToken = args.cronToken ?? process.env.CRON_SECRET;
const failures = [];

if (args.strict && !adminToken) {
  failures.push("Strict production dry-run requires ADMIN_JOB_TOKEN or --admin-token.");
}
if (args.strict && !cronToken) {
  failures.push("Strict production dry-run requires CRON_SECRET or --cron-token.");
}

console.log("Production-like dry run:");
console.log(`- base URL: ${baseUrl}`);
console.log(`- admin token: ${adminToken ? "set" : "not set"}`);
console.log(`- cron token: ${cronToken ? "set" : "not set"}`);
console.log(`- start server: ${args.startServer ? "enabled" : "disabled"}`);

const startedServer = await maybeStartServer();

try {
  await runSecurityHeaderChecks();

  const streams = await requestJson("/api/streams");
  expectStatus("GET /api/streams", streams, 200);
  expectArray("GET /api/streams streams", streams.body?.streams);
  expectArray("GET /api/streams sourceHealth", streams.body?.sourceHealth);
  expectTrue(
    "GET /api/streams stays read-only",
    streams.body?.protectedWriteSkipped === true,
    "expected protectedWriteSkipped=true"
  );
  if (args.expectReadSource) {
    expectTrue(
      "GET /api/streams read source",
      streams.body?.readSource === args.expectReadSource,
      `expected readSource=${args.expectReadSource}`
    );
  }

  const ingestionDryRun = await requestJson("/api/ingestion/run", {
    method: "POST"
  });
  expectStatus("POST /api/ingestion/run", ingestionDryRun, 200);
  expectArray("POST /api/ingestion/run results", ingestionDryRun.body?.results);
  expectArray("POST /api/ingestion/run canonicalStreams", ingestionDryRun.body?.canonicalStreams);
  expectTrue(
    "POST /api/ingestion/run stays read-only by default",
    ingestionDryRun.body?.protectedWriteSkipped === true,
    "expected protectedWriteSkipped=true"
  );

  const ingestionPersistUnauthorized = await requestJson("/api/ingestion/run?persist=1", {
    method: "POST"
  });
  expectStatus("POST /api/ingestion/run?persist=1 unauthorized gate", ingestionPersistUnauthorized, 401);

  const ingestUnauthorized = await requestJson("/api/jobs/ingest?dryRun=1");
  expectStatus("GET /api/jobs/ingest unauthorized gate", ingestUnauthorized, 401);

  const alertsUnauthorized = await requestJson("/api/jobs/alerts?dryRun=1&demo=1");
  expectStatus("GET /api/jobs/alerts unauthorized gate", alertsUnauthorized, 401);

  const retentionUnauthorized = await requestJson("/api/jobs/retention?dryRun=1&provider=youtube");
  expectStatus("GET /api/jobs/retention unauthorized gate", retentionUnauthorized, 401);

  if (adminToken) {
    await runUnauthorizedAdminChecks();
  }

  if (adminToken) {
    await runAuthorizedAdminChecks(adminToken);
    await runAuthorizedJobChecks("admin token", adminToken);
  }
  if (cronToken) {
    if (adminToken) {
      await runCronAdminIsolationChecks(cronToken);
    }
    await runAuthorizedJobChecks("cron token", cronToken);
  }
  await runRateLimit429HeaderProbe();
} finally {
  stopStartedServer(startedServer);
}

if (failures.length > 0) {
  console.error("\nProduction dry-run failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("OK: production-like dry-run gates passed without protected writes.");

async function maybeStartServer() {
  if (!args.startServer) {
    return undefined;
  }

  if (await isServerReady()) {
    console.log("OK: production server already reachable; reusing it.");
    return undefined;
  }

  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const startTarget = getStartTarget(baseUrl);
  const serverEnv = {
    ...process.env,
    ...(adminToken ? { ADMIN_JOB_TOKEN: adminToken } : {}),
    ...(cronToken ? { CRON_SECRET: cronToken } : {})
  };
  const child = spawn(command, ["exec", "next", "start", "-H", startTarget.host, "-p", startTarget.port], {
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const serverLogs = [];
  child.stdout?.on("data", (chunk) => {
    serverLogs.push(String(chunk));
  });
  child.stderr?.on("data", (chunk) => {
    serverLogs.push(String(chunk));
  });

  let rejectOnExit;
  let rejectOnError;
  const exitedEarly = new Promise((_, reject) => {
    rejectOnExit = (code, signal) => {
      reject(new Error(`start server exited before readiness (code=${code ?? "null"}, signal=${signal ?? "null"})`));
    };
    rejectOnError = (error) => {
      reject(error);
    };
    child.once("exit", rejectOnExit);
    child.once("error", rejectOnError);
  });

  try {
    await Promise.race([waitForServerReady(args.serverReadyTimeoutMs), exitedEarly]);
    if (rejectOnExit) {
      child.off("exit", rejectOnExit);
    }
    if (rejectOnError) {
      child.off("error", rejectOnError);
    }
    console.log("OK: started production server for dry-run.");
    return child;
  } catch (error) {
    stopStartedServer(child);
    failures.push(`start server failed: ${formatError(error)}${formatServerLogs(serverLogs)}`);
    return undefined;
  }
}

async function waitForServerReady(timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady()) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`server was not ready at ${baseUrl} within ${timeoutMs}ms`);
}

async function isServerReady() {
  try {
    const response = await fetch(baseUrl, {
      signal: AbortSignal.timeout(1000)
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

function stopStartedServer(child) {
  if (!child || child.killed) {
    return;
  }
  child.kill();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestJson(path, init = {}) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.headers ?? {})
      }
    });
    const text = await response.text();
    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      text,
      body: parseJson(text)
    };
  } catch (error) {
    failures.push(`${init.method ?? "GET"} ${path} request failed: ${formatError(error)}`);
    return {
      status: 0,
      ok: false,
      headers: new Headers(),
      text: "",
      body: undefined
    };
  }
}

async function requestRaw(path, init = {}) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, init);
    const text = await response.text();
    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      text
    };
  } catch (error) {
    failures.push(`${init.method ?? "GET"} ${path} request failed: ${formatError(error)}`);
    return {
      status: 0,
      ok: false,
      headers: new Headers(),
      text: ""
    };
  }
}

async function runSecurityHeaderChecks() {
  const response = await requestRaw("/");
  expectStatus("GET / security headers", response, 200);
  expectSecurityHeaders(response);
}

function expectSecurityHeaders(response) {
  expectHeaderContains(
    "GET / security header Content-Security-Policy",
    response,
    "content-security-policy",
    "frame-ancestors 'none'"
  );
  expectHeaderContains(
    "GET / security header X-Frame-Options",
    response,
    "x-frame-options",
    "DENY"
  );
  expectHeaderContains(
    "GET / security header Strict-Transport-Security",
    response,
    "strict-transport-security",
    "max-age=31536000"
  );
  expectHeaderContains(
    "GET / security header X-Content-Type-Options",
    response,
    "x-content-type-options",
    "nosniff"
  );
  expectHeaderContains(
    "GET / security header Referrer-Policy",
    response,
    "referrer-policy",
    "strict-origin-when-cross-origin"
  );
  expectHeaderContains(
    "GET / security header Permissions-Policy",
    response,
    "permissions-policy",
    "camera=()"
  );
}

async function runRateLimit429HeaderProbe() {
  const probeIp = `203.0.113.${(Date.now() % 200) + 1}`;
  let lastResponse;
  for (let index = 0; index < 10; index += 1) {
    lastResponse = await requestJson("/api/admin/session", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "content-type": "application/json",
        "x-forwarded-for": probeIp
      },
      body: JSON.stringify({
        token: `invalid-admin-token-${index}`
      })
    });
    expectRateLimitHeaders(
      `POST /api/admin/session rate-limit header attempt ${index + 1}`,
      lastResponse,
      "admin-login"
    );
    if (lastResponse.status === 429) {
      expectHeaderContains(
        "POST /api/admin/session 429 retry-after header",
        lastResponse,
        "retry-after",
        ""
      );
      expectHeaderContains(
        "POST /api/admin/session 429 rate-limit policy",
        lastResponse,
        "ratelimit-policy",
        "\"admin-login\";q=8;w=60"
      );
      expectHeaderContains(
        "POST /api/admin/session 429 rate-limit remaining",
        lastResponse,
        "ratelimit",
        "\"admin-login\";r=0;t="
      );
      expectTrue(
        "POST /api/admin/session returns machine-readable rate-limit error",
        lastResponse.body?.error === "rate_limited" &&
          typeof lastResponse.body?.retryAfterSeconds === "number",
        "expected rate_limited JSON body with retryAfterSeconds"
      );
      console.log("OK: POST /api/admin/session rate-limit 429 smoke reached throttled state");
      return;
    }
    if (lastResponse.status !== 200 && lastResponse.status !== 401) {
      failures.push(
        `POST /api/admin/session rate-limit smoke: expected HTTP 200, 401, or 429, got HTTP ${lastResponse.status}`
      );
      return;
    }
  }
  failures.push(
    `POST /api/admin/session rate-limit smoke: expected HTTP 429 within 10 requests, got HTTP ${lastResponse?.status ?? 0}`
  );
}

async function runAuthorizedJobChecks(labelPrefix, token) {
  const authHeaders = {
    Authorization: `Bearer ${token}`
  };
  const ingestJob = await requestJson("/api/jobs/ingest?dryRun=1", {
    headers: authHeaders
  });
  expectStatus(`GET /api/jobs/ingest ${labelPrefix} dry-run`, ingestJob, 200);
  expectArray(`GET /api/jobs/ingest ${labelPrefix} results`, ingestJob.body?.results);
  expectArray(
    `GET /api/jobs/ingest ${labelPrefix} canonicalStreams`,
    ingestJob.body?.canonicalStreams
  );
  expectTrue(
    `GET /api/jobs/ingest ${labelPrefix} stays read-only`,
    ingestJob.body?.protectedWriteSkipped === true,
    "expected protectedWriteSkipped=true"
  );

  const alertsJob = await requestJson("/api/jobs/alerts?dryRun=1&demo=1", {
    headers: authHeaders
  });
  expectStatus(`GET /api/jobs/alerts ${labelPrefix} dry-run`, alertsJob, 200);
  expectTrue(
    `GET /api/jobs/alerts ${labelPrefix} returns dryRun=true`,
    alertsJob.body?.dryRun === true,
    "expected dryRun=true"
  );
  expectTrue(
    `GET /api/jobs/alerts ${labelPrefix} stays read-only`,
    alertsJob.body?.protectedWriteSkipped === true,
    "expected protectedWriteSkipped=true"
  );
  expectTrue(
    `GET /api/jobs/alerts ${labelPrefix} exposes redacted plan`,
    typeof alertsJob.body?.plan === "object" && alertsJob.body.plan !== null,
    "expected plan object"
  );

  const retentionJob = await requestJson("/api/jobs/retention?dryRun=1&provider=youtube", {
    headers: authHeaders
  });
  expectStatus(`GET /api/jobs/retention ${labelPrefix} dry-run`, retentionJob, 200);
  expectTrue(
    `GET /api/jobs/retention ${labelPrefix} returns dryRun=true`,
    retentionJob.body?.dryRun === true,
    "expected dryRun=true"
  );
  expectTrue(
    `GET /api/jobs/retention ${labelPrefix} stays read-only`,
    retentionJob.body?.protectedWriteSkipped === true,
    "expected protectedWriteSkipped=true"
  );
  expectTrue(
    `GET /api/jobs/retention ${labelPrefix} exposes retention summary`,
    typeof retentionJob.body?.retention === "object" && retentionJob.body.retention !== null,
    "expected retention object"
  );
}

async function runUnauthorizedAdminChecks() {
  const creatorChannelsRead = await requestJson("/api/admin/creator-channels");
  expectStatus("GET /api/admin/creator-channels unauthorized gate", creatorChannelsRead, 401);

  const ingestionRunsRead = await requestJson("/api/admin/ingestion-runs");
  expectStatus("GET /api/admin/ingestion-runs unauthorized gate", ingestionRunsRead, 401);

  const auditLogsRead = await requestJson("/api/admin/audit-logs");
  expectStatus("GET /api/admin/audit-logs unauthorized gate", auditLogsRead, 401);

  const creatorChannelsWrite = await requestJson("/api/admin/creator-channels", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  });
  expectStatus("POST /api/admin/creator-channels unauthorized gate", creatorChannelsWrite, 401);

  const correctionsWrite = await requestJson("/api/admin/corrections", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  });
  expectStatus("POST /api/admin/corrections unauthorized gate", correctionsWrite, 401);
}

async function runAuthorizedAdminChecks(token) {
  const authHeaders = {
    Authorization: `Bearer ${token}`
  };
  const jsonAuthHeaders = {
    ...authHeaders,
    "content-type": "application/json"
  };

  const session = await requestJson("/api/admin/session", {
    headers: authHeaders
  });
  expectStatus("GET /api/admin/session admin token status", session, 200);
  expectTrue(
    "GET /api/admin/session admin token is authorized",
    session.body?.authorized === true && session.body?.source === "admin_token",
    "expected authorized=true and source=admin_token"
  );
  expectTrue(
    "GET /api/admin/session does not expose token",
    !JSON.stringify(session.body ?? {}).includes(token),
    "expected redacted session status"
  );

  const creatorChannels = await requestJson("/api/admin/creator-channels", {
    headers: authHeaders
  });
  expectStatus("GET /api/admin/creator-channels admin token read", creatorChannels, 200);
  expectArray("GET /api/admin/creator-channels channels", creatorChannels.body?.channels);
  expectTrue(
    "GET /api/admin/creator-channels exposes source",
    creatorChannels.body?.source === "demo" || creatorChannels.body?.source === "supabase",
    "expected source=demo or source=supabase"
  );

  const ingestionRuns = await requestJson("/api/admin/ingestion-runs", {
    headers: authHeaders
  });
  expectStatus("GET /api/admin/ingestion-runs admin token read", ingestionRuns, 200);
  expectArray("GET /api/admin/ingestion-runs runs", ingestionRuns.body?.runs);
  expectTrue(
    "GET /api/admin/ingestion-runs exposes source",
    ingestionRuns.body?.source === "demo" || ingestionRuns.body?.source === "supabase",
    "expected source=demo or source=supabase"
  );

  const auditLogs = await requestJson("/api/admin/audit-logs", {
    headers: authHeaders
  });
  expectStatus("GET /api/admin/audit-logs admin token read", auditLogs, 200);
  expectArray("GET /api/admin/audit-logs logs", auditLogs.body?.logs);
  expectTrue(
    "GET /api/admin/audit-logs exposes source",
    auditLogs.body?.source === "demo" || auditLogs.body?.source === "supabase",
    "expected source=demo or source=supabase"
  );

  const invalidCreatorChannel = await requestJson("/api/admin/creator-channels", {
    method: "POST",
    headers: jsonAuthHeaders,
    body: JSON.stringify({})
  });
  expectStatus("POST /api/admin/creator-channels validates before writes", invalidCreatorChannel, 400);

  const invalidCorrection = await requestJson("/api/admin/corrections", {
    method: "POST",
    headers: jsonAuthHeaders,
    body: JSON.stringify({})
  });
  expectStatus("POST /api/admin/corrections validates before writes", invalidCorrection, 400);
}

async function runCronAdminIsolationChecks(token) {
  const authHeaders = {
    Authorization: `Bearer ${token}`
  };

  const session = await requestJson("/api/admin/session", {
    headers: authHeaders
  });
  expectStatus("GET /api/admin/session cron token status", session, 200);
  expectTrue(
    "GET /api/admin/session cron token cannot unlock admin",
    session.body?.authorized === false && session.body?.source === "none",
    "expected authorized=false and source=none"
  );
  expectTrue(
    "GET /api/admin/session cron token stays redacted",
    !JSON.stringify(session.body ?? {}).includes(token),
    "expected redacted session status"
  );

  const creatorChannels = await requestJson("/api/admin/creator-channels", {
    headers: authHeaders
  });
  expectStatus("GET /api/admin/creator-channels cron token isolation", creatorChannels, 401);

  const correction = await requestJson("/api/admin/corrections", {
    method: "POST",
    headers: {
      ...authHeaders,
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  });
  expectStatus("POST /api/admin/corrections cron token isolation", correction, 401);
}

function parseJson(text) {
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function expectStatus(label, response, expectedStatus) {
  if (response.status !== expectedStatus) {
    failures.push(`${label}: expected HTTP ${expectedStatus}, got HTTP ${response.status}`);
    return;
  }
  console.log(`OK: ${label} returned HTTP ${expectedStatus}`);
}

function expectArray(label, value) {
  if (!Array.isArray(value)) {
    failures.push(`${label}: expected array`);
    return;
  }
  console.log(`OK: ${label} is an array (${value.length})`);
}

function expectTrue(label, pass, detail) {
  if (!pass) {
    failures.push(`${label}: ${detail}`);
    return;
  }
  console.log(`OK: ${label}`);
}

function expectHeaderContains(label, response, name, expected) {
  const value = response.headers.get(name);
  const pass = expected ? value?.includes(expected) === true : Boolean(value);
  if (!pass) {
    failures.push(`${label}: expected ${name} to contain ${expected || "<any value>"}`);
    return;
  }
  console.log(`OK: ${label}`);
}

function expectRateLimitHeaders(label, response, scope) {
  expectHeaderContains(`${label} RateLimit-Policy`, response, "ratelimit-policy", scope);
  expectHeaderContains(`${label} RateLimit`, response, "ratelimit", scope);
  expectHeaderContains(`${label} RateLimit-Backend`, response, "ratelimit-backend", "");
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/u, "");
}

function getStartTarget(value) {
  const parsed = new URL(value);
  return {
    host: parsed.hostname || "127.0.0.1",
    port: parsed.port || (parsed.protocol === "https:" ? "443" : "80")
  };
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function formatServerLogs(logs) {
  const text = logs.join("").trim();
  return text ? `; server logs: ${text.slice(-2000)}` : "";
}

function parseArgs(argv) {
  const parsed = {
    adminToken: undefined,
    baseUrl: undefined,
    cronToken: undefined,
    expectReadSource: undefined,
    help: false,
    serverReadyTimeoutMs: 30_000,
    startServer: false,
    strict: false
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
    if (arg === "--strict") {
      parsed.strict = true;
      continue;
    }
    if (arg === "--start-server") {
      parsed.startServer = true;
      continue;
    }
    if (arg === "--server-ready-timeout-ms") {
      parsed.serverReadyTimeoutMs = Number(readValue(argv, index, arg));
      index += 1;
      continue;
    }
    if (arg.startsWith("--server-ready-timeout-ms=")) {
      parsed.serverReadyTimeoutMs = Number(arg.slice("--server-ready-timeout-ms=".length));
      continue;
    }
    if (arg === "--base-url") {
      parsed.baseUrl = readValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--base-url=")) {
      parsed.baseUrl = arg.slice("--base-url=".length);
      continue;
    }
    if (arg === "--admin-token") {
      parsed.adminToken = readValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--admin-token=")) {
      parsed.adminToken = arg.slice("--admin-token=".length);
      continue;
    }
    if (arg === "--cron-token") {
      parsed.cronToken = readValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--cron-token=")) {
      parsed.cronToken = arg.slice("--cron-token=".length);
      continue;
    }
    if (arg === "--expect-read-source") {
      parsed.expectReadSource = readValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--expect-read-source=")) {
      parsed.expectReadSource = arg.slice("--expect-read-source=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isFinite(parsed.serverReadyTimeoutMs) || parsed.serverReadyTimeoutMs <= 0) {
    throw new Error("--server-ready-timeout-ms must be a positive number.");
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

function printHelp() {
  console.log(`Exercise production-like read-only routes against a running app server.

Usage:
  pnpm smoke:production-dry-run
  ADMIN_JOB_TOKEN=... pnpm smoke:production-dry-run -- --strict
  pnpm smoke:production-dry-run -- --base-url https://staging.example.com

Options:
  --base-url <url>             Running app URL. Defaults to http://127.0.0.1:3001.
  --admin-token <token>        Token for authorized job dry-runs. Prefer ADMIN_JOB_TOKEN.
  --cron-token <token>         Token for Vercel Cron job dry-runs. Prefer CRON_SECRET.
  --expect-read-source <name>  Require /api/streams readSource, for example "supabase".
  --start-server               Start "next start" for the --base-url host/port when it is not already reachable.
  --server-ready-timeout-ms    Wait time for --start-server readiness. Defaults to 30000.
  --strict                     Require admin and cron tokens plus authorized job dry-runs.
  --help                       Show this help.
`);
}
