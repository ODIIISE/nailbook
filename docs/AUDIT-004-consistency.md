# Cross-Screen Consistency Pass — Phase 7

**Commits**: fixes `171d272` · this report
**Spec**: `specs/004-consistency-pass/spec.md`
**Surfaces**: all customer (`/bookings`, `/profile`, `/portfolio`, `/login`, `/book`) + owner (`/owner/*`) + admin chrome
**Method**: mechanical grep sweeps (banned patterns) + targeted code reading of every hit; screenshots for the skin decision

## Verdict

The token system built in Phases 0–6 held up well: `font-extrabold` 0 hits,
`shadow-[...]` 0 hits, owner shell deliberately distinct (AppHeader + navbar,
`max-w-lg` — operational layout by design, not drift). What remained was a
short list of **stray survivors**, all fixed in `171d272`.

## Findings & Fixes

| # | Severity | Principle | Finding | Fix |
|---|---|---|---|---|
| 1 | MEDIUM | P2 | Owner booking-modal: local `text-blue-700/400`, `text-violet-700`, `text-amber-700/500` icon tints bypassed tokens | Neutral `muted-foreground` for category icons (same recipe as customer rows); price on `--warning` |
| 2 | MEDIUM | P5 | Booking calendar past-day cells: `disabled:opacity-30` (unreadable-disabled) | `disabled:text-muted-foreground/70` readable recipe |
| 3 | LOW | P2 | Admin alerts: `border-yellow-500` | `border-warning` token |
| 4 | LOW | P2 | Owner users: `text-amber-500` lock icon | `text-warning` token |
| 5 | LOW | P5 | Profile «همه نوبت‌ها»: 36px target | `min-h-11` (44px) |
| 6 | LOW | P2 | booking-modal arbitrary radii `rounded-[10px]`, `rounded-[8px]` | radius scale (`rounded-md`, `rounded-sm`) |
| 7 | INFO | P2 | Stock primitives (dropdown/select/tabs/label) carry `disabled:opacity-60`-style recipes | **Accepted for now** — stock Base UI wrappers, one-shot sweep candidate when touched next |
| 8 | INFO | — | Owner timeline/modal status hexes (blue/green/violet) differ from customer pill colors | **Accepted deviation** — sanctioned categorical palettes in `design-tokens.ts`, AA-tuned per theme; owner ops need 7-status discrimination, customer surfaces need 6-status simplicity |

## Deliberate non-findings (verified, not drift)

- Owner surfaces don't use the customer 44/1fr/44 header — the shared
  `AppHeader` (salon name + theme toggle + menu) + bottom navbar is the
  designed operational shell; consistency comes from the shell, not the header.
- `design-tokens.ts` palettes (timeline blocks, activity dots, `statusBadgeClass`)
  are the sanctioned single source for categorical data colors.

## Skin decision (pending since Phase 0) — RESOLVED

**Keep the custom skin.** Decided by the designer from the live side-by-side
(`docs/skin-side-by-side.html`, committed): the daisyUI 5 "forehand" theme
encodes the *same values* as the current skin, so adoption would buy component
convenience at the cost of a migration for near-zero visual change — while the
custom token system just finished proving itself across seven phases of audits.

Consequences:
- No daisyUI dependency; Base UI primitives + custom recipes remain the system.
- `status-pill.tsx` + `design-tokens.ts` + globals tokens are the canonical
  vocabulary; new screens compose from these.
- Reversal requires a new decision record — drift is not a decision path.

## Verification

- `npm run check` green (lint + tsc + 169/169) at `171d272`.
- Sweep re-run post-fix: palette-color chrome hits 0 (outside design-tokens.ts
  + status-pill comment), `disabled:opacity-*` in app code 0 (stock primitives
  documented as accepted), arbitrary radii outside landing 0.
- Pushed to `main` → Vercel auto-deploy (same deploy identity verification as
  Phases 5b/6 applies on next live walk).
