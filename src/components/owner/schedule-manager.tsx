"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Save, Copy } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { WorkingHours } from "@/lib/slots";

const IRAN_WEEK_DAYS = [
  { key: "sat", label: "شنبه" },
  { key: "sun", label: "یکشنبه" },
  { key: "mon", label: "دوشنبه" },
  { key: "tue", label: "سه‌شنبه" },
  { key: "wed", label: "چهارشنبه" },
  { key: "thu", label: "پنجشنبه" },
  { key: "fri", label: "جمعه" },
];

interface ScheduleManagerProps {
  workingHours: WorkingHours;
  specificDaysOff: string[];
  onSave: (hours: WorkingHours, daysOff: string[]) => void;
}

export function ScheduleManager({
  workingHours,
  specificDaysOff,
  onSave,
}: ScheduleManagerProps) {
  const [hours, setHours] = useState<WorkingHours>({ ...workingHours });
  const [daysOff, setDaysOff] = useState<string[]>([...specificDaysOff]);
  const [hasChanges, setHasChanges] = useState(false);

  const toggleDay = (key: string) => {
    const current = hours[key];
    const newHours = { ...hours };

    if (current === null) {
      newHours[key] = { open: "10:00", close: "18:00" };
    } else {
      newHours[key] = null;
    }

    setHours(newHours);
    setHasChanges(true);
  };

  const updateTime = (key: string, field: "open" | "close", value: string) => {
    const current = hours[key];
    if (!current) return;

    const newHours = {
      ...hours,
      [key]: { ...current, [field]: value },
    };
    setHours(newHours);
    setHasChanges(true);
  };

  const applyToAll = (sourceKey: string) => {
    const source = hours[sourceKey];
    if (!source) return;

    const newHours: WorkingHours = {};
    for (const day of IRAN_WEEK_DAYS) {
      if (hours[day.key] !== null) {
        newHours[day.key] = { ...source };
      } else {
        newHours[day.key] = null;
      }
    }
    setHours(newHours);
    setHasChanges(true);
  };

  const toggleSpecificDayOff = (dateStr: string) => {
    setDaysOff((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(hours, daysOff);
    setHasChanges(false);
  };

  const getJalaliDatesForMonth = (monthOffset: number = 0) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + monthOffset;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates: Array<{ date: Date; dateStr: string; label: string }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().split("T")[0];
      const day = date.getDate();
      const monthNames = [
        "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
        "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
      ];
      dates.push({
        date,
        dateStr,
        label: `${toPersianDigits(day)} ${monthNames[month]}`,
      });
    }
    return dates;
  };

  const currentMonthDates = getJalaliDatesForMonth(0);
  const nextMonthDates = getJalaliDatesForMonth(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">ساعات کاری</h3>
          <p className="text-xs text-muted-foreground mt-1">
            روزهای فعال را تنظیم کنید
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges}
          className="bg-navy hover:bg-navy/90 text-white rounded-xl"
        >
          <Save className="h-4 w-4 ml-1" />
          ذخیره
        </Button>
      </div>

      <div className="space-y-3">
        {IRAN_WEEK_DAYS.map((day) => {
          const dayHours = hours[day.key];
          const isActive = dayHours !== null;

          return (
            <Card key={day.key} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleDay(day.key)}
                  />
                  <span className="font-medium text-foreground">
                    {day.label}
                  </span>
                </div>
                {isActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyToAll(day.key)}
                    className="text-xs text-muted-foreground"
                  >
                    <Copy className="h-3 w-3 ml-1" />
                    اعمال به همه
                  </Button>
                )}
              </div>

              {isActive && dayHours && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">شروع</Label>
                    <Input
                      type="time"
                      value={dayHours.open}
                      onChange={(e) =>
                        updateTime(day.key, "open", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">پایان</Label>
                    <Input
                      type="time"
                      value={dayHours.close}
                      onChange={(e) =>
                        updateTime(day.key, "close", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div>
        <h3 className="font-semibold text-foreground mb-1">روزهای تعطیل خاص</h3>
        <p className="text-xs text-muted-foreground mb-3">
          تاریخ‌های خاصی را به عنوان روز تعطیل انتخاب کنید
        </p>

        <Card className="p-4">
          <p className="text-sm font-medium text-foreground mb-2">ماه جاری</p>
          <div className="grid grid-cols-7 gap-1">
            {currentMonthDates.map((d) => {
              const isOff = daysOff.includes(d.dateStr);
              return (
                <button
                  key={d.dateStr}
                  onClick={() => toggleSpecificDayOff(d.dateStr)}
                  className={`
                    h-8 rounded text-xs font-medium transition-all
                    ${isOff
                      ? "bg-destructive text-white"
                      : "bg-secondary hover:bg-rose/10 text-foreground"
                    }
                  `}
                >
                  {toPersianDigits(d.date.getDate())}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              روز تعطیل
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-secondary" />
              روز کاری
            </div>
          </div>
        </Card>

        <Card className="p-4 mt-3">
          <p className="text-sm font-medium text-foreground mb-2">ماه آینده</p>
          <div className="grid grid-cols-7 gap-1">
            {nextMonthDates.map((d) => {
              const isOff = daysOff.includes(d.dateStr);
              return (
                <button
                  key={d.dateStr}
                  onClick={() => toggleSpecificDayOff(d.dateStr)}
                  className={`
                    h-8 rounded text-xs font-medium transition-all
                    ${isOff
                      ? "bg-destructive text-white"
                      : "bg-secondary hover:bg-rose/10 text-foreground"
                    }
                  `}
                >
                  {toPersianDigits(d.date.getDate())}
                </button>
              );
            })}
          </div>
        </Card>

        {daysOff.length > 0 && (
          <Card className="p-4 mt-3">
            <p className="text-sm font-medium text-foreground mb-2">
              روزهای تعطیل انتخاب شده ({toPersianDigits(daysOff.length)})
            </p>
            <div className="flex flex-wrap gap-2">
              {daysOff.sort().map((d) => (
                <Badge
                  key={d}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive/10"
                  onClick={() => toggleSpecificDayOff(d)}
                >
                  {d} ×
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
