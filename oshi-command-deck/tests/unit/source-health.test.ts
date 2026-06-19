import { describe, expect, it } from "vitest";
import {
  formatSourceHealthCoverage,
  formatSourceHealthError
} from "@/lib/domain/source-health";
import type { SourceHealth } from "@/lib/domain/types";
import { createTranslator } from "@/lib/i18n";

describe("source health presentation", () => {
  it("formats source-owned health through locale catalogs", () => {
    const item: SourceHealth = {
      provider: "youtube",
      state: "healthy",
      coverageCode: "youtube.official_search",
      coverageParams: {
        channels: 3,
        maxResults: 10
      },
      coverageLimit:
        "Official YouTube Data API live/upcoming search across 3 configured channels; max 10 results per channel/event type.",
      lastCheckedUtc: "2026-06-19T00:00:00.000Z",
      confidence: 0.86
    };

    expect(formatSourceHealthCoverage(item, createTranslator("ja"))).toContain(
      "設定済みチャンネル3件"
    );
    expect(formatSourceHealthCoverage(item, createTranslator("en"))).toContain(
      "3 configured channels"
    );
  });

  it("does not render raw provider error text when an error code exists", () => {
    const item: SourceHealth = {
      provider: "future",
      state: "degraded",
      coverageCode: "supabase.read_failed",
      coverageLimit:
        "Supabase public read failed; provider adapters were not called because STREAMS_READ_SOURCE=supabase.",
      lastCheckedUtc: "2026-06-19T00:00:00.000Z",
      confidence: 0.35,
      errorCode: "supabase.public_read_failed",
      error: "database connection timed out with private details"
    };

    const formatted = formatSourceHealthError(item, createTranslator("en"));
    expect(formatted).toContain("Supabase public read failed");
    expect(formatted).not.toContain("private details");
  });

  it("uses a localized fallback for legacy raw-only source health", () => {
    const item: SourceHealth = {
      provider: "manual",
      state: "stale",
      coverageLimit: "Legacy raw message",
      confidence: 0.2
    };

    expect(formatSourceHealthCoverage(item, createTranslator("ja"))).toContain(
      "プロバイダー証跡"
    );
  });
});
