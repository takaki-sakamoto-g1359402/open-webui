import { NextResponse } from "next/server";
import { z } from "zod";
import { streamCategories } from "@/lib/domain/types";
import {
  deactivatePushSubscriptionByEndpoint,
  storePushSubscription
} from "@/lib/push/subscriptions";
import { getVapidConfig } from "@/lib/push/vapid";
import {
  attachRateLimitHeaders,
  checkRequestRateLimit,
  createRateLimitExceededResponse
} from "@/lib/security/rate-limit";

const alertTypesSchema = z
  .object({
    upcoming: z.boolean().optional(),
    live: z.boolean().optional(),
    minecraft: z.boolean().optional(),
    collaboration: z.boolean().optional()
  })
  .strict();

const preferencesSchema = z
  .object({
    favoriteTalentIds: z.array(z.string().min(1).max(128)).max(200).optional(),
    favoriteCategories: z.array(z.enum(streamCategories)).max(20).optional(),
    favoriteLanguages: z.array(z.string().min(1).max(32)).max(50).optional(),
    timezone: z.string().min(1).max(128).optional(),
    locale: z.string().min(2).max(64).optional()
  })
  .strict();

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.record(z.string(), z.string()).optional(),
  alertTypes: alertTypesSchema.optional(),
  preferences: preferencesSchema.optional()
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url()
});

export async function POST(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "push-subscribe",
    limit: 20,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  const vapid = getVapidConfig();
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

  const body: unknown = await request.json();
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return attachRateLimitHeaders(
      NextResponse.json({ error: "invalid_subscription" }, { status: 400 }),
      rate
    );
  }

  try {
    const stored = await storePushSubscription(parsed.data, request);
    if (!stored.stored) {
      return attachRateLimitHeaders(NextResponse.json(
        {
          ok: false,
          degraded: true,
          reason: stored.reason
        },
        { status: 202 }
      ), rate);
    }

    return attachRateLimitHeaders(NextResponse.json({
      ok: true,
      stored: true
    }), rate);
  } catch (error) {
    return attachRateLimitHeaders(NextResponse.json(
      {
        ok: false,
        error: "push_subscription_store_failed",
        message: error instanceof Error ? error.message : "Could not store push subscription."
      },
      { status: 500 }
    ), rate);
  }
}

export async function DELETE(request: Request) {
  const rate = await checkRequestRateLimit(request, {
    scope: "push-unsubscribe",
    limit: 20,
    windowMs: 60_000
  });
  if (!rate.allowed) {
    return createRateLimitExceededResponse(rate);
  }

  const body: unknown = await request.json().catch(() => ({}));
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return attachRateLimitHeaders(
      NextResponse.json({ error: "invalid_subscription" }, { status: 400 }),
      rate
    );
  }

  try {
    const result = await deactivatePushSubscriptionByEndpoint(
      parsed.data.endpoint,
      "user_unsubscribe"
    );
    if (result.reason === "missing_supabase") {
      return attachRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            degraded: true,
            reason: result.reason
          },
          { status: 202 }
        ),
        rate
      );
    }

    return attachRateLimitHeaders(
      NextResponse.json({
        ok: true,
        deactivated: result.deactivated,
        reason: result.reason
      }),
      rate
    );
  } catch (error) {
    return attachRateLimitHeaders(
      NextResponse.json(
        {
          ok: false,
          error: "push_subscription_deactivate_failed",
          message: error instanceof Error ? error.message : "Could not deactivate push subscription."
        },
        { status: 500 }
      ),
      rate
    );
  }
}
