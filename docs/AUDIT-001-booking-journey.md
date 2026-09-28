# Booking Journey Audit — Findings & Fixes

**Spec**: `specs/001-booking-journey/spec.md` · **Constitution**: `.specify/memory/constitution.md`
**Scope**: `/book` flow, `/bookings`, `/login`, `/portfolio`, `/` (admin-mode landing)
**Environment note**: local DB was unreachable during probing → API 500s; that made the
*error/empty states* fully exercisable (a real user-facing path). On the healthy server,
the empty salon renders the intentional empty state correctly.

## Fixed in this pass (verified: tsc + lint + 169/169 tests + runtime)

| # | Finding | Severity | Principle | Fix |
|---|---|---|---|---|
| 1 | **All API routes 404 in `next dev`** — Turbopack inferred the wrong workspace root from a stray `C:\Users\<user>\package-lock.json`; pages compiled, every route handler dead | **CRITICAL** (dev-env) | P10 | `turbopack.root: __dirname` in `next.config.ts`; verified routes resolve |
| 2 | Failed data load renders as **"no services yet"** — a DB/network error lies to the user and offers no action | **HIGH** | P5, P3 | `loadFailed` signal on salon context; booking flow shows a distinct error state with a retry button |
| 3 | Review-step edit buttons 28px tall — **touch-target violation** | HIGH | P5 | 44×44 min (`min-h-11 min-w-11`), verified 44×61 at runtime |
| 4 | Login OTP boxes keep the wrong code after a failed verify (booking flow had the fix; login didn't) | MEDIUM | P5 | `key={otpAttempt}` remount, same pattern as booking flow |
| 5 | Invalid phone on login = silently disabled button — **no visible reason** = missing state | MEDIUM | P5 | Button enabled while idle; tap shows the inline validation error (verified at runtime) |
| 6 | 9 raw `disabled:opacity-50/40` one-offs across primitives + pages — inconsistent, some illegible | MEDIUM | P2, P6 | Migrated to the token recipe (`bg-primary/15 text-foreground/60`, or `/60` for inline toggles/menus); sweep count now **0** |

## Verified working (no change needed)

- RTL + Persian digits + Estedad everywhere probed; `dir="ltr"` on phone input
- Header pattern consistent (44/1fr/44) across `/book`, `/bookings`, `/login`
- Bookings logged-out, empty, and error paths render intentional states
- Portfolio empty state is well-written
- 48px primary buttons; 44px icon buttons; slot/day cells 64px tall
- Sold-out race, auto-anchor, double-submit guards: logic untouched and green

## Not verifiable locally (environment, not code)

- Real OTP send/verify (SMS provider) — audited by code review: cooldown + double-submit + reset patterns present and consistent after #4
- Actual booking submission (no real bookings created, per spec)
- Homepage editorial view (requires SALON_ID pointing at a provisioned salon)

## Open items (for designer decision)

1. **Skin decision** (custom vs daisyUI) — still pending; not blocking
2. Booking-flow service cards use `rounded-lg` (12px) while cards elsewhere are `rounded-2xl` (16px) — candidates for unification in the consistency pass (Phase 7)
3. Admin landing (`/` in admin mode) is plain but functional — lowest priority per roadmap
