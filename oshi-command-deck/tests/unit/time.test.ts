import { describe, expect, it } from "vitest";
import { getTodayWindowUtc, isStale, isTodayInTimezone, zonedTimeToUtc } from "@/lib/domain/time";

describe("timezone utilities", () => {
  it("converts Tokyo local time to UTC", () => {
    expect(zonedTimeToUtc(2026, 6, 19, 21, 30, "Asia/Tokyo").toISOString()).toBe(
      "2026-06-19T12:30:00.000Z"
    );
  });

  it("defines today in selected timezone", () => {
    const window = getTodayWindowUtc(new Date("2026-06-19T16:00:00Z"), "Asia/Tokyo");
    expect(window.startUtc.toISOString()).toBe("2026-06-19T15:00:00.000Z");
    expect(window.endUtc.toISOString()).toBe("2026-06-20T15:00:00.000Z");
  });

  it("defines today by local calendar boundaries across DST changes", () => {
    const springForward = getTodayWindowUtc(
      new Date("2026-03-08T12:00:00Z"),
      "America/Los_Angeles"
    );
    expect(springForward.startUtc.toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(springForward.endUtc.toISOString()).toBe("2026-03-09T07:00:00.000Z");

    const fallBack = getTodayWindowUtc(
      new Date("2026-11-01T12:00:00Z"),
      "America/Los_Angeles"
    );
    expect(fallBack.startUtc.toISOString()).toBe("2026-11-01T07:00:00.000Z");
    expect(fallBack.endUtc.toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });

  it("checks today and stale state", () => {
    expect(
      isTodayInTimezone("2026-06-19T23:30:00Z", new Date("2026-06-19T16:00:00Z"), "Asia/Tokyo")
    ).toBe(true);
    expect(isStale("2026-06-19T10:00:00Z", 30, new Date("2026-06-19T11:00:00Z"))).toBe(true);
  });
});
