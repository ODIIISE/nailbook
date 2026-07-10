/**
 * Booking Engine v5 — Fully Configurable
 *
 * All values come from salon settings (database):
 * - slot_interval_minutes: configurable slot interval
 * - slot_buffer_minutes: configurable buffer after each booking
 * - working_hours: per-day open/close times
 *
 * No hardcoded time values. All behavior is data-driven.
 */

export interface WorkingHours {
  [key: string]: { open: string; close: string } | null;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  booked: boolean;
  locked: boolean;
  suggested: boolean;
  score: number;
}

export interface SlotConfig {
  slotIntervalMinutes: number;
  bufferMinutes: number;
  minGapMinutes: number;
  expandHours: number;
  expandThreshold: number; // 0.8 = 80%
  suggestedCount: number;
}

interface FreeInterval {
  start: number;
  end: number;
}

const IRAN_WEEK_DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
const STANDARD_DURATIONS = [15, 30, 45, 60, 90, 120];

const DEFAULT_CONFIG: SlotConfig = {
  slotIntervalMinutes: 15,
  bufferMinutes: 0,
  minGapMinutes: 15,
  expandHours: 2,
  expandThreshold: 0.8,
  suggestedCount: 4,
};

import { getTehranDateKey, getTehranNow } from "./time";
import { gregorianToJalali, jalaliToGregorian, DAYS_IN_MONTH } from "./jalali";

export function getIranWeekDay(date: Date): string {
  const jsDay = date.getDay();
  return IRAN_WEEK_DAYS[jsDay === 6 ? 0 : jsDay === 5 ? 6 : jsDay - 1];
}

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

// ─── Build merged occupied intervals ───

function buildOccupiedIntervals(
  bookings: Array<{ start: number; end: number }>,
  blocked: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  const occupied = [...bookings, ...blocked].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const iv of occupied) {
    if (merged.length === 0 || iv.start > merged[merged.length - 1].end) {
      merged.push({ ...iv });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, iv.end);
    }
  }
  return merged;
}

// ─── Build free intervals from occupied ───

function buildFreeIntervals(
  shiftStart: number,
  shiftEnd: number,
  occupied: Array<{ start: number; end: number }>
): FreeInterval[] {
  const free: FreeInterval[] = [];
  let cursor = shiftStart;
  for (const block of occupied) {
    if (cursor < block.start) free.push({ start: cursor, end: block.start });
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < shiftEnd) free.push({ start: cursor, end: shiftEnd });
  return free;
}

// ─── Check if a slot creates a dead gap ───

function createsDeadGap(
  slotStart: number,
  slotEnd: number,
  freeIntervals: FreeInterval[],
  bookings: Array<{ start: number; end: number }>,
  minGap: number
): boolean {
  for (const iv of freeIntervals) {
    if (slotEnd > iv.start && slotEnd < iv.end) {
      const remainderAfter = iv.end - slotEnd;
      if (remainderAfter > 0 && remainderAfter < minGap) return true;
    }
    if (slotStart > iv.start && slotStart < iv.end) {
      const gapBefore = slotStart - iv.start;
      if (gapBefore > 0 && gapBefore < minGap) return true;
    }
  }

  for (const b of bookings) {
    if (b.end <= slotStart && slotStart - b.end < minGap && slotStart - b.end > 0) {
      return true;
    }
  }

  return false;
}

// ─── Main Entry ───

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
  const cfg = { ...DEFAULT_CONFIG, ...config, slotIntervalMinutes, bufferMinutes };
  const slotInterval = cfg.slotIntervalMinutes;

  const dayKey = getIranWeekDay(date);
  const dayHours = workingHours[dayKey];
  if (!dayHours) return [];

  const now = getTehranNow();
  const todayKey = getTehranDateKey(new Date());
  const isToday = getTehranDateKey(date) === todayKey;
  const nowMinutes = now.minutes;

  let shiftStart = parseTime(dayHours.open);
  const shiftEnd = parseTime(dayHours.close);

  const rounded = roundDuration(serviceDurationMinutes);
  const totalDuration = rounded + cfg.bufferMinutes;

  const bookings = existingBookings.map((b) => ({
    start: parseTime(b.start_time),
    end: parseTime(b.end_time),
  }));

  const blocked = activeLocks
    .filter((l) => !l.expires_at || new Date(l.expires_at) >= new Date())
    .map((l) => ({
      start: parseTime(l.start_time),
      end: l.end_time ? parseTime(l.end_time) : parseTime(l.start_time) + totalDuration,
    }));

  const occupied = buildOccupiedIntervals(bookings, blocked);

  // ─── Dynamic expansion: if shift is ≥threshold booked, expand start back ───
  const shiftDuration = shiftEnd - shiftStart;
  let bookedMinutes = 0;
  for (const b of bookings) {
    const bStart = Math.max(b.start, shiftStart);
    const bEnd = Math.min(b.end, shiftEnd);
    if (bEnd > bStart) bookedMinutes += bEnd - bStart;
  }
  if (bookedMinutes >= shiftDuration * cfg.expandThreshold && shiftStart > 0) {
    const expandedStart = Math.max(0, shiftStart - cfg.expandHours * 60);
    const earlyFree = buildFreeIntervals(expandedStart, shiftStart, occupied);
    const hasEarlyAvailability = earlyFree.some(
      (iv) => iv.end - iv.start >= totalDuration
    );
    if (hasEarlyAvailability) {
      shiftStart = expandedStart;
    }
  }

  // ─── Build free intervals for availability check ───
  const freeIntervals = buildFreeIntervals(shiftStart, shiftEnd, occupied);

  // ─── Generate ALL slots using configurable interval ───
  const result: TimeSlot[] = [];
  let availableIndex = 0;

  for (let m = shiftStart; m < shiftEnd; m += slotInterval) {
    const slotEnd = m + totalDuration;

    const isBooked = bookings.some((b) => b.start < m + slotInterval && b.end > m);
    const isBlocked = blocked.some((b) => b.start < m + slotInterval && b.end > m);
    const fitsService = slotEnd <= shiftEnd;
    const isPast = isToday && m < nowMinutes;

    const fitsInFreeInterval = freeIntervals.some(
      (iv) => m >= iv.start && slotEnd <= iv.end
    );

    const isDeadGap = !isBooked && !isBlocked && fitsService && fitsInFreeInterval
      && createsDeadGap(m, slotEnd, freeIntervals, bookings, cfg.minGapMinutes);

    const available = fitsService && !isBooked && !isBlocked && !isPast && !isDeadGap && fitsInFreeInterval;

    if (available) {
      result.push({
        time: formatTime(m),
        available: true,
        booked: false,
        locked: false,
        suggested: availableIndex < cfg.suggestedCount,
        score: 0,
      });
      availableIndex++;
    } else {
      result.push({
        time: formatTime(m),
        available: false,
        booked: isBooked,
        locked: isBlocked,
        suggested: false,
        score: 0,
      });
    }
  }

  return result;
}

// ─── Nearest Slot (14-day scan) ───

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
    while (jd > DAYS_IN_MONTH[jm - 1]) {
      jd -= DAYS_IN_MONTH[jm - 1];
      jm++;
      if (jm > 12) {
        jm = 1;
        jy++;
      }
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
