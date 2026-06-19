import { getDemoStreams } from "@/lib/domain/fixtures";
import { parseAnnouncementText } from "@/lib/domain/parsing";
import { demoTalents } from "@/lib/domain/registry";
import { toUtcIso } from "@/lib/domain/time";
import type {
  Livestream,
  ProviderError,
  ProvenanceField,
  StreamCategory,
  StreamStatus
} from "@/lib/domain/types";
import {
  isAnnouncementAiFallbackConfigured,
  parseAnnouncementTextWithAiFallback,
  type ParsedAnnouncementWithFallback
} from "./announcement-ai-fallback";
import type { AdapterRunResult, IngestionAdapter } from "./types";
import { hasServerEnv } from "./types";

const xApiBaseUrl = "https://api.x.com/2/tweets/search/recent";
const streamSignalQuery = [
  "配信",
  "待機所",
  "予定",
  "コラボ",
  "参加",
  "live",
  "stream",
  "waiting room",
  "collab",
  "minecraft",
  "マイクラ"
];

export type XHandleConfig = {
  talentId: string;
  displayName: string;
  handle: string;
  branch: string;
  languages: string[];
  tags: string[];
};

export type XPostResource = {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  lang?: string;
  entities?: {
    urls?: Array<{
      url?: string;
      expanded_url?: string;
      display_url?: string;
    }>;
    mentions?: Array<{
      username?: string;
      name?: string;
    }>;
  };
  referenced_tweets?: Array<{
    type: "retweeted" | "quoted" | "replied_to";
    id: string;
  }>;
};

type XRecentSearchResponse = {
  data?: XPostResource[];
  includes?: {
    users?: Array<{
      id: string;
      username?: string;
      name?: string;
    }>;
  };
  errors?: Array<{ title?: string; detail?: string; type?: string }>;
  meta?: {
    result_count?: number;
    newest_id?: string;
    oldest_id?: string;
    next_token?: string;
  };
};

type XFetchResult<T> =
  | {
      ok: true;
      value: T;
      quotaRemaining?: number;
      retryAfterUtc?: string;
    }
  | { ok: false; error: ProviderError; status: number };

export const xAdapter: IngestionAdapter = {
  provider: "x",
  async run(context) {
    const bearerToken = process.env.X_BEARER_TOKEN?.trim();
    const credentialsAvailable = hasServerEnv("X_BEARER_TOKEN");

    if (context.demoMode || !bearerToken) {
      const streams = context.demoMode
        ? getDemoStreams(context.now).filter((stream) =>
            stream.sourceLinks.some((link) => link.provider === "x")
          )
        : [];

      return {
        provider: "x",
        streams,
        quotaCost: 0,
        requestCount: 0,
        health: {
          provider: "x",
          state: context.demoMode ? "disabled" : "missing_credentials",
          coverageCode: context.demoMode ? "x.demo_not_called" : "x.missing_credentials",
          coverageLimit: context.demoMode
            ? "Demo mode is active; official X API was not called."
            : "X_BEARER_TOKEN missing; no scraping is allowed, so social context is disabled.",
          lastCheckedUtc: toUtcIso(context.now),
          confidence: credentialsAvailable ? 0.45 : 0.2,
          errorCode: context.demoMode ? undefined : "missing_credentials.x_bearer_token",
          error: context.demoMode ? undefined : "missing_credentials"
        },
        errors: context.demoMode
          ? []
          : [
              {
                provider: "x",
                code: "missing_credentials",
                message: "X_BEARER_TOKEN is not configured.",
                transient: false
              }
            ]
      };
    }

    const registry = readXHandleRegistry();
    if (registry.error) {
      return emptyResult(context.now, {
        code: "invalid_handle_registry",
        message: registry.error,
        transient: false
      });
    }
    if (registry.handles.length === 0) {
      return emptyResult(context.now, {
        code: "missing_handle_registry",
        message: "X_HANDLES_JSON is empty. Add official handles before X ingestion.",
        transient: false
      });
    }

    const maxHandles = readPositiveInt(process.env.X_MAX_HANDLES, 20);
    const maxResults = Math.min(Math.max(readPositiveInt(process.env.X_MAX_RESULTS, 25), 10), 100);
    const handles = registry.handles.slice(0, maxHandles);
    const batches = chunk(handles, readPositiveInt(process.env.X_HANDLES_PER_QUERY, 8));
    const errors: ProviderError[] = [];
    const posts: Array<{ post: XPostResource; handle: XHandleConfig }> = [];
    let requestCount = 0;
    let quotaRemaining: number | undefined;
    let stoppedEarly = false;
    let unmatchedAuthorCount = 0;

    for (const batch of batches) {
      requestCount += 1;
      const response = await fetchXJson<XRecentSearchResponse>(
        buildRecentSearchUrl(batch, maxResults),
        bearerToken
      );

      if (!response.ok) {
        errors.push(response.error);
        if (shouldStopXProviderRun(response.error, response.status)) {
          stoppedEarly = true;
          break;
        }
        continue;
      }

      quotaRemaining = response.quotaRemaining ?? quotaRemaining;
      const handleByLower = new Map(batch.map((handle) => [handle.handle.toLowerCase(), handle]));
      const handleByAuthorId = new Map(
        (response.value.includes?.users ?? []).flatMap((user) => {
          const handle = user.username ? handleByLower.get(user.username.toLowerCase()) : undefined;
          return handle ? [[user.id, handle] as const] : [];
        })
      );
      for (const post of response.value.data ?? []) {
        const matched = matchHandleFromQuery(post, handleByLower, handleByAuthorId);
        if (matched) {
          posts.push({ post, handle: matched });
        } else {
          unmatchedAuthorCount += 1;
        }
      }

      if (quotaRemaining === 0) {
        errors.push({
          provider: "x",
          code: "rate_limit_exhausted",
          message: "X rate limit remaining is 0; provider run stopped until reset.",
          retryAfterUtc: response.retryAfterUtc ?? toUtcIso(new Date(context.now.getTime() + 15 * 60_000)),
          transient: true
        });
        stoppedEarly = true;
        break;
      }
    }

    if (unmatchedAuthorCount > 0) {
      errors.push({
        provider: "x",
        code: "x_author_unmatched",
        message: `Skipped ${unmatchedAuthorCount} X post(s) because author_id could not be matched to configured handles via includes.users.`,
        transient: false
      });
    }

    const streams = await Promise.all(
      posts
        .filter(({ post }) => hasScheduleSignal(post.text))
        .map(({ post, handle }) => mapXPostToLivestreamWithFallback(post, handle, context.now))
    );

    const aiFallbackConfigured = isAnnouncementAiFallbackConfigured();
    const firstError = errors[0];

    return {
      provider: "x",
      streams,
      quotaCost: requestCount,
      requestCount,
      health: {
        provider: "x",
        state: errors.length > 0 ? (streams.length > 0 ? "degraded" : "stale") : "healthy",
        coverageCode: aiFallbackConfigured
          ? stoppedEarly
            ? "x.official_search_ai_enabled_stopped_early"
            : "x.official_search_ai_enabled"
          : stoppedEarly
            ? "x.official_search_ai_disabled_stopped_early"
            : "x.official_search_ai_disabled",
        coverageParams: {
          handles: handles.length
        },
        coverageLimit: `Official X recent search across ${handles.length} configured handles; no scraping. Deterministic parsing runs first; AI fallback is ${
          aiFallbackConfigured ? "enabled" : "disabled"
        }.${stoppedEarly ? " Provider run stopped early to respect quota/rate-limit backoff." : ""}`,
        lastCheckedUtc: toUtcIso(context.now),
        confidence: streams.length > 0 ? 0.72 : 0.5,
        quotaRemaining,
        errorCode: firstError ? "provider.code" : undefined,
        errorParams: firstError ? { code: firstError.code } : undefined,
        error: firstError?.message
      },
      errors
    };
  }
};

export function parseXHandleRegistry(raw = process.env.X_HANDLES_JSON) {
  if (!raw?.trim()) {
    return [] satisfies XHandleConfig[];
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    return [] satisfies XHandleConfig[];
  }

  return parsed.flatMap((item): XHandleConfig[] => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Partial<XHandleConfig>;
    if (
      typeof record.talentId !== "string" ||
      typeof record.displayName !== "string" ||
      typeof record.handle !== "string"
    ) {
      return [];
    }

    const talent = demoTalents.find((candidate) => candidate.id === record.talentId);
    return [
      {
        talentId: record.talentId,
        displayName: record.displayName,
        handle: normalizeHandle(record.handle),
        branch: typeof record.branch === "string" ? record.branch : (talent?.branch ?? "future"),
        languages: sanitizeStringArray(record.languages, talent?.languages ?? ["ja"]),
        tags: sanitizeStringArray(record.tags, talent?.tags ?? [])
      }
    ];
  });
}

export function mapXPostToLivestream(
  post: XPostResource,
  handle: XHandleConfig,
  now: Date,
  parsed: ParsedAnnouncementWithFallback = parseAnnouncementText(post.text, now, "Asia/Tokyo")
): Livestream {
  const sourceUrls = [
    ...(post.entities?.urls ?? []).flatMap((url) => url.expanded_url ?? url.url ?? []),
    ...parsed.urls
  ];
  const cancellation = hasCancellationSignal(post.text);
  const status = deriveXPostStatus(post.text, parsed.tbd, parsed.scheduledStartUtc);
  const fields: ProvenanceField[] = ["title", "context"];
  if (parsed.scheduledStartUtc) {
    fields.push("scheduledStart");
  }
  if (parsed.collaborators.length > 0 || post.entities?.mentions?.length) {
    fields.push("collaborators");
  }
  if (cancellation) {
    fields.push("cancellation");
  }

  const postUrl = `https://x.com/${encodeURIComponent(handle.handle)}/status/${encodeURIComponent(post.id)}`;
  const title = firstMeaningfulLine(post.text);

  return {
    id: `x-${post.id}`,
    canonicalKey: `x:${post.id}`,
    talentId: handle.talentId,
    titleOriginal: title,
    category: deriveCategory(post.text, handle.tags),
    branch: handle.branch,
    languages: post.lang ? [post.lang.toLowerCase()] : handle.languages,
    status,
    scheduledStartUtc: parsed.scheduledStartUtc,
    collaborators: [
      ...new Set([
        ...parsed.collaborators,
        ...(post.entities?.mentions ?? [])
          .map((mention) => mention.name ?? mention.username)
          .filter((value): value is string => Boolean(value))
      ])
    ].slice(0, 12),
    sourceLinks: [
      {
        provider: "x",
        url: postUrl,
        label: "X",
        embeddable: false
      },
      ...sourceUrls.slice(0, 2).map((url) => ({
        provider: "x" as const,
        url,
        label: "Linked source",
        embeddable: false
      }))
    ],
    confidence: computeXConfidence(post, parsed.scheduledStartUtc),
    lastCheckedUtc: toUtcIso(now),
    staleAfterMinutes: 90,
    visibility: "public",
    demo: false,
    provenance: [
      {
        provider: "x",
        sourceId: post.id,
        fetchedAtUtc: toUtcIso(now),
        url: postUrl,
        fields,
        confidence: computeXConfidence(post, parsed.scheduledStartUtc),
        rawExcerpt: [
          parsed.aiFallback
            ? `aiFallback=${parsed.aiFallback.status}${parsed.aiFallback.model ? ` model=${parsed.aiFallback.model}` : ""}`
            : undefined,
          post.text.slice(0, 500)
        ]
          .filter(Boolean)
          .join("\n")
      }
    ],
    providerErrors: buildXProviderErrors(parsed, cancellation),
    conflictIds: []
  };
}

export async function mapXPostToLivestreamWithFallback(
  post: XPostResource,
  handle: XHandleConfig,
  now: Date
) {
  const parsed = await parseAnnouncementTextWithAiFallback(post.text, now, "Asia/Tokyo");
  return mapXPostToLivestream(post, handle, now, parsed);
}

export function deriveXPostStatus(
  text: string,
  hasTbdWording: boolean,
  scheduledStartUtc?: string
): StreamStatus {
  if (/中止|延期|キャンセル|cancel(?:led|ed)?|postponed/iu.test(text)) {
    return "unverified";
  }
  if (scheduledStartUtc) {
    return "scheduled";
  }
  return hasTbdWording ? "tbd" : "unverified";
}

function readXHandleRegistry() {
  try {
    return {
      handles: parseXHandleRegistry(),
      error: undefined as string | undefined
    };
  } catch (error) {
    return {
      handles: [] as XHandleConfig[],
      error: error instanceof Error ? error.message : "Invalid X_HANDLES_JSON."
    };
  }
}

function emptyResult(now: Date, error: Omit<ProviderError, "provider">): AdapterRunResult {
  const providerError: ProviderError = {
    provider: "x",
    ...error
  };
  return {
    provider: "x",
    streams: [],
    quotaCost: 0,
    requestCount: 0,
    health: {
      provider: "x",
      state: "degraded",
      coverageCode:
        providerError.code === "missing_handle_registry"
          ? "x.registry_missing"
          : "x.registry_error",
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

function buildXProviderErrors(
  parsed: ParsedAnnouncementWithFallback,
  cancellation: boolean
): ProviderError[] {
  const errors: ProviderError[] = [];

  if (parsed.tbd) {
    errors.push({
      provider: "x",
      code: "tbd_wording",
      message: "TBD wording was detected in X context.",
      transient: false
    });
  }

  if (cancellation) {
    errors.push({
      provider: "x",
      code: "cancellation_context",
      message: "Cancellation or postponement wording was detected in direct X context.",
      transient: false
    });
  }

  if (parsed.aiFallback?.status === "failed" || parsed.aiFallback?.status === "invalid") {
    errors.push({
      provider: "x",
      code: `ai_fallback_${parsed.aiFallback.status}`,
      message: parsed.aiFallback.reason ?? "AI fallback could not validate announcement context.",
      transient: parsed.aiFallback.status === "failed"
    });
  }

  return errors;
}

function hasCancellationSignal(text: string) {
  return /中止|延期|キャンセル|cancel(?:led|ed)?|postponed/iu.test(text);
}

function buildRecentSearchUrl(handles: XHandleConfig[], maxResults: number) {
  const url = new URL(xApiBaseUrl);
  const authorQuery = handles.map((handle) => `from:${handle.handle}`).join(" OR ");
  const signalQuery = streamSignalQuery.map((term) => `"${term}"`).join(" OR ");
  url.searchParams.set("query", `(${authorQuery}) (${signalQuery}) -is:retweet`);
  url.searchParams.set("max_results", String(maxResults));
  url.searchParams.set("tweet.fields", "created_at,entities,referenced_tweets,author_id,lang");
  url.searchParams.set("expansions", "author_id,entities.mentions.username,referenced_tweets.id");
  url.searchParams.set("user.fields", "username,name");
  return url;
}

async function fetchXJson<T>(url: URL, bearerToken: string, retries = 1): Promise<XFetchResult<T>> {
  const timeoutMs = readPositiveInt(process.env.X_FETCH_TIMEOUT_MS, 12_000);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${bearerToken}`
        }
      });
      const body = (await response.json().catch(() => ({}))) as T & XRecentSearchResponse;
      const quotaRemaining = parseHeaderInt(response.headers.get("x-rate-limit-remaining"));
      const retryAfterUtc =
        parseRetryAfter(response.headers.get("retry-after")) ??
        parseRateLimitReset(response.headers.get("x-rate-limit-reset"));

      if (response.ok) {
        return { ok: true, value: body, quotaRemaining, retryAfterUtc };
      }

      const error = xErrorFromResponse(body, response.status, retryAfterUtc);
      if (attempt < retries && error.transient && !error.retryAfterUtc) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      return { ok: false, error, status: response.status };
    } catch (error) {
      const providerError: ProviderError = {
        provider: "x",
        code: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "fetch_failed",
        message: error instanceof Error ? error.message : "X API fetch failed.",
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
      provider: "x",
      code: "fetch_failed",
      message: "X API fetch failed.",
      transient: true
    }
  };
}

function xErrorFromResponse(
  body: XRecentSearchResponse,
  status: number,
  retryAfterUtc?: string
): ProviderError {
  const first = body.errors?.[0];
  return {
    provider: "x",
    code: first?.title ?? first?.type ?? `http_${status}`,
    message: first?.detail ?? first?.title ?? `X API returned HTTP ${status}.`,
    retryAfterUtc: retryAfterUtc ?? inferXRetryAfterUtc(status, first?.type ?? first?.title),
    transient: status === 429 || status >= 500
  };
}

function shouldStopXProviderRun(error: ProviderError, status: number) {
  return Boolean(error.retryAfterUtc) || status === 429 || /rate-limit|usage|too many/iu.test(error.code);
}

function matchHandleFromQuery(
  post: XPostResource,
  handleByLower: Map<string, XHandleConfig>,
  handleByAuthorId: Map<string, XHandleConfig>
) {
  if (post.author_id && handleByAuthorId.has(post.author_id)) {
    return handleByAuthorId.get(post.author_id);
  }
  return undefined;
}

function hasScheduleSignal(text: string) {
  return /(https?:\/\/|配信|待機所|予定|コラボ|参加|live|stream|waiting room|collab|minecraft|マイクラ|未定|TBD|TBA)/iu.test(
    text
  );
}

function firstMeaningfulLine(text: string) {
  return (
    text
      .split(/\n+/u)
      .map((line) => line.replace(/https?:\/\/\S+/giu, "").trim())
      .find((line) => line.length > 0)
      ?.slice(0, 180) ?? text.slice(0, 180)
  );
}

function deriveCategory(text: string, tags: string[]): StreamCategory {
  const source = `${text}\n${tags.join(" ")}`.toLowerCase();
  if (/minecraft|マイクラ|マインクラフト/u.test(source)) {
    return "minecraft";
  }
  if (/collab|with|コラボ|参加/u.test(source)) {
    return "collaboration";
  }
  if (/karaoke|sing|music|歌|音楽/u.test(source)) {
    return "music";
  }
  if (/chat|talk|zatsu|雑談/u.test(source)) {
    return "chat";
  }
  if (/event|大会|企画/u.test(source)) {
    return "event";
  }
  if (/game|gaming|ゲーム/u.test(source)) {
    return "game";
  }
  return "other";
}

function computeXConfidence(post: XPostResource, scheduledStartUtc?: string) {
  let value = 0.48;
  if (scheduledStartUtc) {
    value += 0.16;
  }
  if ((post.entities?.urls?.length ?? 0) > 0) {
    value += 0.1;
  }
  if ((post.entities?.mentions?.length ?? 0) > 0) {
    value += 0.04;
  }
  return Math.min(0.78, Number(value.toFixed(2)));
}

function normalizeHandle(handle: string) {
  return handle.trim().replace(/^@/u, "");
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

function parseHeaderInt(value: string | null) {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function parseRateLimitReset(value: string | null) {
  if (!value) {
    return undefined;
  }
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) {
    return undefined;
  }
  return toUtcIso(new Date(seconds * 1000));
}

function inferXRetryAfterUtc(status: number, code?: string) {
  if (status === 429 || /rate-limit|usage|too many/iu.test(code ?? "")) {
    return toUtcIso(new Date(Date.now() + 15 * 60_000));
  }
  return undefined;
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
