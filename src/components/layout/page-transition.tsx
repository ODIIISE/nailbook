"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const CUSTOMER_ROUTES = ["/", "/book", "/bookings", "/profile", "/login"];

function isCustomerRoute(pathname: string): boolean {
  return CUSTOMER_ROUTES.some((route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`)));
}

type Direction = "forward" | "back";

/**
 * iOS-style directional page transition.
 *
 * The App Router swaps the previous page's content out of the tree the moment
 * the route commits, so an exit animation has nothing left to animate — a
 * cross-fade/push exit from the root layout would just leave a blank gap
 * while AnimatePresence waits. Instead the new page mounts immediately and
 * slides in from the side (direction-aware), which reads as a clean push with
 * no blank flash.
 *
 * Direction comes from state: the `popstate` listener (browser back / OS
 * swipe-back) and the `nailbook:back` custom event (explicit back actions
 * like the booking flow's back-to-home button) set "back" before the router
 * commits the new pathname, so the entering page picks the right side on
 * first render. Plain router.push calls keep the direction "forward"; it is
 * reset after each committed route.
 *
 * RTL-aware: in a right-to-left layout, "forward" (push) slides in from the
 * visual LEFT, "back" (pop) from the visual RIGHT. The slide is modest
 * (24% travel, iOS-style deceleration, 240 ms). `initial={false}` on
 * AnimatePresence keeps the very first page load from animating. The shell
 * must NOT carry a persistent `will-change: transform` (nor a transform) at
 * rest: either one creates a containing block that breaks `position: fixed`
 * descendants (the bottom nav, bottom sheets), anchoring them to the page
 * instead of the viewport. Falls back to a pure fade when reduced-motion is on.
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

  // Direction intent for the NEXT route commit. Browser back / OS swipe-back
  // fires popstate before the router commits; explicit back actions inside the
  // app (e.g. the booking flow's back-to-home button) fire a "nailbook:back"
  // custom event. Either one sets "back" so the render that mounts the new
  // page already sees it. Direction is reset to "forward" once the route
  // actually commits (see below) — no timer races.
  useEffect(() => {
    const onPop = () => setDirection("back");
    const onBackIntent = () => setDirection("back");
    window.addEventListener("popstate", onPop);
    window.addEventListener("nailbook:back", onBackIntent);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("nailbook:back", onBackIntent);
    };
  }, []);

  // Once the route commits, the entering page has captured its "back"
  // variants, so reset for the next push.
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setDirection("forward");
    }
  }, [pathname]);

  // Keep management surfaces unchanged; customer navigation gets the shared
  // directional transition while page-level components provide spatial motion.
  if (!isCustomerRoute(pathname)) return <>{children}</>;

  // RTL mirror: in a right-to-left layout, pushing a new screen slides it in
  // from the left (negative x) and popping returns it from the right.
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  const enterX = direction === "back" ? (rtl ? "24%" : "-24%") : rtl ? "-24%" : "24%";

  const variants = reduced
    ? {
        enter: { opacity: 0 },
        center: { x: "0%", opacity: 1 },
      }
    : {
        enter: { x: enterX, opacity: 0.4 },
        center: { x: "0%", opacity: 1 },
      };

  const transition = reduced
    ? { duration: 0.01, ease: "linear" as const }
    : { duration: 0.24, ease: [0.32, 0.72, 0, 1] as const }; // iOS-style deceleration

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial="enter"
        animate="center"
        variants={variants}
        transition={transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
