import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deriveYoutubeStreamStatus,
  mapYoutubeVideoToLivestream,
  parseYoutubeChannelRegistry,
  youtubeAdapter,
  type YoutubeVideoResource
} from "@/lib/adapters/youtube";

describe("YouTube adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("parses configured channel registry entries", () => {
    const channels = parseYoutubeChannelRegistry(
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

    expect(channels).toEqual([
      {
        talentId: "kuzuha",
        displayName: "Kuzuha",
        channelId: "UC123",
        branch: "jp",
        languages: ["ja"],
        tags: ["minecraft"]
      }
    ]);
  });

  it("maps YouTube live details to a normalized livestream", () => {
    const video: YoutubeVideoResource = {
      id: "abc123",
      snippet: {
        channelId: "UC123",
        title: "【Minecraft】夜の建築 with Elira Pendora",
        description: "参加者: Elira Pendora",
        liveBroadcastContent: "upcoming"
      },
      liveStreamingDetails: {
        scheduledStartTime: "2026-06-19T12:30:00Z"
      },
      status: {
        privacyStatus: "public",
        embeddable: true
      }
    };

    const stream = mapYoutubeVideoToLivestream(
      video,
      {
        talentId: "kuzuha",
        displayName: "Kuzuha",
        channelId: "UC123",
        branch: "jp",
        languages: ["ja"],
        tags: ["game"]
      },
      new Date("2026-06-19T10:00:00Z")
    );

    expect(stream).toMatchObject({
      id: "youtube-abc123",
      canonicalKey: "youtube:abc123",
      status: "scheduled",
      category: "minecraft",
      scheduledStartUtc: "2026-06-19T12:30:00Z",
      demo: false,
      visibility: "public"
    });
    expect(stream.sourceLinks[0]).toMatchObject({
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=abc123",
      embeddable: true
    });
    expect(stream.collaborators).toEqual(["Elira Pendora"]);
  });

  it("derives live and ended states from liveStreamingDetails", () => {
    expect(
      deriveYoutubeStreamStatus({
        id: "live",
        liveStreamingDetails: { actualStartTime: "2026-06-19T12:00:00Z" }
      })
    ).toBe("live");
    expect(
      deriveYoutubeStreamStatus({
        id: "ended",
        liveStreamingDetails: {
          actualStartTime: "2026-06-19T12:00:00Z",
          actualEndTime: "2026-06-19T13:00:00Z"
        }
      })
    ).toBe("ended");
  });

  it("does not call the network without credentials", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubEnv("YOUTUBE_DATA_API_KEY", "");

    const result = await youtubeAdapter.run({
      now: new Date("2026-06-19T12:00:00Z"),
      dryRun: true,
      demoMode: false
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.health.state).toBe("missing_credentials");
    expect(result.streams).toEqual([]);
  });

  it("stops the provider run on Retry-After quota errors instead of spending more quota", async () => {
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
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: "Quota exceeded.",
              errors: [{ reason: "quotaExceeded" }]
            }
          }),
          {
            status: 429,
            headers: {
              "retry-after": "120"
            }
          }
        )
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await youtubeAdapter.run({
      now: new Date("2026-06-19T12:00:00Z"),
      dryRun: true,
      demoMode: false
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      provider: "youtube",
      code: "quotaExceeded",
      transient: true
    });
    expect(result.errors[0].retryAfterUtc).toBeTruthy();
    expect(result.requestCount).toBe(1);
    expect(result.quotaCost).toBe(100);
    expect(result.health.coverageLimit).toContain("stopped early");
  });
});
