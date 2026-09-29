# Owner/Admin Error Surfaces — Persian-Only Sweep (post-roadmap)

**Commit**: fixes `dd34d21` (spec: `specs/011-owner-error-leaks/spec.md`)
**Trigger**: AUDIT-010 found raw English ("Failed to fetch") reaching the
customer booking UI. Same question asked of every owner/admin surface.
**Scope swept**: `salon-context.tsx` (all handlers), `db/data.ts` (all throws),
owner components (`service-manager`, `manual-reserve-modal`, `block-time-modal`,
`schedule-manager`, `booking-modal`, `timeline`, `activity-log`,
`earnings-modal`), owner pages (schedule, settings, highlights, users, index),
admin pages (bootstrap, export, import, layout, login), customer cancel
surfaces (`/bookings`, `/profile`), and all `src/app/api/**` error bodies.

## What is genuinely good (worth saying)

- **The API layer is Persian-first across the board**: every `error:` body in
  `src/app/api/**` is Persian (auth, admin, owner, uploads, bookings) — the
  English that reached UIs came almost entirely from *client-side* fallbacks,
  not the server.
- **Most owner components already sanitize**: manual-reserve shows a fixed
  Persian retry string; admin pages catch with fixed Persian toasts; owner
  settings uploads toast fixed Persian; `toast.error(...)` call sites were
  Persian literals in the overwhelming majority.
- **The `نشست منقضی شده` (session expired) sentinel pattern** used by
  highlight handlers is a sound idea — the sweep keeps it working by ensuring
  the passthrough branch preserves it.

## Findings & Fixes (commit `dd34d21`)

| # | Severity | Principle | Finding | Fix |
|---|---|---|---|---|
| 1 | **HIGH** | P4 | **`db/data.ts` threw English fallbacks on 7 owner write paths** — "Failed to save/delete highlight( image)", "Failed to update working hours", "Failed to cancel booking", "Failed to save booking" (manual). These became Error messages that owner catch blocks happily toasted verbatim: a network or server failure showed the salon owner English. | All 7 converted to Persian (`ذخیره هایلایت انجام نشد`, `خطا در ذخیره ساعات کاری`, `لغو نوبت انجام نشد`, `ثبت رزرو دستی انجام نشد`, …). Server Persian bodies still pass through first. |
| 2 | **HIGH** | P4 | **`updateServices`/`updateAddons` returned raw `e.message`** — the exact leak AUDIT-010 fixed on the booking path, one drawer over: a network failure during service/addon save surfaced English in the owner's save-error banner. | Routed through the shared sanitizer with Persian fallbacks (`ذخیره خدمات انجام نشد — …`). |
| 3 | **MEDIUM** | P4, P2 | **Sanitizer was trapped inside salon-context.** Owner components couldn't reuse it — which is *why* they grew their own raw-message toasts. | Promoted to `src/lib/error-sanitize.ts` (P2 one source of truth); salon-context now imports it. |
| 4 | **MEDIUM** | P4 | **Owner schedule save toasted raw `error.message`** (trusted the server Persian, but a network failure — the most common failure for a schedule save on mobile — would have leaked English). | `persianizeError(error, "خطا در ذخیره ساعات کاری")`. |
| 5 | **MEDIUM** | P4 | **Service-image upload toasted raw `error.message`** (server upload errors are Persian, but offline uploads leak "Failed to fetch"). | Same sanitizer swap. |
| 6 | **LOW** | P4 | **Customer cancel sheets (`/bookings`, `/profile`) toasted raw `error.message`** in their catch branches (belt-and-suspenders — the context handler beneath them was already sanitized in AUDIT-010, but a throw from `onCancel` itself could still bypass). | Same sanitizer swap; contract test pins both pages. |

## Non-findings (verified correct)

- **All API routes**: Persian error bodies everywhere (spot-audited all
  `error: "` literals; the only English is server-side `console.error`, which
  is correct and invisible to users).
- **manual-reserve-modal**: fixed Persian `ثبت رزرو انجام نشد؛ دوباره تلاش کنید` ✓.
- **block-time-modal / booking-modal / timeline / activity-log /
  earnings-modal**: no raw error propagation found.
- **Admin bootstrap/export/import pages**: fixed Persian catches ✓.
- **Owner settings page**: fixed Persian toasts on every catch ✓.
- **`update-salon` non-Error rethrow**: converted English fallback to Persian.

## Honest limits

- **Owner pages behind auth were not walked live** (owner credentials live
  outside this machine). The sweep is code-review-exhaustive over every
  `.message` propagation path plus contract tests; a logged-in toast walk
  (save a service offline, upload offline, expire session) stays on the
  designer checklist.
- **SMS provider / Vercel API error bodies** (external services) could
  theoretically return English; they reach only server logs, never UI toasts.

## Governance & regression guards

Five new source-contract tests in `booking-errors-persian.test.ts` (suite now
**223/223**): single sanitizer definition (P2), Persian fallback inventory in
`data.ts`, sanitize-before-toast on schedule + upload, and no raw
`error.message` toasts on the customer cancel pages. Combined with AUDIT-010's
nine, the Persian-only error contract is now pinned end to end — server
message, client library, context handlers, and component toasts.
