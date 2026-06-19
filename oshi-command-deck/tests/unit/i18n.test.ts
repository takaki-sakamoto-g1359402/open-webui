import { describe, expect, it } from "vitest";
import {
  createTranslator,
  formatLanguageName,
  formatLocaleName,
  formatNumber,
  formatPlural,
  getPreferredLocaleFromAcceptLanguage,
  getLocaleDirection,
  normalizeLocaleTag,
  resolveCatalogLocale,
  resolveLocale,
  sortLocalized
} from "@/lib/i18n";

describe("i18n utilities", () => {
  it("resolves BCP 47 locale inputs to reference catalogs with fallback", () => {
    expect(resolveLocale("ja-JP")).toBe("ja-JP");
    expect(resolveLocale("en-US")).toBe("en-US");
    expect(resolveLocale("fr-CA")).toBe("fr-CA");
    expect(resolveCatalogLocale("ja-JP")).toBe("ja");
    expect(resolveCatalogLocale("fr-CA")).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
    expect(normalizeLocaleTag("not a locale")).toBe("en");
    expect(getPreferredLocaleFromAcceptLanguage("fr-CA,ja;q=0.8,en-US;q=0.6")).toBe("fr-CA");
    expect(getPreferredLocaleFromAcceptLanguage("*,en;q=0.8")).toBe("en");
  });

  it("keeps app-owned strings in catalogs", () => {
    expect(createTranslator("ja")("favorites.alertQueueTitle")).toBe("通知キュー");
    expect(createTranslator("en")("favorites.alertQueueTitle")).toBe("Alert queue");
    expect(createTranslator("en")("legal.privacyPushBody")).toContain("push endpoint");
    expect(createTranslator("en")("legal.sourcesNoScrapeBody")).toContain("must not scrape");
    expect(createTranslator("ja")("legal.contactEvidenceTitle")).toBe("含める証拠");
    expect(createTranslator("ja")("legal.termsMediaBody")).toContain("再ホスト");
  });

  it("detects RTL direction from BCP 47 language subtags", () => {
    expect(getLocaleDirection("ar-EG")).toBe("rtl");
    expect(getLocaleDirection("az-Arab")).toBe("rtl");
    expect(getLocaleDirection("ja-JP")).toBe("ltr");
  });

  it("formats numbers, plurals, and localized sorting without component logic", () => {
    expect(formatNumber(12345, "en")).toBe("12,345");
    expect(formatPlural(1, "en", "plural.streams")).toBe("1 stream");
    expect(formatPlural(2, "en", "plural.streams")).toBe("2 streams");
    expect(sortLocalized(["Éclair", "apple"], "en", (item) => item)).toEqual([
      "apple",
      "Éclair"
    ]);
    expect(formatPlural(2, "ar-EG", "plural.streams")).toBe("٢ streams");
  });

  it("formats BCP 47 language tags without component-specific labels", () => {
    expect(formatLanguageName("ja", "en")).toBe("Japanese (ja)");
    expect(formatLanguageName("en", "ja")).toBe("英語 (en)");
    expect(formatLocaleName("fr-CA", "en")).toBe("Canadian French (fr-CA)");
  });
});
