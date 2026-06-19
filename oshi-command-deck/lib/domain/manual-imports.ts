import { parseAnnouncementText } from "./parsing";
import { demoTalents } from "./registry";
import { parseDateTimeLocalInTimezone, toUtcIso } from "./time";
import type { Livestream, StreamCategory, StreamStatus } from "./types";

export const manualImportsStorageKey = "oshi-command-deck.manual-imports.v1";

export type ManualImportInput = {
  titleOriginal: string;
  talentId: string;
  category: StreamCategory;
  status: StreamStatus;
  scheduledLocal: string;
  timezone: string;
  sourceUrl: string;
  collaboratorsText: string;
  languagesText: string;
  notes: string;
};

export function createManualStreamFromInput(
  input: ManualImportInput,
  now = new Date()
): Livestream {
  const talent = demoTalents.find((item) => item.id === input.talentId) ?? demoTalents[0];
  const parsed = parseAnnouncementText(
    `${input.titleOriginal}\n${input.collaboratorsText}\n${input.notes}\n${input.sourceUrl}`,
    now,
    input.timezone
  );
  const scheduled = input.scheduledLocal
    ? parseDateTimeLocalInTimezone(input.scheduledLocal, input.timezone)
    : parsed.scheduledStartUtc
      ? new Date(parsed.scheduledStartUtc)
      : undefined;
  const languages = input.languagesText
    .split(/[,、\s]+/u)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const collaborators = [
    ...new Set([
      ...parsed.collaborators,
      ...input.collaboratorsText
        .split(/[,/&、・\n]+/u)
        .map((value) => value.trim())
        .filter((value) => value.length > 1)
    ])
  ].slice(0, 12);
  const sourceUrl = normalizeManualUrl(input.sourceUrl);
  const id = `local-manual-${cryptoSafeId(input.titleOriginal, now)}`;

  return {
    id,
    canonicalKey: `manual:${id}`,
    talentId: talent.id,
    titleOriginal: input.titleOriginal.trim(),
    category: input.category,
    branch: talent.branch,
    languages: languages.length > 0 ? languages : talent.languages,
    status: input.status,
    scheduledStartUtc: scheduled ? toUtcIso(scheduled) : undefined,
    collaborators,
    sourceLinks: [
      {
        provider: "manual",
        url: sourceUrl,
        label: "Manual import",
        embeddable: false
      }
    ],
    confidence: sourceUrl.startsWith("http") ? 0.64 : 0.52,
    lastCheckedUtc: toUtcIso(now),
    staleAfterMinutes: 180,
    visibility: "unknown",
    demo: false,
    provenance: [
      {
        provider: "manual",
        sourceId: id,
        fetchedAtUtc: toUtcIso(now),
        url: sourceUrl.startsWith("http") ? sourceUrl : undefined,
        fields: ["title", "scheduledStart", "context", "collaborators", "category"],
        confidence: sourceUrl.startsWith("http") ? 0.64 : 0.52,
        rawExcerpt: input.notes.trim() || "Local manual import"
      }
    ],
    providerErrors: parsed.tbd
      ? [
          {
            provider: "manual",
            code: "tbd_wording",
            message: "TBD wording detected in manual import.",
            transient: false
          }
        ]
      : [],
    conflictIds: []
  };
}

export function readManualStreamsFromStorage() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(manualImportsStorageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Livestream[];
    return parsed.filter(isStoredManualStream);
  } catch {
    return [];
  }
}

export function writeManualStreamsToStorage(streams: Livestream[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(manualImportsStorageKey, JSON.stringify(streams));
}

function normalizeManualUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return "manual://local/import";
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return "manual://local/import";
  }

  return "manual://local/import";
}

function cryptoSafeId(seed: string, now: Date) {
  const text = `${seed}-${now.toISOString()}-${Math.random().toString(36).slice(2)}`;
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 72);
}

function isStoredManualStream(value: unknown): value is Livestream {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<Livestream>;
  return (
    typeof record.id === "string" &&
    record.id.startsWith("local-manual-") &&
    typeof record.titleOriginal === "string" &&
    record.sourceLinks?.every((link) => link.provider === "manual") === true
  );
}
