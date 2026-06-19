import { createHash } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const memoryBucketMaxEntries = 10_000;
const memorySweepIntervalMs = 60_000;
let lastMemorySweepAt = 0;

export type RateLimitDecision = {
  allowed: boolean;
  backend: "memory" | "supabase";
  key: string;
  policy: string;
  limit: number;
  windowMs: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type RequestRateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
  key?: string;
};

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweepExpiredBuckets(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    if (buckets.size > memoryBucketMaxEntries) {
      sweepExpiredBuckets(now);
    }
    return buildDecision({
      allowed: true,
      backend: "memory",
      key,
      limit,
      windowMs,
      remaining: limit - 1,
      resetAt,
      now
    });
  }

  if (existing.count >= limit) {
    return buildDecision({
      allowed: false,
      backend: "memory",
      key,
      limit,
      windowMs,
      remaining: 0,
      resetAt: existing.resetAt,
      now
    });
  }

  existing.count += 1;
  return buildDecision({
    allowed: true,
    backend: "memory",
    key,
    limit,
    windowMs,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
    now
  });
}

export async function checkRequestRateLimit(
  request: Request,
  options: RequestRateLimitOptions
) {
  const key = options.key ?? `${options.scope}:${getClientIp(request)}`;
  const decision = await checkRateLimitWithConfiguredBackend(
    key,
    options.limit,
    options.windowMs
  );
  return {
    ...decision,
    policy: sanitizePolicyName(options.scope)
  };
}

export async function checkRateLimitWithConfiguredBackend(
  key: string,
  limit: number,
  windowMs: number
) {
  if (process.env.RATE_LIMIT_BACKEND === "supabase") {
    const supabaseDecision = await checkSupabaseRateLimit(key, limit, windowMs);
    if (supabaseDecision) {
      return supabaseDecision;
    }
  }

  return checkRateLimit(key, limit, windowMs);
}

export async function checkSupabaseRateLimit(
  key: string,
  limit: number,
  windowMs: number
) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return undefined;
  }

  const now = Date.now();
  const { data, error } = await supabase.rpc("check_api_rate_limit", {
    p_bucket_key: hashRateLimitKey(key),
    p_limit: limit,
    p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    p_now: new Date(now).toISOString()
  });

  if (error) {
    return undefined;
  }

  const row = normalizeSupabaseRateLimitRow(data);
  if (!row) {
    return undefined;
  }

  return buildDecision({
    allowed: row.allowed,
    backend: "supabase",
    key,
    limit,
    windowMs,
    remaining: Math.max(0, limit - row.currentCount),
    resetAt: new Date(row.resetAt).getTime(),
    now
  });
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

export function createRateLimitHeaders(
  decision: RateLimitDecision,
  { includeRetryAfter = false }: { includeRetryAfter?: boolean } = {}
) {
  const headers = new Headers();
  const windowSeconds = Math.max(1, Math.ceil(decision.windowMs / 1000));
  headers.set(
    "RateLimit-Policy",
    `"${decision.policy}";q=${decision.limit};w=${windowSeconds}`
  );
  headers.set(
    "RateLimit",
    `"${decision.policy}";r=${Math.max(0, decision.remaining)};t=${decision.retryAfterSeconds}`
  );
  headers.set("RateLimit-Backend", decision.backend);
  if (includeRetryAfter) {
    headers.set("Retry-After", String(decision.retryAfterSeconds));
  }
  return headers;
}

export function createRateLimitExceededResponse(decision: RateLimitDecision) {
  return Response.json(
    {
      error: "rate_limited",
      resetAt: new Date(decision.resetAt).toISOString(),
      retryAfterSeconds: decision.retryAfterSeconds
    },
    {
      status: 429,
      headers: createRateLimitHeaders(decision, { includeRetryAfter: true })
    }
  );
}

export function attachRateLimitHeaders(response: Response, decision: RateLimitDecision) {
  for (const [key, value] of createRateLimitHeaders(decision)) {
    response.headers.set(key, value);
  }
  return response;
}

export function resetRateLimitBuckets() {
  buckets.clear();
  lastMemorySweepAt = 0;
}

export function getRateLimitBucketCount() {
  return buckets.size;
}

function buildDecision({
  allowed,
  backend,
  key,
  limit,
  windowMs,
  remaining,
  resetAt,
  now
}: {
  allowed: boolean;
  backend: RateLimitDecision["backend"];
  key: string;
  limit: number;
  windowMs: number;
  remaining: number;
  resetAt: number;
  now: number;
}): RateLimitDecision {
  return {
    allowed,
    backend,
    key,
    policy: sanitizePolicyName(key.split(":")[0] ?? "default"),
    limit,
    windowMs,
    remaining,
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000))
  };
}

function sanitizePolicyName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/gu, "_").slice(0, 64) || "default";
}

export function hashRateLimitKey(key: string) {
  const salt = process.env.RATE_LIMIT_KEY_SALT?.trim();
  return createHash("sha256")
    .update(salt ? `${salt}:${key}` : key)
    .digest("hex");
}

function sweepExpiredBuckets(now: number) {
  if (now - lastMemorySweepAt < memorySweepIntervalMs && buckets.size <= memoryBucketMaxEntries) {
    return;
  }
  lastMemorySweepAt = now;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  if (buckets.size <= memoryBucketMaxEntries) {
    return;
  }

  const overflow = buckets.size - memoryBucketMaxEntries;
  const oldestKeys = [...buckets.entries()]
    .sort(([, left], [, right]) => left.resetAt - right.resetAt)
    .slice(0, overflow)
    .map(([key]) => key);
  for (const key of oldestKeys) {
    buckets.delete(key);
  }
}

function normalizeSupabaseRateLimitRow(data: unknown) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return undefined;
  }

  const candidate = row as {
    allowed?: unknown;
    current_count?: unknown;
    reset_at?: unknown;
  };
  if (
    typeof candidate.allowed !== "boolean" ||
    typeof candidate.current_count !== "number" ||
    typeof candidate.reset_at !== "string"
  ) {
    return undefined;
  }

  return {
    allowed: candidate.allowed,
    currentCount: candidate.current_count,
    resetAt: candidate.reset_at
  };
}
