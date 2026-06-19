import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitBuckets } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn()
}));

describe("ingestion route provider cooldowns", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.mocked(createSupabaseServiceClient).mockReset();
    resetRateLimitBuckets();
  });

  it("passes active provider cooldowns into live dry-runs before adapters spend quota", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("YOUTUBE_DATA_API_KEY", "test-key");
    vi.stubEnv(
      "YOUTUBE_CHANNELS_JSON",
      JSON.stringify([
        {
          talentId: "kuzuha",
          displayName: "Kuzuha",
          channelId: "UC123",
          branch: "jp",
          languages: ["ja"],
          tags: ["minecraft"]
        }
      ])
    );
    vi.stubEnv("X_BEARER_TOKEN", "");
    vi.stubGlobal("fetch", vi.fn());
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      createProviderCooldownClient("2099-06-19T12:30:00Z", "YouTube quota reset window.")
    );
    const { POST: runIngestionDryRun } = await import("@/app/api/ingestion/run/route");

    const response = await runIngestionDryRun(
      new Request("https://app.example/api/ingestion/run", {
        method: "POST",
        headers: {
          authorization: "Bearer job-token"
        }
      })
    );
    const body = await response.json();
    const youtube = body.results.find((result: { provider: string }) => result.provider === "youtube");

    expect(response.status).toBe(200);
    expect(youtube.requestCount).toBe(0);
    expect(youtube.quotaCost).toBe(0);
    expect(youtube.errors[0]).toMatchObject({
      code: "provider_cooldown",
      retryAfterUtc: "2099-06-19T12:30:00.000Z"
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

function createProviderCooldownClient(retryAfterAt: string, reason: string) {
  const limit = vi.fn().mockResolvedValue({
    data: [
      {
        provider: "youtube",
        provider_code: "quotaExceeded",
        retry_after_at: retryAfterAt,
        raw_excerpt: reason
      }
    ],
    error: null
  });
  const order = vi.fn(() => ({ limit }));
  const gt = vi.fn(() => ({ order }));
  const eq = vi.fn(() => ({ gt }));
  const select = vi.fn(() => ({ eq }));
  return {
    from: vi.fn(() => ({ select }))
  } as unknown as ReturnType<typeof createSupabaseServiceClient>;
}
