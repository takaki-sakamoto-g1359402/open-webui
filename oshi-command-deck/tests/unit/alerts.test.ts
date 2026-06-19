import { describe, expect, it } from "vitest";
import { buildAlertQueue } from "@/lib/domain/alerts";
import { getDemoStreams } from "@/lib/domain/fixtures";
import { getDefaultPreferences } from "@/lib/domain/preferences";

describe("alert queue", () => {
  it("prioritizes live favorite Minecraft streams with explainable reasons", () => {
    const now = new Date("2026-06-19T12:00:00Z");
    const queue = buildAlertQueue(getDemoStreams(now), getDefaultPreferences(), now, {
      pushConfigured: true
    });
    const first = queue[0];

    expect(first.stream.id).toBe("demo-live-minecraft-kuzuha");
    expect(first.priority).toBe(100);
    expect(first.deliveryState).toBe("push_ready");
    expect(first.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(["live", "minecraft", "collaboration", "favorite_talent"])
    );
  });

  it("keeps stale or unverified matches in review instead of marking them push-ready", () => {
    const now = new Date("2026-06-19T12:00:00Z");
    const queue = buildAlertQueue(getDemoStreams(now), getDefaultPreferences(), now, {
      pushConfigured: true
    });
    const stale = queue.find((item) => item.stream.id === "demo-stale-ended-pov");

    expect(stale?.deliveryState).toBe("needs_review");
    expect(stale?.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(["minecraft", "stale", "unverified"])
    );
  });

  it("does not alert when enabled alert types lack any favorite signal", () => {
    const now = new Date("2026-06-19T12:00:00Z");
    const preferences = {
      ...getDefaultPreferences(),
      favoriteTalentIds: [],
      favoriteCategories: [],
      favoriteLanguages: []
    };

    expect(buildAlertQueue(getDemoStreams(now), preferences, now)).toHaveLength(0);
  });

  it("uses favorite languages as a first-class alert signal", () => {
    const now = new Date("2026-06-19T12:00:00Z");
    const preferences = {
      ...getDefaultPreferences(),
      favoriteTalentIds: [],
      favoriteCategories: [],
      favoriteLanguages: ["ja"]
    };
    const queue = buildAlertQueue(getDemoStreams(now), preferences, now);
    const liveJapaneseMatch = queue.find((item) => item.stream.id === "demo-live-minecraft-kuzuha");

    expect(liveJapaneseMatch?.reasons.map((reason) => reason.code)).toContain("favorite_language");
  });

  it("respects disabled alert type toggles", () => {
    const now = new Date("2026-06-19T12:00:00Z");
    const preferences = {
      ...getDefaultPreferences(),
      alertTypes: {
        upcoming: false,
        live: false,
        minecraft: false,
        collaboration: false
      }
    };

    expect(buildAlertQueue(getDemoStreams(now), preferences, now)).toHaveLength(0);
  });
});
