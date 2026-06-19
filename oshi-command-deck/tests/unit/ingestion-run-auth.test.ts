import { afterEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitBuckets } from "@/lib/security/rate-limit";

describe("ingestion run authorization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/adapters");
    vi.doUnmock("@/lib/supabase/provider-cooldowns");
    vi.doUnmock("@/lib/supabase/persist-ingestion");
    vi.resetModules();
    vi.clearAllMocks();
    resetRateLimitBuckets();
  });

  it("rejects persist=1 without write-capable admin auth before adapters run", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    const runIngestion = vi.fn();
    const persistIngestionSummary = vi.fn();

    vi.doMock("@/lib/adapters", () => ({
      runIngestion
    }));
    vi.doMock("@/lib/supabase/provider-cooldowns", () => ({
      listActiveProviderCooldowns: vi.fn()
    }));
    vi.doMock("@/lib/supabase/persist-ingestion", () => ({
      persistIngestionSummary
    }));

    const { POST } = await import("@/app/api/ingestion/run/route");
    const response = await POST(
      new Request("https://app.example/api/ingestion/run?persist=1", {
        method: "POST"
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "admin_required" });
    expect(runIngestion).not.toHaveBeenCalled();
    expect(persistIngestionSummary).not.toHaveBeenCalled();
  });

  it("keeps authorized manual dry-runs in demo mode when OSHI_DEMO_MODE is enabled", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("OSHI_DEMO_MODE", "true");
    const runIngestion = vi.fn().mockResolvedValue({
      mode: "demo",
      canonicalStreams: [],
      results: []
    });

    vi.doMock("@/lib/adapters", () => ({
      runIngestion
    }));
    vi.doMock("@/lib/supabase/provider-cooldowns", () => ({
      listActiveProviderCooldowns: vi.fn().mockResolvedValue({})
    }));
    vi.doMock("@/lib/supabase/persist-ingestion", () => ({
      persistIngestionSummary: vi.fn()
    }));

    const { POST } = await import("@/app/api/ingestion/run/route");
    const response = await POST(
      new Request("https://app.example/api/ingestion/run", {
        method: "POST",
        headers: {
          authorization: "Bearer job-token"
        }
      })
    );

    expect(response.status).toBe(200);
    expect(runIngestion).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: true,
        demoMode: true,
        providerCooldowns: {}
      })
    );
  });
});
