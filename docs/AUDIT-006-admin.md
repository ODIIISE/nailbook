# Admin Surfaces Audit — Phase 9 (minimal pass)

**Commits**: fixes `830043d` · this report
**Spec**: `specs/006-admin/spec.md`
**Surfaces**: `/admin/login` · `/admin` (overview/bookings/customers/operations/alerts tabs) · `/admin/salons` (+ new/[id]) · `/admin/import` · `/admin/export` · `/admin/migrate` · `/admin/bootstrap`
**Method**: code review + mechanical sweeps + live probe of the public login page. Admin- authenticated pages need super-admin creds (Vercel-only) — code-review verification, honestly limited.

## Verdict

Admin code was already clean on the mechanical axes — the sweeps found zero
opacity-disabled states, zero palette strays, zero English ARIA labels, zero
sub-44px controls, and the import/export/migrate/bootstrap tools had no
violations at all. The real findings were *dead ends and data language*: two
permanent blank frames on fetch failure and Latin digits on an otherwise
Persian dashboard.

## Findings & Fixes (commit `830043d`)

| # | Severity | Principle | Finding | Fix | Verified |
|---|---|---|---|---|---|
| 1 | **HIGH** | P5/F5 | Admin dashboard: `if (!stats) return null;` — a failed stats fetch rendered a **permanent blank page** (after the spinner ended). | Explicit error state: icon + «آمار بارگذاری نشد» + تلاش مجدد (reload) | new state string found in deployed chunk `0rushrf4rf5y7.js` |
| 2 | **HIGH** | P5/F5 | Salon detail (`/admin/salons/[id]`): on fetch **throw** it toasted «خطای سرور» then rendered `null` forever — blank page once the toast dismissed. | Explicit error state + «بازگشت به فهرست سالن‌ها» button | code review + build |
| 3 | **MEDIUM** | P5/P2 | Admin login: button silently disabled on invalid input (the exact dead-button pattern AUDIT-001 removed from customer login); raw phone not normalized (Persian digits rejected by length check); error had no `role=alert`. | Customer recipe applied: normalize digits (`normalizeDigits`), enabled-while-idle with tap-to-explain, `role=alert` | **live probe on production**: bad input → button enabled, tap → «شماره موبایل معتبر نیست» in `role=alert` |
| 4 | **LOW** | P4 | Latin digits across the dashboard: today's bookings, quick stats (سالن/کاربر/رزرو کل), all rate cards (`%`), top-customer/service booking counts, alert badge counts, salon-table booking counts. | `toPersianDigits` + Persian «٪» everywhere data is displayed | code review + build |
| 5 | **MEDIUM** | P5 | Salon comparison table: row-level `onClick` pseudo-button (unreachable by keyboard/SR), dead `router` prop threading. | Real `<Link>` on the salon name; row is plain; prop removed | code review + build |

## Deliberate non-findings

- Admin layout's `return null` — transient state while redirecting to login on
  401; every failure path navigates away. Exempt by FR-001.
- Desktop-width tables and dense charts: admin is a desktop-first internal
  tool; density intentional, consistent tokens verified.

## Verification

- `npm run check` green (lint + tsc + 169/169) at `830043d` (two transient
  type errors from the digit conversions caught and fixed before commit).
- Deploy identity: «آمار بارگذاری نشد» in deployed dashboard chunk.
- Live runtime probe: admin login tap-to-explain behavior confirmed on
  production (public page).
- Authenticated admin states: code review only — super-admin credentials live
  only in Vercel (same limit as Phases 6/8, recorded).

## Roadmap position

Phases 0–9 complete. Remaining: **10** (craft: motion review, icon sweep,
mobile-native audit) and **11** (hardening: viewport matrix, dark mode, WCAG
floor, performance).
