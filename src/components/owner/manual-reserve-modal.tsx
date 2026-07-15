"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
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

export function ManualReserveModal({
  date,
  services,
  workingHours,
  onReserve,
  onClose,
}: ManualReserveModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id || "");

  const selectedService = services.find((s) => s.id === serviceId);

  // Derive default start time from working hours
  const defaultStartTime = useMemo(() => {
    const dayKey = getIranWeekDay(date);
    const dayHours = workingHours[dayKey];
    return dayHours?.open || "09:00";
  }, [date, workingHours]);

  const [startTime, setStartTime] = useState(defaultStartTime);

  // Auto-calculate end time from start time + service duration
  const computedEndTime = useMemo(() => {
    if (!selectedService) return startTime;
    const [h, m] = startTime.split(":").map(Number);
    const startMin = h * 60 + m + selectedService.duration_minutes;
    const endH = Math.floor(startMin / 60);
    const endM = startMin % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }, [startTime, selectedService]);

  const [endTime, setEndTime] = useState(computedEndTime);

  // Update end time when service or start time changes
  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      const [h, m] = startTime.split(":").map(Number);
      const startMin = h * 60 + m + svc.duration_minutes;
      const endH = Math.floor(startMin / 60);
      const endM = startMin % 60;
      setEndTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
    }
  };

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    if (selectedService) {
      const [h, m] = time.split(":").map(Number);
      const startMin = h * 60 + m + selectedService.duration_minutes;
      const endH = Math.floor(startMin / 60);
      const endM = startMin % 60;
      setEndTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
    }
  };

  const isValid = phone && serviceId && startTime && endTime && endTime > startTime;

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
          <select
            value={serviceId}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="mt-1 w-full h-12 rounded-2xl glass px-3 text-[15px] appearance-none cursor-pointer"
            dir="rtl"
          >
            {services.filter((s) => s.is_active).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} - {toPersianDigits(s.duration_minutes)} دقیقه
              </option>
            ))}
          </select>
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

        {endTime <= startTime && (
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
