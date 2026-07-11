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

  // Derive default times from working hours
  const defaultTimes = useMemo(() => {
    const dayKey = getIranWeekDay(date);
    const dayHours = workingHours[dayKey];
    if (dayHours) {
      const service = services[0];
      const duration = service ? service.duration_minutes : 60;
      const [h, m] = dayHours.open.split(":").map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + duration;
      const endH = Math.floor(endMin / 60);
      const endM = endMin % 60;
      return {
        start: dayHours.open,
        end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
      };
    }
    return { start: "09:00", end: "10:00" };
  }, [date, workingHours, services]);

  const [startTime, setStartTime] = useState(defaultTimes.start);
  const [endTime, setEndTime] = useState(defaultTimes.end);

  const selectedService = services.find((s) => s.id === serviceId);

  const handleSubmit = () => {
    if (!name || !phone || !serviceId || !startTime || !endTime) return;
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
            placeholder="نام و نام خانوادگی"
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
        </div>

        <div>
          <Label className="text-[13px]">خدمت</Label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
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
              onChange={(e) => setStartTime(e.target.value)}
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
      </div>

      <div className="flex gap-3 mt-5">
        <Button onClick={handleSubmit} className="flex-1">
          ثبت رزرو
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">
          انصراف
        </Button>
      </div>
    </BottomSheet>
  );
}
