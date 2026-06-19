import { afterEach, describe, expect, it, vi } from "vitest";
import { runIngestion } from "@/lib/adapters";

describe("ingestion integration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("runs with demo fixtures and no credentials", async () => {
    const summary = await runIngestion({
      now: new Date("2026-06-19T12:00:00Z"),
      dryRun: true,
      demoMode: true
    });

    expect(summary.mode).toBe("demo");
    expect(summary.canonicalStreams.length).toBeGreaterThanOrEqual(3);
    expect(summary.results.some((result) => result.provider === "youtube")).toBe(true);
  });

  it("is idempotent across repeated runs", async () => {
    const context = {
      now: new Date("2026-06-19T12:00:00Z"),
      dryRun: true,
      demoMode: true
    };
    const first = await runIngestion(context);
    const second = await runIngestion(context);

    expect(second.canonicalStreams.map((stream) => stream.canonicalKey)).toEqual(
      first.canonicalStreams.map((stream) => stream.canonicalKey)
    );
  });

  it("does not fall back to demo fixtures during credentialed live-mode failures", async () => {
    vi.stubEnv("YOUTUBE_DATA_API_KEY", "test-key");
    vi.stubEnv("YOUTUBE_CHANNELS_JSON", "");
    vi.stubEnv("X_BEARER_TOKEN", "");

    const summary = await runIngestion({
      now: new Date("2026-06-19T12:00:00Z"),
      dryRun: true,
      demoMode: false
    });

    expect(summary.mode).toBe("mixed_degraded");
    expect(summary.canonicalStreams).toEqual([]);
    expect(summary.results.flatMap((result) => result.streams)).toEqual([]);
  });

  it("skips providers with an active persisted cooldown instead of spending quota", async () => {
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
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const summary = await runIngestion({
      now: new Date("2026-06-19T12:00:00Z"),
      dryRun: true,
      demoMode: false,
      providerCooldowns: {
        youtube: {
          retryAfterUtc: "2026-06-19T12:30:00Z",
          reason: "Quota exceeded."
        }
      }
    });

    const youtube = summary.results.find((result) => result.provider === "youtube");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(youtube).toMatchObject({
      provider: "youtube",
      requestCount: 0,
      quotaCost: 0
    });
    expect(youtube?.errors[0]).toMatchObject({
      code: "provider_cooldown",
      retryAfterUtc: "2026-06-19T12:30:00Z",
      transient: true
    });
    expect(youtube?.health.error).toBe("provider_cooldown");
  });
});
