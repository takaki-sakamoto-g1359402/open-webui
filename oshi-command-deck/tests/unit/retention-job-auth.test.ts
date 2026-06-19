import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/jobs/retention/route";
import { resetRateLimitBuckets } from "@/lib/security/rate-limit";

describe("retention job authorization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimitBuckets();
  });

  it("requires a scheduled-job bearer token", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("CRON_SECRET", "cron-secret");

    const response = await GET(
      new Request("https://app.example/api/jobs/retention?dryRun=1&provider=youtube")
    );

    expect(response.status).toBe(401);
  });

  it("accepts the explicit admin bearer token for source retention dry-runs", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const response = await GET(
      new Request("https://app.example/api/jobs/retention?dryRun=1&provider=youtube", {
        headers: {
          authorization: "Bearer job-token"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.protectedWriteSkipped).toBe(true);
    expect(body.retention.provider).toBe("youtube");
  });

  it("accepts the Vercel CRON_SECRET bearer token for source retention dry-runs", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const response = await GET(
      new Request("https://app.example/api/jobs/retention?dryRun=1&provider=youtube", {
        headers: {
          authorization: "Bearer cron-secret"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.protectedWriteSkipped).toBe(true);
    expect(body.retention.provider).toBe("youtube");
  });
});
