import { afterEach, describe, expect, it, vi } from "vitest";
import * as webpush from "web-push";
import { getDemoStreams } from "@/lib/domain/fixtures";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  buildPushDispatchPlan,
  listActivePushSubscriptions,
  redactPushDispatchPlan,
  sendPushDispatchNotifications,
  type PushDispatchNotification,
  type StoredPushSubscription
} from "@/lib/push/dispatch";
import { getVapidConfig } from "@/lib/push/vapid";

vi.mock("web-push", () => ({
  sendNotification: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn(() => null)
}));

const mockedCreateSupabaseServiceClient = vi.mocked(createSupabaseServiceClient);

describe("push dispatch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    mockedCreateSupabaseServiceClient.mockReturnValue(null);
  });

  it("uses a labeled demo subscription fallback for dry-run planning without Supabase", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const subscriptions = await listActivePushSubscriptions({ allowDemoFallback: true });

    expect(subscriptions.source).toBe("demo");
    expect(subscriptions.subscriptions[0].endpointHash).toMatch(/^[a-f0-9]{16}$/u);
  });

  it("builds redacted, explainable dispatch candidates without exposing raw endpoints", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const now = new Date("2026-06-19T12:00:00Z");
    const subscriptions = await listActivePushSubscriptions({ allowDemoFallback: true });
    const plan = buildPushDispatchPlan({
      streams: getDemoStreams(now),
      subscriptions: subscriptions.subscriptions,
      now,
      pushConfigured: true,
      subscriptionSource: subscriptions.source
    });
    const redacted = redactPushDispatchPlan(plan);

    expect(redacted.notifications.length).toBeGreaterThan(0);
    expect(redacted.notifications[0].reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(["live", "favorite_talent"])
    );
    expect(JSON.stringify(redacted)).not.toContain("push.demo.invalid");
  });

  it("does not produce send candidates when push is not configured", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const now = new Date("2026-06-19T12:00:00Z");
    const subscriptions = await listActivePushSubscriptions({ allowDemoFallback: true });
    const plan = buildPushDispatchPlan({
      streams: getDemoStreams(now),
      subscriptions: subscriptions.subscriptions,
      now,
      pushConfigured: false,
      subscriptionSource: subscriptions.source
    });

    expect(plan.notifications).toHaveLength(0);
  });

  it("reports the exact missing VAPID part", () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
    vi.stubEnv("VAPID_SUBJECT", "");

    expect(getVapidConfig()).toEqual({ configured: false, reason: "missing_subject" });
  });

  it("stops sending to a subscription after a terminal push provider rejection", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const sendNotification = vi.mocked(webpush.sendNotification);
    sendNotification.mockRejectedValueOnce(Object.assign(new Error("Gone"), { statusCode: 410 }));
    const subscription: StoredPushSubscription = {
      id: "sub-1",
      endpoint: "https://push.example/subscription",
      endpointHash: "endpoint-hash",
      keys: {
        p256dh: "public-key",
        auth: "auth-secret"
      },
      alertTypes: {
        live: true
      },
      preferences: {
        favoriteTalentIds: ["kuzuha"],
        favoriteCategories: ["minecraft"],
        favoriteLanguages: ["ja"],
        timezone: "Asia/Tokyo",
        locale: "ja"
      }
    };
    const notifications: PushDispatchNotification[] = [
      notification("first"),
      notification("second")
    ];

    const result = await sendPushDispatchNotifications({
      notifications,
      subscriptions: [subscription],
      vapid: {
        configured: true,
        publicKey: "public-key",
        privateKey: "private-key",
        subject: "mailto:ops@example.com"
      }
    });

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      attempted: 1,
      failed: 1,
      skipped: 1,
      deactivated: 0
    });
    expect(result.errors[0]).toMatchObject({
      code: "push_410",
      endpointHash: "endpoint-hash"
    });
  });

  it("counts a single active Supabase deactivation after a terminal provider rejection", async () => {
    const sendNotification = vi.mocked(webpush.sendNotification);
    sendNotification.mockRejectedValueOnce(Object.assign(new Error("Gone"), { statusCode: 410 }));
    const select = vi.fn().mockResolvedValue({ data: [{ id: "sub-1" }], error: null });
    const activeEq = vi.fn(() => ({ select }));
    const idEq = vi.fn(() => ({ eq: activeEq }));
    const update = vi.fn(() => ({ eq: idEq }));
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === "push_subscriptions") {
        return { update };
      }
      return { upsert };
    });
    mockedCreateSupabaseServiceClient.mockReturnValue({
      from
    } as unknown as ReturnType<typeof createSupabaseServiceClient>);
    const subscription = storedSubscription();

    const result = await sendPushDispatchNotifications({
      notifications: [notification("first"), notification("second")],
      subscriptions: [subscription],
      vapid: {
        configured: true,
        publicKey: "public-key",
        privateKey: "private-key",
        subject: "mailto:ops@example.com"
      }
    });

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      attempted: 1,
      failed: 1,
      skipped: 1,
      deactivated: 1
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: false,
        deactivation_reason: "push_410"
      })
    );
    expect(idEq).toHaveBeenCalledWith("id", "sub-1");
    expect(activeEq).toHaveBeenCalledWith("is_active", true);
    expect(select).toHaveBeenCalledWith("id");
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("does not count a Supabase deactivation when no active row changed", async () => {
    const sendNotification = vi.mocked(webpush.sendNotification);
    sendNotification.mockRejectedValueOnce(Object.assign(new Error("Gone"), { statusCode: 410 }));
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const activeEq = vi.fn(() => ({ select }));
    const idEq = vi.fn(() => ({ eq: activeEq }));
    const update = vi.fn(() => ({ eq: idEq }));
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockedCreateSupabaseServiceClient.mockReturnValue({
      from: vi.fn((table: string) => (table === "push_subscriptions" ? { update } : { upsert }))
    } as unknown as ReturnType<typeof createSupabaseServiceClient>);

    const result = await sendPushDispatchNotifications({
      notifications: [notification("first"), notification("second")],
      subscriptions: [storedSubscription()],
      vapid: {
        configured: true,
        publicKey: "public-key",
        privateKey: "private-key",
        subject: "mailto:ops@example.com"
      }
    });

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      attempted: 1,
      failed: 1,
      skipped: 1,
      deactivated: 0
    });
  });
});

function notification(notificationKey: string): PushDispatchNotification {
  return {
    subscriptionId: "sub-1",
    endpointHash: "endpoint-hash",
    streamId: `stream-${notificationKey}`,
    canonicalKey: `youtube:${notificationKey}`,
    notificationKey,
    title: "Oshi Command Deck",
    body: "Test stream",
    url: "/route",
    dueAtUtc: "2026-06-19T12:00:00Z",
    priority: 90,
    reasons: [
      {
        code: "live",
        evidence: "2026-06-19T12:00:00Z"
      }
    ]
  };
}

function storedSubscription(): StoredPushSubscription {
  return {
    id: "sub-1",
    endpoint: "https://push.example/subscription",
    endpointHash: "endpoint-hash",
    keys: {
      p256dh: "public-key",
      auth: "auth-secret"
    },
    alertTypes: {
      live: true
    },
    preferences: {
      favoriteTalentIds: ["kuzuha"],
      favoriteCategories: ["minecraft"],
      favoriteLanguages: ["ja"],
      timezone: "Asia/Tokyo",
      locale: "ja"
    }
  };
}
