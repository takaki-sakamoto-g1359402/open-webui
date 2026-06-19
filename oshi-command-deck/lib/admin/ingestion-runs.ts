import { addMinutes, toUtcIso } from "@/lib/domain/time";
import type { Provider } from "@/lib/domain/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type IngestionRunStatus = "queued" | "running" | "success" | "failed" | "partial";

export type IngestionProviderErrorRecord = {
  id?: string;
  provider: Provider;
  httpStatus?: number;
  code: string;
  retryAfterUtc?: string;
  transient: boolean;
  rawExcerpt?: string;
  createdAtUtc: string;
};

export type IngestionRunHistoryItem = {
  id: string;
  adapter: Provider;
  status: IngestionRunStatus;
  startedAtUtc: string;
  finishedAtUtc?: string;
  requestCount: number;
  quotaCost: number;
  errorSummary?: string;
  errors: IngestionProviderErrorRecord[];
};

type ListIngestionRunOptions = {
  allowSupabase?: boolean;
  limit?: number;
};

type IngestionRunRow = {
  id: string;
  adapter: Provider;
  status: IngestionRunStatus;
  started_at: string;
  finished_at: string | null;
  request_count: number | null;
  quota_cost: number | null;
  error_summary: string | null;
};

type ProviderErrorRow = {
  id: string;
  run_id: string | null;
  provider: Provider;
  http_status: number | null;
  provider_code: string;
  retry_after_at: string | null;
  is_transient: boolean;
  raw_excerpt: string | null;
  created_at: string;
};

export async function listIngestionRunHistory(options: ListIngestionRunOptions = {}) {
  const supabase = options.allowSupabase === false ? null : createSupabaseServiceClient();
  if (!supabase) {
    return {
      source: "demo" as const,
      runs: getDemoIngestionRuns()
    };
  }

  const { data: runs, error: runsError } = await supabase
    .from("ingestion_runs")
    .select("id, adapter, status, started_at, finished_at, request_count, quota_cost, error_summary")
    .order("started_at", { ascending: false })
    .limit(options.limit ?? 12);

  if (runsError) {
    throw new Error(`ingestion_runs select failed: ${runsError.message}`);
  }

  const runRows = (runs ?? []) as IngestionRunRow[];
  const runIds = runRows.map((run) => run.id);
  const errorsByRunId = new Map<string, IngestionProviderErrorRecord[]>();

  if (runIds.length > 0) {
    const { data: errors, error: errorsError } = await supabase
      .from("provider_errors")
      .select("id, run_id, provider, http_status, provider_code, retry_after_at, is_transient, raw_excerpt, created_at")
      .in("run_id", runIds)
      .order("created_at", { ascending: false });

    if (errorsError) {
      throw new Error(`provider_errors select failed: ${errorsError.message}`);
    }

    for (const error of (errors ?? []) as ProviderErrorRow[]) {
      if (!error.run_id) {
        continue;
      }
      const existing = errorsByRunId.get(error.run_id) ?? [];
      existing.push(mapProviderErrorRow(error));
      errorsByRunId.set(error.run_id, existing);
    }
  }

  return {
    source: "supabase" as const,
    runs: runRows.map((run) => mapIngestionRunRow(run, errorsByRunId.get(run.id) ?? []))
  };
}

function mapIngestionRunRow(
  row: IngestionRunRow,
  errors: IngestionProviderErrorRecord[]
): IngestionRunHistoryItem {
  return {
    id: row.id,
    adapter: row.adapter,
    status: row.status,
    startedAtUtc: normalizeTimestamp(row.started_at),
    finishedAtUtc: row.finished_at ? normalizeTimestamp(row.finished_at) : undefined,
    requestCount: Number(row.request_count ?? 0),
    quotaCost: Number(row.quota_cost ?? 0),
    errorSummary: row.error_summary ?? undefined,
    errors
  };
}

function mapProviderErrorRow(row: ProviderErrorRow): IngestionProviderErrorRecord {
  return {
    id: row.id,
    provider: row.provider,
    httpStatus: row.http_status ?? undefined,
    code: row.provider_code,
    retryAfterUtc: row.retry_after_at ? normalizeTimestamp(row.retry_after_at) : undefined,
    transient: Boolean(row.is_transient),
    rawExcerpt: row.raw_excerpt ?? undefined,
    createdAtUtc: normalizeTimestamp(row.created_at)
  };
}

function getDemoIngestionRuns(): IngestionRunHistoryItem[] {
  const now = new Date();
  return [
    {
      id: "demo-run-youtube",
      adapter: "youtube",
      status: "success",
      startedAtUtc: toUtcIso(addMinutes(now, -8)),
      finishedAtUtc: toUtcIso(addMinutes(now, -7)),
      requestCount: 2,
      quotaCost: 101,
      errors: []
    },
    {
      id: "demo-run-x",
      adapter: "x",
      status: "failed",
      startedAtUtc: toUtcIso(addMinutes(now, -84)),
      finishedAtUtc: toUtcIso(addMinutes(now, -83)),
      requestCount: 0,
      quotaCost: 0,
      errorSummary: "missing_credentials",
      errors: [
        {
          id: "demo-error-x-missing-token",
          provider: "x",
          code: "missing_credentials",
          transient: false,
          rawExcerpt: "Official X API token is not configured. No scraping fallback is used.",
          createdAtUtc: toUtcIso(addMinutes(now, -83))
        }
      ]
    },
    {
      id: "demo-run-manual",
      adapter: "manual",
      status: "success",
      startedAtUtc: toUtcIso(addMinutes(now, -28)),
      finishedAtUtc: toUtcIso(addMinutes(now, -28)),
      requestCount: 0,
      quotaCost: 0,
      errors: []
    }
  ];
}

function normalizeTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
