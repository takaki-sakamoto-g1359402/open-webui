import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminAccountSessionCookieName,
  adminSessionCookieName,
  createAdminAccountSessionValue,
  createAdminSessionValue,
  authorizeAdminRequest,
  isAdminAccountSessionValue,
  isAdminJobRequest,
  isAdminProtectionEnabled,
  isAdminRequest,
  isAdminSessionValue
} from "@/lib/security/admin";
import { resetRateLimitBuckets } from "@/lib/security/rate-limit";
import {
  GET as readAdminSessionStatus,
  POST as createAdminSession
} from "@/app/api/admin/session/route";

describe("admin security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimitBuckets();
  });

  it("stays disabled when ADMIN_JOB_TOKEN is absent", () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "");
    vi.stubEnv("NODE_ENV", "test");

    expect(isAdminProtectionEnabled()).toBe(false);
    expect(createAdminSessionValue()).toBeUndefined();
    expect(isAdminRequest(new Request("https://app.example/api/jobs/ingest"))).toBe(false);
  });

  it("reports an explicit demo-open admin status when token protection is absent", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "");
    vi.stubEnv("NODE_ENV", "test");

    const response = await readAdminSessionStatus(
      new Request("https://app.example/api/admin/session", {
        headers: {
          "x-real-ip": "203.0.113.71"
        }
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      protectionEnabled: false,
      authorized: false,
      source: "demo_open",
      role: null,
      writeCapable: false
    });
  });

  it("keeps production admin protected when ADMIN_JOB_TOKEN is absent outside explicit demo mode", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");

    expect(isAdminProtectionEnabled()).toBe(true);

    const response = await readAdminSessionStatus(
      new Request("https://app.example/api/admin/session", {
        headers: {
          "x-real-ip": "203.0.113.76"
        }
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      protectionEnabled: true,
      authorized: false,
      source: "none",
      role: null,
      writeCapable: false
    });
  });

  it("lets OSHI_DEMO_MODE keep production admin protected even when the public demo flag was built true", () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.stubEnv("OSHI_DEMO_MODE", "false");

    expect(isAdminProtectionEnabled()).toBe(true);
    expect(isAdminRequest(new Request("https://app.example/admin"))).toBe(false);
  });

  it("reports the bearer-token admin status without exposing the token", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");

    const response = await readAdminSessionStatus(
      new Request("https://app.example/api/admin/session", {
        headers: {
          authorization: "Bearer secret-token",
          "x-real-ip": "203.0.113.72"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(body).toMatchObject({
      ok: true,
      protectionEnabled: true,
      authorized: true,
      source: "admin_token",
      role: "owner",
      writeCapable: true,
      reason: null
    });
  });

  it("reports protected anonymous status without granular auth failure reasons", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");

    const response = await readAdminSessionStatus(
      new Request("https://app.example/api/admin/session", {
        headers: {
          "x-real-ip": "203.0.113.73"
        }
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      protectionEnabled: true,
      authorized: false,
      source: "none",
      role: null,
      writeCapable: false,
      reason: null
    });
  });

  it("reports signed admin sessions without exposing the cookie value", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");
    const session = createAdminSessionValue() ?? "";

    expect(session).not.toBe("");

    const response = await readAdminSessionStatus(
      new Request("https://app.example/api/admin/session", {
        headers: {
          cookie: `${adminSessionCookieName}=${encodeURIComponent(session)}`,
          "x-real-ip": "203.0.113.74"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain(session);
    expect(body).toMatchObject({
      ok: true,
      protectionEnabled: true,
      authorized: true,
      source: "admin_session",
      role: "owner",
      writeCapable: true,
      reason: null
    });
  });

  it("sanitizes unauthorized bearer status failures", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");

    const response = await readAdminSessionStatus(
      new Request("https://app.example/api/admin/session", {
        headers: {
          authorization: "Bearer invalid-supabase-token",
          "x-real-ip": "203.0.113.75"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toMatch(
      /invalid_supabase_jwt|admin_membership_required|supabase_service_unavailable/
    );
    expect(body).toMatchObject({
      ok: true,
      protectionEnabled: true,
      authorized: false,
      source: "none",
      role: null,
      writeCapable: false,
      reason: null
    });
  });

  it("accepts bearer tokens and signed session cookies when configured", () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");
    const session = createAdminSessionValue();

    expect(isAdminProtectionEnabled()).toBe(true);
    expect(isAdminSessionValue(session)).toBe(true);
    expect(
      isAdminRequest(
        new Request("https://app.example/api/jobs/ingest", {
          headers: {
            authorization: "Bearer secret-token"
          }
        })
      )
    ).toBe(true);
    expect(
      isAdminRequest(
        new Request("https://app.example/api/jobs/ingest", {
          headers: {
            cookie: `${adminSessionCookieName}=${encodeURIComponent(session ?? "")}`
          }
        })
      )
    ).toBe(true);
  });

  it("keeps job authorization scoped to the explicit admin bearer token", () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");
    const session = createAdminSessionValue();

    expect(
      isAdminJobRequest(
        new Request("https://app.example/api/jobs/ingest", {
          headers: {
            authorization: "Bearer secret-token"
          }
        })
      )
    ).toBe(true);
    expect(
      isAdminJobRequest(
        new Request("https://app.example/api/jobs/ingest", {
          headers: {
            cookie: `${adminSessionCookieName}=${encodeURIComponent(session ?? "")}`
          }
        })
      )
    ).toBe(false);
  });

  it("expires and rejects tampered admin token sessions server-side", () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");
    const now = Date.UTC(2026, 5, 19, 0, 0, 0);
    const session = createAdminSessionValue(now);

    expect(isAdminSessionValue(session, now + 12 * 60 * 60 * 1000 - 1)).toBe(true);
    expect(isAdminSessionValue(session, now + 12 * 60 * 60 * 1000 + 1)).toBe(false);
    expect(isAdminSessionValue(`${session}tampered`, now)).toBe(false);
  });

  it("accepts signed Supabase admin account session cookies", () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");
    const session = createAdminAccountSessionValue({
      authorized: true,
      source: "supabase_auth",
      role: "admin",
      userId: "00000000-0000-4000-8000-000000000321"
    });

    expect(isAdminAccountSessionValue(session)).toBe(true);
    expect(
      isAdminRequest(
        new Request("https://app.example/admin", {
          headers: {
            cookie: `${adminAccountSessionCookieName}=${encodeURIComponent(session ?? "")}`
          }
        })
      )
    ).toBe(true);
  });

  it("prefers explicit bearer job tokens over ambient account cookies", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");
    const session = createAdminAccountSessionValue({
      authorized: true,
      source: "supabase_auth",
      role: "reviewer",
      userId: "00000000-0000-4000-8000-000000000654"
    });
    const request = new Request("https://app.example/api/admin/corrections", {
      headers: {
        authorization: "Bearer secret-token",
        cookie: `${adminAccountSessionCookieName}=${encodeURIComponent(session ?? "")}`
      }
    });

    await expect(authorizeAdminRequest(request, { requireWrite: true })).resolves.toMatchObject({
      authorized: true,
      source: "admin_token",
      role: "owner"
    });
  });

  it("ignores malformed cookie values instead of throwing", () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");

    expect(() =>
      isAdminRequest(
        new Request("https://app.example/admin", {
          headers: {
            cookie: `${adminSessionCookieName}=%E0%A4%A`
          }
        })
      )
    ).not.toThrow();
  });

  it("rate limits repeated admin login attempts with Retry-After guidance", async () => {
    vi.stubEnv("ADMIN_JOB_TOKEN", "secret-token");

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await createAdminSession(
        new Request("https://app.example/api/admin/session", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-real-ip": "203.0.113.77"
          },
          body: JSON.stringify({ token: "wrong-token" })
        })
      );
      expect(response.status).toBe(401);
      expect(response.headers.get("RateLimit-Policy")).toContain("\"admin-login\"");
    }

    const throttled = await createAdminSession(
      new Request("https://app.example/api/admin/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": "203.0.113.77"
        },
        body: JSON.stringify({ token: "wrong-token" })
      })
    );

    expect(throttled.status).toBe(429);
    expect(throttled.headers.get("Retry-After")).toBeTruthy();
    await expect(throttled.json()).resolves.toMatchObject({
      error: "rate_limited"
    });
  });
});
