import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/adapters";
import { hasServerEnv } from "@/lib/adapters/types";
import {
  attachRateLimitHeaders,
  checkRequestRateLimit,
  createRateLimitExceededResponse
} from "@/lib/security/rate-limit";
import { isServerDemoModeEnabled } from "@/lib/security/demo-mode";
import { listActiveProviderCooldowns } from "@/lib/supabase/provider-cooldowns";
import { readPublicStreamsFromSupabase } from "@/lib/supabase/public-read";

export async function GET(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "streams",
    limit: 30,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  const forcedDemo = isServerDemoModeEnabled();
  const preferSupabase = process.env.STREAMS_READ_SOURCE === "supabase";
  if (!forcedDemo && preferSupabase) {
    const publicRead = await readPublicStreamsFromSupabase(new Date());
    return attachRateLimitHeaders(NextResponse.json({
      mode:
        publicRead.available && publicRead.streams.length > 0
          ? publicRead.streams.some((stream) => stream.demo)
            ? "mixed_degraded"
            : "live_api"
          : "mixed_degraded",
      streams: publicRead.streams,
      sourceHealth: publicRead.sourceHealth,
      protectedWriteSkipped: true,
      readSource: "supabase",
      degraded: !publicRead.available
    }), rate);
  }

  const hasLiveCredentials = hasServerEnv("YOUTUBE_DATA_API_KEY") || hasServerEnv("X_BEARER_TOKEN");
  const now = new Date();
  const providerCooldowns = await listActiveProviderCooldowns(now).catch(() => ({}));
  const summary = await runIngestion({
    now,
    dryRun: true,
    demoMode: forcedDemo || !hasLiveCredentials,
    providerCooldowns
  });

  return attachRateLimitHeaders(NextResponse.json({
    mode: summary.mode,
    streams: summary.canonicalStreams,
    sourceHealth: summary.results.map((result) => result.health),
    protectedWriteSkipped: true
  }), rate);
}
