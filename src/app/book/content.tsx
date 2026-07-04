"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CustomerNav } from "@/components/layout/customer-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronDown, ChevronUp, Puzzle, Check } from "lucide-react";
import { JalaliCalendar } from "@/components/booking/jalali-calendar";
import { TimeSlots } from "@/components/booking/time-slots";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { PinInput } from "@/components/booking/pin-input";
import { generateTimeSlots } from "@/lib/slots";
import { useSalon } from "@/lib/salon-context";
import { useAuth } from "@/lib/auth-context";
import { toPersianDigits, gregorianToJalali } from "@/lib/jalali";
import { getTehranDateKey } from "@/lib/time";
import type { Booking } from "@/lib/mock-data";

type BookingStep = "select" | "auth" | "confirm" | "receipt";

export default function BookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { salon, workingHours, services, addons, bookings, blockedTimes, addBooking } = useSalon();
  const { user, checkPhone, createPin, verifyPin } = useAuth();
  const [step, setStep] = useState<BookingStep>("select");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [showAddons, setShowAddons] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string>("");

  // Auth state
  const [authPhone, setAuthPhone] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPin, setAuthPin] = useState("");
  const [authConfirmPin, setAuthConfirmPin] = useState("");
  const [authStep, setAuthStep] = useState<"phone" | "name" | "pin" | "confirm-pin" | "verify-pin">("phone");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const serviceId = searchParams.get("service");
    if (serviceId) {
      setSelectedServiceId(serviceId);
      const service = services.find((s) => s.id === serviceId);
      if (service && service.addon_ids.length > 0) {
        setShowAddons(true);
      }
    }
  }, [searchParams, services]);

  const selectedService = services.find((s) => s.id === selectedServiceId);

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
    const dayBookings = bookings.filter(
      (b) => b.date_gregorian === dateStr && b.status === "confirmed"
    ).map((b) => ({
      start_time: b.start_time,
      end_time: b.end_time,
    }));

    const dayBlocked = blockedTimes.filter((b) => b.date_gregorian === dateStr);

    return generateTimeSlots(
      workingHours,
      selectedDate,
      totalDuration,
      salon.slot_interval_minutes,
      salon.slot_buffer_minutes,
      dayBookings,
      dayBlocked
    );
  }, [selectedDate, selectedService, totalDuration, workingHours, salon, bookings, blockedTimes]);

  const handleAddonToggle = useCallback((addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
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

  const handleSelectContinue = useCallback(() => {
    if (user) {
      setStep("confirm");
    } else {
      setStep("auth");
      setAuthPhone("");
    }
  }, [user]);

  const handleAuthPhoneSubmit = useCallback(async () => {
    if (authPhone.length < 10) {
      setAuthError("شماره موبایل معتبر نیست");
      return;
    }
    setIsLoading(true);
    setAuthError("");
    const result = await checkPhone(authPhone);
    setIsLoading(false);

    if (result.locked) {
      setAuthError(result.message || "حساب قفل شده است");
      return;
    }

    if (result.exists && result.hasPin) {
      setAuthStep("verify-pin");
    } else if (result.exists) {
      setAuthStep("pin");
    } else {
      setAuthStep("name");
    }
  }, [authPhone, checkPhone]);

  const handleAuthNameSubmit = useCallback(() => {
    if (!authName.trim()) {
      setAuthError("نام الزامی است");
      return;
    }
    setAuthStep("pin");
  }, [authName]);

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
    const result = await createPin(authPhone, authPin, authName);
    setIsLoading(false);

    if (result.success) {
      setStep("confirm");
    } else {
      setAuthError(result.error || "خطا در ثبت‌نام");
    }
  }, [authPin, authPhone, authName, createPin]);

  const handleAuthVerifyPinSubmit = useCallback(async (pin: string) => {
    setIsLoading(true);
    setAuthError("");
    const result = await verifyPin(authPhone, pin);
    setIsLoading(false);

    if (result.success) {
      setStep("confirm");
    } else {
      setAuthError(result.error || "کد نادرست است");
    }
  }, [authPhone, verifyPin]);

  const [spamError, setSpamError] = useState("");

  const handleConfirmBooking = useCallback(async () => {
    if (selectedDate && selectedService && selectedTime) {
      const customerPhone = user?.phone || authPhone;
      if (customerPhone) {
        try {
          const res = await fetch("/api/anti-spam", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: customerPhone }),
          });
          const data = await res.json();
          if (!res.ok) {
            setSpamError(data.error || "خطا در بررسی");
            return;
          }
        } catch {
          // Proceed if anti-spam check fails (server error)
        }
      }
      setSpamError("");
      const id = crypto.randomUUID();
      setBookingId(`BK-${Date.now().toString(36).toUpperCase()}`);

      const [h, m] = selectedTime.split(":").map(Number);
      const endMinutes = h * 60 + m + totalDuration;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;

      const customerName = user?.name || authName;

      const newBooking: Booking = {
        id,
        user_id: user?.id,
        service_id: selectedService.id,
        selected_addons: selectedAddons,
        customer_name: customerName,
        customer_phone: customerPhone,
        date: (() => {
          const j = gregorianToJalali(selectedDate);
          return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`;
        })(),
        date_gregorian: getTehranDateKey(selectedDate),
        start_time: `${selectedTime}:00`,
        end_time: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`,
        status: "confirmed",
        phone_verified: true,
        paid: false,
        created_at: new Date().toISOString(),
        service: selectedService,
      };

      addBooking(newBooking);
      setStep("receipt");
    }
  }, [selectedDate, selectedService, selectedTime, user, authName, authPhone, addBooking, selectedAddons, totalDuration]);

  const stepTitles: Record<BookingStep, string> = {
    select: "انتخاب زمان",
    auth: "ورود",
    confirm: "تایید رزرو",
    receipt: "تایید نهایی",
  };

  const goBack = useCallback(() => {
    const steps: BookingStep[] = ["select", "auth", "confirm"];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
    else router.push("/");
  }, [step, router]);

  const activeAddons = useMemo(() => {
    return selectedService
      ? addons.filter((a) => selectedService.addon_ids.includes(a.id) && a.is_active)
      : [];
  }, [selectedService, addons]);

  const handleToggleAddons = useCallback(() => {
    setShowAddons((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen">
      <Header
        showBack={step !== "receipt"}
        title={stepTitles[step]}
        subtitle={selectedService?.name}
        onBack={step !== "receipt" ? goBack : undefined}
      />

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {step === "select" && (
          <div className="space-y-4">
            {activeAddons.length > 0 && (
              <Card className="glass p-4">
                <button
                  onClick={handleToggleAddons}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Puzzle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">آپشن‌های اضافی</span>
                    {selectedAddons.length > 0 && (
                      <span className="text-[11px] text-primary">({toPersianDigits(selectedAddons.length)})</span>
                    )}
                  </div>
                  {showAddons ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {showAddons && (
                  <div className="mt-3 space-y-2">
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
                          <div className="flex items-center gap-2">
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                              {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-sm">{addon.name}</span>
                          </div>
                          <span className="text-xs font-bold text-primary">
                            +{toPersianDigits(addon.price.toLocaleString("fa-IR"))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            <JalaliCalendar
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />
            <TimeSlots
              date={selectedDate}
              slots={timeSlots}
              selectedSlot={selectedTime}
              onSelectSlot={handleSelectTime}
              onGoToNextDay={handleGoToNextDay}
            />
            {selectedTime && (
              <Button
                onClick={handleSelectContinue}
                className="w-full h-12"
              >
                ادامه
                <ChevronLeft className="h-5 w-5 mr-2" />
              </Button>
            )}
          </div>
        )}

        {step === "auth" && (
          <Card className="glass p-6">
            {authStep === "phone" && (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="skeleton h-6 w-32 mx-auto" />
                    <div className="skeleton h-4 w-48 mx-auto" />
                    <div className="skeleton h-10 w-full" />
                    <div className="skeleton h-12 w-full" />
                  </div>
                ) : (
                  <>
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
                    {authError && (
                      <p className="text-[13px] text-destructive text-center">{authError}</p>
                    )}
                    <Button
                      className="w-full"
                      onClick={handleAuthPhoneSubmit}
                      disabled={authPhone.length < 10}
                    >
                      ادامه
                    </Button>
                  </>
                )}
              </div>
            )}

            {authStep === "name" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-h1 text-foreground">نام شما</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    نام خود را برای پروفایل وارد کنید
                  </p>
                </div>
                <div>
                  <Label className="text-[13px]">نام و نام خانوادگی</Label>
                  <Input
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAuthNameSubmit()}
                    placeholder="نام خود را وارد کنید"
                    className="mt-1"
                  />
                </div>
                {authError && (
                  <p className="text-[13px] text-destructive text-center">{authError}</p>
                )}
                <Button
                  className="w-full"
                  onClick={handleAuthNameSubmit}
                  disabled={!authName.trim()}
                >
                  ادامه
                </Button>
              </div>
            )}

            {authStep === "pin" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-h1 text-foreground">ساخت رمز</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    یک کد ۴ رقمی برای ورودهای بعدی بسازید
                  </p>
                </div>
                <PinInput onComplete={handleAuthPinSubmit} disabled={isLoading} />
                {authError && (
                  <p className="text-[13px] text-destructive text-center mt-2">{authError}</p>
                )}
              </div>
            )}

            {authStep === "confirm-pin" && (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="skeleton h-6 w-28 mx-auto" />
                    <div className="skeleton h-4 w-44 mx-auto" />
                    <div className="skeleton h-12 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <h2 className="text-h1 text-foreground">تکرار رمز</h2>
                      <p className="text-[13px] text-muted-foreground mt-1">
                        رمز خود را دوباره وارد کنید
                      </p>
                    </div>
                    <PinInput onComplete={handleAuthConfirmPinSubmit} disabled={false} />
                    {authError && (
                      <p className="text-[13px] text-destructive text-center mt-2">{authError}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {authStep === "verify-pin" && (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="skeleton h-6 w-24 mx-auto" />
                    <div className="skeleton h-4 w-40 mx-auto" />
                    <div className="skeleton h-4 w-28 mx-auto" />
                    <div className="skeleton h-12 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <h2 className="text-h1 text-foreground">ورود</h2>
                      <p className="text-[13px] text-muted-foreground mt-1">
                        کد ۴ رقمی عضویت خود را وارد کنید
                      </p>
                      <p className="text-[13px] text-muted-foreground mt-1" dir="ltr">
                        {authPhone}
                      </p>
                    </div>
                    <PinInput onComplete={handleAuthVerifyPinSubmit} disabled={false} />
                    {authError && (
                      <p className="text-[13px] text-destructive text-center mt-2">{authError}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        )}

        {step === "confirm" && selectedService && selectedDate && selectedTime && (
          <div className="space-y-4">
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

            {spamError && (
              <p className="text-[13px] text-destructive text-center">{spamError}</p>
            )}

            <Button
              onClick={handleConfirmBooking}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white"
            >
              تایید و رزرو
              <ChevronLeft className="h-5 w-5 mr-2" />
            </Button>
          </div>
        )}

        {step === "receipt" && selectedService && selectedDate && selectedTime && (
          <BookingConfirm
            serviceName={selectedService.name}
            date={selectedDate}
            time={selectedTime}
            duration={totalDuration}
            price={totalPrice}
            customerName={user?.name || authName}
            bookingId={bookingId}
            phone={salon.phone}
          />
        )}
      </div>

      <CustomerNav />
    </div>
  );
}
