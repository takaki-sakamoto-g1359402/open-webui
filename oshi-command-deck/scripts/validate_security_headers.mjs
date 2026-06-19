#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
const checks = [];

function expectContains(label, value, needle) {
  checks.push({ label, pass: value.includes(needle), detail: needle });
}

for (const [label, needle] of [
  ["CSP header is configured", "Content-Security-Policy"],
  ["CSP blocks framing", "frame-ancestors 'none'"],
  ["CSP blocks plugin/object content", "object-src 'none'"],
  ["CSP pins form submissions to self", "form-action 'self'"],
  ["CSP pins base URI to self", "base-uri 'self'"],
  ["frame options deny embedding", "X-Frame-Options"],
  ["frame options value is DENY", "DENY"],
  ["HSTS is configured", "Strict-Transport-Security"],
  ["HSTS uses one-year max age", "max-age=31536000"],
  ["MIME sniffing protection remains enabled", "X-Content-Type-Options"],
  ["referrer policy remains enabled", "Referrer-Policy"],
  ["permissions policy remains enabled", "Permissions-Policy"]
]) {
  expectContains(label, nextConfig, needle);
}

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "OK" : "FAIL"}: ${check.label}`);
}

if (failed.length > 0) {
  console.error("\nSecurity header validation failed:");
  for (const check of failed) {
    console.error(`- ${check.label}: expected ${check.detail}`);
  }
  process.exit(1);
}

console.log("OK: security headers are configured.");
