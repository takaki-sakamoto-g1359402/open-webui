import { describe, expect, it } from "vitest";
import { createManualStreamFromInput } from "@/lib/domain/manual-imports";

describe("manual imports", () => {
  it("creates a source-backed local stream with UTC time, collaborators, and TBD evidence", () => {
    const stream = createManualStreamFromInput(
      {
        titleOriginal: "Minecraft relay POV TBD",
        talentId: "kuzuha",
        category: "minecraft",
        status: "scheduled",
        scheduledLocal: "2026-06-19T21:00",
        timezone: "Asia/Tokyo",
        sourceUrl: "https://www.youtube.com/watch?v=manual123",
        collaboratorsText: "Elira Pendora, Manual POV",
        languagesText: "ja, en",
        notes: "参加者: Elira Pendora、Manual POV"
      },
      new Date("2026-06-19T10:00:00Z")
    );

    expect(stream.demo).toBe(false);
    expect(stream.scheduledStartUtc).toBe("2026-06-19T12:00:00Z");
    expect(stream.sourceLinks[0]).toMatchObject({
      provider: "manual",
      url: "https://www.youtube.com/watch?v=manual123"
    });
    expect(stream.collaborators).toEqual(["Elira Pendora", "Manual POV"]);
    expect(stream.languages).toEqual(["ja", "en"]);
    expect(stream.providerErrors.map((error) => error.code)).toContain("tbd_wording");
  });
});
