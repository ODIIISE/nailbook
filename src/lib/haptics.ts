/**
 * Haptic feedback helper — tiny navigator.vibrate wrapper
 * exposed as a frozen object so callers can write `haptic.tap()`
 * etc. without paying for the heartbeat of a function call.
 *
 * Falls back to a no-op on environments that don't support it
 * (iOS Safari prior to 16.4, certain Android browsers, desktops).
 *
 * The single call to navigator.vibrate is wrapped in try/catch
 * because some browsers throw if called concurrently or in
 * insecure contexts.
 */

export type HapticPattern = "tap" | "select" | "success" | "warning";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  // Single tick for ordinary taps (slot-pick, day-pick, primary CTA).
  tap: 12,
  // Slightly stronger tick for selections in lists / nav items.
  select: 18,
  // Confirmation pattern for successful booking, payment, login.
  success: [10, 30, 20],
  // Warning pattern for destructive or error feedback.
  warning: [20, 40, 30],
};

function trigger(pattern: HapticPattern): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  // Honour the operating-system-level reduced-motion preference. Vibration
  // is its own accessibility surface — silent feedback is the right call.
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // swallow — haptics are a best-effort enhancement, never block UX
  }
}

/**
 * Named haptic primitives. Use the narrowest one that fits the gesture
 * — `tap` for most touches, `success` only when the user just completed
 * a milestone (booking committed, payment confirmed), `warning` only on
 * visible destructive or error feedback.
 */
export const haptic = Object.freeze({
  tap: () => trigger("tap"),
  select: () => trigger("select"),
  success: () => trigger("success"),
  warning: () => trigger("warning"),
});
