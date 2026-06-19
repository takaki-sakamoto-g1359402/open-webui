import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { AlertType, UserPreferences } from "@/lib/domain/types";

export type PushSubscriptionPreferences = Partial<
  Pick<
    UserPreferences,
    "favoriteTalentIds" | "favoriteCategories" | "favoriteLanguages" | "timezone" | "locale"
  >
>;

export type PushSubscriptionPayload = {
  endpoint: string;
  keys?: Record<string, string>;
  alertTypes?: Partial<Record<AlertType, boolean>>;
  preferences?: PushSubscriptionPreferences;
};

export type PushDeactivationReason =
  | "user_unsubscribe"
  | "push_404"
  | "push_410"
  | "push_expired"
  | "unknown";

export type StorePushSubscriptionResult = {
  stored: boolean;
  reason?: "missing_supabase";
};

export type DeactivatePushSubscriptionResult = {
  deactivated: boolean;
  reason?: "missing_supabase" | "not_found";
};

export async function storePushSubscription(
  subscription: PushSubscriptionPayload,
  request: Request
): Promise<StorePushSubscriptionResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { stored: false, reason: "missing_supabase" };
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      keys_jsonb: subscription.keys ?? {},
      alert_types_jsonb: subscription.alertTypes ?? {},
      preferences_jsonb: subscription.preferences ?? {},
      user_agent: request.headers.get("user-agent"),
      ip: ip || null,
      is_active: true,
      deactivated_at: null,
      deactivation_reason: null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    throw new Error(`push_subscriptions upsert failed: ${error.message}`);
  }

  return { stored: true };
}

export async function deactivatePushSubscriptionByEndpoint(
  endpoint: string,
  reason: PushDeactivationReason = "user_unsubscribe"
): Promise<DeactivatePushSubscriptionResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { deactivated: false, reason: "missing_supabase" };
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
    .eq("endpoint", endpoint)
    .eq("is_active", true)
    .select("id");

  if (error) {
    throw new Error(`push_subscriptions deactivate failed: ${error.message}`);
  }

  return (data ?? []).length > 0
    ? { deactivated: true }
    : { deactivated: false, reason: "not_found" };
}
