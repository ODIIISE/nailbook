"use client";

import { ScheduleManager } from "@/components/owner/schedule-manager";
import { useSalon } from "@/lib/salon-context";
import { SalonGuard } from "@/components/ui/salon-guard";
import { toast } from "sonner";

export default function OwnerSchedulePage() {
  const { salon, workingHours, specificDaysOff, saveSchedule, updateSalon } = useSalon();

  const handleSave = async (hours: typeof workingHours, daysOff: string[], extra: { early_extra_hours: number; late_extra_hours: number; expand_threshold: number }) => {
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
      <div className="px-4 py-4">
        <ScheduleManager
          workingHours={workingHours}
          specificDaysOff={specificDaysOff}
          earlyExtraHours={salon.early_extra_hours ?? 0}
          lateExtraHours={salon.late_extra_hours ?? 0}
          expandThreshold={salon.expand_threshold ?? 80}
          onSave={handleSave}
        />
      </div>
    </SalonGuard>
  );
}
