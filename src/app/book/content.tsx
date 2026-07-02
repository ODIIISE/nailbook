"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CustomerNav } from "@/components/layout/customer-nav";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { JalaliCalendar } from "@/components/booking/jalali-calendar";
import { TimeSlots } from "@/components/booking/time-slots";
import { CustomerForm } from "@/components/booking/customer-form";
import { AuthFlow } from "@/components/booking/auth-flow";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { AddonSelect } from "@/components/booking/addon-select";
import { generateTimeSlots } from "@/lib/slots";
import { useSalon } from "@/lib/salon-context";
import { useAuth } from "@/lib/auth-context";
import type { Booking } from "@/lib/mock-data";

type BookingStep = "addon" | "date" | "info" | "pin" | "receipt";

export default function BookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { salon, workingHours, services, addons, bookings, blockedTimes, addBooking } = useSalon();
  const { user } = useAuth();
  const [step, setStep] = useState<BookingStep>("addon");
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
  const [bookingId, setBookingId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const serviceId = searchParams.get("service");
    if (serviceId) {
      setSelectedServiceId(serviceId);
      const service = services.find((s) => s.id === serviceId);
      if (service && service.addon_ids.length > 0) {
        setStep("addon");
      } else {
        setStep("date");
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
    const dateStr = selectedDate.toISOString().split("T")[0];
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

  const handleAddonContinue = useCallback(() => {
    setStep("date");
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

  const handleDateContinue = useCallback(() => {
    if (user) {
      setCustomerName(user.name);
      setCustomerPhone(user.phone);
      handleCreateBooking();
    } else {
      setStep("info");
    }
  }, [user]);

  const handleCustomerSubmit = useCallback(async (name: string, phone: string) => {
    setCustomerName(name);
    setCustomerPhone(phone);
    setStep("pin");
  }, []);

  const handlePinComplete = useCallback(() => {
    handleCreateBooking();
  }, []);

  const handleCreateBooking = useCallback(() => {
    if (selectedDate && selectedService && selectedTime) {
      const id = crypto.randomUUID();
      setBookingId(`BK-${Date.now().toString(36).toUpperCase()}`);

      const [h, m] = selectedTime.split(":").map(Number);
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
        paid: false,
        created_at: new Date().toISOString(),
        service: selectedService,
      };

      addBooking(newBooking);
      setStep("receipt");
    }
  }, [selectedDate, selectedService, selectedTime, customerName, customerPhone, addBooking, selectedAddons, totalDuration]);

  const stepTitles: Record<BookingStep, string> = {
    addon: "آپشن‌ها",
    date: "انتخاب زمان",
    info: "اطلاعات شما",
    pin: "ساخت رمز",
    receipt: "تایید نهایی",
  };

  const goBack = () => {
    const steps: BookingStep[] = ["addon", "date", "info", "pin"];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
    else router.push("/services");
  };

  return (
    <div className="min-h-screen">
      <Header
        showBack={step !== "receipt"}
        title={stepTitles[step]}
        subtitle={selectedService?.name}
        onBack={step !== "receipt" ? goBack : undefined}
      />

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {step === "addon" && selectedService && (
          <AddonSelect
            addons={addons.filter((a) => selectedService.addon_ids.includes(a.id))}
            selectedAddons={selectedAddons}
            onToggle={handleAddonToggle}
            onContinue={handleAddonContinue}
          />
        )}

        {step === "date" && (
          <div className="space-y-5">
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
                onClick={handleDateContinue}
                className="w-full h-12"
              >
                وارد کردن اطلاعات
                <ChevronLeft className="h-5 w-5 mr-2" />
              </Button>
            )}
          </div>
        )}

        {step === "info" && (
          <CustomerForm onSubmit={handleCustomerSubmit} isLoading={isLoading} />
        )}

        {step === "pin" && (
          <AuthFlow onComplete={handlePinComplete} />
        )}

        {step === "receipt" && selectedService && selectedDate && selectedTime && (
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

      <CustomerNav />
    </div>
  );
}
