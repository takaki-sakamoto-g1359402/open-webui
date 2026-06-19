import { createHash } from "node:crypto";
import type { IngestionSummary } from "@/lib/adapters";
import type { Livestream, ProviderError, SourceLink } from "@/lib/domain/types";
import { createSupabaseServiceClient } from "./server";

export type PersistIngestionResult = {
  persisted: boolean;
  reason?: "missing_supabase" | "empty_summary";
  eventCount: number;
  sourceCount: number;
  eventSourceCount: number;
  publicLinkCount: number;
  runCount: number;
};

type LiveEventUpsertRow = {
  creator_id: string | null;
  canonical_key: string;
  title: string;
  category: Livestream["category"];
  branch: string;
  languages: string[];
  collaborators: string[];
  status: Livestream["status"];
  scheduled_start_at: string | null;
  actual_start_at: string | null;
  ended_at: string | null;
  visibility: Livestream["visibility"];
  confidence: number;
  stale_after_minutes: number;
  conflict_ids: string[];
  provider_error_summary: PublicProviderErrorSummary[];
  is_demo: boolean;
  updated_at: string;
};

type PublicProviderErrorSummary = Pick<
  ProviderError,
  "provider" | "code" | "message" | "retryAfterUtc" | "transient"
>;

type CreatorChannelLookupRow = {
  id: string;
  slug: string;
  confidence: number | null;
  is_active: boolean | null;
};

type SourceItemUpsertRow = {
  provider: SourceLink["provider"];
  source_type: string;
  provider_item_id: string;
  url: string | null;
  payload_jsonb: Record<string, unknown>;
  payload_hash: string;
  fetched_at: string;
  published_at: string | null;
};

type IngestionRunInsertRow = {
  adapter: SourceLink["provider"];
  status: "success" | "failed" | "partial";
  finished_at: string;
  request_count: number;
  quota_cost: number;
  error_summary: string | null;
};

type EventSourceInputRow = {
  live_event_canonical_key: string;
  provider: SourceLink["provider"];
  provider_item_id: string;
  confidence: number;
  field_map_jsonb: {
    fields: string[];
  };
};

type PublicEventLinkInputRow = {
  live_event_canonical_key: string;
  provider: SourceLink["provider"];
  url: string;
  label: string;
  embeddable: boolean;
};

type ProviderErrorInputRow = {
  run_adapter: SourceLink["provider"];
  provider: ProviderError["provider"];
  http_status: number | null;
  provider_code: string;
  retry_after_at: string | null;
  is_transient: boolean;
  raw_excerpt: string;
};

type ExistingLiveEventGuardRow = Partial<
  Pick<
    LiveEventUpsertRow,
    | "canonical_key"
    | "title"
    | "category"
    | "status"
    | "scheduled_start_at"
    | "actual_start_at"
    | "ended_at"
    | "visibility"
    | "confidence"
  >
> & {
  admin_corrected_fields?: string[] | null;
};

const correctionGuardColumns = [
  "title",
  "category",
  "status",
  "scheduled_start_at",
  "actual_start_at",
  "ended_at",
  "visibility",
  "confidence"
] as const;

type PersistIngestionRpcResultRow = {
  event_count?: number;
  source_count?: number;
  event_source_count?: number;
  public_link_count?: number;
  run_count?: number;
};

export async function persistIngestionSummary(
  summary: IngestionSummary
): Promise<PersistIngestionResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {
      persisted: false,
      reason: "missing_supabase",
      eventCount: 0,
      sourceCount: 0,
      eventSourceCount: 0,
      publicLinkCount: 0,
      runCount: 0
    };
  }

  const nowIso = new Date().toISOString();
  const creatorIdByTalentId = await resolveCreatorIdsByTalentId(summary.canonicalStreams);
  const eventRows: LiveEventUpsertRow[] = summary.canonicalStreams.map((stream) =>
    buildLiveEventUpsertRow(stream, creatorIdByTalentId.get(stream.talentId) ?? null, nowIso)
  );

  const sourceRows = uniqueBy(
    summary.canonicalStreams.flatMap((stream) =>
      stream.sourceLinks.map((link) => buildSourceRow(stream, link))
    ),
    (row) => `${row.provider}:${row.provider_item_id ?? ""}`
  );

  const runRows: IngestionRunInsertRow[] = summary.results.map((result) => ({
    adapter: result.provider,
    status:
      result.errors.length > 0
        ? result.streams.length > 0
          ? "partial"
          : "failed"
        : "success",
    finished_at: nowIso,
    request_count: result.requestCount,
    quota_cost: result.quotaCost,
    error_summary: result.errors.map((error) => error.code).join(", ") || null
  }));

  const eventCount = eventRows.length;
  const sourceCount = sourceRows.length;
  const runCount = runRows.length;
  const eventSourceRows = buildEventSourceRows(summary.canonicalStreams);
  const publicLinkRows = buildPublicLinkRows(summary.canonicalStreams);
  const providerErrorRows = buildProviderErrorRows(summary.results);

  if (eventCount === 0 && runCount === 0) {
    return {
      persisted: false,
      reason: "empty_summary",
      eventCount: 0,
      sourceCount: 0,
      eventSourceCount: 0,
      publicLinkCount: 0,
      runCount: 0
    };
  }

  const payload = {
    mode: summary.mode,
    events: eventRows,
    sources: sourceRows,
    eventSources: eventSourceRows,
    publicLinks: publicLinkRows,
    runs: runRows,
    providerErrors: providerErrorRows,
    reconcileEdges: true,
    audit: {
      mode: summary.mode,
      eventCount,
      sourceCount,
      eventSourceCount: eventSourceRows.length,
      publicLinkCount: publicLinkRows.length,
      runCount
    }
  };

  const { data, error } = await supabase.rpc("persist_ingestion_run", {
    p_payload: payload
  });
  if (error) {
    throw new Error(`persist_ingestion_run RPC failed: ${error.message}`);
  }
  const rpcResult = normalizeRpcResult(data);

  return {
    persisted: true,
    eventCount: rpcResult.event_count ?? eventCount,
    sourceCount: rpcResult.source_count ?? sourceCount,
    eventSourceCount: rpcResult.event_source_count ?? eventSourceRows.length,
    publicLinkCount: rpcResult.public_link_count ?? publicLinkRows.length,
    runCount: rpcResult.run_count ?? runCount
  };
}

export function applyCorrectionGuardsToEventRow(
  row: LiveEventUpsertRow,
  existing?: ExistingLiveEventGuardRow
): LiveEventUpsertRow {
  if (!existing?.admin_corrected_fields?.length) {
    return row;
  }

  const next = { ...row };
  for (const column of correctionGuardColumns) {
    if (existing.admin_corrected_fields.includes(column) && existing[column] !== undefined) {
      next[column] = existing[column] as never;
    }
  }
  return next;
}

export function buildLiveEventUpsertRow(
  stream: Livestream,
  creatorId: string | null,
  updatedAt: string
): LiveEventUpsertRow {
  return {
    creator_id: creatorId,
    canonical_key: stream.canonicalKey,
    title: stream.titleOriginal,
    category: stream.category,
    branch: stream.branch,
    languages: stream.languages,
    collaborators: stream.collaborators,
    status: stream.status,
    scheduled_start_at: stream.scheduledStartUtc ?? null,
    actual_start_at: stream.actualStartUtc ?? null,
    ended_at: stream.endedAtUtc ?? null,
    visibility: stream.visibility,
    confidence: stream.confidence,
    stale_after_minutes: stream.staleAfterMinutes,
    conflict_ids: stream.conflictIds,
    provider_error_summary: summarizeProviderErrors(stream.providerErrors),
    is_demo: stream.demo,
    updated_at: updatedAt
  };
}

async function resolveCreatorIdsByTalentId(streams: Livestream[]) {
  const supabase = createSupabaseServiceClient();
  const talentIds = unique(streams.map((stream) => stream.talentId).filter(Boolean));
  const result = new Map<string, string>();

  if (!supabase || talentIds.length === 0) {
    return result;
  }

  const { data, error } = await supabase
    .from("creator_channels")
    .select("id, slug, confidence, is_active")
    .in("slug", talentIds);
  if (error) {
    throw new Error(`creator_channels lookup failed: ${error.message}`);
  }

  const bestBySlug = new Map<string, CreatorChannelLookupRow>();
  for (const row of (data ?? []) as CreatorChannelLookupRow[]) {
    if (!row.slug || row.is_active === false) {
      continue;
    }
    const existing = bestBySlug.get(row.slug);
    if (!existing || Number(row.confidence ?? 0) > Number(existing.confidence ?? 0)) {
      bestBySlug.set(row.slug, row);
    }
  }

  for (const [slug, row] of bestBySlug.entries()) {
    result.set(slug, row.id);
  }
  return result;
}

function buildSourceRow(stream: Livestream, link: SourceLink): SourceItemUpsertRow {
  const providerItemId = getProviderItemIdForLink(stream, link);
  const payload = {
    canonicalKey: stream.canonicalKey,
    streamId: stream.id,
    title: stream.titleOriginal,
    status: stream.status,
    scheduledStartUtc: stream.scheduledStartUtc,
    actualStartUtc: stream.actualStartUtc,
    endedAtUtc: stream.endedAtUtc,
    sourceLink: link,
    provenance: stream.provenance.filter((item) => item.provider === link.provider),
    rawEvidence: stream.provenance
      .filter((item) => item.provider === link.provider)
      .map((item) => ({
        sourceId: item.sourceId,
        fetchedAtUtc: item.fetchedAtUtc,
        url: item.url,
        fields: item.fields,
        confidence: item.confidence,
        rawExcerpt: item.rawExcerpt
      }))
  };

  return {
    provider: link.provider,
    source_type: "livestream",
    provider_item_id: providerItemId,
    url: link.url.startsWith("manual://") ? null : link.url,
    payload_jsonb: payload,
    payload_hash: hashJson(payload),
    fetched_at: stream.lastCheckedUtc,
    published_at: stream.scheduledStartUtc ?? stream.actualStartUtc ?? null
  };
}

export function getProviderItemIdForLink(stream: Livestream, link: SourceLink) {
  const provider = link.provider;
  const directProvenance = stream.provenance.find(
    (item) => item.provider === provider && (item.url === link.url || link.url.includes(item.sourceId))
  );
  if (directProvenance?.sourceId) {
    return directProvenance.sourceId;
  }

  const prefix = `${provider}:`;
  const sameProviderLinkCount = stream.sourceLinks.filter((item) => item.provider === provider).length;
  if (stream.canonicalKey.startsWith(prefix) && sameProviderLinkCount <= 1) {
    return stream.canonicalKey.slice(prefix.length);
  }
  return `${stream.id}:${provider}:${hashString(link.url)}`;
}

function buildEventSourceRows(
  streams: Livestream[]
): EventSourceInputRow[] {
  return streams.flatMap((stream) => {
    return stream.sourceLinks.flatMap((link) => {
      const provenance = stream.provenance.find((item) => item.provider === link.provider);
      return [
        {
          live_event_canonical_key: stream.canonicalKey,
          provider: link.provider,
          provider_item_id: getProviderItemIdForLink(stream, link),
          confidence: provenance?.confidence ?? stream.confidence,
          field_map_jsonb: {
            fields: provenance?.fields ?? []
          }
        }
      ];
    });
  });
}

function buildPublicLinkRows(
  streams: Livestream[]
): PublicEventLinkInputRow[] {
  return streams.flatMap((stream) => {
    return stream.sourceLinks
      .filter((link) => !link.url.startsWith("manual://"))
      .map((link) => ({
        live_event_canonical_key: stream.canonicalKey,
        provider: link.provider,
        url: link.url,
        label: link.label,
        embeddable: link.embeddable
      }));
  });
}

function buildProviderErrorRows(results: IngestionSummary["results"]): ProviderErrorInputRow[] {
  return results.flatMap((result) =>
    result.errors.map((error) => ({
      run_adapter: result.provider,
      provider: error.provider,
      http_status: null,
      provider_code: error.code,
      retry_after_at: error.retryAfterUtc ?? null,
      is_transient: error.transient,
      raw_excerpt: error.message.slice(0, 500)
    }))
  );
}

function normalizeRpcResult(data: unknown): PersistIngestionRpcResultRow {
  if (Array.isArray(data)) {
    if (!data[0]) {
      throw new Error("persist_ingestion_run RPC returned no result row.");
    }
    return data[0] as PersistIngestionRpcResultRow;
  }
  if (!data) {
    throw new Error("persist_ingestion_run RPC returned no result row.");
  }
  return data as PersistIngestionRpcResultRow;
}

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hashString(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function summarizeProviderErrors(errors: ProviderError[]): PublicProviderErrorSummary[] {
  return errors.slice(0, 8).map((error) => ({
    provider: error.provider,
    code: error.code,
    message: error.message.slice(0, 280),
    retryAfterUtc: error.retryAfterUtc,
    transient: error.transient
  }));
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
