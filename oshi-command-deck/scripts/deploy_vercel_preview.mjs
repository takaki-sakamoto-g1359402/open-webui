#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const adminToken =
  process.env.PREVIEW_ADMIN_JOB_TOKEN?.trim() ||
  process.env.ADMIN_JOB_TOKEN?.trim() ||
  randomBytes(32).toString("hex");
const adminSessionSecret =
  process.env.PREVIEW_ADMIN_SESSION_SECRET?.trim() ||
  process.env.ADMIN_SESSION_SECRET?.trim() ||
  randomBytes(32).toString("hex");

const passthroughArgs = process.argv.slice(2);
const args = [
  "dlx",
  "vercel",
  "deploy",
  "--prod",
  "--local-config",
  "vercel.preview.json",
  "--yes",
  "--build-env",
  "NEXT_PUBLIC_DEMO_MODE=true",
  "--build-env",
  "OSHI_DEMO_MODE=true",
  "--env",
  "NEXT_PUBLIC_DEMO_MODE=true",
  "--env",
  "OSHI_DEMO_MODE=true",
  "--env",
  "STREAMS_READ_SOURCE=adapters",
  "--env",
  "RATE_LIMIT_BACKEND=memory",
  "--env",
  `ADMIN_JOB_TOKEN=${adminToken}`,
  "--env",
  `ADMIN_SESSION_SECRET=${adminSessionSecret}`,
  ...passthroughArgs
];

console.log("Deploying a public Vercel DEMO with cron-free config and protected Admin.");
if (!process.env.PREVIEW_ADMIN_JOB_TOKEN && !process.env.ADMIN_JOB_TOKEN) {
  console.log("Generated an ephemeral ADMIN_JOB_TOKEN for this deployment; the token is not printed.");
}

const result = spawnSync("pnpm", args, {
  stdio: "inherit",
  env: process.env
});

process.exit(result.status ?? 1);
