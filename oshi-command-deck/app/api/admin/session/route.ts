import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeAdminRequest,
  adminAccountSessionCookieName,
  adminSessionCookieName,
  createAdminSessionValue,
  getAdminSessionCookieOptions,
  isAdminProtectionEnabled
} from "@/lib/security/admin";
import {
  attachRateLimitHeaders,
  checkRequestRateLimit,
  createRateLimitExceededResponse
} from "@/lib/security/rate-limit";

const loginSchema = z.object({
  token: z.string().min(1)
});

export async function GET(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "admin-session-status",
    limit: 30,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  const protectionEnabled = isAdminProtectionEnabled();
  const authorization = protectionEnabled
    ? await authorizeAdminRequest(request)
    : {
        authorized: false,
        source: "demo_open" as const,
        role: undefined
      };

  return attachRateLimitHeaders(NextResponse.json({
    ok: true,
    protectionEnabled,
    authorized: authorization.authorized,
    source: authorization.source,
    role: authorization.role ?? null,
    writeCapable: authorization.role === "owner" || authorization.role === "admin",
    reason: null
  }), rate);
}

export async function POST(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "admin-login",
    limit: 8,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  if (!isAdminProtectionEnabled()) {
    return attachRateLimitHeaders(NextResponse.json({
      ok: false,
      disabled: true,
      reason: "admin_token_not_configured"
    }), rate);
  }

  const body: unknown = await request.json().catch(() => undefined);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success || parsed.data.token !== process.env.ADMIN_JOB_TOKEN) {
    return attachRateLimitHeaders(
      NextResponse.json({ error: "invalid_admin_token" }, { status: 401 }),
      rate
    );
  }

  const session = createAdminSessionValue();
  if (!session) {
    return attachRateLimitHeaders(
      NextResponse.json({ error: "admin_token_not_configured" }, { status: 503 }),
      rate
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminSessionCookieName, session, getAdminSessionCookieOptions());
  return attachRateLimitHeaders(response, rate);
}

export async function DELETE(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "admin-logout",
    limit: 20,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminSessionCookieName, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0
  });
  response.cookies.set(adminAccountSessionCookieName, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0
  });
  return attachRateLimitHeaders(response, rate);
}
