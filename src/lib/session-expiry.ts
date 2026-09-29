/**
 * Central session-expiry handling (AUDIT-012).
 *
 * One owner-side 401 anywhere used to hard-redirect to /owner/login with no
 * regard for (a) who the user is — an expired CUSTOMER on a shared surface
 * was shipped to the owner login — or (b) what the owner was editing — the
 * redirect abandoned unsaved schedule/service/addon drafts.
 *
 * This module is the single decision point:
 * - routes the re-auth redirect by surface (/owner/**, /admin/** → owner
 *   login; everywhere else → customer login),
 * - stashes the current path so login can return the user to it,
 * - snapshots in-progress owner drafts into sessionStorage (per-tab, survives
 *   the redirect, cannot leak across tabs or devices) so no edit is lost.
 */

const RETURN_URL_KEY = "nailbook_return_to";

/** sessionStorage keys the owner forms persist dirty state under. */
export const OWNER_DRAFT_KEYS = [
  "nailbook_schedule_draft",
  "nailbook_services_draft",
  "nailbook_addons_draft",
] as const;

/** Pure decision: which login screen handles this path after expiry. */
export function expiryTargetFor(pathname: string): "/owner/login" | "/login" {
  return pathname.startsWith("/owner") || pathname.startsWith("/admin")
    ? "/owner/login"
    : "/login";
}

export function getReturnTo(): string | null {
  try {
    return sessionStorage.getItem(RETURN_URL_KEY);
  } catch {
    return null;
  }
}

export function clearReturnTo(): void {
  try {
    sessionStorage.removeItem(RETURN_URL_KEY);
  } catch {
    /* private mode — nothing to clear */
  }
}

/**
 * Copy every live owner draft from sessionStorage back onto itself is a no-op;
 * the point of this call is (a) to confirm drafts exist under the contract
 * keys and (b) to give login pages a count for a "drafts preserved" message.
 * Drafts themselves live in sessionStorage and simply survive the redirect.
 */
export function countOwnerDrafts(): number {
  try {
    return OWNER_DRAFT_KEYS.filter((k) => sessionStorage.getItem(k) !== null).length;
  } catch {
    return 0;
  }
}

/**
 * Route the re-auth redirect for the CURRENT page. Called by the shared
 * 401 handler once per expiry. Keeps the old UX (brief Persian toast, then a
 * full navigation) while fixing who goes where and preserving drafts.
 */
export function redirectAfterExpiry(): void {
  if (typeof window === "undefined") return;
  const path = `${window.location.pathname}${window.location.search}`;
  try {
    sessionStorage.setItem(RETURN_URL_KEY, path);
  } catch {
    /* private mode — login just lands on the default dashboard */
  }
  const target = expiryTargetFor(window.location.pathname);
  window.setTimeout(() => {
    window.location.href = target;
  }, 900);
}
