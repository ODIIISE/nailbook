/**
 * Maximum browser-safe cookie/session lifetime.
 * Chrome caps cookies at ~400 days, so we use that as the upper bound.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
