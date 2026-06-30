"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { JalaliCalendar } from "@/components/booking/jalali-calendar";
import { toPersianDigits } from "@/lib/jalali";
import { TimeSlots } from "@/components/booking/time-slots";
import { CustomerForm } from "@/components/booking/customer-form";
import { OtpVerify } from "@/components/booking/otp-verify";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { AddonSelect } from "@/components/booking/addon-select";
import { generateTimeSlots } from "@/lib/slots";
import { useSalon } from "@/lib/salon-context";
import type { Booking } from "@/lib/mock-data";

type BookingStep = "date" | "addon" | "time" | "info" | "otp" | "confirmed";

export default function BookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { salon, workingHours, services, addons, bookings, addBooking } = useSalon();
  const [step, setStep] = useState<BookingStep>("date");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [otpError, setOtpError] = useState<string>("");
  const [bookingId, setBookingId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const serviceId = searchParams.get("service");
    const stepParam = searchParams.get("step");
    if (serviceId) {
      setSelectedServiceId(serviceId);
      if (stepParam === "addon") {
        setStep("addon");
      }
    }
  }, [searchParams]);

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
    const dayBookings = bookings.filter(
      (b) =>
        b.date_gregorian === selectedDate.toISOString().split("T")[0] &&
        b.status === "confirmed"
    ).map((b) => ({
      start_time: b.start_time,
      end_time: b.end_time,
    }));

    return generateTimeSlots(
      workingHours,
      selectedDate,
      totalDuration,
      salon.slot_interval_minutes,
      salon.slot_buffer_minutes,
      dayBookings,
      []
    );
  }, [selectedDate, selectedService, totalDuration, workingHours, salon, bookings]);

  const bookedDates = useMemo(() => {
    return [];
  }, []);

  const handleSelectService = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = services.find((s) => s.id === serviceId);
    if (service && service.addon_ids.length > 0) {
      setStep("addon");
    } else {
      setStep("date");
    }
  };

  const handleAddonToggle = useCallback((addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  }, []);

  const handleAddonContinue = useCallback(() => {
    setStep("date");
  }, []);

  const handleAddonSkip = useCallback(() => {
    setSelectedAddons([]);
    setStep("date");
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  }, []);

  const handleSelectTime = useCallback((time: string) => {
    setSelectedTime(time);
  }, []);

  const handleCustomerSubmit = useCallback((name: string, phone: string) => {
    setCustomerName(name);
    setCustomerPhone(phone);
    setStep("otp");
  }, []);

  const handleOtpVerify = useCallback((code: string) => {
    setIsLoading(true);
    setTimeout(() => {
      if (code.length === 4 && selectedDate && selectedService) {
        const id = crypto.randomUUID();
        setBookingId(`BK-${Date.now().toString(36).toUpperCase()}`);

        const [h, m] = selectedTime!.split(":").map(Number);
        const endMinutes = h * 60 + m + totalDuration;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;

        const newBooking: Booking = {
          id,
          service_id: selectedService.id,
          selected_addons: selectedAddons,
          customer_name: customerName,
          customer_phone: customerPhone,
          date: "",
          date_gregorian: selectedDate.toISOString().split("T")[0],
          start_time: `${selectedTime}:00`,
          end_time: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`,
          status: "confirmed",
          phone_verified: true,
          created_at: new Date().toISOString(),
          service: selectedService,
        };

        addBooking(newBooking);
        setStep("confirmed");
      } else {
        setOtpError("کد تایید صحیح نیست");
      }
      setIsLoading(false);
    }, 1000);
  }, [selectedDate, selectedService, selectedTime, customerName, customerPhone, addBooking, selectedAddons, totalDuration]);

  const handleResendOtp = useCallback(() => {
    setOtpError("");
  }, []);

  const stepTitles: Record<BookingStep, string> = {
    date: "انتخاب زمان",
    addon: "آپشن‌ها",
    time: "انتخاب زمان",
    info: "اطلاعات شما",
    otp: "تایید شماره",
    confirmed: "تایید نهایی",
  };

  return (
    <div className="min-h-screen bg-warm-white">
      <Header
        showBack={step !== "confirmed"}
        title={stepTitles[step]}
        subtitle={selectedService?.name}
      />

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {selectedService && step !== "date" && step !== "addon" && step !== "confirmed" && (
          <Card className="p-3 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{selectedService.name}</span>
              <span className="text-primary font-bold">
                {toPersianDigits(totalPrice.toLocaleString("fa-IR"))} تومان
              </span>
            </div>
          </Card>
        )}

        {step === "date" && (
          <>
            {!selectedServiceId ? (
              <div className="space-y-3 animate-stagger">
                <h2 className="text-h2 text-foreground">خدمت مورد نظر</h2>
                {services.filter((s) => s.is_active).map((service) => (
                  <Card
                    key={service.id}
                    className="p-4 cursor-pointer hover:shadow-[var(--shadow-elevated)] transition-all duration-150 active:scale-[0.98]"
                    onClick={() => handleSelectService(service.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-h3">{service.name}</h3>
                        <p className="text-caption text-muted-foreground mt-1">
                          {toPersianDigits(service.duration_minutes)} دقیقه
                        </p>
                      </div>
                      <span className="text-body font-bold text-primary">
                        {toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                <JalaliCalendar
                  workingHours={workingHours}
                  bookedDates={bookedDates}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                />
                <TimeSlots
                  date={selectedDate}
                  slots={timeSlots}
                  selectedSlot={selectedTime}
                  onSelectSlot={handleSelectTime}
                />
                {selectedTime && (
                  <Button
                    onClick={() => setStep("info")}
                    className="w-full h-12"
                  >
                    ادامه
                    <ChevronLeft className="h-5 w-5 mr-2" />
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {step === "addon" && selectedService && (
          <AddonSelect
            addons={addons.filter((a) => selectedService.addon_ids.includes(a.id))}
            selectedAddons={selectedAddons}
            onToggle={handleAddonToggle}
            onContinue={handleAddonContinue}
            onSkip={handleAddonSkip}
          />
        )}

        {step === "info" && (
          <CustomerForm onSubmit={handleCustomerSubmit} isLoading={isLoading} />
        )}

        {step === "otp" && (
          <OtpVerify
            phone={customerPhone}
            onVerify={handleOtpVerify}
            onResend={handleResendOtp}
            isLoading={isLoading}
            error={otpError}
          />
        )}

        {step === "confirmed" && selectedService && selectedDate && selectedTime && (
          <BookingConfirm
            serviceName={selectedService.name}
            date={selectedDate}
            time={selectedTime}
            duration={totalDuration}
            price={totalPrice}
            customerName={customerName}
            bookingId={bookingId}
            phone={salon.phone}
          />
        )}
      </div>
    </div>
  );
}
