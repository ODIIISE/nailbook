"use client";

import { useEffect } from "react";
import { useSalon } from "@/lib/salon-context";

/**
 * One polling policy for the whole app: fixed interval + instant refresh on
 * tab focus/visibility. Previously three screens each rolled their own
 * effect with different intervals and slightly different listeners.
 */
export function useBookingsPolling(
  scope: "owner" | "default" = "default",
  intervalMs = 10_000
) {
  const { refreshBookings } = useSalon();

  useEffect(() => {
    const refresh = () => { void refreshBookings(scope); };
    const id = window.setInterval(refresh, intervalMs);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const handleFocus = () => refresh();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshBookings, scope, intervalMs]);
}
