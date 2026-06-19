import { describe, expect, it } from "vitest";
import {
  createOfflineStreamsSnapshot,
  markSourceHealthAsOfflineCached,
  parseOfflineStreamsSnapshot
} from "@/lib/domain/offline-cache";
import { getDemoStreams } from "@/lib/domain/fixtures";
import type { SourceHealth } from "@/lib/domain/types";

describe("offline stream cache", () => {
  const cachedAtUtc = "2026-06-19T12:00:00.000Z";
  const sourceHealth: SourceHealth[] = [
    {
      provider: "youtube",
      state: "healthy",
      coverageLimit: "YouTube API fixture coverage.",
      lastCheckedUtc: "2026-06-19T11:55:00.000Z",
      confidence: 0.91
    }
  ];

  it("creates and parses a last-known streams snapshot", () => {
    const snapshot = createOfflineStreamsSnapshot(
      {
        mode: "demo",
        streams: getDemoStreams(new Date(cachedAtUtc)),
        sourceHealth
      },
      cachedAtUtc
    );

    const parsed = parseOfflineStreamsSnapshot(JSON.stringify(snapshot));

    expect(parsed?.mode).toBe("demo");
    expect(parsed?.cachedAtUtc).toBe(cachedAtUtc);
    expect(parsed?.streams.length).toBeGreaterThan(0);
    expect(parsed?.sourceHealth[0]?.provider).toBe("youtube");
  });

  it("rejects malformed or incomplete snapshots", () => {
    expect(parseOfflineStreamsSnapshot(null)).toBeNull();
    expect(parseOfflineStreamsSnapshot("{")).toBeNull();
    expect(parseOfflineStreamsSnapshot(JSON.stringify({ mode: "demo" }))).toBeNull();
    expect(
      parseOfflineStreamsSnapshot(
        JSON.stringify({
          mode: "live_api",
          cachedAtUtc,
          streams: [{ id: "missing-fields" }],
          sourceHealth
        })
      )
    ).toBeNull();
  });

  it("downgrades cached source health to stale with conservative confidence", () => {
    const offlineHealth = markSourceHealthAsOfflineCached(
      sourceHealth,
      cachedAtUtc,
      "Serving a read-only cached snapshot; stale until refreshed."
    );

    expect(offlineHealth[0]).toMatchObject({
      provider: "youtube",
      state: "stale",
      lastCheckedUtc: "2026-06-19T11:55:00.000Z",
      confidence: 0.5
    });
    expect(offlineHealth[0]?.coverageLimit).toContain("read-only cached snapshot");
    expect(offlineHealth[0]?.coverageLimit).toContain("YouTube API fixture coverage");
  });
});
