import { describe, expect, it } from "vitest";
import { mapProviderCooldownRows } from "@/lib/supabase/provider-cooldowns";

describe("provider cooldown mapping", () => {
  it("keeps the furthest active retry time per provider and exposes an operator reason", () => {
    const cooldowns = mapProviderCooldownRows([
      {
        provider: "x",
        provider_code: "Too Many Requests",
        retry_after_at: "2026-06-19T12:30:00Z",
        raw_excerpt: "Rate limit exceeded."
      },
      {
        provider: "x",
        provider_code: "older",
        retry_after_at: "2026-06-19T12:10:00Z",
        raw_excerpt: "Older retry window."
      },
      {
        provider: "youtube",
        provider_code: "quotaExceeded",
        retry_after_at: "2026-06-19T13:00:00Z",
        raw_excerpt: null
      }
    ]);

    expect(cooldowns.x).toEqual({
      retryAfterUtc: "2026-06-19T12:30:00.000Z",
      reason: "Rate limit exceeded."
    });
    expect(cooldowns.youtube).toEqual({
      retryAfterUtc: "2026-06-19T13:00:00.000Z",
      reason: "quotaExceeded"
    });
  });
});
