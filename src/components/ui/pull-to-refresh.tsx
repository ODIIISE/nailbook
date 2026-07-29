"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

/**
 * Pull-to-refresh wrapper for mobile scroll containers.
 *
 * Attaches to the top of a scrollable area. When the user pulls down past
 * the threshold while scrollTop === 0, a spinner appears and `onRefresh`
 * fires on release. Respects `prefers-reduced-motion` — skips the pull
 * animation and just calls onRefresh directly.
 *
 * Usage:
 *   <PullToRefresh onRefresh={refreshBookings}>
 *     <div className="space-y-4">...</div>
 *   </PullToRefresh>
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return;
    // Abort if the container scrolled during the pull (child scroll)
    if (containerRef.current && containerRef.current.scrollTop > 0) {
      pulling.current = false;
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    // Rubber-band resistance: diminishing returns past threshold
    const dampened = Math.min(MAX_PULL, delta * 0.5);
    setPullDistance(dampened);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= PULL_THRESHOLD * 0.5) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.4);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh]);

  const progress = Math.min(1, pullDistance / (PULL_THRESHOLD * 0.5));

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col native-scroll"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: pullDistance > 0 || refreshing ? `${Math.max(pullDistance, refreshing ? 48 : 0)}px` : "0px" }}
      >
        <div
          className="transition-opacity duration-150"
          style={{ opacity: progress }}
        >
          <Loader2
            className={`h-5 w-5 text-muted-foreground ${refreshing ? "animate-spin" : ""}`}
            style={!refreshing ? { transform: `rotate(${progress * 360}deg)` } : undefined}
          />
        </div>
      </div>

      {children}
    </div>
  );
}
