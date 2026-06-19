import { describe, expect, it } from "vitest";
import { extractCollaborators, parseAnnouncementText, parseDatePhrase } from "@/lib/domain/parsing";

describe("announcement parsing", () => {
  it("extracts URLs, collaborators, TBD wording, and deterministic dates", () => {
    const parsed = parseAnnouncementText(
      "TBD collab with Kuzuha / Elira Pendora https://youtube.com/watch?v=abc123 2026-06-19 21:30",
      new Date("2026-06-19T00:00:00Z"),
      "Asia/Tokyo"
    );

    expect(parsed.urls).toEqual(["https://youtube.com/watch?v=abc123"]);
    expect(parsed.collaborators).toEqual(["Kuzuha", "Elira Pendora"]);
    expect(parsed.tbd).toBe(true);
    expect(parsed.scheduledStartUtc).toBe("2026-06-19T12:30:00Z");
    expect(parsed.evidence).toEqual(["url", "tbd-wording", "collaborators", "date"]);
  });

  it("parses Japanese relative phrases", () => {
    expect(
      parseDatePhrase("明日 22時30 JST から", new Date("2026-06-19T03:00:00Z"), "Asia/Tokyo")
    ).toBe("2026-06-20T13:30:00Z");
  });

  it("uses the selected timezone calendar day for relative phrases", () => {
    expect(
      parseDatePhrase("today 09:00", new Date("2026-06-19T16:00:00Z"), "Asia/Tokyo")
    ).toBe("2026-06-20T00:00:00Z");
  });

  it("parses explicit JST am/pm clock phrases without AI", () => {
    expect(
      parseDatePhrase("collab stream at 9pm JST", new Date("2026-06-19T03:00:00Z"), "UTC")
    ).toBe("2026-06-19T12:00:00Z");
  });

  it("parses Japanese tonight, day-after-tomorrow, and half-hour wording", () => {
    expect(
      parseDatePhrase("今夜21時半から配信", new Date("2026-06-19T03:00:00Z"), "Asia/Tokyo")
    ).toBe("2026-06-19T12:30:00Z");
    expect(
      parseDatePhrase("明後日 22時から", new Date("2026-06-19T03:00:00Z"), "Asia/Tokyo")
    ).toBe("2026-06-21T13:00:00Z");
  });

  it("parses month-day am/pm phrases with explicit provider timezone", () => {
    expect(
      parseDatePhrase("6/20 at 9pm JST", new Date("2026-06-19T03:00:00Z"), "UTC")
    ).toBe("2026-06-20T12:00:00Z");
  });

  it("extracts Japanese collaborator labels", () => {
    expect(extractCollaborators("参加者: Kuzuha、Elira Pendora、Manual POV")).toEqual([
      "Kuzuha",
      "Elira Pendora",
      "Manual POV"
    ]);
  });
});
