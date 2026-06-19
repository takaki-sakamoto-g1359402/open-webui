import type { Provider } from "@/lib/domain/types";
import { createSupabaseServiceClient } from "./server";

export type SourceRetentionResult = {
  persisted: boolean;
  dryRun: boolean;
  reason?: "missing_supabase";
  provider: Provider;
  retentionDays: number;
  cutoffUtc: string;
  staleSourceCount: number;
  detachedEventSourceCount: number;
  deletedSourceCount: number;
  protectedWriteSkipped: boolean;
};

type SourceRetentionRpcRow = {
  stale_source_count?: number;
  detached_event_source_count?: number;
  deleted_source_count?: number;
};

const defaultYoutubeDataRetentionDays = 29;

export async function runSourceRetention({
  dryRun,
  provider = "youtube",
  now = new Date(),
  retentionDays = getYoutubeDataRetentionDays()
}: {
  dryRun: boolean;
  provider?: Provider;
  now?: Date;
  retentionDays?: number;
}): Promise<SourceRetentionResult> {
  const cutoffUtc = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {
      persisted: false,
      dryRun,
      reason: "missing_supabase",
      provider,
      retentionDays,
      cutoffUtc,
      staleSourceCount: 0,
      detachedEventSourceCount: 0,
      deletedSourceCount: 0,
      protectedWriteSkipped: true
    };
  }

  const { data, error } = await supabase.rpc("purge_stale_source_items", {
    p_provider: provider,
    p_cutoff: cutoffUtc,
    p_dry_run: dryRun
  });
  if (error) {
    throw new Error(`purge_stale_source_items RPC failed: ${error.message}`);
  }

  const result = normalizeRetentionRpcResult(data);
  return {
    persisted: !dryRun,
    dryRun,
    provider,
    retentionDays,
    cutoffUtc,
    staleSourceCount: result.stale_source_count ?? 0,
    detachedEventSourceCount: result.detached_event_source_count ?? 0,
    deletedSourceCount: result.deleted_source_count ?? 0,
    protectedWriteSkipped: dryRun
  };
}

export function getYoutubeDataRetentionDays() {
  const raw = process.env.YOUTUBE_API_DATA_RETENTION_DAYS?.trim();
  if (!raw) {
    return defaultYoutubeDataRetentionDays;
  }

  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : defaultYoutubeDataRetentionDays;
}

function normalizeRetentionRpcResult(data: unknown): SourceRetentionRpcRow {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return {};
  }
  return row as SourceRetentionRpcRow;
}
