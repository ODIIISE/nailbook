"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Images, Loader2, X,
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
import { useBookingsPolling } from "@/lib/hooks/use-bookings-polling";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import { compactToman, splitCompactPrice } from "@/lib/pricing";
import { haptic } from "@/lib/haptics";
import { ServiceCard } from "@/components/booking/service-card";
import { PinInput } from "@/components/booking/pin-input";
import { ResendOtpButton } from "@/components/auth/resend-otp-button";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { downloadIcs, googleCalendarUrl } from "@/lib/ics";
import type { Addon, Booking } from "@/lib/types";

type Step = "service" | "time" | "review" | "success";

const STEP_ORDER: Step[] = ["service", "time", "review", "success"];
// Success title is owner-editable via /owner/settings → booking_success_title;
// resolved inside the component because it needs the salon context.
const SUCCESS_TITLE_DEFAULT = "به‌زودی می‌بینیمت!";
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

interface BookingFlowProps {
  /** Standalone /book route page. */
  initialServiceId?: string | null;
  /** Rebook preset (?addons=a1,a2) — filtered to the service's active add-ons. */
  initialAddons?: string[] | null;
  lookId?: string | null;
  /** Inside a bottom sheet: fill the sheet height (sticky footer included)
     instead of the page frame, and skip the title block (the sheet header
     already carries it) — back button and progress stay. */
  inSheet?: boolean;
}

export function BookingFlow({ initialServiceId = null, initialAddons = null, lookId = null }: BookingFlowProps) {
  const router = useRouter();
  const { salon, workingHours, services, addons, highlights, bookings, blockedTimes, addBooking, refreshBookings, specificDaysOff, loaded, loadFailed } = useSalon();
  const { user, sendOtp, verifyOtp, updateProfile } = useAuth();

  // ── Lifecycle ──
  useBookingsPolling("default", 60_000);

  // ── State ──
  const [step, setStep] = useState<Step>("service");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(initialServiceId);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(initialServiceId);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(() => initialAddons ?? []);
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
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [otpState, setOtpState] = useState<"idle" | "sent" | "verified">("idle");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [otpAttempt, setOtpAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setAuthPhone(user.phone);
      setAuthName(user.name.trim());
      setOtpState("verified");
    });
    return () => { cancelled = true; };
  }, [user]);

  const serviceCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const focusScrollTimer = useRef<number | null>(null);

  // Duplicate-submit guards
  const isSendingOtpRef = useRef(false);
  const isVerifyingOtpRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // Date anchoring: never strand the user on a fully-booked day. On the default
  // (today) or after switching service, jump to the first day with availability —
  // but only until the user explicitly picks a date (then their choice wins).
  const userPickedDate = useRef(false);
  const anchoredSelection = useRef<string | null>(null);


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

  // Preselect the look's service + addons once highlights resolve (lookbook
  // deep link /book?look=… — salon data loads asynchronously, so re-run until
  // the selection is made or the look is gone). Applied exactly once per look:
  // afterwards the user is free to switch service or tweak addons — nothing
  // re-fights their choices.
  //
  // The customer sheet always links /book?service=X&look=Y where X is the
  // look's own service — so an explicit ?service= only overrides when it
  // *differs* from the look's service (a stale/mismatched deep link). The
  // look's addons are always applied on top.
  const lookPresetApplied = useRef<string | null>(null);
  useEffect(() => {
    if (lookPresetApplied.current === lookId) return;
    const lookHighlight = highlights.find((h) => h.id === lookId);
    if (!lookHighlight || !lookHighlight.service_id) return;
    const svc = activeServices.find((s) => s.id === lookHighlight.service_id);
    // Service deleted or deactivated owner-side: don't preselect — the banner
    // still shows the look, the user picks any live service.
    if (!svc) return;
    // A different explicit service in the URL wins over the look's service.
    if (initialServiceId && initialServiceId !== svc.id && activeServices.some((s) => s.id === initialServiceId)) return;
    lookPresetApplied.current = lookId;
    const offered = new Set(svc.addon_ids);
    const presetAddons = (lookHighlight.addon_ids || [])
      .filter((id) => offered.has(id) && addons.some((a) => a.id === id && a.is_active));
    // Defer out of the effect body (react-hooks/set-state-in-effect).
    // Setting the service to its current value is a no-op, so this is safe
    // whether the URL already preselected the look's own service or not.
    queueMicrotask(() => {
      setSelectedServiceId(svc.id);
      setSelectedAddons(presetAddons);
    });
  }, [highlights, lookId, initialServiceId, activeServices, addons]);
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
      .filter((b) => {
        if (b.date_gregorian.split("T")[0] !== dateStr) return false;
        // Must match the server's conflict-check status list, otherwise a slot
        // the server will reject renders as free.
        return b.status === "reserved" || b.status === "confirmed" || b.status === "in_progress" || b.status === "pending";
      })
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
          .filter((b) => {
        if (b.date_gregorian.split("T")[0] !== dateStr) return false;
        // Must match the server's conflict-check status list, otherwise a slot
        // the server will reject renders as free.
        return b.status === "reserved" || b.status === "confirmed" || b.status === "in_progress" || b.status === "pending";
      })
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

  // After a server conflict (sold-out race, day turned off, past time) the flow
  // bounces to the time step and refreshes slots — but spamError renders only
  // inside ReviewStep, so the message was set on a hidden step: the bounce was
  // silent. Mirror the message here with role=alert so screen readers announce
  // the step change reason immediately.
  const conflictMessage = step === "time" ? spamError : "";

  // ── Navigation ──
  // Direction of the last step change: forward and back slide from
  // opposite edges (AUDIT-014 Atelier motion; classes in globals.css).
  // Held in state so render may read it (react-hooks/refs).
  const [stepDirection, setStepDirection] = useState<"fwd" | "back">("fwd");
  const prevStepRef = useRef<Step>("service");
  const goTo = useCallback((next: Step) => {
    setStepDirection(STEP_ORDER.indexOf(next) >= STEP_ORDER.indexOf(prevStepRef.current) ? "fwd" : "back");
    prevStepRef.current = next;
    setStep(next);
    setSpamError("");
  }, []);
  const stepAnimClass = stepDirection === "back" ? "step-enter-back" : "step-enter-fwd";

  const handleBack = useCallback(() => {
    if (step === "service") {
      // Tell the page this is a back action so the homepage slides
      // in from the back (right) side rather than the forward (left) side.
      window.dispatchEvent(new Event("nailbook:back"));
      router.push("/");
      return;
    }
    if (step === "time") { goTo("service"); return; }
    if (step === "review") { goTo("time"); return; }
  }, [step, router, goTo]);

  const cancelFocusScroll = useCallback(() => {
    if (focusScrollTimer.current) {
      window.clearTimeout(focusScrollTimer.current);
      focusScrollTimer.current = null;
    }
  }, []);

  const focusServiceCard = useCallback((id: string) => {
    cancelFocusScroll();
    // Let the accordion expand before measuring; this keeps the expanded
    // content out from under the fixed CTA.
    focusScrollTimer.current = window.setTimeout(() => {
      focusScrollTimer.current = null;
      const card = serviceCardRefs.current[id];
      // The card's first button is its header; the nearest <section> is the
      // step's scroll container.
      const header = card?.querySelector<HTMLButtonElement>("button");
      const stepEl = card?.closest<HTMLElement>("section");
      if (!card || !header || !stepEl) return;

      const cardRect = card.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const stepRect = stepEl.getBoundingClientRect();
      const safeInset = 14;
      const cardFits = cardRect.height <= stepRect.height - safeInset * 2;
      const topDelta = headerRect.top - stepRect.top - safeInset;
      const bottomDelta = cardRect.bottom - stepRect.bottom + safeInset;
      const delta = topDelta < 0 ? topDelta : cardFits && bottomDelta > 0 ? bottomDelta : 0;

      if (delta !== 0) stepEl.scrollBy({ top: delta, behavior: "smooth" });
      header.focus({ preventScroll: true });
    }, 650);
  }, [cancelFocusScroll]);

  useEffect(() => cancelFocusScroll, [cancelFocusScroll]);
  useEffect(() => {
    if (step !== "service") cancelFocusScroll();
  }, [cancelFocusScroll, step]);

  const handleSelectService = useCallback((id: string) => {
    setSpamError("");
    const isSameService = selectedServiceId === id;
    const nextExpandedId = isSameService && expandedServiceId === id ? null : id;
    setExpandedServiceId(nextExpandedId);
    if (!nextExpandedId) cancelFocusScroll();

    if (!isSameService) {
      setSelectedServiceId(id);
      setSelectedAddons([]);
      if (look && look.service_id !== id) setLookCleared(true);
      setSelectedTime(null);
    }
    if (nextExpandedId) focusServiceCard(id);
    haptic.tap();
  }, [cancelFocusScroll, expandedServiceId, focusServiceCard, look, selectedServiceId]);

  const handleToggleAddon = useCallback((addonId: string) => {
    setSelectedAddons((prev) => (prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]));
    haptic.tap();
  }, []);

  // Dismissing the look removes its preselect too: the addons that came from
  // the look no longer make sense without the look context.
  const handleClearLook = useCallback(() => {
    if (lookPresetApplied.current === lookId) {
      setSelectedAddons([]);
    }
    setLookCleared(true);
  }, [lookId]);

  const handleSelectDate = useCallback((date: Date) => {
    userPickedDate.current = true;
    setSelectedDate(date);
    setSelectedTime(null);
    haptic.tap();
  }, []);

  const handleGoToNextDay = useCallback(() => {
    userPickedDate.current = true;
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
        const existingName = result.user.name.trim();
        if (existingName) {
          setAuthName(existingName);
        } else if (authName.trim()) {
          setIsSavingProfile(true);
          const profileResult = await updateProfile(authName.trim(), result.user.id);
          setIsSavingProfile(false);
          if (!profileResult.success) {
            setAuthError(profileResult.error || "ذخیره نام انجام نشد");
            return;
          }
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
  }, [authPhone, authName, verifyOtp, updateProfile, isAuthLoading]);

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
    const customerName = authName.trim();
    if (!customerName) {
      setAuthError("لطفاً نام خود را وارد کنید");
      return;
    }
    if (!isSavingProfile && authName.trim() !== user?.name.trim()) {
      setIsSavingProfile(true);
      const profileResult = await updateProfile(authName.trim());
      setIsSavingProfile(false);
      if (!profileResult.success) {
        setAuthError(profileResult.error || "ذخیره نام انجام نشد");
        return;
      }
    }

    isSubmittingRef.current = true;
    setIsBookingLoading(true);
    setSpamError("");
    setAuthError("");

    const customerPhone = user?.phone ?? normalizedPhone;
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
      const isPast = result.error?.includes("گذشته است") ?? false;
      const isConflict = isPast
        || result.error?.includes("قبلاً رزرو شده")
        || result.error?.includes("همین الان رزرو شد")
        || result.error?.includes("مسدود شده")
        // DAY_OFF / TIME_OUTSIDE_WORKING_HOURS also reach the client as conflict
        // errors (server sets conflict: true) — refresh slots and step back so
        // the picker reflects reality instead of leaving a stale selection.
        || result.error?.includes("تعطیل است")
        || result.error?.includes("خارج از ساعات کاری");
      if (isConflict) {
        await refreshBookings();
        setSelectedTime(null);
        goTo("time");
        setSpamError(isPast
          ? "این زمان گذشته است — لطفاً زمان دیگری انتخاب کنید"
          : "این زمان در لحظه قبل رزرو شد — لطفاً زمان دیگری انتخاب کنید");
      } else {
        setSpamError(result.error || "خطا در ذخیره رزرو — لطفاً دوباره تلاش کنید");
      }
    }
  }, [selectedService, selectedDate, selectedTime, user, authPhone, authName, otpState, totalDuration, addBooking, validSelectedAddonIds, refreshBookings, updateProfile, isSavingProfile, goTo]);

  // ── Sticky CTA state — chip is the design's black price pill; the time step
  // shows the picked slot instead (its sheet variant), review shows the exact total.
  const ctaState = useMemo(() => {
    if (step === "service") {
      const ok = Boolean(selectedService);
      const { amount, unit } = splitCompactPrice(totalPrice);
      return { ok, label: "ادامه", chip: ok ? { kind: "price" as const, amount, unit, from: true } : null };
    }
    if (step === "time") {
      const ok = Boolean(selectedTime);
      return { ok, label: "ادامه", chip: ok ? { kind: "text" as const, text: `${toPersianDigits(selectedTime!)} · ${toPersianDigits(totalDuration)} دقیقه` } : null };
    }
    if (step === "review") {
      const ok = Boolean(selectedService && selectedDate && selectedTime && verificationComplete && authName.trim() && !isSavingProfile);
      const { amount, unit } = splitCompactPrice(totalPrice);
      return { ok, label: isBookingLoading ? "در حال ثبت…" : "تأیید و رزرو", chip: ok ? { kind: "price" as const, amount, unit, from: false } : null };
    }
    return { ok: false, label: "", chip: null };
  }, [step, selectedService, selectedTime, selectedDate, verificationComplete, isBookingLoading, totalPrice, totalDuration, authName, isSavingProfile]);

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

  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header — sheet chrome: X (بستن, navigates home) on the start edge, title
          centered, back arrow on the end edge (hidden on step 1 where it does nothing) */}
      <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-4 pb-2 pt-4">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground/5 text-foreground"
          onClick={handleBack}
          aria-label="بستن"
        >
          <X className="h-5 w-5" strokeWidth={1} aria-hidden="true" />
        </button>
        <div className="min-w-0 overflow-hidden text-center">
          {/* Sheet title is static per design; the success step keeps the owner-editable title */}
          <h2 key={step} className="truncate text-base font-normal">{step === "success" ? (salon.booking_success_title || SUCCESS_TITLE_DEFAULT) : "رزرو نوبت"}</h2>
        </div>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground/5 text-foreground"
          onClick={handleBack}
          aria-label="بازگشت"
          style={{ visibility: step === "service" ? "hidden" : "visible" }}
        >
          {/* RTL: back points toward the previous screen */}
          <ArrowRight className="h-5 w-5" strokeWidth={1} aria-hidden="true" />
        </button>
      </header>

      {/* Progress — 4px tri-segment, active segment white from the right (RTL) */}
      <div className="flex items-center gap-1.5 px-4 pb-2.5 pt-2.5" aria-hidden="true">
        {STEP_ORDER.filter((s) => s !== "success").map((s, i) => {
          const idx = STEP_ORDER.indexOf(step);
          const done = idx === 3 || idx > i;
          const current = idx === i;
          return (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${done || current ? "bg-foreground" : "bg-foreground/10"}`}
            />
          );
        })}
      </div>

      {/* Steps */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <section className={`absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain page-gutter pb-8 ${step === "service" ? `opacity-100 visible pointer-events-auto ${stepAnimClass}` : "opacity-0 invisible pointer-events-none"}`}>
          {look && (
            <div className="mb-3 flex items-center gap-2 rounded-none bg-primary p-3 text-primary-foreground">
              {look.cover_url ? (
                <Image src={look.cover_url} alt="" width={50} height={50} unoptimized className="h-12 w-12 shrink-0 rounded-none object-cover" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none bg-primary-foreground/10"><Images className="h-5 w-5" aria-hidden="true" /></span>
              )}
              <div className="min-w-0 flex-1">
                <b className="block text-xs font-normal">رزرو این مدل: {look.name}</b>
                <span className="mt-0.5 block text-micro text-primary-foreground/70">خدمت مرتبط انتخاب شده؛ افزودنی‌ها را هرطور خواستی تغییر بده</span>
              </div>
              <button
                type="button"
                onClick={handleClearLook}
                aria-label="حذف مدل"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg leading-none text-primary-foreground"
              >
                ✕
              </button>
            </div>
          )}

          <p className="mb-2.5 mt-1 text-xs font-normal text-foreground">انتخاب خدمات</p>
          <p className="mb-3.5 text-sm font-light leading-relaxed text-foreground/60">با انتخاب خدمات موردنظرتون می‌تونید آپشن هایی که لازم دارید رو اضافه کنید</p>
          <div className="flex flex-col gap-3">
            {activeServices.map((s, svcIdx) => {
              const isSelected = selectedService?.id === s.id;
              const isExpanded = expandedServiceId === s.id;
              const serviceAddons = addons.filter((a) => s.addon_ids.includes(a.id) && a.is_active);
              const chosenAddons = serviceAddons.filter((a) => selectedAddons.includes(a.id));
              const subtotal = Number(s.price) + chosenAddons.reduce((sum, a) => sum + Number(a.price), 0);
              const subDur = Number(s.duration_minutes) + chosenAddons.reduce((sum, a) => sum + Number(a.duration_minutes), 0);
              return (
                <div
                  key={s.id}
                  ref={(node) => { serviceCardRefs.current[s.id] = node; }}
                  style={{ "--stagger-i": Math.min(svcIdx, 5) } as CSSProperties}
                  className="reveal-item"
                >
                  <ServiceCard
                    title={s.name}
                    price={Number(s.price)}
                    badges={[
                      `${toPersianDigits(serviceAddons.length)} آپشن`,
                      `از ${toPersianDigits(s.duration_minutes)} دقیقه`,
                    ]}
                    action={{ label: "انتخاب", expanded: isExpanded }}
                    selected={isSelected}
                    onToggle={() => handleSelectService(s.id)}
                  >
                    <div>
                      {serviceAddons.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between border-t border-dashed border-border px-0.5 pb-1 pt-3">
                            <span className="text-micro font-normal text-card-foreground">افزودنی‌ها · اختیاری</span>
                            <button
                              type="button"
                              onClick={() => setSelectedAddons([])}
                              className="rounded-none px-2 py-1 text-xs font-normal text-card-foreground/60"
                            >
                              پاک کردن
                            </button>
                          </div>
                          {serviceAddons.map((a) => {
                            const isOn = selectedAddons.includes(a.id);
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => handleToggleAddon(a.id)}
                                aria-pressed={isOn}
                                className={`pressable mt-1.5 flex w-full items-center gap-2 rounded-none border p-3 text-start text-card-foreground ${isOn ? "border-card-foreground bg-card-foreground/5" : "border-card-foreground/15 bg-card"}`}
                              >
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-none border-2 ${isOn ? "border-card-foreground bg-card-foreground text-card" : "border-card-foreground/30 text-transparent"}`}
                                  aria-hidden="true"
                                >
                                  {isOn && <Check className="h-3 w-3" strokeWidth={3} />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <b className="block text-sm font-normal">{a.name}</b>
                                  <small className="mt-0.5 block text-xs text-card-foreground/60">+{toPersianDigits(a.duration_minutes)} دقیقه</small>
                                </span>
                                <span className="shrink-0 text-xs font-normal text-card-foreground">+{compactToman(Number(a.price))}</span>
                              </button>
                            );
                          })}
                        </>
                      ) : (
                        <div className="pb-1.5 pt-3.5 text-center text-xs text-card-foreground/60">آپشن اضافی برای این خدمت وجود ندارد</div>
                      )}
                      <div className="mt-3 flex items-center justify-between rounded-none bg-muted px-3 py-3 text-xs text-muted-foreground">
                        <span>انتخاب شما</span>
                        <b className="text-sm font-normal text-foreground">{compactToman(subtotal)} · {toPersianDigits(subDur)} دقیقه</b>
                      </div>
                    </div>
                  </ServiceCard>
                </div>
              );
            })}
            {activeServices.length === 0 && (
              loadFailed ? (
                <div className="rounded-none border border-border bg-card p-7 text-center text-card-foreground">
                  <p className="text-sm font-semibold">خطا در بارگذاری خدمات</p>
                  <p className="mt-1 text-xs text-card-foreground/60">اتصال برقرار نشد — لطفاً صفحه را رفرش کنید.</p>
                  <button
                    type="button"
                    className="mt-3 inline-flex h-11 items-center justify-center rounded-none border border-card-foreground/30 bg-card px-5 text-sm font-semibold text-card-foreground"
                    onClick={() => window.location.reload()}
                  >
                    تلاش مجدد
                  </button>
                </div>
              ) : (
                <div className="rounded-none border border-dashed border-border bg-card p-7 text-center text-sm text-card-foreground/60">
                  هنوز خدمتی برای رزرو فعال نیست
                </div>
              )
            )}
          </div>
        </section>

        <section className={`absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain page-gutter pb-8 ${step === "time" ? `opacity-100 visible pointer-events-auto ${stepAnimClass}` : "opacity-0 invisible pointer-events-none"}`}>
          <TimeStep
            conflictMessage={conflictMessage}
            days={days}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            slotGroups={slotGroups}
            emptyReason={emptyReason}
            onSelectDate={handleSelectDate}
            onSelectTime={(t) => { setSelectedTime(t); haptic.tap(); }}
            onGoToNextDay={handleGoToNextDay}
            serviceName={selectedService?.name ?? ""}
            totalDuration={totalDuration}
          />
        </section>

        <section className={`absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain page-gutter pb-8 ${step === "review" ? `opacity-100 visible pointer-events-auto ${stepAnimClass}` : "opacity-0 invisible pointer-events-none"}`}>
          <ReviewStep
            service={selectedService}
            lookName={look && !lookCleared ? look.name : null}
            addons={selectedAddonItems}
            dateParts={selectedDateParts}
            time={selectedTime}
            endTime={selectedEndTime}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
            onEditTime={() => goTo("time")}
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

        <section className={`absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain page-gutter pb-8 ${step === "success" ? `opacity-100 visible pointer-events-auto ${stepAnimClass}` : "opacity-0 invisible pointer-events-none"}`}>
          <SuccessStep
            service={selectedService}
            lookName={look && !lookCleared ? look.name : null}
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

      {/* Sticky CTA — white pill: black price chip on the start (right) edge,
          thin forward arrow + label on the end edge, per the sheet design */}
      {step !== "success" && (
        <footer className="px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-5">
          <button
            type="button"
            className="pressable flex h-16 w-full items-center justify-between rounded-full bg-primary px-2 text-black disabled:bg-muted"
            disabled={!ctaState.ok || isBookingLoading}
            onClick={() => {
              if (isBookingLoading) return;
              if (step === "service" && ctaState.ok) goTo("time");
              else if (step === "time" && ctaState.ok) goTo("review");
              else if (step === "review") void handleConfirmBooking();
            }}
          >
            {ctaState.chip?.kind === "price" ? (
              <span className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-black/95 px-4 text-xs font-light text-white">
                {ctaState.chip.from && <span>از</span>}
                <b className="text-lg font-medium">{ctaState.chip.amount}</b>
                <span>{[ctaState.chip.unit, "تومان"].filter(Boolean).join(" ")}</span>
              </span>
            ) : ctaState.chip ? (
              <span className="flex h-10 shrink-0 items-center rounded-full bg-black/95 px-4 text-xs font-light text-white">
                {ctaState.chip.text}
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            <span className="flex items-center gap-2 pl-2">
              {isBookingLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  {/* RTL: forward points toward the next screen */}
                  <ArrowLeft className="h-5 w-5" strokeWidth={1} aria-hidden="true" />
                  <span className="text-xl font-extralight">{ctaState.label}</span>
                </>
              )}
            </span>
          </button>
        </footer>
      )}
    </div>
  );

  // Full-bleed glass sheet: dimmed page behind (scrim), sheet pinned to the
  // bottom with 32px top corners and a #161616 hairline. Content scrolls
  // inside; width capped at the design's 520px (frame max on phones).
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="رزرو نوبت">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div className="relative flex h-[92dvh] w-full max-w-[520px] flex-col border-[0.8px] border-b-0 border-[#161616] rounded-t-[32px] bg-background text-foreground shadow-floating">
        {!loaded && !selectedService ? <div className="p-10 text-center text-sm font-semibold text-muted-foreground">در حال آماده‌سازی…</div> : content}
      </div>
    </div>
  );
}

// ─────────────────────────── Time step ───────────────────────────

interface DayChip {
  date: Date; weekday: string; isToday: boolean; isTomorrow: boolean; isSelected: boolean;
  jalaliDay: number; jalaliMonth: string; isFullyBooked: boolean; isOff: boolean;
}

interface TimeStepProps {
  conflictMessage?: string;
  days: DayChip[];
  selectedDate: Date;
  selectedTime: string | null;
  slotGroups: Array<{ key: "morning" | "noon" | "evening"; slots: TimeSlot[] }>;
  emptyReason: "closed" | "full" | null;
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
  onGoToNextDay: () => void;
  serviceName: string;
  totalDuration: number;
}

function TimeStep({ days, selectedDate, selectedTime, slotGroups, emptyReason, onSelectDate, onSelectTime, onGoToNextDay, serviceName, totalDuration, conflictMessage }: TimeStepProps) {
  const [showModal, setShowModal] = useState(false);
  // The month modal must agree with the day strip: off days (تعطیل) and fully
  // booked days (تکمیل) are disabled there, so offering them in the calendar
  // let users select a day that dead-ends in the full-day empty state.
  const edgeDateKeys = useMemo(
    () => new Set(days.filter((d) => d.isOff || d.isFullyBooked).map((d) => getTehranDateKey(d.date))),
    [days],
  );
  const j = gregorianToJalali(selectedDate);
  const selectedDateText = formatJalaliDate(j.jy, j.jm, j.jd);

  return (
    <div>
      {conflictMessage && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2.5 rounded-none border border-destructive/30 bg-destructive/10 px-3 py-3 text-xs leading-relaxed font-normal text-destructive"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-micro font-normal"
          >
            !
          </span>
          {conflictMessage}
        </div>
        )}
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-normal text-muted-foreground">انتخاب تاریخ</span>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex h-11 items-center gap-1.5 rounded-none px-2 text-xs font-normal text-primary"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" /> تقویم
        </button>
      </div>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-3 pt-1 scrollbar-hide">
        {days.map((d) => {
          const blocked = d.isOff || d.isFullyBooked;
          return (
            <button
              key={getTehranDateKey(d.date)}
              type="button"
              className={`pressable flex h-16 min-w-[58px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-none border px-3 text-sm font-normal ${d.isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"} ${blocked && !d.isSelected ? "opacity-40" : ""}`}
              onClick={() => { if (!blocked) onSelectDate(d.date); }}
              disabled={blocked}
              aria-pressed={d.isSelected}
              aria-label={`${d.isToday ? "امروز" : d.isTomorrow ? "فردا" : d.weekday} ${toPersianDigits(d.jalaliDay)} ${d.jalaliMonth}`}>
              <span className={`text-micro font-normal ${d.isSelected ? "text-primary-foreground/70" : "text-card-foreground/60"}`}>{d.isToday ? "امروز" : d.isTomorrow ? "فردا" : d.weekday}</span>
              <span className="text-lg font-normal">{toPersianDigits(d.jalaliDay)}</span>
              <span className={`text-micro font-normal ${d.isSelected ? "text-primary-foreground/70" : "text-card-foreground/60"}`}>{d.isOff ? "تعطیل" : d.isFullyBooked ? "تکمیل" : d.jalaliMonth.slice(0, 5)}</span>
            </button>
          );
        })}
      </div>

      {showModal && <MonthModal selectedDate={selectedDate} disabledDateKeys={edgeDateKeys} onSelect={(d) => { onSelectDate(d); setShowModal(false); }} onClose={() => setShowModal(false)} />}

      <div className="mb-3 flex items-center justify-center gap-2 rounded-none border border-border bg-muted px-3 py-2.5 text-sm font-normal">
        <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
        <span>{selectedDateText}</span>
      </div>

      {emptyReason ? (
        <div className="rounded-none border border-border bg-card p-8 text-center text-card-foreground">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-none bg-muted text-muted-foreground">
            <Clock className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
          </div>
          <h3 className="text-base font-normal">{emptyReason === "full" ? "این روز کاملاً پر شده" : "برای این روز ساعت کاری نداریم"}</h3>
          <p className="mx-auto mb-4 mt-1.5 max-w-[260px] text-sm leading-relaxed text-card-foreground/60">{emptyReason === "full"
            ? `همه زمان‌های مناسب برای ${serviceName} گرفته شده‌اند.`
            : "برای این روز زمان قابل رزرو نداریم؛ روز دیگری را انتخاب کنید."}</p>
          <button
            type="button"
            onClick={onGoToNextDay}
            className="inline-flex h-12 items-center gap-2 rounded-none bg-card-foreground px-5 text-sm font-normal text-card"
          >
            {emptyReason === "full" ? "برنامه فردا را ببینید" : "روز بعد را بررسی کنید"}
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          {(() => {
            const suggested = slotGroups.flatMap((g) => g.slots).filter((s) => s.available && s.suggested);
            if (!suggested.length) return null;
            return (
              <section className="mb-4 rounded-none border border-primary/25 bg-primary/5 p-3" aria-label="پیشنهاد نوبت">
                <div className="mb-3 flex items-baseline gap-2">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 self-center fill-primary"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>
                  <span className="text-sm font-normal text-primary">پیشنهاد نوبت</span>
                  <span className="text-xs font-normal text-muted-foreground">بهترین زمان‌ها برای {serviceName}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {suggested.map((s) => <SlotChip key={s.time} slot={s} selected={selectedTime === s.time} onSelect={onSelectTime} suggest />)}
                </div>
              </section>
            );
          })()}
          {slotGroups.map((g) => {
            const meta = TIME_OF_DAY_META[g.key];
            // Suggested slots live in the band above; the group keeps every
            // other slot — available and taken together, in their own state,
            // so nothing is hidden.
            const slots = g.slots.filter((s) => !(s.available && s.suggested));
            if (!slots.length) return null;
            return (
              <div key={g.key} className="mb-3">
                <div className="mb-2 mt-3 flex items-center gap-1.5 text-xs font-normal text-foreground">
                  <svg viewBox="0 0 24 24" aria-hidden="true" strokeWidth={2} className="h-3.5 w-3.5 fill-none stroke-current">{meta.icon}</svg>
                  {meta.label}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((s) => <SlotChip key={s.time} slot={s} selected={selectedTime === s.time} onSelect={onSelectTime} />)}
                </div>
              </div>
            );
          })}
          {totalDuration > 0 && (
            <p className="mt-1 text-xs font-normal leading-6 text-muted-foreground">
              مدت کل {toPersianDigits(totalDuration)} دقیقه برای خدمت و افزودنی‌های شما در نظر گرفته می‌شود.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SlotChip({ slot, selected, onSelect, suggest = false }: { slot: TimeSlot; selected: boolean; onSelect: (t: string) => void; suggest?: boolean }) {
  const available = slot.available;
  const formatted = slot.time.split(":").map((p) => toPersianDigits(p)).join(":");
  return (
    <button type="button"
      className={`pressable relative flex h-11 min-w-16 flex-col items-center justify-center gap-0.5 rounded-none border px-3 text-sm font-normal ${selected ? "border-primary bg-primary text-primary-foreground" : suggest ? "border-primary/50 bg-card text-card-foreground" : "border-border bg-card text-card-foreground"} ${!available ? "opacity-40 line-through" : ""}`}
      disabled={!available}
      aria-pressed={selected}
      onClick={() => { if (available) onSelect(slot.time); }}
      aria-label={`${formatted} ${available ? "موجود" : slot.booked || slot.locked ? "رزرو شده" : "غیرقابل رزرو"}`}>
      <span dir="ltr" className="leading-tight">{formatted}</span>
      {suggest && <i className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-px text-micro font-normal not-italic text-primary-foreground" aria-hidden="true">پیشنهادی</i>}
    </button>
  );
}

function MonthModal({ selectedDate, onSelect, onClose, disabledDateKeys }: { selectedDate: Date; onSelect: (d: Date) => void; onClose: () => void; disabledDateKeys?: Set<string> }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Match the app's other dialogs: Escape closes, background scroll locks,
  // and focus lands inside so keyboard/SR users are not stranded behind it.
  // onLockCallbacks is an inline arrow at the call site — a dep array on it
  // would tear down/re-arm this effect (and re-steal focus) on every parent
  // render. Mount-once with a ref instead.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useFocusTrap(dialogRef, true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);
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
    // Off/fully-booked days stay visible but muted+disabled (same grammar as
    // the day strip) — the month stays scannable without offering dead ends.
    const isEdge = disabledDateKeys?.has(gKey) ?? false;
    cells.push({ day: d, date: gDate, isToday: gKey === todayKey, isSelected: gKey === selectedKey, isPast: gKey < todayKey || isEdge });
  }

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta, y = viewYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  return (
    <div className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center p-6">
      <button type="button" aria-label="بستن" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={dialogRef} tabIndex={-1} className="relative w-full max-w-sm rounded-none border border-border bg-card p-3 text-card-foreground" role="dialog" aria-modal="true" aria-label="تقویم">
        <div className="mb-3 flex items-center justify-between">
          <button type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-card-foreground" onClick={() =>
            shiftMonth(-1)}
            aria-label="ماه قبل">
            <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
          </button>
          <div className="min-w-0 text-center">
            <b className="block text-xl font-normal">{PERSIAN_MONTHS[viewMonth - 1]}</b>
            <span className="text-xs font-normal text-card-foreground/60">{toPersianDigits(viewYear)}</span>
          </div>
          <button type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-card-foreground" onClick={() =>
            shiftMonth(1)}
            aria-label="ماه بعد">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mb-1.5 grid grid-cols-7 gap-1">
          {PERSIAN_WEEKDAYS.map((w) => <span key={w} className="py-1 text-center text-micro font-normal text-card-foreground/60">{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) =>
            cell.day === null ? <span key={`e-${i}`} /> : (
              <button key={cell.day} type="button" disabled={cell.isPast}
                className={`flex h-11 w-full items-center justify-center rounded-none text-sm font-normal disabled:text-card-foreground/40 ${cell.isSelected ? "bg-primary text-primary-foreground" : cell.isToday ? "border border-ring text-card-foreground" : "text-card-foreground"}`}
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
  lookName?: string | null;
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
  const { service, lookName, addons, dateParts, time, endTime, totalDuration, totalPrice, onEditTime,
    user, authName, onAuthName, authPhone, onAuthPhone, otpState, otpAttempt, authError,
    isAuthLoading, onSendOtp, onVerifyCode, onChangePhone, spamError, showSpam } = props;

  const phoneValid = isValidIranianPhone(normalizeDigits(authPhone));
  const customerName = authName.trim();
  const nameRequired = true;
  const canContinue = Boolean(!nameRequired || customerName);

  return (
    <div>
      <div className="mb-3 overflow-hidden rounded-none border border-border bg-card text-card-foreground">
        <div className="flex items-center gap-2 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-card-foreground/10 text-card-foreground"><Clock className="h-4 w-4" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <b className="block text-sm font-normal">{service?.name ?? "—"}{lookName ? ` · مدل ${lookName}` : ""}</b>
            <small className="mt-0.5 block text-xs text-card-foreground/60">{toPersianDigits(totalDuration)} دقیقه · {compactToman(totalPrice)}</small>
          </span>
        </div>
        {addons.length > 0 && (
          <div className="bg-muted px-4 pb-2.5 pt-1.5">
            {addons.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-1 text-xs text-muted-foreground">
                <span>+ {a.name} (+{toPersianDigits(a.duration_minutes)} د)</span>
                <b className="font-normal text-primary">+{compactToman(Number(a.price))}</b>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-dashed border-border px-4 py-3">
          <CalendarDays className="h-4 w-4 shrink-0 text-card-foreground" aria-hidden="true" />
          <span className="flex-1 text-xs text-card-foreground/60">تاریخ</span>
          <span className="text-sm font-normal">{toPersianDigits(dateParts.day)} {dateParts.month}</span>
          <button type="button" onClick={onEditTime} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-card-foreground/10 px-3 text-xs font-normal text-card-foreground">ویرایش</button>
        </div>
        <div className="flex items-center gap-2 border-t border-dashed border-border px-4 py-3">
          <Clock className="h-4 w-4 shrink-0 text-card-foreground" aria-hidden="true" />
          <span className="flex-1 text-xs text-card-foreground/60">ساعت</span>
          <span className="text-sm font-normal">{time ? <span dir="ltr">{toPersianDigits(time)} تا {toPersianDigits(endTime)}</span> : "—"}</span>
          <button type="button" onClick={onEditTime} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-card-foreground/10 px-3 text-xs font-normal text-card-foreground">ویرایش</button>
        </div>
        <div className="flex items-center justify-between bg-muted px-4 py-3 text-sm font-normal text-foreground">
          <span>مجموع · پرداخت در سالن</span>
          <b className="text-base font-normal">{compactToman(totalPrice)}</b>
        </div>
      </div>

      <div className="mb-3 rounded-none border border-border bg-card p-3 text-card-foreground">
        <p className="mb-3 text-sm font-normal">مشخصات شما</p>

        <div className="mb-3">
          <label htmlFor="booking-name" className="mb-1.5 block text-xs font-normal text-card-foreground/60">نام {nameRequired ? "(الزامی)" : "(قابل ویرایش)"}</label>
          <input id="booking-name" type="text" className="h-12 w-full rounded-none border border-card-foreground/30 bg-card px-3 text-base outline-none placeholder:text-card-foreground/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50" value={authName}
            onChange={(e) => onAuthName(e.target.value)} placeholder="مثال: سارا احمدی" autoComplete="name" required={nameRequired} aria-required={nameRequired} />
        </div>

        {user ? (
          <div className="flex items-center gap-2 rounded-none border border-success/25 bg-muted p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"><Check className="h-4 w-4" strokeWidth={3} /></span>
            <span className="min-w-0 flex-1"><b className="block text-sm font-normal">شماره تأیید شده</b><small dir="ltr" className="mt-0.5 block text-xs text-muted-foreground">{displayDigits(user.phone)}</small></span>
          </div>
        ) : otpState === "verified" ? (
          <div className="flex items-center gap-2 rounded-none border border-success/25 bg-muted p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"><Check className="h-4 w-4" strokeWidth={3} /></span>
            <span className="min-w-0 flex-1"><b className="block text-sm font-normal">شماره تأیید شد</b><small dir="ltr" className="mt-0.5 block text-xs text-muted-foreground">{displayDigits(authPhone)}</small></span>
            <button type="button" onClick={onChangePhone} className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-normal text-primary">تغییر شماره</button>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label htmlFor="booking-phone" className="mb-1.5 block text-xs font-normal text-card-foreground/60">شماره موبایل</label>
              <input id="booking-phone" type="tel" inputMode="numeric" dir="ltr" className="h-12 w-full rounded-none border border-card-foreground/30 bg-card px-3 text-left text-base outline-none placeholder:text-card-foreground/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50" value={authPhone}
                onChange={(e) => onAuthPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && phoneValid && !isAuthLoading && otpState === "idle" && onSendOtp()}
                placeholder="۰۹۱۲۱۲۳۴۵۶۷" autoComplete="tel" />
            </div>
            {otpState === "idle" && (
              <button type="button" className="flex h-12 w-full items-center justify-center rounded-none bg-primary text-sm font-normal text-primary-foreground disabled:border-transparent disabled:bg-primary/15 disabled:text-foreground/70" disabled={!phoneValid || isAuthLoading} onClick={onSendOtp}>
                {isAuthLoading ? "در حال ارسال…" : "دریافت کد تأیید"}
              </button>
            )}
            {otpState === "sent" && (
              <div>
                <p className="mb-3 text-center text-xs font-normal text-muted-foreground">کد ۶ رقمی پیامک‌شده را وارد کن</p>
                <PinInput key={otpAttempt} length={6} onComplete={onVerifyCode} disabled={isAuthLoading} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <ResendOtpButton onResend={onSendOtp} disabled={isAuthLoading} fullWidth={false} />
                  <button type="button" onClick={onChangePhone} className="rounded-none px-2 py-1.5 text-xs font-normal text-primary">تغییر شماره</button>
                </div>
              </div>
            )}
          </>
        )}

        {nameRequired && !customerName && <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">برای ثبت رزرو، وارد کردن نام الزامی است.</p>}
        {!canContinue && <p className="mt-2.5 text-xs font-normal text-destructive">لطفاً نام خود را وارد کنید</p>}
        {authError && <p className="mt-2.5 text-xs font-normal text-destructive" role="alert">{authError}</p>}
      </div>

      <div className="mb-3 flex items-start gap-2.5 rounded-none border border-dashed border-border bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
        کنسلی رایگان تا ۲۴ ساعت قبل از نوبت؛ هزینهٔ افزودنی‌ها همراه خدمت در سالن پرداخت می‌شود.
      </div>

      {showSpam && spamError && <p className="mt-2.5 text-xs font-normal text-destructive" role="alert">{spamError}</p>}
    </div>
  );
}

// ─────────────────────────── Success step ───────────────────────────

interface SuccessStepProps {
  service: { id: string; name: string } | null;
  lookName?: string | null;
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
  const { service, lookName, addons, date, time, endTime, duration, price, servicePrice, customerName,
    bookingId, bookingIdRaw, salonName, salonAddress, salonPhone, salonLogoUrl } = props;
  const router = useRouter();
  const [icsAdded, setIcsAdded] = useState(false);

  const dateKey = getTehranDateKey(date);
  const start = `${dateKey}T${time || "00:00"}`;
  const end = `${dateKey}T${endTime || "00:00"}`;
  const displayServiceName = `${service?.name ?? "نوبت"}${lookName ? ` · مدل ${lookName}` : ""}`;
  const eventTitle = `رزرو ${salonName} — ${displayServiceName}`;
  const eventLocation = salonAddress || undefined;
  const eventDescription = addons.length
    ? `افزودنی‌ها: ${addons.map((a) => a.name).join("، ")}`
    : `رزرو ${displayServiceName}`;

  return (
    <div className="pt-2 text-center">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success" aria-hidden="true">
        <Check className="h-8 w-8" strokeWidth={2.5} />
      </div>
      <h3 className="text-2xl font-normal">رزرو تأیید شد!</h3>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">پیامک تأیید برایت در راه است</p>

      <div className="mb-4 flex gap-2.5">
        <button type="button" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-none bg-primary text-sm font-normal text-primary-foreground" onClick={() => { downloadIcs({ title: eventTitle, start, end, location: eventLocation, description: eventDescription }); setIcsAdded(true); haptic.tap(); }}>
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {icsAdded ? "به تقویم اضافه شد" : "افزودن به تقویم"}
        </button>
        <a className="flex h-12 flex-1 items-center justify-center gap-2 rounded-none border border-border bg-card text-sm font-normal text-card-foreground" href={googleCalendarUrl({ title: eventTitle, start, end, location: eventLocation, description: eventDescription })} target="_blank" rel="noopener noreferrer">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          تقویم گوگل
        </a>
      </div>

      <BookingConfirm
        serviceName={displayServiceName}
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

      <div className="mt-4 flex gap-2.5">
        <button type="button" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-none bg-primary text-sm font-normal text-primary-foreground" onClick={() => { haptic.tap(); router.push("/bookings"); }}>
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          مشاهده نوبت‌های من
        </button>
        <button type="button" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-none border border-border bg-card text-sm font-normal text-card-foreground" onClick={() => { haptic.tap(); router.push("/"); }}>
          بازگشت به خانه
        </button>
      </div>
    </div>
  );
}
