import { NextResponse } from "next/server";
import type { Provider } from "@/lib/domain/types";
import { isAdminJobRequest } from "@/lib/security/admin";
import {
  attachRateLimitHeaders,
  checkRequestRateLimit,
  createRateLimitExceededResponse
} from "@/lib/security/rate-limit";
import { getYoutubeDataRetentionDays, runSourceRetention } from "@/lib/supabase/source-retention";

export const runtime = "nodejs";

const retentionProviders = new Set<Provider>(["youtube"]);

export async function GET(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "job-retention",
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
  const provider = normalizeRetentionProvider(url.searchParams.get("provider"));
  if (!provider) {
    return attachRateLimitHeaders(
      NextResponse.json({ error: "unsupported_retention_provider" }, { status: 400 }),
      rate
    );
  }

  const retention = await runSourceRetention({
    dryRun,
    provider,
    retentionDays: getYoutubeDataRetentionDays()
  });

  return attachRateLimitHeaders(
    NextResponse.json(
      {
        ok: retention.persisted || retention.protectedWriteSkipped,
        dryRun,
        degraded: retention.reason === "missing_supabase",
        protectedWriteSkipped: retention.protectedWriteSkipped,
        retention
      },
      { status: !dryRun && retention.reason === "missing_supabase" ? 202 : 200 }
    ),
    rate
  );
}

function normalizeRetentionProvider(value: string | null): Provider | undefined {
  const provider = (value?.trim() || "youtube") as Provider;
  return retentionProviders.has(provider) ? provider : undefined;
}
