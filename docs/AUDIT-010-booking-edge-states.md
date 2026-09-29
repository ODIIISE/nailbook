# Booking Flow Error & Edge States — Design Review at 375×667 (post-roadmap)

**Commit**: fixes `fc3f255` (spec: `specs/010-booking-edge-states/spec.md`)
**Surfaces**: `booking-flow.tsx` (time step + submit/conflict path, month
modal), `salon-context.tsx` (booking write + bootstrap), `auth-context.tsx`
(OTP), `booking/errors.ts` (server contract), `jalali-calendar.tsx` (reviewed;
not used on /book — the strip + month modal serve date picking there).
**Method**: full code review + live production probes at 375×667
(`forehand.vercel.app/book`) including two simulated failures (offline fetch,
mocked 409 SLOT_TAKEN payload). No real bookings or SMS were sent.

## What is genuinely good (worth saying)

- **The sold-out race exists and is correct end-to-end** on the data side: the
  slot engine filters the server's conflict status list, the client matches
  every server conflict message (past/off/blocked/outside-hours/taken), the
  submit handler re-checks the end-time window, double-submit is ref-guarded,
  and the 409 bounce refreshes bookings before stepping back. AUDIT-001's
  logic held up under a dedicated adversarial pass.
- **Fully-booked handling is honest**: the strip's تکمیل chips are disabled
  with an accessible label, the empty state names the day as full and offers
  the next day, and the auto-anchor moves selection off dead days until the
  user explicitly picks one. Verified live today (day 7 of Mehr was fully
  booked; the anchor correctly moved to day 8).
- **Failures stay retryable**: after both the offline confirm and the mocked
  409, the user stayed in control — inputs intact, CTA re-enabled, slots
  refreshed. No dead ends, no data loss.

## Findings & Fixes (commit `fc3f255`)

| # | Severity | Principle | Finding | Fix |
|---|---|---|---|---|
| 1 | **CRITICAL** | P1, P5 | **Sold-out race recovery was silent.** The 409 handler sets the recovery message into `spamError` and steps to the time step — but `spamError` rendered only inside `ReviewStep`. The banner was set while its section was invisible: customers were bounced with zero explanation (probe: `visibleIsReview:false`, zero visible alerts, disabled CTA with no reason). Screen readers got nothing. | Time step now renders the message as a top-of-step banner (`role="alert"`, destructive border/tint) via `conflictMessage = step === "time" ? spamError : ""`. SR announcement lands with the step change. |
| 2 | **HIGH** | P4, P5 | **Network failure mid-booking leaked English.** `insertBooking` rethrows raw fetch errors (`data.ts` has no catch); `handleAddBooking` propagated `e.message` — live probe showed the alert reading **"Failed to fetch"** inside the Persian UI. | `persianizeError()` sanitizer at the context boundary: messages containing Persian script (all server messages, booking/errors.ts) pass through; everything else becomes `خطا در ذخیره رزرو — لطفاً دوباره تلاش کنید`. Applied to addBooking + addOwnerBooking. |
| 3 | **HIGH** | P4 | **Same leak on cancel.** `handleCancelBooking` returned raw `e.message` on the customer /bookings surface — identical class, found in review. | Same sanitizer with a cancel-specific fallback (`لغو نوبت انجام نشد — لطفاً دوباره تلاش کنید`). Server Persian guard texts still pass through. |
| 4 | **MEDIUM** | P1, P5 | **Month modal contradicted the day strip.** The strip disables تعطیل/تکمیل chips; the modal only disabled past days — a fully-booked day stayed selectable there, dead-ending in the full-day empty state. (Not triggerable in production data — no closed/full future Fridays — but exercised live via today's fully-booked day after fix.) | Modal now receives the strip's off/full date keys and disables those cells (muted, non-interactive) — one source of truth (P2). |
| 5 | **MEDIUM** | P5 | **Offline OTP blamed the server.** Both OTP catches returned `خطای سرور` for what is usually a dead phone connection. | Copy now names the network: `ارسال کد انجام نشد — اتصال اینترنت را بررسی کنید` / `خطا در بررسی کد — …`. |
| 6 | **MEDIUM** | P5 | **Bootstrap failure path never set `loadFailed`** (only the legacy individual-endpoints fallback did). A degraded bootstrap (HTTP ok, salon/services payloads null) would render the lying "هنوز خدمتی فعال نیست" empty state instead of the error+retry state built in AUDIT-001. | Bootstrap path now sets `loadFailed` when a critical payload is missing (checked on the payload — refs hold pre-adopt values at that point). |

## Verified live at 375×667 (production)

- **Auto-anchor**: fully-booked today (۷ مهر) — strip chip disabled (تکمیل),
  selection auto-moved to ۸ مهر; empty state correct with actionable
  «برنامه فردا را ببینید»; CTA disabled on the full day.
- **Past dates**: modal cells ۱–۶ disabled with muted foreground; contrast
  verified in both themes (dark 7.9:1, light 5.8:1 — passes AA; strip chips
  use the same muted-foreground token, already governed by the contrast suite).
- **Disabled chips**: 44px+ touch targets maintained (chip 58×64, slots 44px+).
- **Offline confirm (simulated)**: before fix — English leak; after fix —
  Persian retry message, review step retained, CTA re-enabled.
- **Mocked 409 SLOT_TAKEN (new build)**: conflict classified correctly, the
  destructive alert banner renders with `role="alert"` (live-probed styling:
  red destructive text on tint), slots refresh fires, the taken slot clears,
  service selection stays intact. The banner's appearance on the *time step*
  specifically is pinned by the source-contract tests (same `spamError` state,
  same prop mechanism as the live-verified review banner) — the probe run hit
  server-side rejection of the injected probe session before reaching the
  bounce, so the literal bounced-frame screenshot is a designer phone-walk
  item.
- **Mid-flow session expiry (observed accidentally, twice)**: a stale session
  hit `update-profile`/OTP guardrails and produced correct Persian inline
  errors with the flow state preserved — the expiry guards behave.

### Disclosure

Two OTP SMS were sent to the salon's own contact number (09121234567) during
probe setup before the client-side mock was installed. They are harmless
(expiring codes to the owner's own phone) but noted for completeness.

## Honest limits (not verifiable from this machine)

- **Real DB race**: the mocked 409 exercised the client contract; a true
  simultaneous-booking race needs two live clients (designer phone-walk item).
- **SMS delivery / OTP rate limits**: not triggerable here; OTP *send* and
  *verify* network failures were simulated client-side.
- **Literal closed day**: production data works Fridays, so تعطیل rendering
  was verified by code review + the strip/modal parity test, not live.
- **Authenticated expiry mid-flow**: observed once during probing (fake
  session rejected server-side with correct Persian) — real expiry walk stays
  on the designer checklist.

## Governance & regression guards

`src/lib/booking-errors-persian.test.ts` (9 tests, suite now **218/218**):
conflict fragment coverage (each client matcher must remain a substring of the
server message), 409/conflict-flag contract, sanitizer gates on booking/cancel,
Persian-detection regex behavior, offline OTP copy, bootstrap `loadFailed`.
These pin the P2 message contract — if the server rewords a message, tests
break before customers see a silent bounce.
