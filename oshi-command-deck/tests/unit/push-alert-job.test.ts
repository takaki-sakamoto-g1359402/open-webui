import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminAccountSessionCookieName,
  createAdminAccountSessionValue
} from "@/lib/security/admin";
import { resetRateLimitBuckets } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn()
}));

describe("push alert job", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(createSupabaseServiceClient).mockReturnValue(createAlertsSupabaseClient([]));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.mocked(createSupabaseServiceClient).mockReset();
    resetRateLimitBuckets();
  });

  it("requires admin authorization", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    const { GET } = await import("@/app/api/jobs/alerts/route");

    const response = await GET(new Request("https://app.example/api/jobs/alerts?dryRun=1"));

    expect(response.status).toBe(401);
  });

  it("does not accept browser admin account cookies for scheduled jobs", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("ADMIN_SESSION_SECRET", "session-secret-" + "s".repeat(32));
    const session = createAdminAccountSessionValue({
      authorized: true,
      source: "supabase_auth",
      role: "owner",
      userId: "00000000-0000-4000-8000-000000000007"
    });
    const { GET } = await import("@/app/api/jobs/alerts/route");

    const response = await GET(
      new Request("https://app.example/api/jobs/alerts?dryRun=1", {
        headers: {
          cookie: `${adminAccountSessionCookieName}=${encodeURIComponent(session ?? "")}`
        }
      })
    );

    expect(response.status).toBe(401);
  });

  it("dry-runs demo dispatch candidates without Supabase or VAPID credentials", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    vi.stubEnv("VAPID_SUBJECT", "");
    vi.mocked(createSupabaseServiceClient).mockReturnValue(null);
    const { GET } = await import("@/app/api/jobs/alerts/route");

    const response = await GET(
      new Request("https://app.example/api/jobs/alerts?dryRun=1&demo=1", {
        headers: {
          authorization: "Bearer job-token"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.vapidConfigured).toBe(false);
    expect(body.plan.subscriptionSource).toBe("demo");
    expect(body.plan.notifications.length).toBeGreaterThan(0);
    expect(JSON.stringify(body.plan)).not.toContain("push.demo.invalid");
  });

  it("accepts the Vercel CRON_SECRET bearer token for scheduled alert jobs", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    vi.stubEnv("VAPID_SUBJECT", "");
    vi.mocked(createSupabaseServiceClient).mockReturnValue(null);
    const { GET } = await import("@/app/api/jobs/alerts/route");

    const response = await GET(
      new Request("https://app.example/api/jobs/alerts?dryRun=1&demo=1", {
        headers: {
          authorization: "Bearer cron-secret"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.protectedWriteSkipped).toBe(true);
    expect(body.plan.notifications.length).toBeGreaterThan(0);
  });

  it("uses OSHI_DEMO_MODE as the alert dry-run demo fallback when no query override is present", async () => {
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
    vi.mocked(createSupabaseServiceClient).mockReturnValue(null);
    const { GET } = await import("@/app/api/jobs/alerts/route");

    const response = await GET(
      new Request("https://app.example/api/jobs/alerts?dryRun=1", {
        headers: {
          authorization: "Bearer job-token"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ingestionMode).toBe("demo");
    expect(body.plan.subscriptionSource).toBe("demo");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes active provider cooldowns into alert dry-runs before adapters spend quota", async () => {
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
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      createAlertsSupabaseClient([
        {
          provider: "youtube",
          provider_code: "quotaExceeded",
          retry_after_at: "2099-06-19T12:30:00Z",
          raw_excerpt: "YouTube quota reset window."
        }
      ])
    );
    const { GET } = await import("@/app/api/jobs/alerts/route");

    const response = await GET(
      new Request("https://app.example/api/jobs/alerts?dryRun=1&demo=0", {
        headers: {
          authorization: "Bearer job-token"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.plan.streamCount).toBe(0);
    expect(body.plan.notifications).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

function createAlertsSupabaseClient(
  cooldownRows: Array<{
    provider: string;
    provider_code: string;
    retry_after_at: string;
    raw_excerpt: string;
  }>
) {
  return {
    from: vi.fn((table: string) => {
      if (table === "provider_errors") {
        return createProviderErrorsQuery(cooldownRows);
      }
      if (table === "push_subscriptions") {
        return createPushSubscriptionsQuery();
      }
      return createPushSubscriptionsQuery();
    })
  } as unknown as ReturnType<typeof createSupabaseServiceClient>;
}

function createProviderErrorsQuery(
  rows: Array<{
    provider: string;
    provider_code: string;
    retry_after_at: string;
    raw_excerpt: string;
  }>
) {
  const limit = vi.fn().mockResolvedValue({
    data: rows,
    error: null
  });
  const order = vi.fn(() => ({ limit }));
  const gt = vi.fn(() => ({ order }));
  const eq = vi.fn(() => ({ gt }));
  const select = vi.fn(() => ({ eq }));
  return { select };
}

function createPushSubscriptionsQuery() {
  const limit = vi.fn().mockResolvedValue({
    data: [],
    error: null
  });
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  return { select };
}
