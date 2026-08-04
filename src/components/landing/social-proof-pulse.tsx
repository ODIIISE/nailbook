"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";

interface SocialProofPulseProps {
  totalBookings: number;
  pollInterval?: number;
}

export function SocialProofPulse({ totalBookings: initialCount, pollInterval = 60000 }: SocialProofPulseProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch("/api/social-proof");
        if (!active || !response.ok) return;
        const data = await response.json();
        if (typeof data.totalBookings === "number") setCount(data.totalBookings);
      } catch {
        // Keep the initial server-provided count when polling is unavailable.
      }
    };
    poll();
    const interval = setInterval(poll, pollInterval);
    return () => { active = false; clearInterval(interval); };
  }, [pollInterval]);

  if (count <= 0) return null;

  return (
    <p className="mx-auto flex max-w-lg items-center justify-center gap-1.5 px-4 py-1 text-small text-muted-foreground" aria-label="تعداد نوبت‌های موفق">
      <Users className="h-3.5 w-3.5 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
      <span>{toPersianDigits(count.toLocaleString("en-US"))} نوبت موفق تاکنون</span>
    </p>
  );
}
