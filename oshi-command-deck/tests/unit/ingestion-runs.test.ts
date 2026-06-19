import { afterEach, describe, expect, it, vi } from "vitest";
import { listIngestionRunHistory } from "@/lib/admin/ingestion-runs";
import { GET as getIngestionRuns } from "@/app/api/admin/ingestion-runs/route";

describe("admin ingestion run history", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns realistic demo history when Supabase reads are disabled", async () => {
    const history = await listIngestionRunHistory({ allowSupabase: false });

    expect(history.source).toBe("demo");
    expect(history.runs.map((run) => run.adapter)).toEqual(
      expect.arrayContaining(["youtube", "x", "manual"])
    );
    expect(history.runs.find((run) => run.adapter === "x")?.errors[0]?.code).toBe(
      "missing_credentials"
    );
  });

  it("blocks history reads when admin protection is configured and no session is present", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");

    const response = await getIngestionRuns(
      new Request("https://app.example/api/admin/ingestion-runs")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "admin_required" });
  });

  it("allows local demo history reads when admin protection is not configured", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "");

    const response = await getIngestionRuns(
      new Request("https://app.example/api/admin/ingestion-runs")
    );
    const body = (await response.json()) as Awaited<ReturnType<typeof listIngestionRunHistory>>;

    expect(response.status).toBe(200);
    expect(body.source).toBe("demo");
    expect(body.runs.length).toBeGreaterThan(0);
  });
});
