"use client";

import { useState } from "react";
import { ScheduleManager } from "@/components/owner/schedule-manager";
import { useSalon } from "@/lib/salon-context";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function OwnerSchedulePage() {
  const { salon, workingHours, specificDaysOff, saveSchedule, updateSalon, refreshSalonData } = useSalon();
  const [migrating, setMigrating] = useState(false);

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

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const res = await fetch("/api/owner/migrate", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`مایگریشن انجام شد: ${data.columnsFound?.length || 0} ستون`);
        await refreshSalonData();
      } else {
        toast.error(data.error || "خطا در مایگریشن");
      }
    } catch {
      toast.error("خطا در مایگریشن");
    }
    setMigrating(false);
  };

  return (
    <SalonGuard>
      <div className="px-4 py-4 space-y-4">
        <Button variant="outline" onClick={handleMigrate} disabled={migrating} className="w-full">
          {migrating ? "در حال اجرای مایگریشن..." : "اجرای مایگریشن دیتابیس"}
        </Button>

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
