"use client";

import { ScheduleManager } from "@/components/owner/schedule-manager";
import { useSalon } from "@/lib/salon-context";
import { SalonGuard } from "@/components/ui/salon-guard";
import { toast } from "sonner";

export default function OwnerSchedulePage() {
  const { workingHours, specificDaysOff, saveSchedule } = useSalon();

  const handleSave = async (hours: typeof workingHours, daysOff: string[]) => {
    try {
      await saveSchedule(hours, daysOff);
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
          onSave={handleSave}
        />
      </div>
    </SalonGuard>
  );
}
