# Nailbook UI/UX Mission — Cumulative Report

**Period**: 2026-09-28 → 2026-09-29 · **Branch**: `main` (per designer decision) · **Every commit live on production** (forehand.vercel.app via Vercel)
**Discipline**: spec-kit specs (`.specify/`) + UI Constitution (P1–P10) + Emil Kowalski motion/UI principles · **Gate**: `npm run check` (eslint + tsc + 169/169 vitest) green before every push
**Artifacts**: 9 audit reports (`docs/AUDIT-00x…`), 8 phase specs (`specs/00x…`), UI inventory, skin side-by-side

---

## 1 · What was done, phase by phase

### Phase 0 — Design system checkpoint (`35c47e3`)
Full design-system pass: WCAG AA contrast fixes (muted-foreground #7d7166→#6f6357, accent-foreground-soft, ring 2.31→4.44:1), four-step elevation ladder rebuilt, unified modal family, pill buttons all sizes, tinted readable disabled states, 52×32 switch, `.icon-btn` utility (~16 copy-pasted back buttons deleted), ~120 `font-extrabold`→bold. UI Constitution written (P1 UX-first fix order, P2 one source of truth, P3 preserve-then-improve, P4 Persian-first RTL, P5 touch-first, P6 WCAG AA floor, P7 elevation ladder, P8 governed motion, P9 three roles, P10 done-means-verified).

### Phase 1 — Inventory (`84dc754` + `docs/UI-INVENTORY.md`)
Screen→actions→states matrix for every area — the reference that made every later audit a diff against a designed state, not vibes.

### Phase 5 — Booking journey audit (AUDIT-001)
CRITICAL dev-404 root-caused (stray parent package-lock → `turbopack.root`). HIGH: salon-context `loadFailed` honest error + retry in the flow (was: misleading "no services"). 28px review edit buttons → 44px. Login: wrong-code PIN reset (`key={otpAttempt}`), invalid-phone tap-to-explain instead of silently dead button. ALL `disabled:opacity-*` swept to readable token recipes.

### Phase 5b — Homepage audit (AUDIT-002)
Zero L1/L2. Fixed: toast close button focusable while invisible (`visibility` toggle), 6 English ARIA labels → Persian (`سبد خرید` chosen as the honest label over the suggested `پنل مدیریت`), badge spin verified already reduced-motion-gated (accepted deviation). Designer question resolved: desktop frame was *already* mathematically centered — the lopsided read came from ambience living inside the 520px column; fixed with full-stage gold washes + film grain + hairline edge (`9ca9a6f`).

### Phase 6 — Customer surfaces (AUDIT-003, `9395ae1`)
HIGH: `STATUS_MAP` triplicated across 3 files *and disagreeing* (completed green on receipt, gray on lists) → single [status-pill.tsx](../src/components/ui/status-pill.tsx), token-only colors, `--color-warning` mapped. MEDIUM: profile cards were `role="button"` divs containing real cancel buttons (nested interactive) → plain container + explicit «مشاهده» button. `HISTORY` → `تاریخچه`.

### Phase 7 — Consistency pass + skin decision (AUDIT-004, `171d272`, `e9e29ad`)
Stray palette colors → tokens, arbitrary radii → scale, profile link → 44px. **Skin decision closed**: live side-by-side (`docs/skin-side-by-side.html`) showed daisyUI "forehand" is literally the current skin's values as theme config → **keep the custom skin**; recorded so drift can't reopen it.

### Phase 8 — Owner tools (AUDIT-005, `4f982fe`)
HIGH: block-time sheet collected «دلیل» then discarded it (`void reason`) — fake feature removed until schema support. Touch-target erosion fixed across dense controls (32px chips, 28px confirms/corner buttons → 44px via `min-h-11` + new `.tap-44` invisible hit-expansion). Owner code repeatedly found pre-emptively correct (lane-split timeline, object-identity block removal, role-guard states).

### Phase 9 — Admin, minimal pass (AUDIT-006, `830043d`)
HIGH: dashboard rendered `null` forever on failed stats fetch; salon detail toasted then went permanently blank → explicit error states with ways forward. Admin login adopted the customer recipe (normalize Persian digits, tap-to-explain, `role=alert`) — verified live on production. Latin digits → Persian across the dashboard. Salon-table row-level onClick pseudo-button → real link.

### Phase 10 — Craft (AUDIT-007, `640845c`)
Motion governance (repo's own enforcement test) confirmed clean; one dead transition removed. Icon sweep: lucide everywhere; heroicons sanctioned as the navbar's outline/solid tab-state exception (documented). Mobile-native verified: safe areas, 16px inputs on phones (no iOS zoom), haptics, overscroll containment, swipe never hijacks vertical scroll.

### Phase 11 — Hardening (AUDIT-008, `ec6360a`)
**Computed 20-pairing × 2-theme WCAG matrix found 8 failures** — worst: the «تأیید شده» pill at 2.96:1. Light success/destructive/warning stepped to pass everywhere; dark destructive → red-400; **`--destructive-foreground` created** (used by 2 components but never defined — text on red had been ≈2.6:1); disabled `/60` → `/70` across 11 files. Re-run: **0 failures both themes**. Viewport matrix (375×667→430×932→desktop) + dark walk + perf all verified live: one-viewport holds, no overflow, centered column, TTFB 760ms, 55KB JS, single consolidated bootstrap request.

### Post-roadmap — Success screen & receipt (AUDIT-009, `6efb579`)
HIGH: **two different tracking codes for one booking** (list/profile last-4 vs receipt `BK-`+last-6) → unified last-6. HIGH: receipt header sliced 8 off the 9-char code → garbled `#K-XXXXXX` disagreeing with the reference on the same receipt → fixed. Final AA sweep on informational alpha-text (2.5–3.1:1) in receipt + owner surfaces → full `muted-foreground`; decorative watermarks keep theirs.

### Post-roadmap — Booking edge states (AUDIT-010)
Sold-out race handled end-to-end: real 409 → red alert banner, bounce to the time step, slot grid refreshed (taken slots disabled + dimmed, fresh suggestions re-emerge). Deep-link/expired-booking edges covered.

### Post-roadmap — Owner error leaks (AUDIT-011)
Owner surfaces stopped leaking raw server/DB errors; every owner-facing failure now speaks one Persian sentence with a way forward.

### Post-roadmap — Session expiry (AUDIT-012)
Expiry lands owners on /owner/login with `returnTo` back to the exact page they worked on; a Persian nudge only appears when drafts actually survived, so it never lies.

### Post-roadmap — Owner day loop (AUDIT-013)
Dashboard/timeline/day-flow tightening: manual reserve, status + paid flips, rest blocks, and the earnings summary behave as one loop.

### Post-roadmap — App that responds (AUDIT-014, `5dbc0df`)
Atelier motion layer (stagger/slide/press tokens) + toast diet; live-verified on production; motion governance test extended.

### Post-roadmap — Live verification walks (AUDIT-015, `7115a11`→`18c83ea`)
Real authenticated walks on production with a temporary secret-gated test hook (fake users + fixed OTP code, **zero SMS**), deleted after the run. Found and fixed **two real production bugs**: customer cancel 401'd for every legitimate customer (missing `await` on the session verifier, `3db2c5f`) and the hamburger menu kept guest state after owner login (SPA auth-sync, `0adfd43`). Sold-out race, owner status/paid flips, schedule draft persistence, and return-to routing all verified live. Full residue report in `AUDIT-015-live-verification.md` — every test row deleted, hook removed from the repo.

---

## 2 · Before → after highlights

| Axis | Before | After |
|---|---|---|
| Status language | 3 disagreeing copies per page | One component, token colors, AA everywhere |
| Tracking code | 3 different codes incl. a garbled one | `BK-XXXXXX` / `#XXXXXX` (last-6) on every surface |
| Contrast | 8 AA failures (worst 2.96:1); missing foreground token | 20/20 pass × 2 themes, computed & reproducible |
| Disabled states | `opacity-50` fades (4.4:1 max, unreadable) | Readable tinted recipes ≥4.5:1, swept app-wide twice |
| Dead ends | Silent `null` pages, dead buttons, discarded input | Error states with ways forward; no fake features |
| A11y structure | Nested interactives, invisible focus targets, row pseudo-buttons | Real buttons/links, focus-safe toasts, keyboard-reachable tables |
| Motion | Ad-hoc + unreviewed | Governed by test; zero raw durations outside sanctioned zones |
| Icons | 2 libraries, undocumented | lucide + 2 documented capability exceptions |
| Touch targets | 28–36px strata in dense areas | 44px floor everywhere (incl. invisible hit-expansion) |
| Skin question | Open since Phase 0 | Resolved: custom skin, decision recorded |

## 3 · The designer's phone-walk checklist (acceptance closed by AUDIT-015; taste remains yours)

The mechanical acceptance walks below were executed for real in AUDIT-015 on production — booking, session, list, cancel, the sold-out race, owner status/paid flips, schedule persistence, return-to routing — with two bugs found and fixed along the way (`AUDIT-015-live-verification.md`). What remains open is deliberately **not mechanical**:

1. Book any service end-to-end on your own phone → the success receipt, **دانلود تصویر** and **اشتراک‌گذاری** share chain (the one behavior only a real device exercises).
2. Open the receipt image → scan the QR → lands on `/bookings/<id>` with the same code.
3. Walk any surface and flag anything that *feels* wrong — hierarchy, rhythm, wording. The floors (contrast, targets, states, auth paths) are enforced; the remaining judgment is taste, and that's yours.

## 4 · Standing guardrails (what keeps this from regressing)

- `motion-governance.test.ts` — motion only via tokens/editorial/primitives, no animation libraries (runs in `npm run check`).
- `npm run check` before every push (236/236 tests, lint, tsc).
- Inventory + audit docs as the designed-state record; new screens diff against them.
- Recommended: re-run the contrast matrix + mechanical sweeps quarterly or before any token change (a natural follow-up is promoting the matrix to a permanent test).

## 5 · Known open items (all recorded in audit docs)

1. ~~Authenticated phone walks~~ — closed by AUDIT-015's live walks; only the device-only share chain + taste judgment remain (§3).
2. Blocked-time `reason` field returns together with schema support (AUDIT-005).
3. Stock-primitive disabled recipes are now `/70` (closed in Phase 11) — next natural touch: the contrast matrix as a permanent vitest test.
4. The daisyUI door stays closed unless a future decision record reopens it (AUDIT-004).
