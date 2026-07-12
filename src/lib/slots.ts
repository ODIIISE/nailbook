/**
 * Booking Engine v7 — Gap-Minimization Rewrite
 *
 * 3-level proximity model:
 * - Level 1 (0 bookings): all valid slots A→B
 * - Level 2 (1 booking): ±P around existing booking
 * - Level 3 (2+ bookings): fill gaps → earliest edge → latest edge
 *
 * All config from database, all times in Asia/Tehran.
 */

import { getTehranDateKey, getTehranNow } from "./time";
import { gregorianToJalali, jalaliToGregorian, DAYS_IN_MONTH } from "./jalali";

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
}

// ─── Utilities ───

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
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

function getFreeIntervals(
  shiftStart: number,
  shiftEnd: number,
  occupied: TimeBlock[]
): Array<{ start: number; end: number }> {
  const free: Array<{ start: number; end: number }> = [];
  let cursor = shiftStart;
  for (const block of occupied) {
    if (cursor < block.start) free.push({ start: cursor, end: block.start });
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < shiftEnd) free.push({ start: cursor, end: shiftEnd });
  return free;
}

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

function classifyLevel3(
  allValidSlots: TimeBlock[],
  occupied: TimeBlock[],
  effectiveDuration: number,
  resolution: number
): { suggested: TimeBlock[]; other: TimeBlock[] } {
  const suggested: TimeBlock[] = [];
  const other: TimeBlock[] = [];

  const sorted = [...occupied].sort((a, b) => a.start - b.start);

  for (const slot of allValidSlots) {
    let isSuggested = false;

    // Check 1: Does this slot fill a gap between two bookings?
    for (let i = 0; i < sorted.length - 1; i++) {
      const gapStart = sorted[i].end;
      const gapEnd = sorted[i + 1].start;
      const gapSize = gapEnd - gapStart;
      if (gapSize >= effectiveDuration && slot.start >= gapStart && slot.end <= gapEnd) {
        isSuggested = true;
        break;
      }
    }

    // Check 2: Is this slot adjacent to any booking edge?
    if (!isSuggested) {
      for (const block of sorted) {
        if (Math.abs(slot.end - block.start) < resolution) {
          isSuggested = true;
          break;
        }
        if (Math.abs(slot.start - block.end) < resolution) {
          isSuggested = true;
          break;
        }
      }
    }

    if (isSuggested) suggested.push(slot);
    else other.push(slot);
  }

  return { suggested, other };
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
  } = {}
): TimeSlot[] {
  const resolution = slotIntervalMinutes;
  const proximityMinutes = (config.proximity_window_hours ?? 2) * 60;
  const cfg: EngineConfig = {
    resolution,
    buffer: bufferMinutes,
    proximityWindow: proximityMinutes,
    earlyExtraHours: config.early_extra_hours ?? 0,
    lateExtraHours: config.late_extra_hours ?? 0,
    expandThreshold: config.expand_threshold ?? 80,
    allowOverflow: config.allow_overflow ?? false,
  };

  // Get working hours for this day
  const dayKey = getIranWeekDay(date);
  const dayHours = workingHours[dayKey];
  if (!dayHours) return []; // Closed day

  // Calculate effective duration
  const effectiveDuration = computeEffectiveDuration(
    serviceDurationMinutes,
    addonsDurationMinutes,
    cfg.buffer,
    cfg.resolution
  );

  // Raw shift boundaries
  const rawShiftStart = parseTime(dayHours.open);
  const rawShiftEnd = parseTime(dayHours.close);

  // Convert bookings and blocks to minutes
  const bookings: TimeBlock[] = existingBookings.map((b) => ({
    start: parseTime(b.start_time),
    end: parseTime(b.end_time),
  }));

  const blocks: TimeBlock[] = activeLocks
    .filter((l) => !l.expires_at || new Date(l.expires_at) >= new Date())
    .map((l) => ({
      start: parseTime(l.start_time),
      end: l.end_time ? parseTime(l.end_time) : parseTime(l.start_time) + effectiveDuration,
    }));

  const occupied = mergeBlocks([...bookings, ...blocks]);

  // Compute expanded shift
  const { start: shiftStart, end: shiftEnd, isExpanded } = computeExpandedShift(
    rawShiftStart,
    rawShiftEnd,
    bookings,
    cfg
  );

  // Hard limit: slot end must not exceed this
  const hardEndLimit = rawShiftEnd + (cfg.allowOverflow ? cfg.lateExtraHours * 60 : 0);

  // Generate all candidate slots on the resolution grid
  // Slots can start up to (rawShiftEnd - resolution) — last slot starts just before shift end
  const now = getTehranNow();
  const isToday = getTehranDateKey(date) === now.dateKey;
  const nowMinutes = now.minutes;

  const candidates: TimeBlock[] = [];
  for (let m = shiftStart; m < rawShiftEnd; m += cfg.resolution) {
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

  // Classify suggested vs other
  let suggestedSlots: TimeBlock[];
  let otherSlots: TimeBlock[];

  if (bookings.length >= 2) {
    const classified = classifyLevel3(filtered, occupied, effectiveDuration, cfg.resolution);
    suggestedSlots = classified.suggested;
    otherSlots = classified.other;
  } else if (bookings.length === 1) {
    suggestedSlots = filtered;
    otherSlots = [];
  } else {
    suggestedSlots = [];
    otherSlots = filtered;
  }

  // Build result — show ALL slots for display
  const result: TimeSlot[] = [];
  for (let m = shiftStart; m < rawShiftEnd; m += cfg.resolution) {
    const slot: TimeBlock = { start: m, end: m + effectiveDuration };
    if (slot.end > hardEndLimit) continue;

    const isBooked = bookings.some((b) => overlaps(slot, b));
    const isBlocked = blocks.some((b) => overlaps(slot, b));
    const isPast = isToday && m < nowMinutes;
    const isAvailable = filtered.some((s) => s.start === m);
    const isSuggested = suggestedSlots.some((s) => s.start === m);

    result.push({
      time: formatTime(m),
      available: isAvailable,
      booked: isBooked,
      locked: isBlocked,
      suggested: isSuggested,
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
  } = {}
): { date: Date; time: string } | null {
  const todayJalali = gregorianToJalali(new Date());

  for (let offset = 0; offset < 14; offset++) {
    let jy = todayJalali.jy;
    let jm = todayJalali.jm;
    let jd = todayJalali.jd + offset;

    while (jd > DAYS_IN_MONTH[jm - 1]) {
      jd -= DAYS_IN_MONTH[jm - 1];
      jm++;
      if (jm > 12) { jm = 1; jy++; }
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
      slotIntervalMinutes, bufferMinutes, dayBookings, dayLocks, config
    );

    const best = slots.find((s) => s.available);
    if (best) return { date: checkDate, time: best.time };
  }
  return null;
}
