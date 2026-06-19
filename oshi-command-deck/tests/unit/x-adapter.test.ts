import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deriveXPostStatus,
  mapXPostToLivestream,
  mapXPostToLivestreamWithFallback,
  parseXHandleRegistry,
  xAdapter,
  type XPostResource
} from "@/lib/adapters/x";

describe("X adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("parses configured handle registry entries", () => {
    expect(
      parseXHandleRegistry(
        JSON.stringify([
          {
            talentId: "kuzuha",
            displayName: "Kuzuha",
            handle: "@kuzuha_example",
            branch: "jp",
            languages: ["ja"],
            tags: ["minecraft"]
          }
        ])
      )
    ).toEqual([
      {
        talentId: "kuzuha",
        displayName: "Kuzuha",
        handle: "kuzuha_example",
        branch: "jp",
        languages: ["ja"],
        tags: ["minecraft"]
      }
    ]);
  });

  it("maps X announcement context to a normalized livestream", () => {
    const post: XPostResource = {
      id: "1900000000000000000",
      text: "参加者: Elira Pendora\n明日 22時 JST から Minecraft コラボ配信です https://youtu.be/example",
      created_at: "2026-06-19T10:00:00Z",
      lang: "ja",
      entities: {
        urls: [{ expanded_url: "https://www.youtube.com/watch?v=example" }],
        mentions: [{ username: "Elira", name: "Elira Pendora" }]
      }
    };

    const stream = mapXPostToLivestream(
      post,
      {
        talentId: "kuzuha",
        displayName: "Kuzuha",
        handle: "kuzuha_example",
        branch: "jp",
        languages: ["ja"],
        tags: ["game"]
      },
      new Date("2026-06-19T03:00:00Z")
    );

    expect(stream).toMatchObject({
      id: "x-1900000000000000000",
      canonicalKey: "x:1900000000000000000",
      status: "scheduled",
      category: "minecraft",
      scheduledStartUtc: "2026-06-20T13:00:00Z",
      demo: false
    });
    expect(stream.sourceLinks.map((link) => link.provider)).toEqual(["x", "x", "x"]);
    expect(stream.collaborators).toEqual(["Elira Pendora"]);
  });

  it("derives TBD and cancellation-adjacent states without inventing live status", () => {
    expect(deriveXPostStatus("時間未定です", true)).toBe("tbd");
    expect(deriveXPostStatus("本日の配信は延期です", false, "2026-06-19T12:00:00Z")).toBe(
      "unverified"
    );
  });

  it("preserves direct cancellation wording as provenance evidence", () => {
    const stream = mapXPostToLivestream(
      {
        id: "1900000000000000003",
        text: "本日の配信は延期です https://www.youtube.com/watch?v=example",
        lang: "ja",
        entities: {
          urls: [{ expanded_url: "https://www.youtube.com/watch?v=example" }]
        }
      },
      {
        talentId: "kuzuha",
        displayName: "Kuzuha",
        handle: "kuzuha_example",
        branch: "jp",
        languages: ["ja"],
        tags: ["game"]
      },
      new Date("2026-06-19T03:00:00Z")
    );

    expect(stream.status).toBe("unverified");
    expect(stream.provenance[0].fields).toContain("cancellation");
    expect(stream.providerErrors.map((error) => error.code)).toContain("cancellation_context");
  });

  it("records validated AI fallback evidence without replacing source text", async () => {
    vi.stubEnv("AI_PARSE_FALLBACK_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              urls: [],
              collaborators: [{ value: "Elira Pendora", evidence: "feat. Elira Pendora" }],
              tbd: null,
              scheduledStartUtc: {
                value: "2026-06-19T12:00:00Z",
                evidence: "9pm JST"
              }
            })
          }),
          { status: 200 }
        )
      )
    );

    const post: XPostResource = {
      id: "1900000000000000001",
      text: "collab stream feat. Elira Pendora at 9pm JST",
      created_at: "2026-06-19T10:00:00Z",
      lang: "en"
    };
    const stream = await mapXPostToLivestreamWithFallback(
      post,
      {
        talentId: "kuzuha",
        displayName: "Kuzuha",
        handle: "kuzuha_example",
        branch: "jp",
        languages: ["en"],
        tags: ["game"]
      },
      new Date("2026-06-19T00:00:00Z")
    );

    expect(stream.titleOriginal).toBe("collab stream feat. Elira Pendora at 9pm JST");
    expect(stream.scheduledStartUtc).toBe("2026-06-19T12:00:00Z");
    expect(stream.collaborators).toEqual(["Elira Pendora"]);
    expect(stream.provenance[0].rawExcerpt).toContain("aiFallback=used");
  });

  it("keeps common explicit X time phrases deterministic before AI fallback", async () => {
    vi.stubEnv("AI_PARSE_FALLBACK_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const post: XPostResource = {
      id: "1900000000000000002",
      text: "today at 9pm JST Minecraft stream https://www.youtube.com/watch?v=example",
      created_at: "2026-06-19T10:00:00Z",
      lang: "en"
    };
    const stream = await mapXPostToLivestreamWithFallback(
      post,
      {
        talentId: "kuzuha",
        displayName: "Kuzuha",
        handle: "kuzuha_example",
        branch: "jp",
        languages: ["en"],
        tags: ["game"]
      },
      new Date("2026-06-19T00:00:00Z")
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(stream.scheduledStartUtc).toBe("2026-06-19T12:00:00Z");
    expect(stream.provenance[0].rawExcerpt).toContain("aiFallback=not_needed");
  });

  it("does not call the network without credentials", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubEnv("X_BEARER_TOKEN", "");

    const result = await xAdapter.run({
      now: new Date("2026-06-19T12:00:00Z"),
      dryRun: true,
      demoMode: false
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.health.state).toBe("missing_credentials");
    expect(result.streams).toEqual([]);
  });

  it("surfaces official API rate-limit errors", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    vi.stubEnv(
      "X_HANDLES_JSON",
      JSON.stringify([
        {
          talentId: "kuzuha",
          displayName: "Kuzuha",
          handle: "kuzuha_example",
          branch: "jp",
          languages: ["ja"],
          tags: ["game"]
        }
      ])
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            errors: [{ title: "Too Many Requests", detail: "Rate limit exceeded." }]
          }),
          {
            status: 429,
            headers: {
              "x-rate-limit-remaining": "0",
              "x-rate-limit-reset": "1780000000"
            }
          }
        )
      )
    );

    const result = await xAdapter.run({
      now: new Date("2026-06-19T12:00:00Z"),
      dryRun: true,
      demoMode: false
    });

    expect(result.errors[0]).toMatchObject({
      provider: "x",
      code: "Too Many Requests",
      transient: true
    });
    expect(result.health.state).toBe("stale");
  });

  it("respects Retry-After on X rate limits instead of retrying immediately", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    vi.stubEnv(
      "X_HANDLES_JSON",
      JSON.stringify([
        {
          talentId: "kuzuha",
          displayName: "Kuzuha",
          handle: "kuzuha_example",
          branch: "jp",
          languages: ["ja"],
          tags: ["game"]
        }
      ])
    );
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            errors: [{ title: "Too Many Requests", detail: "Retry later." }]
          }),
          {
            status: 429,
            headers: {
              "retry-after": "120",
              "x-rate-limit-remaining": "0"
            }
          }
        )
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await xAdapter.run({
      now: new Date("2026-06-19T12:00:00Z"),
      dryRun: true,
      demoMode: false
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.errors[0]).toMatchObject({
      provider: "x",
      code: "Too Many Requests",
      transient: true
    });
    expect(result.errors[0].retryAfterUtc).toBeTruthy();
  });

  it("stops remaining X batches after a provider-level rate-limit rejection", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    vi.stubEnv("X_HANDLES_PER_QUERY", "1");
    vi.stubEnv(
      "X_HANDLES_JSON",
      JSON.stringify([
        {
          talentId: "kuzuha",
          displayName: "Kuzuha",
          handle: "kuzuha_example",
          branch: "jp",
          languages: ["ja"],
          tags: ["game"]
        },
        {
          talentId: "elira-pendora",
          displayName: "Elira Pendora",
          handle: "elira_example",
          branch: "en",
          languages: ["en"],
          tags: ["game"]
        }
      ])
    );
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            errors: [{ title: "Too Many Requests", detail: "Retry later." }]
          }),
          {
            status: 429,
            headers: {
              "retry-after": "120",
              "x-rate-limit-remaining": "0"
            }
          }
        )
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await xAdapter.run({
      now: new Date("2026-06-19T12:00:00Z"),
      dryRun: true,
      demoMode: false
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.requestCount).toBe(1);
    expect(result.errors[0]).toMatchObject({
      provider: "x",
      code: "Too Many Requests",
      transient: true
    });
    expect(result.health.coverageLimit).toContain("stopped early");
  });

  it("records a cooldown when a successful X response exhausts the rate-limit window", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    vi.stubEnv(
      "X_HANDLES_JSON",
      JSON.stringify([
        {
          talentId: "kuzuha",
          displayName: "Kuzuha",
          handle: "kuzuha_example",
          branch: "jp",
          languages: ["ja"],
          tags: ["minecraft"]
        }
      ])
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: "1900000000000000004",
                text: "Minecraft stream today at 9pm JST https://www.youtube.com/watch?v=example",
                author_id: "user-1",
                created_at: "2026-06-19T10:00:00Z",
                lang: "en"
              }
            ],
            includes: {
              users: [{ id: "user-1", username: "kuzuha_example", name: "Kuzuha" }]
            },
            meta: { result_count: 1 }
          }),
          {
            status: 200,
            headers: {
              "x-rate-limit-remaining": "0",
              "x-rate-limit-reset": "1780000000"
            }
          }
        )
      )
    );

    const result = await xAdapter.run({
      now: new Date("2026-06-19T00:00:00Z"),
      dryRun: true,
      demoMode: false
    });

    expect(result.streams).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      provider: "x",
      code: "rate_limit_exhausted",
      transient: true,
      retryAfterUtc: "2026-05-28T20:26:40Z"
    });
    expect(result.health.state).toBe("degraded");
    expect(result.health.coverageLimit).toContain("stopped early");
  });

  it("drops X posts whose author_id is not verified through includes.users", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    vi.stubEnv(
      "X_HANDLES_JSON",
      JSON.stringify([
        {
          talentId: "kuzuha",
          displayName: "Kuzuha",
          handle: "kuzuha_example",
          branch: "jp",
          languages: ["ja"],
          tags: ["minecraft"]
        }
      ])
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: "1900000000000000005",
                text: "@kuzuha_example Minecraft stream today at 9pm JST https://www.youtube.com/watch?v=example",
                author_id: "unknown-user",
                created_at: "2026-06-19T10:00:00Z",
                lang: "en"
              }
            ],
            includes: {
              users: [{ id: "different-user", username: "kuzuha_example", name: "Kuzuha" }]
            },
            meta: { result_count: 1 }
          }),
          {
            status: 200,
            headers: {
              "x-rate-limit-remaining": "12"
            }
          }
        )
      )
    );

    const result = await xAdapter.run({
      now: new Date("2026-06-19T00:00:00Z"),
      dryRun: true,
      demoMode: false
    });

    expect(result.streams).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        provider: "x",
        code: "x_author_unmatched",
        transient: false
      })
    ]);
  });
});
