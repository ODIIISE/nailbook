import { Suspense } from "react";
import { AdminLanding } from "@/components/landing/admin-landing";
import { SalonBooking } from "@/components/landing/salon-booking";
import { isSalonMode } from "@/lib/multi-tenant";

// Mode is decided entirely on the server from SALON_ID (a build-time/deploy
// constant). Previously the homepage fetched /api/config on every client
// mount and rendered a blank screen until the round-trip resolved — that
// network gate re-ran on back-navigation, making "back to homepage" feel
// slow. Reading the env directly removes the fetch entirely, so a cached
// back-navigation restores instantly with no blank frame.
export default function HomePage() {
  if (!isSalonMode()) {
    return <AdminLanding />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-hidden="true" />}>
      <SalonBooking />
    </Suspense>
  );
}
