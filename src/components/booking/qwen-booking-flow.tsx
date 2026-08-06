"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, Check, ChevronDown, Clock, Images, Loader2, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import {
  toPersianDigits, gregorianToJalali, jalaliToGregorian, formatJalaliDate,
  DAYS_IN_MONTH, isJalaliLeapYear, PERSIAN_MONTHS, PERSIAN_WEEKDAYS, JS_TO_IRAN_DAY, getJalaliMonthDays,
} from "@/lib/jalali";
import { normalizeDigits, isValidIranianPhone, displayDigits } from "@/lib/digits";
import { generateTimeSlots, type TimeSlot } from "@/lib/slots";
import { getTehranDateKey, parseGregorianDateKey } from "@/lib/time";
import { haptic } from "@/lib/haptics";
import { ServiceImage } from "@/components/ui/service-image";
import { PinInput } from "@/components/booking/pin-input";
import { ResendOtpButton } from "@/components/auth/resend-otp-button";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { downloadIcs, googleCalendarUrl } from "@/lib/ics";
import type { Addon, Booking } from "@/lib/types";

type Step = "service" | "time" | "review" | "success";

const STEP_ORDER: Step[] = ["service", "time", "review", "success"];
const STEP_TITLES: Record<Step, string> = {
  service: "خدمتت را انتخاب کن",
  time: "زمانت را پیدا کن",
  review: "مرور و تأیید",
  success: "به‌زودی می‌بینیمت!",
};
const STEP_KICKER: Record<Step, string> = {
  service: "مرحله ۱ از ۳",
  time: "مرحله ۲ از ۳",
  review: "مرحله ۳ از ۳",
  success: "تمام شد",
};
const DAY_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function timeOfDay(hour: number): "morning" | "noon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 16) return "noon";
  return "evening";
}

const TIME_OF_DAY_META = {
  morning: { label: "صبح", icon: <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /> },
  noon: { label: "ظهر", icon: <circle cx="12" cy="12" r="5" /> },
  evening: { label: "عصر", icon: <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /> },
} as const;

function compactToman(n: number): string {
  if (n < 1000) return `${toPersianDigits(n)} تومان`;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const s = m % 1 === 0 ? String(m) : m.toFixed(1).replace(".", "٫");
    return `${toPersianDigits(s)} میلیون تومان`;
  }
  return `${toPersianDigits(Math.round(n / 1000))} هزار تومان`;
}

interface QwenBookingFlowProps {
  /** page = standalone /book route · sheet = overlay on the homepage */
  mode: "page" | "sheet";
  open?: boolean;
  onClose?: () => void;
  initialServiceId?: string | null;
  lookId?: string | null;
}

export function QwenBookingFlow({ mode, open = false, onClose, initialServiceId = null, lookId = null }: QwenBookingFlowProps) {
  const router = useRouter();
  const { salon, workingHours, services, addons, highlights, bookings, blockedTimes, addBooking, refreshSalonData, refreshBookings, specificDaysOff, loaded } = useSalon();
  const { user, sendOtp, verifyOtp } = useAuth();

  // ── Lifecycle ──
  useEffect(() => { refreshSalonData(); }, [refreshSalonData]);
  useEffect(() => {
    const interval = setInterval(() => { refreshBookings(); }, 60_000);
    return () => clearInterval(interval);
  }, [refreshBookings]);

  // ── State ──
  const [step, setStep] = useState<Step>("service");
  const [dir, setDir] = useState<1 | -1>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(initialServiceId);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => parseGregorianDateKey(getTehranDateKey(new Date())));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState("");
  const [bookingIdRaw, setBookingIdRaw] = useState("");
  const [spamError, setSpamError] = useState("");
  const [lookCleared, setLookCleared] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  // Verification
  const [authPhone, setAuthPhone] = useState("");
  const [authName, setAuthName] = useState("");
  const [otpState, setOtpState] = useState<"idle" | "sent" | "verified">("idle");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [otpAttempt, setOtpAttempt] = useState(0);

  // Sheet visibility (exit animation)
  const [sheetVisible, setSheetVisible] = useState(mode === "page");
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef(0);
  const closeTimer = useRef<number | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Duplicate-submit guards
  const isSendingOtpRef = useRef(false);
  const isVerifyingOtpRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // Date anchoring: never strand the user on a fully-booked day. On the default
  // (today) or after switching service, jump to the first day with availability —
  // but only until the user explicitly picks a date (then their choice wins).
  const userPickedDate = useRef(false);
  const anchoredSelection = useRef<string | null>(null);

  // Fresh start every time the overlay opens (scheduled in a microtask so the
  // reset never happens synchronously during render commit).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (mode !== "sheet") return;
    if (open && !wasOpen.current) {
      queueMicrotask(() => {
        setStep("service");
        setDir(1);
        setSelectedServiceId(initialServiceId);
        setSelectedAddons([]);
        setSelectedTime(null);
        setSelectedDate(parseGregorianDateKey(getTehranDateKey(new Date())));
        setOtpState("idle");
        setAuthError("");
        setSpamError("");
        setLookCleared(false);
        setBookingId("");
        setBookingIdRaw("");
        setIsBookingLoading(false);
        setDragOffset(0);
        userPickedDate.current = false;
        anchoredSelection.current = null;
      });
    }
    wasOpen.current = open;
  }, [mode, open, initialServiceId]);

  // Sheet body-lock + exit animation
  useEffect(() => {
    if (mode !== "sheet") return;
    if (open) {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const raf = window.requestAnimationFrame(() => setSheetVisible(true));
      return () => {
        window.cancelAnimationFrame(raf);
        document.body.style.overflow = prevOverflow;
      };
    }
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    queueMicrotask(() => setSheetVisible(false));
    closeTimer.current = window.setTimeout(() => {
      previousFocus.current?.focus();
      previousFocus.current = null;
      closeTimer.current = null;
    }, 600);
    return undefined;
  }, [mode, open]);

  useEffect(() => {
    if (mode !== "sheet" || !open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose?.(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mode, open, onClose]);

  // Preselect the look's service once highlights resolve (lookbook deep link
  // such as /book?look=… — salon data loads asynchronously, so re-run until
  // the selection is made or the look is gone).
  useEffect(() => {
    if (selectedServiceId) return;
    const preselectId = highlights.find((h) => h.id === lookId)?.service_id;
    if (preselectId) {
      queueMicrotask(() => setSelectedServiceId(preselectId));
    }
  }, [highlights, lookId, selectedServiceId]);

  // ── Derived data (identical engine to the legacy flow) ──
  const activeServices = useMemo(
    () => services.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [services],
  );
  const selectedService = activeServices.find((s) => s.id === selectedServiceId) ?? null;
  const activeAddons = useMemo(
    () => selectedService ? addons.filter((a) => selectedService.addon_ids.includes(a.id) && a.is_active) : [],
    [selectedService, addons],
  );
  const look = useMemo(() => {
    if (!lookId || lookCleared) return null;
    return highlights.find((h) => h.id === lookId) ?? null;
  }, [lookId, lookCleared, highlights]);

  const totalDuration = useMemo(() => {
    if (!selectedService) return 0;
    const addonsDur = selectedAddons.reduce((sum, id) => {
      const a = activeAddons.find((x) => x.id === id);
      return sum + Number(a?.duration_minutes || 0);
    }, 0);
    const raw = Number(selectedService.duration_minutes) + addonsDur;
    const buffer = Number(salon.slot_buffer_minutes);
    const resolution = Number(salon.slot_interval_minutes);
    const safeResolution = Number.isFinite(resolution) && resolution >= 5 && resolution <= 60 ? resolution : 15;
    if (!Number.isFinite(raw) || raw < 0) return 0;
    const safeBuffer = Number.isFinite(buffer) && buffer > 0 ? buffer : 0;
    return Math.ceil((raw + safeBuffer) / safeResolution) * safeResolution;
  }, [selectedService, selectedAddons, activeAddons, salon]);

  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    const addonsPrice = selectedAddons.reduce((sum, id) => {
      const a = activeAddons.find((x) => x.id === id);
      return sum + Number(a?.price || 0);
    }, 0);
    return Number(selectedService.price) + addonsPrice;
  }, [selectedService, selectedAddons, activeAddons]);

  const selectedDateParts = useMemo(() => {
    const j = gregorianToJalali(selectedDate);
    return { day: j.jd, month: PERSIAN_MONTHS[j.jm - 1], year: j.jy };
  }, [selectedDate]);

  const selectedAddonItems = useMemo(
    () => selectedAddons.map((id) => activeAddons.find((a) => a.id === id)).filter((a): a is Addon => Boolean(a)),
    [selectedAddons, activeAddons],
  );
  const validSelectedAddonIds = useMemo(() => selectedAddonItems.map((a) => a.id), [selectedAddonItems]);

  const selectedEndTime = useMemo(() => {
    if (!selectedTime) return "";
    const [h, m] = selectedTime.split(":").map(Number);
    const end = h * 60 + m + totalDuration;
    if (!Number.isFinite(h) || !Number.isFinite(m) || end >= 24 * 60) return "";
    return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  }, [selectedTime, totalDuration]);

  const engineConfig = useMemo(() => ({
    proximity_window_hours: salon.proximity_window_hours,
    early_extra_hours: salon.early_extra_hours,
    late_extra_hours: salon.late_extra_hours,
    expand_threshold: salon.expand_threshold,
    allow_overflow: salon.allow_overflow,
    overflow_minutes: salon.overflow_minutes,
    optimization_mode: salon.optimization_mode,
    suggestion_limit: salon.suggestion_limit,
    min_useful_gap_minutes: salon.min_useful_gap_minutes,
  }), [salon]);

  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    const dateStr = getTehranDateKey(selectedDate);
    const dayBookings = bookings
      .filter((b) => b.date_gregorian.split("T")[0] === dateStr && (b.status === "reserved" || b.status === "confirmed"))
      .map((b) => ({ start_time: b.start_time, end_time: b.end_time }));
    const dayBlocked = blockedTimes.filter((b) => b.date_gregorian.split("T")[0] === dateStr);
    const addonsDuration = selectedAddons.reduce((sum, id) => {
      const a = activeAddons.find((x) => x.id === id);
      return sum + Number(a?.duration_minutes || 0);
    }, 0);
    return generateTimeSlots(
      workingHours, selectedDate, Number(selectedService.duration_minutes), addonsDuration,
      salon.slot_interval_minutes, salon.slot_buffer_minutes, dayBookings, dayBlocked,
      engineConfig, specificDaysOff,
    );
  }, [selectedDate, selectedService, selectedAddons, activeAddons, workingHours, salon, bookings, blockedTimes, engineConfig, specificDaysOff]);

  // 14-day availability-aware strip (real engine)
  const days = useMemo(() => {
    const today = parseGregorianDateKey(getTehranDateKey(new Date()));
    const result: Array<{
      date: Date; weekday: string; isToday: boolean; isTomorrow: boolean; isSelected: boolean;
      jalaliDay: number; jalaliMonth: string; isFullyBooked: boolean; isOff: boolean;
    }> = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const j = gregorianToJalali(date);
      const dateStr = getTehranDateKey(date);
      const isOff = specificDaysOff.includes(dateStr) || workingHours[DAY_KEY[date.getDay()]] == null;
      let isFullyBooked = false;
      if (selectedService && workingHours && !isOff) {
        const dayBookings = bookings
          .filter((b) => b.date_gregorian.split("T")[0] === dateStr && (b.status === "reserved" || b.status === "confirmed"))
          .map((b) => ({ start_time: b.start_time, end_time: b.end_time }));
        const dayBlocked = blockedTimes.filter((b) => b.date_gregorian.split("T")[0] === dateStr);
        const addonsDuration = selectedAddons.reduce((sum, id) => {
          const a = activeAddons.find((x) => x.id === id);
          return sum + Number(a?.duration_minutes || 0);
        }, 0);
        const slots = generateTimeSlots(workingHours, date, Number(selectedService.duration_minutes), addonsDuration,
          salon.slot_interval_minutes, salon.slot_buffer_minutes, dayBookings, dayBlocked, engineConfig, specificDaysOff);
        isFullyBooked = slots.length > 0 && slots.filter((s) => s.available).length === 0;
      }
      result.push({
        date,
        weekday: PERSIAN_WEEKDAYS[JS_TO_IRAN_DAY[date.getDay()]],
        isToday: i === 0, isTomorrow: i === 1,
        isSelected: date.getTime() === selectedDate.getTime(),
        jalaliDay: j.jd, jalaliMonth: PERSIAN_MONTHS[j.jm - 1],
        isFullyBooked, isOff,
      });
    }
    return result;
  }, [selectedDate, selectedService, selectedAddons, activeAddons, workingHours, salon, bookings, blockedTimes, engineConfig, specificDaysOff]);

  // Auto-anchor: if the currently-selected day has no availability for the chosen
  // service/addons (and the user hasn't explicitly picked a date), move to the
  // first open day so the journey never dead-ends on a full day.
  useEffect(() => {
    if (!selectedService) return;
    const current = days.find((d) => d.date.getTime() === selectedDate.getTime());
    if (current && !current.isOff && !current.isFullyBooked) {
      anchoredSelection.current = null;
      return;
    }
    if (userPickedDate.current) return;
    const next = days.find((d) => !d.isOff && !d.isFullyBooked);
    if (!next) return;
    const ctxKey = `${selectedService.id}:${validSelectedAddonIds.join(",")}`;
    if (anchoredSelection.current === ctxKey) return; // already anchored for this selection
    anchoredSelection.current = ctxKey;
    setSelectedDate(next.date);
    setSelectedTime(null);
  }, [days, selectedDate, selectedService, validSelectedAddonIds]);

  // ── Navigation ──
  const goTo = useCallback((next: Step, forward: boolean) => {
    setDir(forward ? 1 : -1);
    setStep(next);
    setSpamError("");
  }, []);

  const handleBack = useCallback(() => {
    if (step === "service") {
      if (mode === "sheet") onClose?.();
      else router.push("/");
      return;
    }
    if (step === "time") { goTo("service", false); return; }
    if (step === "review") { goTo("time", false); return; }
  }, [step, mode, onClose, router, goTo]);

  const handleSelectService = useCallback((id: string) => {
    setSpamError("");
    if (selectedServiceId !== id) {
      setSelectedServiceId(id);
      setSelectedAddons([]);
      if (look && look.service_id !== id) setLookCleared(true);
      setSelectedTime(null);
    }
    haptic.tap();
  }, [selectedServiceId, look]);

  const handleToggleAddon = useCallback((addonId: string) => {
    setSelectedAddons((prev) => (prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]));
    haptic.tap();
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    userPickedDate.current = true;
    setSelectedDate(date);
    setSelectedTime(null);
    haptic.tap();
  }, []);

  const handleGoToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const j = gregorianToJalali(prev);
      let jd = j.jd + 1, jm = j.jm, jy = j.jy;
      const monthLen = (isJalaliLeapYear(jy) && jm === 12) ? 30 : DAYS_IN_MONTH[jm - 1];
      if (jd > monthLen) { jd = 1; jm++; if (jm > 12) { jm = 1; jy++; } }
      return jalaliToGregorian(jy, jm, jd);
    });
    setSelectedTime(null);
  }, []);

  // ── Verification ──
  const handleSendOtp = useCallback(async () => {
    if (isAuthLoading || isSendingOtpRef.current) return;
    const normalized = normalizeDigits(authPhone);
    if (!isValidIranianPhone(normalized)) { setAuthError("شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)"); return; }
    isSendingOtpRef.current = true;
    setIsAuthLoading(true);
    setAuthError("");
    setAuthPhone(normalized);
    try {
      const result = await sendOtp(normalized);
      if (result.success) {
        setOtpState("sent");
        setOtpAttempt((a) => a + 1);
      } else {
        setAuthError(result.error || "خطا در ارسال کد");
      }
    } catch {
      setAuthError("خطای سرور");
    } finally {
      setIsAuthLoading(false);
      isSendingOtpRef.current = false;
    }
  }, [authPhone, sendOtp, isAuthLoading]);

  const handleVerifyCode = useCallback(async (code: string) => {
    if (isAuthLoading || isVerifyingOtpRef.current) return;
    isVerifyingOtpRef.current = true;
    setIsAuthLoading(true);
    setAuthError("");
    try {
      const result = await verifyOtp(normalizeDigits(authPhone), code);
      if (result.success && result.user) {
        setOtpState("verified");
        if (!result.user.name && authName.trim()) {
          fetch("/api/auth/update-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: result.user.id, name: authName.trim() }),
          }).catch(() => {});
        }
        haptic.success();
      } else {
        setAuthError(result.error || "کد نادرست است");
        setOtpAttempt((a) => a + 1); // reset the PIN boxes
      }
    } catch {
      setAuthError("خطای سرور");
    } finally {
      setIsAuthLoading(false);
      isVerifyingOtpRef.current = false;
    }
  }, [authPhone, authName, verifyOtp, isAuthLoading]);

  const changePhone = useCallback(() => {
    setOtpState("idle");
    setAuthError("");
    setOtpAttempt((a) => a + 1);
  }, []);

  const verificationComplete = Boolean(user) || otpState === "verified";

  // ── Submit (real atomic booking, same engine) ──
  const handleConfirmBooking = useCallback(async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    if (isSubmittingRef.current) return;
    const [h, m] = selectedTime.split(":").map(Number);
    const endMinutes = h * 60 + m + totalDuration;
    if (!Number.isFinite(h) || !Number.isFinite(m) || endMinutes >= 24 * 60) {
      setSpamError("این زمان برای مدت خدمت قابل رزرو نیست");
      return;
    }
    const normalizedPhone = normalizeDigits(user?.phone ?? authPhone);
    if (!user && otpState !== "verified") { setAuthError("ابتدا شماره را تأیید کنید"); return; }
    if (!isValidIranianPhone(normalizedPhone)) { setAuthError("شماره موبایل معتبر نیست"); return; }

    isSubmittingRef.current = true;
    setIsBookingLoading(true);
    setSpamError("");
    setAuthError("");

    const customerPhone = user?.phone ?? normalizedPhone;
    const customerName = (user?.name || authName.trim() || "").trim();
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const id = crypto.randomUUID();
    setBookingId(`BK-${Date.now().toString(36).toUpperCase()}`);

    const newBooking: Booking = {
      id,
      user_id: user?.id,
      service_id: selectedService.id,
      selected_addons: validSelectedAddonIds,
      customer_name: customerName,
      customer_phone: customerPhone,
      date: (() => { const j = gregorianToJalali(selectedDate); return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`; })(),
      date_gregorian: getTehranDateKey(selectedDate),
      start_time: selectedTime,
      end_time: endTime,
      status: "reserved",
      phone_verified: Boolean(user) || otpState === "verified",
      paid: false,
      created_at: new Date().toISOString(),
      service: selectedService,
    };

    const result = await addBooking(newBooking);
    setIsBookingLoading(false);
    isSubmittingRef.current = false;
    if (result.success) {
      haptic.success();
      if (result.id) {
        setBookingId(`BK-${result.id.slice(-6).toUpperCase()}`);
        setBookingIdRaw(result.id);
      }
      setStep("success");
    } else {
      haptic.warning();
      const isConflict = result.error?.includes("قبلاً رزرو شده") || result.error?.includes("همین الان رزرو شد") || result.error?.includes("مسدود شده");
      if (isConflict) {
        await refreshBookings();
        setSelectedTime(null);
        setStep("time");
        setSpamError("این زمان در لحظه قبل رزرو شد — لطفاً زمان دیگری انتخاب کنید");
      } else {
        setSpamError(result.error || "خطا در ذخیره رزرو — لطفاً دوباره تلاش کنید");
      }
    }
  }, [selectedService, selectedDate, selectedTime, user, authPhone, authName, otpState, totalDuration, addBooking, validSelectedAddonIds, refreshBookings]);

  // ── Sticky CTA state ──
  const ctaState = useMemo(() => {
    if (step === "service") {
      const ok = Boolean(selectedService);
      return { ok, label: "ادامه", chips: ok ? `${compactToman(totalPrice)} · ${toPersianDigits(totalDuration)} دقیقه` : "" };
    }
    if (step === "time") {
      const ok = Boolean(selectedTime);
      return { ok, label: "ادامه", chips: ok ? `${toPersianDigits(selectedTime!)} · ${toPersianDigits(totalDuration)} دقیقه` : "" };
    }
    if (step === "review") {
      const ok = Boolean(selectedService && selectedDate && selectedTime && verificationComplete);
      return { ok, label: isBookingLoading ? "در حال ثبت…" : "تأیید و رزرو", chips: compactToman(totalPrice) };
    }
    return { ok: false, label: "", chips: "" };
  }, [step, selectedService, selectedTime, selectedDate, verificationComplete, isBookingLoading, totalPrice, totalDuration]);

  // ── Slot grouping (hybrid: time-of-day + suggested pins) ──
  const slotGroups = useMemo(() => {
    if (!timeSlots.length) return [];
    const groups: Array<{ key: "morning" | "noon" | "evening"; slots: TimeSlot[] }> = [
      { key: "morning", slots: [] }, { key: "noon", slots: [] }, { key: "evening", slots: [] },
    ];
    for (const s of timeSlots) {
      const [hh] = s.time.split(":").map(Number);
      const g = groups.find((x) => x.key === timeOfDay(hh));
      g?.slots.push(s);
    }
    return groups.filter((g) => g.slots.length > 0);
  }, [timeSlots]);

  const hasAnyAvailability = timeSlots.some((s) => s.available);
  const emptyReason: "closed" | "full" | null = timeSlots.length === 0 ? "closed" : hasAnyAvailability ? null : "full";

  // ── Sheet chrome ──
  if (mode === "sheet" && !open && !sheetVisible) return null;
  const translateY = mode === "sheet" && !sheetVisible ? "105%" : dragOffset > 0 ? `${dragOffset}px` : "0";

  const content = (
    <div className="qbf-flow">
      {/* Header */}
      <header className="qbf-head">
        <button type="button" className="qbf-round-btn" onClick={handleBack} aria-label="بازگشت" style={{ visibility: step === "success" ? "hidden" : "visible" }}>
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="qbf-mid">
          <span className="qbf-kicker">{STEP_KICKER[step]}</span>
          <h2 key={step} className="qbf-title">{STEP_TITLES[step]}</h2>
        </div>
        {mode === "sheet" ? (
          <button type="button" className="qbf-round-btn" onClick={onClose} aria-label="بستن">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : <span className="qbf-head-spacer" />}
      </header>

      {/* Progress */}
      <div className="qbf-progress" aria-hidden="true">
        {STEP_ORDER.filter((s) => s !== "success").map((s, i) => {
          const idx = STEP_ORDER.indexOf(step);
          const done = idx === 3 || idx > i;
          const current = idx === i;
          return (
            <div key={s} className="qbf-seg">
              <i className={done ? "done" : current ? "current" : ""} />
            </div>
          );
        })}
      </div>

      {/* Steps */}
      <div className="qbf-view">
        <section className={`qbf-step ${step === "service" ? `active enter-${dir === 1 ? "fwd" : "back"}` : ""}`}>
          <div className="qbf-step-body">
            {look && (
              <div className="qbf-look-banner">
                {look.cover_url ? (
                  <Image src={look.cover_url} alt="" width={50} height={50} unoptimized className="qbf-look-banner-img" />
                ) : (
                  <span className="qbf-look-banner-img qbf-look-banner-img-fallback"><Images className="h-5 w-5" aria-hidden="true" /></span>
                )}
                <div className="qbf-look-banner-txt">
                  <b>رزرو این مدل: {look.name}</b>
                  <span>خدمت مرتبط انتخاب شده؛ افزودنی‌ها را هرطور خواستی تغییر بده</span>
                </div>
                <button type="button" className="qbf-look-clear" onClick={() => setLookCleared(true)} aria-label="حذف مدل">✕</button>
              </div>
            )}

            <p className="qbf-sec-label">انتخاب خدمت</p>
            <div className="qbf-svc-list">
              {activeServices.map((s) => {
                const isSelected = selectedService?.id === s.id;
                const serviceAddons = addons.filter((a) => s.addon_ids.includes(a.id) && a.is_active);
                const chosenAddons = serviceAddons.filter((a) => selectedAddons.includes(a.id));
                const subtotal = Number(s.price) + chosenAddons.reduce((sum, a) => sum + Number(a.price), 0);
                const subDur = Number(s.duration_minutes) + chosenAddons.reduce((sum, a) => sum + Number(a.duration_minutes), 0);
                return (
                  <div key={s.id} className={`qbf-svc-card ${isSelected ? "sel open" : ""}`}>
                    <button type="button" className="qbf-svc-head" onClick={() => handleSelectService(s.id)} aria-pressed={isSelected}>
                      <span className="qbf-svc-thumb"><ServiceImage service={s} sizes="48px" className="object-cover" /></span>
                      <span className="qbf-svc-meta">
                        <span className="qbf-svc-top">
                          <b className="qbf-svc-name">{s.name}</b>
                          {s.is_popular && <span className="qbf-badge">پرطرفدار</span>}
                        </span>
                        <span className="qbf-svc-desc">{s.description || "رزرو آنلاین"} · {toPersianDigits(s.duration_minutes)} دقیقه</span>
                        <span className="qbf-svc-bot">
                          <span className="qbf-svc-price">از {compactToman(Number(s.price))}</span>
                        </span>
                      </span>
                      <span className={`qbf-radio ${isSelected ? "on" : ""}`} aria-hidden="true">
                        {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <ChevronDown className="qbf-svc-chev" aria-hidden="true" />
                    </button>

                    <div className="qbf-addon-body">
                      <div className="qbf-addon-inner">
                        <div className="qbf-addon-pad">
                          {serviceAddons.length > 0 ? (
                            <>
                              <div className="qbf-addon-head">
                                <span className="qbf-addon-label">افزودنی‌ها · اختیاری</span>
                                <button type="button" className="qbf-addon-clear" onClick={() => setSelectedAddons([])}>پاک کردن</button>
                              </div>
                              {serviceAddons.map((a) => {
                                const isOn = selectedAddons.includes(a.id);
                                return (
                                  <button key={a.id} type="button" className={`qbf-addon ${isOn ? "on" : ""}`} onClick={() => handleToggleAddon(a.id)} aria-pressed={isOn}>
                                    <span className={`qbf-ax ${isOn ? "on" : ""}`} aria-hidden="true">
                                      {isOn && <Check className="h-3 w-3" strokeWidth={3} />}
                                    </span>
                                    <span className="qbf-addon-meta">
                                      <b className="qbf-addon-name">{a.name}</b>
                                      <small>+{toPersianDigits(a.duration_minutes)} دقیقه</small>
                                    </span>
                                    <span className="qbf-addon-price">+{compactToman(Number(a.price))}</span>
                                  </button>
                                );
                              })}
                            </>
                          ) : (
                            <div className="qbf-addon-empty">آپشن اضافی برای این خدمت وجود ندارد</div>
                          )}
                          <div className="qbf-svc-total">
                            <span>انتخاب شما</span>
                            <b>{compactToman(subtotal)} · {toPersianDigits(subDur)} دقیقه</b>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {activeServices.length === 0 && (
                <div className="qbf-empty-card">هنوز خدمتی برای رزرو فعال نیست</div>
              )}
            </div>
          </div>
        </section>

        <section className={`qbf-step ${step === "time" ? `active enter-${dir === 1 ? "fwd" : "back"}` : ""}`}>
          <TimeStep
            days={days}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            slotGroups={slotGroups}
            emptyReason={emptyReason}
            onSelectDate={handleSelectDate}
            onSelectTime={(t) => { setSelectedTime(t); haptic.tap(); }}
            onGoToNextDay={handleGoToNextDay}
            serviceName={selectedService?.name ?? ""}
          />
        </section>

        <section className={`qbf-step ${step === "review" ? `active enter-${dir === 1 ? "fwd" : "back"}` : ""}`}>
          <ReviewStep
            service={selectedService}
            addons={selectedAddonItems}
            dateParts={selectedDateParts}
            time={selectedTime}
            endTime={selectedEndTime}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
            onEditTime={() => goTo("time", false)}
            user={user}
            authName={authName}
            onAuthName={setAuthName}
            authPhone={authPhone}
            onAuthPhone={(v) => { setAuthPhone(v); setAuthError(""); }}
            otpState={otpState}
            otpAttempt={otpAttempt}
            authError={authError}
            isAuthLoading={isAuthLoading}
            onSendOtp={handleSendOtp}
            onVerifyCode={handleVerifyCode}
            onChangePhone={changePhone}
            spamError={spamError}
            showSpam={!isBookingLoading}
          />
        </section>

        <section className={`qbf-step ${step === "success" ? "active enter-fwd" : ""}`}>
          <SuccessStep
            service={selectedService}
            addons={selectedAddonItems}
            date={selectedDate}
            time={selectedTime ?? ""}
            endTime={selectedEndTime}
            duration={totalDuration}
            price={totalPrice}
            servicePrice={Number(selectedService?.price ?? 0)}
            customerName={user?.name || authName.trim()}
            bookingId={bookingId}
            bookingIdRaw={bookingIdRaw}
            salonName={salon.name}
            salonAddress={salon.address}
            salonPhone={salon.phone}
            salonLogoUrl={salon.logo_url}
          />
        </section>
      </div>

      {/* Sticky CTA */}
      {step !== "success" && (
        <footer className="qbf-foot">
          <button type="button" className="qbf-cta" disabled={!ctaState.ok || isBookingLoading}
            onClick={() => {
              if (isBookingLoading) return;
              if (step === "service" && ctaState.ok) goTo("time", true);
              else if (step === "time" && ctaState.ok) goTo("review", true);
              else if (step === "review") handleConfirmBooking();
            }}>
            {isBookingLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <span>{ctaState.label}</span>
            )}
            {ctaState.chips && !isBookingLoading && <span className="qbf-cta-chip">{ctaState.chips}</span>}
            {!isBookingLoading && <ArrowLeft className="qbf-cta-arrow h-5 w-5" aria-hidden="true" />}
          </button>
        </footer>
      )}
    </div>
  );

  if (mode === "sheet") {
    return (
      <div className="qbf-overlay" role="presentation">
        <div className="qbf-scrim" aria-hidden="true" onClick={onClose} style={{ opacity: sheetVisible ? 1 : 0 }} />
        <div className="qbf-sheet" role="dialog" aria-modal="true" aria-label="رزرو نوبت" style={{ transform: `translateY(${translateY})` }}>
          <div
            className="qbf-handle"
            aria-hidden="true"
            onTouchStart={(e) => { touchStartY.current = e.touches[0]?.clientY ?? 0; }}
            onTouchMove={(e) => {
              const delta = (e.touches[0]?.clientY ?? touchStartY.current) - touchStartY.current;
              if (delta > 0) setDragOffset(delta);
            }}
            onTouchEnd={() => { if (dragOffset > 110) onClose?.(); else setDragOffset(0); }}
          >
            <i />
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="qbf-page">
      {!loaded && !selectedService ? <div className="qbf-loading">در حال آماده‌سازی…</div> : content}
    </div>
  );
}

// ─────────────────────────── Time step ───────────────────────────

interface DayChip {
  date: Date; weekday: string; isToday: boolean; isTomorrow: boolean; isSelected: boolean;
  jalaliDay: number; jalaliMonth: string; isFullyBooked: boolean; isOff: boolean;
}

interface TimeStepProps {
  days: DayChip[];
  selectedDate: Date;
  selectedTime: string | null;
  slotGroups: Array<{ key: "morning" | "noon" | "evening"; slots: TimeSlot[] }>;
  emptyReason: "closed" | "full" | null;
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
  onGoToNextDay: () => void;
  serviceName: string;
}

function TimeStep({ days, selectedDate, selectedTime, slotGroups, emptyReason, onSelectDate, onSelectTime, onGoToNextDay, serviceName }: TimeStepProps) {
  const [showModal, setShowModal] = useState(false);
  const j = gregorianToJalali(selectedDate);
  const selectedDateText = formatJalaliDate(j.jy, j.jm, j.jd);

  return (
    <div className="qbf-step-body">
      <div className="qbf-strip-head">
        <span className="qbf-sec-label" style={{ margin: 0 }}>انتخاب تاریخ</span>
        <button type="button" className="qbf-cal-btn" onClick={() => setShowModal(true)}>
          <CalendarDays className="h-4 w-4" aria-hidden="true" /> تقویم
        </button>
      </div>
      <div className="qbf-date-scroll">
        {days.map((d) => {
          const blocked = d.isOff || d.isFullyBooked;
          return (
            <button key={getTehranDateKey(d.date)} type="button"
              className={`qbf-date-chip ${d.isSelected ? "sel" : ""} ${blocked && !d.isSelected ? "off" : ""}`}
              onClick={() => { if (!blocked) onSelectDate(d.date); }}
              disabled={blocked}
              aria-label={`${d.isToday ? "امروز" : d.isTomorrow ? "فردا" : d.weekday} ${toPersianDigits(d.jalaliDay)} ${d.jalaliMonth}`}>
              <span className="qbf-dc-d">{d.isToday ? "امروز" : d.isTomorrow ? "فردا" : d.weekday}</span>
              <span className="qbf-dc-n">{toPersianDigits(d.jalaliDay)}</span>
              <span className="qbf-dc-m">{d.isOff ? "تعطیل" : d.isFullyBooked ? "تکمیل" : d.jalaliMonth.slice(0, 5)}</span>
            </button>
          );
        })}
      </div>

      {showModal && <MonthModal selectedDate={selectedDate} onSelect={(d) => { onSelectDate(d); setShowModal(false); }} onClose={() => setShowModal(false)} />}

      <div className="qbf-selected-date">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        <span>{selectedDateText}</span>
      </div>

      {emptyReason ? (
        <div className="qbf-empty">
          <div className="qbf-empty-icon">
            <Clock className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
          </div>
          <h3>{emptyReason === "full" ? "این روز کاملاً پر شده" : "برای این روز ساعت کاری نداریم"}</h3>
          <p>{emptyReason === "full"
            ? `همه زمان‌های مناسب برای ${serviceName} گرفته شده‌اند.`
            : "برای این روز زمان قابل رزرو نداریم؛ روز دیگری را انتخاب کنید."}</p>
          <button type="button" className="qbf-empty-cta" onClick={onGoToNextDay}>
            {emptyReason === "full" ? "برنامه فردا را ببینید" : "روز بعد را بررسی کنید"}
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        slotGroups.map((g) => {
          const meta = TIME_OF_DAY_META[g.key];
          const available = g.slots.filter((s) => s.available);
          const suggested = available.filter((s) => s.suggested);
          const other = available.filter((s) => !s.suggested);
          const taken = g.slots.filter((s) => !s.available);
          return (
            <div key={g.key} className="qbf-slot-group">
              <div className="qbf-sg-label">
                <svg viewBox="0 0 24 24" aria-hidden="true">{meta.icon}</svg>
                {meta.label}
              </div>
              {(suggested.length > 0 || other.length > 0) && (
                <div className="qbf-slot-grid">
                  {suggested.map((s) => <SlotChip key={s.time} slot={s} selected={selectedTime === s.time} onSelect={onSelectTime} suggest />)}
                  {other.map((s) => <SlotChip key={s.time} slot={s} selected={selectedTime === s.time} onSelect={onSelectTime} />)}
                </div>
              )}
              {taken.length > 0 && (
                <div className="qbf-slot-grid">
                  {taken.map((s) => <SlotChip key={s.time} slot={s} selected={false} onSelect={onSelectTime} />)}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function SlotChip({ slot, selected, onSelect, suggest = false }: { slot: TimeSlot; selected: boolean; onSelect: (t: string) => void; suggest?: boolean }) {
  const available = slot.available;
  const formatted = slot.time.split(":").map((p) => toPersianDigits(p)).join(":");
  return (
    <button type="button"
      className={`qbf-slot ${selected ? "sel" : ""} ${!available ? "off" : ""} ${suggest ? "suggest" : ""}`}
      disabled={!available}
      onClick={() => { if (available) onSelect(slot.time); }}
      aria-label={`${formatted} ${available ? "موجود" : slot.booked || slot.locked ? "رزرو شده" : "غیرقابل رزرو"}`}>
      <span className="qbf-slot-time">{formatted}</span>
      {suggest && <i className="qbf-slot-pin" aria-hidden="true">پیشنهادی</i>}
    </button>
  );
}

function MonthModal({ selectedDate, onSelect, onClose }: { selectedDate: Date; onSelect: (d: Date) => void; onClose: () => void }) {
  const today = parseGregorianDateKey(getTehranDateKey(new Date()));
  const jalaliToday = gregorianToJalali(today);
  const [viewMonth, setViewMonth] = useState(jalaliToday.jm);
  const [viewYear, setViewYear] = useState(jalaliToday.jy);
  const daysInMonth = getJalaliMonthDays(viewYear, viewMonth);
  const firstDayDate = jalaliToGregorian(viewYear, viewMonth, 1);
  const firstDayIran = JS_TO_IRAN_DAY[firstDayDate.getDay()];
  const todayKey = getTehranDateKey(today);
  const selectedKey = getTehranDateKey(selectedDate);

  const cells: Array<{ day: number | null; date: Date | null; isToday: boolean; isSelected: boolean; isPast: boolean }> = [];
  for (let i = 0; i < firstDayIran; i++) cells.push({ day: null, date: null, isToday: false, isSelected: false, isPast: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const gDate = jalaliToGregorian(viewYear, viewMonth, d);
    const gKey = getTehranDateKey(gDate);
    cells.push({ day: d, date: gDate, isToday: gKey === todayKey, isSelected: gKey === selectedKey, isPast: gKey < todayKey });
  }

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta, y = viewYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  return (
    <div className="qbf-modal-wrap">
      <div className="qbf-modal-scrim" onClick={onClose} />
      <div className="qbf-modal" role="dialog" aria-modal="true" aria-label="تقویم">
        <div className="qbf-modal-head">
          <button type="button" className="qbf-round-btn sm" onClick={() => shiftMonth(-1)} aria-label="ماه قبل">
            <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
          </button>
          <div className="qbf-modal-title">
            <b>{PERSIAN_MONTHS[viewMonth - 1]}</b>
            <span>{toPersianDigits(viewYear)}</span>
          </div>
          <button type="button" className="qbf-round-btn sm" onClick={() => shiftMonth(1)} aria-label="ماه بعد">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="qbf-modal-grid-head">
          {PERSIAN_WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="qbf-modal-grid">
          {cells.map((cell, i) =>
            cell.day === null ? <span key={`e-${i}`} /> : (
              <button key={cell.day} type="button" disabled={cell.isPast}
                className={`${cell.isSelected ? "sel" : ""} ${cell.isToday ? "today" : ""} ${cell.isPast ? "past" : ""}`}
                onClick={() => cell.date && onSelect(cell.date)}>
                {toPersianDigits(cell.day)}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Review step ───────────────────────────

interface ReviewStepProps {
  service: { id: string; name: string } | null;
  addons: Addon[];
  dateParts: { day: number; month: string; year: number };
  time: string | null;
  endTime: string;
  totalDuration: number;
  totalPrice: number;
  onEditTime: () => void;
  user: { phone: string; name: string } | null;
  authName: string;
  onAuthName: (v: string) => void;
  authPhone: string;
  onAuthPhone: (v: string) => void;
  otpState: "idle" | "sent" | "verified";
  otpAttempt: number;
  authError: string;
  isAuthLoading: boolean;
  onSendOtp: () => void;
  onVerifyCode: (code: string) => void;
  onChangePhone: () => void;
  spamError: string;
  showSpam: boolean;
}

function ReviewStep(props: ReviewStepProps) {
  const { service, addons, dateParts, time, endTime, totalDuration, totalPrice, onEditTime,
    user, authName, onAuthName, authPhone, onAuthPhone, otpState, otpAttempt, authError,
    isAuthLoading, onSendOtp, onVerifyCode, onChangePhone, spamError, showSpam } = props;

  const phoneValid = isValidIranianPhone(normalizeDigits(authPhone));

  return (
    <div className="qbf-step-body">
      <div className="qbf-review-card">
        <div className="qbf-rev-top">
          <span className="qbf-rev-ic"><Clock className="h-4 w-4" aria-hidden="true" /></span>
          <span className="qbf-rev-meta">
            <b>{service?.name ?? "—"}</b>
            <small>{toPersianDigits(totalDuration)} دقیقه · {compactToman(totalPrice)}</small>
          </span>
        </div>
        {addons.length > 0 && (
          <div className="qbf-rev-addons">
            {addons.map((a) => (
              <div key={a.id} className="qbf-rev-addon">
                <span>+ {a.name} (+{toPersianDigits(a.duration_minutes)} د)</span>
                <b>+{compactToman(Number(a.price))}</b>
              </div>
            ))}
          </div>
        )}
        <div className="qbf-rev-row">
          <CalendarDays className="qbf-rev-row-ic" aria-hidden="true" />
          <span className="qbf-rev-l">تاریخ</span>
          <span className="qbf-rev-v">{toPersianDigits(dateParts.day)} {dateParts.month}</span>
          <button type="button" className="qbf-rev-edit" onClick={onEditTime}>ویرایش</button>
        </div>
        <div className="qbf-rev-row">
          <Clock className="qbf-rev-row-ic" aria-hidden="true" />
          <span className="qbf-rev-l">ساعت</span>
          <span className="qbf-rev-v">{time ? `${toPersianDigits(time)} تا ${toPersianDigits(endTime)}` : "—"}</span>
          <button type="button" className="qbf-rev-edit" onClick={onEditTime}>ویرایش</button>
        </div>
        <div className="qbf-rev-total">
          <span>مجموع · پرداخت در سالن</span>
          <b>{compactToman(totalPrice)}</b>
        </div>
      </div>

      <div className="qbf-form-card">
        <p className="qbf-form-t">مشخصات شما</p>

        <div className="qbf-field">
          <label htmlFor="qbf-name">نام (اختیاری)</label>
          <input id="qbf-name" type="text" className="qbf-inp" value={authName}
            onChange={(e) => onAuthName(e.target.value)} placeholder="مثال: سارا احمدی" autoComplete="name" />
        </div>

        {user ? (
          <div className="qbf-verified-row">
            <span className="qbf-verified-ic"><Check className="h-4 w-4" strokeWidth={3} /></span>
            <span><b>شماره تأیید شده</b><small dir="ltr">{displayDigits(user.phone)}</small></span>
          </div>
        ) : otpState === "verified" ? (
          <div className="qbf-verified-row">
            <span className="qbf-verified-ic"><Check className="h-4 w-4" strokeWidth={3} /></span>
            <span><b>شماره تأیید شد</b><small dir="ltr">{displayDigits(authPhone)}</small></span>
            <button type="button" className="qbf-rev-edit" onClick={onChangePhone}>تغییر شماره</button>
          </div>
        ) : (
          <>
            <div className="qbf-field">
              <label htmlFor="qbf-phone">شماره موبایل</label>
              <input id="qbf-phone" type="tel" inputMode="numeric" className="qbf-inp ltr" value={authPhone}
                onChange={(e) => onAuthPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && phoneValid && !isAuthLoading && onSendOtp()}
                placeholder="۰۹۱۲۱۲۳۴۵۶۷" autoComplete="tel" />
            </div>
            {otpState === "idle" && (
              <button type="button" className="qbf-otp-send" disabled={!phoneValid || isAuthLoading} onClick={onSendOtp}>
                {isAuthLoading ? "در حال ارسال…" : "دریافت کد تأیید"}
              </button>
            )}
            {otpState === "sent" && (
              <div className="qbf-otp-block">
                <p className="qbf-otp-hint">کد ۶ رقمی پیامک‌شده را وارد کن</p>
                <PinInput key={otpAttempt} length={6} onComplete={onVerifyCode} disabled={isAuthLoading} />
                <div className="qbf-otp-actions">
                  <ResendOtpButton onResend={onSendOtp} disabled={isAuthLoading} />
                  <button type="button" className="qbf-otp-change" onClick={onChangePhone}>تغییر شماره</button>
                </div>
              </div>
            )}
          </>
        )}

        {authError && <p className="qbf-form-error">{authError}</p>}
      </div>

      <div className="qbf-policy">
        کنسلی رایگان تا ۲۴ ساعت قبل از نوبت؛ هزینهٔ افزودنی‌ها همراه خدمت در سالن پرداخت می‌شود.
      </div>

      {showSpam && spamError && <p className="qbf-form-error" role="alert">{spamError}</p>}
    </div>
  );
}

// ─────────────────────────── Success step ───────────────────────────

interface SuccessStepProps {
  service: { id: string; name: string } | null;
  addons: Addon[];
  date: Date;
  time: string;
  endTime: string;
  duration: number;
  price: number;
  servicePrice: number;
  customerName: string;
  bookingId: string;
  bookingIdRaw: string;
  salonName: string;
  salonAddress: string;
  salonPhone: string;
  salonLogoUrl: string | null;
}

function SuccessStep(props: SuccessStepProps) {
  const { service, addons, date, time, endTime, duration, price, servicePrice, customerName,
    bookingId, bookingIdRaw, salonName, salonAddress, salonPhone, salonLogoUrl } = props;
  const [icsAdded, setIcsAdded] = useState(false);

  const dateKey = getTehranDateKey(date);
  const start = `${dateKey}T${time || "00:00"}`;
  const end = `${dateKey}T${endTime || "00:00"}`;
  const eventTitle = `رزرو ${salonName} — ${service?.name ?? "نوبت"}`;
  const eventLocation = salonAddress || undefined;
  const eventDescription = addons.length
    ? `افزودنی‌ها: ${addons.map((a) => a.name).join("، ")}`
    : `رزرو ${service?.name ?? ""}`;

  return (
    <div className="qbf-success">
      <div className="qbf-check-wrap" aria-hidden="true">
        <svg viewBox="0 0 52 52" className="qbf-check-svg">
          <circle className="qbf-check-circle" cx="26" cy="26" r="24" />
          <path className="qbf-check-mark" d="M15 27l7.5 7.5L37 20" />
        </svg>
      </div>
      <h3 className="qbf-suc-t">رزرو تأیید شد!</h3>
      <p className="qbf-suc-s">پیامک تأیید برایت در راه است</p>

      <div className="qbf-cal-actions">
        <button type="button" className="qbf-cal-btn solid" onClick={() => { downloadIcs({ title: eventTitle, start, end, location: eventLocation, description: eventDescription }); setIcsAdded(true); haptic.tap(); }}>
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {icsAdded ? "به تقویم اضافه شد" : "افزودن به تقویم"}
        </button>
        <a className="qbf-cal-btn outline" href={googleCalendarUrl({ title: eventTitle, start, end, location: eventLocation, description: eventDescription })} target="_blank" rel="noopener noreferrer">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          تقویم گوگل
        </a>
      </div>

      <BookingConfirm
        serviceName={service?.name ?? ""}
        date={date}
        time={time || "00:00"}
        duration={duration}
        price={price}
        servicePrice={servicePrice}
        customerName={customerName}
        bookingId={bookingId}
        bookingIdRaw={bookingIdRaw}
        salonName={salonName}
        salonAddress={salonAddress}
        phone={salonPhone}
        salonLogoUrl={salonLogoUrl}
        addons={addons}
      />
    </div>
  );
}
