import { expect, test } from "@playwright/test";

test("home loads demo streams and switches to Japanese", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Today command deck|今日のコマンドデッキ/ })).toBeVisible();
  await expect(page.getByText("DEMO").first()).toBeVisible();
  await expect(page.getByText("Original title").first()).toBeVisible();
  await expect(page.getByText("Talent").first()).toBeVisible();
  await expect(page.getByText("Collaborators").first()).toBeVisible();
  await expect(page.getByText("Links").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /YouTube/ }).first()).toBeVisible();
  await expect(page.getByLabel("Manual evidence: Manual correction").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Manual evidence/ })).toHaveCount(0);
  const provenanceDetails = page.locator("details").filter({ hasText: "Source evidence details" }).first();
  await provenanceDetails.locator("summary").click();
  await expect(provenanceDetails.getByText("Source ID").first()).toBeVisible();
  await expect(provenanceDetails.locator("code").first()).toBeVisible();
  await expect(provenanceDetails.getByText(/Evidence/).first()).toBeVisible();

  await page.getByLabel(/Display language|表示言語/).selectOption("ja");
  await expect(page.getByRole("link", { name: "今日" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "今日のコマンドデッキ" })).toBeVisible();
  await expect(page.getByText("原題").first()).toBeVisible();
  await expect(page.getByText("出典根拠の詳細").first()).toBeVisible();
  await expect(page.getByText("タレント").first()).toBeVisible();
  await expect(page.getByLabel("手動証拠: Manual correction").first()).toBeVisible();
  await expect(page.getByText("Minecraft通知が有効").first()).toBeVisible();
  await expect(page.getByText("Minecraft alert enabled")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("stored locale preferences hydrate without a React mismatch", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "oshi-command-deck.preferences.v1",
      JSON.stringify({ locale: "ja" })
    );
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "今日のコマンドデッキ" })).toBeVisible();
  expect(consoleErrors.filter((message) => message.includes("Hydration failed"))).toEqual([]);
});

test("filters can clear and route archive updates visible state", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/Search streams|配信を検索/).fill("zzzz-no-match");
  await expect(page.getByText(/No stream matches|現在のフィルター/)).toBeVisible();
  await page.getByRole("button", { name: /Clear all|すべて解除/ }).click();
  await expect(page.getByText(/夜の建築|Minecraft relay/).first()).toBeVisible();

  await page.goto("/route");
  await page.getByRole("button", { name: /Archive|アーカイブ/ }).first().click();
  await expect(page.getByText(/Archive queue|アーカイブキュー/)).toBeVisible();
});

test("minecraft page exposes session and accessible relationship list", async ({ page }) => {
  await page.goto("/minecraft");
  await expect(page.getByRole("heading", { name: /Minecraft sessions|Minecraft セッション/ })).toBeVisible();
  await expect(page.getByText(/Session source links|セッションのソースリンク/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /YouTube/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Manual evidence|手動証拠/ })).toHaveCount(0);
  await expect(page.getByText(/Accessible relationship list|アクセシブルな関係リスト/)).toBeVisible();
});

test("favorites exposes explainable alert queue and alert toggles", async ({ page }) => {
  await page.goto("/favorites");
  await expect(page.getByRole("heading", { name: /Favorites and alerts|お気に入りと通知/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Alert queue|通知キュー/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Disable push alerts|Push 通知を解除/ })).toBeVisible();
  await expect(page.getByText(/Minecraft POV archive candidate/)).toBeVisible();
  await expect(page.getByText(/Review first|要確認/).first()).toBeVisible();

  const minecraftSwitch = page.getByRole("switch", { name: /Minecraft alerts|Minecraft 通知/ });
  const initialMinecraftAlertState = await minecraftSwitch.getAttribute("aria-checked");
  await minecraftSwitch.click();
  await expect(minecraftSwitch).toHaveAttribute(
    "aria-checked",
    initialMinecraftAlertState === "true" ? "false" : "true"
  );

  const englishLanguage = page.getByTestId("favorite-language-en");
  await expect(englishLanguage).toHaveAttribute("aria-pressed", "true");
  await englishLanguage.click();
  await expect(englishLanguage).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByTestId("favorite-language-en")).toHaveAttribute(
    "aria-pressed",
    "false"
  );
});

test("settings exposes PWA install state and browser-controlled fallback", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: /Settings|設定/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Install app|アプリをインストール/ })).toBeVisible();
  await expect(page.getByText(/Install prompt not available|インストールプロンプト未提供/)).toBeVisible();
  await expect(page.getByText(/Browser controlled|ブラウザ制御/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Install app|アプリをインストール/ })).toBeDisabled();
});

test("settings accepts arbitrary BCP 47 locale tags for lang and direction", async ({ page }) => {
  await page.goto("/settings");
  const localeTag = page.getByLabel(/BCP 47 locale tag|BCP 47ロケールタグ/);
  await localeTag.clear();
  await localeTag.fill("ar-EG");
  await page.getByRole("button", { name: /Save display locale|表示ロケールを保存/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar-EG");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});

test("settings accepts arbitrary IANA timezones and SSR starts from stored locale cookie", async ({
  context,
  page,
  request
}) => {
  const cookieValue = encodeURIComponent(
    JSON.stringify({ locale: "ar-EG", timezone: "Europe/Paris" })
  );
  const serverResponse = await request.get("/settings", {
    headers: {
      cookie: `oshi-command-deck.locale-timezone.v1=${cookieValue}`
    }
  });
  expect(await serverResponse.text()).toContain('<html lang="ar-EG" dir="rtl"');

  await context.addCookies([
    {
      name: "oshi-command-deck.locale-timezone.v1",
      value: cookieValue,
      domain: "127.0.0.1",
      path: "/"
    }
  ]);

  await page.goto("/settings");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar-EG");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByLabel(/IANA timezone|IANAタイムゾーン/)).toHaveValue("Europe/Paris");

  const timezoneTag = page.getByLabel(/IANA timezone|IANAタイムゾーン/);
  await timezoneTag.clear();
  await timezoneTag.fill("America/Sao_Paulo");
  await page.getByRole("button", { name: /Save display timezone|表示タイムゾーンを保存/ }).click();
  await expect(timezoneTag).toHaveValue("America/Sao_Paulo");
  await expect(page.locator("span").filter({ hasText: /^America\/Sao_Paulo$/u })).toBeVisible();
});

test("legal and trust pages expose practical policy and source boundaries", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Privacy|プライバシー/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Contact \/ Takedown|連絡 \/ 削除依頼/ })).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: /Privacy|プライバシー/ })).toBeVisible();
  await expect(page.getByText(/push endpoint|Pushエンドポイント/)).toBeVisible();
  await expect(page.getByText(/Offline cache|オフラインキャッシュ/)).toBeVisible();
  await expect(page.getByText(/HTTP-only session cookie|HTTP-onlyセッションCookie/)).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByText(/not affiliated with|提携、承認、協賛/)).toBeVisible();
  await expect(page.getByText(/Do not use NIJISANJI|NIJISANJIまたはANYCOLOR/)).toBeVisible();
  await expect(page.getByRole("link", { name: /YouTube API Services Terms/ })).toBeVisible();

  await page.goto("/data-sources");
  await expect(page.getByRole("heading", { name: /Official provider APIs|公式プロバイダーAPI/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /No scraping or rehosting|スクレイピングと再ホスト禁止/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Source health|ソースヘルス/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /X Developer Agreement/ })).toBeVisible();

  await page.goto("/contact-takedown");
  await expect(page.getByRole("heading", { name: /Evidence to include|含める証拠/ })).toBeVisible();
  await expect(page.getByText(/Demo contact address is not configured|デモ用の連絡先は未設定/)).toBeVisible();
  await expect(page.getByText(/Privacy and deletion|プライバシーと削除/)).toBeVisible();
});

test("admin manual import appears on home and dry-run ingestion reports adapter results", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Protected admin console|保護された管理コンソール/ })).toBeVisible();
  const authStatus = page.getByRole("status").filter({
    hasText: /Demo admin surface|デモ管理画面/
  });
  await expect(authStatus).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("heading", { name: /Demo admin surface|デモ管理画面/ })).toBeVisible();
  await expect(page.getByText(/Demo open|デモ公開/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign out|サインアウト/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Admin authorization active|管理者認可が有効/ })).toHaveCount(0);
  await expect(page.locator("span").filter({ hasText: /^(Admin session|管理セッション)$/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Registry manager|レジストリ管理/ })).toBeVisible();
  await expect(page.getByText(/Registry source|レジストリソース/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Provider config export|プロバイダー設定エクスポート/ })).toBeVisible();
  await expect(page.getByLabel("YOUTUBE_CHANNELS_JSON")).toHaveValue(/DEMO_YT_KUZUHA/);
  await expect(page.getByLabel("X_HANDLES_JSON")).toHaveValue(/DEMO_X_KUZUHA/);
  await expect(page.getByText(/Export review warnings|エクスポート確認警告/)).toBeVisible();
  await expect(page.getByText(/Demo provider IDs|デモ用プロバイダーID/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Run history|実行履歴/ })).toBeVisible();
  await expect(page.getByText(/Demo history|デモ履歴/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Audit trail|監査ログ/ })).toBeVisible();
  await expect(page.getByText(/Demo audit|デモ監査/)).toBeVisible();
  await expect(page.getByText(/manual_corrections.apply/)).toBeVisible();

  await page.getByLabel(/Stream title|配信タイトル/).fill("Manual QA Minecraft POV");
  await page.getByLabel(/Source URL|ソースURL/).fill("https://www.youtube.com/watch?v=qaManual123");
  await page.getByLabel(/Scheduled local time|予定ローカル時刻/).fill("2026-06-19T21:00");
  await page.getByRole("button", { name: /Add manual stream|手動配信を追加/ }).click();
  await expect(page.getByText(/Manual stream saved locally|手動配信をローカル保存/)).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Manual QA Minecraft POV" }).first()).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByText(/Demo history|デモ履歴/)).toBeVisible();
  const dryRunButton = page.getByRole("button", { name: /Run ingestion dry run|取り込みドライランを実行/ });
  await expect(dryRunButton).toBeEnabled();
  const dryRunResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/ingestion/run") &&
      response.request().method() === "POST"
  );
  await dryRunButton.click();
  await dryRunResponse;
  await expect(page.getByText(/Adapter results|アダプター結果/)).toBeVisible();
  await expect(page.getByText(/Database write skipped|DB書き込みスキップ/)).toBeVisible();
});

test("admin session status failure is announced without demo fallback", async ({ page }) => {
  await page.route("**/api/admin/session", (route) => route.abort());

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Protected admin console|保護された管理コンソール/ })).toBeVisible();
  await expect(page.getByRole("alert").filter({
    hasText: /Could not confirm admin authorization|管理者認可を確認できません/
  })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Demo admin surface|デモ管理画面/ })).toHaveCount(0);
  await expect(page.getByText(/Demo open|デモ公開/)).toHaveCount(0);
});

test("admin registry form validates write protection in demo mode", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel(/Provider ID \/ handle|プロバイダーID \/ ハンドル/).fill("UC_E2E_REGISTRY");
  await page.getByLabel(/Display name|表示名/).fill("E2E Registry Talent");
  await page.getByLabel(/Slug|スラッグ/).fill("e2e-registry-talent");
  await page.getByRole("button", { name: /Save registry row|レジストリ行を保存/ }).click();
  await expect(page.getByText(/Admin session or bearer token|管理セッションまたはBearerトークン/)).toBeVisible();
});

test("admin correction form validates write protection in demo mode", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Conflict review|競合レビュー/ })).toBeVisible();
  const correctionForm = page.locator("form").filter({
    has: page.getByRole("button", { name: /Apply correction|修正を適用/ })
  });
  await correctionForm.getByLabel(/Corrected value|修正後の値/).fill("E2E corrected title");
  await correctionForm
    .getByLabel(/Correction reason|修正理由/)
    .fill("Direct source evidence requires this correction.");
  await expect(correctionForm.getByLabel(/Corrected value|修正後の値/)).toHaveValue(
    "E2E corrected title"
  );
  await correctionForm.getByRole("button", { name: /Apply correction|修正を適用/ }).click();
  await expect(page.getByText(/required to apply corrections|修正の適用には/)).toBeVisible();
});

test("desktop layouts avoid horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop layout matrix runs once in the desktop project");
  test.slow();

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1366, height: 768 }
  ]) {
    await page.setViewportSize(viewport);
    for (const route of [
      "/",
      "/favorites",
      "/minecraft",
      "/route",
      "/admin",
      "/privacy",
      "/terms",
      "/data-sources",
      "/contact-takedown"
    ]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    }
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const compactSessionsWidth = await page
      .getByRole("heading", { name: /Sessions|セッション/ })
      .evaluate((heading) => heading.parentElement?.parentElement?.getBoundingClientRect().width ?? 0);
    expect(compactSessionsWidth).toBeGreaterThan(300);
  }
});

test("mobile layouts avoid horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "mobile layout matrix runs once in the mobile project");
  test.slow();

  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    for (const route of [
      "/",
      "/favorites",
      "/minecraft",
      "/route",
      "/admin",
      "/privacy",
      "/terms",
      "/data-sources",
      "/contact-takedown"
    ]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    }
  }
});

test("admin token gate redirects and unlocks protected console when configured", async ({ page }) => {
  test.skip(!process.env.ADMIN_JOB_TOKEN, "ADMIN_JOB_TOKEN is required for the protected admin flow");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: /Admin sign in|管理者サインイン/ })).toBeVisible();

  await page.getByLabel(/Admin token|管理トークン/).fill(process.env.ADMIN_JOB_TOKEN ?? "");
  await page.getByRole("button", { name: /Unlock admin|管理画面を開く/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /Protected admin console|保護された管理コンソール/ })).toBeVisible();
  const authStatus = page.getByRole("status").filter({
    hasText: /Admin authorization active|管理者認可が有効/
  });
  await expect(authStatus).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("heading", { name: /Admin authorization active|管理者認可が有効/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign out|サインアウト/ })).toBeEnabled();
  await expect(page.locator("span").filter({ hasText: /^(Admin session|管理セッション)$/ })).toBeVisible();
  await expect(page.locator("span").filter({ hasText: /^(Owner|オーナー)$/ })).toBeVisible();
  await expect(page.locator("span").filter({ hasText: /^owner$/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Demo admin surface|デモ管理画面/ })).toHaveCount(0);
  await expect(page.getByText(/Demo open|デモ公開/)).toHaveCount(0);
});
