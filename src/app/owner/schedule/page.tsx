"use client";

import { ScheduleManager } from "@/components/owner/schedule-manager";
import { useSalon } from "@/lib/salon-context";
import { toast } from "sonner";

export default function OwnerSchedulePage() {
  const { workingHours, specificDaysOff, updateWorkingHours, updateSpecificDaysOff } = useSalon();

  const handleSave = (hours: typeof workingHours, daysOff: string[]) => {
    updateWorkingHours(hours);
    updateSpecificDaysOff(daysOff);
    toast.success("ساعات کاری ذخیره شد");
  };

  return (
    <div className="px-4 py-4">
      <ScheduleManager
        workingHours={workingHours}
        specificDaysOff={specificDaysOff}
        onSave={handleSave}
      />
    </div>
  );
}
