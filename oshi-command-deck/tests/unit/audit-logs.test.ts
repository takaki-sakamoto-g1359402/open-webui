import { afterEach, describe, expect, it, vi } from "vitest";
import { listAuditLogs } from "@/lib/admin/audit-logs";
import { GET as getAuditLogs } from "@/app/api/admin/audit-logs/route";

describe("admin audit logs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns realistic demo audit rows when Supabase reads are disabled", async () => {
    const audit = await listAuditLogs({ allowSupabase: false });

    expect(audit.source).toBe("demo");
    expect(audit.logs.map((log) => log.action)).toEqual(
      expect.arrayContaining([
        "ingestion.persist",
        "creator_channels.upsert",
        "manual_corrections.apply"
      ])
    );
    expect(audit.logs[0].summary).toContain("eventCount");
  });

  it("blocks audit reads when admin protection is configured and no session is present", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");

    const response = await getAuditLogs(new Request("https://app.example/api/admin/audit-logs"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "admin_required" });
  });

  it("allows local demo audit reads when admin protection is not configured", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "");

    const response = await getAuditLogs(new Request("https://app.example/api/admin/audit-logs"));
    const body = (await response.json()) as Awaited<ReturnType<typeof listAuditLogs>>;

    expect(response.status).toBe(200);
    expect(body.source).toBe("demo");
    expect(body.logs.length).toBeGreaterThan(0);
  });
});
