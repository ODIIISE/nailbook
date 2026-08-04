/**
 * Booking Engine v8 — Hybrid Gap Optimizer
 *
 * Availability remains deterministic and backward-compatible, while the
 * recommendation layer combines the salon's 3-level proximity model with
 * bounded, explainable scoring inspired by the generic scheduling spec.
 *
 * - Level 1 (0 bookings): all valid slots, with a few low-friction suggestions
 * - Level 2 (1 booking): keep the proximity window, rank adjacent slots first
 * - Level 3 (2+ bookings): keep all valid slots, rank gap-filling slots first
 *
 * All config from database, all times in Asia/Tehran.
 */

import { getTehranDateKey, getTehranNow } from "./time";
import { gregorianToJalali, jalaliToGregorian, DAYS_IN_MONTH, isJalaliLeapYear } from "./jalali";

// ─── Types ───

export interface WorkingHours {
  [key: string]: { open: string; close: string } | null;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  booked: boolean;
  locked: boolean;
  suggested: boolean;
  /** Bounded recommendation score for diagnostics and future ranking UIs. */
  score?: number;
  /** Short, human-readable reason for a recommended slot. */
  recommendation?: string;
}

interface TimeBlock {
  start: number; // minutes from midnight
  end: number;
}

interface EngineConfig {
  resolution: number;
  buffer: number;
  proximityWindow: number;
  earlyExtraHours: number;
  lateExtraHours: number;
  expandThreshold: number;
  allowOverflow: boolean;
  overflowMinutes: number;
}

// ─── Utilities ───

function parseTime(time: string): number {
  if (!time || typeof time !== "string") return NaN;
  const parts = time.split(":");
  if (parts.length !== 2) return NaN;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function ceilToResolution(minutes: number, resolution: number): number {
  return Math.ceil(minutes / resolution) * resolution;
}

function overlaps(a: TimeBlock, b: TimeBlock): boolean {
  return a.start < b.end && b.start < a.end;
}

function mergeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  const merged: TimeBlock[] = [];
  for (const block of sorted) {
    if (merged.length === 0 || block.start > merged[merged.length - 1].end) {
      merged.push({ ...block });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, block.end);
    }
  }
  return merged;
}

export function getIranWeekDay(date: Date): string {
  const jsDay = date.getDay();
  // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Iran week: 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
  const map = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
  return map[jsDay === 6 ? 0 : jsDay + 1];
}

// ─── Effective Duration ───

function computeEffectiveDuration(
  serviceDurationMinutes: number,
  addonsDurationMinutes: number,
  buffer: number,
  resolution: number
): number {
  const raw = serviceDurationMinutes + addonsDurationMinutes;
  if (buffer > 0) {
    return ceilToResolution(raw + buffer, resolution);
  }
  return ceilToResolution(raw, resolution);
}

// ─── Free Intervals ───

// ─── Shift Expansion ───

function computeExpandedShift(
  shiftStart: number,
  shiftEnd: number,
  bookings: TimeBlock[],
  cfg: EngineConfig
): { start: number; end: number; isExpanded: boolean } {
  const shiftMinutes = shiftEnd - shiftStart;
  if (shiftMinutes <= 0) return { start: shiftStart, end: shiftEnd, isExpanded: false };

  let bookedMinutes = 0;
  for (const b of bookings) {
    const overlapStart = Math.max(b.start, shiftStart);
    const overlapEnd = Math.min(b.end, shiftEnd);
    if (overlapEnd > overlapStart) bookedMinutes += overlapEnd - overlapStart;
  }

  const fillPct = (bookedMinutes / shiftMinutes) * 100;
  if (fillPct < cfg.expandThreshold) {
    return { start: shiftStart, end: shiftEnd, isExpanded: false };
  }

  let newStart = shiftStart;
  let newEnd = shiftEnd;

  if (cfg.earlyExtraHours > 0) {
    newStart = Math.max(0, shiftStart - cfg.earlyExtraHours * 60);
  }
  if (cfg.lateExtraHours > 0) {
    newEnd = shiftEnd + cfg.lateExtraHours * 60;
  }

  return { start: newStart, end: newEnd, isExpanded: true };
}

// ─── Level 2: Proximity Filter ───

function filterByProximity(
  slots: TimeBlock[],
  existingBookings: TimeBlock[],
  proximityMinutes: number
): TimeBlock[] {
  if (existingBookings.length === 0) return slots;

  const windows: TimeBlock[] = existingBookings.map((b) => ({
    start: b.start - proximityMinutes,
    end: b.end + proximityMinutes,
  }));

  const mergedWindows = mergeBlocks(windows);

  return slots.filter((slot) =>
    mergedWindows.some((w) => slot.start >= w.start && slot.end <= w.end)
  );
}

// ─── Level 3: Gap Fill + Edge Attach ───

interface RankedSlot {
  block: TimeBlock;
  score: number;
  recommendation: string;
}

interface RecommendationConfig {
  mode: "hybrid" | "legacy";
  suggestionLimit: number;
  minUsefulGapMinutes: number;
}

function distanceToOccupiedEdge(slot: TimeBlock, block: TimeBlock): number {
  if (slot.end <= block.start) return block.start - slot.end;
  if (slot.start >= block.end) return slot.start - block.end;
  return 0;
}

function getContainingGap(slot: TimeBlock, sortedOccupied: TimeBlock[]): TimeBlock | null {
  for (let i = 0; i < sortedOccupied.length - 1; i++) {
    const gapStart = sortedOccupied[i].end;
    const gapEnd = sortedOccupied[i + 1].start;
    if (gapEnd - gapStart >= slot.end - slot.start && slot.start >= gapStart && slot.end <= gapEnd) {
      return { start: gapStart, end: gapEnd };
    }
  }
  return null;
}

/**
 * Rank already-valid slots. This deliberately never changes hard availability;
 * it only decides which available choices deserve the suggested treatment.
 */
function rankAvailableSlots(
  slots: TimeBlock[],
  occupied: TimeBlock[],
  bookingsCount: number,
  shiftStart: number,
  shiftEnd: number,
  resolution: number,
  proximityMinutes: number,
  config: RecommendationConfig
): RankedSlot[] {
  const sortedOccupied = [...occupied].sort((a, b) => a.start - b.start);

  return slots.map((slot) => {
    let score = 0;
    const reasons: string[] = [];
    const gap = getContainingGap(slot, sortedOccupied);

    if (gap) {
      score += 55;
      reasons.push("پر کردن فاصله بین نوبت‌ها");
      if (slot.start === gap.start && slot.end === gap.end) {
        score += 35;
        reasons.unshift("پر کردن کامل یک فاصله");
      } else {
        const edgeDistance = Math.min(slot.start - gap.start, gap.end - slot.end);
        score += Math.max(0, 20 - edgeDistance / resolution);
      }
    }

    const nearestEdge = sortedOccupied.length === 0
      ? Infinity
      : Math.min(...sortedOccupied.map((block) => distanceToOccupiedEdge(slot, block)));
    if (nearestEdge <= resolution) {
      score += 35;
      reasons.push("چسبیده به نوبت موجود");
    } else if (nearestEdge < Infinity && bookingsCount === 1) {
      score += Math.max(0, 25 - (nearestEdge / Math.max(proximityMinutes, resolution)) * 25);
    }

    if (slot.start === shiftStart) {
      score += 10;
      reasons.push("شروع منظم روز کاری");
    }
    if (slot.end === shiftEnd) {
      score += 10;
      reasons.push("پایان منظم روز کاری");
    }

    // Penalize tiny residual gaps. A finite penalty avoids the generic spec's
    // dangerous use of -Infinity and keeps all valid choices visible.
    const previous = [...sortedOccupied].reverse().find((block) => block.end <= slot.start);
    const next = sortedOccupied.find((block) => block.start >= slot.end);
    const beforeGap = previous ? slot.start - previous.end : slot.start - shiftStart;
    const afterGap = next ? next.start - slot.end : shiftEnd - slot.end;
    if (beforeGap > 0 && beforeGap < config.minUsefulGapMinutes) score -= 25;
    if (afterGap > 0 && afterGap < config.minUsefulGapMinutes) score -= 25;

    return {
      block: slot,
      score: Math.max(-100, Math.min(100, Number(score.toFixed(2)))),
      recommendation: reasons[0] || "زمان مناسب برای رزرو",
    };
  }).sort((a, b) => b.score - a.score || a.block.start - b.block.start);
}

function classifyLegacySuggestions(
  allValidSlots: TimeBlock[],
  occupied: TimeBlock[],
  effectiveDuration: number,
  resolution: number
): TimeBlock[] {
  const sorted = [...occupied].sort((a, b) => a.start - b.start);
  return allValidSlots.filter((slot) => {
    for (let i = 0; i < sorted.length - 1; i++) {
      const gapStart = sorted[i].end;
      const gapEnd = sorted[i + 1].start;
      if (
        gapEnd - gapStart >= effectiveDuration &&
        slot.start >= gapStart &&
        slot.end <= gapEnd
      ) {
        return true;
      }
    }

    return sorted.some(
      (block) =>
        Math.abs(slot.end - block.start) < resolution ||
        Math.abs(slot.start - block.end) < resolution
    );
  });
}

function selectRecommendations(
  ranked: RankedSlot[],
  bookingsCount: number,
  shiftStart: number,
  shiftEnd: number,
  resolution: number,
  config: RecommendationConfig
): RankedSlot[] {
  if (config.mode === "legacy" || ranked.length === 0) return [];

  const limit = Math.min(Math.max(1, config.suggestionLimit), ranked.length);
  if (bookingsCount > 0 || limit === 1) return ranked.slice(0, limit);

  // On an empty day, do not present arbitrary neighboring slots. Spread the
  // shortlist across the day so the customer can choose early, middle, or late
  // without hiding any other valid choice. This also honors limits above 3.
  const byStart = [...ranked].sort((a, b) => a.block.start - b.block.start);
  const serviceDuration = byStart[0].block.end - byStart[0].block.start;
  const lastStart = shiftEnd - serviceDuration;
  const selected: RankedSlot[] = [];
  for (let index = 0; index < limit; index++) {
    const fraction = limit === 1 ? 0 : index / (limit - 1);
    const target = shiftStart + Math.round(((lastStart - shiftStart) * fraction) / resolution) * resolution;
    const candidate = byStart.find((item) => item.block.start === target)
      ?? byStart.reduce((closest, item) =>
        Math.abs(item.block.start - target) < Math.abs(closest.block.start - target) ? item : closest
      );
    if (!selected.some((item) => item.block.start === candidate.block.start)) selected.push(candidate);
  }
  return selected;
}

// ─── Main: Generate Time Slots ───

export function generateTimeSlots(
  workingHours: WorkingHours,
  date: Date,
  serviceDurationMinutes: number,
  addonsDurationMinutes: number,
  slotIntervalMinutes: number,
  bufferMinutes: number,
  existingBookings: Array<{ start_time: string; end_time: string }>,
  activeLocks: Array<{ start_time: string; end_time?: string; expires_at?: string }>,
  config: {
    proximity_window_hours?: number;
    early_extra_hours?: number;
    late_extra_hours?: number;
    expand_threshold?: number;
    allow_overflow?: boolean;
    overflow_minutes?: number;
    optimization_mode?: "hybrid" | "legacy";
    suggestion_limit?: number;
    min_useful_gap_minutes?: number;
  } = {},
  specificDaysOff: string[] = []
): TimeSlot[] {
  // Treat malformed database/config values defensively. A zero or negative
  // resolution would make the candidate loop never advance and can freeze the
  // booking page; the owner settings API normally enforces 5–60 minutes.
  const configuredResolution = Number(slotIntervalMinutes);
  const resolution = Number.isFinite(configuredResolution) && configuredResolution >= 5 && configuredResolution <= 60
    ? Math.floor(configuredResolution)
    : 15;
  const configuredServiceDuration = Number(serviceDurationMinutes);
  const configuredAddonDuration = Number(addonsDurationMinutes);
  if (!Number.isFinite(configuredServiceDuration) || configuredServiceDuration < 0 ||
      !Number.isFinite(configuredAddonDuration) || configuredAddonDuration < 0) {
    return [];
  }
  const proximityMinutes = (config.proximity_window_hours ?? 2) * 60;
  const cfg: EngineConfig = {
    resolution,
    buffer: bufferMinutes,
    proximityWindow: proximityMinutes,
    earlyExtraHours: config.early_extra_hours ?? 0,
    lateExtraHours: config.late_extra_hours ?? 0,
    expandThreshold: config.expand_threshold ?? 80,
    allowOverflow: config.allow_overflow ?? false,
    overflowMinutes: config.overflow_minutes ?? 0,
  };
  // Get working hours for this day
  const dayKey = getIranWeekDay(date);
  const dayHours = workingHours[dayKey];
  if (!dayHours) return []; // Closed day

  // Check specific days off (holidays, custom closures)
  if (specificDaysOff.includes(getTehranDateKey(date))) return [];

  // Calculate effective duration
  const effectiveDuration = computeEffectiveDuration(
    configuredServiceDuration,
    configuredAddonDuration,
    cfg.buffer,
    cfg.resolution
  );
  const recommendationConfig: RecommendationConfig = {
    mode: config.optimization_mode ?? "hybrid",
    suggestionLimit: config.suggestion_limit ?? 3,
    minUsefulGapMinutes: config.min_useful_gap_minutes ?? Math.max(30, effectiveDuration),
  };

  // Raw shift boundaries
  const rawShiftStart = parseTime(dayHours.open);
  const rawShiftEnd = parseTime(dayHours.close);

  // Guard against malformed working hours data
  if (isNaN(rawShiftStart) || isNaN(rawShiftEnd) || rawShiftEnd <= rawShiftStart) {
    console.error(`[SLOTS] Invalid working hours for ${dayKey}: open=${dayHours.open}, close=${dayHours.close}`);
    return [];
  }

  // Convert bookings and blocks to minutes
  const bookings: TimeBlock[] = existingBookings
    .map((b) => ({ start: parseTime(b.start_time), end: parseTime(b.end_time) }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start);

  const blocks: TimeBlock[] = activeLocks
    .filter((l) => !l.expires_at || new Date(l.expires_at).getTime() >= Date.now())
    .map((l) => {
      const start = parseTime(l.start_time);
      const end = l.end_time ? parseTime(l.end_time) : start + effectiveDuration;
      return { start, end };
    })
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start);

  const occupied = mergeBlocks([...bookings, ...blocks]);

  // Compute expanded shift
  const { start: shiftStart, end: shiftEnd } = computeExpandedShift(
    rawShiftStart,
    rawShiftEnd,
    bookings,
    cfg
  );

  // Hard limit: slot end must not exceed this
  const hardEndLimit = rawShiftEnd + (cfg.allowOverflow ? (cfg.overflowMinutes ?? 0) : 0);

  // Generate all candidate slots on the resolution grid
  // Use expanded end (shiftEnd) for late_extra_hours, not rawShiftEnd
  const now = getTehranNow();
  const isToday = getTehranDateKey(date) === now.dateKey;
  const nowMinutes = now.minutes;

  const candidates: TimeBlock[] = [];
  for (let m = shiftStart; m < shiftEnd; m += cfg.resolution) {
    const slot: TimeBlock = { start: m, end: m + effectiveDuration };

    // Service can extend past shift end, but NOT past the hard limit (extra hours)
    if (slot.end > hardEndLimit) continue;
    if (isToday && m < nowMinutes) continue;

    candidates.push(slot);
  }

  // Filter out slots that overlap occupied blocks
  const available = candidates.filter(
    (slot) => !occupied.some((block) => overlaps(slot, block))
  );

  // Apply Level filtering based on booking count
  let filtered: TimeBlock[];

  if (bookings.length === 0) {
    // Level 1: all valid slots
    filtered = available;
  } else if (bookings.length === 1) {
    // Level 2: proximity filter
    filtered = filterByProximity(
      available,
      bookings,
      cfg.proximityWindow
    );

    // If no slots in proximity, try expanded proximity (2x)
    if (filtered.length === 0) {
      filtered = filterByProximity(
        available,
        bookings,
        cfg.proximityWindow * 2
      );
    }
  } else {
    // Level 3: gap fill + edge attach
    filtered = available;
  }

  // Rank only valid choices. Hard availability is still determined above and
  // never depends on the recommendation score.
  const ranked = rankAvailableSlots(
    filtered,
    occupied,
    bookings.length,
    shiftStart,
    shiftEnd,
    cfg.resolution,
    cfg.proximityWindow,
    recommendationConfig
  );
  const recommendations = selectRecommendations(
    ranked,
    bookings.length,
    shiftStart,
    shiftEnd,
    cfg.resolution,
    recommendationConfig
  );
  const rankedByStart = new Map(ranked.map((item) => [item.block.start, item]));
  const recommendedStarts = recommendationConfig.mode === "legacy"
    ? new Set(
        bookings.length === 0
          ? []
          : bookings.length === 1
            ? filtered.map((slot) => slot.start)
            : classifyLegacySuggestions(filtered, occupied, effectiveDuration, cfg.resolution).map((slot) => slot.start)
      )
    : new Set(recommendations.map((item) => item.block.start));

  // Build result — show ALL slots for display (use expanded shiftEnd)
  const result: TimeSlot[] = [];
  for (let m = shiftStart; m < shiftEnd; m += cfg.resolution) {
    const slot: TimeBlock = { start: m, end: m + effectiveDuration };
    if (slot.end > hardEndLimit) continue;

    const isBooked = bookings.some((b) => overlaps(slot, b));
    const isBlocked = blocks.some((b) => overlaps(slot, b));
    const isAvailable = filtered.some((s) => s.start === m);
    const rankedSlot = rankedByStart.get(m);
    const isSuggested = isAvailable && recommendedStarts.has(m);
    const diagnosticsEnabled = recommendationConfig.mode === "hybrid";

    result.push({
      time: formatTime(m),
      available: isAvailable,
      booked: isBooked,
      locked: isBlocked,
      suggested: isSuggested,
      ...(diagnosticsEnabled && rankedSlot ? {
        score: rankedSlot.score,
        recommendation: rankedSlot.recommendation,
      } : {}),
    });
  }

  return result;
}

// ─── Get nearest available slot (14-day scan) ───

export function getNearestAvailableSlot(
  workingHours: WorkingHours,
  serviceDurationMinutes: number,
  addonsDurationMinutes: number,
  slotIntervalMinutes: number,
  bufferMinutes: number,
  existingBookings: Array<{ date_gregorian: string; start_time: string; end_time: string }>,
  activeLocks: Array<{ date_gregorian: string; start_time: string; expires_at: string }>,
  config: {
    proximity_window_hours?: number;
    early_extra_hours?: number;
    late_extra_hours?: number;
    expand_threshold?: number;
    allow_overflow?: boolean;
    overflow_minutes?: number;
    optimization_mode?: "hybrid" | "legacy";
    suggestion_limit?: number;
    min_useful_gap_minutes?: number;
  } = {},
  specificDaysOff: string[] = []
): { date: Date; time: string } | null {
  const now = getTehranNow();
  const todayJalali = gregorianToJalali(new Date(now.dateKey));

  for (let offset = 0; offset < 14; offset++) {
    let jy = todayJalali.jy;
    let jm = todayJalali.jm;
    let jd = todayJalali.jd + offset;

    // ── FIX: recalculate monthLength after every month rollover ──
    let monthLength = isJalaliLeapYear(jy) && jm === 12 ? 30 : DAYS_IN_MONTH[jm - 1];
    while (jd > monthLength) {
      jd -= monthLength;
      jm++;
      if (jm > 12) { jm = 1; jy++; }
      monthLength = isJalaliLeapYear(jy) && jm === 12 ? 30 : DAYS_IN_MONTH[jm - 1];
    }

    const checkDate = jalaliToGregorian(jy, jm, jd);
    const dateStr = getTehranDateKey(checkDate);

    const dayBookings = existingBookings
      .filter((b) => b.date_gregorian === dateStr)
      .map((b) => ({ start_time: b.start_time, end_time: b.end_time }));

    const dayLocks = activeLocks
      .filter((l) => l.date_gregorian === dateStr)
      .map((l) => ({ start_time: l.start_time, expires_at: l.expires_at }));

    const slots = generateTimeSlots(
      workingHours, checkDate, serviceDurationMinutes, addonsDurationMinutes,
      slotIntervalMinutes, bufferMinutes, dayBookings, dayLocks, config, specificDaysOff
    );

    // In hybrid mode, choose the highest-scored recommendation rather than
    // merely the first chronological suggestion. Keep a safe availability
    // fallback if no recommendation exists.
    const best = config.optimization_mode === "legacy"
      ? slots.find((s) => s.available)
      : slots
          .filter((s) => s.available && s.suggested)
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
        ?? slots.find((s) => s.available);
    if (best) return { date: checkDate, time: best.time };
  }
  return null;
}
