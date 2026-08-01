"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Check, AlertCircle, CalendarDays, ArrowLeft, Loader2, User, Smartphone, ArrowRight, LogIn } from "lucide-react";
import { JalaliCalendar } from "@/components/booking/jalali-calendar";
import { TimeSlots } from "@/components/booking/time-slots";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { PinInput } from "@/components/booking/pin-input";
import { PrintedReceipt } from "@/components/booking/printed-receipt";
import { AuthCard, AuthCardRoot, AuthError } from "@/components/auth/auth-card";
import { ResendOtpButton } from "@/components/auth/resend-otp-button";
import { BookingProgress } from "@/components/booking/booking-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SalonGuard } from "@/components/ui/salon-guard";
import { ServiceDetail } from "@/components/booking/service-detail";
import { generateTimeSlots } from "@/lib/slots";
import { useSalon } from "@/lib/salon-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, toPersianDigits, gregorianToJalali, jalaliToGregorian, formatJalaliDate, DAYS_IN_MONTH, isJalaliLeapYear } from "@/lib/jalali";
import { normalizeDigits, isValidIranianPhone, displayDigits } from "@/lib/digits";
import { getTehranDateKey } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { haptic } from "@/lib/haptics";

type BookingStep = "addons" | "datetime" | "auth" | "confirm" | "receipt";

export default function BookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { salon, workingHours, services, addons, bookings, blockedTimes, addBooking, refreshSalonData, refreshBookings, specificDaysOff } = useSalon();
  const { user, sendOtp, verifyOtp } = useAuth();

  // Refresh salon data on mount to get latest working hours
  useEffect(() => {
    refreshSalonData();
  }, [refreshSalonData]);

  // Background refresh: keep bookings fresh every 60s while on this page
  useEffect(() => {
    const interval = setInterval(() => {
      refreshBookings();
    }, 60_000);
    return () => clearInterval(interval);
  }, [refreshBookings]);

  // Refs for guard against duplicate submits across re-renders.
  const verifiedUserRef = useRef<{ id: string } | null>(null);
  const isSendingOtpRef = useRef(false);
  const isVerifyingOtpRef = useRef(false);
  const isRegisteringRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Use Tehran timezone to avoid timezone drift — UTC noon like jalaliToGregorian
    const now = new Date();
    const tehranKey = getTehranDateKey(now);
    const [y, m, d] = tehranKey.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  });
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string>("");
  const [bookingIdRaw, setBookingIdRaw] = useState<string>("");
  const [spamError, setSpamError] = useState("");

  // Auth state
  const [authPhone, setAuthPhone] = useState("");
  const [authName, setAuthName] = useState("");
  const [authStep, setAuthStep] = useState<"phone" | "otp" | "name">("phone");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  // Sorted service selection
  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Popular-stat cutoff captured once at mount so the value is stable per session.
  /* eslint-disable react-hooks/set-state-in-effect */
  const [popularCutoff, setPopularCutoff] = useState<number | null>(null);
  useEffect(() => {
    setPopularCutoff(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const popularLast30Days = useMemo(() => {
    if (!selectedService || popularCutoff === null) return 0;
    let count = 0;
    for (const b of bookings) {
      if (b.service_id !== selectedService.id) continue;
      if (b.status === "cancelled" || b.status === "pending") continue;
      const ts = new Date(b.created_at).getTime();
      if (Number.isFinite(ts) && ts >= popularCutoff) count += 1;
    }
    return count;
  }, [bookings, selectedService, popularCutoff]);

  const activeAddons = useMemo(() => {
    return selectedService
      ? addons.filter((a) => selectedService.addon_ids.includes(a.id) && a.is_active)
      : [];
  }, [selectedService, addons]);

  const hasAddons = activeAddons.length > 0;

  // Start at addons if service has them, otherwise datetime
  const [step, setStep] = useState<BookingStep>("addons");

  // Sync initial step with the ?service=... query param.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const serviceId = searchParams.get("service");
    if (serviceId && services.length > 0) {
      // Sync URL query param to local booking step state
      setSelectedServiceId(serviceId);
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        const serviceAddons = addons.filter((a) => service.addon_ids.includes(a.id) && a.is_active);
        setStep(serviceAddons.length > 0 ? "addons" : "datetime");
      }
    }
    // Only run on mount + when services load (not on every services/addons update)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams, services, addons]);

  // Compute total duration with addons
  const totalDuration = useMemo(() => {
    if (!selectedService) return 0;
    const addonsDur = selectedAddons.reduce((sum, id) => {
      const addon = addons.find((a) => a.id === id);
      return sum + Number(addon?.duration_minutes || 0);
    }, 0);
    const raw = Number(selectedService.duration_minutes) + addonsDur;
    const buffer = salon.slot_buffer_minutes;
    const R = salon.slot_interval_minutes;
    if (buffer > 0) {
      return Math.ceil((raw + buffer) / R) * R;
    }
    return Math.ceil(raw / R) * R;
  }, [selectedService, selectedAddons, addons, salon]);

  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    const addonsPrice = selectedAddons.reduce((sum, id) => {
      const addon = addons.find((a) => a.id === id);
      return sum + Number(addon?.price || 0);
    }, 0);
    return Number(selectedService.price) + addonsPrice;
  }, [selectedService, selectedAddons, addons]);

  // Computed date/time display for confirm step
  const selectedFullDate = useMemo(() => {
    if (!selectedDate) return "";
    const j = gregorianToJalali(selectedDate);
    return formatJalaliDate(j.jy, j.jm, j.jd);
  }, [selectedDate]);

  const selectedAddonItems = useMemo(() => {
    return selectedAddons
      .map((id) => addons.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
  }, [selectedAddons, addons]);

  const selectedEndTime = useMemo(() => {
    if (!selectedTime) return "";
    const [h, m] = selectedTime.split(":").map(Number);
    const endMinutes = h * 60 + m + totalDuration;
    // Cap at 23:59 to prevent invalid time display
    const capped = Math.min(endMinutes, 23 * 60 + 59);
    return `${String(Math.floor(capped / 60)).padStart(2, "0")}:${String(capped % 60).padStart(2, "0")}`;
  }, [selectedTime, totalDuration]);

  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    const dateStr = getTehranDateKey(selectedDate);
    const dayBookings = bookings
      .filter((b) => {
        const bookingDate = b.date_gregorian.split("T")[0];
        return bookingDate === dateStr && (b.status === "reserved" || b.status === "confirmed");
      })
      .map((b) => ({ start_time: b.start_time, end_time: b.end_time }));
    const dayBlocked = blockedTimes.filter((b) => {
      const blockDate = b.date_gregorian.split("T")[0];
      return blockDate === dateStr;
    });

    const addonsDuration = selectedAddons.reduce((sum, id) => {
      const addon = addons.find((a) => a.id === id);
      return sum + Number(addon?.duration_minutes || 0);
    }, 0);

    return generateTimeSlots(
      workingHours,
      selectedDate,
      Number(selectedService.duration_minutes),
      addonsDuration,
      salon.slot_interval_minutes,
      salon.slot_buffer_minutes,
      dayBookings,
      dayBlocked,
      {
        proximity_window_hours: salon.proximity_window_hours,
        early_extra_hours: salon.early_extra_hours,
        late_extra_hours: salon.late_extra_hours,
        expand_threshold: salon.expand_threshold,
        allow_overflow: salon.allow_overflow,
        overflow_minutes: salon.overflow_minutes,
      },
      specificDaysOff
    );
  }, [selectedDate, selectedService, selectedAddons, workingHours, salon, bookings, blockedTimes, addons, specificDaysOff]);

  // ─── Navigation ───

  const resetAuth = useCallback(() => {
    setAuthStep("phone");
    setAuthPhone("");
    setAuthName("");
    setAuthError("");
  }, []);

  const goBack = useCallback(() => {
    setSpamError("");
    // Build the actual step flow based on current state
    const flow: BookingStep[] = [];
    if (hasAddons) flow.push("addons");
    flow.push("datetime");
    if (!user) flow.push("auth");
    flow.push("confirm");

    const idx = flow.indexOf(step);
    if (idx > 0) {
      setStep(flow[idx - 1]);
      resetAuth();
    } else {
      router.push("/");
    }
  }, [step, router, hasAddons, user, resetAuth]);

  const handleAddonToggle = useCallback((addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  }, []);

  const handleSelectTime = useCallback((time: string) => {
    setSpamError("");
    setSelectedTime((prev) => (prev === time ? null : time));
  }, []);

  const handleGoToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      // Use Jalali arithmetic to avoid Gregorian DST edge cases
      const j = gregorianToJalali(prev);
      let jd = j.jd + 1;
      let jm = j.jm;
      let jy = j.jy;
      const monthLen = (isJalaliLeapYear(jy) && jm === 12) ? 30 : DAYS_IN_MONTH[jm - 1];
      if (jd > monthLen) {
        jd = 1;
        jm++;
        if (jm > 12) { jm = 1; jy++; }
      }
      return jalaliToGregorian(jy, jm, jd);
    });
    setSelectedTime(null);
  }, []);

  const handleAddonsContinue = useCallback(() => {
    setStep("datetime");
  }, []);

  const handleDateTimeContinue = useCallback(() => {
    if (user) {
      setStep("confirm");
    } else {
      setStep("auth");
      resetAuth();
    }
  }, [user, resetAuth]);

  // ─── Auth handlers ───

  const handleAuthPhoneSubmit = useCallback(async () => {
    if (isAuthLoading || isSendingOtpRef.current) return;
    const normalized = normalizeDigits(authPhone);
    if (!isValidIranianPhone(normalized)) {
      setAuthError("شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)");
      return;
    }
    isSendingOtpRef.current = true;
    setIsAuthLoading(true);
    setAuthError("");
    setAuthPhone(normalized);

    try {
      const result = await sendOtp(normalized);
      if (result.success) {
        setAuthStep("otp");
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

  const handleAuthOtpSubmit = useCallback(async (code: string) => {
    if (isAuthLoading || isVerifyingOtpRef.current) return;
    isVerifyingOtpRef.current = true;
    setIsAuthLoading(true);
    setAuthError("");

    try {
      const result = await verifyOtp(normalizeDigits(authPhone), code);
      if (result.success && result.user) {
        verifiedUserRef.current = result.user;
        if (!result.user.name) {
          setAuthStep("name");
        } else {
          setStep("confirm");
        }
      } else {
        setAuthError(result.error || "کد نادرست است");
      }
    } catch {
      setAuthError("خطای سرور");
    } finally {
      setIsAuthLoading(false);
      isVerifyingOtpRef.current = false;
    }
  }, [authPhone, verifyOtp, isAuthLoading]);

  const handleAuthNameSubmit = useCallback(async () => {
    if (!authName.trim()) {
      setAuthError("نام الزامی است");
      return;
    }
    const userId = verifiedUserRef.current?.id;
    if (!userId) {
      setAuthError("خطا در شناسایی کاربر");
      return;
    }
    if (isRegisteringRef.current) return;
    isRegisteringRef.current = true;
    setIsAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name: authName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep("confirm");
      } else {
        setAuthError(data.error || "خطا در ثبت‌نام");
      }
    } catch {
      setAuthError("خطای سرور");
    } finally {
      setIsAuthLoading(false);
      isRegisteringRef.current = false;
    }
  }, [authName]);

  // ─── Confirm booking ───

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedDate || !selectedService || !selectedTime) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsBookingLoading(true);
    setSpamError("");

    const customerPhone = user?.phone || authPhone;
    const [h, m] = selectedTime.split(":").map(Number);
    const endMinutes = h * 60 + m + totalDuration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    const id = crypto.randomUUID();
    setBookingId(`BK-${Date.now().toString(36).toUpperCase()}`);

    const newBooking: Booking = {
      id,
      user_id: user?.id,
      service_id: selectedService.id,
      selected_addons: selectedAddons,
      customer_name: user?.name || authName || "",
      customer_phone: customerPhone,
      date: (() => { const j = gregorianToJalali(selectedDate); return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`; })(),
      date_gregorian: getTehranDateKey(selectedDate),
      start_time: selectedTime,
      end_time: endTime,
      status: "reserved",
      phone_verified: true,
      paid: false,
      created_at: new Date().toISOString(),
      service: selectedService,
    };

    const result = await addBooking(newBooking);
    setIsBookingLoading(false);
    isSubmittingRef.current = false;
    if (result.success) {
      // Success pattern — confirms booking committed.
      haptic.success();
      // Use server-generated booking ID for display
      if (result.id) {
        setBookingId(`BK-${result.id.slice(-6).toUpperCase()}`);
        setBookingIdRaw(result.id);
      }
      setStep("receipt");
    } else {
      haptic.warning();
      // On conflict: re-fetch fresh bookings and send user back to slot picker
      const isConflict = result.error?.includes("قبلاً رزرو شده") || result.error?.includes("همین الان رزرو شد") || result.error?.includes("مسدود شده");
      if (isConflict) {
        await refreshBookings();
        setSelectedTime(null);
        setStep("datetime");
        setSpamError("این زمان در لحظه قبل رزرو شد — لطفاً زمان دیگری انتخاب کنید");
      } else {
        setSpamError(result.error || "خطا در ذخیره رزرو — لطفاً دوباره تلاش کنید");
      }
    }
  }, [selectedDate, selectedService, selectedTime, user, authPhone, authName, addBooking, selectedAddons, totalDuration, refreshBookings]);

  // ─── Step titles ───

  const stepTitles: Record<BookingStep, string> = {
    addons: "آپشن‌ها",
    datetime: "انتخاب زمان",
    auth: "ورود",
    confirm: "تایید رزرو",
    receipt: "تایید نهایی",
  };

  return (
    <SalonGuard>
    <div className="min-h-screen">
      <AppHeader
        showBack={step !== "receipt"}
        title={stepTitles[step]}
        subtitle={selectedService?.name}
        onBack={step !== "receipt" ? goBack : undefined}
      />

      {/* Progress Indicator */}
      {step !== "receipt" && selectedService && (
        <div className="mx-auto max-w-lg">
          <BookingProgress
            currentStep={step}
            hasAddons={hasAddons}
            isLoggedIn={!!user}
          />
        </div>
      )}

      <div className="mx-auto max-w-lg px-4 pt-4 pb-28 space-y-4">

        {/* ─── Step 1: Service Detail + Addons ─── */}
        {step === "addons" && (
          <div key={step} className="space-y-4 step-animate">
            {selectedService ? (
              <ServiceDetail
                service={selectedService}
                popularLast30Days={popularLast30Days}
              />
            ) : null}

            {hasAddons ? (
              <>
                <p className="text-[13px] text-muted-foreground text-center">
                  آپشن‌های اضافی برای خدمت انتخاب کنید (اختیاری)
                </p>
                <div className="space-y-2">
                  {activeAddons.map((addon) => {
                    const isSelected = selectedAddons.includes(addon.id);
                    return (
                      <div
                        key={addon.id}
                        onClick={() => handleAddonToggle(addon.id)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-card border border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                            {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </div>
                          <div>
                            <span className="text-sm font-medium">{addon.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {addon.duration_minutes > 0 && (
                                <span className="text-[11px] text-muted-foreground">
                                  +{toPersianDigits(addon.duration_minutes)} دقیقه
                                </span>
                              )}
                              <span className="text-[11px] font-bold text-primary">
                                +{formatPrice(Number(addon.price))} تومان
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-[13px] text-muted-foreground text-center py-8">
                آپشن اضافی برای این خدمت وجود ندارد
              </p>
            )}
          </div>
        )}

        {/* ─── Step 2: Date & Time ─── */}
        {step === "datetime" && (
          <div key={step} className="space-y-4 step-animate">
            <JalaliCalendar
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              serviceDuration={Number(selectedService?.duration_minutes || 0)}
              addonsDuration={selectedAddons.reduce((sum, id) => {
                const addon = addons.find((a) => a.id === id);
                return sum + Number(addon?.duration_minutes || 0);
              }, 0)}
              config={{
                proximity_window_hours: salon.proximity_window_hours,
                early_extra_hours: salon.early_extra_hours,
                late_extra_hours: salon.late_extra_hours,
                expand_threshold: salon.expand_threshold,
                allow_overflow: salon.allow_overflow,
                overflow_minutes: salon.overflow_minutes,
              }}
              workingHours={workingHours}
              bookings={bookings.filter((b) => b.status === "reserved" || b.status === "confirmed")}
              blockedTimes={blockedTimes}
              salonConfig={{
                slot_interval_minutes: salon.slot_interval_minutes,
                slot_buffer_minutes: salon.slot_buffer_minutes,
              }}
              specificDaysOff={specificDaysOff}
            />

            {/* Selected Date Display */}
            {selectedDate && (
              <div className="mx-auto max-w-lg">
                <div className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-primary/5 border border-primary/10">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-[15px] font-bold text-foreground">
                    {(() => {
                      const j = gregorianToJalali(selectedDate);
                      return formatJalaliDate(j.jy, j.jm, j.jd);
                    })()}
                  </span>
                </div>
              </div>
            )}

            <TimeSlots
              date={selectedDate}
              slots={timeSlots}
              selectedSlot={selectedTime}
              onSelectSlot={handleSelectTime}
              onGoToNextDay={handleGoToNextDay}
            />
          </div>
        )}

        {/* ─── Step 3: Auth ─── */}
        {step === "auth" && (
          <AuthCardRoot key={step} className="step-animate">
            {authStep === "phone" && (
              <AuthCard
                icon={<Smartphone className="h-6 w-6" />}
                title="ورود"
                subtitle="شماره موبایل خود را وارد کنید"
              >
                <div className="space-y-4">
                  <div>
                    <Label className="text-caption text-muted-foreground mb-1.5 block">شماره موبایل</Label>
                    <Input
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAuthPhoneSubmit()}
                      placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                      dir="ltr"
                      className="h-14 text-left text-lg rounded-2xl"
                      autoFocus
                    />
                  </div>
                  <AuthError error={authError} />
                  <Button
                    size="xl"
                    className="w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                    onClick={handleAuthPhoneSubmit}
                    disabled={!isValidIranianPhone(normalizeDigits(authPhone)) || isAuthLoading}
                  >
                    {isAuthLoading ? "در حال ارسال..." : "دریافت کد"}
                  </Button>
                </div>
              </AuthCard>
            )}

            {authStep === "otp" && (
              <AuthCard
                icon={<LogIn className="h-6 w-6" />}
                title="کد ورود"
                subtitle="کد ۶ رقمی پیامک‌شده را وارد کنید"
              >
                <div className="space-y-5">
                  <div className="text-center">
                    <p
                      className="inline-block text-body text-muted-foreground bg-muted/50 px-4 py-1.5 rounded-full"
                      dir="ltr"
                    >
                      {displayDigits(authPhone)}
                    </p>
                  </div>
                  <PinInput length={6} onComplete={handleAuthOtpSubmit} disabled={isAuthLoading} />
                  <AuthError error={authError} />
                  <ResendOtpButton
                    onResend={async () => {
                      const result = await sendOtp(normalizeDigits(authPhone));
                      if (!result.success) {
                        setAuthError(result.error || "خطا در ارسال مجدد کد");
                      }
                    }}
                    disabled={isAuthLoading}
                  />
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setAuthStep("phone")}
                  >
                    <ArrowRight className="h-4 w-4 ml-2" />
                    تغییر شماره
                  </Button>
                </div>
              </AuthCard>
            )}

            {authStep === "name" && (
              <AuthCard
                icon={<User className="h-6 w-6" />}
                title="نام شما"
                subtitle="نام و نام خانوادگی خود را وارد کنید"
              >
                <div className="space-y-4">
                  <div>
                    <Label className="text-caption text-muted-foreground mb-1.5 block">نام و نام خانوادگی</Label>
                    <Input
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAuthNameSubmit()}
                      placeholder="مثال: سارا احمدی"
                      className="h-14 text-lg rounded-2xl"
                      autoFocus
                    />
                  </div>
                  <AuthError error={authError} />
                  <Button
                    size="xl"
                    className="w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                    onClick={handleAuthNameSubmit}
                    disabled={isAuthLoading || !authName.trim()}
                  >
                    {isAuthLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        در حال ثبت‌نام...
                      </span>
                    ) : "تکمیل ثبت‌نام"}
                  </Button>
                </div>
              </AuthCard>
            )}
          </AuthCardRoot>
        )}

        {/* ─── Step 4: Confirm (Pre-Receipt) ─── */}
        {step === "confirm" && selectedService && selectedDate && selectedTime && (
          <div key={step} className="space-y-3 step-animate">
            {isBookingLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <PrintedReceipt
                  mode="preview"
                  salonName={salon.name}
                  salonLogoUrl={salon.logo_url}
                  salonAddress={salon.address}
                  salonPhone={salon.phone}
                  serviceName={selectedService.name}
                  servicePrice={Number(selectedService.price)}
                  addons={selectedAddonItems.map((a) => ({ name: a.name, price: Number(a.price) }))}
                  dateLabel={selectedFullDate}
                  startTime={selectedTime}
                  endTime={selectedEndTime}
                  totalDuration={totalDuration}
                  totalPrice={totalPrice}
                  customerName={user?.name || authName || ""}
                />

                {/* Spam Error */}
                {spamError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 animate-slideUp">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-[13px] text-destructive">{spamError}</p>
                  </div>
                )}

                {/* Confirm Button */}
                <Button size="xl" onClick={handleConfirmBooking} disabled={isBookingLoading} className="w-full bg-foreground text-background hover:bg-foreground/90">
                  {isBookingLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      در حال ثبت...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      تایید و رزرو
                      <ArrowLeft className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {/* ─── Step 5: Receipt ─── */}
        {step === "receipt" && selectedService && selectedDate && selectedTime && (
          <div key={step} className="step-animate">
            <BookingConfirm
              serviceName={selectedService.name}
              date={selectedDate}
              time={selectedTime}
              duration={totalDuration}
              price={totalPrice}
              servicePrice={Number(selectedService.price)}
              customerName={user?.name || ""}
              bookingId={bookingId}
              salonName={salon.name}
              salonAddress={salon.address}
              phone={salon.phone}
              salonLogoUrl={salon.logo_url}
              addons={selectedAddonItems}
              bookingIdRaw={bookingIdRaw}
            />
          </div>
        )}
      </div>

      {/* Sticky CTA for datetime step */}
      {step === "datetime" && selectedTime && (
        <div className="fixed bottom-[72px] left-0 right-0 z-30 px-4 pb-2 pointer-events-none">
          <div className="mx-auto max-w-lg pointer-events-auto">
            <Button size="xl" className="w-full bg-foreground text-background hover:bg-foreground/90 shadow-lg" onClick={handleDateTimeContinue}>
              ادامه
              <ChevronLeft className="h-5 w-5 mr-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Sticky CTA for addons step */}
      {step === "addons" && (
        <div className="fixed bottom-[72px] left-0 right-0 z-30 px-4 pb-2 pointer-events-none">
          <div className="mx-auto max-w-lg pointer-events-auto">
            <Button size="xl" className="w-full bg-foreground text-background hover:bg-foreground/90 shadow-lg" onClick={handleAddonsContinue}>
              {hasAddons ? "انتخاب زمان" : "ادامه"}
              <ChevronLeft className="h-5 w-5 mr-2" />
            </Button>
          </div>
        </div>
      )}

      <AppNavbar />
    </div>
    </SalonGuard>
  );
}
