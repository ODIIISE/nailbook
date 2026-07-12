"use client";

import { ScheduleManager } from "@/components/owner/schedule-manager";
import { useSalon } from "@/lib/salon-context";
import { SalonGuard } from "@/components/ui/salon-guard";
import { toast } from "sonner";

export default function OwnerSchedulePage() {
  const { salon, workingHours, specificDaysOff, saveSchedule, updateSalon } = useSalon();

  const handleSave = async (hours: typeof workingHours, daysOff: string[], extra: { early_extra_hours: number; late_extra_hours: number; expand_threshold: number; proximity_window_hours: number; allow_overflow: boolean; overflow_minutes: number; slot_interval_minutes: number; slot_buffer_minutes: number }) => {
    try {
      await Promise.all([
        saveSchedule(hours, daysOff),
        updateSalon(extra),
      ]);
      toast.success("ساعات کاری ذخیره شد");
    } catch {
      toast.error("خطا در ذخیره ساعات کاری");
    }
  };

  return (
    <SalonGuard>
      <div className="px-4 py-4 space-y-4">
        <ScheduleManager
          workingHours={workingHours}
          specificDaysOff={specificDaysOff}
          earlyExtraHours={salon.early_extra_hours ?? 0}
          lateExtraHours={salon.late_extra_hours ?? 0}
          expandThreshold={salon.expand_threshold ?? 80}
          proximityWindowHours={salon.proximity_window_hours ?? 2}
          allowOverflow={salon.allow_overflow ?? false}
          overflowMinutes={salon.overflow_minutes ?? 0}
          slotIntervalMinutes={salon.slot_interval_minutes ?? 15}
          slotBufferMinutes={salon.slot_buffer_minutes ?? 0}
          onSave={handleSave}
        />
      </div>
    </SalonGuard>
  );
}
