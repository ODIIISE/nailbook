"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CustomerNav } from "@/components/layout/customer-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Puzzle, Check } from "lucide-react";
import { JalaliCalendar } from "@/components/booking/jalali-calendar";
import { TimeSlots } from "@/components/booking/time-slots";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { PinInput } from "@/components/booking/pin-input";
import { generateTimeSlots } from "@/lib/slots";
import { useSalon } from "@/lib/salon-context";
import { useAuth } from "@/lib/auth-context";
import { toPersianDigits, gregorianToJalali, formatJalaliDate } from "@/lib/jalali";
import { normalizeDigits } from "@/lib/digits";
import { getTehranDateKey } from "@/lib/time";
import type { Booking } from "@/lib/mock-data";

type BookingStep = "addons" | "datetime" | "auth" | "confirm" | "receipt";

export default function BookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { salon, workingHours, services, addons, bookings, blockedTimes, addBooking } = useSalon();
  const { user, checkPhone, createPin, verifyPin } = useAuth();

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string>("");
  const [spamError, setSpamError] = useState("");

  // Auth state
  const [authPhone, setAuthPhone] = useState("");
  const [authPin, setAuthPin] = useState("");
  const [authStep, setAuthStep] = useState<"phone" | "pin" | "confirm-pin" | "verify-pin">("phone");
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
    const addonsDuration = selectedAddons.reduce((sum, id) => {
      const addon = addons.find((a) => a.id === id);
      return sum + (addon?.duration_minutes || 0);
    }, 0);
    return selectedService.duration_minutes + addonsDuration;
  }, [selectedService, selectedAddons, addons]);

  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    const addonsPrice = selectedAddons.reduce((sum, id) => {
      const addon = addons.find((a) => a.id === id);
      return sum + (addon?.price || 0);
    }, 0);
    return selectedService.price + addonsPrice;
  }, [selectedService, selectedAddons, addons]);

  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    const dateStr = getTehranDateKey(selectedDate);
    const dayBookings = bookings
      .filter((b) => b.date_gregorian === dateStr && b.status === "confirmed")
      .map((b) => ({ start_time: b.start_time, end_time: b.end_time }));
    const dayBlocked = blockedTimes.filter((b) => b.date_gregorian === dateStr);

    return generateTimeSlots(
      workingHours,
      selectedDate,
      totalDuration,
      salon.slot_interval_minutes,
      salon.slot_buffer_minutes,
      dayBookings,
      dayBlocked,
      selectedService?.priority_score || 5
    );
  }, [selectedDate, selectedService, totalDuration, workingHours, salon, bookings, blockedTimes]);

  // ─── Navigation ───

  const goBack = useCallback(() => {
    const steps: BookingStep[] = hasAddons
      ? ["addons", "datetime", "auth", "confirm"]
      : ["datetime", "auth", "confirm"];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
    else router.push("/");
  }, [step, router, hasAddons]);

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
    setSelectedTime((prev) => (prev === time ? null : time));
  }, []);

  const handleGoToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
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
      setAuthPhone("");
    }
  }, [user]);

  // ─── Auth handlers ───

  const handleAuthPhoneSubmit = useCallback(async () => {
    const normalized = normalizeDigits(authPhone);
    if (normalized.length < 10) {
      setAuthError("شماره موبایل معتبر نیست");
      return;
    }
    setIsLoading(true);
    setAuthError("");
    setAuthPhone(normalized);
    const result = await checkPhone(normalized);
    setIsLoading(false);

    if (result.locked) {
      setAuthError(result.message || "حساب قفل شده است");
      return;
    }
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
    setIsLoading(true);
    setAuthError("");
    const result = await createPin(normalizeDigits(authPhone), authPin, "");
    setIsLoading(false);
    if (result.success) setStep("confirm");
    else setAuthError(result.error || "خطا در ثبت‌نام");
  }, [authPin, authPhone, createPin]);

  const handleAuthVerifyPinSubmit = useCallback(async (pin: string) => {
    setIsLoading(true);
    setAuthError("");
    const result = await verifyPin(normalizeDigits(authPhone), pin);
    setIsLoading(false);
    if (result.success) setStep("confirm");
    else setAuthError(result.error || "کد نادرست است");
  }, [authPhone, verifyPin]);

  // ─── Confirm booking ───

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedDate || !selectedService || !selectedTime) return;
    setIsLoading(true);
    setSpamError("");

    const customerPhone = user?.phone || authPhone;
    const [h, m] = selectedTime.split(":").map(Number);
    const endMinutes = h * 60 + m + totalDuration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}:00`;

    // Validate slot
    try {
      const reserveRes = await fetch("/api/book/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: selectedService.id,
          date_gregorian: getTehranDateKey(selectedDate),
          start_time: `${selectedTime}:00`,
          end_time: endTime,
        }),
      });
      if (!reserveRes.ok) {
        const data = await reserveRes.json();
        setSpamError(data.error || "این زمان دیگر در دسترس نیست");
        setIsLoading(false);
        return;
      }
    } catch {}

    const id = crypto.randomUUID();
    setBookingId(`BK-${Date.now().toString(36).toUpperCase()}`);

    const newBooking: Booking = {
      id,
      user_id: user?.id,
      service_id: selectedService.id,
      selected_addons: selectedAddons,
      customer_name: user?.name || "",
      customer_phone: customerPhone,
      date: (() => { const j = gregorianToJalali(selectedDate); return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`; })(),
      date_gregorian: getTehranDateKey(selectedDate),
      start_time: `${selectedTime}:00`,
      end_time: endTime,
      status: "confirmed",
      phone_verified: true,
      paid: false,
      created_at: new Date().toISOString(),
      service: selectedService,
    };

    addBooking(newBooking);
    setIsLoading(false);
    setStep("receipt");
  }, [selectedDate, selectedService, selectedTime, user, authPhone, addBooking, selectedAddons, totalDuration]);

  // ─── Step titles ───

  const stepTitles: Record<BookingStep, string> = {
    addons: "آپشن‌ها",
    datetime: "انتخاب زمان",
    auth: "ورود",
    confirm: "تایید رزرو",
    receipt: "تایید نهایی",
  };

  return (
    <div className="min-h-screen">
      <Header
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
                                +{toPersianDigits(addon.price.toLocaleString("fa-IR"))} تومان
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
            />

            {selectedDate && (
              <div className="py-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[13px] text-muted-foreground">تاریخ:</span>
                  <span className="text-[17px] font-bold text-foreground">
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
                {authError && <p className="text-[13px] text-destructive text-center">{authError}</p>}
                <Button className="w-full" onClick={handleAuthPhoneSubmit} disabled={authPhone.length < 10}>
                  ادامه
                </Button>
              </div>
            )}

            {authStep === "pin" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-h1 text-foreground">ساخت رمز</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">یک کد ۴ رقمی بسازید</p>
                </div>
                <PinInput onComplete={handleAuthPinSubmit} disabled={isLoading} />
                {authError && <p className="text-[13px] text-destructive text-center mt-2">{authError}</p>}
                <Button variant="ghost" className="w-full" onClick={() => setAuthStep("phone")}>بازگشت</Button>
              </div>
            )}

            {authStep === "confirm-pin" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-h1 text-foreground">تکرار رمز</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">رمز خود را دوباره وارد کنید</p>
                </div>
                <PinInput onComplete={handleAuthConfirmPinSubmit} disabled={isLoading} />
                {authError && <p className="text-[13px] text-destructive text-center mt-2">{authError}</p>}
                <Button variant="ghost" className="w-full" onClick={() => setAuthStep("pin")}>بازگشت</Button>
              </div>
            )}

            {authStep === "verify-pin" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-h1 text-foreground">ورود</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">کد ۴ رقمی خود را وارد کنید</p>
                  <p className="text-[13px] text-muted-foreground mt-1" dir="ltr">{authPhone}</p>
                </div>
                <PinInput onComplete={handleAuthVerifyPinSubmit} disabled={isLoading} />
                {authError && <p className="text-[13px] text-destructive text-center mt-2">{authError}</p>}
                <Button variant="ghost" className="w-full" onClick={() => setAuthStep("phone")}>بازگشت</Button>
              </div>
            )}
          </Card>
        )}

        {/* ─── Step 4: Confirm ─── */}
        {step === "confirm" && selectedService && selectedDate && selectedTime && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="skeleton h-48 w-full rounded-2xl" />
                <div className="skeleton h-12 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <Card className="glass p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-border/30">
                      <span className="text-sm text-muted-foreground">خدمت</span>
                      <span className="text-sm font-bold">{selectedService.name}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/30">
                      <span className="text-sm text-muted-foreground">تاریخ و ساعت</span>
                      <span className="text-sm font-bold">{selectedTime}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/30">
                      <span className="text-sm text-muted-foreground">مدت</span>
                      <span className="text-sm font-bold">{toPersianDigits(totalDuration)} دقیقه</span>
                    </div>
                    {selectedAddons.length > 0 && (
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm text-muted-foreground">آپشن‌ها</span>
                        <span className="text-sm font-bold">{toPersianDigits(selectedAddons.length)} مورد</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">هزینه کل</span>
                      <span className="text-base font-bold text-primary">
                        {toPersianDigits(totalPrice.toLocaleString("fa-IR"))} تومان
                      </span>
                    </div>
                  </div>
                </Card>

                {spamError && <p className="text-[13px] text-destructive text-center">{spamError}</p>}

                <Button onClick={handleConfirmBooking} disabled={isLoading} className="w-full h-12 bg-primary hover:bg-primary/90 text-white">
                  {isLoading ? "در حال ثبت..." : "تایید و رزرو"}
                  {!isLoading && <ChevronLeft className="h-5 w-5 mr-2" />}
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
            <Button onClick={handleDateTimeContinue} className="w-full h-12 shadow-lg">
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
            <Button onClick={handleAddonsContinue} className="w-full h-12 shadow-lg">
              {hasAddons ? "انتخاب زمان" : "ادامه"}
              <ChevronLeft className="h-5 w-5 mr-2" />
            </Button>
          </div>
        </div>
      )}

      <CustomerNav />
    </div>
  );
}
