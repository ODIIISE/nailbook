"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseCountdownOptions {
  initialSeconds?: number;
}

export function useCountdown({ initialSeconds = 120 }: UseCountdownOptions = {}) {
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemaining(0);
  }, []);

  const start = useCallback(() => {
    stop();
    setRemaining(initialSeconds);

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initialSeconds, stop]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { remaining, start, stop, isActive: remaining > 0 };
}
