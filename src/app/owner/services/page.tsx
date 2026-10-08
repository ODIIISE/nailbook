"use client";

import { ServiceManager } from "@/components/owner/service-manager";
import { useSalon } from "@/lib/salon-context";
import { SalonGuard } from "@/components/ui/salon-guard";
import { getTehranNow } from "@/lib/time";

export default function OwnerServicesPage() {
  const { services, addons, bookings, updateServices, updateAddons } = useSalon();

  /* Live future bookings per service (v-2 delete guard): deleting a service
     NULLs those bookings server-side, so offer deactivation instead. */
  const now = getTehranNow();
  const futureBookingCounts: Record<string, number> = {};
  for (const b of bookings) {
    if (b.status !== "reserved" && b.status !== "confirmed" && b.status !== "in_progress" && b.status !== "pending") continue;
    const day = b.date_gregorian.split("T")[0];
    if (day < now.dateKey) continue;
    if (day === now.dateKey) {
      const [h, m] = b.start_time.split(":").map(Number);
      if ((h || 0) * 60 + (m || 0) <= now.minutes) continue;
    }
    if (b.service_id) futureBookingCounts[b.service_id] = (futureBookingCounts[b.service_id] || 0) + 1;
  }

  return (
    <SalonGuard>
      <div className="px-4 py-4">
        <ServiceManager
          services={services}
          addons={addons}
          futureBookingCounts={futureBookingCounts}
          onUpdateServices={updateServices}
          onUpdateAddons={updateAddons}
        />
      </div>
    </SalonGuard>
  );
}
