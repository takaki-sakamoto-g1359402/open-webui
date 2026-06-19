import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient
}));

import {
  checkRateLimit,
  checkRequestRateLimit,
  createRateLimitExceededResponse,
  getRateLimitBucketCount,
  hashRateLimitKey,
  resetRateLimitBuckets
} from "@/lib/security/rate-limit";

describe("rate limit security helper", () => {
  afterEach(() => {
    resetRateLimitBuckets();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("partitions requests by client IP and emits HTTP rate limit headers", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T00:00:00.000Z"));

    const request = new Request("https://app.example/api/streams", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.2"
      }
    });

    const first = await checkRequestRateLimit(request, {
      scope: "streams",
      limit: 1,
      windowMs: 60_000
    });
    const second = await checkRequestRateLimit(request, {
      scope: "streams",
      limit: 1,
      windowMs: 60_000
    });
    const otherClient = await checkRequestRateLimit(
      new Request("https://app.example/api/streams", {
        headers: { "x-real-ip": "198.51.100.42" }
      }),
      {
        scope: "streams",
        limit: 1,
        windowMs: 60_000
      }
    );

    expect(first.allowed).toBe(true);
    expect(first.backend).toBe("memory");
    expect(first.key).toBe("streams:203.0.113.10");
    expect(second.allowed).toBe(false);
    expect(otherClient.allowed).toBe(true);

    const response = createRateLimitExceededResponse(second);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("RateLimit-Policy")).toBe("\"streams\";q=1;w=60");
    expect(response.headers.get("RateLimit")).toBe("\"streams\";r=0;t=60");
    expect(response.headers.get("RateLimit-Backend")).toBe("memory");
    await expect(response.json()).resolves.toMatchObject({
      error: "rate_limited",
      retryAfterSeconds: 60,
      resetAt: "2026-06-19T00:01:00.000Z"
    });
  });

  it("resets buckets after the configured window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T00:00:00.000Z"));
    const request = new Request("https://app.example/api/streams");

    const first = await checkRequestRateLimit(request, {
      scope: "streams",
      limit: 1,
      windowMs: 1_000
    });
    const second = await checkRequestRateLimit(request, {
      scope: "streams",
      limit: 1,
      windowMs: 1_000
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);

    vi.setSystemTime(new Date("2026-06-19T00:00:01.001Z"));

    const reset = await checkRequestRateLimit(request, {
      scope: "streams",
      limit: 1,
      windowMs: 1_000
    });
    expect(reset.allowed).toBe(true);
  });

  it("bounds the process-local fallback bucket map", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T00:00:00.000Z"));

    for (let index = 0; index < 10_050; index += 1) {
      checkRateLimit(`streams:${index}`, 2, 60_000);
    }

    expect(getRateLimitBucketCount()).toBeLessThanOrEqual(10_000);
  });

  it("uses the Supabase RPC backend when configured and stores only a hashed bucket key", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T00:00:00.000Z"));
    vi.stubEnv("RATE_LIMIT_BACKEND", "supabase");
    vi.stubEnv("RATE_LIMIT_KEY_SALT", "rate-limit-salt-" + "s".repeat(32));
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          allowed: true,
          current_count: 2,
          reset_at: "2026-06-19T00:01:00.000Z"
        }
      ],
      error: null
    });
    mocks.createSupabaseServiceClient.mockReturnValue({ rpc });

    const request = new Request("https://app.example/api/streams", {
      headers: {
        "x-forwarded-for": "203.0.113.10"
      }
    });
    const decision = await checkRequestRateLimit(request, {
      scope: "streams",
      limit: 5,
      windowMs: 60_000
    });

    expect(decision).toMatchObject({
      allowed: true,
      backend: "supabase",
      key: "streams:203.0.113.10",
      remaining: 3,
      resetAt: new Date("2026-06-19T00:01:00.000Z").getTime()
    });
    expect(rpc).toHaveBeenCalledWith("check_api_rate_limit", {
      p_bucket_key: hashRateLimitKey("streams:203.0.113.10"),
      p_limit: 5,
      p_window_seconds: 60,
      p_now: "2026-06-19T00:00:00.000Z"
    });
    expect(JSON.stringify(rpc.mock.calls[0])).not.toContain("203.0.113.10");
  });

  it("changes persisted bucket hashes when RATE_LIMIT_KEY_SALT changes", () => {
    const key = "streams:203.0.113.10";
    const unsalted = hashRateLimitKey(key);

    vi.stubEnv("RATE_LIMIT_KEY_SALT", "salt-a-" + "a".repeat(32));
    const saltedA = hashRateLimitKey(key);
    vi.stubEnv("RATE_LIMIT_KEY_SALT", "salt-b-" + "b".repeat(32));
    const saltedB = hashRateLimitKey(key);

    expect(saltedA).not.toBe(unsalted);
    expect(saltedB).not.toBe(saltedA);
    expect(saltedA).toMatch(/^[a-f0-9]{64}$/u);
    expect(saltedB).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("falls back to memory rate limiting when the Supabase backend is unavailable", async () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "supabase");
    mocks.createSupabaseServiceClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "function missing" }
      })
    });

    const decision = await checkRequestRateLimit(
      new Request("https://app.example/api/streams"),
      {
        scope: "streams",
        limit: 1,
        windowMs: 60_000
      }
    );

    expect(decision.allowed).toBe(true);
    expect(decision.backend).toBe("memory");
  });
});
