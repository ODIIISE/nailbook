"use client";

import { useSearchParams } from "next/navigation";
import { QwenBookingFlow } from "@/components/booking/qwen-booking-flow";

export function BookingRouteShell() {
  const searchParams = useSearchParams();
  const service = searchParams.get("service");
  const look = searchParams.get("look");
  return (
    <QwenBookingFlow
      key={searchParams.toString()}
      mode="page"
      initialServiceId={service}
      lookId={look}
    />
  );
}
