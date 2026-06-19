const fallbackTimezone = "Asia/Tokyo";

export function getBrowserTimezone() {
  if (typeof Intl === "undefined") {
    return fallbackTimezone;
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallbackTimezone;
  } catch {
    return fallbackTimezone;
  }
}

export function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(timezone?: string | null) {
  if (timezone && isValidTimeZone(timezone)) {
    return timezone;
  }
  return fallbackTimezone;
}

export function formatDateTime(
  utc: string | undefined,
  locale: string,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
) {
  if (!utc) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: normalizeTimezone(timezone),
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options
  }).format(new Date(utc));
}

export function formatTimeOnly(utc: string | undefined, locale: string, timezone: string) {
  if (!utc) {
    return "";
  }
  return new Intl.DateTimeFormat(locale, {
    timeZone: normalizeTimezone(timezone),
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(utc));
}

export function formatRelativeAge(
  utc: string | undefined,
  now: Date,
  locale: string
) {
  if (!utc) {
    return "";
  }

  const diffMs = now.getTime() - new Date(utc).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const absMinutes = Math.abs(diffMinutes);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (absMinutes < 60) {
    return rtf.format(-diffMinutes, "minute");
  }

  const hours = Math.round(diffMinutes / 60);
  if (Math.abs(hours) < 24) {
    return rtf.format(-hours, "hour");
  }

  return rtf.format(-Math.round(hours / 24), "day");
}

export function getTodayWindowUtc(now: Date, timezone: string) {
  const tz = normalizeTimezone(timezone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  const start = zonedTimeToUtc(year, month, day, 0, 0, tz);
  const nextDay = addUtcCalendarDays(year, month, day, 1);
  const end = zonedTimeToUtc(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
    0,
    0,
    tz
  );
  return { startUtc: start, endUtc: end };
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
) {
  const tz = normalizeTimezone(timezone);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = getTimezoneOffsetMs(guess, tz);
  return new Date(guess.getTime() - offset);
}

export function getTimezoneOffsetMs(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const lookup = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    lookup("year"),
    lookup("month") - 1,
    lookup("day"),
    lookup("hour") === 24 ? 0 : lookup("hour"),
    lookup("minute"),
    lookup("second")
  );

  return asUtc - date.getTime();
}

export function isTodayInTimezone(utc: string | undefined, now: Date, timezone: string) {
  if (!utc) {
    return false;
  }

  const { startUtc, endUtc } = getTodayWindowUtc(now, timezone);
  const value = new Date(utc).getTime();
  return value >= startUtc.getTime() && value < endUtc.getTime();
}

export function isStale(lastCheckedUtc: string, staleAfterMinutes: number, now: Date) {
  return now.getTime() - new Date(lastCheckedUtc).getTime() > staleAfterMinutes * 60_000;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function addUtcCalendarDays(year: number, month: number, day: number, days: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export function toUtcIso(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function parseDateTimeLocalInTimezone(value: string, timezone: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u);
  if (!match) {
    return undefined;
  }

  return zonedTimeToUtc(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    timezone
  );
}
