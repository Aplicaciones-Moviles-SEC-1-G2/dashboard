// Shared tz helpers. Used by BQ-06 (overstay flag), BQ-07 (bucket id), BQ-08
// (day-of-week picker) and any future BQ that needs local time bucketing.
// All helpers are pure — callers pass `nowMs` / `tz` so transforms stay
// deterministic and testable.

export const DEFAULT_TZ = "America/Bogota";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface LocalDayAndHour {
  /** 0..6 (Sun..Sat) to match `Date.getDay()`. */
  dayOfWeek: number;
  /** 0..23 local tz. */
  hour: number;
  /** `YYYY-MM-DD` formatted in the given tz. */
  localDate: string;
}

/**
 * Extract `{ dayOfWeek, hour, localDate }` in the supplied tz. Uses
 * `Intl.DateTimeFormat` exclusively so the caller does not need to think
 * about UTC offsets. Falls back to 0 / "" when formatting fails (should
 * never happen with a valid IANA zone, but keeps the types narrow).
 */
export function deriveLocalDayAndHour(
  date: Date,
  tz: string = DEFAULT_TZ,
): LocalDayAndHour {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  let weekdayToken = "";
  let hourToken = "";
  let yearToken = "";
  let monthToken = "";
  let dayToken = "";
  for (const part of parts) {
    if (part.type === "weekday") weekdayToken = part.value;
    else if (part.type === "hour") hourToken = part.value;
    else if (part.type === "year") yearToken = part.value;
    else if (part.type === "month") monthToken = part.value;
    else if (part.type === "day") dayToken = part.value;
  }

  const dayOfWeek = WEEKDAY_INDEX[weekdayToken] ?? 0;
  const parsedHour = Number.parseInt(hourToken, 10);
  const hour = Number.isFinite(parsedHour)
    ? ((parsedHour % 24) + 24) % 24
    : 0;
  const localDate =
    yearToken.length > 0 && monthToken.length > 0 && dayToken.length > 0
      ? `${yearToken}-${monthToken}-${dayToken}`
      : "";

  return { dayOfWeek, hour, localDate };
}

export function deriveLocalDayOfWeek(
  date: Date,
  tz: string = DEFAULT_TZ,
): number {
  return deriveLocalDayAndHour(date, tz).dayOfWeek;
}

/**
 * Generate an inclusive sequence of 5-minute `hhmm` tokens between `from`
 * and `to`. Returns `[]` when inputs are malformed. Used by BQ-08 to
 * enumerate the expected 37-bucket morning window.
 */
export function hhmm5Sequence(from: string, to: string): string[] {
  const fromMin = parseHhmmToMinutes(from);
  const toMin = parseHhmmToMinutes(to);
  if (fromMin === null || toMin === null || fromMin > toMin) return [];
  const out: string[] = [];
  for (let m = fromMin; m <= toMin; m += 5) {
    out.push(minutesToHhmm(m));
  }
  return out;
}

export function hhmm5ToHHColonMM(hhmm: string): string {
  if (hhmm.length !== 4) return hhmm;
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

function parseHhmmToMinutes(hhmm: string): number | null {
  if (hhmm.length !== 4) return null;
  const hh = Number.parseInt(hhmm.slice(0, 2), 10);
  const mm = Number.parseInt(hhmm.slice(2, 4), 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function minutesToHhmm(minutes: number): string {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${String(hh).padStart(2, "0")}${String(mm).padStart(2, "0")}`;
}
