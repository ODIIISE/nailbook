"use client";

import { useState, useEffect, useRef } from "react";
import { Users } from "lucide-react";

interface SocialProofPulseProps {
  totalBookings: number;
  pollInterval?: number;
}

/**
 * Social-proof badge that polls /api/social-proof for live booking count.
 * Falls back to the static `totalBookings` prop if the API is unreachable.
 * Respects prefers-reduced-motion: skips the pulse, shows static count.
 */
export function SocialProofPulse({ totalBookings: initialCount, pollInterval = 60000 }: SocialProofPulseProps) {
  const [count, setCount] = useState(initialCount);
  const [visible, setVisible] = useState(false);
  const prevCount = useRef(initialCount);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Poll /api/social-proof for live data
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/social-proof");
        if (!active || !res.ok) return;
        const data = await res.json();
        if (data.totalBookings !== undefined) {
          setCount(data.totalBookings);
        }
      } catch {
        // silently fall back to prop value
      }
    };
    poll();
    const interval = setInterval(poll, pollInterval);
    return () => { active = false; clearInterval(interval); };
  }, [pollInterval]);

  // Flash when count increases
  useEffect(() => {
    if (count > prevCount.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  if (count === 0) return null;

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
        <span>{count.toLocaleString("fa-IR")} نوبت ثبت شده</span>
      </div>
    </div>
  );
}
