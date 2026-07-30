import { sql } from "@vercel/postgres";
import { verifyCustomerSession, signCustomerSession } from "./customer-auth";

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
 * Look up the roles array for a user. The cookie itself only carries the
 * userId; the actual role gating happens here.
 *
 * - Returns `null` if the user row no longer exists (stale-cookie case;
 *   callers should treat this as a normal "re-auth" response, not a 500).
 * - Throws if the DB itself errors (so transient outages surface clearly).
 */
async function getUserRoles(userId: string): Promise<string[] | null> {
  const { rows } = await sql`SELECT roles FROM users WHERE id = ${userId} LIMIT 1`;
  if (rows.length === 0) return null;
  const raw = rows[0].roles;
  if (Array.isArray(raw)) return raw as string[];
  return ["customer"];
}

/**
 * Return the owner user record iff the request carries a valid unified session
 * AND the user has "owner" in their roles array. Returns null on a normal
 * auth failure (no session, wrong role, missing user); throws on real DB errors
 * so the caller can surface a 500 instead of silently passing.
 */
export async function verifyOwner(
  request: { cookies: { get: (name: string) => { value: string } | undefined } }
): Promise<{ id: string; roles: string[] } | null> {
  const sessionValue = request.cookies.get("session")?.value;
  const userId = verifyCustomerSession(sessionValue);
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
  const userId = verifyCustomerSession(cookieValue);
  if (!userId) return null;
  const roles = await getUserRoles(userId);
  if (roles === null) return null;
  if (!roles.includes("owner")) return null;
  return { id: userId, roles };
}
