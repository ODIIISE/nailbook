"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const CUSTOMER_ROUTES = ["/", "/book", "/bookings", "/profile", "/login"];

function isCustomerRoute(pathname: string): boolean {
  return CUSTOMER_ROUTES.some((route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`)));
}

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
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);


  // Keep management surfaces unchanged; customer navigation gets the shared
  // crossfade while the page-level components provide spatial entrance motion.
  if (!isCustomerRoute(pathname)) return <>{children}</>;

  // Use opacity-only shell transitions. A transformed ancestor would change
  // the containing block of the customer's fixed bottom navigation.
  const variants = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

  const transition = reduced
    ? { duration: 0.01, ease: "linear" as const }
    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={transition}
        style={{ willChange: "opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
