import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/adapters";
import { isAdminJobRequest } from "@/lib/security/admin";
import { isServerDemoModeEnabled } from "@/lib/security/demo-mode";
import {
  attachRateLimitHeaders,
  checkRequestRateLimit,
  createRateLimitExceededResponse
} from "@/lib/security/rate-limit";
import { persistIngestionSummary } from "@/lib/supabase/persist-ingestion";
import { listActiveProviderCooldowns } from "@/lib/supabase/provider-cooldowns";

export async function GET(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "job-ingest",
    limit: 20,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  if (!isAdminJobRequest(request)) {
    return attachRateLimitHeaders(
      NextResponse.json({ error: "admin_required" }, { status: 401 }),
      rate
    );
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const now = new Date();
  const providerCooldowns = await listActiveProviderCooldowns(now).catch(() => ({}));
  const summary = await runIngestion({
    now,
    dryRun,
    demoMode: isServerDemoModeEnabled(),
    providerCooldowns
  });
  const persist = dryRun ? undefined : await persistIngestionSummary(summary);

  return attachRateLimitHeaders(NextResponse.json({
    ...summary,
    protectedWriteSkipped: dryRun,
    persist
  }), rate);
}
