import { NextResponse } from "next/server";
import { applyManualCorrection, correctionSchema } from "@/lib/admin/corrections";
import { authorizeAdminRequest } from "@/lib/security/admin";
import {
  attachRateLimitHeaders,
  checkRequestRateLimit,
  createRateLimitExceededResponse
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "admin-corrections-write",
    limit: 15,
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
  const parsed = correctionSchema.safeParse(body);
  if (!parsed.success) {
    return attachRateLimitHeaders(
      NextResponse.json(
        { error: "invalid_correction", issues: parsed.error.issues },
        { status: 400 }
      ),
      rate
    );
  }

  try {
    const result = await applyManualCorrection(parsed.data, request, authorization);
    if (!result.persisted && result.reason === "event_not_found") {
      return attachRateLimitHeaders(NextResponse.json(result, { status: 404 }), rate);
    }
    return attachRateLimitHeaders(
      NextResponse.json(result, { status: result.persisted ? 200 : 202 }),
      rate
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("invalid_")) {
      return attachRateLimitHeaders(
        NextResponse.json({ error: error.message }, { status: 400 }),
        rate
      );
    }
    throw error;
  }
}
