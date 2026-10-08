"use client";

import { useSearchParams } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";

export function BookingRouteShell() {
  const searchParams = useSearchParams();
  const service = searchParams.get("service");
  const look = searchParams.get("look");
  const addons = searchParams.get("addons");
  return (
    <BookingFlow
      key={searchParams.toString()}
      initialServiceId={service}
      initialAddons={addons ? addons.split(",").filter(Boolean) : null}
      lookId={look}
    />
  );
}
