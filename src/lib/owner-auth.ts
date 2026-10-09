import { sql } from "@vercel/postgres";
import { verifyCustomerSession, verifyCustomerSessionWithVersion, signCustomerSession } from "./customer-auth";
import { resolveSalonId } from "./multi-tenant";

/**
 * Unified owner auth: customer and owner share the same "session" cookie.
 * The "owner" role is granted via the `roles` array on the users row.
 *
 * Existing /api/owner/* endpoints still call `verifyOwner(request)` and
 * `verifyOwnerSession(cookie)` — internally they now read the unified
 * "session" cookie and require "owner" in the user's roles array.
 */

/**
 * Sign a fresh customer_session token for the owner-scoped cookie.
 * Kept as an export so legacy callers and the bootstrap route still work.
 */
export function signOwnerSession(userId: string, version: number = 0): string {
  return signCustomerSession(userId, version);
}

/**
 * Verify a customer_session token. Backwards-compatible alias.
 */
export function verifyOwnerSession(cookieValue: string | undefined): string | null {
  return verifyCustomerSession(cookieValue);
}

/**
 * Returns true if the error is the standard Postgres "column does not exist".
 * Used to gracefully fall back to legacy schemas where migration 014 (which
 * adds the `roles` TEXT[] column) hasn't run yet.
 */
function isColumnMissing(err: unknown, column: string): boolean {
  const msg = String((err as { message?: string })?.message ?? "");
  return new RegExp(`column "${column}" does not exist|42703`, "i").test(msg);
}

/**
 * Cheap lookup used by send-otp to gate the owner flow BEFORE the SMS is
 * sent. Returns true iff this phone is already registered with the owner
 * role (in the new TEXT[] `roles` column or the legacy `"role"` column).
 *
 * Schema-aware: a DB where migration 014 hasn't run yet still works
 * because the function falls back to the legacy column on SQLSTATE 42703.
 */
export async function phoneHasOwnerRole(phone: string): Promise<boolean> {
  const salonId = await resolveSalonId();
  try {
    const { rows } = salonId
      ? await sql`SELECT "role", roles FROM users WHERE phone = ${phone} AND salon_id = ${salonId} LIMIT 1`
      : await sql`SELECT "role", roles FROM users WHERE phone = ${phone} LIMIT 1`;
    if (rows.length === 0) return false;
    const raw = rows[0].roles as unknown;
    if (Array.isArray(raw) && raw.includes("owner")) return true;
    if (typeof raw === "string" && /\{[^}]*\bowner\b[^}]*\}/.test(raw)) return true;
    // Legacy-only schema: rely on the `"role"` column.
    return rows[0].role === "owner";
  } catch (err) {
    if (!isColumnMissing(err, "roles")) throw err;
    const { rows } = salonId
      ? await sql`SELECT "role" FROM users WHERE phone = ${phone} AND salon_id = ${salonId} LIMIT 1`
      : await sql`SELECT "role" FROM users WHERE phone = ${phone} LIMIT 1`;
    return rows[0]?.role === "owner";
  }
}

/**
 * Cheap lookup used by send-otp to gate the staff login flow BEFORE the SMS
 * is sent. Returns true iff this phone is registered with any staff role
 * (owner/manager/artist in `roles`, or the legacy `"role" = 'owner'`).
 *
 * Schema-aware like phoneHasOwnerRole: falls back to the legacy column on
 * SQLSTATE 42703 where migration 014 hasn't run yet.
 */
export async function phoneHasStaffRole(phone: string): Promise<boolean> {
  const salonId = await resolveSalonId();
  const hasStaff = (raw: unknown): boolean => {
    if (Array.isArray(raw)) return raw.some((r) => r === "owner" || r === "manager" || r === "artist");
    if (typeof raw === "string") return /\b(owner|manager|artist)\b/.test(raw);
    return false;
  };
  try {
    const { rows } = salonId
      ? await sql`SELECT "role", roles FROM users WHERE phone = ${phone} AND salon_id = ${salonId} LIMIT 1`
      : await sql`SELECT "role", roles FROM users WHERE phone = ${phone} LIMIT 1`;
    if (rows.length === 0) return false;
    if (hasStaff(rows[0].roles)) return true;
    // Legacy-only row: an "owner" there is staff; anything else is not.
    return rows[0].role === "owner";
  } catch (err) {
    if (!isColumnMissing(err, "roles")) throw err;
    const { rows } = salonId
      ? await sql`SELECT "role" FROM users WHERE phone = ${phone} AND salon_id = ${salonId} LIMIT 1`
      : await sql`SELECT "role" FROM users WHERE phone = ${phone} LIMIT 1`;
    return rows[0]?.role === "owner";
  }
}

/**
 * Look up the roles array for a user. The cookie itself only carries the
 * userId; the actual role gating happens here.
 *
 * - Returns `null` if the user row no longer exists (stale-cookie case).
 * - Throws if the DB itself errors (so transient outages surface clearly).
 *
 * Schema-aware: handles three flavours of the `users` table —
 *   1. Migration 014+ ran: `roles TEXT[]` populated with array OR with
 *      stringified "{customer,owner}" literal from `@vercel/postgres`.
 *   2. Migration 014 ran but `roles` is empty/null: synthesise from
 *      legacy `"role"` column.
 *   3. Migration 014 dropped on a fresh DB where the new column is
 *      missing entirely: fall back to legacy `"role"` column.
 */
async function getUserRoles(userId: string): Promise<string[] | null> {
  const salonId = await resolveSalonId();
  // Try the new schema first. Note: "role" is a Postgres reserved keyword and
  // MUST be double-quoted; an unquoted reference inside a SELECT list throws
  // "syntax error at or near 'role'" on stricter PG versions.
  let rows;
  try {
    ({ rows } = salonId
      ? await sql`
        SELECT "role", roles FROM users WHERE id = ${userId} AND salon_id = ${salonId} LIMIT 1
      `
      : await sql`
        SELECT "role", roles FROM users WHERE id = ${userId} LIMIT 1
      `);
  } catch (err) {
    if (!isColumnMissing(err, "roles")) throw err;
    // Legacy schema: only the "role" column exists. Migration 014 has not run
    // on this DB yet — keep the deployment functional until the admin runs it.
    ({ rows } = salonId
      ? await sql`SELECT "role" FROM users WHERE id = ${userId} AND salon_id = ${salonId} LIMIT 1`
      : await sql`SELECT "role" FROM users WHERE id = ${userId} LIMIT 1`);
    if (rows.length === 0) return null;
    return rows[0].role === "owner" ? ["customer", "owner"] : ["customer"];
  }
  if (rows.length === 0) return null;
  const rawRoles = rows[0].roles;
  const legacyRole: string = rows[0].role;

  // Path 1: native JS array from @vercel/postgres.
  if (Array.isArray(rawRoles) && rawRoles.length > 0) {
    return rawRoles.filter((r): r is string => typeof r === "string");
  }
  // Path 2: stringified "{customer,owner}" literal — same regex+split the
  // verify-otp `normalizeUserRoles` helper uses on the login path.
  if (typeof rawRoles === "string" && rawRoles.length > 0) {
    const parsed = rawRoles
      .replace(/^\{|\}$/g, "")
      .split(",")
      .map((s) => s.replace(/"/g, "").trim())
      .filter(Boolean);
    if (parsed.length > 0) return parsed;
  }
  // Path 3: `roles` empty/null after a successful migration. Use legacy
  // `"role"` to decide, so an existing owner isn't locked out by a partial
  // migration drift.
  return legacyRole === "owner" ? ["customer", "owner"] : ["customer"];
}

/**
 * Fixed role presets (no editable matrix): owner does everything, manager
 * does everything except user administration, artist works only on bookings.
 * One helper enforces it server-side so UI hiding is never the real gate.
 */
export const STAFF_ROLES = ["owner", "manager", "artist"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_PERMISSIONS = [
  "timeline.all",
  "bookings.manage",
  "bookings.paid",
  "schedule.edit",
  "services.edit",
  "users.manage",
  "logs.view",
  "settings.edit",
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<StaffPermission>> = {
  owner: new Set(STAFF_PERMISSIONS),
  manager: new Set([
    "timeline.all",
    "bookings.manage",
    "bookings.paid",
    "schedule.edit",
    "services.edit",
    "logs.view",
  ]),
  artist: new Set(["bookings.manage"]),
};

export function staffRoles(roles: string[]): StaffRole[] {
  return STAFF_ROLES.filter((r) => roles.includes(r));
}

export function can(roles: string[], permission: StaffPermission): boolean {
  return staffRoles(roles).some((r) => ROLE_PERMISSIONS[r].has(permission));
}

export function isStaff(roles: string[]): boolean {
  return staffRoles(roles).length > 0;
}

/**
 * Staff gate for /api/owner/*: any owner/manager/artist session passes
 * authentication; the optional permission narrows it. Returns null for both
 * anonymous and unauthorized callers so routes keep their existing 401 shape.
 */
export async function verifyStaff(
  request: { cookies: { get: (name: string) => { value: string } | undefined } },
  permission?: StaffPermission
): Promise<{ id: string; roles: string[] } | null> {
  const sessionValue = request.cookies.get("session")?.value;
  const userId = await verifyCustomerSessionWithVersion(sessionValue);
  if (!userId) return null;

  const roles = await getUserRoles(userId);
  if (roles === null) return null;
  if (!isStaff(roles)) return null;
  if (permission && !can(roles, permission)) return null;

  return { id: userId, roles };
}

/**
 * 401/403 split for staff routes. A missing session (or a vanished user row)
 * is 401; an authenticated caller without the staff role or the required
 * permission is 403 with a distinct body, so clients stop misreporting
 * "forbidden" as an expired session and logging the user out.
 */
export async function requireStaff(
  request: { cookies: { get: (name: string) => { value: string } | undefined } },
  permission?: StaffPermission
): Promise<{ staff: { id: string; roles: string[] } } | { status: 401 | 403 }> {
  const sessionValue = request.cookies.get("session")?.value;
  const userId = await verifyCustomerSessionWithVersion(sessionValue);
  if (!userId) return { status: 401 };

  const roles = await getUserRoles(userId);
  if (roles === null) return { status: 401 };
  if (!isStaff(roles)) return { status: 403 };
  if (permission && !can(roles, permission)) return { status: 403 };

  return { staff: { id: userId, roles } };
}

/** Shared error shape for requireStaff rejections. */
export function staffAuthError(status: 401 | 403): { error: string } {
  return { error: status === 403 ? "دسترسی ندارید" : "غیرمجاز" };
}
/**
 * Owner-only gate (legacy): prefer verifyStaff(request, perm) for new code.
 * Kept so existing /api/owner/* routes keep working untouched until they are
 * migrated to permission checks one by one.
 */
export async function verifyOwner(
  request: { cookies: { get: (name: string) => { value: string } | undefined } }
): Promise<{ id: string; roles: string[] } | null> {
  const sessionValue = request.cookies.get("session")?.value;
  const userId = await verifyCustomerSessionWithVersion(sessionValue);
  if (!userId) return null;

  const roles = await getUserRoles(userId);
  if (roles === null) return null;
  if (!roles.includes("owner")) return null;

  return { id: userId, roles };
}

/**
 * Same as verifyOwner but without the cookie context object.
 */
export async function verifyOwnerFromCookie(cookieValue: string | undefined) {
  const userId = await verifyCustomerSessionWithVersion(cookieValue);
  if (!userId) return null;
  const roles = await getUserRoles(userId);
  if (roles === null) return null;
  if (!roles.includes("owner")) return null;
  return { id: userId, roles };
}
