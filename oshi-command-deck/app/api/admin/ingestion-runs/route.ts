import { NextResponse } from "next/server";
import { listIngestionRunHistory } from "@/lib/admin/ingestion-runs";
import { authorizeAdminRequest, isAdminProtectionEnabled } from "@/lib/security/admin";
import {
  attachRateLimitHeaders,
  checkRequestRateLimit,
  createRateLimitExceededResponse
} from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "admin-ingestion-runs-read",
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

  const history = await listIngestionRunHistory({ allowSupabase: authorization.authorized });
  return attachRateLimitHeaders(NextResponse.json(history), rate);
}
