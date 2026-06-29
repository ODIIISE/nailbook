"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { JalaliCalendar } from "@/components/booking/jalali-calendar";
import { TimeSlots } from "@/components/booking/time-slots";
import { CustomerForm } from "@/components/booking/customer-form";
import { OtpVerify } from "@/components/booking/otp-verify";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { generateTimeSlots } from "@/lib/slots";
import { useSalon } from "@/lib/salon-context";
import type { Booking } from "@/lib/mock-data";

type BookingStep = "date" | "time" | "info" | "otp" | "confirmed";

export default function BookPage() {
  const router = useRouter();
  const { salon, workingHours, services, bookings, addBooking } = useSalon();
  const [step, setStep] = useState<BookingStep>("date");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [otpError, setOtpError] = useState<string>("");
  const [bookingId, setBookingId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedService = services.find((s) => s.id === selectedServiceId);

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
      selectedService.duration_minutes,
      salon.slot_interval_minutes,
      salon.slot_buffer_minutes,
      dayBookings,
      []
    );
  }, [selectedDate, selectedService, workingHours, salon]);

  const bookedDates = useMemo(() => {
    return [...new Set(bookings.filter((b) => b.status === "confirmed").map((b) => b.date_gregorian))];
  }, [bookings]);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setStep("time");
  }, []);

  const handleSelectTime = useCallback((time: string) => {
    setSelectedTime(time);
    setStep("info");
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
        const id = `BK-${Date.now().toString(36).toUpperCase()}`;
        setBookingId(id);

        const [h, m] = selectedTime!.split(":").map(Number);
        const endMinutes = h * 60 + m + selectedService.duration_minutes;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;

        const newBooking: Booking = {
          id,
          service_id: selectedService.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          date: "",
          date_gregorian: selectedDate.toISOString().split("T")[0],
          start_time: selectedTime!,
          end_time: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
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
  }, [selectedDate, selectedService, selectedTime, customerName, customerPhone, addBooking]);

  const handleResendOtp = useCallback(() => {
    setOtpError("");
  }, []);

  const stepTitles: Record<BookingStep, string> = {
    date: "انتخاب تاریخ",
    time: "انتخاب ساعت",
    info: "اطلاعات شما",
    otp: "تایید شماره",
    confirmed: "تایید نهایی",
  };

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="sticky top-0 z-10 bg-warm-white/95 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center gap-3">
            {step !== "date" && step !== "confirmed" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const steps: BookingStep[] = ["date", "time", "info", "otp"];
                  const idx = steps.indexOf(step);
                  if (idx > 0) setStep(steps[idx - 1]);
                  else router.push("/");
                }}
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            )}
            {step === "confirmed" ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            ) : null}
            <div>
              <h1 className="font-semibold text-foreground">
                {stepTitles[step]}
              </h1>
              {selectedService && (
                <p className="text-xs text-muted-foreground">
                  {selectedService.name}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {selectedService && step !== "date" && step !== "confirmed" && (
          <Card className="p-3 bg-rose/5 border-rose/20">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{selectedService.name}</span>
              <span className="text-rose font-bold">
                {selectedService.price.toLocaleString("fa-IR")} تومان
              </span>
            </div>
          </Card>
        )}

        {step === "date" && (
          <>
            {!selectedServiceId ? (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">خدمت مورد نظر</h2>
                {services.filter((s) => s.is_active).map((service) => (
                  <Card
                    key={service.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setSelectedServiceId(service.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {service.duration_minutes} دقیقه
                        </p>
                      </div>
                      <span className="font-bold text-rose">
                        {service.price.toLocaleString("fa-IR")} تومان
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <JalaliCalendar
                workingHours={workingHours}
                bookedDates={bookedDates}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
              />
            )}
          </>
        )}

        {step === "time" && selectedDate && (
          <TimeSlots
            date={selectedDate}
            slots={timeSlots}
            selectedSlot={selectedTime}
            onSelectSlot={handleSelectTime}
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
            duration={selectedService.duration_minutes}
            price={selectedService.price}
            customerName={customerName}
            bookingId={bookingId}
          />
        )}
      </div>
    </div>
  );
}
