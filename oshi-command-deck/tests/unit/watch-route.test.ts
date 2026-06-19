import { describe, expect, it } from "vitest";
import { getDemoStreams } from "@/lib/domain/fixtures";
import { getDefaultPreferences } from "@/lib/domain/preferences";
import { buildWatchRoute } from "@/lib/domain/watch-route";

describe("watch route scoring", () => {
  it("shows explainable reasons and ranks live favorite Minecraft streams highly", () => {
    const now = new Date("2026-06-19T12:00:00Z");
    const route = buildWatchRoute(getDemoStreams(now), getDefaultPreferences(), now);
    const first = route[0];

    expect(first.stream.id).toBe("demo-live-minecraft-kuzuha");
    expect(first.score).toBeGreaterThan(70);
    expect(first.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(["live_now", "favorite_talent", "minecraft_priority"])
    );
  });
});
