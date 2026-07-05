/**
 * Booking Engine — Pipeline Architecture
 *
 * Step 1: Build free intervals from working hours minus bookings/blocks
 * Step 2: Generate raw 15-min candidate slots within each interval
 * Step 3: Hard remove dead gaps (remainder 0 < R < 15)
 * Step 4: Prefer round-hour and adjacent-to-booking slots
 * Step 5: Score with Fitness + ValuePriority − AdjacencyDistance
 * Step 6: Return 4–6 curated slots, one marked Recommended
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
  start: number; // minutes from midnight
  end: number;
}

interface Candidate {
  start: number;
  end: number;
  intervalStart: number;
  intervalEnd: number;
  isRoundHour: boolean;
  isAdjacentToBooking: boolean;
  adjacentDirection: "after" | "before" | null;
}

const IRAN_WEEK_DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
const DAYS_IN_MONTH = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

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

// ─── Step 1: Build Free Intervals ───

function buildFreeIntervals(
  shiftStart: number,
  shiftEnd: number,
  bookings: Array<{ start: number; end: number }>,
  blocked: Array<{ start: number; end: number }>
): FreeInterval[] {
  // Merge all occupied periods
  const occupied: Array<{ start: number; end: number }> = [];

  for (const b of bookings) {
    occupied.push({ start: b.start, end: b.end });
  }
  for (const bl of blocked) {
    occupied.push({ start: bl.start, end: bl.end });
  }

  // Sort by start time
  occupied.sort((a, b) => a.start - b.start);

  // Merge overlapping intervals
  const merged: Array<{ start: number; end: number }> = [];
  for (const interval of occupied) {
    if (merged.length === 0 || interval.start > merged[merged.length - 1].end) {
      merged.push({ ...interval });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end);
    }
  }

  // Compute free intervals
  const free: FreeInterval[] = [];
  let cursor = shiftStart;

  for (const block of merged) {
    if (cursor < block.start) {
      free.push({ start: cursor, end: block.start });
    }
    cursor = Math.max(cursor, block.end);
  }

  if (cursor < shiftEnd) {
    free.push({ start: cursor, end: shiftEnd });
  }

  return free;
}

// ─── Step 2: Generate Raw Candidates ───

function generateCandidates(
  intervals: FreeInterval[],
  serviceDuration: number,
  buffer: number
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const interval of intervals) {
    const intervalLength = interval.end - interval.start;
    if (intervalLength < serviceDuration + buffer) continue;

    for (let m = interval.start; m + serviceDuration + buffer <= interval.end; m += 15) {
      candidates.push({
        start: m,
        end: m + serviceDuration,
        intervalStart: interval.start,
        intervalEnd: interval.end,
        isRoundHour: m % 60 === 0,
        isAdjacentToBooking: false,
        adjacentDirection: null,
      });
    }
  }

  return candidates;
}

// ─── Step 3: Dead Gap Filter ───

function filterDeadGaps(
  candidates: Candidate[],
  buffer: number,
  bookings: Array<{ start: number; end: number }>
): Candidate[] {
  return candidates.filter((slot) => {
    // Check remainder AFTER the slot (within its free interval)
    const remainderAfter = slot.intervalEnd - (slot.end + buffer);
    if (remainderAfter > 0 && remainderAfter < 15) return false;

    // Check gap BEFORE the slot (relative to previous booking)
    if (buffer === 0) {
      // With buffer=0, check if there's a tiny gap before the slot that's unusable
      for (const booking of bookings) {
        if (booking.end <= slot.start && booking.end > slot.intervalStart) {
          const gapBefore = slot.start - booking.end;
          if (gapBefore > 0 && gapBefore < 15) return false;
        }
      }
    } else {
      // With buffer>0, the gap before should equal the buffer exactly
      for (const booking of bookings) {
        if (booking.end <= slot.start && booking.end > slot.intervalStart) {
          const gapBefore = slot.start - booking.end;
          if (gapBefore > 0 && gapBefore !== buffer) return false;
        }
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
    for (const booking of bookings) {
      // Adjacent after: slot starts exactly when booking ends
      if (slot.start === booking.end) {
        slot.isAdjacentToBooking = true;
        slot.adjacentDirection = "after";
        break;
      }
      // Adjacent before: slot ends exactly when booking starts
      if (slot.end === booking.start) {
        slot.isAdjacentToBooking = true;
        slot.adjacentDirection = "before";
        break;
      }
    }
  }
  return candidates;
}

// ─── Step 5: Score and Rank ───

function scoreCandidates(
  candidates: Candidate[],
  serviceDuration: number,
  priorityScore: number,
  bookings: Array<{ start: number; end: number }>
): Array<Candidate & { score: number; isRecommended: boolean }> {
  const maxDistance = 480; // full day in minutes

  const scored = candidates.map((slot) => {
    // Fitness: how tightly the slot uses the free interval
    const slotLength = slot.end - slot.start;
    const intervalLength = slot.intervalEnd - slot.intervalStart;
    const fitness = 1 - (intervalLength - slotLength) / intervalLength;

    // ValuePriority: normalized service priority (1-10 scale)
    const valuePriority = priorityScore / 10;

    // AdjacencyDistance: time to nearest booking (normalized 0-1)
    let minDistance = maxDistance;
    for (const booking of bookings) {
      const distToStart = Math.abs(slot.start - booking.end);
      const distToEnd = Math.abs(slot.end - booking.start);
      minDistance = Math.min(minDistance, distToStart, distToEnd);
    }
    const adjacencyDistance = minDistance / maxDistance;

    // Combined score
    const score = 0.4 * fitness + 0.2 * valuePriority - 0.1 * adjacencyDistance;

    return { ...slot, score, isRecommended: false };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Mark top scorer as recommended
  if (scored.length > 0) {
    scored[0].isRecommended = true;
  }

  return scored;
}

// ─── Step 6: Select Final List ───

function selectFinalSlots(
  scored: Array<Candidate & { score: number; isRecommended: boolean }>,
  maxSlots: number = 6,
  minSlots: number = 4
): Array<Candidate & { score: number; isRecommended: boolean }> {
  // Take top N by score
  const selected = scored.slice(0, maxSlots);

  // If fewer than minimum, this is fine — caller handles empty state
  return selected;
}

// ─── Main Entry Point ───

export function generateTimeSlots(
  workingHours: WorkingHours,
  date: Date,
  serviceDurationMinutes: number,
  slotIntervalMinutes: number,
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

  // Normalize bookings to {start, end} in minutes
  const bookings = existingBookings.map((b) => ({
    start: parseTime(b.start_time),
    end: parseTime(b.end_time),
  }));

  // Normalize blocked times, filter expired locks
  const blocked = activeLocks
    .filter((l) => {
      if (l.expires_at && new Date(l.expires_at) < new Date()) return false;
      return true;
    })
    .map((l) => ({
      start: parseTime(l.start_time),
      end: l.end_time ? parseTime(l.end_time) : parseTime(l.start_time) + serviceDurationMinutes,
    }));

  // ─── Pipeline ───

  // Step 1: Free intervals
  const freeIntervals = buildFreeIntervals(shiftStart, shiftEnd, bookings, blocked);

  // Step 2: Raw candidates
  let candidates = generateCandidates(freeIntervals, serviceDurationMinutes, bufferMinutes);

  // Filter past times for today
  if (isToday) {
    candidates = candidates.filter((c) => c.start >= nowMinutes);
  }

  // Step 3: Dead gap filter
  candidates = filterDeadGaps(candidates, bufferMinutes, bookings);

  // Step 4: Mark adjacency
  candidates = markAdjacency(candidates, bookings);

  // Step 5: Score and rank
  const scored = scoreCandidates(candidates, serviceDurationMinutes, priorityScore, bookings);

  // Step 6: Select final list
  const finalSlots = selectFinalSlots(scored);

  // Convert to TimeSlot format
  return finalSlots.map((slot) => ({
    time: formatTime(slot.start),
    available: true,
    booked: false,
    locked: false,
    suggested: slot.isRecommended || slot.isAdjacentToBooking || slot.isRoundHour,
    score: Math.round(slot.score * 100) / 100,
  }));
}

// ─── Nearest Available Slot (with 14-day fallback) ───

export function getNearestAvailableSlot(
  workingHours: WorkingHours,
  serviceDurationMinutes: number,
  slotIntervalMinutes: number,
  bufferMinutes: number,
  existingBookings: Array<{ date_gregorian: string; start_time: string; end_time: string }>,
  activeLocks: Array<{ date_gregorian: string; start_time: string; expires_at: string }>,
  priorityScore: number = 5
): { date: Date; time: string } | null {
  const todayJalali = gregorianToJalali(new Date());

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const jy = todayJalali.jy;
    let jm = todayJalali.jm;
    let jd = todayJalali.jd + dayOffset;

    // Jalali date arithmetic
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
      workingHours,
      checkDate,
      serviceDurationMinutes,
      slotIntervalMinutes,
      bufferMinutes,
      dayBookings,
      dayLocks,
      priorityScore
    );

    const best = slots.find((s) => s.available);
    if (best) return { date: checkDate, time: best.time };
  }

  return null;
}
