"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Puzzle, Check, AlertCircle, CalendarDays, Timer, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { JalaliCalendar } from "@/components/booking/jalali-calendar";
import { TimeSlots } from "@/components/booking/time-slots";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { PinInput } from "@/components/booking/pin-input";
import { Skeleton } from "@/components/ui/skeleton";
import { SalonGuard } from "@/components/ui/salon-guard";
import { generateTimeSlots } from "@/lib/slots";
import { useSalon } from "@/lib/salon-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, toPersianDigits, gregorianToJalali, jalaliToGregorian, formatJalaliDate, DAYS_IN_MONTH, isJalaliLeapYear } from "@/lib/jalali";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import { getTehranDateKey } from "@/lib/time";
import type { Booking } from "@/lib/types";

type BookingStep = "addons" | "datetime" | "auth" | "confirm" | "receipt";

export default function BookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { salon, workingHours, services, addons, bookings, blockedTimes, addBooking, refreshSalonData, refreshBookings, specificDaysOff } = useSalon();
  const { user, checkPhone, login, signup } = useAuth();

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
  const [spamError, setSpamError] = useState("");

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (!spamError) return;
    const timer = setTimeout(() => setSpamError(""), 5000);
    return () => clearTimeout(timer);
  }, [spamError]);

  // Auth state
  const [authPhone, setAuthPhone] = useState("");
  const [authPin, setAuthPin] = useState("");
  const [authName, setAuthName] = useState("");
  const [authStep, setAuthStep] = useState<"phone" | "pin" | "confirm-pin" | "name" | "verify-pin">("phone");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Determine initial step based on service addons
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const activeAddons = useMemo(() => {
    return selectedService
      ? addons.filter((a) => selectedService.addon_ids.includes(a.id) && a.is_active)
      : [];
  }, [selectedService, addons]);

  const hasAddons = activeAddons.length > 0;

  // Start at addons if service has them, otherwise datetime
  const [step, setStep] = useState<BookingStep>("addons");

  useEffect(() => {
    const serviceId = searchParams.get("service");
    if (serviceId) {
      setSelectedServiceId(serviceId);
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        const serviceAddons = addons.filter((a) => service.addon_ids.includes(a.id) && a.is_active);
        setStep(serviceAddons.length > 0 ? "addons" : "datetime");
      }
    }
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

  const selectedEndTime = useMemo(() => {
    if (!selectedTime) return "";
    const [h, m] = selectedTime.split(":").map(Number);
    const endMinutes = h * 60 + m + totalDuration;
    return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
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
    setAuthPin("");
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
    const normalized = normalizeDigits(authPhone);
    if (!isValidIranianPhone(normalized)) {
      setAuthError("شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)");
      return;
    }
    setIsLoading(true);
    setAuthError("");
    setAuthPhone(normalized);

    const result = await checkPhone(normalized);
    setIsLoading(false);

    if (result.exists && result.hasPin) {
      setAuthStep("verify-pin");
    } else {
      setAuthStep("pin");
    }
  }, [authPhone, checkPhone]);

  const handleAuthPinSubmit = useCallback((pin: string) => {
    setAuthPin(pin);
    setAuthStep("confirm-pin");
  }, []);

  const handleAuthConfirmPinSubmit = useCallback(async (confirmPin: string) => {
    if (authPin !== confirmPin) {
      setAuthError("رمزها مطابقت ندارند");
      return;
    }
    setAuthStep("name");
  }, [authPin]);

  const handleAuthNameSubmit = useCallback(async () => {
    if (!authName.trim()) {
      setAuthError("نام الزامی است");
      return;
    }
    setIsLoading(true);
    setAuthError("");
    const result = await signup(normalizeDigits(authPhone), authPin, authName.trim());
    setIsLoading(false);
    if (result.success) setStep("confirm");
    else setAuthError(result.error || "خطا در ثبت‌نام");
  }, [authPin, authPhone, authName, signup]);

  const handleAuthVerifyPinSubmit = useCallback(async (pin: string) => {
    setIsLoading(true);
    setAuthError("");
    const result = await login(normalizeDigits(authPhone), pin);
    setIsLoading(false);
    if (result.success) setStep("confirm");
    else setAuthError(result.error || "کد نادرست است");
  }, [authPhone, login]);

  // ─── Confirm booking ───

  const isSubmittingRef = useRef(false);

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedDate || !selectedService || !selectedTime) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
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
    setIsLoading(false);
    isSubmittingRef.current = false;
    if (result.success) {
      // Use server-generated booking ID for display
      if (result.id) setBookingId(`BK-${result.id.slice(-6).toUpperCase()}`);
      setStep("receipt");
    } else {
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
  }, [selectedDate, selectedService, selectedTime, user, authPhone, addBooking, selectedAddons, totalDuration, refreshBookings]);

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

      <div className="mx-auto max-w-lg px-4 pt-6 pb-28 space-y-4">

        {/* ─── Step 1: Addons ─── */}
        {step === "addons" && (
          <div className="space-y-4">
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
                            : "bg-white/50 border border-border/50"
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
          <div className="space-y-4">
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
                <div className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#2888d0]/5 border border-[#2888d0]/10">
                  <CalendarDays className="h-4 w-4 text-[#2888d0]" />
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
          <Card className="glass p-6">
            {authStep === "phone" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--rose)]/10">
                    <span className="text-xl">📱</span>
                  </div>
                  <h2 className="text-h1 text-foreground">ورود</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    شماره موبایل خود را وارد کنید
                  </p>
                </div>
                <div>
                  <Label className="text-[13px]">شماره موبایل</Label>
                  <Input
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAuthPhoneSubmit()}
                    placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                    dir="ltr"
                    className="mt-1 text-left"
                  />
                </div>
                {authError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-[13px] text-destructive">{authError}</p>
                  </div>
                )}
                <Button size="xl" variant="paper" className="w-full" onClick={handleAuthPhoneSubmit} disabled={!isValidIranianPhone(normalizeDigits(authPhone))}>
                  ادامه
                </Button>
              </div>
            )}

            {authStep === "pin" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                    <span className="text-xl">🔑</span>
                  </div>
                  <h2 className="text-h1 text-foreground">ساخت رمز</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">یک کد ۴ رقمی بسازید</p>
                </div>
                <PinInput onComplete={handleAuthPinSubmit} disabled={isLoading} />
                {authError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-[13px] text-destructive">{authError}</p>
                  </div>
                )}
                <Button size="lg" variant="outline" className="w-full" onClick={() => setAuthStep("phone")}>بازگشت</Button>
              </div>
            )}

            {authStep === "confirm-pin" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                    <span className="text-xl">✅</span>
                  </div>
                  <h2 className="text-h1 text-foreground">تکرار رمز</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">رمز خود را دوباره وارد کنید</p>
                </div>
                <PinInput onComplete={handleAuthConfirmPinSubmit} disabled={isLoading} />
                {authError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-[13px] text-destructive">{authError}</p>
                  </div>
                )}
                <Button size="lg" variant="outline" className="w-full" onClick={() => setAuthStep("pin")}>بازگشت</Button>
              </div>
            )}

            {authStep === "name" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <span className="text-xl">👤</span>
                  </div>
                  <h2 className="text-h1 text-foreground">نام شما</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">نام و نام خانوادگی خود را وارد کنید</p>
                </div>
                <div>
                  <Label className="text-[13px]">نام</Label>
                  <Input
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAuthNameSubmit()}
                    placeholder="نام و نام خانوادگی"
                    className="mt-1"
                    autoFocus
                  />
                </div>
                {authError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-[13px] text-destructive">{authError}</p>
                  </div>
                )}
                <Button size="xl" variant="paper" className="w-full" onClick={handleAuthNameSubmit} disabled={isLoading || !authName.trim()}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      در حال ثبت‌نام...
                    </span>
                  ) : "ثبت‌نام"}
                </Button>
                <Button size="lg" variant="outline" className="w-full" onClick={() => setAuthStep("confirm-pin")}>بازگشت</Button>
              </div>
            )}

            {authStep === "verify-pin" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
                    <span className="text-xl">🔐</span>
                  </div>
                  <h2 className="text-h1 text-foreground">ورود</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">کد ۴ رقمی خود را وارد کنید</p>
                  <p className="text-[13px] text-muted-foreground mt-1" dir="ltr">{authPhone}</p>
                </div>
                <PinInput onComplete={handleAuthVerifyPinSubmit} disabled={isLoading} />
                {authError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-[13px] text-destructive">{authError}</p>
                  </div>
                )}
                <Button size="lg" variant="outline" className="w-full" onClick={() => setAuthStep("phone")}>بازگشت</Button>
              </div>
            )}
          </Card>
        )}

        {/* ─── Step 4: Confirm (Pre-Receipt) ─── */}
        {step === "confirm" && selectedService && selectedDate && selectedTime && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : (
              <>
                {/* Samsung ticket receipt — stub */}
                <div className="relative z-[2] mb-[-1px]">
                  <div
                    className="rounded-t-[10px] px-6 pt-4 pb-2.5 relative overflow-hidden"
                    style={{
                      background: "var(--card)",
                      boxShadow: "0 0.5px 1px rgba(80,70,60,0.08), 0 2px 6px rgba(60,50,40,0.06), 0 4px 12px rgba(50,40,30,0.04)",
                    }}
                  >
                    <div className="text-center text-[8px] font-semibold tracking-[3px] text-muted-foreground opacity-40">
                      {selectedService.name}
                    </div>
                    <div className="text-center text-[7px] font-medium tracking-[1px] text-muted-foreground opacity-30 mt-0.5">
                      forehand.vercel.app
                    </div>
                  </div>
                  <div className="h-[5px] relative overflow-hidden" style={{ background: "var(--card)" }}>
                    <div className="absolute bottom-0 left-0 right-0 h-[5px]" style={{ backgroundImage: "repeating-conic-gradient(var(--card) 0% 25%, transparent 0% 50%)", backgroundSize: "8px 8px", backgroundPosition: "50% 0" }} />
                  </div>
                </div>

                {/* Perforation */}
                <div className="flex justify-center gap-[7px] py-1 relative z-[3]">
                  {Array.from({ length: 26 }).map((_, i) => (
                    <div key={i} className="w-[3px] h-[3px] rounded-full" style={{ background: "var(--background)", boxShadow: "inset 0 0.5px 1px rgba(0,0,0,0.08)" }} />
                  ))}
                </div>

                {/* Main card */}
                <div className="relative z-[1]">
                  <div className="h-[5px] relative overflow-hidden" style={{ background: "var(--card)", transform: "rotate(180deg)" }}>
                    <div className="absolute bottom-0 left-0 right-0 h-[5px]" style={{ backgroundImage: "repeating-conic-gradient(var(--card) 0% 25%, transparent 0% 50%)", backgroundSize: "8px 8px", backgroundPosition: "50% 0" }} />
                  </div>
                  <div
                    className="rounded-b-[10px] px-6 py-6 relative overflow-hidden"
                    style={{ background: "var(--card)", boxShadow: "0 0.5px 1px rgba(80,70,60,0.06), 0 2px 6px rgba(60,50,40,0.05), 0 4px 12px rgba(50,40,30,0.04), 0 8px 24px rgba(50,40,30,0.03), 0 16px 48px rgba(50,40,30,0.02)" }}
                  >
                    {/* Paper texture */}
                    <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.03] mix-blend-multiply" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.25'/%3E%3C/svg%3E\")", backgroundSize: "180px 180px" }} />

                    {/* Top edge highlight */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] z-[2] pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }} />

                    {/* FOREHAND watermark */}
                    <div className="absolute left-2 top-0 bottom-0 z-0 pointer-events-none select-none flex items-center justify-center" style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: "42px", fontWeight: 900, letterSpacing: "6px", color: "var(--foreground)", opacity: 0.03 }}>
                      FOREHAND
                    </div>

                    {/* Booking info */}
                    <div className="flex items-center gap-3 mb-4 relative z-[2]">
                      <div className="w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(40,136,208,0.08), rgba(91,179,228,0.04))" }}>
                        <Sparkles className="h-5 w-5 text-[#2888d0]" />
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-foreground">{selectedService.name}</div>
                        <div className="text-[11px] text-muted-foreground">{salon.name}</div>
                      </div>
                    </div>

                    {/* Detail list */}
                    <div className="relative z-[2]">
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-[13px] text-muted-foreground">تاریخ</span>
                        <span className="text-[13px] font-semibold text-foreground">{selectedFullDate}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-t border-dashed border-black/[0.06]">
                        <span className="text-[13px] text-muted-foreground">ساعت</span>
                        <span className="text-[13px] font-semibold text-foreground">{toPersianDigits(selectedTime)} تا {toPersianDigits(selectedEndTime)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-t border-dashed border-black/[0.06]">
                        <span className="text-[13px] text-muted-foreground">مدت</span>
                        <span className="text-[13px] font-semibold text-foreground">{toPersianDigits(totalDuration)} دقیقه</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-t border-dashed border-black/[0.06]">
                        <span className="text-[13px] text-muted-foreground">هزینه کل</span>
                        <span className="text-[17px] font-extrabold text-[#2888d0]">{formatPrice(Number(totalPrice))} تومان</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spam Error */}
                {spamError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 animate-slideUp">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-[13px] text-destructive">{spamError}</p>
                  </div>
                )}

                {/* Confirm Button */}
                <Button size="xl" onClick={handleConfirmBooking} disabled={isLoading} variant="paper" className="w-full">
                  {isLoading ? (
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
          <BookingConfirm
            serviceName={selectedService.name}
            date={selectedDate}
            time={selectedTime}
            duration={totalDuration}
            price={totalPrice}
            customerName={user?.name || ""}
            bookingId={bookingId}
            phone={salon.phone}
          />
        )}
      </div>

      {/* Sticky CTA for datetime step */}
      {step === "datetime" && selectedTime && (
        <div className="fixed bottom-[72px] left-0 right-0 z-30 px-4 pb-2 pointer-events-none">
          <div className="mx-auto max-w-lg pointer-events-auto">
            <Button size="xl" variant="paper" onClick={handleDateTimeContinue} className="w-full shadow-lg">
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
            <Button size="xl" variant="paper" onClick={handleAddonsContinue} className="w-full shadow-lg">
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
