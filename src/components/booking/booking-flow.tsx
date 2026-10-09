"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { useSalon } from "@/lib/salon-context";
import { useAuth } from "@/lib/auth-context";
import {
  generateTimeSlots,
  getNearestAvailableSlot,
  getIranWeekDay,
} from "@/lib/slots";
import { resolveSlotInterval, resolveSlotBuffer } from "@/lib/salon-settings";
import { JalaliCalendar } from "@/components/ui/jalali-calendar";
import { Nail, Monogram } from "@/components/ui/nail";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PinInput } from "@/components/booking/pin-input";
import {
  getTehranDateKey,
  parseGregorianDateKey,
  getTehranNow,
} from "@/lib/time";
import {
  gregorianToJalali,
  formatJalaliDate,
  toPersianDigits,
  formatPrice,
  PERSIAN_WEEKDAYS_LONG,
} from "@/lib/jalali";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import type { Service } from "@/lib/types";

const IRAN_DAY_ORDER = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
const ACTIVE_STATUSES = new Set(["reserved", "confirmed", "in_progress", "pending"]);

interface Artist {
  id: string;
  name: string;
  specialty: string;
  lacquer: string;
  work_days: number[];
  service_ids: string[];
}

interface BookingFlowProps {
  initialServiceId?: string | null;
  initialAddons?: string[] | null;
  initialArtistId?: string | null;
  initialDate?: string | null;
  initialTime?: string | null;
  lookId?: string | null;
  inSheet?: boolean;
  onClose?: () => void;
  onShowBookings?: () => void;
}

const STEPS = [
  { key: "service", title: "چه خدمتی می‌خواهید؟", label: "خدمت" },
  { key: "artist", title: "با چه کسی؟", label: "هنرمند" },
  { key: "time", title: "چه زمانی؟", label: "زمان" },
  { key: "review", title: "یک نگاه آخر", label: "تأیید" },
] as const;

function minutesOf(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}
function hhmm(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function weekdayIdx(date: Date): number {
  return IRAN_DAY_ORDER.indexOf(getIranWeekDay(date));
}
function fDate(iso: string): string {
  const j = gregorianToJalali(parseGregorianDateKey(iso));
  return formatJalaliDate(j.jy, j.jm, j.jd);
}

export function BookingFlow({
  initialServiceId = null,
  initialAddons = null,
  initialArtistId = null,
  initialDate = null,
  initialTime = null,
  lookId = null,
  inSheet = false,
  onClose,
  onShowBookings,
}: BookingFlowProps) {
  const router = useRouter();
  const {
    salon,
    services,
    addons,
    bookings,
    blockedTimes,
    workingHours,
    specificDaysOff,
    highlights,
    addBooking,
  } = useSalon();
  const { user, sendOtp, verifyOtp, updateProfile } = useAuth();
  const { dateKey: todayStr } = getTehranNow();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId);
  const [expandedId, setExpandedId] = useState<string | null>(initialServiceId);
  const [addonIds, setAddonIds] = useState<string[]>(() => initialAddons ?? []);
  const [artistId, setArtistId] = useState<string | null>(initialArtistId);
  const [dateStr, setDateStr] = useState<string | null>(initialDate);
  const [time, setTime] = useState<{ time: string; end: string } | null>(
    initialTime ? { time: initialTime.slice(0, 5), end: initialTime.slice(0, 5) } : null
  );
  const [artists, setArtists] = useState<Artist[]>([]);
  const [authView, setAuthView] = useState<null | "phone" | "code" | "name">(null);
  const [authPhone, setAuthPhone] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [receipt, setReceipt] = useState<{ id: string } | null>(null);

  // Lookbook deep-link: resolve look → service + addons via render-adjust
  // (never setState-in-effect). Runs once when highlights arrive.
  const [lookApplied, setLookApplied] = useState(false);
  const lookPreset = (() => {
    if (!lookId) return null;
    for (const h of highlights) {
      if (h.id === lookId || h.images.some((img) => img.id === lookId)) {
        return { serviceId: h.service_id, addonIds: h.addon_ids || [] };
      }
    }
    return null;
  })();
  if (!lookApplied && !initialServiceId && !serviceId && lookPreset?.serviceId) {
    setLookApplied(true);
    setServiceId(lookPreset.serviceId);
    setExpandedId(lookPreset.serviceId);
    setAddonIds(lookPreset.addonIds);
  }

  // Artist directory (public).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/read/artists");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (!cancelled && Array.isArray(data.artists)) setArtists(data.artists);
      } catch {
        /* directory optional — "any artist" still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services]);
  const service: Service | undefined = useMemo(
    () => activeServices.find((s) => s.id === serviceId),
    [activeServices, serviceId]
  );
  const activeAddons = useMemo(() => addons.filter((a) => a.is_active), [addons]);
  const allowedAddons = useMemo(
    () => (service ? activeAddons.filter((a) => service.addon_ids.includes(a.id)) : []),
    [service, activeAddons]
  );

  const interval = resolveSlotInterval(salon.slot_interval_minutes);
  const buffer = resolveSlotBuffer(salon.slot_buffer_minutes);
  const engineConfig = useMemo(
    () => ({
      proximity_window_hours: salon.proximity_window_hours,
      early_extra_hours: salon.early_extra_hours,
      late_extra_hours: salon.late_extra_hours,
      expand_threshold: salon.expand_threshold,
      allow_overflow: salon.allow_overflow,
      overflow_minutes: salon.overflow_minutes,
      optimization_mode: salon.optimization_mode,
      suggestion_limit: salon.suggestion_limit,
      min_useful_gap_minutes: salon.min_useful_gap_minutes,
      lead_minutes: salon.lead_minutes,
    }),
    [salon]
  );

  const rawDuration = useMemo(() => {
    if (!service) return 0;
    return (
      Number(service.duration_minutes) +
      addonIds.reduce((sum, id) => sum + Number(activeAddons.find((a) => a.id === id)?.duration_minutes || 0), 0)
    );
  }, [service, addonIds, activeAddons]);
  const effDuration = Math.ceil((rawDuration + buffer) / interval) * interval;
  // End is always derived from start + effective duration (never trusted
  // from presets) so the server duration check can never 400 a valid pick.
  const timeEnd = time ? hhmm(minutesOf(time.time) + effDuration) : "";
  const price = useMemo(() => {
    if (!service) return 0;
    return (
      Number(service.price) +
      addonIds.reduce((sum, id) => sum + Number(activeAddons.find((a) => a.id === id)?.price || 0), 0)
    );
  }, [service, addonIds, activeAddons]);

  const eligibleArtists = useMemo(() => {
    if (!service) return [];
    return artists.filter((a) => a.service_ids.length === 0 || a.service_ids.includes(service.id));
  }, [artists, service]);

  const selectedArtist = useMemo(
    () => eligibleArtists.find((a) => a.id === artistId) || null,
    [eligibleArtists, artistId]
  );

  // ── availability helpers (stable unless bookings/blocks change) ──
  const bookingsFor = useCallback(
    (aid: string | null, date?: string) =>
      bookings
        .filter(
          (b) =>
            ACTIVE_STATUSES.has(b.status) &&
            (!date || b.date_gregorian.split("T")[0] === date) &&
            (!aid || b.artist_id === aid || !b.artist_id)
        )
        .map((b) => ({
          date_gregorian: b.date_gregorian.split("T")[0],
          start_time: b.start_time,
          end_time: b.end_time,
        })),
    [bookings]
  );
  const locksFor = useCallback(
    (aid: string | null, date?: string) =>
      blockedTimes
        .filter(
          (l) =>
            (!date || l.date_gregorian.split("T")[0] === date) &&
            (!aid || !l.artist_id || l.artist_id === aid)
        )
        .map((l) => ({ date_gregorian: l.date_gregorian.split("T")[0], start_time: l.start_time, end_time: l.end_time })),
    [blockedTimes]
  );

  const isOffDay = (iso: string, aid: string | null): boolean => {
    if (specificDaysOff.includes(iso)) return true;
    const key = IRAN_DAY_ORDER[weekdayIdx(parseGregorianDateKey(iso))];
    if (!workingHours[key]) return true;
    if (aid) {
      const a = artists.find((x) => x.id === aid);
      if (a && a.work_days.length > 0 && !a.work_days.includes(weekdayIdx(parseGregorianDateKey(iso)))) return true;
    }
    return false;
  };

  // Nearest slot per eligible artist (artist step).
  const nearestByArtist = useMemo(() => {
    if (!service) return new Map<string, { date: string; time: string } | null>();
    const out = new Map<string, { date: string; time: string } | null>();
    for (const a of eligibleArtists) {
      const r = getNearestAvailableSlot(
        workingHours,
        Number(service.duration_minutes),
        addonIds.reduce((s, id) => s + Number(activeAddons.find((x) => x.id === id)?.duration_minutes || 0), 0),
        interval,
        buffer,
        bookingsFor(a.id),
        locksFor(a.id),
        engineConfig,
        specificDaysOff
      );
      out.set(a.id, r ? { date: getTehranDateKey(r.date), time: r.time } : null);
    }
    return out;
  }, [service, addonIds, eligibleArtists, workingHours, specificDaysOff, engineConfig, interval, buffer, activeAddons, bookingsFor, locksFor]);

  // Slots for the selected day.
  const daySlots = useMemo(() => {
    if (!service || !dateStr) return [];
    return generateTimeSlots(
      workingHours,
      parseGregorianDateKey(dateStr),
      Number(service.duration_minutes),
      addonIds.reduce((s, id) => s + Number(activeAddons.find((x) => x.id === id)?.duration_minutes || 0), 0),
      interval,
      buffer,
      bookingsFor(artistId, dateStr).map((b) => ({ start_time: b.start_time, end_time: b.end_time })),
      locksFor(artistId, dateStr).map((l) => ({ start_time: l.start_time, end_time: l.end_time })),
      engineConfig,
      specificDaysOff
    );
  }, [service, dateStr, addonIds, artistId, bookings, blockedTimes, workingHours, specificDaysOff, engineConfig, interval, buffer, activeAddons]);

  const availableSlots = useMemo(() => daySlots.filter((s) => s.available), [daySlots]);
  const suggestedSlots = useMemo(() => availableSlots.filter((s) => s.suggested), [availableSlots]);

  // Availability dots for the visible month (memoized per month key).
  const [dotMonth, setDotMonth] = useState("");
  const dotMap = useMemo(() => {
    if (!service || !dotMonth) return {} as Record<string, boolean>;
    const [y, m] = dotMonth.split("-").map(Number);
    const out: Record<string, boolean> = {};
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (isOffDay(iso, artistId)) {
        out[iso] = false;
        continue;
      }
      const slots = generateTimeSlots(
        workingHours,
        parseGregorianDateKey(iso),
        Number(service.duration_minutes),
        addonIds.reduce((s, id) => s + Number(activeAddons.find((x) => x.id === id)?.duration_minutes || 0), 0),
        interval,
        buffer,
        bookingsFor(artistId, iso).map((b) => ({ start_time: b.start_time, end_time: b.end_time })),
        locksFor(artistId, iso).map((l) => ({ start_time: l.start_time, end_time: l.end_time })),
        engineConfig,
        specificDaysOff
      );
      out[iso] = slots.some((s) => s.available);
    }
    return out;
  }, [dotMonth, service, addonIds, artistId, workingHours, specificDaysOff, engineConfig, interval, buffer, activeAddons, bookingsFor, locksFor]);

  // ── navigation ──
  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
    setSubmitError("");
  };
  const goBack = () => {
    if (step === 0) {
      if (onClose) onClose();
      else router.back();
      return;
    }
    go(step - 1);
  };

  const pickService = (id: string | null) => {
    setServiceId(id);
    setExpandedId(id);
    setAddonIds([]);
    setArtistId((prev) => {
      if (!prev || !id) return prev;
      const a = artists.find((x) => x.id === prev);
      if (a && a.service_ids.length > 0 && !a.service_ids.includes(id)) return null;
      return prev;
    });
    setTime(null);
  };
  const toggleAddon = (id: string) => {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setTime(null);
  };
  const pickTime = (t: string) => {
    setTime({ time: t, end: hhmm(minutesOf(t) + effDuration) });
  };

  // ── auth (OTP, v2-styled steps) ──
  const startAuth = () => {
    setAuthError("");
    setAuthView("phone");
    setAuthPhone(user?.phone || "");
  };
  const submitPhone = async () => {
    const phone = normalizeDigits(authPhone.trim());
    if (!isValidIranianPhone(phone)) {
      setAuthError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const r = await sendOtp(phone);
      if (!r.success) {
        setAuthError(r.error || "ارسال کد انجام نشد");
        return;
      }
      setAuthPhone(phone);
      setAuthView("code");
    } finally {
      setAuthBusy(false);
    }
  };
  const submitCode = async (code: string) => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const r = await verifyOtp(authPhone, code);
      if (!r.success || !r.user) {
        setAuthError(r.error || "کد درست نیست");
        return;
      }
      if (!r.user.name || !r.user.name.trim()) {
        setAuthView("name");
      } else {
        setAuthView(null);
        void submitBooking();
      }
    } finally {
      setAuthBusy(false);
    }
  };
  const submitName = async () => {
    if (authName.trim().length < 2) {
      setAuthError("نام را کامل بنویسید.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const r = await updateProfile(authName.trim());
      if (!r.success) {
        setAuthError(r.error || "ذخیره نام انجام نشد");
        return;
      }
      setAuthView(null);
      void submitBooking();
    } finally {
      setAuthBusy(false);
    }
  };

  // ── book ──
  const submitBooking = async () => {
    if (!service || !dateStr || !time || submitting) return;
    if (!user) {
      startAuth();
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const j = gregorianToJalali(parseGregorianDateKey(dateStr));
      const result = await addBooking({
        id: crypto.randomUUID(),
        service_id: service.id,
        selected_addons: addonIds,
        customer_name: user.name || "",
        customer_phone: user.phone,
        date: `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`,
        date_gregorian: dateStr,
        start_time: time.time,
        end_time: timeEnd,
        status: "reserved",
        phone_verified: true,
        paid: false,
        created_at: new Date().toISOString(),
        service,
        artist_id: artistId,
      });
      if (!result.success) {
        setSubmitError(result.error || "ثبت نوبت انجام نشد");
        if (/قبلاً رزرو شده|مسدود شده|گذشته است|زودتر|تعطیل است|خارج از ساعات کاری/.test(result.error || "")) go(2);
        return;
      }
      setReceipt({ id: result.id || "" });
    } finally {
      setSubmitting(false);
    }
  };

  const stepValid = [!!service, true, !!time, !!service && !!dateStr && !!time][step];
  const ctaLabels = ["انتخاب هنرمند", "انتخاب زمان", "مرور نوبت"];
  const receiptBooking = receipt ? bookings.find((b) => b.id === receipt.id) : undefined;

  // ── success ──
  if (receipt) {
    const code = `BK-${(receipt.id || "").slice(-6).toUpperCase()}`;
    const rb = receiptBooking;
    const rArtist = artists.find((a) => a.id === (rb?.artist_id || artistId));
    const rDate = rb?.date_gregorian.split("T")[0] || dateStr || todayStr;
    return (
      <div style={inSheet ? undefined : { minHeight: "100dvh", padding: "12px 18px 40px" }}>
      <div className="sheet-body" style={{ paddingTop: 12, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: "min(360px, 100%)", position: "relative" }}>
          <div style={{ height: 18, borderRadius: 12, background: "linear-gradient(180deg,#2c2520,#14100e)", border: "1px solid var(--line2)", position: "relative", zIndex: 2, boxShadow: "0 8px 20px rgba(0,0,0,.5)" }}>
            <i style={{ position: "absolute", left: 18, right: 18, top: 8, height: 2, borderRadius: 2, background: "#050403" }} />
          </div>
          <div style={{ overflow: "hidden", margin: "-9px 14px 0", position: "relative", zIndex: 1 }}>
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 2.1, ease: [0.45, 0.05, 0.2, 1], delay: 0.25 }}
              style={{
                background: "linear-gradient(180deg,#f4ecdd,#ebe0cb)",
                color: "#2a211c",
                padding: "26px 22px 30px",
                textAlign: "right",
                fontSize: 14,
                lineHeight: 1.9,
                WebkitMaskImage: "linear-gradient(#000,#000), radial-gradient(circle at 6px 0, transparent 5px, #000 5.5px)",
                WebkitMaskSize: "100% calc(100% - 8px), 12px 8px",
                WebkitMaskPosition: "top, bottom",
                WebkitMaskRepeat: "no-repeat, repeat-x",
                maskImage: "linear-gradient(#000,#000), radial-gradient(circle at 6px 0, transparent 5px, #000 5.5px)",
                maskSize: "100% calc(100% - 8px), 12px 8px",
                maskPosition: "top, bottom",
                maskRepeat: "no-repeat, repeat-x",
              }}
            >
              <div style={{ textAlign: "center", direction: "ltr" }}>
                <div style={{ fontSize: 26, fontWeight: 200, letterSpacing: "-.02em" }}>Forehand</div>
                <div style={{ fontSize: 14, letterSpacing: ".4em", opacity: 0.6 }}>NAIL STUDIO</div>
              </div>
              <div style={{ borderTop: "1px dashed rgba(42,33,28,.3)", margin: "10px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ opacity: 0.7 }}>کد نوبت</span>
                <span className="ltr num" style={{ letterSpacing: ".12em" }}>{code}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ opacity: 0.7 }}>روز</span>
                <span>{fDate(rDate)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ opacity: 0.7 }}>ساعت</span>
                <span className="num">{toPersianDigits((rb?.start_time || time?.time || "").slice(0, 5))} تا {toPersianDigits((rb?.end_time || timeEnd).slice(0, 5))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ opacity: 0.7 }}>هنرمند</span>
                <span>{rArtist?.name || "اولین هنرمند آزاد"}</span>
              </div>
              <div style={{ borderTop: "1px dashed rgba(42,33,28,.3)", margin: "10px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ opacity: 0.7 }}>{service?.name}</span>
                <span className="num">{formatPrice(price)} تومان</span>
              </div>
              <div style={{ display: "flex", gap: 2, height: 38, marginTop: 14, justifyContent: "center", direction: "ltr" }} aria-hidden="true">
                {[...code, ...receipt.id].map((ch, i) => (
                  <i key={i} style={{ width: (ch.charCodeAt(0) % 4) + 1, background: i % 2 ? "transparent" : "#2a211c" }} />
                ))}
              </div>
              <div style={{ textAlign: "center", fontSize: 14, opacity: 0.6, marginTop: 6 }}>
                پرداخت در سالن، {salon.address}
              </div>
            </motion.div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 200, damping: 26 }}
          style={{ marginTop: 26 }}
        >
          <div className="h-l">{salon.booking_success_title || "به‌زودی می‌بینیمت!"}</div>
          <p className="t-s" style={{ marginTop: 6 }}>نوبت شما ثبت شد و پس از تأیید سالن قطعی می‌شود.</p>
          <div className="row" style={{ justifyContent: "center", marginTop: 22, gap: 10 }}>
            <button type="button" className="btn pri" onClick={() => (onShowBookings ? onShowBookings() : router.push("/bookings"))}>
              نوبت‌های من
            </button>
            <button type="button" className="btn gl" onClick={() => (onClose ? onClose() : router.push("/"))}>
              بازگشت به خانه
            </button>
          </div>
        </motion.div>
      </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, ...(inSheet ? {} : { minHeight: "100dvh", padding: "12px 18px 40px" }) }}>
      <div className="sheet-head" style={{ paddingTop: 4 }}>
        <button type="button" className="iconbtn bare" aria-label="مرحله قبل" onClick={goBack} style={{ opacity: step > 0 ? 1 : 0.3 }}>
          <ArrowRight size={20} strokeWidth={1.4} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="row" style={{ gap: 6 }} aria-label={`مرحله ${toPersianDigits(step + 1)} از ۴`}>
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => i < step && go(i)}
                disabled={i >= step}
                style={{ flex: 1, height: 18, display: "grid", alignItems: "center", cursor: i < step ? "pointer" : "default" }}
                aria-label={s.label}
              >
                <i style={{ display: "block", height: 2, borderRadius: 2, background: "rgba(239,231,219,.14)", overflow: "hidden", position: "relative" }}>
                  <motion.b
                    initial={false}
                    animate={{ scaleX: i <= step ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 160, damping: 26 }}
                    style={{ position: "absolute", inset: 0, background: "var(--pearl)", transformOrigin: "right", display: "block" }}
                  />
                </i>
              </button>
            ))}
          </div>
          <div className="t-s" style={{ marginTop: 2 }}>
            مرحله {toPersianDigits(step + 1)} از ۴، {STEPS[step].label}
          </div>
        </div>
        <button type="button" className="iconbtn bare" aria-label="بستن" onClick={() => (onClose ? onClose() : router.back())}>
          <X size={20} strokeWidth={1.4} />
        </button>
      </div>

      <div className="sheet-body" style={{ paddingBottom: 24 }}>
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * -36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * 36 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <h2 className="h-l" style={{ margin: "8px 0 20px" }}>{STEPS[step].title}</h2>
            {step === 0 && (
              <ServiceStep
                services={activeServices}
                addons={allowedAddons}
                selectedId={service?.id || null}
                expandedId={expandedId}
                selectedAddons={addonIds}
                onPick={pickService}
                onExpand={setExpandedId}
                onToggleAddon={toggleAddon}
              />
            )}
            {step === 1 && service && (
              <ArtistStep
                artists={eligibleArtists}
                selectedId={artistId}
                onPick={(id) => {
                  setArtistId(id);
                  setTime(null);
                }}
                nearest={nearestByArtist}
                today={todayStr}
              />
            )}
            {step === 2 && service && (
              <TimeStep
                dateStr={dateStr}
                today={todayStr}
                onDate={(d) => {
                  setDateStr(d);
                  setTime(null);
                }}
                isOff={(iso) => isOffDay(iso, artistId)}
                dotsMap={dotMap}
                onMonth={setDotMonth}
                slots={daySlots}
                suggested={suggestedSlots}
                selectedTime={time?.time || null}
                onPick={pickTime}
                durationNote={effDuration}
              />
            )}
            {step === 3 && service && dateStr && time && (
              <ReviewStep
                serviceName={service.name}
                addonNames={allowedAddons.filter((a) => addonIds.includes(a.id)).map((a) => a.name)}
                artistName={selectedArtist?.name || "اولین هنرمند آزاد"}
                dateStr={dateStr}
                time={{ time: time.time, end: timeEnd }}
                duration={effDuration}
                price={price}
                cancelHours={salon.cancel_hours}
                userName={user?.name}
                userPhone={user?.phone}
                error={submitError}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {!receipt && (
        <div style={{ padding: "14px 24px calc(var(--sa-b) + 18px)", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 16, flex: "none" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {service ? (
              <>
                <div className="num" style={{ fontSize: 17, color: "var(--pearl)" }}>{formatPrice(price)} تومان</div>
                <div className="t-s num" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {time && step >= 2
                    ? `${fDate(dateStr || todayStr)}، ${toPersianDigits(time.time)}`
                    : `${toPersianDigits(effDuration)} دقیقه${addonIds.length ? `، ${toPersianDigits(addonIds.length)} افزودنی` : ""}`}
                </div>
              </>
            ) : (
              <div className="t-s">ابتدا یک خدمت انتخاب کنید</div>
            )}
          </div>
          {step < 3 ? (
            <button type="button" className="btn pri" disabled={!stepValid} onClick={() => go(step + 1)}>
              {ctaLabels[step]}
            </button>
          ) : (
            <button type="button" className="btn pri" disabled={submitting} onClick={() => void submitBooking()}>
              {submitting ? "در حال ثبت..." : user ? "تأیید نوبت" : "ورود و تأیید"}
            </button>
          )}
        </div>
      )}

      <BottomSheet open={authView !== null} onClose={() => setAuthView(null)} title="ورود" size="auto">
        <AuthSheet
          view={authView}
          phone={authPhone}
          name={authName}
          error={authError}
          busy={authBusy}
          onPhone={setAuthPhone}
          onSubmitPhone={() => void submitPhone()}
          onCode={(code) => void submitCode(code)}
          onName={setAuthName}
          onSubmitName={() => void submitName()}
        />
      </BottomSheet>
    </div>
  );
}

/* ── steps ── */

function ServiceStep({
  services,
  addons,
  selectedId,
  expandedId,
  selectedAddons,
  onPick,
  onExpand,
  onToggleAddon,
}: {
  services: Service[];
  addons: { id: string; name: string; price: number; duration_minutes: number }[];
  selectedId: string | null;
  expandedId: string | null;
  selectedAddons: string[];
  onPick: (id: string | null) => void;
  onExpand: (id: string | null) => void;
  onToggleAddon: (id: string) => void;
}) {
  return (
    <div className="list">
      {services.map((s, i) => {
        const sel = s.id === selectedId;
        const open = s.id === (expandedId || selectedId);
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <button
              type="button"
              className="row"
              aria-pressed={sel}
              onClick={() => {
                onPick(sel ? null : s.id);
                onExpand(sel ? null : s.id);
              }}
              style={{ width: "100%", padding: "16px 0", textAlign: "right" }}
            >
              <motion.span animate={{ rotate: sel ? -8 : 0, scale: sel ? 1.06 : 1 }}>
                <Nail lacquer={(s as Service).lacquer || "pearl"} size={58} />
              </motion.span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 17, fontWeight: 300 }}>{s.name}</span>
                <span className="t-s" style={{ display: "block" }}>{s.description}</span>
                <span className="num" style={{ display: "block", fontSize: 14, color: "var(--pearl)", marginTop: 2 }}>
                  {formatPrice(Number(s.price))} <span className="faint">، {toPersianDigits(Number(s.duration_minutes))} دقیقه</span>
                </span>
              </span>
              <span
                aria-hidden="true"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 26,
                  border: `1px solid ${sel ? "var(--pearl)" : "rgba(239,231,219,.3)"}`,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <motion.i
                  animate={{ scale: sel ? 1 : 0 }}
                  style={{ width: 12, height: 12, borderRadius: 12, background: "var(--pearl)" }}
                />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 32 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ padding: "0 0 18px", paddingInlineStart: 72 }}>
                    {addons.length > 0 ? (
                      <>
                        <div className="t-s" style={{ marginBottom: 10 }}>جزئیات تکمیلی، اختیاری</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {addons.map((a) => {
                            const on = selectedAddons.includes(a.id);
                            return (
                              <button
                                key={a.id}
                                type="button"
                                className={`chip${on ? " on" : ""}`}
                                aria-pressed={on}
                                onClick={() => onToggleAddon(a.id)}
                              >
                                {a.name}
                                <span style={{ opacity: 0.6 }} className="num">
                                  +{toPersianDigits(Math.round(Number(a.price) / 1000))}ت
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="t-s">این خدمت افزودنی ندارد؛ قیمت و زمان همان مقدار پایه است.</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

function ArtistStep({
  artists,
  selectedId,
  onPick,
  nearest,
  today,
}: {
  artists: Artist[];
  selectedId: string | null;
  onPick: (id: string | null) => void;
  nearest: Map<string, { date: string; time: string } | null>;
  today: string;
}) {
  const rel = (iso: string) => {
    if (iso === today) return "امروز";
    const diff = Math.round((parseGregorianDateKey(iso).getTime() - parseGregorianDateKey(today).getTime()) / 864e5);
    if (diff === 1) return "فردا";
    return fDate(iso);
  };
  const rows: Array<Artist | null> = [null, ...artists];
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((a, i) => {
        const sel = (a?.id || null) === selectedId;
        const canDo = true;
        const next = a ? nearest.get(a.id) : undefined;
        return (
          <motion.button
            key={a?.id || "any"}
            type="button"
            disabled={false}
            aria-pressed={sel}
            onClick={() => onPick(a?.id || null)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.98 }}
            className="row"
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 22,
              textAlign: "right",
              border: `1px solid ${sel ? "rgba(233,220,195,.5)" : "var(--line)"}`,
              background: sel ? "rgba(233,220,195,.07)" : "rgba(255,255,255,.015)",
              transition: "border-color .3s, background .3s",
            }}
          >
            {a ? (
              <Monogram name={a.name} lacquer={a.lacquer} size={52} />
            ) : (
              <span style={{ width: 52, height: 52, flex: "none", borderRadius: 52, border: "1px solid var(--line2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="faint" style={{ fontSize: 20 }}>✦</span>
              </span>
            )}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 17 }}>{a ? a.name : "هر هنرمندی"}</span>
              <span className="t-s" style={{ display: "block" }}>
                {a ? (
                  <>
                    {a.specialty}
                    {a.work_days.length > 0 && (
                      <span className="faint">
                        {" · "}
                        {a.work_days
                          .slice()
                          .sort()
                          .map((d) => PERSIAN_WEEKDAYS_LONG[d])
                          .join("، ")}
                      </span>
                    )}
                  </>
                ) : (
                  "اولین هنرمند آزاد را به شما می‌دهیم"
                )}
              </span>
              <span style={{ display: "block", fontSize: 14, marginTop: 2, color: canDo ? "var(--pearl)" : "var(--faint)" }}>
                {a ? (
                  next ? (
                    <>نزدیک‌ترین: {rel(next.date)}، <span className="num">{toPersianDigits(next.time)}</span></>
                  ) : (
                    "تا دو هفته آینده وقت خالی ندارد"
                  )
                ) : (
                  "بدون انتظار اضافه"
                )}
              </span>
            </span>
            <span
              aria-hidden="true"
              style={{
                width: 26,
                height: 26,
                borderRadius: 26,
                border: `1px solid ${sel ? "var(--pearl)" : "rgba(239,231,219,.3)"}`,
                display: "grid",
                placeItems: "center",
              }}
            >
              <motion.i
                animate={{ scale: sel ? 1 : 0 }}
                style={{ width: 12, height: 12, borderRadius: 12, background: "var(--pearl)" }}
              />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function TimeStep({
  dateStr,
  today,
  onDate,
  isOff,
  dotsMap,
  onMonth,
  slots,
  suggested,
  selectedTime,
  onPick,
  durationNote,
}: {
  dateStr: string | null;
  today: string;
  onDate: (iso: string) => void;
  isOff: (iso: string) => boolean;
  dotsMap: Record<string, boolean>;
  onMonth: (ym: string) => void;
  slots: Array<{ time: string; available: boolean; suggested?: boolean }>;
  suggested: Array<{ time: string }>;
  selectedTime: string | null;
  onPick: (time: string) => void;
  durationNote: number;
}) {
  return (
    <div>
      <JalaliCalendar
        value={dateStr}
        today={today}
        onChange={onDate}
        disabled={(iso) => iso < today || isOff(iso)}
        mark={(iso) => (isOff(iso) ? "off" : null)}
        dots={(iso) => !!dotsMap[iso]}
      />
      <DateMonthSync dateStr={dateStr} today={today} onMonth={onMonth} />
      <div style={{ height: 1, background: "var(--line)", margin: "18px 0" }} />
      {!dateStr ? (
        <div className="empty">اول یک روز انتخاب کنید.</div>
      ) : suggested.length > 0 ? (
        <>
          <div className="row t-s" style={{ gap: 8, marginBottom: 10 }}>
            <span style={{ color: "var(--gold)" }}>✦</span> پیشنهاد ما، بدون انتظار بین نوبت‌ها
          </div>
          <div className="slots" style={{ marginBottom: 18 }}>
            {suggested.map((s) => (
              <SlotBtn key={s.time} time={s.time} sug sel={selectedTime === s.time} onPick={onPick} />
            ))}
          </div>
          <div className="t-s" style={{ marginBottom: 10 }}>همه ساعت‌ها</div>
          <div className="slots">
            {slots
              .filter((s) => s.available && !s.suggested)
              .map((s, i) => (
                <SlotBtn key={s.time} time={s.time} sug={false} index={i} sel={selectedTime === s.time} onPick={onPick} />
              ))}
          </div>
        </>
      ) : availableCount(slots) > 0 ? (
        <>
          <div className="t-s" style={{ marginBottom: 10 }}>همه ساعت‌ها</div>
          <div className="slots">
            {slots
              .filter((s) => s.available)
              .map((s, i) => (
                <SlotBtn key={s.time} time={s.time} sug={!!s.suggested} index={i} sel={selectedTime === s.time} onPick={onPick} />
              ))}
          </div>
        </>
      ) : (
        <div className="empty">این روز جای خالی ندارد. یک روز دیگر را انتخاب کنید.</div>
      )}
      <p className="t-s" style={{ marginTop: 16 }}>
        مدت کل {toPersianDigits(durationNote)} دقیقه برای خدمت و افزودنی‌های شما در نظر گرفته می‌شود.
      </p>
    </div>
  );
}

function availableCount(slots: Array<{ available: boolean }>): number {
  return slots.filter((s) => s.available).length;
}

function SlotBtn({ time, sug, sel, onPick, index = 0 }: { time: string; sug: boolean; sel: boolean; onPick: (t: string) => void; index?: number }) {
  return (
    <motion.button
      type="button"
      className={`slot num${sug ? " sug" : ""}${sel ? " sel" : ""}`}
      aria-pressed={sel}
      onClick={() => onPick(time)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index, 16) * 0.018 }}
    >
      {toPersianDigits(time)}
    </motion.button>
  );
}

function DateMonthSync({ dateStr, today, onMonth }: { dateStr: string | null; today: string; onMonth: (ym: string) => void }) {
  useEffect(() => {
    onMonth((dateStr || today).slice(0, 7));
  }, [dateStr, today, onMonth]);
  return null;
}

function ReviewStep({
  serviceName,
  addonNames,
  artistName,
  dateStr,
  time,
  duration,
  price,
  cancelHours,
  userName,
  userPhone,
  error,
}: {
  serviceName: string;
  addonNames: string[];
  artistName: string;
  dateStr: string;
  time: { time: string; end: string };
  duration: number;
  price: number;
  cancelHours: number;
  userName?: string;
  userPhone?: string;
  error: string;
}) {
  const durLabel =
    duration >= 60
      ? `${toPersianDigits(Math.floor(duration / 60))} ساعت${duration % 60 ? ` و ${toPersianDigits(duration % 60)} دقیقه` : ""}`
      : `${toPersianDigits(duration)} دقیقه`;
  return (
    <div>
      <div className="row" style={{ gap: 16, marginBottom: 12 }}>
        <Nail lacquer="pearl" size={72} />
        <div>
          <div style={{ fontSize: 19 }}>{serviceName}</div>
          <div className="t-s">{addonNames.length ? addonNames.join("، ") : "بدون افزودنی"}</div>
        </div>
      </div>
      <div className="panel" style={{ padding: "4px 20px" }}>
        <div className="sum">
          <span className="mute">هنرمند</span>
          <span>{artistName}</span>
        </div>
        <div className="sum">
          <span className="mute">روز</span>
          <span>{fDate(dateStr)}</span>
        </div>
        <div className="sum">
          <span className="mute">ساعت</span>
          <span className="num">
            {toPersianDigits(time.time)} تا {toPersianDigits(time.end)}
          </span>
        </div>
        <div className="sum">
          <span className="mute">مدت</span>
          <span>{durLabel}</span>
        </div>
        <div className="sum">
          <span className="mute">مبلغ</span>
          <span className="num pearl" style={{ fontSize: 20 }}>
            {formatPrice(price)} تومان
          </span>
        </div>
      </div>
      <p className="t-s" style={{ marginTop: 16 }}>
        پرداخت در سالن انجام می‌شود. لغو تا {toPersianDigits(cancelHours)} ساعت قبل رایگان است.
      </p>
      {userPhone && (
        <p className="t-s" style={{ marginTop: 6 }}>
          به نام {userName}، <span className="ltr">{toPersianDigits(userPhone)}</span>
        </p>
      )}
      {error && (
        <p role="alert" style={{ color: "#eaa0ad", fontSize: 14, marginTop: 12, textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function AuthSheet({
  view,
  phone,
  name,
  error,
  busy,
  onPhone,
  onSubmitPhone,
  onCode,
  onName,
  onSubmitName,
}: {
  view: null | "phone" | "code" | "name";
  phone: string;
  name: string;
  error: string;
  busy: boolean;
  onPhone: (v: string) => void;
  onSubmitPhone: () => void;
  onCode: (code: string) => void;
  onName: (v: string) => void;
  onSubmitName: () => void;
}) {
  if (view === "code") {
    return (
      <div style={{ paddingTop: 8, textAlign: "center" }}>
        <div className="h-m" style={{ marginBottom: 6 }}>کد تأیید</div>
        <p className="t-s" style={{ marginBottom: 20 }}>
          کد ۶ رقمی پیامک‌شده به <span className="ltr num">{toPersianDigits(phone)}</span> را وارد کنید.
        </p>
        <div dir="ltr">
          <PinInput length={6} onComplete={onCode} disabled={busy} />
        </div>
        {error && (
          <p role="alert" style={{ color: "#eaa0ad", fontSize: 14, marginTop: 14 }}>
            {error}
          </p>
        )}
      </div>
    );
  }
  if (view === "name") {
    return (
      <div style={{ paddingTop: 8 }}>
        <div className="h-m" style={{ marginBottom: 6 }}>خوش آمدید</div>
        <p className="t-s" style={{ marginBottom: 18 }}>اولین بار است؛ یک حساب کوچک می‌سازیم.</p>
        <label className="field">
          <span>نام و نام خانوادگی</span>
          <input className="input" autoFocus value={name} onChange={(e) => onName(e.target.value)} />
        </label>
        {error && (
          <p role="alert" style={{ color: "#eaa0ad", fontSize: 14, marginTop: 12 }}>
            {error}
          </p>
        )}
        <button type="button" className="btn pri block" style={{ marginTop: 20 }} disabled={busy} onClick={onSubmitName}>
          {busy ? "..." : "ساخت حساب"}
        </button>
      </div>
    );
  }
  return (
    <div style={{ paddingTop: 8 }}>
      <div className="h-l" style={{ marginBottom: 8 }}>شماره موبایل‌تان</div>
      <p className="t-s" style={{ marginBottom: 20 }}>برای ثبت و پیگیری نوبت. کد تأیید پیامک می‌شود.</p>
      <input
        className="input"
        inputMode="tel"
        autoFocus
        placeholder="۰۹۱۲ ۰۰۰ ۰۰۰۰"
        value={phone}
        onChange={(e) => onPhone(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmitPhone()}
        aria-label="شماره موبایل"
        style={{ direction: "ltr", textAlign: "center", fontSize: 22, letterSpacing: ".08em", minHeight: 64 }}
      />
      {error && (
        <p role="alert" style={{ color: "#eaa0ad", fontSize: 14, marginTop: 12 }}>
          {error}
        </p>
      )}
      <button type="button" className="btn pri block" style={{ marginTop: 20 }} disabled={busy} onClick={onSubmitPhone}>
        {busy ? "..." : "ادامه"}
      </button>
    </div>
  );
}
