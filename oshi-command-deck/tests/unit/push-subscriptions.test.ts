import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/push/subscribe/route";
import {
  deactivatePushSubscriptionByEndpoint,
  storePushSubscription
} from "@/lib/push/subscriptions";
import { resetRateLimitBuckets } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn()
}));

const mockedCreateSupabaseServiceClient = vi.mocked(createSupabaseServiceClient);

describe("push subscriptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    resetRateLimitBuckets();
  });

  it("degrades explicitly when Supabase service credentials are absent", async () => {
    mockedCreateSupabaseServiceClient.mockReturnValue(null);

    await expect(
      storePushSubscription(
        {
          endpoint: "https://push.example/subscription",
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
        },
        new Request("https://app.example/api/push/subscribe")
      )
    ).resolves.toEqual({ stored: false, reason: "missing_supabase" });
  });

  it("reactivates a subscription and clears prior deactivation metadata on upsert", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockedCreateSupabaseServiceClient.mockReturnValue({
      from: vi.fn(() => ({ upsert }))
    } as unknown as ReturnType<typeof createSupabaseServiceClient>);

    await expect(
      storePushSubscription(
        {
          endpoint: "https://push.example/subscription",
          keys: {
            p256dh: "public-key",
            auth: "auth-secret"
          },
          alertTypes: {
            live: true
          }
        },
        new Request("https://app.example/api/push/subscribe")
      )
    ).resolves.toEqual({ stored: true });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "https://push.example/subscription",
        is_active: true,
        deactivated_at: null,
        deactivation_reason: null
      }),
      { onConflict: "endpoint" }
    );
  });

  it("soft-deactivates a subscription by endpoint with an explicit reason", async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: "sub-1" }], error: null });
    const activeEq = vi.fn(() => ({ select }));
    const endpointEq = vi.fn(() => ({ eq: activeEq }));
    const update = vi.fn(() => ({ eq: endpointEq }));
    mockedCreateSupabaseServiceClient.mockReturnValue({
      from: vi.fn(() => ({ update }))
    } as unknown as ReturnType<typeof createSupabaseServiceClient>);

    await expect(
      deactivatePushSubscriptionByEndpoint(
        "https://push.example/subscription",
        "user_unsubscribe"
      )
    ).resolves.toEqual({ deactivated: true });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: false,
        deactivated_at: expect.any(String),
        deactivation_reason: "user_unsubscribe",
        updated_at: expect.any(String)
      })
    );
    expect(endpointEq).toHaveBeenCalledWith("endpoint", "https://push.example/subscription");
    expect(activeEq).toHaveBeenCalledWith("is_active", true);
    expect(select).toHaveBeenCalledWith("id");
  });

  it("returns a degraded DELETE response when Supabase is absent", async () => {
    mockedCreateSupabaseServiceClient.mockReturnValue(null);

    const response = await DELETE(
      new Request("https://app.example/api/push/subscribe", {
        method: "DELETE",
        body: JSON.stringify({ endpoint: "https://push.example/subscription" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      ok: false,
      degraded: true,
      reason: "missing_supabase"
    });
  });

  it("rejects invalid unsubscribe payloads", async () => {
    const response = await DELETE(
      new Request("https://app.example/api/push/subscribe", {
        method: "DELETE",
        body: JSON.stringify({ endpoint: "not-a-url" })
      })
    );

    expect(response.status).toBe(400);
  });
});
