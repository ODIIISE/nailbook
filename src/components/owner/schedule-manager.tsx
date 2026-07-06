"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Copy } from "lucide-react";
import {
  toPersianDigits,
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliMonthDays,
  getJalaliMonthName,
} from "@/lib/jalali";
import type { WorkingHours } from "@/lib/slots";
import { getTehranDateKey } from "@/lib/time";

interface ScheduleManagerProps {
  workingHours: WorkingHours;
  specificDaysOff: string[];
  onSave: (hours: WorkingHours, daysOff: string[]) => void;
}

const IRAN_WEEK_DAYS = [
  { key: "sat", label: "شنبه" },
  { key: "sun", label: "یکشنبه" },
  { key: "mon", label: "دوشنبه" },
  { key: "tue", label: "سه‌شنبه" },
  { key: "wed", label: "چهارشنبه" },
  { key: "thu", label: "پنجشنبه" },
  { key: "fri", label: "جمعه" },
];

const PERSIAN_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const JS_TO_IRAN_DAY = [1, 2, 3, 4, 5, 6, 0];

function JalaliMonthGrid({
  year,
  month,
  daysOff,
  onToggleDayOff,
}: {
  year: number;
  month: number;
  daysOff: string[];
  onToggleDayOff: (dateStr: string) => void;
}) {
  const daysInMonth = getJalaliMonthDays(year, month);
  const firstDayDate = jalaliToGregorian(year, month, 1);
  const firstDayJs = firstDayDate.getDay();
  const iranFirstDay = JS_TO_IRAN_DAY[firstDayJs];

  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-foreground mb-2">
        {getJalaliMonthName(month)} {toPersianDigits(year)}
      </p>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {PERSIAN_WEEKDAYS_SHORT.map((day) => (
          <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: iranFirstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const date = jalaliToGregorian(year, month, d);
          const dateStr = getTehranDateKey(date);
          const isOff = daysOff.includes(dateStr);
          const isToday =
            date.toDateString() === new Date().toDateString();

          return (
            <button
              key={d}
              onClick={() => onToggleDayOff(dateStr)}
              className={`
                h-8 rounded-lg text-xs font-medium transition-all
                ${isOff
                  ? "bg-destructive text-white"
                  : isToday
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "bg-secondary hover:bg-primary/10 text-foreground"
                }
              `}
            >
              {toPersianDigits(d)}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function ScheduleManager({
  workingHours,
  specificDaysOff,
  onSave,
}: ScheduleManagerProps) {
  const [hours, setHours] = useState<WorkingHours>({ ...workingHours });
  const [daysOff, setDaysOff] = useState<string[]>([...specificDaysOff]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync when parent data changes (e.g., after DB load)
  useEffect(() => {
    setHours({ ...workingHours });
    setDaysOff([...specificDaysOff]);
    setHasChanges(false);
  }, [workingHours, specificDaysOff]);

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
    setHours({ ...hours, [key]: { ...current, [field]: value } });
    setHasChanges(true);
  };

  const applyToAll = (sourceKey: string) => {
    const source = hours[sourceKey];
    if (!source) return;
    const newHours: WorkingHours = {};
    for (const day of IRAN_WEEK_DAYS) {
      newHours[day.key] = hours[day.key] !== null ? { ...source } : null;
    }
    setHours(newHours);
    setHasChanges(true);
  };

  const toggleSpecificDayOff = (dateStr: string) => {
    setDaysOff((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(hours, daysOff);
    setHasChanges(false);
  };

  const now = new Date();
  const jalali = gregorianToJalali(now);
  const currentMonth = jalali.jm;
  const currentYear = jalali.jy;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">ساعات کاری</h3>
          <p className="text-xs text-muted-foreground mt-1">
            روزهای فعال را تنظیم کنید
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={!hasChanges} className="bg-primary text-white">
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
                  <Switch checked={isActive} onCheckedChange={() => toggleDay(day.key)} />
                  <span className="font-medium text-foreground">{day.label}</span>
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
                      onChange={(e) => updateTime(day.key, "open", e.target.value)}
                      className="mt-1 text-center"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">پایان</Label>
                    <Input
                      type="time"
                      value={dayHours.close}
                      onChange={(e) => updateTime(day.key, "close", e.target.value)}
                      className="mt-1 text-center"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div>
        <h3 className="font-semibold text-foreground mb-1">روزهای تعطیل</h3>
        <p className="text-xs text-muted-foreground mb-3">
          روی روزها کلیک کنید تا تعطیل شوند
        </p>

        <div className="space-y-4">
          <JalaliMonthGrid
            year={currentYear}
            month={currentMonth}
            daysOff={daysOff}
            onToggleDayOff={toggleSpecificDayOff}
          />
          <JalaliMonthGrid
            year={nextYear}
            month={nextMonth}
            daysOff={daysOff}
            onToggleDayOff={toggleSpecificDayOff}
          />
        </div>

        {daysOff.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">
              {toPersianDigits(daysOff.length)} روز تعطیل انتخاب شده
            </p>
            <div className="flex flex-wrap gap-1">
              {daysOff.sort().slice(0, 10).map((d) => (
                <button
                  key={d}
                  onClick={() => toggleSpecificDayOff(d)}
                  className="px-2 py-0.5 rounded text-[10px] bg-destructive/10 text-destructive hover:bg-destructive/20"
                >
                  {d} ×
                </button>
              ))}
              {daysOff.length > 10 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{toPersianDigits(daysOff.length - 10)} مورد دیگر
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
