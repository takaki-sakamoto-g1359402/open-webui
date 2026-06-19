import { getDemoStreams } from "@/lib/domain/fixtures";
import { decideDedupe, normalizeTitle, type DedupeDecision } from "@/lib/domain/dedupe";
import type { Livestream, Provider, ProviderError, Provenance, SourceLink, StreamStatus } from "@/lib/domain/types";
import type { AdapterRunContext, AdapterRunResult, IngestionAdapter } from "./types";
import { toUtcIso } from "@/lib/domain/time";
import { manualAdapter } from "./manual";
import { xAdapter } from "./x";
import { youtubeAdapter } from "./youtube";

export const adapters: IngestionAdapter[] = [youtubeAdapter, xAdapter, manualAdapter];

export type IngestionSummary = {
  mode: "demo" | "live_api" | "mixed_degraded";
  results: AdapterRunResult[];
  canonicalStreams: Livestream[];
  dedupeDecisions: Array<{
    streamId: string;
    action: string;
    reason: string;
    eventId?: string;
  }>;
};

export async function runIngestion(context: AdapterRunContext): Promise<IngestionSummary> {
  const results = await Promise.all(
    adapters.map((adapter) => {
      const cooldown = context.providerCooldowns?.[adapter.provider];
      if (cooldown && new Date(cooldown.retryAfterUtc).getTime() > context.now.getTime()) {
        return createProviderCooldownResult(adapter.provider, context, cooldown);
      }
      return adapter.run(context);
    })
  );
  return canonicalizeAdapterResults(results, context);
}

export function createProviderCooldownResult(
  provider: Provider,
  context: Pick<AdapterRunContext, "now">,
  cooldown: NonNullable<AdapterRunContext["providerCooldowns"]>[Provider]
): AdapterRunResult {
  const retryAfterUtc = cooldown?.retryAfterUtc ?? toUtcIso(context.now);
  const message = cooldown?.reason ?? "Provider cooldown is active.";

  return {
    provider,
    streams: [],
    quotaCost: 0,
    requestCount: 0,
    health: {
      provider,
      state: "stale",
      coverageCode: "provider.cooldown",
      coverageParams: { retryAfterUtc },
      coverageLimit: `Skipped provider call until ${retryAfterUtc}. ${message}`,
      lastCheckedUtc: toUtcIso(context.now),
      confidence: 0.25,
      errorCode: "provider.cooldown",
      errorParams: { retryAfterUtc },
      error: "provider_cooldown"
    },
    errors: [
      {
        provider,
        code: "provider_cooldown",
        message,
        retryAfterUtc,
        transient: true
      }
    ]
  };
}

export function canonicalizeAdapterResults(
  results: AdapterRunResult[],
  context: Pick<AdapterRunContext, "now" | "demoMode">
): IngestionSummary {
  const canonicalStreams: Livestream[] = [];
  const decisions: IngestionSummary["dedupeDecisions"] = [];

  for (const stream of results.flatMap((result) => result.streams)) {
    const decision = decideDedupe(canonicalStreams, {
      provider: stream.sourceLinks[0]?.provider ?? "manual",
      providerItemId: stream.canonicalKey.split(":").at(1),
      url: stream.sourceLinks[0]?.url,
      urls: stream.sourceLinks.map((link) => link.url),
      talentId: stream.talentId,
      title: stream.titleOriginal,
      scheduledStartUtc: stream.scheduledStartUtc
    });

    decisions.push({
      streamId: stream.id,
      action: decision.action,
      reason: decision.reason,
      eventId: "eventId" in decision ? decision.eventId : undefined
    });

    if (decision.action === "new") {
      canonicalStreams.push(stream);
    } else {
      const targetIndex = canonicalStreams.findIndex((item) => item.id === decision.eventId);
      if (targetIndex >= 0) {
        canonicalStreams[targetIndex] = mergeDuplicateStream(
          canonicalStreams[targetIndex],
          stream,
          decision
        );
      }
    }
  }

  if (canonicalStreams.length === 0 && context.demoMode) {
    canonicalStreams.push(...getDemoStreams(context.now));
  }

  const hasLiveApiData = canonicalStreams.some((stream) => !stream.demo);
  const hasErrors = results.some((result) => result.errors.length > 0);
  const hasDemoData = canonicalStreams.some((stream) => stream.demo);

  return {
    mode:
      context.demoMode
        ? "demo"
        : !hasLiveApiData
          ? "mixed_degraded"
        : hasErrors || hasDemoData
          ? "mixed_degraded"
          : "live_api",
    results,
    canonicalStreams,
    dedupeDecisions: decisions
  };
}

export function mergeDuplicateStream(
  existing: Livestream,
  incoming: Livestream,
  decision: Exclude<DedupeDecision, { action: "new" }>
): Livestream {
  const conflictIds = detectConflictIds(existing, incoming, decision);
  const mergedStatus = chooseMergedStatus(existing, incoming);
  const incomingIsContextSource = hasProvider(incoming, "x") || hasProvider(incoming, "manual");
  const incomingCanImproveContext =
    incomingIsContextSource &&
    incoming.category !== "other" &&
    (existing.category === "other" || existing.category === "game");

  return {
    ...existing,
    id: chooseMergedId(existing, incoming),
    canonicalKey: chooseMergedCanonicalKey(existing, incoming),
    titleOriginal: chooseMergedTitle(existing, incoming),
    category: incomingCanImproveContext ? incoming.category : existing.category,
    languages: unique([...existing.languages, ...incoming.languages]),
    status: mergedStatus,
    scheduledStartUtc: chooseOptionalIso(existing.scheduledStartUtc, incoming.scheduledStartUtc),
    actualStartUtc: chooseOptionalIso(existing.actualStartUtc, incoming.actualStartUtc),
    endedAtUtc: chooseOptionalIso(existing.endedAtUtc, incoming.endedAtUtc),
    collaborators: unique([...existing.collaborators, ...incoming.collaborators]).slice(0, 12),
    sourceLinks: uniqueBy([...existing.sourceLinks, ...incoming.sourceLinks], sourceLinkKey),
    confidence: Math.max(existing.confidence, incoming.confidence),
    lastCheckedUtc: maxIso(existing.lastCheckedUtc, incoming.lastCheckedUtc),
    staleAfterMinutes: Math.min(existing.staleAfterMinutes, incoming.staleAfterMinutes),
    visibility:
      existing.visibility === "public" || incoming.visibility === "unknown"
        ? existing.visibility
        : incoming.visibility,
    demo: existing.demo && incoming.demo,
    provenance: uniqueBy([...existing.provenance, ...incoming.provenance], provenanceKey),
    providerErrors: uniqueBy([...existing.providerErrors, ...incoming.providerErrors], providerErrorKey),
    conflictIds: unique([...existing.conflictIds, ...incoming.conflictIds, ...conflictIds])
  };
}

function chooseMergedTitle(existing: Livestream, incoming: Livestream) {
  if (hasProvider(existing, "youtube")) {
    return existing.titleOriginal;
  }
  if (hasProvider(incoming, "youtube")) {
    return incoming.titleOriginal;
  }
  return isIncomingNewer(existing, incoming) ? incoming.titleOriginal : existing.titleOriginal;
}

function chooseMergedId(existing: Livestream, incoming: Livestream) {
  return hasProvider(incoming, "youtube") && !hasProvider(existing, "youtube")
    ? incoming.id
    : existing.id;
}

function chooseMergedCanonicalKey(existing: Livestream, incoming: Livestream) {
  return hasProvider(incoming, "youtube") && !hasProvider(existing, "youtube")
    ? incoming.canonicalKey
    : existing.canonicalKey;
}

function chooseMergedStatus(existing: Livestream, incoming: Livestream): StreamStatus {
  if (hasProvider(existing, "youtube") && ["live", "ended"].includes(existing.status)) {
    return existing.status;
  }
  if (hasProvider(incoming, "youtube") && ["live", "ended"].includes(incoming.status)) {
    return incoming.status;
  }
  if (
    hasProvider(incoming, "x") &&
    (incoming.status === "tbd" || hasProvenanceField(incoming, "cancellation"))
  ) {
    return incoming.status;
  }
  if (hasProvider(existing, "youtube") && hasProvider(incoming, "x")) {
    return existing.status;
  }
  if (existing.status === "tbd" && incoming.status !== "unverified") {
    return incoming.status;
  }
  return isIncomingNewer(existing, incoming) ? incoming.status : existing.status;
}

function detectConflictIds(
  existing: Livestream,
  incoming: Livestream,
  decision: Exclude<DedupeDecision, { action: "new" }>
) {
  const conflicts: string[] = [];
  if (decision.action === "similar") {
    conflicts.push(incoming.id);
  }
  if (
    normalizeTitle(existing.titleOriginal) !== normalizeTitle(incoming.titleOriginal) ||
    existing.category !== incoming.category ||
    existing.status !== incoming.status ||
    hasMeaningfulTimeConflict(existing.scheduledStartUtc, incoming.scheduledStartUtc)
  ) {
    conflicts.push(incoming.id);
  }
  return conflicts;
}

function hasMeaningfulTimeConflict(left?: string, right?: string) {
  if (!left || !right) {
    return false;
  }
  return Math.abs(new Date(left).getTime() - new Date(right).getTime()) > 5 * 60_000;
}

function chooseOptionalIso(existing?: string, incoming?: string) {
  if (!existing) {
    return incoming;
  }
  return existing;
}

function maxIso(left: string, right: string) {
  return new Date(right).getTime() > new Date(left).getTime() ? right : left;
}

function isIncomingNewer(existing: Livestream, incoming: Livestream) {
  return new Date(incoming.lastCheckedUtc).getTime() > new Date(existing.lastCheckedUtc).getTime();
}

function hasProvider(stream: Livestream, provider: Provider) {
  return stream.sourceLinks.some((link) => link.provider === provider);
}

function hasProvenanceField(stream: Livestream, field: Provenance["fields"][number]) {
  return stream.provenance.some((item) => item.fields.includes(field));
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

function sourceLinkKey(link: SourceLink) {
  return `${link.provider}:${link.url}`;
}

function provenanceKey(item: Provenance) {
  return `${item.provider}:${item.sourceId}:${item.url ?? ""}:${item.fields.join(",")}`;
}

function providerErrorKey(error: ProviderError) {
  return `${error.provider}:${error.code}:${error.message}`;
}
