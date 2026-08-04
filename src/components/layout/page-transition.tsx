"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Directional cross-route page transition.
 *
 * On any pathname change, the previous page slides out and the new page
 * slides in along the X axis, mirroring native iOS/Android push semantics.
 * Detects back-vs-forward by listening for `popstate` events (browser
 * back / OS swipe-back triggers a popstate; programmatic router.push does
 * not). This is RTL-aware: in a right-to-left layout, "forward" (push)
 * is the visual LEFT, "back" is the visual RIGHT.
 *
 * Uses the spring-decay easing token for a natural 280–320 ms motion feel.
 * Falls back to a subtle 6px vertical fade when reduced-motion is on.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // previousPathRef is only ever read inside the diffing effect below —
  // never during render — so a ref is fine here.
  const previousPathRef = useRef<string | null>(null);
  // direction + reduced MUST be state (not refs) so changes re-render.
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    // Track direction. popstate = browser back / OS swipe-back.
    const handler = () => setDirection("back");
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    // After any non-popstate path change, reset direction back to forward
    // so the NEXT popstate gets correctly identified as the new "back".
    // setTimeout 0 defers past the current commit so the AnimatePresence
    // exit/enter pair fires with the correct direction first.
    const t = setTimeout(() => setDirection("forward"), 0);
    return () => clearTimeout(t);
  }, [pathname]);

  const isForward = direction === "forward";

  const variants = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        // In RTL: forward enters from -X (left), exits to +X (right).
        initial: { opacity: 0, x: isForward ? -16 : 16 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: isForward ? 16 : -16 },
      };

  const transition = reduced
    ? { duration: 0.18, ease: "easeOut" as const }
    : {
        // Mirrors --ease-spring-decay (0.22, 1, 0.36, 1). framer-motion's
        // cubic-bezier API takes a fixed array; CSS variables can't be read
        // here so we keep the values in sync via the comment above.
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1] as const,
      };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={transition}
        style={{ willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
