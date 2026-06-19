import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminAccountSessionCookieName,
  authorizeAdminRequest,
  createAdminAccountSessionValue,
  getAdminSessionCookieOptions
} from "@/lib/security/admin";
import {
  attachRateLimitHeaders,
  checkRequestRateLimit,
  createRateLimitExceededResponse
} from "@/lib/security/rate-limit";

const supabaseSessionSchema = z.object({
  accessToken: z.string().trim().min(24).max(8192)
});

export async function POST(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "admin-supabase-login",
    limit: 8,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  const body: unknown = await request.json().catch(() => undefined);
  const parsed = supabaseSessionSchema.safeParse(body);
  if (!parsed.success) {
    return attachRateLimitHeaders(
      NextResponse.json(
        { error: "invalid_supabase_session", issues: parsed.error.issues },
        { status: 400 }
      ),
      rate
    );
  }

  const authorization = await authorizeAdminRequest(
    new Request(request.url, {
      headers: {
        authorization: `Bearer ${parsed.data.accessToken}`
      }
    })
  );

  if (!authorization.authorized || authorization.source !== "supabase_auth") {
    return attachRateLimitHeaders(
      NextResponse.json({ error: "admin_required" }, { status: 401 }),
      rate
    );
  }

  const session = createAdminAccountSessionValue(authorization);
  if (!session) {
    return attachRateLimitHeaders(
      NextResponse.json({ error: "admin_session_unavailable" }, { status: 503 }),
      rate
    );
  }

  const response = NextResponse.json({
    ok: true,
    source: authorization.source,
    role: authorization.role,
    userId: authorization.userId
  });
  response.cookies.set(adminAccountSessionCookieName, session, getAdminSessionCookieOptions());
  return attachRateLimitHeaders(response, rate);
}

export async function DELETE(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "admin-supabase-logout",
    limit: 20,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminAccountSessionCookieName, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0
  });
  return attachRateLimitHeaders(response, rate);
}
