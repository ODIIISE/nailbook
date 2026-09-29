/**
 * P4 error-text sanitizer (AUDIT-010/011).
 *
 * Server API errors are Persian by contract. Anything else — browser network
 * failures ("Failed to fetch"), HTML error pages, English exceptions — must
 * never surface in the Persian UI. Pass the message through only when it
 * contains Persian script; otherwise return the Persian fallback.
 */
export function persianizeError(e: unknown, fallback: string): string {
  const message = e instanceof Error && e.message ? e.message : "";
  return /[\u0600-\u06FF]/.test(message) ? message : fallback;
}
