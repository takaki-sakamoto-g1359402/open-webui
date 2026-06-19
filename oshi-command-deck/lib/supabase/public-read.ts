import { toUtcIso } from "@/lib/domain/time";
import type {
  Livestream,
  Provider,
  ProviderError,
  SourceHealth,
  SourceLink,
  StreamStatus
} from "@/lib/domain/types";
import { createSupabasePublicClient } from "./server";

type PublicLiveEventRow = {
  id: string;
  creator_id: string | null;
  creator_slug?: string | null;
  creator_display_name?: string | null;
  canonical_key: string;
  title: string;
  category: Livestream["category"];
  branch: string;
  languages: string[];
  collaborators?: string[] | null;
  status: StreamStatus;
  scheduled_start_at: string | null;
  actual_start_at: string | null;
  ended_at: string | null;
  visibility: Livestream["visibility"];
  confidence: number;
  stale_after_minutes: number;
  conflict_ids?: string[] | null;
  provider_error_summary?: unknown;
  admin_corrected_fields?: string[] | null;
  admin_correction_note?: string | null;
  admin_corrected_at?: string | null;
  is_demo: boolean;
  updated_at: string;
};

type PublicEventLinkRow = {
  live_event_id: string;
  provider: Provider;
  url: string;
  label: string;
  embeddable: boolean;
};

export type PublicStreamsReadResult = {
  available: boolean;
  streams: Livestream[];
  sourceHealth: SourceHealth[];
};

export async function readPublicStreamsFromSupabase(now = new Date()): Promise<PublicStreamsReadResult> {
  const supabase = createSupabasePublicClient();
  if (!supabase) {
    return {
      available: false,
      streams: [],
      sourceHealth: [
        {
          provider: "future",
          state: "missing_credentials",
          coverageCode: "supabase.not_configured",
          coverageLimit: "Supabase public read model is not configured.",
          lastCheckedUtc: toUtcIso(now),
          confidence: 0.2
        }
      ]
    };
  }

  const { data: events, error: eventsError } = await supabase
    .from("public_live_events")
    .select("*")
    .order("scheduled_start_at", { ascending: true, nullsFirst: false })
    .limit(250);

  if (eventsError) {
    return degraded(now, eventsError.message);
  }

  const eventRows = ((events ?? []) as PublicLiveEventRow[]).filter((event) => event.id);
  if (eventRows.length === 0) {
    return {
      available: true,
      streams: [],
      sourceHealth: [
        {
          provider: "future",
          state: "stale",
          coverageCode: "supabase.empty",
          coverageLimit: "Supabase public read model is configured but has no live events.",
          lastCheckedUtc: toUtcIso(now),
          confidence: 0.45
        }
      ]
    };
  }

  const { data: links, error: linksError } = await supabase
    .from("public_event_links")
    .select("live_event_id, provider, url, label, embeddable")
    .in(
      "live_event_id",
      eventRows.map((event) => event.id)
    );

  if (linksError) {
    return degraded(now, linksError.message);
  }

  const linksByEventId = new Map<string, SourceLink[]>();
  for (const link of (links ?? []) as PublicEventLinkRow[]) {
    const current = linksByEventId.get(link.live_event_id) ?? [];
    current.push({
      provider: link.provider,
      url: link.url,
      label: link.label,
      embeddable: link.embeddable
    });
    linksByEventId.set(link.live_event_id, current);
  }

  return {
    available: true,
    streams: eventRows.map((event) => mapPublicEventRow(event, linksByEventId.get(event.id) ?? [])),
    sourceHealth: [
      {
        provider: "future",
        state: "healthy",
        coverageCode: "supabase.serving_public",
        coverageLimit: "Supabase public read model is serving canonical events and public source links.",
        lastCheckedUtc: toUtcIso(now),
        confidence: 0.82
      }
    ]
  };
}

export function mapPublicEventRow(event: PublicLiveEventRow, sourceLinks: SourceLink[]): Livestream {
  return {
    id: `supabase-${event.id}`,
    canonicalKey: event.canonical_key,
    talentId: event.creator_slug ?? event.creator_id ?? "unknown",
    titleOriginal: event.title,
    category: event.category,
    branch: event.branch,
    languages: event.languages ?? [],
    status: event.status,
    scheduledStartUtc: normalizeNullableIso(event.scheduled_start_at),
    actualStartUtc: normalizeNullableIso(event.actual_start_at),
    endedAtUtc: normalizeNullableIso(event.ended_at),
    collaborators: normalizeStringArray(event.collaborators),
    sourceLinks,
    confidence: Number(event.confidence),
    lastCheckedUtc: normalizeNullableIso(event.updated_at) ?? toUtcIso(new Date()),
    staleAfterMinutes: Number(event.stale_after_minutes),
    visibility: event.visibility,
    demo: Boolean(event.is_demo),
    provenance: sourceLinks.map((link) => ({
      provider: link.provider,
      sourceId: event.canonical_key,
      fetchedAtUtc: normalizeNullableIso(event.updated_at) ?? toUtcIso(new Date()),
      url: link.url,
      fields: ["title", "status", "scheduledStart", "category"],
      confidence: Number(event.confidence),
      rawExcerpt: "Supabase public read model"
    })),
    providerErrors: normalizeProviderErrors(event.provider_error_summary),
    conflictIds: normalizeStringArray(event.conflict_ids),
    adminCorrection: mapAdminCorrection(event)
  };
}

function mapAdminCorrection(event: PublicLiveEventRow): Livestream["adminCorrection"] {
  if (!event.admin_corrected_fields?.length) {
    return undefined;
  }

  return {
    field: event.admin_corrected_fields.join(", "),
    correctedAtUtc:
      normalizeNullableIso(event.admin_corrected_at) ??
      normalizeNullableIso(event.updated_at) ??
      toUtcIso(new Date()),
    reason: event.admin_correction_note ?? "Admin correction recorded"
  };
}

function degraded(now: Date, message: string): PublicStreamsReadResult {
  return {
    available: false,
    streams: [],
    sourceHealth: [
      {
        provider: "future",
        state: "degraded",
        coverageCode: "supabase.read_failed",
        coverageLimit:
          "Supabase public read failed; provider adapters were not called because STREAMS_READ_SOURCE=supabase.",
        lastCheckedUtc: toUtcIso(now),
        confidence: 0.35,
        errorCode: "supabase.public_read_failed",
        error: message
      }
    ]
  };
}

function normalizeNullableIso(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : toUtcIso(date);
}

function normalizeStringArray(value: string[] | null | undefined) {
  return Array.isArray(value)
    ? value
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 24)
    : [];
}

function normalizeProviderErrors(value: unknown): ProviderError[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Record<string, unknown>;
    const provider = normalizeProvider(record.provider);
    const code = normalizeText(record.code);
    const message = normalizeText(record.message);
    if (!provider || !code || !message) {
      return [];
    }

    return [
      {
        provider,
        code,
        message,
        retryAfterUtc: normalizeNullableIso(normalizeText(record.retryAfterUtc)),
        transient: record.transient === true
      }
    ];
  });
}

function normalizeProvider(value: unknown): Provider | undefined {
  return value === "youtube" || value === "x" || value === "manual" || value === "future"
    ? value
    : undefined;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
