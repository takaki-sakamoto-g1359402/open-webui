import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3001",
    serviceWorkers: "block",
    trace: "on-first-retry"
  },
  webServer: {
    command: "NEXT_PUBLIC_DEMO_MODE=true OSHI_DEMO_MODE=true pnpm build && NEXT_PUBLIC_DEMO_MODE=true OSHI_DEMO_MODE=true pnpm start",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
    timeout: 120_000
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] }
    },
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
