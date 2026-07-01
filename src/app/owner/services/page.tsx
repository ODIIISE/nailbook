"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ServiceManager } from "@/components/owner/service-manager";
import { useSalon } from "@/lib/salon-context";

export default function OwnerServicesPage() {
  const router = useRouter();
  const { services, addons, updateServices, updateAddons } = useSalon();

  return (
    <div className="min-h-screen ">
      <div className="sticky top-0 z-10 /95 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/owner")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-foreground">مدیریت خدمات</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        <ServiceManager
          services={services}
          addons={addons}
          onUpdateServices={updateServices}
          onUpdateAddons={updateAddons}
        />
      </div>
    </div>
  );
}
