import { clamp } from "@/lib/utils";
import { getTalentName } from "./filtering";
import { isStale } from "./time";
import type { Livestream, UserPreferences } from "./types";

export type AlertReasonCode =
  | "live"
  | "upcoming"
  | "minecraft"
  | "collaboration"
  | "favorite_talent"
  | "favorite_category"
  | "favorite_language"
  | "favorite_collaborator"
  | "stale"
  | "low_confidence"
  | "unverified";

export type AlertDeliveryState = "push_ready" | "local_only" | "needs_review";

export type AlertQueueItem = {
  stream: Livestream;
  deliveryState: AlertDeliveryState;
  dueAtUtc: string;
  priority: number;
  reasons: Array<{
    code: AlertReasonCode;
    evidence: string;
  }>;
};

export type BuildAlertQueueOptions = {
  pushConfigured?: boolean;
  upcomingWindowMinutes?: number;
  minPushConfidence?: number;
};

export function buildAlertQueue(
  streams: Livestream[],
  preferences: UserPreferences,
  now = new Date(),
  options: BuildAlertQueueOptions = {}
): AlertQueueItem[] {
  const upcomingWindowMinutes = options.upcomingWindowMinutes ?? 180;
  const minPushConfidence = options.minPushConfidence ?? 0.5;
  const favoriteTalentNames = preferences.favoriteTalentIds.map(getTalentName);

  return streams
    .filter((stream) => !preferences.archivedEventIds.includes(stream.id))
    .filter((stream) => stream.status !== "ended")
    .map((stream) => {
      const reasons: AlertQueueItem["reasons"] = [];
      let priority = 0;

      const startsAt = stream.actualStartUtc ?? stream.scheduledStartUtc;
      const minutesUntilStart = startsAt
        ? (new Date(startsAt).getTime() - now.getTime()) / 60_000
        : undefined;
      const stale = isStale(stream.lastCheckedUtc, stream.staleAfterMinutes, now);
      const favoriteTalent = preferences.favoriteTalentIds.includes(stream.talentId);
      const favoriteCategory = preferences.favoriteCategories.includes(stream.category);
      const favoriteLanguage = stream.languages.some((language) =>
        preferences.favoriteLanguages.includes(language)
      );
      const favoriteCollaborator = stream.collaborators.some((collaborator) =>
        favoriteTalentNames.some((name) => collaborator.toLowerCase() === name.toLowerCase())
      );

      if (stream.status === "live" && preferences.alertTypes.live) {
        priority += 50;
        reasons.push({ code: "live", evidence: stream.actualStartUtc ?? stream.lastCheckedUtc });
      }

      if (
        stream.status === "scheduled" &&
        preferences.alertTypes.upcoming &&
        minutesUntilStart !== undefined &&
        minutesUntilStart >= 0 &&
        minutesUntilStart <= upcomingWindowMinutes
      ) {
        priority += 35;
        reasons.push({ code: "upcoming", evidence: `${Math.round(minutesUntilStart)}m` });
      }

      if (stream.category === "minecraft" && preferences.alertTypes.minecraft) {
        priority += 20;
        reasons.push({ code: "minecraft", evidence: stream.category });
      }

      if (
        preferences.alertTypes.collaboration &&
        (stream.category === "collaboration" || stream.collaborators.length > 0)
      ) {
        priority += 16;
        reasons.push({
          code: "collaboration",
          evidence: stream.collaborators.join(", ") || stream.category
        });
      }

      if (favoriteTalent) {
        priority += 20;
        reasons.push({ code: "favorite_talent", evidence: getTalentName(stream.talentId) });
      }

      if (favoriteCategory) {
        priority += 10;
        reasons.push({ code: "favorite_category", evidence: stream.category });
      }

      if (favoriteLanguage) {
        priority += 6;
        reasons.push({ code: "favorite_language", evidence: stream.languages.join(", ") });
      }

      if (favoriteCollaborator) {
        priority += 12;
        reasons.push({
          code: "favorite_collaborator",
          evidence: stream.collaborators.join(", ")
        });
      }

      if (stale) {
        priority -= 30;
        reasons.push({ code: "stale", evidence: stream.lastCheckedUtc });
      }

      if (stream.confidence < minPushConfidence) {
        priority -= 10;
        reasons.push({ code: "low_confidence", evidence: `${Math.round(stream.confidence * 100)}%` });
      }

      if (stream.status === "tbd" || stream.status === "unverified") {
        priority -= 10;
        reasons.push({ code: "unverified", evidence: stream.status });
      }

      const hasEnabledAlertType = reasons.some((reason) =>
        ["live", "upcoming", "minecraft", "collaboration"].includes(reason.code)
      );
      const hasFavoriteSignal =
        favoriteTalent || favoriteCategory || favoriteLanguage || favoriteCollaborator;

      if (!hasEnabledAlertType || !hasFavoriteSignal) {
        return undefined;
      }

      return {
        stream,
        deliveryState: getDeliveryState({
          pushConfigured: Boolean(options.pushConfigured),
          stale,
          confidence: stream.confidence,
          status: stream.status,
          minPushConfidence
        }),
        dueAtUtc: startsAt ?? stream.lastCheckedUtc,
        priority: clamp(priority, 0, 100),
        reasons
      };
    })
    .filter((item): item is AlertQueueItem => Boolean(item))
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }
      return new Date(left.dueAtUtc).getTime() - new Date(right.dueAtUtc).getTime();
    });
}

function getDeliveryState({
  pushConfigured,
  stale,
  confidence,
  status,
  minPushConfidence
}: {
  pushConfigured: boolean;
  stale: boolean;
  confidence: number;
  status: Livestream["status"];
  minPushConfidence: number;
}): AlertDeliveryState {
  if (stale || confidence < minPushConfidence || status === "tbd" || status === "unverified") {
    return "needs_review";
  }

  return pushConfigured ? "push_ready" : "local_only";
}
