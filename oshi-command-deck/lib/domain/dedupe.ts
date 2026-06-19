import type { Livestream, Provider, SourceLink } from "./types";

export type SourceIdentity = {
  provider: Provider;
  providerItemId?: string;
  url?: string;
  urls?: string[];
  talentId: string;
  title: string;
  scheduledStartUtc?: string;
};

export type DedupeDecision =
  | { action: "same"; reason: "provider_id" | "url"; eventId: string }
  | { action: "similar"; reason: "talent_time_title"; eventId: string; confidence: number }
  | { action: "new"; reason: "no_match" };

export function normalizeTitle(title: string) {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/【[^】]*】/gu, " ")
    .replace(/\[[^\]]*\]/gu, " ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

export function getProviderIdFromLinks(links: SourceLink[]) {
  return links
    .map((link) => {
      if (link.provider === "youtube") {
        try {
          const url = new URL(link.url);
          return url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).at(-1);
        } catch {
          return undefined;
        }
      }
      return link.url.split("/").filter(Boolean).at(-1);
    })
    .filter(Boolean);
}

export function decideDedupe(existing: Livestream[], incoming: SourceIdentity): DedupeDecision {
  if (incoming.providerItemId) {
    const direct = existing.find((stream) =>
      getProviderIdFromLinks(stream.sourceLinks).includes(incoming.providerItemId)
    );
    if (direct) {
      return { action: "same", reason: "provider_id", eventId: direct.id };
    }
  }

  const incomingUrls = uniqueStrings([incoming.url, ...(incoming.urls ?? [])]);
  if (incomingUrls.length > 0) {
    const byUrl = existing.find((stream) =>
      stream.sourceLinks.some((link) => incomingUrls.includes(link.url))
    );
    if (byUrl) {
      return { action: "same", reason: "url", eventId: byUrl.id };
    }
  }

  const incomingTitle = normalizeTitle(incoming.title);
  const incomingTime = incoming.scheduledStartUtc
    ? new Date(incoming.scheduledStartUtc).getTime()
    : undefined;

  if (!incomingTime) {
    return { action: "new", reason: "no_match" };
  }

  const candidate = existing
    .filter((stream) => stream.talentId === incoming.talentId)
    .map((stream) => {
      const streamTime = stream.scheduledStartUtc
        ? new Date(stream.scheduledStartUtc).getTime()
        : undefined;
      if (!streamTime) {
        return undefined;
      }
      const timeConfidence = Math.max(
        0,
        1 - Math.abs(streamTime - incomingTime) / (90 * 60_000)
      );
      const titleConfidence = jaccard(normalizeTitle(stream.titleOriginal), incomingTitle);
      return {
        stream,
        confidence: timeConfidence * 0.55 + titleConfidence * 0.45
      };
    })
    .filter((candidate): candidate is { stream: Livestream; confidence: number } =>
      Boolean(candidate)
    )
    .sort((left, right) => right.confidence - left.confidence)[0];

  if (candidate && candidate.confidence >= 0.72) {
    return {
      action: "similar",
      reason: "talent_time_title",
      eventId: candidate.stream.id,
      confidence: candidate.confidence
    };
  }

  return { action: "new", reason: "no_match" };
}

function uniqueStrings(items: Array<string | undefined>) {
  return [...new Set(items.filter((item): item is string => Boolean(item)))];
}

export function jaccard(left: string, right: string) {
  const leftTokens = new Set(left.split(/\s+/u).filter(Boolean));
  const rightTokens = new Set(right.split(/\s+/u).filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}
