import type { Provider } from "@/lib/domain/types";
import type { ProviderCooldown } from "@/lib/adapters/types";
import { createSupabaseServiceClient } from "./server";

export type ProviderErrorCooldownRow = {
  provider: Provider;
  provider_code: string;
  retry_after_at: string | null;
  raw_excerpt: string | null;
};

export async function listActiveProviderCooldowns(now = new Date()) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {};
  }

  const { data, error } = await supabase
    .from("provider_errors")
    .select("provider, provider_code, retry_after_at, raw_excerpt")
    .eq("is_transient", true)
    .gt("retry_after_at", now.toISOString())
    .order("retry_after_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`provider cooldown read failed: ${error.message}`);
  }

  return mapProviderCooldownRows((data ?? []) as ProviderErrorCooldownRow[]);
}

export function mapProviderCooldownRows(rows: ProviderErrorCooldownRow[]) {
  const cooldowns: Partial<Record<Provider, ProviderCooldown>> = {};

  for (const row of rows) {
    if (!row.retry_after_at || cooldowns[row.provider]) {
      continue;
    }

    cooldowns[row.provider] = {
      retryAfterUtc: new Date(row.retry_after_at).toISOString(),
      reason: row.raw_excerpt?.trim() || row.provider_code || "Provider requested backoff."
    };
  }

  return cooldowns;
}
