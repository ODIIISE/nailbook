# Quarterly UI Re-Audit Checklist

**Cadence**: every quarter, or before any design-token change ships
**Last full audit**: 2026-09-29 (see `docs/MISSION-REPORT.md`, AUDIT-001…009)
**Runtime**: ~45–60 minutes · **Gate**: `npm run check` green before and after

This doc is written for the *next* session (human or agent). Follow it
top-to-bottom; every command is copy-paste ready and every expectation states
the verified baseline from 2026-09-29. **Drift from a baseline is a finding —
no discussion needed.** Fix order: UX → structure → component → polish (P1).

---

## 0 · Preconditions (5 min)

```bash
git pull origin main
npm install
npm run check          # must be green BEFORE auditing: 209 tests (incl. 40 contrast + 3 motion)
```

If `npm run check` is red, stop — that IS the finding. Fix or file first.

---

## 1 · Mechanical sweeps (15 min)

Run each block; the number after each label is the **verified baseline**
(2026-09-29). Any number above baseline = a finding: open the listed file(s),
classify (real text vs sanctioned), fix per the cited audit, or record a new
sanctioned exception in `docs/UI-INVENTORY.md` "Known conventions".

```bash
# S1 — banned font weight · baseline: 0 (AUDIT Phase 0)
grep -rn "font-extrabold" src --include="*.tsx" | grep -v landing | wc -l

# S2 — arbitrary shadows · baseline: 0 (P7 elevation ladder)
grep -rn "shadow-\[" src --include="*.tsx" | grep -v landing | wc -l

# S3 — opacity-faded disabled (app code) · baseline: 0 (AUDIT-001; ui/ primitives exempt, gated by contrast test)
grep -rn "disabled:opacity-" src --include="*.tsx" | grep -v landing | grep -v "components/ui" | wc -l

# S4 — transition-all · baseline: 0 (AUDIT-007)
grep -rn "transition-all" src --include="*.tsx" | grep -v landing | wc -l

# S5 — stock animate utils outside editorial · baseline: 0 (motion governance)
grep -rEn "animate-(spin|pulse|bounce|ping)" src --include="*.tsx" | grep -v landing | wc -l

# S6 — raw Tailwind durations in app code · baseline: 0 (AUDIT-007; ui/ primitives exempt)
grep -rEn "duration-[0-9]+" src --include="*.tsx" | grep -v landing | grep -v "components/ui" | wc -l

# S7 — raw palette colors in chrome · baseline: 0 (AUDIT-004; design-tokens.ts + status-pill.tsx are the sanctioned sources)
grep -rEn "(text|bg)-(amber|yellow|blue|violet|pink|rose|emerald|red|green)-[0-9]" src --include="*.tsx" | grep -v landing | grep -v "design-tokens\|status-pill" | wc -l

# S8 — English ARIA labels · baseline: 0 (AUDIT-002/003; P4)
grep -rn 'aria-label="[A-Za-z]' src --include="*.tsx" | wc -l

# S9 — arbitrary radii in app code · baseline: 0 (AUDIT-004; ui/ primitives exempt)
grep -rn "rounded-\[" src --include="*.tsx" | grep -v landing | grep -v "components/ui" | wc -l

# S10 — informational alpha-text · baseline: 3, all sanctioned decoration:
#   not-found.tsx:8        "۴۰۴" giant numeral (decorative)
#   owner/users:250        empty-state illustration icon
#   service-manager:279    empty-state illustration icon
# Anything else in the list = real text below AA → fix to full muted-foreground (AUDIT-009).
grep -rEn 'muted-foreground/[0-9]+' src --include="*.tsx" | grep -v landing | grep -v "components/ui" | grep -v "aria-hidden"

# S11 — tracking-code slices · baseline: 9, all last-6 (AUDIT-009 unified -4→-6).
# Any slice(-4) or slice(-8) on a booking id is a regression → change to slice(-6).
grep -rn "slice(-[0-9])" src --include="*.tsx" | grep -v "components/ui"
```

**Sanctioned exceptions (do not "fix")**: heroicons in `app-navbar.tsx`
(outline/solid tab pairs), filled sparkle in `booking-flow.tsx`,
`design-tokens.ts` categorical palettes, `status-pill.tsx`, the S10 trio above,
`ui/` primitives for S3/S6/S9 (they carry Base UI's own recipes and are
contrast-gated).

---

## 2 · Contrast matrix (0 min manual — it runs itself)

```bash
npx vitest run src/lib/contrast-governance.test.ts   # 40 tests
```

Baseline: **40/40 pass**. The suite parses the live `globals.css` (mutation-
tested in `dc19ab2`), so a failure names the exact pairing + ratio — fix the
token, not the test. Only add a row when a NEW pairing context ships (e.g. a
new tint level); mirror it for both themes. If a deliberate exception is ever
needed (e.g. a decorative token), keep it OUT of the semantic tokens the test
reads.

---

## 3 · Viewport spot-check (10 min, production)

Log in isn't needed for these. Walk `https://forehand.vercel.app` at each size;
resize the browser window or use devtools device emulation:

| Viewport | Pages | Must hold |
|---|---|---|
| 375×667 | `/`, `/book`, `/portfolio`, `/login` | one-viewport homepage, no horizontal scroll, CTAs ≥44px, no collisions |
| 390×667 | `/`, `/bookings` | no horizontal scroll |
| 430×932 | `/`, `/book` | no horizontal scroll |
| 1440×900 | `/` | 520px column mathematically centered (`(w−520)/2`), stage ambience visible |

Quick DOM probe (paste in console on `/`):

```js
(() => ({ overflow: document.documentElement.scrollWidth > innerWidth,
  ctaBottom: Math.round(document.querySelector('footer button')?.getBoundingClientRect().bottom || 0),
  viewportH: innerHeight }))()
```

`overflow: false` and `ctaBottom ≤ viewportH` at every size = pass. Baseline
2026-09-29: all pass (AUDIT-008 §2). Also flip DevTools → Rendering →
`prefers-color-scheme: dark` on `/login`: night palette (`rgb(23,19,16)` page,
`rgb(36,29,23)` card), no layout break.

---

## 4 · Inventory diff (10 min)

New screens/flows shipped this quarter? Update `docs/UI-INVENTORY.md` first
(screen → actions → states), then audit the newcomer against it the AUDIT way:
loading / empty / error / disabled states exist, 44px targets, Persian-first,
one status pill, no `return null` after failed fetches. A state not in the
inventory = undesigned = the finding (P10).

## 5 · Runtime spot checks (5 min, production)

- `/login`: enter Persian digits `۱۲۳` + tap «دریافت کد» → inline
  `role=alert` «شماره موبایل معتبر نیست» (never a dead button).
- `/admin/login`: same recipe (AUDIT-006).
- `/portfolio`: images load (`naturalWidth > 0`), empty state correct.
- Homepage console: ≤2 expected 401s pre-login (`/api/auth/me`); no other errors.

## 6 · Close-out

1. Fix findings → `npm run check` → push → verify live (same loop as the mission).
2. Update this doc's baselines if the codebase legitimately changed (say why, cite the commit).
3. Append a one-paragraph result log at the bottom (date, findings count, fixes, commit range).

---

## Result log

- **2026-09-29 (baseline audit)** — full mission AUDIT-001…009; all baselines
  in this doc captured green; 209/209 tests; production verified.
  Commits `35c47e3…dc19ab2`.
