# Owner Day-Of Loop — Design Review (post-roadmap)

**Commit**: fixes `bd2a2ac` (spec: `specs/013-owner-day-loop/spec.md`)
**Surfaces**: `/owner` dashboard (timeline, day strip, stats strip, action
buttons), `booking-modal.tsx`, `block-time-modal.tsx`, `manual-reserve-modal`
(re-audited), shared `jalali-calendar.tsx` (owner strip + month modal), shared
header chrome (`app-header`, `theme-toggle`), `use-bookings-polling`.
**Method**: full code review of the loop the owner repeats every working day
(open → scan → tap booking → flip status/paid → walk-in → block time), plus
live production probes at 375×667 for the shared chrome. The timeline's
overlap rendering needs a real owner session to walk live — geometry is pinned
by tests instead (honest limit, consistent with AUDIT-011/012).

## What is genuinely good (worth saying)

- **The timeline is a crafted artifact**: lane-splitting for overlaps,
  service-coded accent colors, compact mode under 64px card height, a
  live "now" line, 96px/hour density giving 30-minute cards a 48px tap
  target, and keyboard/screen-reader labels including payment state.
- **Deleted services don't break the day**: name snapshots keep timeline
  cards readable and `price_total` keeps prices real even when the service
  row is gone.
- **Two suspicions dissolved under scrutiny** (recorded so nobody re-audits
  them): the now-line is *not* stuck at midnight — it recomputes on every
  10s poll re-render; the unpaid/طلاب numbers are *not* inconsistent — the
  stats strip counts the day's unpaid bookings while the earnings card shows
  paid-in-window accounting. Different scopes, both correct.

## Findings & Fixes (commit `bd2a2ac`)

| # | Severity | Principle | Finding | Fix |
|---|---|---|---|---|
| 1 | **HIGH** | P1, P5 | **Overlapping timeline cards fused into one blob.** Lane layout carved width as `(1/laneCount) − 4px` — a *shared edge* between adjacent lanes. At two overlapping bookings each card had zero background gap on its inner edge; the pair read as one card, and the tap targets abutted. LANE_MIN_WIDTH rescued 3+ overlaps but not the most common case: two. | Per-card seam: both edges now inset by `LANE_SEAM_PX = 4` (2×4px total), giving every lane visible separation at any overlap count. |
| 2 | **HIGH** | P1, P2, P5 | **The owner's day strip faked a disabled state.** Fully-booked chips rendered `bg-muted opacity-40` + «تکمیل» — visually disabled — but remained clickable and opened the dead-end day. The customer strip (AUDIT-010) disables the same chips; the owner surface contradicted it. | `disabled={isFullyBooked && !isSelected}` on the strip chip — parity restored (P2). |
| 3 | **HIGH** | P5 | **`icon-sm` was 32×32 with no hit extension — app-wide.** The shared header's theme toggle + hamburger (on *every* page, customer and owner), every dialog/sheet close button, and the owner users/highlights row actions all measured 32px against the 44px minimum. Ten audits looked at page content; the shared chrome slipped through all of them. | `--btn-sm: 32px → 44px` (token-level fix, P2): every `icon-sm` consumer becomes compliant at once; verified live on the header at 375×667. |
| 4 | **MEDIUM** | P1 | **The owner's month modal dismissed on backdrop tap.** The owner scans months for an off-day; a stray outside tap silently discarded the selection and closed the dialog — an accidental, invisible-cancel on a form-like surface. | Backdrop no longer closes; closing is a decision (بستن button or Escape). Grammar matches destructive confirmations. |
| 5 | **LOW** | P6 | Past cells in the owner modal stacked `text-muted-foreground` **and** `opacity-30` — a contrast double-dip on a state that is already non-interactive (readability of the archive matters when the owner reviews history). | Dropped the extra opacity; the muted token alone (AA-governed by the contrast suite) carries the state. |

## Non-findings (verified correct)

- Booking modal: in-flight mutation guard, status transition menu driven by
  `VALID_TRANSITIONS`, destructive delete behind an AlertDialog, `tap-44`
  extended hit areas on the SMS/call buttons, AA theme-aware status colors.
- Block-time modal: midpoint defaults, end-after-start validation, reason
  field correctly absent (removed in AUDIT-005 as a fake feature).
- Manual reserve: clamped durations, midnight-crossing refusal, fixed Persian
  catch.
- Block removal: day-scoped index → global object lookup (never deletes
  another day's block); optimistic rollback with full-replace guard.
- Polling: 10s + focus/visibility refresh, request-collapsing in context.

## Honest limits

- **Overlap seam rendering**: pinned by source contract (constant + layout
  math) but not photographed live — needs a real day with two overlapping
  bookings (owner phone-walk item).
- **44px token ripple**: `icon-sm` consumers verified at the token level and
  live on the shared header; a full per-page re-measure rides the next
  quarterly sweep (baseline S12 added).

## Governance

5 new contract tests (suite **232/232**): seam constant + no shared-edge
regression, strip disabled parity, backdrop grammar, token value, and
timeline a11y label stability.
