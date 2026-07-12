"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Copy, HelpCircle } from "lucide-react";
import {
  toPersianDigits,
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliMonthDays,
  getJalaliMonthName,
  JS_TO_IRAN_DAY,
} from "@/lib/jalali";
import type { WorkingHours } from "@/lib/slots";
import { getTehranDateKey } from "@/lib/time";

interface ScheduleManagerProps {
  workingHours: WorkingHours;
  specificDaysOff: string[];
  earlyExtraHours: number;
  lateExtraHours: number;
  expandThreshold: number;
  proximityWindowHours: number;
  allowOverflow: boolean;
  onSave: (hours: WorkingHours, daysOff: string[], extra: { early_extra_hours: number; late_extra_hours: number; expand_threshold: number; proximity_window_hours: number; allow_overflow: boolean }) => void;
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
  earlyExtraHours: initialEarly,
  lateExtraHours: initialLate,
  expandThreshold: initialThreshold,
  proximityWindowHours: initialProximity,
  allowOverflow: initialOverflow,
  onSave,
}: ScheduleManagerProps) {
  const [hours, setHours] = useState<WorkingHours>({ ...workingHours });
  const [daysOff, setDaysOff] = useState<string[]>([...specificDaysOff]);
  const [earlyExtraHours, setEarlyExtraHours] = useState(initialEarly);
  const [lateExtraHours, setLateExtraHours] = useState(initialLate);
  const [expandThreshold, setExpandThreshold] = useState(initialThreshold);
  const [proximityWindowHours, setProximityWindowHours] = useState(initialProximity);
  const [allowOverflow, setAllowOverflow] = useState(initialOverflow);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync when parent data changes (e.g., after DB load)
  useEffect(() => {
    setHours({ ...workingHours });
    setDaysOff([...specificDaysOff]);
    setEarlyExtraHours(initialEarly);
    setLateExtraHours(initialLate);
    setExpandThreshold(initialThreshold);
    setProximityWindowHours(initialProximity);
    setAllowOverflow(initialOverflow);
    setHasChanges(false);
  }, [workingHours, specificDaysOff, initialEarly, initialLate, initialThreshold, initialProximity, initialOverflow]);

  const toggleDay = (key: string) => {
    const current = hours[key];
    const newHours = { ...hours };
    if (current === null) {
      // Find the most common open/close times from other active days as default
      const activeDays = Object.values(hours).filter((h): h is { open: string; close: string } => h !== null);
      if (activeDays.length > 0) {
        const mostFrequentOpen = activeDays.reduce((acc, h) => {
          acc[h.open] = (acc[h.open] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const mostFrequentClose = activeDays.reduce((acc, h) => {
          acc[h.close] = (acc[h.close] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const defaultOpen = Object.entries(mostFrequentOpen).sort((a, b) => b[1] - a[1])[0]?.[0] || "09:00";
        const defaultClose = Object.entries(mostFrequentClose).sort((a, b) => b[1] - a[1])[0]?.[0] || "17:00";
        newHours[key] = { open: defaultOpen, close: defaultClose };
      } else {
        newHours[key] = { open: "09:00", close: "17:00" };
      }
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
    onSave(hours, daysOff, {
      early_extra_hours: earlyExtraHours,
      late_extra_hours: lateExtraHours,
      expand_threshold: expandThreshold,
      proximity_window_hours: proximityWindowHours,
      allow_overflow: allowOverflow,
    });
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

      {/* Extra Hours Configuration */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-1">ساعت اضافی</h3>
        <p className="text-xs text-muted-foreground mb-4">
          باز شدن خودکار ساعت‌های بیشتر وقتی رزروها پر شود
        </p>
        <div className="space-y-4">
          {/* Threshold */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-[13px] font-medium">آستانه فعال‌سازی</Label>
              <div className="group relative">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-xl bg-foreground text-background text-[11px] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-elevated">
                  وقتی درصد رزروهای یک روز از این عدد بیشتر شود، ساعت‌های اضافی باز می‌شوند.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={100}
                value={expandThreshold}
                onChange={(e) => { setExpandThreshold(Number(e.target.value)); setHasChanges(true); }}
                className="w-20 text-center text-sm"
                dir="ltr"
              />
              <span className="text-[12px] text-muted-foreground">٪</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              وقتی <span className="font-medium text-foreground/70">{toPersianDigits(expandThreshold)}٪</span> روز پر شود، ساعت‌های اضافی قبل و بعد فعال می‌شوند
            </p>
          </div>

          <div className="border-t border-border/30" />

          {/* Early / Late hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium">ساعات قبل از شروع</Label>
              <Input
                type="number"
                min={0}
                max={4}
                value={earlyExtraHours}
                onChange={(e) => { setEarlyExtraHours(Number(e.target.value)); setHasChanges(true); }}
                className="text-center text-sm"
                dir="ltr"
              />
              <p className="text-[11px] text-muted-foreground/70">
                مثلاً اگر کار ۱۰ شروع شود و این عدد ۲ باشد، از ۸ باز می‌شود
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium">ساعات بعد از پایان</Label>
              <Input
                type="number"
                min={0}
                max={4}
                value={lateExtraHours}
                onChange={(e) => { setLateExtraHours(Number(e.target.value)); setHasChanges(true); }}
                className="text-center text-sm"
                dir="ltr"
              />
              <p className="text-[11px] text-muted-foreground/70">
                مثلاً اگر کار ۱۸ تمام شود و این عدد ۱ باشد، تا ۱۹ باز می‌شود
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Proximity & Overflow Settings */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-1">تنظیمات هوشمند</h3>
        <p className="text-xs text-muted-foreground mb-4">
          هوشمندسازی نمایش ساعت‌ها برای مشتریان
        </p>
        <div className="space-y-5">
          {/* Proximity Window */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-[13px] font-medium">فاصله نزدیکی</Label>
              <div className="group relative">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-xl bg-foreground text-background text-[11px] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-elevated">
                  وقتی مشتری ساعت ۱۰ را رزرو می‌کند، ساعت‌های بعدی فقط در بازه ±۲ ساعت از ۱۰ نمایش داده می‌شوند.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={8}
                value={proximityWindowHours}
                onChange={(e) => { setProximityWindowHours(Number(e.target.value)); setHasChanges(true); }}
                className="w-20 text-center text-sm"
                dir="ltr"
              />
              <span className="text-[12px] text-muted-foreground">ساعت</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              ساعت‌های پیشنهادی در فاصله <span className="font-medium text-foreground/70">±{toPersianDigits(proximityWindowHours)} ساعت</span> از رزرو قبلی نمایش داده می‌شوند
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border/30" />

          {/* Overflow Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-[13px] font-medium">تمدید ساعت کاری</Label>
                <div className="group relative">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-xl bg-foreground text-background text-[11px] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-elevated">
                    اگر فعال شود، رزروها می‌توانند از ساعت پایان کاری فراتر بروند (حداکثر تا ساعت اضافی).
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                  </div>
                </div>
              </div>
              <Switch
                checked={allowOverflow}
                onCheckedChange={(v) => { setAllowOverflow(v); setHasChanges(true); }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              {allowOverflow
                ? "رزروها می‌توانند تا ساعت اضافی بعد از پایان کار ادامه داشته باشند"
                : "رزروها باید قبل از ساعت پایان کار تمام شوند"
              }
            </p>
          </div>
        </div>
      </Card>

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
