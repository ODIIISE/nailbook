// Asia/Tehran time helpers.
//
// The booking spec (§3.1) requires all slot availability to be evaluated in
// Asia/Tehran time, independent of the server's or the customer's device
// timezone. Iran abolished DST in 2022, so Tehran is a fixed UTC+03:30 — but
// we still resolve it through Intl so we are correct regardless of future
// policy changes and never rely on the host machine's local clock.

const TEHRAN_TZ = "Asia/Tehran";

// Cache the formatter — it's immutable and expensive to construct
const TEHRAN_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: TEHRAN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function tehranParts(date: Date) {
  const parts = TEHRAN_FORMATTER.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24, // Intl can yield "24" at midnight in some envs
    minute: Number(get("minute")),
  };
}

/** Gregorian date key (YYYY-MM-DD) of `date` as observed in Tehran. */
export function getTehranDateKey(date: Date): string {
  const { year, month, day } = tehranParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface TehranNow {
  /** Tehran calendar date key (YYYY-MM-DD) for "today". */
  dateKey: string;
  /** Minutes since midnight in Tehran. */
  minutes: number;
}

/** Current Tehran date + time-of-day in minutes. */
export function getTehranNow(now: Date = new Date()): TehranNow {
  const { year, month, day, hour, minute } = tehranParts(now);
  return {
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    minutes: hour * 60 + minute,
  };
}

/** True when `date` falls on today's Tehran calendar date. */
export function isTehranToday(date: Date, now: Date = new Date()): boolean {
  return getTehranDateKey(date) === getTehranNow(now).dateKey;
}
