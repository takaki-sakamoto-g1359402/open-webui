import {
  getBrowserLocale,
  getPreferredLocaleFromAcceptLanguage,
  normalizeLocaleTag
} from "@/lib/i18n";
import { getBrowserTimezone, normalizeTimezone } from "./time";
import type { UserPreferences } from "./types";

export const preferencesStorageKey = "oshi-command-deck.preferences.v1";
export const preferencesCookieKey = "oshi-command-deck.locale-timezone.v1";
const preferencesCookieMaxAgeSeconds = 60 * 60 * 24 * 365;

type PreferencesCookiePayload = {
  locale?: string;
  timezone?: string;
};

export function getDefaultPreferences(): UserPreferences {
  return {
    favoriteTalentIds: ["kuzuha", "elira-pendora"],
    favoriteCategories: ["minecraft", "collaboration"],
    favoriteLanguages: ["ja", "en"],
    alertTypes: {
      upcoming: true,
      live: true,
      minecraft: true,
      collaboration: true
    },
    timezone: normalizeTimezone("Asia/Tokyo"),
    locale: "en",
    branchFilter: "all",
    languageFilter: "all",
    categoryFilter: "all",
    statusFilter: "all",
    favoritesOnly: false,
    search: "",
    archivedEventIds: []
  };
}

export function getInitialPreferencesFromRequest({
  cookieValue,
  acceptLanguage
}: {
  cookieValue?: string | null;
  acceptLanguage?: string | null;
}): UserPreferences {
  const base = getDefaultPreferences();
  const cookiePreferences = parsePreferencesCookie(cookieValue);
  return normalizePreferences({
    ...base,
    locale: cookiePreferences.locale ?? getPreferredLocaleFromAcceptLanguage(acceptLanguage),
    timezone: cookiePreferences.timezone ?? base.timezone
  });
}

export function getClientInitialPreferences(
  fallback: UserPreferences = getDefaultPreferences(),
  options: { preferBrowserDefaults?: boolean } = {}
): UserPreferences {
  const base = fallback;
  if (typeof window === "undefined") {
    return base;
  }

  const detectedLocale = getBrowserLocale();
  const detectedTimezone = normalizeTimezone(getBrowserTimezone());
  const preferBrowserDefaults = options.preferBrowserDefaults ?? true;

  try {
    const raw = window.localStorage.getItem(preferencesStorageKey);
    if (!raw) {
      return {
        ...base,
        locale: preferBrowserDefaults ? detectedLocale : base.locale,
        timezone: preferBrowserDefaults ? detectedTimezone : base.timezone
      };
    }

    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return normalizePreferences({
      ...base,
      ...parsed,
      alertTypes: {
        ...base.alertTypes,
        ...parsed.alertTypes
      },
      locale: normalizeLocaleTag(parsed.locale ?? detectedLocale),
      timezone: normalizeTimezone(parsed.timezone ?? detectedTimezone)
    });
  } catch {
    return {
      ...base,
      locale: preferBrowserDefaults ? detectedLocale : base.locale,
      timezone: preferBrowserDefaults ? detectedTimezone : base.timezone
    };
  }
}

export function normalizePreferences(preferences: UserPreferences): UserPreferences {
  return {
    ...preferences,
    locale: normalizeLocaleTag(preferences.locale),
    timezone: normalizeTimezone(preferences.timezone),
    favoriteTalentIds: unique(preferences.favoriteTalentIds),
    favoriteCategories: unique(preferences.favoriteCategories),
    favoriteLanguages: unique(preferences.favoriteLanguages),
    archivedEventIds: unique(preferences.archivedEventIds)
  };
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

export function serializePreferencesCookie(preferences: Pick<UserPreferences, "locale" | "timezone">) {
  return encodeURIComponent(
    JSON.stringify({
      locale: normalizeLocaleTag(preferences.locale),
      timezone: normalizeTimezone(preferences.timezone)
    } satisfies PreferencesCookiePayload)
  );
}

export function parsePreferencesCookie(raw?: string | null): PreferencesCookiePayload {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(decodeCookieValue(raw)) as PreferencesCookiePayload;
    return {
      locale: parsed.locale ? normalizeLocaleTag(parsed.locale) : undefined,
      timezone: parsed.timezone ? normalizeTimezone(parsed.timezone) : undefined
    };
  } catch {
    return {};
  }
}

export function writePreferencesCookie(preferences: Pick<UserPreferences, "locale" | "timezone">) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = [
    `${preferencesCookieKey}=${serializePreferencesCookie(preferences)}`,
    `Max-Age=${preferencesCookieMaxAgeSeconds}`,
    "Path=/",
    "SameSite=Lax"
  ].join("; ");
}

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
