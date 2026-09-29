# Session-Expiry Flow — Dedicated Pass (post-roadmap)

**Commit**: fixes `88060ba` (spec: `specs/012-session-expiry/spec.md`)
**Trigger**: designer follow-up to AUDIT-010/011 — the expiry flow was the last
surface where a failure could cost real work.
**Scope**: `db/data.ts` (`handleAuthExpiry`), new `src/lib/session-expiry.ts`,
`schedule-manager.tsx`, `service-manager.tsx`, owner + customer login pages,
session machinery review (`owner-auth.ts`, `session-config.ts`, layouts).

## How expiry actually works (and what it cost)

Sessions are a signed 30-day cookie shared by customers and owners. There is
no client-side countdown — the *only* expiry signal is the first API call that
returns 401. The shared handler toasted «نشست شما منقضی شده است» and hard-
redirected to `/owner/login` after 900 ms. That single behavior had three
user-facing defects:

| # | Severity | Principle | Finding | Fix |
|---|---|---|---|---|
| 1 | **HIGH** | P1, P9 | **The redirect ignored who the user is.** An expired *customer* firing a request from a shared surface (`/bookings`, `/profile`, booking flow) was shipped to the **owner login** — a wall of "ورود مدیر" they cannot pass, with no path back. | `expiryTargetFor()` routes by surface: `/owner/**` and `/admin/**` → owner login; everything else → customer login. Single decision point in `session-expiry.ts`. |
| 2 | **HIGH** | P1, P5 | **The redirect abandoned unsaved owner work.** The owner mid-way through a schedule change (13 fields), a service rename, or addon edits lost everything on expiry — and equally on an accidental refresh, since nothing persisted drafts. | All three forms now persist dirty state to **sessionStorage** (per-tab, survives the redirect): schedule-manager on every edit, service-manager at the `markChanged` chokepoint in both tabs. Drafts restore exactly once on return, flag the save bar dirty, and are cleared on save/discard. The existing `hasChanges` prop-sync guard protects the restored draft from later refreshes. |
| 3 | **MEDIUM** | P1, P3 | **After re-auth everyone landed on `/owner?welcome=1`** (hardcoded) — an owner bounced from the schedule page had to find their way back manually; a customer bounced from the booking flow landed on the owner dashboard. | Both login pages consume a return-to stash (path + query, per-tab, cleared on use). Customer login keeps the destination through the new-user registration step (`returnToRef`). Defaults unchanged for fresh logins. |
| 4 | **LOW** | P5 | The expiry toast was fine, but nothing told the owner their work survived — silent recovery reads like luck. | Owner login shows «تغییرات ذخیره‌نشده شما حفظ شد» **only when drafts actually exist** (counted from the contract keys) — the message cannot lie. |

## Preserved (deliberately unchanged)

- The 2.5 s Persian expiry toast and 900 ms delay (readable, non-jarring).
- The single-fire guard (`authExpiryHandled`) — a page firing 5 reads on an
  expired session redirects once, not five times.
- Auth-expiry handling inside salon-context mutations (rollback + «نشست
  منقضی شده» passthrough) — compatible with the new router since the Persian
  text passes the P4 sanitizer.
- `owner/users/page.tsx`'s direct `handleAuthExpiry` calls — same shared
  behavior for free.
- Server-side session invalidation (stale-cookie detection, role checks) —
  reviewed, correct, untouched.

## Data-loss surface after this pass

- Schedule edits: survive expiry redirect + login. ✓
- Services/addons pending lists: survive. ✓
- Individual open dialogs' *form* fields (service form inside the manager):
  the pending list survives; a half-typed new-service form does not —
  acceptable, listed honestly as the remaining edge.
- Customer booking flow: expiry mid-flow re-lands on `/book` (fresh flow);
  verification data lives server-side, nothing else to lose. Phone/name
  re-entry is the pre-existing behavior for a 30-day lapse.

## Honest limits

- **No live expiry walk**: forcing a real 401 requires an expired session or
  owner-credentials this machine doesn't hold. All wiring is pinned by 4 new
  contract tests; the end-to-end walk (edit schedule → expire → login →
  resume) is a designer phone-walk item.
- **sessionStorage scope**: per-tab by design. A second owner tab doesn't see
  the first tab's drafts (this is the safe direction; cross-tab sync would
  risk injecting stale edits).

## Governance

4 new contract tests in `booking-errors-persian.test.ts` (suite **227/227**):
surface-aware routing with no hard-coded owner redirect, draft
stash/restore/clear wiring in all three forms, return-to consumption in both
login pages including the draft-preserved toast that cannot lie.
