# Homepage Audit — Editorial Mode (Phase 5b)

**Live**: https://forehand.vercel.app (production, real salon data — designer authorized)
**Viewports walked**: 375×667 · 390×667 · 390×844 · 430×932 · 1440×900
**Source reviewed**: `src/app/(main)/page.tsx`, `salon-booking.tsx`, `lux-home.tsx` (418 lines), `lux-home.module.css`

## Verdict

The homepage is in excellent shape — the AGENTS.md short-viewport degradation ladder
works exactly as specified (image shrinks first: 358px → 256px as height drops from
844 → 667; CTAs and icons never collide; one-viewport holds at every size tested).
Editorial character is strong: splash choreography, parallax, 3D tilt, slideshow with
autoplay + swipe + dots, owner-managed gallery with a sensible demo fallback.
Zero horizontal overflow, zero clipped Persian, RTL correct throughout.

## Findings

| # | Severity | Principle | Finding | Evidence |
|---|---|---|---|---|
| 1 | **LOW** | P5 (a11y) | Toast shell (`.toast`) is always in the DOM at `opacity:0` — its **close button stays keyboard-focusable while invisible**. Tab order includes a control the user can't see. | CSS: `.toast {opacity:0; pointer-events:none}` — no `visibility:hidden` |
| 2 | **LOW** | P4 (RTL) | Address/location ARIA label is English (`aria-label="Location"`, `"Menu"`, `"Call the salon"`) in a Persian app — screen-reader users hear English labels. | lux-home.tsx:350 |
| 3 | **LOW** | P8 (motion) | Explore badge rotates continuously (`animation: spin`) — decorative-only motion. AGENTS.md says no continuous decorative animation; it's small enough to be defensible, but it is a violation by the letter. | badge CSS |
| 4 | **INFO** | P1 (UX) | Desktop (1440px): the 520px phone frame pins to the RTL start edge — correct directionally — leaving ~55% of the screen empty void. Intentional per phone-frame spec; worth a designer look (centering or an ambient backdrop on wide screens). | screenshot |
| 5 | **INFO** | — | 2 console 401s on load (`/api/auth/me` pre-login polling) — expected when signed out; noise only. | console log |
| 6 | **INFO** | — | Slideshow autoplay timer resets correctly on manual dot navigation; images all load (3/3 naturalWidth>0); lookbook sheet traps focus, ESC/scrim closes; address card shows real data. | runtime probes |

**No L1 (UX) or L2 (structural) defects found.** The three actionable items are all LOW,
all cheap, all in `lux-home.tsx` / its CSS module.

## Resolution (Phase 5b fixes — committed)

1. **Toast** ✅ fixed: `.toast` now has `visibility: hidden` while dismissed and
   `.toastShow` restores `visibility: visible` — the close button is no longer a
   keyboard focus target while the toast is invisible.
2. **Labels** ✅ fixed: all English ARIA labels Persianized — `"Bag"` → `"سبد خرید"`,
   `"Menu"` → `"منو"`, `"Call the salon"` → `"تماس با سالن"`, `"Instagram"` →
   `"اینستاگرام"`, `"Location"` → `"آدرس سالن"`, plus `"Explore nail designs"` →
   `"نمایش نمونه‌کارها"`. (Note: the audit suggested `"پنل مدیریت"` for Bag, but the
   button is decorative editorial chrome with an "empty bag" toast — `"سبد خرید"`
   is the honest label; no admin behavior exists.)
3. **Badge spin** ✅ verified already-gated → **accepted deviation**: `.badge .ring`
   is `animation: none` inside `@media (prefers-reduced-motion: reduce)`
   (lux-home.module.css ~line 858), and the global `[data-motion]` reset
   (globals.css lines 269–275) neutralizes it as well. The 18s rotation stays for
   users without a reduced-motion preference.
4. **Desktop frame placement** ✅ resolved (designer chose "center it", then
   "composed stage"): DOM measurement showed the 520px column was already
   perfectly centered via `.viewport`'s `justify-content: center` — the
   lopsided read came from `.ambient`/`.grain` living inside the column, so
   the surrounding stage was flat `#171310`. Fix: a `min-width: 520px` block
   gives the stage proportional gold washes (top/bottom/center), a bottom
   vignette, full-stage film grain via a negative-z-index `::before`, and a
   hairline + deep shadow on the column edges. Verified live at 1440×900 and
   1250×1125: stage reads as intentional editorial texture, no flat void.
   Phones (<520px) untouched — the opaque column covers the stage.

## Recommended fixes (each one-line-ish)

1. **Toast**: add `visibility:hidden` to `.toast`, `visibility:visible` to `.toastShow` — removes the invisible focus target (P5).
2. **Labels**: `aria-label="Location"` → `"آدرس سالن"`, `"Menu"` → `"منو"`, `"Call the salon"` → `"تماس با سالن"`, `"Instagram"` → `"اینستاگرام"`, `"Bag"` → `"پنل مدیریت"` (P4).
3. **Badge spin**: gate behind `@media (prefers-reduced-motion: no-preference)` (it likely already is via the global reduced-motion block — verify; if yes, downgrade to "accepted deviation").

## Environment note (root cause found, for the record)

`.env.local` on this machine is entirely empty (all 15 vars blank) — the earlier API
500s were "missing connection string", not an unreachable DB. Production credentials
live only in Vercel. Production was used for this audit per designer authorization.
