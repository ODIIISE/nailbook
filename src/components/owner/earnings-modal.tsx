"use client";

import { useState, useMemo } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Seg } from "@/components/ui/seg";
import { formatPrice, toPersianDigits, getJalaliDate, jalaliToGregorian } from "@/lib/jalali";
import { parseGregorianDateKey, getTehranDateKey } from "@/lib/time";
import { calculateEarnings } from "@/lib/pricing";
import type { Booking, Service, Addon } from "@/lib/types";

interface EarningsModalProps {
  bookings: Booking[];
  services: Service[];
  addons: Addon[];
  currentDate: Date;
  onClose: () => void;
}

// All ranges are anchored on UTC-noon date keys (what booking rows compare
// with) so a booking on the period's last day is never excluded by a
// time-of-day mismatch — the old local-midnight ranges dropped today's
// bookings whenever "now" was before noon UTC.
function getPeriodRange(currentDate: Date, period: "day" | "week" | "month") {
  const today = parseGregorianDateKey(getTehranDateKey(currentDate));

  if (period === "day") {
    return { start: today, end: today };
  }

  if (period === "week") {
    // Iranian week starts on Saturday.
    const start = new Date(today);
    while (start.getUTCDay() !== 6) {
      start.setUTCDate(start.getUTCDate() - 1);
    }
    const endOfPeriod = new Date(start);
    endOfPeriod.setUTCDate(endOfPeriod.getUTCDate() + 6);
    const end = endOfPeriod.getTime() > today.getTime() ? today : endOfPeriod;
    return { start, end };
  }

  // Jalali month of the anchor date — a Gregorian month boundary meant
  // "این ماه" disagreed with the owner's calendar.
  const { year, month } = getJalaliDate(currentDate);
  const start = jalaliToGregorian(year, month, 1);
  const nextMonthStart = jalaliToGregorian(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1);
  const lastDay = new Date(nextMonthStart);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  const end = lastDay.getTime() > today.getTime() ? today : lastDay;
  return { start, end };
}

export function EarningsModal({
  bookings,
  services,
  addons,
  currentDate,
  onClose,
}: EarningsModalProps) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  const earnings = useMemo(() => {
    const { start, end } = getPeriodRange(currentDate, period);
    return calculateEarnings(bookings, services, addons, start, end);
  }, [bookings, services, addons, currentDate, period]);

  return (
    <BottomSheet open onClose={onClose} title="درآمد">
      <Seg
        value={period}
        onChange={setPeriod}
        label="بازه درآمد"
        options={[
          { value: "day", label: "این روز" },
          { value: "week", label: "این هفته" },
          { value: "month", label: "این ماه" },
        ]}
      />

      <div className="list" style={{ marginTop: 8 }}>
        <div className="sum">
          <span className="mute">پرداخت شده · <span className="num">{toPersianDigits(earnings.paidCount)}</span> نوبت</span>
          <b className="num" style={{ fontWeight: 400, color: "var(--sage)" }}>{formatPrice(earnings.paid)}</b>
        </div>
        <div className="sum">
          <span className="mute">پرداخت نشده · <span className="num">{toPersianDigits(earnings.unpaidCount)}</span> نوبت</span>
          <b className="num" style={{ fontWeight: 400, color: "var(--wine-hi)" }}>{formatPrice(earnings.unpaid)}</b>
        </div>
        <div className="sum">
          <span>کل · <span className="num">{toPersianDigits(earnings.count)}</span> نوبت</span>
          <b className="num pearl" style={{ fontWeight: 400, fontSize: 19 }}>{formatPrice(earnings.total)}</b>
        </div>
      </div>

      <button type="button" className="btn gl block" style={{ marginTop: 18 }} onClick={onClose}>
        بستن
      </button>
    </BottomSheet>
  );
}
