"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { normalizeDigits } from "@/lib/digits";
import { toPersianDigits } from "@/lib/jalali";
import { getIranWeekDay } from "@/lib/slots";
import type { Service } from "@/lib/types";
import type { WorkingHours } from "@/lib/slots";

interface ManualReserveModalProps {
  date: Date;
  services: Service[];
  workingHours: WorkingHours;
  onReserve: (data: {
    customer_name: string;
    customer_phone: string;
    service_id: string;
    start_time: string;
    end_time: string;
  }) => void;
  onClose: () => void;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const match = /^(\d{2}):(\d{2})$/.exec(startTime);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return "";
  const endMinutes = hours * 60 + minutes + Math.max(0, Number(durationMinutes) || 0);
  if (endMinutes >= 24 * 60) return "";
  return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
}

export function ManualReserveModal({
  date,
  services,
  workingHours,
  onReserve,
  onClose,
}: ManualReserveModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(() => services.find((service) => service.is_active)?.id || "");

  const selectedService = services.find((s) => s.id === serviceId && s.is_active);

  // Derive default start time from working hours
  const defaultStartTime = useMemo(() => {
    const dayKey = getIranWeekDay(date);
    const dayHours = workingHours[dayKey];
    return dayHours?.open || "09:00";
  }, [date, workingHours]);

  const [startTime, setStartTime] = useState(defaultStartTime);

  // Auto-calculate end time from start time + service duration
  const [endTime, setEndTime] = useState(() =>
    selectedService ? calculateEndTime(startTime, selectedService.duration_minutes) : ""
  );

  // Update end time when service or start time changes
  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const svc = services.find((s) => s.id === id && s.is_active);
    if (svc) {
      setEndTime(calculateEndTime(startTime, svc.duration_minutes));
    }
  };

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    if (selectedService) {
      setEndTime(calculateEndTime(time, selectedService.duration_minutes));
    }
  };

  const isValid = Boolean(
    phone && selectedService &&
    /^(09|۰۹)[۰-۹0-9]{9}$/.test(normalizeDigits(phone)) &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime) &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(endTime) &&
    endTime > startTime
  );

  const handleSubmit = () => {
    if (!isValid) return;
    onReserve({
      customer_name: name,
      customer_phone: normalizeDigits(phone),
      service_id: serviceId,
      start_time: startTime,
      end_time: endTime,
    });
  };

  return (
    <BottomSheet open={true} onClose={onClose} title="رزرو دستی">
      <div className="space-y-4">
        <div>
          <Label className="text-[13px]">نام مشتری</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام (اختیاری)"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-[13px]">شماره موبایل</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            dir="ltr"
            className="mt-1 text-left"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            اگر شماره جدید باشد، کاربر خودکار ساخته می‌شود
          </p>
        </div>

        <div>
          <Label className="text-[13px]">خدمت</Label>
          <Select value={serviceId} onValueChange={(val) => handleServiceChange(val as string)}>
            <SelectTrigger className="mt-1 w-full h-12 rounded-xl border border-border bg-card px-3 text-[15px]" dir="rtl">
              <SelectValue placeholder="خدمت را انتخاب کنید" />
            </SelectTrigger>
            <SelectContent>
              {services.filter((s) => s.is_active).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} - {toPersianDigits(s.duration_minutes)} دقیقه
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[13px]">از ساعت</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="mt-1 text-center"
              dir="ltr"
            />
          </div>
          <div>
            <Label className="text-[13px]">تا ساعت</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 text-center"
              dir="ltr"
            />
          </div>
        </div>

        {endTime && startTime && endTime <= startTime && (
          <p className="text-[12px] text-destructive text-center">ساعت پایان باید بعد از ساعت شروع باشد</p>
        )}
      </div>

      <div className="flex gap-3 mt-5">
        <Button onClick={handleSubmit} className="flex-1" disabled={!isValid}>
          ثبت رزرو
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">
          انصراف
        </Button>
      </div>
    </BottomSheet>
  );
}
