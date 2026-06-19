import { expect, test, type Page } from "@playwright/test";

type InstallOutcome = "accepted" | "dismissed";

declare global {
  interface Window {
    __oshiInstallTest: {
      promptCalls: number;
      fireBeforeInstallPrompt: (outcome: InstallOutcome) => { defaultPrevented: boolean };
      resolveChoice: () => void;
      fireAppInstalled: () => void;
    };
  }
}

test.describe("PWA install flow", () => {
  test("accepted beforeinstallprompt flow", async ({ page }) => {
    await installHarness(page);
    await page.goto("/settings");

    await firePrompt(page, "accepted");
    const installButton = page.getByRole("button", { name: /Install app|アプリをインストール/ });
    await expect(page.getByText(/Install prompt ready|インストール準備完了/)).toBeVisible();
    await expect(installButton).toBeEnabled();

    await installButton.click();
    await expect(page.getByText(/Waiting for browser choice|ブラウザ選択を待機中/)).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__oshiInstallTest.promptCalls)).toBe(1);

    await page.evaluate(() => window.__oshiInstallTest.resolveChoice());
    await expect(page.getByText(/Install accepted|インストール承認済み/)).toBeVisible();
    await expect(installButton).toBeDisabled();
  });

  test("dismissed beforeinstallprompt flow", async ({ page }) => {
    await installHarness(page);
    await page.goto("/settings");

    await firePrompt(page, "dismissed");
    const installButton = page.getByRole("button", { name: /Install app|アプリをインストール/ });
    await expect(installButton).toBeEnabled();

    await installButton.click();
    await expect(page.getByText(/Waiting for browser choice|ブラウザ選択を待機中/)).toBeVisible();
    await page.evaluate(() => window.__oshiInstallTest.resolveChoice());

    await expect(page.getByText(/Install dismissed|インストール辞退/)).toBeVisible();
    await expect(installButton).toBeDisabled();
  });

  test("appinstalled clears a saved prompt", async ({ page }) => {
    await installHarness(page);
    await page.goto("/settings");

    await firePrompt(page, "accepted");
    const installButton = page.getByRole("button", { name: /Install app|アプリをインストール/ });
    await expect(installButton).toBeEnabled();

    await page.evaluate(() => window.__oshiInstallTest.fireAppInstalled());
    await expect(page.getByText(/Installed|インストール済み/)).toBeVisible();
    await expect(installButton).toBeDisabled();
  });
});

async function installHarness(page: Page) {
  await page.addInitScript(() => {
    let resolveChoice: (() => void) | null = null;

    window.__oshiInstallTest = {
      promptCalls: 0,
      fireBeforeInstallPrompt(outcome) {
        const userChoice = new Promise<{ outcome: InstallOutcome; platform: string }>((resolve) => {
          resolveChoice = () => resolve({ outcome, platform: "web" });
        });
        const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
        };

        event.prompt = async () => {
          window.__oshiInstallTest.promptCalls += 1;
        };
        event.userChoice = userChoice;
        window.dispatchEvent(event);

        return { defaultPrevented: event.defaultPrevented };
      },
      resolveChoice() {
        resolveChoice?.();
      },
      fireAppInstalled() {
        window.dispatchEvent(new Event("appinstalled"));
      }
    };
  });
}

async function firePrompt(page: Page, outcome: InstallOutcome) {
  await expect(page.getByText(/Install prompt not available|インストールプロンプト未提供/)).toBeVisible();
  const result = await page.evaluate((choice) => window.__oshiInstallTest.fireBeforeInstallPrompt(choice), outcome);
  expect(result.defaultPrevented).toBe(true);
}
