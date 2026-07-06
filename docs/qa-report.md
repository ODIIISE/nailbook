# NailBook QA Report

## Critical (5)

| # | Issue | File | Fix |
|---|-------|------|-----|
| C1 | No server-side slot lock — two customers can book same slot | `content.tsx` | Add optimistic lock or reservation endpoint before confirm |
| C2 | Owner session cookie is raw UUID, not HMAC-signed | `owner-login/route.ts` | Sign cookie with HMAC, verify on each request |
| C3 | No brute-force protection on owner login | `owner-login/route.ts` | Add rate limiting and lockout after 5 failures |
| C4 | Phone enumeration via check-phone API | `auth/check-phone/route.ts` | Return same response for existing and non-existing phones |
| C5 | Owner could delete own account (already fixed) | `owner/users/route.ts:129` | ✅ Guard exists |

## High (7)

| # | Issue | File | Fix |
|---|-------|------|-----|
| H1 | handleRemoveBlock filters wrong array in owner page | `owner/page.tsx:85` | Fix filter to match correct field |
| H2 | Phone input accepts dashes, spaces, letters | `login/page.tsx`, `book/content.tsx` | Strip non-digits in normalizeDigits |
| H3 | Jalali year doesn't increment crossing month 12 | `slots.ts:293-300` | Add `if (jm > 12) { jm = 1; jy++; }` |
| H4 | Payment state lost on page refresh (ephemeral Set) | `owner/page.tsx` `paidBookings` | Persist to DB or localStorage |
| H5 | `selectedBooking` typed as `any` | `owner/page.tsx:29` | Type as `Booking \| null` |
| H6 | Booking detail shows "۰ تومان" when service missing | `bookings/page.tsx` | Show "نامعلوم" fallback for price too |
| H7 | Confirm booking button allows double-click | `content.tsx:528` | Add `disabled={isLoading}` during confirm |

## Medium (8)

| # | Issue | File | Fix |
|---|-------|------|-----|
| M1 | Anti-spam error silently ignored (empty catch) | `content.tsx:220` | Log error or show warning |
| M2 | No year picker in calendar modal | `jalali-calendar.tsx` | Add year dropdown |
| M3 | `selectedBooking` in owner uses `any` type | `owner/page.tsx:29` | Apply Booking type |
| M4 | Jalali year boundary in nearest-slot finder | `slots.ts` | Fix year increment logic |
| M5 | Booking detail missing service shows zero price | `bookings/page.tsx` | Handle missing service gracefully |
| M6 | PIN inputs render as type="text" (visible) | `owner/users/page.tsx` | Use type="password" or pattern |
| M7 | 10s polling interval fragile if deps change | `owner/page.tsx:34` | Current deps correct, but document risk |
| M8 | Login page has no back button from PIN step | `login/page.tsx` | Add back navigation |

## Low (7)

| # | Issue | File | Fix |
|---|-------|------|-----|
| L1 | Profile page is read-only (no edit) | `profile/page.tsx` | Add edit mode |
| L2 | Hardcoded 15-min dead-gap threshold | `slots.ts:138` | Derive from config |
| L3 | Style tag injected inside flex on every render | `jalali-calendar.tsx:152` | Move to globals.css |
| L4 | Touch drag preventDefault blocks pull-to-refresh | `jalali-calendar.tsx:113` | Only prevent on horizontal movement |
| L5 | formatDate can show "Invalid Date" for null dates | `owner/users/page.tsx:220` | Guard against null/empty |
| L6 | No loading skeleton for booking confirm step | `content.tsx` | Add skeleton during confirm |
| L7 | Service manager priority_score field missing from edit form initial state | `service-manager.tsx` | Ensure form resets include priority_score |

## Summary

| Severity | Count | Theme |
|----------|-------|-------|
| Critical | 4 | Security: auth, session, brute-force, enumeration |
| High | 7 | Data integrity: double-booking, wrong filters, type safety |
| Medium | 8 | UX gaps: missing back nav, no year picker, silent errors |
| Low | 7 | Polish: read-only profile, hardcoded values, minor a11y |

## Priority Order

1. Fix C1 (double-booking protection) — most impactful bug
2. Fix C2 (sign owner cookie) — security
3. Fix C3 (brute-force lockout) — security
4. Fix H1 (wrong array filter) — data corruption
5. Fix H7 (double-click confirm) — duplicate bookings
6. Fix H3 (Jalali year boundary) — date calculation errors
