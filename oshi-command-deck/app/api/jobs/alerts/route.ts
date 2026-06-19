import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/adapters";
import {
  buildPushDispatchPlan,
  listActivePushSubscriptions,
  listSentPushNotificationKeys,
  redactPushDispatchPlan,
  sendPushDispatchNotifications
} from "@/lib/push/dispatch";
import { getVapidConfig } from "@/lib/push/vapid";
import { isAdminJobRequest } from "@/lib/security/admin";
import { isServerDemoModeEnabled } from "@/lib/security/demo-mode";
import { listActiveProviderCooldowns } from "@/lib/supabase/provider-cooldowns";
import {
  attachRateLimitHeaders,
  checkRequestRateLimit,
  createRateLimitExceededResponse
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "job-alerts",
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
  const demoParam = url.searchParams.get("demo");
  const demoMode =
    demoParam === "1"
      ? true
      : demoParam === "0"
        ? false
        : isServerDemoModeEnabled(process.env, { defaultValue: true });
  const now = new Date();
  const vapid = getVapidConfig();
  const providerCooldowns = await listActiveProviderCooldowns(now).catch(() => ({}));

  if (!dryRun && !vapid.configured) {
    return attachRateLimitHeaders(NextResponse.json(
      {
        ok: false,
        degraded: true,
        reason: "vapid_not_configured",
        detail: vapid.reason
      },
      { status: 202 }
    ), rate);
  }

  const ingestion = await runIngestion({
    now,
    dryRun: true,
    demoMode,
    providerCooldowns
  });
  const subscriptions = await listActivePushSubscriptions({ allowDemoFallback: dryRun });

  if (subscriptions.source === "degraded") {
    return attachRateLimitHeaders(NextResponse.json(
      {
        ok: false,
        degraded: true,
        reason: subscriptions.reason,
        protectedWriteSkipped: true
      },
      { status: 202 }
    ), rate);
  }

  const plan = buildPushDispatchPlan({
    streams: ingestion.canonicalStreams,
    subscriptions: subscriptions.subscriptions,
    now,
    pushConfigured: vapid.configured || dryRun,
    subscriptionSource: subscriptions.source
  });
  const sentKeys = dryRun
    ? new Set<string>()
    : await listSentPushNotificationKeys(subscriptions.subscriptions.map((subscription) => subscription.id));
  const notifications = plan.notifications.filter(
    (notification) => !sentKeys.has(`${notification.subscriptionId}:${notification.notificationKey}`)
  );
  const dispatchPlan = {
    ...plan,
    notifications
  };

  if (dryRun) {
    return attachRateLimitHeaders(NextResponse.json({
      ok: true,
      dryRun: true,
      vapidConfigured: vapid.configured,
      protectedWriteSkipped: true,
      ingestionMode: ingestion.mode,
      alreadySentSkipped: plan.notifications.length - notifications.length,
      plan: redactPushDispatchPlan(dispatchPlan)
    }), rate);
  }

  if (!vapid.configured) {
    return attachRateLimitHeaders(NextResponse.json(
      {
        ok: false,
        degraded: true,
        reason: "vapid_not_configured",
        detail: vapid.reason
      },
      { status: 202 }
    ), rate);
  }

  const send = await sendPushDispatchNotifications({
    notifications,
    subscriptions: subscriptions.subscriptions,
    vapid,
    sentKeys
  });

  return attachRateLimitHeaders(NextResponse.json({
    ok: send.failed === 0,
    dryRun: false,
    vapidConfigured: true,
    protectedWriteSkipped: false,
    ingestionMode: ingestion.mode,
    alreadySentSkipped: plan.notifications.length - notifications.length,
    plan: redactPushDispatchPlan(dispatchPlan),
    send
  }), rate);
}
