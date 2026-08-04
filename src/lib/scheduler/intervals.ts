import type { Interval, UnixMillis } from "./models";

export function isValidInterval(interval: Interval): boolean {
  return Number.isFinite(interval.start)
    && Number.isFinite(interval.end)
    && interval.start < interval.end;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function contains(outer: Interval, inner: Interval): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter(isValidInterval)
    .map((interval) => ({ ...interval }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Interval[] = [];

  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || interval.start > previous.end) {
      merged.push(interval);
    } else {
      previous.end = Math.max(previous.end, interval.end);
    }
  }

  return merged;
}

/** Subtract occupied intervals from an availability interval. */
export function subtractIntervals(base: Interval, occupied: Interval[]): Interval[] {
  if (!isValidInterval(base)) return [];
  const clipped = mergeIntervals(
    occupied
      .filter((interval) => overlaps(base, interval))
      .map((interval) => ({
        start: Math.max(base.start, interval.start),
        end: Math.min(base.end, interval.end),
      }))
  );
  const result: Interval[] = [];
  let cursor = base.start;

  for (const interval of clipped) {
    if (cursor < interval.start) result.push({ start: cursor, end: interval.start });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < base.end) result.push({ start: cursor, end: base.end });
  return result;
}

/** Return the common intersection of all interval lists. */
export function intersectIntervalLists(lists: Interval[][]): Interval[] {
  if (lists.length === 0) return [];
  let result = mergeIntervals(lists[0]);

  for (const list of lists.slice(1)) {
    const next: Interval[] = [];
    for (const left of result) {
      for (const right of mergeIntervals(list)) {
        const start = Math.max(left.start, right.start);
        const end = Math.min(left.end, right.end);
        if (start < end) next.push({ start, end });
      }
    }
    result = mergeIntervals(next);
    if (result.length === 0) break;
  }

  return result;
}

export function expandInterval(interval: Interval, beforeMinutes: number, afterMinutes: number): Interval {
  const before = Math.max(0, Number.isFinite(beforeMinutes) ? beforeMinutes : 0) * 60_000;
  const after = Math.max(0, Number.isFinite(afterMinutes) ? afterMinutes : 0) * 60_000;
  return { start: interval.start - before, end: interval.end + after };
}

export function ceilToResolution(value: UnixMillis, resolutionMinutes: number): UnixMillis {
  const resolution = Math.max(1, Math.trunc(resolutionMinutes)) * 60_000;
  return Math.ceil(value / resolution) * resolution;
}

export function roundDurationMinutes(durationMinutes: number, resolutionMinutes: number, mode: "ceil" | "floor" | "nearest"): number {
  const duration = Math.max(0, durationMinutes);
  const resolution = Math.max(1, Math.trunc(resolutionMinutes));
  const slots = duration / resolution;
  const roundedSlots = mode === "floor"
    ? Math.floor(slots)
    : mode === "nearest"
      ? Math.round(slots)
      : Math.ceil(slots);
  return Math.max(1, roundedSlots) * resolution;
}

export function intervalDurationMinutes(interval: Interval): number {
  return (interval.end - interval.start) / 60_000;
}
