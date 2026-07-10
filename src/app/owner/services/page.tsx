"use client";

import { ServiceManager } from "@/components/owner/service-manager";
import { useSalon } from "@/lib/salon-context";
import { SalonGuard } from "@/components/ui/salon-guard";

export default function OwnerServicesPage() {
  const { services, addons, updateServices, updateAddons } = useSalon();

  return (
    <SalonGuard>
      <div className="px-4 py-4">
        <ServiceManager
          services={services}
          addons={addons}
          onUpdateServices={updateServices}
          onUpdateAddons={updateAddons}
        />
      </div>
    </SalonGuard>
  );
}
