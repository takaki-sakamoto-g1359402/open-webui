import type { Livestream, SourceHealth } from "./types";

export const offlineStreamsSnapshotStorageKey = "oshi-command-deck.offline-streams.v1";

export type OfflineStreamsSnapshot = {
  cachedAtUtc: string;
  mode: "demo" | "live_api" | "mixed_degraded";
  streams: Livestream[];
  sourceHealth: SourceHealth[];
};

type StreamsSnapshotInput = {
  mode: OfflineStreamsSnapshot["mode"];
  streams: Livestream[];
  sourceHealth: SourceHealth[];
};

export function createOfflineStreamsSnapshot(
  input: StreamsSnapshotInput,
  cachedAtUtc: string
): OfflineStreamsSnapshot {
  return {
    cachedAtUtc,
    mode: input.mode,
    streams: input.streams,
    sourceHealth: input.sourceHealth
  };
}

export function parseOfflineStreamsSnapshot(value: string | null): OfflineStreamsSnapshot | null {
  if (!value) {
    return null;
  }

  try {
    return normalizeOfflineStreamsSnapshot(JSON.parse(value));
  } catch {
    return null;
  }
}

export function normalizeOfflineStreamsSnapshot(value: unknown): OfflineStreamsSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isSnapshotMode(value.mode) || !isIsoDate(value.cachedAtUtc)) {
    return null;
  }

  if (!Array.isArray(value.streams) || !Array.isArray(value.sourceHealth)) {
    return null;
  }

  if (!value.streams.every(isLivestreamLike) || !value.sourceHealth.every(isSourceHealthLike)) {
    return null;
  }

  return {
    cachedAtUtc: value.cachedAtUtc,
    mode: value.mode,
    streams: value.streams,
    sourceHealth: value.sourceHealth
  };
}

export function markSourceHealthAsOfflineCached(
  sourceHealth: SourceHealth[],
  cachedAtUtc: string,
  staleCoveragePrefix: string
): SourceHealth[] {
  if (sourceHealth.length === 0) {
    return [
      {
        provider: "future",
        state: "stale",
        coverageCode: "offline.cached_snapshot",
        coverageLimit: staleCoveragePrefix,
        lastCheckedUtc: cachedAtUtc,
        confidence: 0.25
      }
    ];
  }

  return sourceHealth.map((item) => ({
    ...item,
    state: "stale",
    coverageCode: "offline.cached_snapshot",
    coverageParams: undefined,
    coverageLimit: `${staleCoveragePrefix} ${item.coverageLimit}`.trim(),
    lastCheckedUtc: item.lastCheckedUtc ?? cachedAtUtc,
    confidence: Math.min(item.confidence, 0.5)
  }));
}

function isSnapshotMode(value: unknown): value is OfflineStreamsSnapshot["mode"] {
  return value === "demo" || value === "live_api" || value === "mixed_degraded";
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isLivestreamLike(value: unknown): value is Livestream {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.canonicalKey === "string" &&
    typeof value.titleOriginal === "string" &&
    typeof value.talentId === "string" &&
    typeof value.category === "string" &&
    typeof value.branch === "string" &&
    Array.isArray(value.languages) &&
    typeof value.status === "string" &&
    Array.isArray(value.sourceLinks) &&
    typeof value.confidence === "number" &&
    typeof value.lastCheckedUtc === "string" &&
    typeof value.staleAfterMinutes === "number"
  );
}

function isSourceHealthLike(value: unknown): value is SourceHealth {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.provider === "string" &&
    typeof value.state === "string" &&
    typeof value.coverageLimit === "string" &&
    typeof value.confidence === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
