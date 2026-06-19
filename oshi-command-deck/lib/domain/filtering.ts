import { demoTalents } from "./registry";
import { isTodayInTimezone } from "./time";
import type { Livestream, UserPreferences } from "./types";

export function getTalentName(talentId: string) {
  return demoTalents.find((talent) => talent.id === talentId)?.displayName ?? talentId;
}

export function getTalentById(talentId: string) {
  return demoTalents.find((talent) => talent.id === talentId);
}

export function filterTodayStreams(
  streams: Livestream[],
  preferences: UserPreferences,
  now: Date
) {
  const query = preferences.search.trim().toLowerCase();

  return streams
    .filter((stream) => {
      const relevantTime = stream.scheduledStartUtc ?? stream.actualStartUtc ?? stream.endedAtUtc;
      return (
        stream.status === "tbd" ||
        stream.status === "unverified" ||
        isTodayInTimezone(relevantTime, now, preferences.timezone)
      );
    })
    .filter((stream) => {
      const talent = getTalentById(stream.talentId);
      if (preferences.favoritesOnly && !preferences.favoriteTalentIds.includes(stream.talentId)) {
        return false;
      }
      if (preferences.branchFilter !== "all" && stream.branch !== preferences.branchFilter) {
        return false;
      }
      if (
        preferences.languageFilter !== "all" &&
        !stream.languages.includes(preferences.languageFilter)
      ) {
        return false;
      }
      if (
        preferences.categoryFilter !== "all" &&
        stream.category !== preferences.categoryFilter
      ) {
        return false;
      }
      if (preferences.statusFilter !== "all" && stream.status !== preferences.statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }

      return [
        stream.titleOriginal,
        talent?.displayName,
        stream.category,
        stream.status,
        stream.branch,
        ...stream.languages,
        ...stream.collaborators
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((left, right) => {
      const leftTime = new Date(
        left.actualStartUtc ?? left.scheduledStartUtc ?? left.lastCheckedUtc
      ).getTime();
      const rightTime = new Date(
        right.actualStartUtc ?? right.scheduledStartUtc ?? right.lastCheckedUtc
      ).getTime();
      return leftTime - rightTime;
    });
}

export function detectOverlaps(streams: Livestream[], windowMinutes = 45) {
  const overlaps = new Map<string, string[]>();

  for (const stream of streams) {
    overlaps.set(stream.id, []);
  }

  for (let i = 0; i < streams.length; i += 1) {
    for (let j = i + 1; j < streams.length; j += 1) {
      const left = streams[i];
      const right = streams[j];
      const leftTime = left.actualStartUtc ?? left.scheduledStartUtc;
      const rightTime = right.actualStartUtc ?? right.scheduledStartUtc;
      if (!leftTime || !rightTime) {
        continue;
      }

      const diff = Math.abs(new Date(leftTime).getTime() - new Date(rightTime).getTime());
      const sameTalent = left.talentId === right.talentId;
      const sharedCollaborator =
        left.collaborators.some((name) => right.collaborators.includes(name)) ||
        left.collaborators.includes(getTalentName(right.talentId)) ||
        right.collaborators.includes(getTalentName(left.talentId));

      if (diff <= windowMinutes * 60_000 && !sameTalent && sharedCollaborator) {
        overlaps.get(left.id)?.push(right.id);
        overlaps.get(right.id)?.push(left.id);
      }
    }
  }

  return overlaps;
}

export function getAvailableLanguages(streams: Livestream[]) {
  return [...new Set(streams.flatMap((stream) => stream.languages))].sort((a, b) =>
    a.localeCompare(b)
  );
}
