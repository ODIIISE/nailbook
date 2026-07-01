"use client";

import { ServiceManager } from "@/components/owner/service-manager";
import { useSalon } from "@/lib/salon-context";

export default function OwnerServicesPage() {
  const { services, addons, updateServices, updateAddons } = useSalon();

  return (
    <div className="px-4 py-4">
      <ServiceManager
        services={services}
        addons={addons}
        onUpdateServices={updateServices}
        onUpdateAddons={updateAddons}
      />
    </div>
  );
}
