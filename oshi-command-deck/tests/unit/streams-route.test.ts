import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getStreams } from "@/app/api/streams/route";
import { resetRateLimitBuckets } from "@/lib/security/rate-limit";

const mocks = vi.hoisted(() => ({
  runIngestion: vi.fn(),
  hasServerEnv: vi.fn(),
  readPublicStreamsFromSupabase: vi.fn(),
  listActiveProviderCooldowns: vi.fn()
}));

vi.mock("@/lib/adapters", () => ({
  runIngestion: mocks.runIngestion
}));

vi.mock("@/lib/adapters/types", () => ({
  hasServerEnv: mocks.hasServerEnv
}));

vi.mock("@/lib/supabase/public-read", () => ({
  readPublicStreamsFromSupabase: mocks.readPublicStreamsFromSupabase
}));

vi.mock("@/lib/supabase/provider-cooldowns", () => ({
  listActiveProviderCooldowns: mocks.listActiveProviderCooldowns
}));

describe("/api/streams read-source selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    resetRateLimitBuckets();
  });

  it("does not fall back to adapters when Supabase public read is selected but unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("STREAMS_READ_SOURCE", "supabase");
    mocks.readPublicStreamsFromSupabase.mockResolvedValue({
      available: false,
      streams: [],
      sourceHealth: [
        {
          provider: "future",
          state: "degraded",
          coverageLimit: "Supabase public read failed.",
          lastCheckedUtc: "2026-06-19T00:00:00.000Z",
          confidence: 0.35,
          error: "missing credentials"
        }
      ]
    });

    const response = await getStreams(requestFor("203.0.113.100"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      mode: "mixed_degraded",
      readSource: "supabase",
      degraded: true,
      protectedWriteSkipped: true,
      streams: []
    });
    expect(body.sourceHealth[0]).toMatchObject({ provider: "future", state: "degraded" });
    expect(mocks.runIngestion).not.toHaveBeenCalled();
    expect(mocks.listActiveProviderCooldowns).not.toHaveBeenCalled();
  });

  it("lets the server demo-mode override select Supabase reads when the public demo flag was built true", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.stubEnv("OSHI_DEMO_MODE", "false");
    vi.stubEnv("STREAMS_READ_SOURCE", "supabase");
    mocks.readPublicStreamsFromSupabase.mockResolvedValue({
      available: true,
      streams: [
        {
          id: "stream-1",
          talentId: "kuzuha",
          talentName: "Kuzuha",
          title: "Original source title",
          originalTitle: "Original source title",
          category: "game",
          status: "scheduled",
          startsAtUtc: "2026-06-19T12:00:00.000Z",
          updatedAtUtc: "2026-06-19T00:00:00.000Z",
          confidence: 0.9,
          branch: "jp",
          languages: ["ja"],
          sourceLinks: [],
          collaborators: [],
          tags: [],
          demo: false,
          provenance: []
        }
      ],
      sourceHealth: []
    });

    const response = await getStreams(requestFor("203.0.113.103"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      mode: "live_api",
      readSource: "supabase",
      degraded: false,
      protectedWriteSkipped: true
    });
    expect(mocks.runIngestion).not.toHaveBeenCalled();
    expect(mocks.listActiveProviderCooldowns).not.toHaveBeenCalled();
  });

  it("lets the server demo-mode override keep public reads on demo adapters", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("OSHI_DEMO_MODE", "true");
    vi.stubEnv("STREAMS_READ_SOURCE", "supabase");
    mocks.hasServerEnv.mockReturnValue(true);
    mocks.listActiveProviderCooldowns.mockResolvedValue({});
    mocks.runIngestion.mockResolvedValue({
      mode: "demo",
      canonicalStreams: [],
      results: [
        {
          health: {
            provider: "manual",
            state: "healthy",
            coverageCode: "demoFixtures",
            coverageLimit: "Demo fixtures",
            lastCheckedUtc: "2026-06-19T00:00:00.000Z",
            confidence: 0.8
          }
        }
      ]
    });

    const response = await getStreams(requestFor("203.0.113.104"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      mode: "demo",
      protectedWriteSkipped: true
    });
    expect(body.readSource).toBeUndefined();
    expect(mocks.readPublicStreamsFromSupabase).not.toHaveBeenCalled();
    expect(mocks.runIngestion).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: true,
        demoMode: true
      })
    );
  });

  it("does not fall back to adapters when Supabase public read is configured but has no rows", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("STREAMS_READ_SOURCE", "supabase");
    mocks.readPublicStreamsFromSupabase.mockResolvedValue({
      available: true,
      streams: [],
      sourceHealth: [
        {
          provider: "future",
          state: "stale",
          coverageLimit: "Supabase public read model is configured but has no live events.",
          lastCheckedUtc: "2026-06-19T00:00:00.000Z",
          confidence: 0.45
        }
      ]
    });

    const response = await getStreams(requestFor("203.0.113.101"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      mode: "mixed_degraded",
      readSource: "supabase",
      degraded: false,
      protectedWriteSkipped: true,
      streams: []
    });
    expect(body.sourceHealth[0]).toMatchObject({ provider: "future", state: "stale" });
    expect(mocks.runIngestion).not.toHaveBeenCalled();
  });

  it("uses the adapter dry-run path when Supabase is not selected", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("STREAMS_READ_SOURCE", "adapters");
    mocks.hasServerEnv.mockReturnValue(false);
    mocks.listActiveProviderCooldowns.mockResolvedValue({});
    mocks.runIngestion.mockResolvedValue({
      mode: "demo",
      canonicalStreams: [],
      results: [
        {
          health: {
            provider: "manual",
            state: "healthy",
            coverageLimit: "Demo fixtures",
            lastCheckedUtc: "2026-06-19T00:00:00.000Z",
            confidence: 0.8
          }
        }
      ]
    });

    const response = await getStreams(requestFor("203.0.113.102"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      mode: "demo",
      protectedWriteSkipped: true,
      streams: []
    });
    expect(body.readSource).toBeUndefined();
    expect(mocks.readPublicStreamsFromSupabase).not.toHaveBeenCalled();
    expect(mocks.runIngestion).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: true,
        demoMode: true,
        providerCooldowns: {}
      })
    );
  });
});

function requestFor(ip: string) {
  return new Request("https://app.example/api/streams", {
    headers: {
      "x-forwarded-for": ip
    }
  });
}
