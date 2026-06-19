import { clamp } from "@/lib/utils";
import { detectOverlaps, getTalentName } from "./filtering";
import { isStale } from "./time";
import type { Livestream, UserPreferences, WatchRouteItem, WatchRouteReason } from "./types";

function pushReason(
  reasons: WatchRouteReason[],
  code: WatchRouteReason["code"],
  weight: number,
  evidence: string
) {
  reasons.push({ code, weight, evidence });
}

export function buildWatchRoute(
  streams: Livestream[],
  preferences: UserPreferences,
  now = new Date()
): WatchRouteItem[] {
  const overlaps = detectOverlaps(streams);

  return streams
    .filter((stream) => !preferences.archivedEventIds.includes(stream.id))
    .map((stream) => {
      const reasons: WatchRouteReason[] = [];
      let score = 0;

      if (stream.status === "live") {
        score += 45;
        pushReason(reasons, "live_now", 45, stream.actualStartUtc ?? stream.lastCheckedUtc);
      }

      if (preferences.favoriteTalentIds.includes(stream.talentId)) {
        score += 30;
        pushReason(reasons, "favorite_talent", 30, getTalentName(stream.talentId));
      }

      if (preferences.favoriteCategories.includes(stream.category)) {
        score += 18;
        pushReason(reasons, "favorite_category", 18, stream.category);
      }

      if (stream.category === "minecraft" && preferences.alertTypes.minecraft) {
        score += 16;
        pushReason(reasons, "minecraft_priority", 16, "minecraft_alert_enabled");
      }

      if (stream.collaborators.length > 0 && preferences.alertTypes.collaboration) {
        score += 12;
        pushReason(reasons, "collaboration", 12, stream.collaborators.join(", "));
      }

      const overlapIds = overlaps.get(stream.id) ?? [];
      if (overlapIds.length > 0) {
        score += 10;
        pushReason(reasons, "overlap", 10, overlapIds.join(","));
      }

      if (stream.scheduledStartUtc) {
        const minutesUntil =
          (new Date(stream.scheduledStartUtc).getTime() - now.getTime()) / 60_000;
        if (minutesUntil >= 0 && minutesUntil <= 90) {
          score += 14;
          pushReason(
            reasons,
            "starting_soon",
            14,
            String(Math.round(minutesUntil))
          );
        }
      }

      if (stream.confidence >= 0.8) {
        score += 8;
        pushReason(reasons, "high_confidence", 8, String(stream.confidence));
      }

      if (stream.adminCorrection) {
        score += 8;
        pushReason(reasons, "manual_correction", 8, stream.adminCorrection.reason);
      }

      if (isStale(stream.lastCheckedUtc, stream.staleAfterMinutes, now)) {
        score -= 25;
        pushReason(reasons, "stale_penalty", -25, stream.lastCheckedUtc);
      }

      return {
        stream,
        score: clamp(score, 0, 100),
        reasons,
        overlaps: overlapIds
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      const leftTime = new Date(
        left.stream.actualStartUtc ?? left.stream.scheduledStartUtc ?? left.stream.lastCheckedUtc
      ).getTime();
      const rightTime = new Date(
        right.stream.actualStartUtc ?? right.stream.scheduledStartUtc ?? right.stream.lastCheckedUtc
      ).getTime();
      return leftTime - rightTime;
    });
}
