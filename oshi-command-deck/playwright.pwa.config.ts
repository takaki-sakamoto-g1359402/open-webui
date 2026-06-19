import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pwa",
  timeout: 45_000,
  expect: {
    timeout: 8_000
  },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-pwa" }]],
  use: {
    baseURL: "http://127.0.0.1:3002",
    serviceWorkers: "allow",
    trace: "on-first-retry"
  },
  webServer: {
    command: "pnpm start:pwa-test",
    url: "http://127.0.0.1:3002",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  projects: [
    {
      name: "pwa-mobile-chromium",
      use: { ...devices["Pixel 7"] }
    }
  ]
});
