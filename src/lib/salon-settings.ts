export type OptimizationMode = "hybrid" | "legacy";

export const DEFAULT_OPTIMIZER_SETTINGS = {
  optimization_mode: "hybrid" as OptimizationMode,
  suggestion_limit: 3,
  min_useful_gap_minutes: 30,
};

export function normalizeOptimizerSettings(input: {
  optimization_mode?: unknown;
  suggestion_limit?: unknown;
  min_useful_gap_minutes?: unknown;
}) {
  const rawSuggestionLimit = input.suggestion_limit === null || input.suggestion_limit === ""
    ? NaN
    : Number(input.suggestion_limit);
  const rawMinUsefulGap = input.min_useful_gap_minutes === null || input.min_useful_gap_minutes === ""
    ? NaN
    : Number(input.min_useful_gap_minutes);

  return {
    optimization_mode: input.optimization_mode === "legacy"
      ? "legacy" as const
      : DEFAULT_OPTIMIZER_SETTINGS.optimization_mode,
    suggestion_limit: Number.isFinite(rawSuggestionLimit)
      ? Math.min(10, Math.max(1, Math.trunc(rawSuggestionLimit)))
      : DEFAULT_OPTIMIZER_SETTINGS.suggestion_limit,
    min_useful_gap_minutes: Number.isFinite(rawMinUsefulGap)
      ? Math.min(180, Math.max(0, Math.trunc(rawMinUsefulGap)))
      : DEFAULT_OPTIMIZER_SETTINGS.min_useful_gap_minutes,
  };
}

const WORKING_HOUR_KEYS = new Set(["sat", "sun", "mon", "tue", "wed", "thu", "fri"]);

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export interface DayBreak {
  start: string;
  end: string;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidBreakList(value: unknown, open: string, close: string): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  const ranges = [];
  for (const b of value) {
    if (!b || typeof b !== "object") return false;
    const { start, end } = b as { start?: unknown; end?: unknown };
    if (typeof start !== "string" || typeof end !== "string") return false;
    if (!HHMM.test(start) || !HHMM.test(end)) return false;
    if (!(open <= start && start < end && end <= close)) return false;
    ranges.push([start, end]);
  }
  ranges.sort();
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i][0] < ranges[i - 1][1]) return false;
  }
  return true;
}

export function isValidWorkingHours(
  value: unknown
): value is Record<string, { open: string; close: string; breaks?: DayBreak[] } | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  return Object.entries(value).every(([day, hours]) => {
    if (!WORKING_HOUR_KEYS.has(day)) return false;
    if (hours === null) return true;
    if (!hours || typeof hours !== "object") return false;
    const { open, close, breaks } = hours as { open?: unknown; close?: unknown; breaks?: unknown };
    if (typeof open !== "string" || typeof close !== "string") return false;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(open)) return false;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(close)) return false;
    if (!(open < close)) return false;
    return isValidBreakList(breaks, open, close);
  });
}

export function isValidSpecificDaysOff(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every((day) => typeof day === "string" && isValidIsoDate(day));
}

/** Days-off reasons ({YYYY-MM-DD: reason}) survive unknown shapes by
 *  dropping malformed entries — a corrupt map must never break the salon
 *  payload, and reasons are capped at 100 chars like the update-salon API. */
export function normalizeDaysOffReasons(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, reason] of Object.entries(value)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof reason === "string" && reason.trim()) {
      out[key] = reason.trim().slice(0, 100);
    }
  }
  return out;
}

/** Slot grid interval in minutes. Out-of-range or corrupt values fall back to
 * 15 — the single clamp every consumer (customer engine, owner booking route,
 * manual-reserve modal) must share so duration rules never diverge. */
export function resolveSlotInterval(configured: unknown): number {
  const value = Number(configured);
  return Number.isFinite(value) && value >= 5 && value <= 60 ? value : 15;
}

/** Mandatory gap after each booking, clamped to the range update-salon allows. */
export function resolveSlotBuffer(configured: unknown): number {
  const value = Number(configured);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 120) : 0;
}
