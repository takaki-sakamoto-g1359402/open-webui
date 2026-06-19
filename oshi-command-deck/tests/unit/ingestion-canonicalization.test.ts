import { describe, expect, it } from "vitest";
import { canonicalizeAdapterResults } from "@/lib/adapters";
import { getDemoStreams } from "@/lib/domain/fixtures";
import type { AdapterRunResult } from "@/lib/adapters/types";
import type { Livestream, Provider } from "@/lib/domain/types";

describe("ingestion canonicalization", () => {
  it("merges duplicate X context into the YouTube canonical stream without dropping evidence", () => {
    const youtubeStream = getDemoStreams(new Date("2026-06-19T12:00:00Z"))[1];
    const xStream: Livestream = {
      ...youtubeStream,
      id: "x-announcement-duplicate",
      canonicalKey: "x:1900000000000000999",
      titleOriginal: "Schedule update: POV may move, with Finana",
      status: "unverified",
      collaborators: ["Finana Ryugu"],
      sourceLinks: [
        {
          provider: "x",
          url: "https://x.com/kuzuha_example/status/1900000000000000999",
          label: "X",
          embeddable: false
        },
        {
          provider: "x",
          url: youtubeStream.sourceLinks[0].url,
          label: "Linked source",
          embeddable: false
        }
      ],
      confidence: 0.72,
      lastCheckedUtc: "2026-06-19T12:05:00Z",
      provenance: [
        {
          provider: "x",
          sourceId: "1900000000000000999",
          fetchedAtUtc: "2026-06-19T12:05:00Z",
          url: "https://x.com/kuzuha_example/status/1900000000000000999",
          fields: ["context", "collaborators"],
          confidence: 0.72,
          rawExcerpt: "Schedule update: POV may move, with Finana"
        }
      ],
      providerErrors: [
        {
          provider: "x",
          code: "announcement_requires_review",
          message: "X context requires review before updating schedule facts.",
          transient: false
        }
      ],
      conflictIds: []
    };

    const summary = canonicalizeAdapterResults(
      [adapterResult("youtube", [youtubeStream]), adapterResult("x", [xStream])],
      {
        now: new Date("2026-06-19T12:00:00Z"),
        demoMode: false
      }
    );

    expect(summary.canonicalStreams).toHaveLength(1);
    const [canonical] = summary.canonicalStreams;
    expect(canonical.canonicalKey).toBe(youtubeStream.canonicalKey);
    expect(canonical.titleOriginal).toBe(youtubeStream.titleOriginal);
    expect(canonical.status).toBe(youtubeStream.status);
    expect(canonical.sourceLinks.map((link) => link.url)).toContain(youtubeStream.sourceLinks[0].url);
    expect(canonical.sourceLinks.map((link) => link.provider)).toEqual(["youtube", "x", "x"]);
    expect(canonical.provenance.map((item) => item.provider)).toEqual(["youtube", "x"]);
    expect(canonical.collaborators).toEqual([...youtubeStream.collaborators, "Finana Ryugu"]);
    expect(canonical.providerErrors.map((error) => error.code)).toContain(
      "announcement_requires_review"
    );
    expect(canonical.conflictIds).toContain("x-announcement-duplicate");
    expect(summary.dedupeDecisions).toContainEqual({
      streamId: "x-announcement-duplicate",
      action: "same",
      reason: "url",
      eventId: youtubeStream.id
    });
  });

  it("lets direct X cancellation context mark a scheduled YouTube event for review", () => {
    const youtubeStream = {
      ...getDemoStreams(new Date("2026-06-19T12:00:00Z"))[1],
      status: "scheduled" as const
    };
    const xCancellation: Livestream = {
      ...youtubeStream,
      id: "x-cancellation-duplicate",
      canonicalKey: "x:1900000000000001000",
      titleOriginal: "本日の配信は延期です",
      status: "unverified",
      sourceLinks: [
        {
          provider: "x",
          url: "https://x.com/kuzuha_example/status/1900000000000001000",
          label: "X",
          embeddable: false
        },
        {
          provider: "x",
          url: youtubeStream.sourceLinks[0].url,
          label: "Linked source",
          embeddable: false
        }
      ],
      provenance: [
        {
          provider: "x",
          sourceId: "1900000000000001000",
          fetchedAtUtc: "2026-06-19T12:05:00Z",
          url: "https://x.com/kuzuha_example/status/1900000000000001000",
          fields: ["context", "cancellation"],
          confidence: 0.72,
          rawExcerpt: "本日の配信は延期です"
        }
      ],
      providerErrors: [
        {
          provider: "x",
          code: "cancellation_context",
          message: "Cancellation or postponement wording was detected in direct X context.",
          transient: false
        }
      ],
      conflictIds: []
    };

    const summary = canonicalizeAdapterResults(
      [adapterResult("youtube", [youtubeStream]), adapterResult("x", [xCancellation])],
      {
        now: new Date("2026-06-19T12:00:00Z"),
        demoMode: false
      }
    );

    expect(summary.canonicalStreams).toHaveLength(1);
    const [canonical] = summary.canonicalStreams;
    expect(canonical.status).toBe("unverified");
    expect(canonical.titleOriginal).toBe(youtubeStream.titleOriginal);
    expect(canonical.providerErrors.map((error) => error.code)).toContain("cancellation_context");
    expect(canonical.provenance.some((item) => item.fields.includes("cancellation"))).toBe(true);
  });

  it("promotes a later YouTube match to the canonical identity and live-state owner", () => {
    const youtubeStream = {
      ...getDemoStreams(new Date("2026-06-19T12:00:00Z"))[1],
      id: "youtube-authoritative",
      canonicalKey: "youtube:AUTHORITATIVE",
      titleOriginal: "Official YouTube title",
      status: "live" as const,
      sourceLinks: [
        {
          provider: "youtube" as const,
          url: "https://www.youtube.com/watch?v=AUTHORITATIVE",
          label: "YouTube",
          embeddable: true
        }
      ]
    };
    const xFirst: Livestream = {
      ...youtubeStream,
      id: "x-first-announcement",
      canonicalKey: "x:1900000000000001001",
      titleOriginal: "X announcement title",
      status: "scheduled",
      sourceLinks: [
        {
          provider: "x",
          url: "https://x.com/kuzuha_example/status/1900000000000001001",
          label: "X",
          embeddable: false
        },
        {
          provider: "x",
          url: youtubeStream.sourceLinks[0].url,
          label: "Linked source",
          embeddable: false
        }
      ],
      provenance: [
        {
          provider: "x",
          sourceId: "1900000000000001001",
          fetchedAtUtc: "2026-06-19T11:55:00Z",
          url: "https://x.com/kuzuha_example/status/1900000000000001001",
          fields: ["context"],
          confidence: 0.72,
          rawExcerpt: "X announcement title"
        }
      ]
    };

    const summary = canonicalizeAdapterResults(
      [adapterResult("x", [xFirst]), adapterResult("youtube", [youtubeStream])],
      {
        now: new Date("2026-06-19T12:00:00Z"),
        demoMode: false
      }
    );

    expect(summary.canonicalStreams).toHaveLength(1);
    const [canonical] = summary.canonicalStreams;
    expect(canonical.id).toBe("youtube-authoritative");
    expect(canonical.canonicalKey).toBe("youtube:AUTHORITATIVE");
    expect(canonical.titleOriginal).toBe("Official YouTube title");
    expect(canonical.status).toBe("live");
    expect(canonical.sourceLinks.map((link) => link.provider)).toEqual(["x", "x", "youtube"]);
  });
});

function adapterResult(provider: Provider, streams: Livestream[]): AdapterRunResult {
  return {
    provider,
    streams,
    health: {
      provider,
      state: "healthy",
      coverageLimit: "unit test",
      confidence: 1
    },
    errors: [],
    quotaCost: 0,
    requestCount: 0
  };
}
