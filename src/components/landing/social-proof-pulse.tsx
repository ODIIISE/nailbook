"use client";

import { useState, useEffect, useRef } from "react";
import { Users } from "lucide-react";

interface SocialProofPulseProps {
  totalBookings: number;
}

/**
 * Subtle social-proof badge that shows how many bookings have been made.
 * Pulses gently on mount, then settles. Polls nothing — relies on the
 * parent's already-polled `totalBookings` prop for live updates.
 *
 * Respects prefers-reduced-motion: skips the pulse, shows static count.
 */
export function SocialProofPulse({ totalBookings }: SocialProofPulseProps) {
  const [visible, setVisible] = useState(false);
  const prevCount = useRef(totalBookings);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Flash when count increases
  useEffect(() => {
    if (totalBookings > prevCount.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      prevCount.current = totalBookings;
      return () => clearTimeout(t);
    }
    prevCount.current = totalBookings;
  }, [totalBookings]);

  if (totalBookings === 0) return null;

  return (
    <div
      className="flex items-center justify-center transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(4px)" }}
    >
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-300 ${
          flash
            ? "bg-foreground/10 text-foreground scale-105"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
        <Users className="h-3 w-3" />
        <span>{totalBookings.toLocaleString("fa-IR")} نوبت ثبت شده</span>
      </div>
    </div>
  );
}
