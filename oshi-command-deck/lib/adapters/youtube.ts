import { getDemoStreams } from "@/lib/domain/fixtures";
import { parseAnnouncementText } from "@/lib/domain/parsing";
import { toUtcIso, zonedTimeToUtc } from "@/lib/domain/time";
import type {
  Livestream,
  ProviderError,
  ProvenanceField,
  StreamCategory,
  StreamStatus
} from "@/lib/domain/types";
import { demoTalents } from "@/lib/domain/registry";
import type { AdapterRunResult, IngestionAdapter } from "./types";
import { hasServerEnv } from "./types";

const youtubeApiBaseUrl = "https://www.googleapis.com/youtube/v3";
const searchQuotaCost = 100;
const videosListQuotaCost = 1;
const liveEventTypes = ["live", "upcoming"] as const;

type YoutubeEventType = (typeof liveEventTypes)[number];

export type YoutubeChannelConfig = {
  talentId: string;
  displayName: string;
  channelId: string;
  branch: string;
  languages: string[];
  tags: string[];
};

type YoutubeApiError = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

type YoutubeSearchResponse = YoutubeApiError & {
  items?: Array<{
    id?: {
      videoId?: string;
    };
  }>;
};

export type YoutubeVideoResource = {
  id: string;
  snippet?: {
    channelId?: string;
    title?: string;
    description?: string;
    liveBroadcastContent?: "live" | "upcoming" | "none";
  };
  liveStreamingDetails?: {
    scheduledStartTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
  };
  status?: {
    privacyStatus?: "public" | "unlisted" | "private";
    embeddable?: boolean;
  };
};

type YoutubeVideosResponse = YoutubeApiError & {
  items?: YoutubeVideoResource[];
};

type YoutubeFetchResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ProviderError; status: number };

type YoutubeCacheEntry = {
  key: string;
  expiresAt: number;
  result: AdapterRunResult;
};

let cacheEntry: YoutubeCacheEntry | null = null;

export const youtubeAdapter: IngestionAdapter = {
  provider: "youtube",
  async run(context) {
    const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();
    const credentialsAvailable = hasServerEnv("YOUTUBE_DATA_API_KEY");

    if (context.demoMode || !apiKey) {
      const streams = context.demoMode
        ? getDemoStreams(context.now).filter((stream) =>
            stream.sourceLinks.some((link) => link.provider === "youtube")
          )
        : [];

      return {
        provider: "youtube",
        streams,
        quotaCost: 0,
        requestCount: 0,
        health: {
          provider: "youtube",
          state: context.demoMode ? "disabled" : "missing_credentials",
          coverageCode: context.demoMode ? "youtube.demo_not_called" : "youtube.missing_credentials",
          coverageLimit: context.demoMode
            ? "Demo mode is active; official YouTube Data API was not called."
            : "YOUTUBE_DATA_API_KEY missing; demo fixtures only.",
          lastCheckedUtc: toUtcIso(context.now),
          confidence: credentialsAvailable ? 0.45 : 0.2,
          errorCode: context.demoMode ? undefined : "missing_credentials.youtube_data_api_key",
          error: context.demoMode ? undefined : "missing_credentials"
        },
        errors: context.demoMode
          ? []
          : [
              {
                provider: "youtube",
                code: "missing_credentials",
                message: "YOUTUBE_DATA_API_KEY is not configured.",
                transient: false
              }
            ]
      };
    }

    const registry = readYoutubeChannelRegistry();
    if (registry.error) {
      return emptyResult(context.now, {
        code: "invalid_channel_registry",
        message: registry.error,
        transient: false
      });
    }

    if (registry.channels.length === 0) {
      return emptyResult(context.now, {
        code: "missing_channel_registry",
        message: "YOUTUBE_CHANNELS_JSON is empty. Add public channel IDs before live ingestion.",
        transient: false
      });
    }

    const maxChannels = readPositiveInt(process.env.YOUTUBE_MAX_CHANNELS, 25);
    const maxResults = Math.min(readPositiveInt(process.env.YOUTUBE_MAX_RESULTS, 10), 50);
    const channels = registry.channels.slice(0, maxChannels);
    const cacheTtlSeconds = readPositiveInt(process.env.YOUTUBE_CACHE_TTL_SECONDS, 120);
    const cacheKey = JSON.stringify({
      channelIds: channels.map((channel) => channel.channelId).sort(),
      maxResults
    });

    if (cacheEntry && cacheEntry.key === cacheKey && Date.now() < cacheEntry.expiresAt) {
      return {
        ...cacheEntry.result,
        health: {
          ...cacheEntry.result.health,
          coverageCode: "youtube.cached",
          coverageParams: {
            ...(cacheEntry.result.health.coverageParams ?? {}),
            seconds: cacheTtlSeconds
          },
          coverageLimit: `${cacheEntry.result.health.coverageLimit} Cached for ${cacheTtlSeconds}s to reduce quota usage.`,
          lastCheckedUtc: toUtcIso(context.now)
        }
      };
    }

    const videoIds = new Set<string>();
    const errors: ProviderError[] = [];
    let requestCount = 0;
    let quotaCost = 0;

    for (const channel of channels) {
      for (const eventType of liveEventTypes) {
        requestCount += 1;
        quotaCost += searchQuotaCost;
        const searchResult = await fetchYoutubeJson<YoutubeSearchResponse>(
          buildSearchUrl(apiKey, channel.channelId, eventType, maxResults)
        );

        if (!searchResult.ok) {
          errors.push(searchResult.error);
          if (shouldStopYoutubeProviderRun(searchResult.error, searchResult.status)) {
            return buildYoutubeRunResult({
              now: context.now,
              channels,
              maxResults,
              streams: [],
              errors,
              quotaCost,
              requestCount,
              stoppedEarly: true
            });
          }
          continue;
        }

        for (const item of searchResult.value.items ?? []) {
          if (item.id?.videoId) {
            videoIds.add(item.id.videoId);
          }
        }
      }
    }

    const channelById = new Map(channels.map((channel) => [channel.channelId, channel]));
    const videos: YoutubeVideoResource[] = [];

    for (const batch of chunk([...videoIds], 50)) {
      requestCount += 1;
      quotaCost += videosListQuotaCost;
      const videosResult = await fetchYoutubeJson<YoutubeVideosResponse>(
        buildVideosUrl(apiKey, batch)
      );

      if (!videosResult.ok) {
        errors.push(videosResult.error);
        if (shouldStopYoutubeProviderRun(videosResult.error, videosResult.status)) {
          return buildYoutubeRunResult({
            now: context.now,
            channels,
            maxResults,
            streams: [],
            errors,
            quotaCost,
            requestCount,
            stoppedEarly: true
          });
        }
        continue;
      }

      videos.push(...(videosResult.value.items ?? []));
    }

    const streams = videos.flatMap((video) => {
      const channelConfig = video.snippet?.channelId
        ? channelById.get(video.snippet.channelId)
        : undefined;
      return channelConfig ? [mapYoutubeVideoToLivestream(video, channelConfig, context.now)] : [];
    });

    const result = buildYoutubeRunResult({
      now: context.now,
      channels,
      maxResults,
      streams,
      quotaCost,
      requestCount,
      errors,
      stoppedEarly: false
    });

    cacheEntry = {
      key: cacheKey,
      expiresAt: Date.now() + cacheTtlSeconds * 1000,
      result
    };

    return result;
  }
};

export function parseYoutubeChannelRegistry(raw = process.env.YOUTUBE_CHANNELS_JSON) {
  if (!raw?.trim()) {
    return [] satisfies YoutubeChannelConfig[];
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    return [] satisfies YoutubeChannelConfig[];
  }

  return parsed.flatMap((item): YoutubeChannelConfig[] => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Partial<YoutubeChannelConfig>;
    if (
      typeof record.talentId !== "string" ||
      typeof record.displayName !== "string" ||
      typeof record.channelId !== "string"
    ) {
      return [];
    }

    const talent = demoTalents.find((candidate) => candidate.id === record.talentId);
    return [
      {
        talentId: record.talentId,
        displayName: record.displayName,
        channelId: record.channelId,
        branch: typeof record.branch === "string" ? record.branch : (talent?.branch ?? "future"),
        languages: sanitizeStringArray(record.languages, talent?.languages ?? ["ja"]),
        tags: sanitizeStringArray(record.tags, talent?.tags ?? [])
      }
    ];
  });
}

function buildYoutubeRunResult({
  now,
  channels,
  maxResults,
  streams,
  errors,
  quotaCost,
  requestCount,
  stoppedEarly
}: {
  now: Date;
  channels: YoutubeChannelConfig[];
  maxResults: number;
  streams: Livestream[];
  errors: ProviderError[];
  quotaCost: number;
  requestCount: number;
  stoppedEarly: boolean;
}): AdapterRunResult {
  const coverageBase = `Official YouTube Data API live/upcoming search across ${channels.length} configured channels; max ${maxResults} results per channel/event type.`;
  const firstError = errors[0];
  return {
    provider: "youtube",
    streams,
    quotaCost,
    requestCount,
    health: {
      provider: "youtube",
      state: errors.length > 0 ? (streams.length > 0 ? "degraded" : "stale") : "healthy",
      coverageCode: stoppedEarly
        ? "youtube.official_search_stopped_early"
        : "youtube.official_search",
      coverageParams: {
        channels: channels.length,
        maxResults
      },
      coverageLimit: stoppedEarly
        ? `${coverageBase} Provider run stopped early to respect quota/rate-limit backoff.`
        : coverageBase,
      lastCheckedUtc: toUtcIso(now),
      confidence: streams.length > 0 ? 0.86 : 0.58,
      errorCode: firstError ? "provider.code" : undefined,
      errorParams: firstError ? { code: firstError.code } : undefined,
      error: firstError?.message
    },
    errors
  };
}

export function mapYoutubeVideoToLivestream(
  video: YoutubeVideoResource,
  channel: YoutubeChannelConfig,
  now: Date
): Livestream {
  const talent = demoTalents.find((item) => item.id === channel.talentId);
  const title = video.snippet?.title?.trim() || `${channel.displayName} livestream`;
  const description = video.snippet?.description ?? "";
  const parsed = parseAnnouncementText(`${title}\n${description}`, now, "Asia/Tokyo");
  const status = deriveYoutubeStreamStatus(video, parsed.tbd);
  const scheduledStartUtc = normalizeIso(video.liveStreamingDetails?.scheduledStartTime);
  const actualStartUtc = normalizeIso(video.liveStreamingDetails?.actualStartTime);
  const endedAtUtc = normalizeIso(video.liveStreamingDetails?.actualEndTime);
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
  const fields: ProvenanceField[] = ["title", "status", "category"];
  if (scheduledStartUtc) {
    fields.push("scheduledStart");
  }
  if (parsed.collaborators.length > 0) {
    fields.push("collaborators");
  }

  return {
    id: `youtube-${video.id}`,
    canonicalKey: `youtube:${video.id}`,
    talentId: channel.talentId,
    titleOriginal: title,
    category: deriveCategory(title, description, channel.tags),
    branch: channel.branch || talent?.branch || "future",
    languages: channel.languages.length > 0 ? channel.languages : (talent?.languages ?? ["ja"]),
    status,
    scheduledStartUtc,
    actualStartUtc,
    endedAtUtc,
    collaborators: parsed.collaborators,
    sourceLinks: [
      {
        provider: "youtube",
        url,
        label: "YouTube",
        embeddable: video.status?.embeddable === true
      }
    ],
    confidence: computeYoutubeConfidence(video),
    lastCheckedUtc: toUtcIso(now),
    staleAfterMinutes: status === "live" ? 10 : 45,
    visibility: video.status?.privacyStatus === "public" || video.status?.privacyStatus === "unlisted"
      ? video.status.privacyStatus
      : "unknown",
    demo: false,
    provenance: [
      {
        provider: "youtube",
        sourceId: video.id,
        fetchedAtUtc: toUtcIso(now),
        url,
        fields,
        confidence: computeYoutubeConfidence(video),
        rawExcerpt: title
      }
    ],
    providerErrors: parsed.tbd
      ? [
          {
            provider: "youtube",
            code: "tbd_wording",
            message: "TBD wording was detected in YouTube metadata.",
            transient: false
          }
        ]
      : [],
    conflictIds: []
  };
}

export function deriveYoutubeStreamStatus(
  video: YoutubeVideoResource,
  hasTbdWording = false
): StreamStatus {
  if (video.liveStreamingDetails?.actualEndTime) {
    return "ended";
  }
  if (video.liveStreamingDetails?.actualStartTime || video.snippet?.liveBroadcastContent === "live") {
    return "live";
  }
  if (
    video.liveStreamingDetails?.scheduledStartTime ||
    video.snippet?.liveBroadcastContent === "upcoming"
  ) {
    return "scheduled";
  }
  return hasTbdWording ? "tbd" : "unverified";
}

function readYoutubeChannelRegistry() {
  try {
    return {
      channels: parseYoutubeChannelRegistry(),
      error: undefined as string | undefined
    };
  } catch (error) {
    return {
      channels: [] as YoutubeChannelConfig[],
      error: error instanceof Error ? error.message : "Invalid YOUTUBE_CHANNELS_JSON."
    };
  }
}

function emptyResult(now: Date, error: Omit<ProviderError, "provider">): AdapterRunResult {
  const providerError: ProviderError = {
    provider: "youtube",
    ...error
  };
  return {
    provider: "youtube",
    streams: [],
    quotaCost: 0,
    requestCount: 0,
    health: {
      provider: "youtube",
      state: "degraded",
      coverageCode:
        providerError.code === "missing_channel_registry"
          ? "youtube.registry_missing"
          : "youtube.registry_error",
      coverageParams: { code: providerError.code },
      coverageLimit: providerError.message,
      lastCheckedUtc: toUtcIso(now),
      confidence: 0.35,
      errorCode: "provider.code",
      errorParams: { code: providerError.code },
      error: providerError.code
    },
    errors: [providerError]
  };
}

function buildSearchUrl(
  apiKey: string,
  channelId: string,
  eventType: YoutubeEventType,
  maxResults: number
) {
  const url = new URL(`${youtubeApiBaseUrl}/search`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("eventType", eventType);
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", apiKey);
  return url;
}

function buildVideosUrl(apiKey: string, videoIds: string[]) {
  const url = new URL(`${youtubeApiBaseUrl}/videos`);
  url.searchParams.set("part", "snippet,liveStreamingDetails,status");
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("key", apiKey);
  return url;
}

async function fetchYoutubeJson<T>(url: URL, retries = 1): Promise<YoutubeFetchResult<T>> {
  const timeoutMs = readPositiveInt(process.env.YOUTUBE_FETCH_TIMEOUT_MS, 12_000);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: "application/json"
        }
      });
      const body = (await response.json().catch(() => ({}))) as T & YoutubeApiError;

      if (response.ok) {
        return { ok: true, value: body };
      }

      const error = youtubeErrorFromResponse(body, response.status, response.headers);
      if (attempt < retries && error.transient && !error.retryAfterUtc) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      return { ok: false, error, status: response.status };
    } catch (error) {
      const providerError: ProviderError = {
        provider: "youtube",
        code: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "fetch_failed",
        message: error instanceof Error ? error.message : "YouTube API fetch failed.",
        transient: true
      };

      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      return { ok: false, error: providerError, status: 0 };
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    status: 0,
    error: {
      provider: "youtube",
      code: "fetch_failed",
      message: "YouTube API fetch failed.",
      transient: true
    }
  };
}

function youtubeErrorFromResponse(
  body: YoutubeApiError,
  status: number,
  headers: Headers
): ProviderError {
  const reason = body.error?.errors?.[0]?.reason ?? body.error?.status ?? `http_${status}`;
  const retryAfter =
    parseRetryAfter(headers.get("retry-after")) ?? inferYoutubeRetryAfterUtc(reason, status);
  return {
    provider: "youtube",
    code: reason,
    message: body.error?.message ?? `YouTube API returned HTTP ${status}.`,
    retryAfterUtc: retryAfter,
    transient: status === 429 || status >= 500 || isYoutubeQuotaOrRateLimitCode(reason)
  };
}

function shouldStopYoutubeProviderRun(error: ProviderError, status: number) {
  return Boolean(error.retryAfterUtc) || status === 429 || isYoutubeQuotaOrRateLimitCode(error.code);
}

function inferYoutubeRetryAfterUtc(reason: string, status: number) {
  if (/quota|daily/iu.test(reason)) {
    return getNextPacificMidnightUtc(new Date());
  }
  if (status === 429 || /rateLimit/iu.test(reason)) {
    return toUtcIso(new Date(Date.now() + 15 * 60_000));
  }
  return undefined;
}

function isYoutubeQuotaOrRateLimitCode(code: string) {
  return /quota|daily|rateLimit/iu.test(code);
}

function getNextPacificMidnightUtc(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  return toUtcIso(
    zonedTimeToUtc(
      nextDay.getUTCFullYear(),
      nextDay.getUTCMonth() + 1,
      nextDay.getUTCDate(),
      0,
      0,
      "America/Los_Angeles"
    )
  );
}

function parseRetryAfter(value: string | null) {
  if (!value) {
    return undefined;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return toUtcIso(new Date(Date.now() + seconds * 1000));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : toUtcIso(parsed);
}

function deriveCategory(title: string, description: string, tags: string[]): StreamCategory {
  const text = `${title}\n${description}\n${tags.join(" ")}`.toLowerCase();
  if (/minecraft|マイクラ|マインクラフト/u.test(text)) {
    return "minecraft";
  }
  if (/collab|with|コラボ|参加/u.test(text)) {
    return "collaboration";
  }
  if (/karaoke|sing|music|歌|音楽/u.test(text)) {
    return "music";
  }
  if (/chat|talk|zatsu|雑談/u.test(text)) {
    return "chat";
  }
  if (/event|大会|企画/u.test(text)) {
    return "event";
  }
  if (/game|gaming|ゲーム/u.test(text)) {
    return "game";
  }
  return "other";
}

function computeYoutubeConfidence(video: YoutubeVideoResource) {
  let value = 0.78;
  if (video.liveStreamingDetails?.scheduledStartTime || video.liveStreamingDetails?.actualStartTime) {
    value += 0.08;
  }
  if (video.status?.privacyStatus === "public" || video.status?.privacyStatus === "unlisted") {
    value += 0.04;
  }
  if (video.status?.embeddable === true) {
    value += 0.02;
  }
  return Math.min(0.95, Number(value.toFixed(2)));
}

function normalizeIso(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : toUtcIso(date);
}

function sanitizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
