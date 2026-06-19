import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/adapters";
import { authorizeAdminRequest } from "@/lib/security/admin";
import { isServerDemoModeEnabled } from "@/lib/security/demo-mode";
import {
  attachRateLimitHeaders,
  checkRequestRateLimit,
  createRateLimitExceededResponse
} from "@/lib/security/rate-limit";
import { persistIngestionSummary } from "@/lib/supabase/persist-ingestion";
import { listActiveProviderCooldowns } from "@/lib/supabase/provider-cooldowns";

export async function POST(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "ingestion-run",
    limit: 5,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  const url = new URL(request.url);
  const persistRequested = url.searchParams.get("persist") === "1";
  const authorization = await authorizeAdminRequest(request, { requireWrite: persistRequested });
  if (persistRequested && !authorization.authorized) {
    return attachRateLimitHeaders(
      NextResponse.json({ error: "admin_required" }, { status: 401 }),
      rate
    );
  }

  const persistAllowed = authorization.authorized && persistRequested;
  const demoMode = !authorization.authorized || isServerDemoModeEnabled();
  const now = new Date();
  const providerCooldowns = await listActiveProviderCooldowns(now).catch(() => ({}));
  const summary = await runIngestion({
    now,
    dryRun: !persistAllowed,
    demoMode,
    providerCooldowns
  });
  const persist = persistAllowed ? await persistIngestionSummary(summary) : undefined;

  return attachRateLimitHeaders(NextResponse.json({
    ...summary,
    protectedWriteSkipped: !persistAllowed,
    adminAuthorized: authorization.authorized,
    persist
  }), rate);
}
