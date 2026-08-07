"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const CUSTOMER_ROUTES = ["/", "/book", "/bookings", "/profile", "/login"];

function isCustomerRoute(pathname: string): boolean {
  return CUSTOMER_ROUTES.some((route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`)));
}

type Direction = "forward" | "back";

/**
 * iOS-style directional page transition.
 *
 * On any pathname change the previous page slides out and the new page
 * slides in along the X axis, mirroring native iOS/Android push semantics.
 * Direction comes from state: the `popstate` listener (browser back / OS
 * swipe-back) sets "back" synchronously before the router commits the new
 * pathname, so the exiting and entering pages both animate the right way on
 * the first render. Programmatic router.push never fires popstate, so the
 * direction stays "forward" (reset after each committed route).
 *
 * RTL-aware: in a right-to-left layout, "forward" (push) slides in from the
 * visual LEFT, "back" (pop) from the visual RIGHT. The slide is modest
 * (24% travel, iOS-style deceleration, 240 ms) so the fixed bottom
 * navigation on customer pages keeps working — the shell returns to
 * `transform: none` at rest, so fixed descendants resolve against the
 * viewport exactly as before. Falls back to a pure fade when
 * reduced-motion is on.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [direction, setDirection] = useState<Direction>("forward");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Browser back / OS swipe-back fires popstate before the router commits the
  // new pathname; router.push does not. Keeping this in state means the render
  // that mounts the new page already sees "back". The router commits the new
  // pathname synchronously within the same event, so a 0ms timeout that runs
  // on the next task resets the direction for the next push — the in-flight
  // framer-motion animation already captured its variants object.
  useEffect(() => {
    const onPop = () => {
      setDirection("back");
      window.setTimeout(() => setDirection("forward"), 0);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Keep management surfaces unchanged; customer navigation gets the shared
  // directional transition while page-level components provide spatial motion.
  if (!isCustomerRoute(pathname)) return <>{children}</>;

  // RTL mirror: in a right-to-left layout, pushing a new screen slides it in
  // from the left (negative x) and popping returns it from the right.
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  const slides: Record<Direction, { enter: { x: string; opacity: number }; exit: { x: string; opacity: number } }> = {
    forward: {
      enter: { x: rtl ? "-24%" : "24%", opacity: 0.4 },
      exit: { x: rtl ? "12%" : "-12%", opacity: 0.6 },
    },
    back: {
      enter: { x: rtl ? "24%" : "-24%", opacity: 0.4 },
      exit: { x: rtl ? "-12%" : "12%", opacity: 0.6 },
    },
  };

  const variants = reduced
    ? {
        enter: { opacity: 0 },
        center: { x: "0%", opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: slides[direction].enter,
        center: { x: "0%", opacity: 1 },
        exit: slides[direction].exit,
      };

  const transition = reduced
    ? { duration: 0.01, ease: "linear" as const }
    : { duration: 0.24, ease: [0.32, 0.72, 0, 1] as const }; // iOS-style deceleration

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="enter"
        animate="center"
        exit="exit"
        variants={variants}
        transition={transition}
        style={{ willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
