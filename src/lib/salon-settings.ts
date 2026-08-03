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

export function isValidWorkingHours(
  value: unknown
): value is Record<string, { open: string; close: string } | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  return Object.entries(value).every(([day, hours]) => {
    if (!WORKING_HOUR_KEYS.has(day)) return false;
    if (hours === null) return true;
    if (!hours || typeof hours !== "object") return false;
    const { open, close } = hours as { open?: unknown; close?: unknown };
    if (typeof open !== "string" || typeof close !== "string") return false;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(open)) return false;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(close)) return false;
    return open < close;
  });
}

export function isValidSpecificDaysOff(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every((day) => typeof day === "string" && isValidIsoDate(day));
}
