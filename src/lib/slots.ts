/**
 * Booking Engine — Pipeline Architecture v2
 *
 * Rules:
 * - Standard durations: 15, 30, 45, 60, 90, 120 minutes
 * - Buffer: 0 (configurable)
 * - Slot interval: 30 minutes (:00 or :30)
 * - Dead gaps hard-removed
 * - Scoring: Fitness + ValuePriority - AdjacencyDistance
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

interface FreeInterval {
  start: number;
  end: number;
}

interface Candidate {
  start: number;
  end: number;
  intervalStart: number;
  intervalEnd: number;
  isRoundHour: boolean;
  isAdjacentToBooking: boolean;
}

const IRAN_WEEK_DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
const DAYS_IN_MONTH = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
const STANDARD_DURATIONS = [15, 30, 45, 60, 90, 120];

import { getTehranDateKey, getTehranNow } from "./time";
import { gregorianToJalali, jalaliToGregorian } from "./jalali";

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

// ─── Duration Rounding ───

function roundDuration(minutes: number): number {
  for (const std of STANDARD_DURATIONS) {
    if (minutes <= std) return std;
  }
  return 120;
}

// ─── Step 1: Build Free Intervals ───

function buildFreeIntervals(
  shiftStart: number,
  shiftEnd: number,
  bookings: Array<{ start: number; end: number }>,
  blocked: Array<{ start: number; end: number }>
): FreeInterval[] {
  const occupied = [...bookings, ...blocked].sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const iv of occupied) {
    if (merged.length === 0 || iv.start > merged[merged.length - 1].end) {
      merged.push({ ...iv });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, iv.end);
    }
  }

  const free: FreeInterval[] = [];
  let cursor = shiftStart;
  for (const block of merged) {
    if (cursor < block.start) free.push({ start: cursor, end: block.start });
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < shiftEnd) free.push({ start: cursor, end: shiftEnd });
  return free;
}

// ─── Step 2: Generate Candidates (30-min intervals on :00/:30) ───

function generateCandidates(
  intervals: FreeInterval[],
  serviceDuration: number
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const iv of intervals) {
    if (iv.end - iv.start < serviceDuration) continue;

    // Generate slots at :00 and :30 only
    const startHour = Math.floor(iv.start / 60);
    const startMin = iv.start % 60;
    const firstSlot = startMin <= 0 ? iv.start : (startHour + 1) * 60;

    for (let m = firstSlot; m + serviceDuration <= iv.end; m += 30) {
      candidates.push({
        start: m,
        end: m + serviceDuration,
        intervalStart: iv.start,
        intervalEnd: iv.end,
        isRoundHour: m % 60 === 0,
        isAdjacentToBooking: false,
      });
    }
  }
  return candidates;
}

// ─── Step 3: Dead Gap Filter ───

function filterDeadGaps(
  candidates: Candidate[],
  bookings: Array<{ start: number; end: number }>
): Candidate[] {
  return candidates.filter((slot) => {
    const remainderAfter = slot.intervalEnd - slot.end;
    if (remainderAfter > 0 && remainderAfter < 15) return false;

    for (const b of bookings) {
      if (b.end <= slot.start && b.end > slot.intervalStart) {
        const gapBefore = slot.start - b.end;
        if (gapBefore > 0 && gapBefore < 15) return false;
      }
    }
    return true;
  });
}

// ─── Step 4: Mark Adjacency ───

function markAdjacency(
  candidates: Candidate[],
  bookings: Array<{ start: number; end: number }>
): Candidate[] {
  for (const slot of candidates) {
    for (const b of bookings) {
      if (slot.start === b.end || slot.end === b.start) {
        slot.isAdjacentToBooking = true;
        break;
      }
    }
  }
  return candidates;
}

// ─── Step 5: Score ───

function scoreCandidates(
  candidates: Candidate[],
  priorityScore: number,
  bookings: Array<{ start: number; end: number }>
): Array<Candidate & { score: number; isRecommended: boolean }> {
  const maxDist = 480;

  const scored = candidates.map((slot) => {
    const ivLen = slot.intervalEnd - slot.intervalStart;
    const slotLen = slot.end - slot.start;
    const fitness = ivLen > 0 ? 1 - (ivLen - slotLen) / ivLen : 1;

    let minDist = maxDist;
    for (const b of bookings) {
      minDist = Math.min(minDist, Math.abs(slot.start - b.end), Math.abs(slot.end - b.start));
    }
    const adjDist = minDist / maxDist;

    const score = 0.4 * fitness + 0.2 * (priorityScore / 10) - 0.1 * adjDist;
    return { ...slot, score, isRecommended: false };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored.length > 0) scored[0].isRecommended = true;
  return scored;
}

// ─── Main Entry ───

export function generateTimeSlots(
  workingHours: WorkingHours,
  date: Date,
  serviceDurationMinutes: number,
  _slotIntervalMinutes: number,
  bufferMinutes: number,
  existingBookings: Array<{ start_time: string; end_time: string }>,
  activeLocks: Array<{ start_time: string; end_time?: string; expires_at?: string }>,
  priorityScore: number = 5
): TimeSlot[] {
  const dayKey = getIranWeekDay(date);
  const dayHours = workingHours[dayKey];
  if (!dayHours) return [];

  const now = getTehranNow();
  const isToday = getTehranDateKey(date) === now.dateKey;
  const nowMinutes = now.minutes;

  const shiftStart = parseTime(dayHours.open);
  const shiftEnd = parseTime(dayHours.close);

  const rounded = roundDuration(serviceDurationMinutes);
  const totalDuration = rounded + bufferMinutes;

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

  let intervals = buildFreeIntervals(shiftStart, shiftEnd, bookings, blocked);

  // Expand to 10:00 if 80% of 12-18 is booked
  const twelveToSixMinutes = 6 * 60;
  let bookedInWindow = 0;
  for (const b of bookings) {
    const bStart = Math.max(b.start, shiftStart);
    const bEnd = Math.min(b.end, shiftEnd);
    if (bEnd > bStart) bookedInWindow += bEnd - bStart;
  }
  if (bookedInWindow >= twelveToSixMinutes * 0.8 && shiftStart === parseTime("12:00")) {
    const earlyIntervals = buildFreeIntervals(parseTime("10:00"), parseTime("12:00"), bookings, blocked);
    intervals = [...earlyIntervals, ...intervals];
  }

  let candidates = generateCandidates(intervals, totalDuration);

  if (isToday) candidates = candidates.filter((c) => c.start >= nowMinutes);

  candidates = filterDeadGaps(candidates, bookings);
  candidates = markAdjacency(candidates, bookings);

  const scored = scoreCandidates(candidates, priorityScore, bookings);
  const final = scored.slice(0, 6);

  return final.map((s) => ({
    time: formatTime(s.start),
    available: true,
    booked: false,
    locked: false,
    suggested: s.isRecommended || s.isAdjacentToBooking || s.isRoundHour,
    score: Math.round(s.score * 100) / 100,
  }));
}

// ─── Nearest Slot (14-day scan) ───

export function getNearestAvailableSlot(
  workingHours: WorkingHours,
  serviceDurationMinutes: number,
  _slotIntervalMinutes: number,
  bufferMinutes: number,
  existingBookings: Array<{ date_gregorian: string; start_time: string; end_time: string }>,
  activeLocks: Array<{ date_gregorian: string; start_time: string; expires_at: string }>,
  priorityScore: number = 5
): { date: Date; time: string } | null {
  const todayJalali = gregorianToJalali(new Date());

  for (let offset = 0; offset < 14; offset++) {
    const jy = todayJalali.jy;
    let jm = todayJalali.jm;
    let jd = todayJalali.jd + offset;
    while (jd > DAYS_IN_MONTH[jm - 1]) {
      jd -= DAYS_IN_MONTH[jm - 1];
      jm++;
      if (jm > 12) jm = 1;
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
      workingHours, checkDate, serviceDurationMinutes, 30, bufferMinutes,
      dayBookings, dayLocks, priorityScore
    );
    const best = slots.find((s) => s.available);
    if (best) return { date: checkDate, time: best.time };
  }
  return null;
}
