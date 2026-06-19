import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/jobs/ingest/route";
import {
  adminAccountSessionCookieName,
  createAdminAccountSessionValue
} from "@/lib/security/admin";
import { resetRateLimitBuckets } from "@/lib/security/rate-limit";

describe("ingest job authorization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetRateLimitBuckets();
  });

  it("rejects browser admin account cookies for scheduled ingestion jobs", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("ADMIN_SESSION_SECRET", "session-secret-" + "s".repeat(32));
    const session = createAdminAccountSessionValue({
      authorized: true,
      source: "supabase_auth",
      role: "owner",
      userId: "00000000-0000-4000-8000-000000000008"
    });

    const response = await GET(
      new Request("https://app.example/api/jobs/ingest?dryRun=1", {
        headers: {
          cookie: `${adminAccountSessionCookieName}=${encodeURIComponent(session ?? "")}`
        }
      })
    );

    expect(response.status).toBe(401);
  });

  it("keeps scheduled ingestion jobs available to the explicit admin bearer token", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("YOUTUBE_DATA_API_KEY", "");
    vi.stubEnv("X_BEARER_TOKEN", "");

    const response = await GET(
      new Request("https://app.example/api/jobs/ingest?dryRun=1", {
        headers: {
          authorization: "Bearer job-token"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.protectedWriteSkipped).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
  });

  it("accepts the Vercel CRON_SECRET bearer token for scheduled ingestion jobs", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("YOUTUBE_DATA_API_KEY", "");
    vi.stubEnv("X_BEARER_TOKEN", "");

    const response = await GET(
      new Request("https://app.example/api/jobs/ingest?dryRun=1", {
        headers: {
          authorization: "Bearer cron-secret"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.protectedWriteSkipped).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
  });

  it("uses OSHI_DEMO_MODE to prevent scheduled dry-runs from calling live providers", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("OSHI_DEMO_MODE", "true");
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
    vi.stubGlobal("fetch", vi.fn());

    const response = await GET(
      new Request("https://app.example/api/jobs/ingest?dryRun=1", {
        headers: {
          authorization: "Bearer job-token"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("demo");
    expect(body.protectedWriteSkipped).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
