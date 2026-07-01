"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ScheduleManager } from "@/components/owner/schedule-manager";
import { useSalon } from "@/lib/salon-context";
import { toast } from "sonner";

export default function OwnerSchedulePage() {
  const router = useRouter();
  const { workingHours, specificDaysOff, updateWorkingHours, updateSpecificDaysOff } = useSalon();

  const handleSave = (hours: typeof workingHours, daysOff: string[]) => {
    updateWorkingHours(hours);
    updateSpecificDaysOff(daysOff);
    toast.success("ساعات کاری ذخیره شد");
  };

  return (
    <div className="min-h-screen ">
      <div className="sticky top-0 z-10 /95 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/owner")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-foreground">ساعات کاری</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        <ScheduleManager
          workingHours={workingHours}
          specificDaysOff={specificDaysOff}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
