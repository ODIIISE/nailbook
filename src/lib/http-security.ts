import crypto from "crypto";

/**
 * Timing-safe string comparison for secrets (bootstrap keys, tokens).
 * Hashes both sides first so length differences leak nothing.
 */
export function safeEqual(a: string, b: string): boolean {
  const da = crypto.createHash("sha256").update(a).digest();
  const db = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(da, db);
}

export interface RateLimiter {
  check: (key: string) => { allowed: boolean; retryAfter?: number };
  record: (key: string, success: boolean) => void;
}

/**
 * In-memory sliding-window limiter with a bounded map (cold-start resets are
 * accepted on serverless, as documented on the OTP limiter). Every sensitive
 * endpoint shares this so no endpoint grows an unbounded per-key map.
 */
export function createRateLimiter(opts: {
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
  maxKeys?: number;
}): RateLimiter {
  const { maxAttempts, windowMs, blockMs, maxKeys = 5000 } = opts;
  const attempts = new Map<string, { count: number; windowStart: number; blockedUntil: number }>();
  let lastSweepAt = 0;

  function sweep(now: number) {
    if (now - lastSweepAt < windowMs) return;
    if (attempts.size < maxKeys) return;
    lastSweepAt = now;
    for (const [k, v] of attempts) {
      if (now - v.windowStart > windowMs && v.blockedUntil <= now) attempts.delete(k);
    }
  }

  return {
    check(key) {
      const now = Date.now();
      sweep(now);
      const entry = attempts.get(key);
      if (!entry) return { allowed: true };
      if (entry.blockedUntil > now) {
        return { allowed: false, retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
      }
      if (now - entry.windowStart > windowMs) {
        attempts.delete(key);
      }
      return { allowed: true };
    },
    record(key, success) {
      const now = Date.now();
      if (success) {
        attempts.delete(key);
        return;
      }
      sweep(now);
      const entry = attempts.get(key);
      if (!entry || now - entry.windowStart > windowMs) {
        attempts.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
        return;
      }
      entry.count += 1;
      if (entry.count >= maxAttempts) {
        entry.blockedUntil = now + blockMs;
      }
    },
  };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for's
 * leftmost value; treat it as advisory, never as an auth boundary). */
export function clientIpFrom(request: { headers: { get(name: string): string | null } }): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
