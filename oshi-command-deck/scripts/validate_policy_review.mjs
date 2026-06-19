import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  policyReview: "docs/policy-review.md",
  readme: "README.md",
  setupGuide: "docs/setup-deploy.md",
  testingGuide: "docs/testing-strategy.md",
  packageJson: "package.json"
};

const requiredUrls = [
  "https://www.anycolor.co.jp/guidelines/en/",
  "https://developers.google.com/youtube/terms/api-services-terms-of-service",
  "https://developers.google.com/youtube/terms/developer-policies",
  "https://docs.x.com/developer-terms/agreement",
  "https://docs.x.com/developer-terms/policy",
  "https://docs.x.com/developer-terms",
  "https://docs.x.com/developer-guidelines",
  "https://docs.x.com/x-api/fundamentals/rate-limits",
  "https://docs.x.com/x-api/posts/search/integrate/build-a-query",
  "https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers",
  "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429",
  "https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting",
  "https://vercel.com/docs/cron-jobs/manage-cron-jobs",
  "https://www.w3.org/TR/service-workers/",
  "https://www.w3.org/TR/appmanifest/",
  "https://www.w3.org/TR/push-api/",
  "https://datatracker.ietf.org/doc/html/rfc8292",
  "https://developer.mozilla.org/en-US/docs/Web/API/Push_API",
  "https://supabase.com/docs/guides/database/functions",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://supabase.com/docs/guides/database/tables#view-security"
];

const requiredPhrases = [
  "Last reviewed:",
  "not affiliated with or endorsed",
  "Do not use NIJISANJI or ANYCOLOR logos",
  "official YouTube Data API",
  "official X APIs",
  "Do not scrape X pages",
  "Raw provider payloads",
  "sanitized provider-error and admin-correction summaries",
  "/api/jobs/retention",
  "Manual corrections",
  "Optional AI parsing",
  "Push alerts",
  "VAPID configuration",
  "public application server key",
  "respect rate limits",
  "API-returned author metadata",
  "NEXT_PUBLIC_CONTACT_EMAIL",
  "pnpm verify:production-config",
  "pnpm smoke:supabase",
  "pnpm smoke:production-dry-run"
];

const policyReview = readProjectFile(files.policyReview);
const readme = readProjectFile(files.readme);
const setupGuide = readProjectFile(files.setupGuide);
const testingGuide = readProjectFile(files.testingGuide);
const packageJson = JSON.parse(readProjectFile(files.packageJson));
const checks = [];

function readProjectFile(path) {
  return readFileSync(join(root, path), "utf8");
}

function expect(label, pass, detail) {
  checks.push({ label, pass, detail });
}

function expectContains(label, value, needle) {
  expect(label, value.includes(needle), needle);
}

for (const url of requiredUrls) {
  expectContains(`policy review references ${url}`, policyReview, url);
}

for (const phrase of requiredPhrases) {
  expectContains(`policy review covers ${phrase}`, policyReview, phrase);
}

expect(
  "policy review has ISO last-reviewed date",
  /^Last reviewed: \d{4}-\d{2}-\d{2}$/mu.test(policyReview),
  "Last reviewed: YYYY-MM-DD"
);

expect(
  "package exposes policy review validator",
  packageJson.scripts?.["verify:policy-review"] === "node scripts/validate_policy_review.mjs",
  "scripts.verify:policy-review"
);
expect(
  "package verify includes policy review validator",
  typeof packageJson.scripts?.verify === "string" &&
    packageJson.scripts.verify.includes("pnpm verify:policy-review"),
  "scripts.verify"
);

for (const doc of [
  { label: "README", value: readme },
  { label: "setup guide", value: setupGuide },
  { label: "testing guide", value: testingGuide }
]) {
  expectContains(`${doc.label} links policy review`, doc.value, "docs/policy-review.md");
  expectContains(`${doc.label} documents verify:policy-review`, doc.value, "pnpm verify:policy-review");
}

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  const prefix = check.pass ? "OK" : "FAIL";
  console.log(`${prefix}: ${check.label}`);
}

if (failed.length > 0) {
  console.error("\nPolicy review validation failed:");
  for (const check of failed) {
    console.error(`- ${check.label}: expected ${check.detail}`);
  }
  process.exit(1);
}
