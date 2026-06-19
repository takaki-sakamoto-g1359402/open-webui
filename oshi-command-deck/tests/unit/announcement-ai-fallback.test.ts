import { afterEach, describe, expect, it, vi } from "vitest";
import { parseAnnouncementTextWithAiFallback } from "@/lib/adapters/announcement-ai-fallback";

describe("announcement AI fallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not call the network when the fallback is not configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubEnv("AI_PARSE_FALLBACK_ENABLED", "false");

    const parsed = await parseAnnouncementTextWithAiFallback(
      "collab stream feat. Elira at 9pm JST",
      new Date("2026-06-19T00:00:00Z"),
      "Asia/Tokyo"
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(parsed.aiFallback).toMatchObject({
      status: "not_configured",
      reason: "disabled"
    });
  });

  it("merges only evidence-backed AI candidates", async () => {
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

    const parsed = await parseAnnouncementTextWithAiFallback(
      "collab stream feat. Elira Pendora at 9pm JST",
      new Date("2026-06-19T00:00:00Z"),
      "Asia/Tokyo"
    );

    expect(parsed.scheduledStartUtc).toBe("2026-06-19T12:00:00Z");
    expect(parsed.collaborators).toEqual(["Elira Pendora"]);
    expect(parsed.evidence).toContain("ai-fallback");
    expect(parsed.aiFallback).toMatchObject({ status: "used", model: "test-model" });
  });

  it("rejects AI candidates without source-text evidence", async () => {
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
              collaborators: [{ value: "Invented Person", evidence: "not in the post" }],
              tbd: null,
              scheduledStartUtc: null
            })
          }),
          { status: 200 }
        )
      )
    );

    const parsed = await parseAnnouncementTextWithAiFallback(
      "collab stream tonight",
      new Date("2026-06-19T00:00:00Z"),
      "Asia/Tokyo"
    );

    expect(parsed.collaborators).toEqual([]);
    expect(parsed.aiFallback).toMatchObject({ status: "invalid" });
  });
});
