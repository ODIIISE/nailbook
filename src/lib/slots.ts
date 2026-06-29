export interface WorkingHours {
  [key: string]: { open: string; close: string } | null;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  booked: boolean;
  locked: boolean;
}

const IRAN_WEEK_DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];

export function getIranWeekDay(date: Date): string {
  const jsDay = date.getDay();
  return IRAN_WEEK_DAYS[jsDay === 6 ? 0 : jsDay === 5 ? 6 : jsDay - 1];
}

export function generateTimeSlots(
  workingHours: WorkingHours,
  date: Date,
  serviceDurationMinutes: number,
  slotIntervalMinutes: number,
  bufferMinutes: number,
  existingBookings: Array<{ start_time: string; end_time: string }>,
  activeLocks: Array<{ start_time: string; expires_at: string }>
): TimeSlot[] {
  const dayKey = getIranWeekDay(date);
  const dayHours = workingHours[dayKey];

  if (!dayHours) return [];

  const slots: TimeSlot[] = [];
  const [openH, openM] = dayHours.open.split(":").map(Number);
  const [closeH, closeM] = dayHours.close.split(":").map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  for (let m = openMinutes; m + serviceDurationMinutes <= closeMinutes; m += slotIntervalMinutes) {
    const slotStartH = Math.floor(m / 60);
    const slotStartM = m % 60;
    const slotEndMinutes = m + serviceDurationMinutes;
    const slotEndH = Math.floor(slotEndMinutes / 60);
    const slotEndM = slotEndMinutes % 60;

    const slotStart = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`;
    const slotEnd = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`;

    const bufferedEndMinutes = slotEndMinutes + bufferMinutes;

    const isBooked = existingBookings.some((b) => {
      const [bStartH, bStartM] = b.start_time.split(":").map(Number);
      const [bEndH, bEndM] = b.end_time.split(":").map(Number);
      const bStart = bStartH * 60 + bStartM;
      const bEnd = bEndH * 60 + bEndM;
      return m < bEnd && bufferedEndMinutes > bStart;
    });

    const isLocked = activeLocks.some((l) => {
      if (new Date(l.expires_at) < new Date()) return false;
      const [lStartH, lStartM] = l.start_time.split(":").map(Number);
      const lStart = lStartH * 60 + lStartM;
      const lEnd = lStart + serviceDurationMinutes;
      return m < lEnd && bufferedEndMinutes > lStart;
    });

    slots.push({
      time: slotStart,
      available: !isBooked && !isLocked,
      booked: isBooked,
      locked: isLocked,
    });
  }

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
  const now = new Date();

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + dayOffset);

    if (dayOffset === 0) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const dayBookings = existingBookings.filter(
        (b) => b.date_gregorian === checkDate.toISOString().split("T")[0]
      );
      const dayLocks = activeLocks.filter(
        (l) => l.date_gregorian === checkDate.toISOString().split("T")[0]
      );

      const dayKey = getIranWeekDay(checkDate);
      const dayHours = workingHours[dayKey];
      if (!dayHours) continue;

      const [openH, openM] = dayHours.open.split(":").map(Number);
      const openMinutes = openH * 60 + openM;

      if (nowMinutes >= openMinutes) {
        const slots = generateTimeSlots(
          workingHours,
          checkDate,
          serviceDurationMinutes,
          slotIntervalMinutes,
          bufferMinutes,
          dayBookings,
          dayLocks
        );
        const available = slots.find((s) => s.available && parseInt(s.time.replace(":", "")) * 1 >= nowMinutes);
        if (available) return { date: checkDate, time: available.time };
      }
    }

    const dayBookings = existingBookings.filter(
      (b) => b.date_gregorian === checkDate.toISOString().split("T")[0]
    );
    const dayLocks = activeLocks.filter(
      (l) => l.date_gregorian === checkDate.toISOString().split("T")[0]
    );

    const slots = generateTimeSlots(
      workingHours,
      checkDate,
      serviceDurationMinutes,
      slotIntervalMinutes,
      bufferMinutes,
      dayBookings,
      dayLocks
    );
    const available = slots.find((s) => s.available);
    if (available) return { date: checkDate, time: available.time };
  }

  return null;
}
