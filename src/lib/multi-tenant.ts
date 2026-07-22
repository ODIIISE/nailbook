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
 * Get salon_id for database queries.
 * Returns the SALON_ID env var value, or null for admin mode.
 */
export function getSalonFilter(): string | null {
  return getSalonId();
}
