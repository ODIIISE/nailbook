# Customer Surfaces Audit — Phase 6

**Live**: https://forehand.vercel.app (production, designer-authorized)
**Spec**: `specs/002-customer-surfaces/spec.md`
**Surfaces**: `/bookings` (+ detail sheet) · `/profile` · `/portfolio` · `/login` (+ receipt `/bookings/[id]`)
**Method**: full code review of all four surfaces + runtime probes on production at 390×844

## Verdict

The customer surfaces are structurally sound: consistent 44/1fr/44 headers,
designed empty/logged-out states everywhere, snapshot pricing respected, cancel
fail-safety correct (sheet stays open + rolls back + explains), polling with
focus refresh, portal-mounted focus-trapped sheet, ESC/scrim close. The login
fixes from AUDIT-001 (`key={otpAttempt}` reset, tap-to-show invalid-phone
error) are confirmed present and were re-verified live.

Findings were cross-surface consistency and accessibility defects, not UX holes.

## Findings & Fixes (commit `9395ae1`)

| # | Severity | Principle | Finding | Fix | Verified |
|---|---|---|---|---|---|
| 1 | **HIGH** | P2 | `STATUS_MAP` + `StatusPill` copy-pasted in 3 files and **disagreeing**: `completed` green on the receipt page, gray on lists; `in_progress` used raw Tailwind amber | Single `src/components/ui/status-pill.tsx`; `completed` unified to neutral (green reserved for «تأیید شده»); `in_progress` on the `--warning` token (`--color-warning` mapped in `@theme`) | `--color-warning` in deployed CSS; zero local `STATUS_MAP` left |
| 2 | **MEDIUM** | P5 | Profile recent-booking cards: `role="button"` div (tabIndex + key handlers) **containing a real cancel button** — nested interactive, breaks SR/keyboard order | Plain container; explicit «مشاهده» button navigates, cancel stays a real sibling button; `stopPropagation` no longer needed | code review + build; authenticated runtime state unreachable from this machine (no OTP) |
| 3 | **LOW** | P4 | Bookings history card kicker `HISTORY` (English) in a Persian app | → `تاریخچه` | absent from all deployed chunks; present in bookings chunks |
| 4 | INFO | P4 | Receipt page kicker `NAILBOOK` (LTR) | **Accepted deviation** — brand wordmark, same class as homepage "Forehand" | recorded in inventory conventions |

## Runtime verification (production, 390×844, RTL)

- `/bookings` logged-out: login CTA card renders, CTA exactly **44px** tall, no horizontal overflow, `dir=rtl`.
- `/login`: Persian digits accepted in the phone field; tap «دریافت کد» with an invalid number → inline `role=alert` «شماره موبایل معتبر نیست» (no dead button).
- `/portfolio`: owner look «کالکشن ویژه» renders, cover image `naturalWidth > 0`, empty state exists for zero looks, RTL intact.
- Deploy identity: new profile string «مشاهده جزئیات نوبت» found in deployed chunk `1njkbeku-z17s.js`; `--color-warning` in deployed CSS `1kncs-hdv-wq0.css`; `>HISTORY<` absent from every referenced chunk.

## Known limits (honest scope)

- **Authenticated states** (bookings list with data, detail sheet, profile
  edit/cancel) were verified by code review and the existing test suite; real
  OTP login sends an SMS to a real phone and was not triggered. These paths
  carry the riskiest logic (cancel rollback), so a designer-side walk after
  their next real booking is recommended.
- The receipt page (`/bookings/[id]`) is server-rendered per request; its
  shared-pill swap is verified by the green build + code review, not by a
  live URL (no booking id available unauthenticated).

## Success criteria check (spec)

- SC-001 ✅ one `STATUS_MAP`; zero raw palette colors in status rendering.
- SC-002 ✅ no nested interactives on `/profile` (static + build; see limits).
- SC-003 ✅ `npm run check` green (lint + tsc + 169/169) at commit `9395ae1`.
- SC-004 ✅ public states probed at 390×844; 375×667/430×932 covered by the same fluid layout tokens (frame column, page-gutter) audited in Phases 0–5b.
- SC-005 ✅ this document.
