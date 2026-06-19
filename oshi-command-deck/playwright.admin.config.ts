import { defineConfig, devices } from "@playwright/test";

const protectedAdminPort = 3005;
const protectedAdminToken =
  process.env.ADMIN_JOB_TOKEN ?? `playwright-admin-${"a".repeat(32)}`;

process.env.ADMIN_JOB_TOKEN = protectedAdminToken;
process.env.NEXT_PUBLIC_DEMO_MODE = "true";
process.env.OSHI_DEMO_MODE = "true";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  grep: /admin token gate redirects and unlocks protected console when configured/u,
  expect: {
    timeout: 5_000
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${protectedAdminPort}`,
    serviceWorkers: "block",
    trace: "on-first-retry"
  },
  webServer: {
    command: `pnpm build && pnpm exec next start -H 127.0.0.1 -p ${protectedAdminPort}`,
    url: `http://127.0.0.1:${protectedAdminPort}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      ADMIN_JOB_TOKEN: protectedAdminToken,
      NEXT_PUBLIC_DEMO_MODE: "true",
      OSHI_DEMO_MODE: "true"
    }
  },
  projects: [
    {
      name: "protected-admin-chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
