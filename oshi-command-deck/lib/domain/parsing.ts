import { zonedTimeToUtc } from "./time";

export type ParsedAnnouncement = {
  urls: string[];
  collaborators: string[];
  tbd: boolean;
  scheduledStartUtc?: string;
  evidence: string[];
};

const urlPattern = /https?:\/\/[^\s)）]+/giu;
const tbdPattern = /\b(TBD|TBA|time\s*pending)\b|未定|時間未定|後日/iu;
const collaboratorPatterns = [
  /(?:with|collab(?:oration)?\s+with)\s+([A-Za-z0-9 _.-]+(?:[,/&]\s*[A-Za-z0-9 _.-]+)*)/iu,
  /(?:コラボ|参加者|with)[：:\s]+([^\n]+)/iu
];

export function parseAnnouncementText(
  text: string,
  now = new Date(),
  defaultTimezone = "Asia/Tokyo"
): ParsedAnnouncement {
  const urls = [...text.matchAll(urlPattern)].map((match) => match[0]);
  const tbd = tbdPattern.test(text);
  const evidence: string[] = [];

  if (urls.length > 0) {
    evidence.push("url");
  }
  if (tbd) {
    evidence.push("tbd-wording");
  }

  const collaborators = extractCollaborators(text);
  if (collaborators.length > 0) {
    evidence.push("collaborators");
  }

  const scheduledStartUtc = parseDatePhrase(text, now, defaultTimezone);
  if (scheduledStartUtc) {
    evidence.push("date");
  }

  return {
    urls,
    collaborators,
    tbd,
    scheduledStartUtc,
    evidence
  };
}

export function extractCollaborators(text: string) {
  const withoutUrls = text.replace(urlPattern, " ");
  for (const pattern of collaboratorPatterns) {
    const match = withoutUrls.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    return match[1]
      .split(/[,/&、・]/u)
      .map((value) =>
        value
          .replace(/\b20\d{2}[-/].*$/u, "")
          .replace(/\b(today|tomorrow)\b.*$/iu, "")
          .replace(/(今日|本日|今夜|明日|明後日).*$/u, "")
          .trim()
      )
      .filter((value) => value.length > 1)
      .slice(0, 12);
  }

  return [];
}

export function parseDatePhrase(
  text: string,
  now = new Date(),
  defaultTimezone = "Asia/Tokyo"
) {
  const normalizedText = normalizeDigits(text);
  const iso = normalizedText.match(
    /\b(20\d{2}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})(?::\d{2})?(Z)?\b/u
  );
  if (iso) {
    const value = iso[4]
      ? new Date(`${iso[1]}T${iso[2]}:${iso[3]}:00Z`)
      : zonedTimeToUtc(
          Number(iso[1].slice(0, 4)),
          Number(iso[1].slice(5, 7)),
          Number(iso[1].slice(8, 10)),
          Number(iso[2]),
          Number(iso[3]),
          defaultTimezone
        );
    return value.toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  const ymd = normalizedText.match(
    /\b(20\d{2})[/-](\d{1,2})[/-](\d{1,2})[T\s]+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(JST|UTC|Z)?\b/iu
  );
  if (ymd) {
    const clock = parseClock(ymd[4], ymd[5], ymd[6]);
    if (clock) {
      const timezone = timezoneFromToken(ymd[7], defaultTimezone);
      return zonedTimeToUtc(
        Number(ymd[1]),
        Number(ymd[2]),
        Number(ymd[3]),
        clock.hour,
        clock.minute,
        timezone
      )
        .toISOString()
        .replace(/\.\d{3}Z$/, "Z");
    }
  }

  const md = normalizedText.match(
    /\b(\d{1,2})[/-](\d{1,2})\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(JST|UTC)?\b/iu
  );
  if (md) {
    const clock = parseClock(md[3], md[4], md[5]);
    if (clock) {
      const timezone = timezoneFromToken(md[6], defaultTimezone);
      return zonedTimeToUtc(
        getZonedDateParts(now, timezone).year,
        Number(md[1]),
        Number(md[2]),
        clock.hour,
        clock.minute,
        timezone
      )
        .toISOString()
        .replace(/\.\d{3}Z$/, "Z");
    }
  }

  const japaneseMonthDay = normalizedText.match(
    /(\d{1,2})月(\d{1,2})日[^\d]*(\d{1,2})(?::|：|時)(\d{2}|半)?(?:分)?\s*(JST|UTC)?/iu
  );
  if (japaneseMonthDay) {
    const clock = parseClock(
      japaneseMonthDay[3],
      japaneseMonthDay[4] === "半" ? "30" : japaneseMonthDay[4]
    );
    if (clock) {
      const timezone = timezoneFromToken(japaneseMonthDay[5], defaultTimezone);
      return zonedTimeToUtc(
        getZonedDateParts(now, timezone).year,
        Number(japaneseMonthDay[1]),
        Number(japaneseMonthDay[2]),
        clock.hour,
        clock.minute,
        timezone
      )
        .toISOString()
        .replace(/\.\d{3}Z$/, "Z");
    }
  }

  const relative = normalizedText.match(
    /\b(today|tomorrow|tonight)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(JST|UTC)?\b/iu
  );
  if (relative) {
    const clock = parseClock(relative[2], relative[3], relative[4]);
    if (clock) {
      const timezone = timezoneFromToken(relative[5], defaultTimezone);
      const offset = relative[1].toLowerCase() === "tomorrow" ? 1 : 0;
      const base = getZonedDateParts(now, timezone, offset);
      return zonedTimeToUtc(
        base.year,
        base.month,
        base.day,
        clock.hour,
        clock.minute,
        timezone
      )
        .toISOString()
        .replace(/\.\d{3}Z$/, "Z");
    }
  }

  const timezoneClock = normalizedText.match(
    /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(JST|UTC)\b/iu
  );
  if (timezoneClock) {
    const clock = parseClock(timezoneClock[1], timezoneClock[2], timezoneClock[3]);
    if (clock) {
      const timezone = timezoneFromToken(timezoneClock[4], defaultTimezone);
      const base = getZonedDateParts(now, timezone);
      return zonedTimeToUtc(base.year, base.month, base.day, clock.hour, clock.minute, timezone)
        .toISOString()
        .replace(/\.\d{3}Z$/, "Z");
    }
  }

  const japaneseRelative = normalizedText.match(
    /(今日|本日|今夜|明日|明後日)[^\d]*(\d{1,2})(?::|：|時)(\d{2}|半)?(?:分)?\s*(JST|UTC)?/iu
  );
  if (japaneseRelative) {
    const clock = parseClock(
      japaneseRelative[2],
      japaneseRelative[3] === "半" ? "30" : japaneseRelative[3]
    );
    if (clock) {
      const timezone = timezoneFromToken(japaneseRelative[4], defaultTimezone);
      const offset = japaneseRelative[1] === "明日" ? 1 : japaneseRelative[1] === "明後日" ? 2 : 0;
      const base = getZonedDateParts(now, timezone, offset);
      return zonedTimeToUtc(
        base.year,
        base.month,
        base.day,
        clock.hour,
        clock.minute,
        timezone
      )
        .toISOString()
        .replace(/\.\d{3}Z$/, "Z");
    }
  }

  return undefined;
}

function parseClock(hourRaw: string | undefined, minuteRaw = "0", meridiemRaw?: string) {
  if (!hourRaw) {
    return undefined;
  }

  let hour = Number(hourRaw);
  const minute = Number(minuteRaw || "0");
  const meridiem = meridiemRaw?.toLowerCase();
  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  }
  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return undefined;
  }

  return { hour, minute };
}

function timezoneFromToken(token: string | undefined, defaultTimezone: string) {
  const normalized = token?.toUpperCase();
  if (normalized === "UTC" || normalized === "Z") {
    return "UTC";
  }
  if (normalized === "JST") {
    return "Asia/Tokyo";
  }
  return defaultTimezone;
}

function getZonedDateParts(date: Date, timezone: string, dayOffset = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezoneFromToken(timezone, timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  };
}

function normalizeDigits(value: string) {
  return value.replace(/[０-９]/gu, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}
