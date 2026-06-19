import { describe, expect, it } from "vitest";
import { getDemoStreams } from "@/lib/domain/fixtures";
import { buildRelationshipEdges, groupMinecraftSessions } from "@/lib/domain/minecraft";

describe("minecraft session grouping", () => {
  it("preserves participants, times, status, and source links for session UI", () => {
    const streams = getDemoStreams(new Date("2026-06-19T12:00:00Z"));
    const sessions = groupMinecraftSessions(streams);
    const liveSession = sessions.find((session) =>
      session.streamIds.includes("demo-live-minecraft-kuzuha")
    );

    expect(liveSession).toBeDefined();
    expect(liveSession?.status).toBe("live");
    expect(liveSession?.startUtc).toBe("2026-06-19T11:24:00Z");
    expect(liveSession?.participantTalentIds).toEqual(
      expect.arrayContaining(["kuzuha", "elira-pendora", "demo-manual-pov"])
    );
    expect(liveSession?.links.map((link) => link.provider)).toEqual(
      expect.arrayContaining(["youtube", "x"])
    );
  });

  it("builds explainable relationship edges from declared collaborators", () => {
    const streams = getDemoStreams(new Date("2026-06-19T12:00:00Z"));
    const edges = buildRelationshipEdges(streams);

    expect(edges.length).toBeGreaterThan(0);
    expect(edges[0]).toMatchObject({
      meaning: "declared_collaboration"
    });
    expect(edges.some((edge) => edge.streamIds.includes("demo-live-minecraft-kuzuha"))).toBe(true);
  });
});
