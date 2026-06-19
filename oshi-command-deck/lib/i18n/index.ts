import { catalogs, type Locale, type MessageKey } from "./catalogs";

export type { Locale, MessageKey };

export const supportedLocales = Object.keys(catalogs) as Locale[];
export const defaultLocale: Locale = "en";
const rtlScripts = new Set(["adlm", "arab", "hebr", "mand", "nkoo", "rohg", "samr", "syrc", "thaa"]);
const rtlLanguages = new Set(["ar", "dv", "fa", "he", "ku", "ps", "sd", "ug", "ur", "yi"]);

export function resolveLocale(input?: string | null) {
  return normalizeLocaleTag(input);
}

export function resolveCatalogLocale(input?: string | null): Locale {
  if (!input) {
    return defaultLocale;
  }

  const normalized = normalizeLocaleTag(input).toLowerCase();
  const exact = supportedLocales.find((locale) => locale.toLowerCase() === normalized);
  if (exact) {
    return exact;
  }

  const language = normalized.split("-")[0];
  const languageMatch = supportedLocales.find((locale) => locale === language);
  return languageMatch ?? defaultLocale;
}

export function getBrowserLocale() {
  if (typeof navigator === "undefined") {
    return defaultLocale;
  }

  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  return normalizeLocaleTag(candidates.find(Boolean));
}

export function getPreferredLocaleFromAcceptLanguage(header?: string | null) {
  if (!header) {
    return defaultLocale;
  }

  const candidates = header
    .split(",")
    .map((entry) => {
      const [tag = "", ...params] = entry.trim().split(";");
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="))
        ?.slice(2);
      return {
        tag: tag.trim(),
        quality: quality ? Number(quality) : 1
      };
    })
    .filter((candidate) => candidate.tag && candidate.tag !== "*" && Number.isFinite(candidate.quality))
    .sort((left, right) => right.quality - left.quality);

  return normalizeLocaleTag(candidates[0]?.tag);
}

export function getLocaleDirection(locale: string) {
  const parts = normalizeLocaleTag(locale).toLowerCase().split("-");
  const language = parts[0];
  const script = parts.find((part) => part.length === 4);
  return rtlLanguages.has(language) || (script ? rtlScripts.has(script) : false) ? "rtl" : "ltr";
}

export function createTranslator(locale: string) {
  return function t(key: MessageKey, params?: Record<string, string | number>) {
    const catalogLocale = resolveCatalogLocale(locale);
    const template = catalogs[catalogLocale][key] ?? catalogs[defaultLocale][key] ?? key;
    return interpolate(template, params);
  };
}

export function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/gu, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function formatPercent(value: number, locale: string) {
  return new Intl.NumberFormat(normalizeLocaleTag(locale), {
    style: "percent",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(normalizeLocaleTag(locale)).format(value);
}

export function formatLanguageName(language: string, locale: string) {
  const normalized = language.trim();
  if (!normalized) {
    return normalized;
  }

  try {
    const displayName = new Intl.DisplayNames([normalizeLocaleTag(locale)], { type: "language" }).of(normalized);
    return displayName ? `${displayName} (${normalized})` : normalized;
  } catch {
    return normalized;
  }
}

export function formatLocaleName(locale: string, displayLocale = locale) {
  const normalized = normalizeLocaleTag(locale);
  try {
    const displayName = new Intl.DisplayNames([normalizeLocaleTag(displayLocale)], {
      type: "language"
    }).of(normalized);
    return displayName ? `${displayName} (${normalized})` : normalized;
  } catch {
    return normalized;
  }
}

export function formatPlural(
  count: number,
  locale: string,
  keyRoot: "plural.streams"
) {
  const normalizedLocale = normalizeLocaleTag(locale);
  const catalogLocale = resolveCatalogLocale(normalizedLocale);
  const rule = new Intl.PluralRules(normalizedLocale).select(count);
  const t = createTranslator(locale);
  const key = `${keyRoot}.${rule}` as MessageKey;
  const fallback = `${keyRoot}.other` as MessageKey;
  return t(catalogs[catalogLocale][key] ? key : fallback, {
    count: formatNumber(count, normalizedLocale)
  });
}

export function sortLocalized<T>(
  items: T[],
  locale: string,
  getValue: (item: T) => string
) {
  return [...items].sort((left, right) =>
    getValue(left).localeCompare(getValue(right), normalizeLocaleTag(locale), { sensitivity: "base" })
  );
}

export function normalizeLocaleTag(input?: string | null) {
  const value = input?.trim();
  if (!value) {
    return defaultLocale;
  }

  try {
    return Intl.getCanonicalLocales(value)[0] ?? defaultLocale;
  } catch {
    return defaultLocale;
  }
}
