import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn()
}));

import {
  adminAccountSessionCookieName,
  authorizeAdminRequest,
  canAdminRoleWrite,
  createAdminAccountSessionValue,
  getAdminActorLabel
} from "@/lib/security/admin";
import { resetRateLimitBuckets } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { POST as createSupabaseAdminSession } from "@/app/api/admin/supabase-session/route";

const mockedCreateSupabaseServiceClient = vi.mocked(createSupabaseServiceClient);

describe("Supabase admin authorization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    resetRateLimitBuckets();
  });

  it("accepts admin member JWTs for write endpoints", async () => {
    mockedCreateSupabaseServiceClient.mockReturnValue(
      createMockSupabaseAuthClient({
        userId: "00000000-0000-4000-8000-000000000001",
        role: "admin"
      }) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );

    const authorization = await authorizeAdminRequest(
      new Request("https://app.example/api/admin/corrections", {
        headers: {
          authorization: "Bearer supabase-access-token"
        }
      }),
      { requireWrite: true }
    );

    expect(authorization).toMatchObject({
      authorized: true,
      source: "supabase_auth",
      role: "admin",
      userId: "00000000-0000-4000-8000-000000000001"
    });
    expect(getAdminActorLabel(authorization)).toBe(
      "supabase:00000000-0000-4000-8000-000000000001"
    );
  });

  it("allows reviewers to read but not write", async () => {
    mockedCreateSupabaseServiceClient.mockReturnValue(
      createMockSupabaseAuthClient({
        userId: "00000000-0000-4000-8000-000000000002",
        role: "reviewer"
      }) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );

    const request = new Request("https://app.example/api/admin/audit-logs", {
      headers: {
        authorization: "Bearer reviewer-token"
      }
    });

    await expect(authorizeAdminRequest(request)).resolves.toMatchObject({
      authorized: true,
      role: "reviewer"
    });
    await expect(authorizeAdminRequest(request, { requireWrite: true })).resolves.toMatchObject({
      authorized: false,
      reason: "admin_write_role_required"
    });
    expect(canAdminRoleWrite("reviewer")).toBe(false);
  });

  it("rejects valid users that are not admin members", async () => {
    mockedCreateSupabaseServiceClient.mockReturnValue(
      createMockSupabaseAuthClient({
        userId: "00000000-0000-4000-8000-000000000003",
        role: null
      }) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );

    await expect(
      authorizeAdminRequest(
        new Request("https://app.example/api/admin/audit-logs", {
          headers: {
            authorization: "Bearer ordinary-user-token"
          }
        })
      )
    ).resolves.toMatchObject({
      authorized: false,
      reason: "admin_membership_required"
    });
  });

  it("keeps the static ADMIN_JOB_TOKEN path independent from Supabase", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");

    const authorization = await authorizeAdminRequest(
      new Request("https://app.example/api/jobs/ingest", {
        headers: {
          authorization: "Bearer job-token"
        }
      }),
      { requireWrite: true }
    );

    expect(authorization).toMatchObject({
      authorized: true,
      source: "admin_token",
      role: "owner"
    });
    expect(mockedCreateSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("revalidates account session cookies against current admin_members role", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "session-secret-" + "s".repeat(32));
    mockedCreateSupabaseServiceClient.mockReturnValue(
      createMockSupabaseAuthClient({
        userId: "00000000-0000-4000-8000-000000000005",
        role: "reviewer"
      }) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    const session = createAdminAccountSessionValue({
      authorized: true,
      source: "supabase_auth",
      role: "admin",
      userId: "00000000-0000-4000-8000-000000000005"
    });
    const request = new Request("https://app.example/api/admin/corrections", {
      headers: {
        cookie: `${adminAccountSessionCookieName}=${encodeURIComponent(session ?? "")}`
      }
    });

    await expect(authorizeAdminRequest(request)).resolves.toMatchObject({
      authorized: true,
      role: "reviewer"
    });
    await expect(authorizeAdminRequest(request, { requireWrite: true })).resolves.toMatchObject({
      authorized: false,
      reason: "admin_write_role_required"
    });
  });

  it("rejects account session cookies after admin membership removal", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "session-secret-" + "s".repeat(32));
    mockedCreateSupabaseServiceClient.mockReturnValue(
      createMockSupabaseAuthClient({
        userId: "00000000-0000-4000-8000-000000000006",
        role: null
      }) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );
    const session = createAdminAccountSessionValue({
      authorized: true,
      source: "supabase_auth",
      role: "admin",
      userId: "00000000-0000-4000-8000-000000000006"
    });

    await expect(
      authorizeAdminRequest(
        new Request("https://app.example/api/admin/audit-logs", {
          headers: {
            cookie: `${adminAccountSessionCookieName}=${encodeURIComponent(session ?? "")}`
          }
        })
      )
    ).resolves.toMatchObject({
      authorized: false,
      reason: "admin_membership_required"
    });
  });

  it("exchanges a verified Supabase admin token for an HTTP-only account session cookie", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "job-token");
    mockedCreateSupabaseServiceClient.mockReturnValue(
      createMockSupabaseAuthClient({
        userId: "00000000-0000-4000-8000-000000000004",
        role: "owner"
      }) as unknown as ReturnType<typeof createSupabaseServiceClient>
    );

    const response = await createSupabaseAdminSession(
      new Request("https://app.example/api/admin/supabase-session", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          accessToken: "supabase-access-token-with-enough-length"
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      source: "supabase_auth",
      role: "owner",
      userId: "00000000-0000-4000-8000-000000000004"
    });
    expect(response.headers.get("set-cookie")).toContain(adminAccountSessionCookieName);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
});

function createMockSupabaseAuthClient(options: {
  userId: string | null;
  role: "owner" | "admin" | "reviewer" | null;
}) {
  const maybeSingle = vi.fn(async () => ({
    data: options.role ? { role: options.role } : null,
    error: null
  }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const getUser = vi.fn(async () => ({
    data: {
      user: options.userId ? { id: options.userId } : null
    },
    error: null
  }));

  return {
    auth: {
      getUser
    },
    from
  };
}
