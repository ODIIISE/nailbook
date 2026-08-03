"use client";

import { ScheduleManager } from "@/components/owner/schedule-manager";
import { useSalon } from "@/lib/salon-context";
import { SalonGuard } from "@/components/ui/salon-guard";
import { toast } from "sonner";

export default function OwnerSchedulePage() {
  const { salon, workingHours, specificDaysOff, updateSalon } = useSalon();

  const handleSave = async (hours: typeof workingHours, daysOff: string[], extra: { early_extra_hours: number; late_extra_hours: number; expand_threshold: number; proximity_window_hours: number; allow_overflow: boolean; overflow_minutes: number; slot_interval_minutes: number; slot_buffer_minutes: number; optimization_mode: "hybrid" | "legacy"; suggestion_limit: number; min_useful_gap_minutes: number }) => {
    try {
      // Send schedule and optimizer settings together so the API transaction
      // cannot leave working hours and slot behavior out of sync.
      await updateSalon({
        ...extra,
        working_hours: hours,
        specific_days_off: daysOff,
      });
      toast.success("ساعات کاری ذخیره شد");
    } catch (error) {
      toast.error("خطا در ذخیره ساعات کاری");
      throw error;
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
          optimizationMode={salon.optimization_mode ?? "hybrid"}
          suggestionLimit={salon.suggestion_limit ?? 3}
          minUsefulGapMinutes={salon.min_useful_gap_minutes ?? 30}
          onSave={handleSave}
        />
      </div>
    </SalonGuard>
  );
}
