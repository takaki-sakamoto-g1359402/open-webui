import { createHash } from "node:crypto";
import * as webpush from "web-push";
import { buildAlertQueue, type AlertReasonCode } from "@/lib/domain/alerts";
import { getDefaultPreferences, normalizePreferences } from "@/lib/domain/preferences";
import { streamCategories, type AlertType, type Livestream, type UserPreferences } from "@/lib/domain/types";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { VapidConfig } from "./vapid";
import type { PushDeactivationReason } from "./subscriptions";

const alertTypeKeys: AlertType[] = ["upcoming", "live", "minecraft", "collaboration"];
const dispatchReasonCodes = new Set<AlertReasonCode>([
  "upcoming",
  "live",
  "minecraft",
  "collaboration"
]);

export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  endpointHash: string;
  keys: {
    p256dh?: string;
    auth?: string;
  };
  alertTypes: Partial<Record<AlertType, boolean>>;
  preferences: Partial<
    Pick<
      UserPreferences,
      "favoriteTalentIds" | "favoriteCategories" | "favoriteLanguages" | "timezone" | "locale"
    >
  >;
  updatedAtUtc?: string;
};

export type PushSubscriptionListResult =
  | {
      source: "supabase" | "demo";
      subscriptions: StoredPushSubscription[];
    }
  | {
      source: "degraded";
      reason: "missing_supabase";
      subscriptions: [];
    };

export type PushDispatchNotification = {
  subscriptionId: string;
  endpointHash: string;
  streamId: string;
  canonicalKey: string;
  notificationKey: string;
  title: string;
  body: string;
  url: string;
  sourceUrl?: string;
  dueAtUtc: string;
  priority: number;
  reasons: Array<{
    code: AlertReasonCode;
    evidence: string;
  }>;
};

export type PushDispatchPlan = {
  generatedAtUtc: string;
  pushConfigured: boolean;
  subscriptionSource: PushSubscriptionListResult["source"];
  subscriptionCount: number;
  streamCount: number;
  notifications: PushDispatchNotification[];
};

export type PushSendResult = {
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  deactivated: number;
  errors: Array<{
    subscriptionId: string;
    endpointHash: string;
    code: string;
    message: string;
  }>;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  keys_jsonb: unknown;
  alert_types_jsonb: unknown;
  preferences_jsonb?: unknown;
  updated_at?: string | null;
};

export async function listActivePushSubscriptions(
  options: { allowDemoFallback?: boolean } = {}
): Promise<PushSubscriptionListResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    if (options.allowDemoFallback) {
      return {
        source: "demo",
        subscriptions: [createDemoPushSubscription()]
      };
    }
    return { source: "degraded", reason: "missing_supabase", subscriptions: [] };
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, keys_jsonb, alert_types_jsonb, preferences_jsonb, updated_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(`push_subscriptions select failed: ${error.message}`);
  }

  return {
    source: "supabase",
    subscriptions: ((data ?? []) as PushSubscriptionRow[])
      .map(normalizeStoredSubscription)
      .filter((item): item is StoredPushSubscription => Boolean(item))
  };
}

export function buildPushDispatchPlan({
  streams,
  subscriptions,
  now,
  pushConfigured,
  subscriptionSource
}: {
  streams: Livestream[];
  subscriptions: StoredPushSubscription[];
  now: Date;
  pushConfigured: boolean;
  subscriptionSource: PushSubscriptionListResult["source"];
}): PushDispatchPlan {
  const notifications = subscriptions.flatMap((subscription) => {
    const preferences = getPreferencesForSubscription(subscription);
    const locale = resolveLocale(preferences.locale);
    const t = createTranslator(locale);
    const queue = buildAlertQueue(streams, preferences, now, { pushConfigured });

    return queue
      .filter((item) => item.deliveryState === "push_ready")
      .map((item): PushDispatchNotification => {
        const dispatchReasons = item.reasons
          .filter((reason) => dispatchReasonCodes.has(reason.code))
          .map((reason) => reason.code)
          .sort();
        const notificationKey = [
          item.stream.canonicalKey,
          dispatchReasons.join("+") || "favorite_match"
        ].join(":");
        const sourceLink = item.stream.sourceLinks.find((link) => /^https?:\/\//u.test(link.url));

        return {
          subscriptionId: subscription.id,
          endpointHash: subscription.endpointHash,
          streamId: item.stream.id,
          canonicalKey: item.stream.canonicalKey,
          notificationKey,
          title: t("app.name"),
          body: item.stream.titleOriginal,
          url: "/route",
          sourceUrl: sourceLink?.url,
          dueAtUtc: item.dueAtUtc,
          priority: item.priority,
          reasons: item.reasons
        };
      });
  });

  return {
    generatedAtUtc: now.toISOString(),
    pushConfigured,
    subscriptionSource,
    subscriptionCount: subscriptions.length,
    streamCount: streams.length,
    notifications: notifications.sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }
      return new Date(left.dueAtUtc).getTime() - new Date(right.dueAtUtc).getTime();
    })
  };
}

export async function listSentPushNotificationKeys(subscriptionIds: string[]) {
  if (subscriptionIds.length === 0) {
    return new Set<string>();
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from("push_delivery_receipts")
    .select("subscription_id, notification_key")
    .in("subscription_id", subscriptionIds)
    .eq("status", "sent")
    .limit(5000);

  if (error) {
    throw new Error(`push_delivery_receipts select failed: ${error.message}`);
  }

  return new Set(
    ((data ?? []) as Array<{ subscription_id: string; notification_key: string }>).map(
      (row) => `${row.subscription_id}:${row.notification_key}`
    )
  );
}

export async function sendPushDispatchNotifications({
  notifications,
  subscriptions,
  vapid,
  sentKeys
}: {
  notifications: PushDispatchNotification[];
  subscriptions: StoredPushSubscription[];
  vapid: Extract<VapidConfig, { configured: true }>;
  sentKeys?: Set<string>;
}): Promise<PushSendResult> {
  const supabase = createSupabaseServiceClient();
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const deactivatedSubscriptionIds = new Set<string>();
  const countedDeactivationIds = new Set<string>();
  const result: PushSendResult = {
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    deactivated: 0,
    errors: []
  };

  for (const notification of notifications) {
    if (deactivatedSubscriptionIds.has(notification.subscriptionId)) {
      result.skipped += 1;
      continue;
    }

    const dedupeKey = `${notification.subscriptionId}:${notification.notificationKey}`;
    if (sentKeys?.has(dedupeKey)) {
      result.skipped += 1;
      continue;
    }

    const subscription = subscriptionMap.get(notification.subscriptionId);
    if (!subscription || !subscription.keys.p256dh || !subscription.keys.auth) {
      result.failed += 1;
      result.errors.push({
        subscriptionId: notification.subscriptionId,
        endpointHash: notification.endpointHash,
        code: "invalid_subscription",
        message: "Push subscription is missing endpoint keys."
      });
      await recordPushReceipt(supabase, notification, "failed", "invalid_subscription");
      continue;
    }

    const payload = createPushPayload(notification);
    result.attempted += 1;

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          }
        },
        JSON.stringify(payload),
        {
          vapidDetails: {
            subject: vapid.subject,
            publicKey: vapid.publicKey,
            privateKey: vapid.privateKey
          },
          TTL: 60 * 30
        }
      );
      result.sent += 1;
      await recordPushReceipt(supabase, notification, "sent");
    } catch (error) {
      const { code, message, shouldDeactivate, deactivationReason } = normalizePushSendError(error);
      result.failed += 1;
      result.errors.push({
        subscriptionId: notification.subscriptionId,
        endpointHash: notification.endpointHash,
        code,
        message
      });

      if (shouldDeactivate) {
        deactivatedSubscriptionIds.add(notification.subscriptionId);
        const deactivated = await deactivatePushSubscription(
          supabase,
          notification.subscriptionId,
          deactivationReason
        );
        if (deactivated && !countedDeactivationIds.has(notification.subscriptionId)) {
          countedDeactivationIds.add(notification.subscriptionId);
          result.deactivated += 1;
        }
      }

      await recordPushReceipt(supabase, notification, "failed", code, message);
    }
  }

  return result;
}

export function redactPushDispatchPlan(plan: PushDispatchPlan) {
  return {
    ...plan,
    notifications: plan.notifications.map((notification) => ({
      subscriptionId: notification.subscriptionId,
      endpointHash: notification.endpointHash,
      streamId: notification.streamId,
      canonicalKey: notification.canonicalKey,
      notificationKey: notification.notificationKey,
      title: notification.title,
      body: notification.body,
      url: notification.url,
      sourceUrl: notification.sourceUrl,
      dueAtUtc: notification.dueAtUtc,
      priority: notification.priority,
      reasons: notification.reasons
    }))
  };
}

function createDemoPushSubscription(): StoredPushSubscription {
  const preferences = getDefaultPreferences();
  return {
    id: "demo-push-subscription",
    endpoint: "https://push.demo.invalid/oshi-command-deck",
    endpointHash: hashEndpoint("https://push.demo.invalid/oshi-command-deck"),
    keys: {
      p256dh: "demo-public-key",
      auth: "demo-auth-secret"
    },
    alertTypes: preferences.alertTypes,
    preferences: {
      favoriteTalentIds: preferences.favoriteTalentIds,
      favoriteCategories: preferences.favoriteCategories,
      favoriteLanguages: preferences.favoriteLanguages,
      timezone: preferences.timezone,
      locale: preferences.locale
    },
    updatedAtUtc: new Date(0).toISOString()
  };
}

function normalizeStoredSubscription(row: PushSubscriptionRow): StoredPushSubscription | undefined {
  if (!row.endpoint) {
    return undefined;
  }

  const keys = parseStringRecord(row.keys_jsonb);
  return {
    id: row.id,
    endpoint: row.endpoint,
    endpointHash: hashEndpoint(row.endpoint),
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth
    },
    alertTypes: parseAlertTypes(row.alert_types_jsonb),
    preferences: parseSubscriptionPreferences(row.preferences_jsonb),
    updatedAtUtc: row.updated_at ?? undefined
  };
}

function getPreferencesForSubscription(subscription: StoredPushSubscription): UserPreferences {
  const base = getDefaultPreferences();

  return normalizePreferences({
    ...base,
    favoriteTalentIds: stringArray(subscription.preferences.favoriteTalentIds, base.favoriteTalentIds),
    favoriteCategories: stringArray(
      subscription.preferences.favoriteCategories,
      base.favoriteCategories
    ).filter((item): item is UserPreferences["favoriteCategories"][number] =>
      streamCategories.includes(item as UserPreferences["favoriteCategories"][number])
    ),
    favoriteLanguages: stringArray(subscription.preferences.favoriteLanguages, base.favoriteLanguages),
    timezone: subscription.preferences.timezone ?? base.timezone,
    locale: subscription.preferences.locale ?? base.locale,
    alertTypes: {
      ...base.alertTypes,
      ...subscription.alertTypes
    }
  });
}

function parseStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

function parseAlertTypes(value: unknown): Partial<Record<AlertType, boolean>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    alertTypeKeys
      .filter((key) => typeof record[key] === "boolean")
      .map((key) => [key, record[key] as boolean])
  ) as Partial<Record<AlertType, boolean>>;
}

function parseSubscriptionPreferences(
  value: unknown
): StoredPushSubscription["preferences"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  return {
    favoriteTalentIds: stringArray(record.favoriteTalentIds),
    favoriteCategories: stringArray(record.favoriteCategories).filter(
      (item): item is UserPreferences["favoriteCategories"][number] =>
        streamCategories.includes(item as UserPreferences["favoriteCategories"][number])
    ),
    favoriteLanguages: stringArray(record.favoriteLanguages),
    timezone: typeof record.timezone === "string" ? record.timezone : undefined,
    locale: typeof record.locale === "string" ? record.locale : undefined
  };
}

function stringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function hashEndpoint(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 16);
}

function createPushPayload(notification: PushDispatchNotification) {
  return {
    title: notification.title,
    body: notification.body,
    tag: notification.notificationKey,
    data: {
      url: notification.url,
      streamId: notification.streamId,
      canonicalKey: notification.canonicalKey,
      sourceUrl: notification.sourceUrl,
      reasons: notification.reasons.map((reason) => reason.code)
    }
  };
}

async function recordPushReceipt(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  notification: PushDispatchNotification,
  status: "sent" | "failed" | "skipped",
  errorCode?: string,
  errorMessage?: string
) {
  if (!supabase) {
    return;
  }

  const payloadHash = createHash("sha256")
    .update(JSON.stringify(createPushPayload(notification)))
    .digest("hex");

  const { error } = await supabase.from("push_delivery_receipts").upsert(
    {
      subscription_id: notification.subscriptionId,
      notification_key: notification.notificationKey,
      stream_id: notification.streamId,
      canonical_key: notification.canonicalKey,
      status,
      payload_hash: payloadHash,
      error_code: errorCode ?? null,
      error_message: errorMessage ?? null
    },
    { onConflict: "subscription_id,notification_key" }
  );

  if (error) {
    throw new Error(`push_delivery_receipts upsert failed: ${error.message}`);
  }
}

async function deactivatePushSubscription(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  subscriptionId: string,
  reason: PushDeactivationReason
) {
  if (!supabase) {
    return false;
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .update({
      is_active: false,
      deactivated_at: nowIso,
      deactivation_reason: reason,
      updated_at: nowIso
    })
    .eq("id", subscriptionId)
    .eq("is_active", true)
    .select("id");

  if (error) {
    throw new Error(`push_subscriptions deactivate failed: ${error.message}`);
  }

  return (data ?? []).length > 0;
}

function normalizePushSendError(error: unknown): {
  code: string;
  message: string;
  shouldDeactivate: boolean;
  deactivationReason: PushDeactivationReason;
} {
  const statusCode =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode)
      : undefined;
  const message = error instanceof Error ? error.message : "Push provider rejected the notification.";

  return {
    code: statusCode ? `push_${statusCode}` : "push_send_failed",
    message,
    shouldDeactivate: statusCode === 404 || statusCode === 410,
    deactivationReason:
      statusCode === 404 ? "push_404" : statusCode === 410 ? "push_410" : "unknown"
  };
}
