/**
 * Multi-tenant support for NailBook
 *
 * SALON_ID env var determines the mode:
 * - Not set: Admin panel mode (sees all salons)
 * - Set: Single-salon mode (only sees that salon's data)
 */

export function getSalonId(): string | null {
  const salonId = process.env.SALON_ID;
  if (!salonId || salonId.trim() === '') return null;
  return salonId.trim();
}

export function isAdminMode(): boolean {
  return getSalonId() === null;
}

export function isSalonMode(): boolean {
  return getSalonId() !== null;
}

/**
 * Resolve the configured tenant to the canonical salons.id UUID.
 * Older deployments sometimes store SALON_ID as a salon slug; auth and OTP
 * queries must use the UUID when comparing against UUID-typed columns.
 */
export async function resolveSalonId(): Promise<string | null> {
  const configured = getSalonId();
  if (!configured) return null;

  const { sql } = await import("@vercel/postgres");
  const { rows } = await sql.query(
    "SELECT id FROM salons WHERE id::text = $1 OR slug = $1 LIMIT 1",
    [configured]
  );
  const resolved = rows[0]?.id as string | undefined;
  if (!resolved) {
    // Never turn a broken tenant configuration into an unscoped/global query.
    // Callers will fail closed through their normal error handling.
    throw new Error(`Configured SALON_ID does not match a salon: ${configured}`);
  }
  return resolved;
}

/**
 * Get salon_id for database queries.
 * Returns the configured SALON_ID value, or null for admin mode.
 */
export function getSalonFilter(): string | null {
  return getSalonId();
}
