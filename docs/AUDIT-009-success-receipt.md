# Success Screen & Printed Receipt — Design Review (post-roadmap)

**Commit**: fixes `6efb579`
**Spec**: `specs/009-success-receipt/spec.md`
**Surfaces**: booking-flow success step (step 4), `booking-confirm.tsx`,
`printed-receipt.tsx` (shared by review-step پیش‌فاکتور and the shareable
`/bookings/[id]` page), bookings list + profile code chips.
**Method**: full code review + contrast computation; the success step itself
requires a real booking (SMS OTP), so runtime walk is recorded as a limit.

## What is genuinely good (worth saying)

This is one of the most carefully crafted artifacts in the app:

- **The receipt reads like print**: paper grain at 3% multiply, perforated
  dashed separators, itemized lines, muted totals block, QR to the shareable
  page, salon identity with logo fallback.
- **Bidi done right**: the Jalali date row isolates every numeric run
  (`<bdi dir="ltr">`) so browser bidi heuristics can't reorder day/month/year,
  with an `sr-only` linear text for screen readers and the visual row marked
  `aria-hidden` — an unusual, correct pattern.
- **The share chain is defensive**: file share → text share (+download) →
  clipboard (+download) → download-only, each with honest toasts; user-cancel
  (AbortError) doesn't scold; fonts awaited before capture; blob URLs revoked.
- Snapshot pricing respected; QR generation has error + loading states.

## Findings & Fixes (commit `6efb579`)

| # | Severity | Principle | Finding | Fix |
|---|---|---|---|---|
| 1 | **HIGH** | P1 (comprehension) | **Two different tracking codes for one booking**: success receipt shows `BK-` + last-6 of the id and the receipt page `#` + last-6, but the bookings list and profile chips showed the **last-4** — a code the customer could never correlate with their receipt or support conversation. | All surfaces unified to last-6 (`slice(-6)`), matching the `BK-XXXXXX` code |
| 2 | **HIGH** | P5 | **Garbled code on the receipt header**: `displayId = bookingId.slice(-8)` applied to the 9-char `"BK-XXXXXX"` string rendered `#K-XXXXXX` — disagreeing with the reference line lower on the *same receipt*. | `slice(-6)` → `#XXXXXX`, with a comment pinning the invariant |
| 3 | **MEDIUM** | P6 (AA) | Receipt header/footer alpha-text (`muted-foreground/70`, `/60`) = **2.5–3.1:1** in light mode on real text (issue date, پیش‌فاکتور label, salon name footer) | Full `muted-foreground` (5.84:1 on card) |
| 4 | **MEDIUM** | P6 | The same alpha-text class in owner surfaces: activity-log ids/timestamps (/40–/60), users join dates, booking-modal duration, schedule help text/icons, service-manager hints | Raised to full `muted-foreground`; **decorative** watermarks (404 numeral, dashboard giant digit, empty-state icons) intentionally keep their alphas |

## Non-findings (verified correct)

- Full UUID never displayed anywhere (the code is `BK-` + last-6).
- Success step hierarchy: receipt → calendar pair → confirm actions →
  navigation pair; all 48px; capture state disables consistently.
- ICS/Google calendar URLs built from the same event data; `dir="ltr"` on
  times/phones; `select-all` on the reference code.
- The `/bookings/[id]` receipt page remains consistent with the artifact
  (same fields, shared status pill since Phase 6).

## Verification & limits

- `npm run check` green (lint + tsc + 169/169) at `6efb579`.
- Deploy identity check via served chunks; the success step itself needs a
  real OTP booking — recommend the designer capture one real receipt image on
  their phone (the share/download path is the one behavior only a real device
  exercises end-to-end).
