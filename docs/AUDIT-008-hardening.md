# Hardening — Phase 11 (Viewports · Dark Mode · WCAG AA · Performance)

**Commits**: fixes `ec6360a` · this report
**Spec**: `specs/008-hardening/spec.md`
**Surface set**: customer surfaces on production + the full token system
**Method**: computed contrast matrix (WCAG relative-luminance implementation,
alpha-blend aware), live viewport matrix and dark walk on production, browser
Performance API.

## 1 · WCAG AA contrast — computed, then fixed, then re-verified

A 20-pairing matrix per theme (text on surfaces, feedback hues as text / inside
their own `/10` tinted pills / as solid fills with their foreground, ring vs
3:1 UI floor, disabled recipes, past-day cells) found **8 failures** — the
worst being the «تأیید شده» success pill at **2.96:1**.

Fixes (all token-level, component code untouched except where hardcoded):

| Pairing | Was | Now |
|---|---|---|
| Light success text / pill | 3.30 / **2.96** | **7.13 / 6.14** (green-600→green-800) |
| Light destructive text / pill | 4.83 / 4.13 | **6.47 / 5.45** (red-600→red-700) |
| Light warning text / pill | 5.02 / 4.39 | **7.09 / 6.08** (amber-700→amber-800) |
| Dark destructive text / pill | 4.42 / 3.98 | **6.01 / 5.20** (red-500→red-400) |
| Text on solid red fills | 3.76 (white) / ≈2.6 (inherited) | **6.47 light / 6.14 dark** — new `--destructive-foreground` token (was **used by 2 components but never defined**) |
| `disabled:text-foreground/60` | 3.76 | **4.99** (`/70`, swept across 11 files) |
| Calendar past-day cells | 2.97 | **5.46** (full `muted-foreground`; /70 and /90 blends both miss 4.5) |

Re-run: **20/20 PASS in light, 20/20 PASS in dark.** Deployed CSS verified
(`--destructive-foreground`, `#166534`, `#b91c1c` present in the served chunk).

## 2 · Viewport matrix (live, production)

| Viewport | Result |
|---|---|
| 375×667 | homepage one-viewport hold ✓ · CTA 46px · no overflow · /book 3 services, 108px rows ✓ · /portfolio ✓ |
| 390×667 | ✓ no overflow |
| 390×844 | homepage hold ✓ · CTA 58px · no overflow |
| 430×932 | hold ✓ · no overflow |
| 1440×900 | 520px column at left=460 = exact center ✓ · stage ambience ✓ |

RTL intact everywhere; zero horizontal overflow at any size.

## 3 · Dark mode (live walk)

`prefers-color-scheme: dark` → `html.dark` applied; background resolves to
`rgb(23,19,16)` (night-900), card `rgb(36,29,23)` (night-850); login renders
correctly (screenshot reviewed); no layout breaks; contrast matrix green in
dark (see §1 — dark destructive was the failure, now 6.01/5.20).

## 4 · Performance (browser Performance API, production)

- **TTFB 760ms · DOMContentLoaded 1.2s** · FCP 2.2s (incl. splash choreography
  window; interactive well before it ends)
- **JS: 55KB transferred across 21 chunks · CSS: 20KB** — lean for a Next.js
  app; no animation libraries (governance-enforced)
- **Data**: exactly **one** `/api/read/bootstrap` + `/api/auth/me` — the
  spec-003 single-request requirement holds; no waterfalls
- Images: 3 (slideshow), lazy-loaded portfolio grid; fonts via CDN fontsource

## Verdict & roadmap complete

Phase 11 closes the roadmap. **Phases 0–11 all complete**: checkpoint,
inventory, booking journey, homepage, customer surfaces, consistency (+ skin
decision: custom), owner tools, admin, craft, hardening. The remaining open
items are recorded per-audit and are all designer-side or future-schema work:

- Authenticated walk on a real phone (customer + owner OTP sessions) — the
  standing acceptance step (AUDIT-003/005 limits).
- Blocked-time `reason` field returns together with schema support (AUDIT-005).
- Stock-primitive disabled recipes swept to `/70` in this phase — the
  AUDIT-004 accepted deviation is now closed.

Recommended cadence from here: re-run the mechanical sweeps + contrast matrix
quarterly or before any token change; the governance test guards motion
continuously.
