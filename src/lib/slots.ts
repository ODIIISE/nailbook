/**
 * Booking Engine v6 — Clean Rebuild
 *
 * Design principles:
 * - All config from database (no hardcoded values)
 * - All times in Asia/Tehran timezone
 * - Every slot is generated and shown (available/booked/locked/unavailable)
 * - Clear, simple logic that's easy to debug and maintain
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

interface SlotConfig {
  interval: number;         // minutes between slot starts
  buffer: number;           // extra minutes after each booking
  minGap: number;           // minimum dead gap to allow
  earlyExtraHours: number;  // hours before shift start (0 = disabled)
  lateExtraHours: number;   // hours after shift end (0 = disabled)
  expandThreshold: number;  // percentage (0-100) to trigger expansion
  suggestedCount: number;   // first N available = suggested
}

interface TimeBlock {
  start: number; // minutes from midnight
  end: number;
}

// ─── Constants ───

const IRAN_WEEK_DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
const STANDARD_DURATIONS = [15, 30, 45, 60, 90, 120];

const DEFAULT_CONFIG: SlotConfig = {
  interval: 15,
  buffer: 0,
  minGap: 15,
  earlyExtraHours: 0,
  lateExtraHours: 0,
  expandThreshold: 80,
  suggestedCount: 4,
};

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

function roundDuration(minutes: number): number {
  for (const std of STANDARD_DURATIONS) {
    if (minutes <= std) return std;
  }
  return 120;
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

// ─── Main: Generate All Time Slots ───

export function generateTimeSlots(
  workingHours: WorkingHours,
  date: Date,
  serviceDurationMinutes: number,
  slotIntervalMinutes: number,
  bufferMinutes: number,
  existingBookings: Array<{ start_time: string; end_time: string }>,
  activeLocks: Array<{ start_time: string; end_time?: string; expires_at?: string }>,
  _priorityScore: number = 5,
  config: Partial<SlotConfig> = {}
): TimeSlot[] {
  const cfg = { ...DEFAULT_CONFIG, ...config, interval: slotIntervalMinutes, buffer: bufferMinutes };

  // Get working hours for this day
  const dayKey = getIranWeekDay(date);
  const dayHours = workingHours[dayKey];
  if (!dayHours) return []; // Closed day

  // Calculate time boundaries
  const rawShiftStart = parseTime(dayHours.open);
  const rawShiftEnd = parseTime(dayHours.close);
  const totalDuration = roundDuration(serviceDurationMinutes) + cfg.buffer;

  // Convert bookings and blocks to minutes
  const bookings: TimeBlock[] = existingBookings.map((b) => ({
    start: parseTime(b.start_time),
    end: parseTime(b.end_time),
  }));

  const blocks: TimeBlock[] = activeLocks
    .filter((l) => !l.expires_at || new Date(l.expires_at) >= new Date())
    .map((l) => ({
      start: parseTime(l.start_time),
      end: l.end_time ? parseTime(l.end_time) : parseTime(l.start_time) + totalDuration,
    }));

  // Merge all occupied time into continuous blocks
  const occupied = mergeBlocks([...bookings, ...blocks]);

  // Check if we need to expand shift (configurable threshold + extra hours)
  const { start: shiftStart, end: shiftEnd } = shouldExpandShift(rawShiftStart, rawShiftEnd, bookings, cfg);

  // Generate ALL slots from shift start to end
  const result: TimeSlot[] = [];
  let availableCount = 0;
  const now = getTehranNow();
  const isToday = getTehranDateKey(date) === now.dateKey;
  const nowMinutes = now.minutes;

  for (let m = shiftStart; m < shiftEnd; m += cfg.interval) {
    const slot: TimeBlock = { start: m, end: m + totalDuration };

    // Can the service fit in the remaining shift time?
    const fitsService = slot.end <= shiftEnd;

    // Does this slot overlap with any booking or block?
    const isBooked = bookings.some((b) => overlaps(slot, b));
    const isBlocked = blocks.some((b) => overlaps(slot, b));

    // Is this in the past (today only)?
    const isPast = isToday && m < nowMinutes;

    // Does this slot create a dead gap?
    const isDeadGap = !isBooked && !isBlocked && fitsService
      ? createsDeadGap(slot, occupied, bookings, cfg.minGap)
      : false;

    // Is this slot entirely within one free interval?
    const fitsInFreeSlot = !isBooked && !isBlocked && fitsInFreeGap(slot, occupied);

    // Final availability
    const available = fitsService && !isBooked && !isBlocked && !isPast && !isDeadGap && fitsInFreeSlot;

    if (available) {
      result.push({
        time: formatTime(m),
        available: true,
        booked: false,
        locked: false,
        suggested: availableCount < cfg.suggestedCount,
      });
      availableCount++;
    } else {
      result.push({
        time: formatTime(m),
        available: false,
        booked: isBooked,
        locked: isBlocked,
        suggested: false,
      });
    }
  }

  return result;
}

// ─── Helper: Should we expand the shift? ───

function shouldExpandShift(
  shiftStart: number,
  shiftEnd: number,
  bookings: TimeBlock[],
  cfg: SlotConfig
): { start: number; end: number } {
  const shiftDuration = shiftEnd - shiftStart;
  let bookedMinutes = 0;

  for (const b of bookings) {
    const overlapStart = Math.max(b.start, shiftStart);
    const overlapEnd = Math.min(b.end, shiftEnd);
    if (overlapEnd > overlapStart) bookedMinutes += overlapEnd - overlapStart;
  }

  // If shift is NOT ≥ threshold booked, no expansion
  if (bookedMinutes < shiftDuration * (cfg.expandThreshold / 100)) {
    return { start: shiftStart, end: shiftEnd };
  }

  let newStart = shiftStart;
  let newEnd = shiftEnd;

  // Expand early (before shift start)
  if (cfg.earlyExtraHours > 0) {
    const expandedStart = Math.max(0, shiftStart - cfg.earlyExtraHours * 60);
    const earlyFree = getFreeIntervals(expandedStart, shiftStart, []);
    const hasSpace = earlyFree.some((iv) => iv.end - iv.start >= roundDuration(15) + cfg.buffer);
    if (hasSpace) newStart = expandedStart;
  }

  // Expand late (after shift end)
  if (cfg.lateExtraHours > 0) {
    const expandedEnd = shiftEnd + cfg.lateExtraHours * 60;
    const lateFree = getFreeIntervals(shiftEnd, expandedEnd, []);
    const hasSpace = lateFree.some((iv) => iv.end - iv.start >= roundDuration(15) + cfg.buffer);
    if (hasSpace) newEnd = expandedEnd;
  }

  return { start: newStart, end: newEnd };
}

// ─── Helper: Get free intervals in a time range ───

function getFreeIntervals(start: number, end: number, occupied: TimeBlock[]): Array<{ start: number; end: number }> {
  const free: Array<{ start: number; end: number }> = [];
  let cursor = start;

  for (const block of occupied) {
    if (cursor < block.start) free.push({ start: cursor, end: block.start });
    cursor = Math.max(cursor, block.end);
  }

  if (cursor < end) free.push({ start: cursor, end: end });
  return free;
}

// ─── Helper: Does slot fit entirely within one free gap? ───

function fitsInFreeGap(slot: TimeBlock, occupied: TimeBlock[]): boolean {
  // Check each gap between occupied blocks
  let cursor = 0; // Start of shift (we only check gaps within shift)

  for (const block of occupied) {
    if (slot.start >= cursor && slot.end <= block.start) return true;
    cursor = Math.max(cursor, block.end);
  }

  // Check after last block (up to shift end - we don't know shiftEnd here, but any slot fitting before next block is fine)
  if (slot.start >= cursor) return true;

  return false;
}

// ─── Helper: Does slot create a dead gap? ───

function createsDeadGap(slot: TimeBlock, occupied: TimeBlock[], bookings: TimeBlock[], minGap: number): boolean {
  // Check gap before slot (distance from previous booking/block end)
  for (const block of occupied) {
    if (block.end <= slot.start) {
      const gapBefore = slot.start - block.end;
      if (gapBefore > 0 && gapBefore < minGap) return true;
    }
  }

  // Check gap after slot (distance to next booking/block start)
  for (const block of occupied) {
    if (slot.end <= block.start) {
      const gapAfter = block.start - slot.end;
      if (gapAfter > 0 && gapAfter < minGap) return true;
    }
  }

  return false;
}

// ─── Get nearest available slot (14-day scan) ───

export function getNearestAvailableSlot(
  workingHours: WorkingHours,
  serviceDurationMinutes: number,
  slotIntervalMinutes: number,
  bufferMinutes: number,
  existingBookings: Array<{ date_gregorian: string; start_time: string; end_time: string }>,
  activeLocks: Array<{ date_gregorian: string; start_time: string; expires_at: string }>,
  _priorityScore: number = 5,
  config: Partial<SlotConfig> = {}
): { date: Date; time: string } | null {
  const todayJalali = gregorianToJalali(new Date());

  for (let offset = 0; offset < 14; offset++) {
    let jy = todayJalali.jy;
    let jm = todayJalali.jm;
    let jd = todayJalali.jd + offset;

    // Handle month overflow
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
      workingHours, checkDate, serviceDurationMinutes, slotIntervalMinutes, bufferMinutes,
      dayBookings, dayLocks, 5, config
    );

    const best = slots.find((s) => s.available);
    if (best) return { date: checkDate, time: best.time };
  }
  return null;
}

// ─── Helpers used by other modules ───

const IRAN_WEEK_DAYS_MAP = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];

export function getIranWeekDay(date: Date): string {
  const jsDay = date.getDay();
  return IRAN_WEEK_DAYS_MAP[jsDay === 6 ? 0 : jsDay === 5 ? 6 : jsDay - 1];
}
