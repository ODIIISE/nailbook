# AUDIT-015 — Live verification walks on production (real machinery, zero SMS)

**Date:** 2026-09-30 · **Runs against:** `forehand.vercel.app` (production) · **Commits:** `7115a11`→`18c83ea` · **Tests:** 236/236 throughout

## Why this audit exists

AUDIT-001 through 014 verified code with static analysis, unit tests, and unauthenticated browser inspection. What no audit could verify was the **authenticated machinery itself** — the real `verify-otp` → session cookie → booking → cancel chain, and the owner gate → timeline → status flips chain — because logging in meant sending a real SMS to a real phone.

AUDIT-015 removed that blocker with a **temporary secret-gated test hook** (isolated route `src/app/api/auth/test-mint/route.ts`, zero edits to real auth code), used under the owner's explicit authorization: *create fake users, run everything, fix what breaks, then clean up.* The hook shipped for a few hours across commits `7115a11`→`ec4f2ea` and was **deleted in `18c83ea`** — the repo is pristine again.

## Technique: real session machinery, zero SMS

1. Hook `mint` created two users in the real DB (customer `09301112233`, owner `09304445566`, name «کاربر آزمایشی», roles arrays per the `owner/users` insert shape) plus an OTP row with fixed code `144535`.
2. In the test browser, `window.fetch` was overridden to intercept **only** `/api/auth/send-otp` and return `{success:true}` — the UI believed a code was sent; **no server SMS path ever executed**.
3. Entering `144535` hit the **real** `/api/auth/verify-otp`, which validated against the real `otps` table and signed a real 30-day session cookie. Everything downstream was production code on production data.

Learned quirks (all handled): `verify-otp` **deletes** the OTP row on success (fixed code is single-use — refresh action added to the hook); real OTP expiry is 5 min (hook minted 15 — first expiry path observed live); re-entering an identical stale code fires no input events (clear-then-type needed); one browser profile = one cookie jar (owner login replaced the customer session — race required an incognito tab).

## Walk results

| # | Walk | Result | Evidence |
|---|------|--------|----------|
| P2 | Customer: /book at 375×667 → service → فردا → ۱۲:۰۰ → contact → OTP → session → confirm → success receipt `BK-8F224C` (۱۴۰۵/۰۷/۰۸ · ۷۰۰,۰۰۰ · ۶۰ دقیقه) | **PASS** | Real session user in `/api/auth/me`; receipt + bookings list + detail sheet all correct; Persian digits & Jalali dates throughout |
| P2 | Cancel booking via detail sheet | **FAIL → FIXED → PASS** | Real production bug found (below). After fix: `PATCH → 200`, server status `cancelled`, UI لغو شده |
| P3 | Sold-out race: owner created booking via real `/api/owner/bookings` on ۱۲:۰۰–۱۳:۰۰; customer confirmed same slot | **PASS** | `POST /api/book → 409`; red `role="alert"` banner «این زمان در لحظه قبل رزرو شد — لطفاً زمان دیگری انتخاب کنید»; bounce to step 2; grid refresh disabled+dims ۱۲:۰۰/۱۲:۱۵, re-suggests ۱۳:۰۰ |
| P4 | Owner: /owner/login → timeline → status/paid flips → schedule draft → return-to | **FAIL → FIXED → PASS** | Owner gate accepted minted owner; timeline rendered رزرو دستی booking; `POST /api/owner/bookings/status → 200`, status `confirmed`+`paid:true` persisted; schedule 12:00→12:30 saved, survived reload, reverted; return-to → /owner safe landing |

## Bugs found and fixed (both live-verified after fix)

### 1 · HIGH — Customer cancel 401'd for every legitimate customer (`3db2c5f`)

[src/app/api/bookings/[id]/route.ts:44](../src/app/api/bookings/[id]/route.ts) called `verifyCustomerSessionWithVersion()` **without `await`** — the truthy Promise passed the null-check, then failed `booking.user_id !== customerUserId` (Promise ≠ string), so **every** customer cancel attempt returned 401 «غیرمجاز». The owner path (Bearer/`verifyOwner`) worked, masking the bug from owner-only walkthroughs. Diagnosed with a temporary `patch-replica` probe in the hook that reproduced the exact divergence (`sessionUserId: {}`). One-word fix: `await`.

### 2 · MEDIUM — Hamburger menu kept guest state after owner login (`0adfd43`)

Owner login primes `nailbook_user` in localStorage then client-side-redirects; the already-mounted AuthProvider never heard about it (same-tab writes fire no `storage` event; its session validation runs once on mount), so the role-aware hamburger menu showed **«ورود / ثبت‌نام»** instead of the owner AccountCard until a full reload. After a full reload the menu rendered correctly — confirming the SPA-path-only scope. Fix: login dispatches a same-tab `nailbook:auth-sync` event; AuthProvider listens and re-reads the cache. Verified live: menu shows کاربر آزمایشی · مدیریت · خروج از حساب with no reload.

Also observed (correct, recorded as evidence): expiry error «کد منقضی شده است» renders correctly; failed OTP bounces the booking flow to the time step with the error handled gracefully; anti-spam guard fired a real «لطفاً 4 دقیقه دیگر صبر کنید» cooldown message (the P2 booking had used the phone ~55 min earlier).

## Residue report

Cleanup ran via the hook (`action:"cleanup"`, both phones) before hook deletion; returned rowCounts:

| Table | Deleted |
|---|---|
| activity_logs | 10 |
| bookings | 2 (customer's cancelled booking + owner race booking) |
| otps | 0 (both consumed by real verify DELETE — expected) |
| users | 2 (test customer + test owner) |

Hook route file **deleted from repo** in `18c83ea`; deploys rebuilt from that commit are hook-free. Two cleanup-side fixes (`activity_logs` table name, `id::text` cast) were needed inside the hook itself and are part of the temporary commits.

## Honest limits

- The SMS-delivery step itself is by definition untested (that is the one step the design exists to skip). Its observable contract — `verify-otp` accepts only a code matching the live `otps` row, with expiry/attempt limits — **was** exercised for real.
- Cancel-side money/refund flows are out of scope (نحوه پرداخت در سالن — nothing to refund; status flip only).
- The exact slot-refresh UX after 409 was verified via DOM state (disabled + dimmed buttons); pixel-level polish remains the designer's thumb judgment per the standing checklist.
- Cleanup covered `bookings`, `otps`, `users`, `activity_logs` keyed by the two test phones. Any table outside those (none known to exist for this flow) is out of the report's scope.
- Sessions signed during the walk remain technically valid for 30 days, but their user rows are gone, so every DB-checking verifier (`me`, `bookings`, `owner/*`) rejects them fail-closed; the two browser profiles were also cleared locally.

## State after this audit

- `main` tip `18c83ea`: hook gone, tree pristine, 236/236 tests green.
- Two real bug fixes shipped and live-verified (`3db2c5f`, `0adfd43`).
- The «remaining acceptance step» from the mission report (authenticated phone walks) is now **closed by these walks**; what remains for the designer is only taste-level judgment on a real device.
