import { NextResponse } from "next/server";
import {
  creatorChannelSchema,
  listCreatorChannels,
  upsertCreatorChannel
} from "@/lib/admin/creator-channels";
import { authorizeAdminRequest, isAdminProtectionEnabled } from "@/lib/security/admin";
import {
  attachRateLimitHeaders,
  checkRequestRateLimit,
  createRateLimitExceededResponse
} from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "admin-creator-channels-read",
    limit: 30,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  const authorization = await authorizeAdminRequest(request);
  if (isAdminProtectionEnabled() && !authorization.authorized) {
    return attachRateLimitHeaders(
      NextResponse.json({ error: "admin_required" }, { status: 401 }),
      rate
    );
  }

  const registry = await listCreatorChannels({ allowSupabase: authorization.authorized });
  return attachRateLimitHeaders(NextResponse.json(registry), rate);
}

export async function POST(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "admin-creator-channels-write",
    limit: 20,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  const authorization = await authorizeAdminRequest(request, { requireWrite: true });
  if (!authorization.authorized) {
    return attachRateLimitHeaders(
      NextResponse.json({ error: "admin_required" }, { status: 401 }),
      rate
    );
  }

  const body: unknown = await request.json().catch(() => undefined);
  const parsed = creatorChannelSchema.safeParse(body);
  if (!parsed.success) {
    return attachRateLimitHeaders(
      NextResponse.json(
        { error: "invalid_creator_channel", issues: parsed.error.issues },
        { status: 400 }
      ),
      rate
    );
  }

  const result = await upsertCreatorChannel(parsed.data, request, authorization);
  return attachRateLimitHeaders(
    NextResponse.json(result, { status: result.persisted ? 200 : 202 }),
    rate
  );
}
