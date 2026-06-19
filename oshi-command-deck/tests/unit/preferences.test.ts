import { describe, expect, it } from "vitest";
import {
  getInitialPreferencesFromRequest,
  parsePreferencesCookie,
  serializePreferencesCookie
} from "@/lib/domain/preferences";

describe("preferences", () => {
  it("hydrates initial server preferences from a lightweight locale/timezone cookie", () => {
    const cookie = serializePreferencesCookie({
      locale: "ar-EG",
      timezone: "Europe/Paris"
    });

    expect(parsePreferencesCookie(cookie)).toEqual({
      locale: "ar-EG",
      timezone: "Europe/Paris"
    });
    expect(
      getInitialPreferencesFromRequest({
        cookieValue: cookie,
        acceptLanguage: "ja-JP,ja;q=0.9"
      })
    ).toMatchObject({
      locale: "ar-EG",
      timezone: "Europe/Paris"
    });
  });

  it("uses Accept-Language for first request locale and falls back to Tokyo timezone", () => {
    expect(
      getInitialPreferencesFromRequest({
        acceptLanguage: "fr-CA,ja;q=0.8,en-US;q=0.6"
      })
    ).toMatchObject({
      locale: "fr-CA",
      timezone: "Asia/Tokyo"
    });
  });

  it("normalizes invalid cookie values instead of trusting them", () => {
    const cookie = encodeURIComponent(
      JSON.stringify({
        locale: "not a locale",
        timezone: "Mars/Olympus_Mons"
      })
    );

    expect(parsePreferencesCookie(cookie)).toEqual({
      locale: "en",
      timezone: "Asia/Tokyo"
    });
  });
});
