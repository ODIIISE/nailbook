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

const IRAN_WEEK_DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];

import { getTehranDateKey, getTehranNow } from "./time";
import { gregorianToJalali, jalaliToGregorian } from "./jalali";

export function getIranWeekDay(date: Date): string {
  const jsDay = date.getDay();
  return IRAN_WEEK_DAYS[jsDay === 6 ? 0 : jsDay === 5 ? 6 : jsDay - 1];
}

function calculateSlotScore(
  slotMinutes: number,
  serviceDurationMinutes: number,
  bufferMinutes: number,
  existingBookings: Array<{ start_time: string; end_time: string }>
): number {
  let score = 1;

  const slotEnd = slotMinutes + serviceDurationMinutes;

  for (const booking of existingBookings) {
    const [bStartH, bStartM] = booking.start_time.split(":").map(Number);
    const [bEndH, bEndM] = booking.end_time.split(":").map(Number);
    const bStart = bStartH * 60 + bStartM;
    const bEnd = bEndH * 60 + bEndM;

    const distanceToStart = Math.abs(slotMinutes - bStart);
    const distanceToEnd = Math.abs(slotEnd - bEnd);

    if (distanceToStart <= 120 || distanceToEnd <= 120) {
      score += 10;
    }

    if (slotMinutes === bEnd + bufferMinutes || slotEnd + bufferMinutes === bStart) {
      score += 20;
    }

    if (slotMinutes > bEnd && slotMinutes < bEnd + bufferMinutes + 30) {
      score += 15;
    }
  }

  if (existingBookings.length === 0) {
    score = 1;
  }

  return score;
}

export function generateTimeSlots(
  workingHours: WorkingHours,
  date: Date,
  serviceDurationMinutes: number,
  slotIntervalMinutes: number,
  bufferMinutes: number,
  existingBookings: Array<{ start_time: string; end_time: string }>,
  activeLocks: Array<{ start_time: string; end_time?: string; expires_at?: string }>
): TimeSlot[] {
  const dayKey = getIranWeekDay(date);
  const dayHours = workingHours[dayKey];

  if (!dayHours) return [];

  const now = getTehranNow();
  const isToday = getTehranDateKey(date) === now.dateKey;
  const nowMinutes = now.minutes;

  const slots: TimeSlot[] = [];
  const [openH, openM] = dayHours.open.split(":").map(Number);
  const [closeH, closeM] = dayHours.close.split(":").map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  for (let m = openMinutes; m + serviceDurationMinutes <= closeMinutes; m += slotIntervalMinutes) {
    if (isToday && m < nowMinutes) continue;

    const slotStartH = Math.floor(m / 60);
    const slotStartM = m % 60;
    const slotEndMinutes = m + serviceDurationMinutes;

    const slotStart = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`;

    const bufferedEndMinutes = slotEndMinutes + bufferMinutes;

    const isBooked = existingBookings.some((b) => {
      const [bStartH, bStartM] = b.start_time.split(":").map(Number);
      const [bEndH, bEndM] = b.end_time.split(":").map(Number);
      const bStart = bStartH * 60 + bStartM;
      const bEnd = bEndH * 60 + bEndM;
      return m < bEnd && bufferedEndMinutes > bStart;
    });

    const isLocked = activeLocks.some((l) => {
      if (l.expires_at && new Date(l.expires_at) < new Date()) return false;
      const [lStartH, lStartM] = l.start_time.split(":").map(Number);
      const lStart = lStartH * 60 + lStartM;
      const lEnd = l.end_time
        ? (() => { const [h, m] = l.end_time!.split(":").map(Number); return h * 60 + m; })()
        : lStart + serviceDurationMinutes;
      return m < lEnd && bufferedEndMinutes > lStart;
    });

    const available = !isBooked && !isLocked;
    const score = available ? calculateSlotScore(m, serviceDurationMinutes, bufferMinutes, existingBookings) : 0;

    slots.push({
      time: slotStart,
      available,
      booked: isBooked,
      locked: isLocked,
      suggested: score >= 10,
      score,
    });
  }

  slots.sort((a, b) => {
    if (a.available && !b.available) return -1;
    if (!a.available && b.available) return 1;
    if (a.suggested && !b.suggested) return -1;
    if (!a.suggested && b.suggested) return 1;
    return a.time.localeCompare(b.time);
  });

  return slots;
}

export function getNearestAvailableSlot(
  workingHours: WorkingHours,
  serviceDurationMinutes: number,
  slotIntervalMinutes: number,
  bufferMinutes: number,
  existingBookings: Array<{ date_gregorian: string; start_time: string; end_time: string }>,
  activeLocks: Array<{ date_gregorian: string; start_time: string; expires_at: string }>
): { date: Date; time: string } | null {
  const now = getTehranNow();
  const todayJalali = gregorianToJalali(new Date());

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const jy = todayJalali.jy;
    let jm = todayJalali.jm;
    let jd = todayJalali.jd + dayOffset;

    // Simple Jalali date arithmetic
    const daysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    while (jd > daysInMonth[jm - 1]) {
      jd -= daysInMonth[jm - 1];
      jm++;
      if (jm > 12) {
        jm = 1;
      }
    }

    const checkDate = jalaliToGregorian(jy, jm, jd);
    const dateStr = getTehranDateKey(checkDate);
    const dayBookings = existingBookings.filter((b) => b.date_gregorian === dateStr);
    const dayLocks = activeLocks.filter((l) => l.date_gregorian === dateStr);

    const slots = generateTimeSlots(
      workingHours,
      checkDate,
      serviceDurationMinutes,
      slotIntervalMinutes,
      bufferMinutes,
      dayBookings,
      dayLocks
    );

    const best = slots.find((s) => s.available);
    if (best) return { date: checkDate, time: best.time };
  }

  return null;
}
