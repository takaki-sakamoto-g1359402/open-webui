import { describe, expect, it } from "vitest";
import { decideDedupe, normalizeTitle } from "@/lib/domain/dedupe";
import { getDemoStreams } from "@/lib/domain/fixtures";

describe("dedupe", () => {
  const streams = getDemoStreams(new Date("2026-06-19T12:00:00Z"));

  it("normalizes bracketed stream titles", () => {
    expect(normalizeTitle("【Minecraft】夜の建築!!!")).toBe("夜の建築");
  });

  it("matches by provider ID first", () => {
    const decision = decideDedupe(streams, {
      provider: "youtube",
      providerItemId: "DEMO_LIVE_MINECRAFT_KUZUHA",
      talentId: "kuzuha",
      title: "Different title",
      scheduledStartUtc: streams[0].scheduledStartUtc
    });

    expect(decision).toMatchObject({ action: "same", reason: "provider_id" });
  });

  it("matches by any incoming source URL, not only the primary link", () => {
    const decision = decideDedupe(streams, {
      provider: "x",
      providerItemId: "1900000000000000000",
      urls: [
        "https://x.com/kuzuha_example/status/1900000000000000000",
        streams[0].sourceLinks[0].url
      ],
      talentId: "kuzuha",
      title: "Announcement links the existing YouTube waiting room",
      scheduledStartUtc: streams[0].scheduledStartUtc
    });

    expect(decision).toMatchObject({ action: "same", reason: "url", eventId: streams[0].id });
  });

  it("does not merge same title for different talents", () => {
    const decision = decideDedupe(streams, {
      provider: "manual",
      talentId: "tsukino-mito",
      title: streams[0].titleOriginal,
      scheduledStartUtc: streams[0].scheduledStartUtc
    });

    expect(decision).toEqual({ action: "new", reason: "no_match" });
  });
});
