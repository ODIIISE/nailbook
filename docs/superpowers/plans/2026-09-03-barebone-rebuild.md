# Forehand Nailbook — Barebone Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the entire front end over to barebone stock shadcn (zinc, zero motion), then migrate surface by surface, deleting the old warm-paper/Clean-Slate system.

**Architecture:** One semantic token layer in `globals.css` (stock shadcn zinc values) with legacy `--qhp-*`/`--qbf-*` variables **aliased** to the new tokens so unmigrated screens keep rendering while their colors go zinc immediately. Old decorative components are deleted; all motion (CSS and JS) is removed; then each surface is restyled onto stock shadcn primitives and its legacy CSS block deleted.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn on `@base-ui/react`, Vitest, Vazirmatn.

**Spec:** `docs/superpowers/specs/2026-09-03-frontend-rebuild-design.md` — read it first; this plan argues from it.

## Global Constraints

- **Zero motion:** no `transition`, no `transition-*` Tailwind classes, no `animation`/`@keyframes`, no `animate-*` classes (including `animate-spin`, `animate-pulse`, `animate-in/out`), no `will-change`, no `framer-motion`, no View Transitions API, no drag/swipe physics. State changes are instant. `transition-property: none` is not required — the properties simply must not appear.
- **Exception list (the only allowed motion-adjacent code):** `src/lib/haptics.ts` (vibration feedback), scroll-driven JS that has no visual transition (none known), `focus-visible` rings.
- **Vazirmatn** is the only font (self-hosted via CDN `@font-face`, preloaded in `layout.tsx`). Playfair Display is removed everywhere.
- Persian-first: RTL logical properties only (`ps/pe/ms/me/start/end`), Persian digits via `toPersianDigits`, `dir="ltr"` islands for phone numbers/times. Jalali dates preserved.
- Stock shadcn zinc palette for both themes. `--success`/`--warning` kept as additions. No per-salon theming.
- Interactive targets ≥44px tall. Visible `focus-visible` rings. Escape/backdrop dismissal kept for all overlays.
- Every task ends with `npm run check` green and a git commit. App must build (`npm run build`) after every phase.
- Do not touch `src/lib/scheduler/*`, API routes, DB, or auth logic. This is a front-end-only rebuild.
- Vitest is the test runner (`npm test`). There is no Storybook.

---

### Task 1: No-motion regression gate (test first)

**Files:**
- Create: `src/lib/no-motion.test.ts`

**Interfaces:**
- Produces: the banning patterns and allowlist that Tasks 3–14 must satisfy. Verification tasks re-run this test.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Files allowed to reference motion patterns (haptics is vibration, not visual).
const ALLOWED_FILES = ["src\\lib\\haptics.ts", "src/lib/haptics.ts"];

// Patterns banned everywhere in src/ per the rebuild spec ("zero motion").
const BANNED = [
  /framer-motion/,
  /\btransition(-[a-z]+)*\b(?=[^;]*(?:class|style|className))/, // tailwind transition-* classes
  /transition\s*:/, // css transition property
  /animation\s*:/,
  /@keyframes/,
  /animate-(in|out|spin|pulse|bounce|ping|fade|zoom|slide|scale|flip|expand|collapse)/,
  /tw-animate-css/,
  /will-change/,
  /View Transition|startViewTransition|view-transition/,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}

describe("no-motion gate", () => {
  it("src/ contains zero motion code", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      if (ALLOWED_FILES.some((a) => file.endsWith(a.replace(/\\\\/g, "\\")) || file.includes("haptics"))) continue;
      const text = readFileSync(file, "utf8");
      for (const pattern of BANNED) {
        if (pattern.test(text)) {
          offenders.push(`${file}: /${pattern.source.slice(0, 40)}/`);
          break;
        }
      }
    }
    expect(offenders, `motion code found in:\n${offenders.join("\n")}`).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it FAILS (the codebase is full of motion today)**

Run: `npm test -- src/lib/no-motion.test.ts`
Expected: FAIL listing many offending files (globals.css, ui components, qhp CSS, framer-motion files).

- [ ] **Step 3: Commit the failing gate**

```bash
git add src/lib/no-motion.test.ts
git commit -m "test: add zero-motion regression gate (red)"
```

---

### Task 2: Token cutover — stock shadcn zinc + legacy aliases

**Files:**
- Modify: `src/app/globals.css` (the `@theme inline` block lines 36–91, `:root` block starting line 93, and the `.dark` block later in the file)

**Interfaces:**
- Produces: legacy alias variables `--qhp-bg`, `--qhp-bg-2`, `--qhp-ink`, `--qhp-mut`, `--qhp-sub`, `--qhp-hair`, `--qhp-card`, `--qbp-acc`-style names kept as *var aliases* to the new semantic tokens, plus `--qbf-card`, `--qbf-hair`, `--qbf-ink`, `--qbf-sh1`, and every other old var name currently referenced by unmigrated code. The canonical list of names to alias = all `var(--qhp-…)` / `var(--qbf-…)` / `var(--qwen-…)` references found by `Select-String -Path src\**\*.css,src\**\*.tsx -Pattern 'var\(--(qhp|qbf|qwen)-'` at execution time. Aliases keep the app rendering with zinc colors before surface migrations.

- [ ] **Step 1: Replace the `@theme inline` radius + font sections**

In `src/app/globals.css`:
- Change `--font-sans` line 39 to:
```css
--font-sans: 'Vazirmatn', -apple-system, BlinkMacSystemFont, sans-serif;
```
- Delete `--color-rose/--color-navy/--color-gold/--color-warm-white` mappings (lines 58–61).
- Replace the radius block (lines 63–75) with stock shadcn:
```css
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
--radius: 0.625rem;
```
- Keep the `--field-*` and `--btn-*` height scales (lines 77–90) — they are layout, not theme.

- [ ] **Step 2: Replace `:root` and `.dark` value blocks with stock zinc**

```css
:root {
  color-scheme: light;
  --frame-max-w: min(100vw, 480px);
  --background: #ffffff;
  --foreground: #09090b;           /* zinc-950 */
  --card: #ffffff;
  --card-foreground: #09090b;
  --popover: #ffffff;
  --popover-foreground: #09090b;
  --primary: #18181b;              /* zinc-900 */
  --primary-foreground: #fafafa;   /* zinc-50 */
  --secondary: #f4f4f5;            /* zinc-100 */
  --secondary-foreground: #18181b;
  --muted: #f4f4f5;
  --muted-foreground: #52525b;     /* zinc-600 */
  --accent: #f4f4f5;
  --accent-foreground: #18181b;
  --destructive: #dc2626;
  --success: #16a34a;
  --warning: #b45309;
  --border: #e4e4e7;               /* zinc-200 */
  --input: #e4e4e7;
  --ring: #a1a1aa;                 /* zinc-400 */
}

.dark {
  color-scheme: dark;
  --background: #09090b;
  --foreground: #fafafa;
  --card: #101012;
  --card-foreground: #fafafa;
  --popover: #101012;
  --popover-foreground: #fafafa;
  --primary: #fafafa;
  --primary-foreground: #18181b;
  --secondary: #1c1c1f;
  --secondary-foreground: #fafafa;
  --muted: #1c1c1f;
  --muted-foreground: #a1a1aa;     /* zinc-400 */
  --accent: #1c1c1f;
  --accent-foreground: #fafafa;
  --destructive: #ef4444;
  --success: #22c55e;
  --warning: #f59e0b;
  --border: #26262a;
  --input: #26262a;
  --ring: #52525b;
}
```
Then append the legacy alias block (names gathered per Interfaces above), e.g.:
```css
/* Legacy aliases — delete as each surface migrates (spec §6). */
--qhp-bg: var(--background);
--qhp-bg-2: var(--muted);
--qhp-ink: var(--foreground);
--qhp-mut: var(--muted-foreground);
--qhp-sub: var(--muted-foreground);
--qhp-hair: var(--border);
--qhp-card: var(--card);
--qhp-accent-2: var(--primary);
--qhp-sh1: none;
--qhp-sh3: none;
--qbp-…: /* repeat for every name found by the Select-String scan */
```

- [ ] **Step 3: Keep the type utilities.** Find `.text-display/.text-h1/.text-h2/.text-h3/.text-body/.text-caption` definitions in globals.css and set stock-derived sizes: display `text-[28px] font-bold leading-tight`, h1 `text-2xl font-bold`, h2 `text-xl font-semibold`, h3 `text-base font-semibold`, body `text-sm leading-relaxed`, caption `text-xs font-medium`. Keep class names unchanged (they are referenced across the app).

- [ ] **Step 4: Run `npm test -- src/lib/no-motion.test.ts`** — still red (CSS blocks not stripped yet). Run `npm run lint && npx tsc --noEmit` — must be green.
- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "tokens: stock shadcn zinc palette, legacy var aliases, stock radius"
```

---

### Task 3: Strip all motion CSS from globals.css

**Files:**
- Modify: `src/app/globals.css` (delete motion blocks; strip motion properties from surviving rules)
- Delete: `@import "tw-animate-css";` (line 2)

**Interfaces:**
- Consumes: nothing. Produces: CSS with zero `transition/animation/@keyframes` — feeds the Task 1 gate.

- [ ] **Step 1: Delete whole blocks** (identified by their selectors):
  - `.splash-screen` and `.splash-screen-exit` rules (~lines 571–606)
  - `.page-transition-enter` and related `::view-transition-old/new(root)` rules (~line 608+, and any `@view-transition`)
  - `.animate-fade`, `.animate-scale`, `.animate-slideUp`, `.animate-stagger` and their nth-child delays (~lines 436–455)
  - `@keyframes` blocks they reference (`qhpFadeUp`, breathe/parallax keyframes, `prefers-reduced-motion` blocks — nothing animates anymore)
- [ ] **Step 2: Strip inline motion properties from every surviving rule.** Run a one-off node script from repo root:

```js
// scripts/strip-motion-css.mjs — run once, then delete
import { readFileSync, writeFileSync } from "node:fs";
const p = "src/app/globals.css";
let css = readFileSync(p, "utf8");
css = css
  .replace(/\s*transition[^;{}]*;/g, ";")
  .replace(/\s*-webkit-transition[^;{}]*;/g, ";")
  .replace(/\s*animation[^;{}]*;/g, ";")
  .replace(/\s*-webkit-animation[^;{}]*;/g, ";")
  .replace(/\s*will-change[^;{}]*;/g, ";")
  .replace(/;\s*;/g, ";");
writeFileSync(p, css);
```

Then manually remove any now-empty rules (`selector { ; }`) the script leaves behind, and delete empty `@media (prefers-reduced-motion: reduce)` blocks.

- [ ] **Step 3: Remove class-level animation hooks from tsx in the same pass** — delete `className="… animate-scale …"` from `src/app/bootstrap/page.tsx:53` (keep the `glass rounded-3xl p-6` shell; `glass` class must also be checked: if defined in globals.css with `backdrop-filter`, simplify it to `bg-card border border-border`).

- [ ] **Step 4: Verify:** `npm test -- src/lib/no-motion.test.ts` → globals.css no longer listed. `npm run dev`, open `/` — homepage renders in zinc, no splash, no entrance animation.
- [ ] **Step 5: Commit**

```bash
git add -A src/app/globals.css src/app/bootstrap/page.tsx
git commit -m "css: strip every transition, keyframe, and animation (zero-motion spec)"
```

---

### Task 4: Delete decorative components and fix call sites

**Files:**
- Delete: `src/components/layout/splash-screen.tsx`, `src/components/layout/page-transition.tsx`, `src/components/layout/loading-screen.tsx`, `src/components/layout/gradient-background.tsx`, `src/components/layout/paper-texture.tsx`, `src/components/ui/pull-to-refresh.tsx`
- Modify: `src/app/layout.tsx`, `src/app/bookings/page.tsx:8,144-206`, `src/app/bookings/loading.tsx`, `src/app/book/loading.tsx`, `src/app/profile/loading.tsx`, `src/app/login/loading.tsx`, `src/components/landing/admin-landing.tsx:6,11`

- [ ] **Step 1: Rewrite `src/app/layout.tsx`** — delete the `Playfair_Display` import and const (lines 2, 15–21), delete `SplashScreen`/`PageTransition` imports (lines 6, 8), delete `<SplashScreen />` (line 96), unwrap `<PageTransition>{children}</PageTransition>` → `{children}` (line 98), remove `${playfair.variable}` from the `<html>` className (line 70). Body of `<Providers>` becomes:
```tsx
<DeviceThemeSync />
<Providers>
  <ErrorBoundary>{children}</ErrorBoundary>
  <Toaster />
</Providers>
```
- [ ] **Step 2: `src/app/bookings/page.tsx`** — remove the `PullToRefresh` import (line 8) and replace `<PullToRefresh onRefresh={refreshBookings}>…</PullToRefresh>` (lines 144/206) with a fragment `<>…</>` keeping the inner content; keep the existing `useBookingsPolling` hook (polling is not animation).
- [ ] **Step 3: Replace the four route loading files** with static skeletons, e.g. `src/app/bookings/loading.tsx`:
```tsx
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[var(--frame-max-w)] space-y-3 p-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
```
Same file shape for `book/loading.tsx`, `profile/loading.tsx`, `login/loading.tsx` (labels differ only in nothing — skeletons are label-free).
- [ ] **Step 4: `src/components/landing/admin-landing.tsx`** — remove the `GradientBackground` import (line 6) and `<GradientBackground />` usage (line 11).
- [ ] **Step 5: Delete the six component files** listed above. Verify nothing imports them: `Get-ChildItem src -Recurse -Include *.tsx | Select-String -Pattern "splash-screen|page-transition|loading-screen|gradient-background|paper-texture|pull-to-refresh"` → no matches.
- [ ] **Step 6: `npm run check`** must pass. **Commit**

```bash
git add -A
git commit -m "components: delete splash, page transition, loading screen, gradient bg, paper texture, pull-to-refresh"
```

---

### Task 5: Remove framer-motion and restyle printed receipt

**Files:**
- Modify: `src/components/booking/printed-receipt.tsx` (imports line 6, variants 43–80+, all `<motion.*>` usages through line 498, `TornPaperCard` import line 9 and wrapper lines 265/495)
- Modify: `package.json`
- Delete: `src/components/booking/torn-paper-card.tsx`

- [ ] **Step 1: In `printed-receipt.tsx`:** delete the framer-motion import (line 6), delete the `containerVariants`/`contentVariants`/etc. variant objects (lines ~41–80), replace every `<motion.div variants={…} initial=… animate=…>` with `<div>`, `TornPaperCard` wrapper (line 265–495) with `<div className="rounded-lg border bg-card p-4 shadow-card">`. The receipt's data rendering (QR, totals, rows) is untouched.
- [ ] **Step 2: Delete `torn-paper-card.tsx`.** Confirm no other importer: `Select-String -Path src\**\*.tsx -Pattern "torn-paper-card"` → only printed-receipt, which is now clean.
- [ ] **Step 3: package.json** — remove `"framer-motion": "^12.42.2"` from dependencies. Run `npm install` to update the lockfile.
- [ ] **Step 4: `npm run check`** green. **Commit**

```bash
git add -A
git commit -m "booking: static printed receipt; remove framer-motion and torn-paper-card"
```

---

### Task 6: Instant overlays — bottom-sheet, drawer, sheet, theme toggle

**Files:**
- Modify: `src/components/ui/bottom-sheet.tsx` (full rewrite, 202 lines)
- Modify: `src/components/ui/drawer.tsx` (strip drag/swipe/transition classes), `src/components/ui/sheet.tsx:31,56`, `src/components/ui/dialog.tsx:34,56`, `src/components/ui/alert-dialog.tsx:33,55`, `src/components/ui/dropdown-menu.tsx:44,138`, `src/components/ui/select.tsx:44,86`, `src/components/ui/tooltip.tsx:53`, `src/components/ui/tabs.tsx:61`, `src/components/ui/switch.tsx:22,32`, `src/components/ui/badge.tsx:6`, `src/components/ui/input.tsx:25`, `src/components/ui/button.tsx:7`, `src/components/ui/theme-toggle.tsx:66`, `src/lib/hooks/use-theme.ts` (View Transitions block ~lines 55–75)
- Consumes: Task 3's stripped CSS. Produces: overlays that open/close instantly with the same props APIs (`BottomSheet {open, onClose, onClosed, title, children}`, `Drawer {open, onClose, title, children}`) so `manual-reserve-modal.tsx`, `block-time-modal.tsx`, and `qwen-customer-home.tsx` need no changes.

- [ ] **Step 1: Rewrite `bottom-sheet.tsx`** as a static sheet (keep focus-trap, Escape, backdrop click, `onClosed` after close, safe-area padding; no drag, no transform, no transition):
```tsx
"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, onClosed, title, children }: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) { onClosed?.(); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, onClosed]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className="relative z-10 flex max-h-[88dvh] w-full flex-col rounded-t-xl border-t bg-popover pb-[env(safe-area-inset-bottom)] text-popover-foreground shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="بستن"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
```
Call `onClosed` from the effect **cleanup** when `open` was true, so it fires exactly on the open→false transition (never on initial mount):
```tsx
useEffect(() => {
  if (!open) return;
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
  document.addEventListener("keydown", onKey);
  document.body.style.overflow = "hidden";
  return () => {
    document.removeEventListener("keydown", onKey);
    document.body.style.overflow = "";
    onClosed?.();
  };
}, [open, onClose, onClosed]);
```
Check `useFocusTrap`'s actual signature in `src/lib/hooks/use-focus-trap.ts` and adapt the call if it differs (it is used by the current bottom-sheet — copy its invocation verbatim).
- [ ] **Step 2: drawer.tsx** — remove the swipe-progress CSS variables, `transition-*`, `duration-*`, `ease-*`, `data-starting-style`/`data-ending-style`/`data-swiping` classes from overlay/content/handle rules (lines 75, 92, 125, 156); if the component's drag JS sets `--drawer-swipe-progress` / `--translate-*`, delete that JS and render open/closed statically. Keep `DrawerContent` positioning and the grab-handle visual as a plain divider.
- [ ] **Step 3: Class strips in the Base UI wrappers** (sheet, dialog, alert-dialog, dropdown-menu, select, tooltip): delete `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=…]:slide-in-from-*` tokens and every `transition-* duration-*` token from the listed lines. Keep `data-[state=open]:` logic that controls *presence*, delete only *motion*.
- [ ] **Step 4: switch.tsx** — remove `transition-all duration-200` / `transition-transform duration-200` (lines 22, 32). badge.tsx — remove `transition-colors` (line 6). input.tsx — remove `transition-colors` (line 25). button.tsx — remove `transition-all` and the `active:…:translate-y-px` press-motion token (line 7). tabs.tsx — remove `transition-all duration-180` (line 61). theme-toggle.tsx — remove `transition-all duration-150` (line 66).
- [ ] **Step 5: use-theme.ts** — delete the View Transitions API path (the `document.startViewTransition` block and its fallback comment, ~lines 55–75); the toggle becomes a plain class flip + localStorage write.
- [ ] **Step 6: `npm test -- src/lib/no-motion.test.ts`** — every `src/components/ui/*` offender must now be gone. `npm run check` green. Manual smoke: open a booking, open service sheet — instant, Escape closes.
- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "ui: instant overlays — no drag, no transitions anywhere in primitives"
```

---

### Task 7: Customer-home motion JS removal (pre-restyle)

**Files:**
- Modify: `src/components/landing/qwen-customer-home.tsx` — delete the hero-parallax useEffect (~lines 197–220, identified by `window.scrollY` + `--qhp-parallax`), the magnetic-CTA useEffect (~lines 223–243, identified by `pointermove` + `magnetic`), the `qhp-cta magnetic` class token (line 310 → `qhp-cta`), the lookbook Sheet enter/close rAF frames (~lines 590–620, 760–770 identified by `requestAnimationFrame`) — replace those rAF wrappers with direct state sets, and the keydown handler stays (line 672, Escape = not motion).
- Consumes/Produces: nothing interface-visible; the component keeps its full data/flow behavior.

- [ ] **Step 1: Apply the deletions above.** Grep the file for `requestAnimationFrame|scrollY|pointermove|parallax|magnetic` → zero matches.
- [ ] **Step 2: `npm run check`** green; homepage still functions (CTA opens /book, drawer opens, lookbook sheet opens).
- [ ] **Step 3: Commit**

```bash
git add src/components/landing/qwen-customer-home.tsx
git commit -m "landing: remove parallax, magnetic CTA, and rAF sheet motion"
```

---

### Task 8: Phase-1 verification (barebone cutover complete)

- [ ] **Step 1: `npm test`** — full suite green **including** the no-motion gate.
- [ ] **Step 2: `npm run check`** and **`npm run check:build`** green.
- [ ] **Step 3: Visual review** (`npm run dev`, Playwright `channel="msedge"`): screenshot `/`, `/login`, `/owner/login`, `/admin/login`, `/book` at 1280px and 390px, light + dark. Every screen renders in zinc, instantly, with Persian RTL intact and zero console errors. Unmigrated screens may look structurally "old" but must be color-consistent (via the Task 2 aliases) and motion-free.
- [ ] **Step 4: Fix any gate offender or console error, re-verify, then commit:**

```bash
git add -A
git commit -m "phase 1: barebone cutover complete — stock zinc, zero motion"
```

---

### Task 9: Customer home restyle onto stock shadcn

**Files:**
- Modify: `src/components/landing/qwen-customer-home.tsx` (784 lines — full restyle)
- Consumes: Task 6's instant `Drawer`; stock primitives (`Button`, `Card`, `Badge`, `Sheet`, `Input`).

**Class → component mapping (apply file-wide):**

| Legacy | Replacement |
|---|---|
| `.qhp-page` wrapper | `<main className="min-h-dvh bg-background text-foreground">` + `<div className="mx-auto w-full max-w-[var(--frame-max-w)] px-4 pb-24">` |
| `.qhp-topbar` + `.qhp-top-btn` | two `<Button variant="outline" size="icon" className="h-11 w-11 rounded-full">` in a `flex justify-between p-4` row (menu right, profile left — keep DOM order for RTL) |
| `.qhp-hero` image block | `<div className="relative h-64 overflow-hidden rounded-b-xl"><Image fill … className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" /></div>` — static, no parallax vars |
| `.qhp-kicker` | `<p className="text-xs font-medium tracking-widest text-muted-foreground">{salon.homepage_kicker}</p>` |
| `.qhp-name` | `<h1 className="text-2xl font-bold">{salon.name}</h1>` |
| `.qhp-tagline` | `<p className="text-sm text-muted-foreground">{salon.slogan}</p>` |
| `.qhp-addr` | `<a className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin …/>{salon.address}</a>` |
| `.qhp-open`/`.qhp-dot` | `<span className="inline-flex items-center gap-1.5 text-sm"><span className={`h-2 w-2 rounded-full ${live.isOpen ? "bg-success" : "bg-destructive"}`} />{live.label}</span>` |
| `.qhp-cta` + `.qhp-cta-chev` | `<Button size="lg" className="h-14 w-full text-base"><CalendarDays /><span>{ctaLabel}</span><ArrowLeft className="ms-auto" /></Button>` |
| `.qhp-micro` | `<p className="text-center text-xs text-muted-foreground">{salon.homepage_micro}</p>` |
| `.qhp-works` + `.qhp-work-card/pill/image` | horizontal scroll row: `<div className="flex gap-3 overflow-x-auto pb-2">` of `<button className="relative h-56 w-40 shrink-0 overflow-hidden rounded-lg border"><Image …/><span className="absolute bottom-2 inset-x-2 flex justify-between rounded-md bg-foreground/80 px-3 py-2 text-xs font-semibold text-background"><span>{look.name}</span><span>{compactToman(look.price)}</span></span></button>` |
| `.qhp-row` service rows | `<button className="flex w-full items-center gap-3 border-b border-border py-4 text-start"><span className="w-8 text-sm text-muted-foreground tabular-nums">{۰۱…}</span><span className="min-w-0 flex-1"><b className="block text-sm font-semibold">{s.name}{s.is_popular && <Badge variant="secondary" className="ms-2">پرطرفدار</Badge>}</b><small className="text-xs text-muted-foreground">{s.description} · {duration} دقیقه</small></span><span className="text-sm font-bold whitespace-nowrap">{compactPrice(s.price)} <small className="font-normal text-muted-foreground">تومان</small></span><ArrowLeft className="h-4 w-4 text-muted-foreground" /></button>` |
| `.qhp-socials`/`.qhp-soc` | row of `<Button variant="ghost" size="icon" className="h-11 w-11 rounded-full">` with existing lucide/Instagram icons |
| `.qhp-drawer` | `<Drawer open={…} onClose={…} title={salon.name}>` (instant Drawer from Task 6) with `<Button variant="ghost" className="w-full justify-start">` items |
| `.qhp-sheet` (lookbook) | stock `<Sheet>` from Task 6 wrapper |
| `.qhp-foot` | `<footer className="py-6 text-center text-xs text-muted-foreground">ساخته شده با ♥ برای <strong>{salon.name}</strong></footer>` |
| `text-display/h1/…` utilities | keep using them (redefined in Task 2) |

- [ ] **Step 1: Apply the mapping.** After it, the file must contain zero `qhp-` class references: `Select-String -Path src\components\landing\qwen-customer-home.tsx -Pattern "qhp-"` → no matches. All data hooks (`useSalon`, `useAuth`, booking navigation, lookbook sheet state) unchanged.
- [ ] **Step 2: `npm run check`** green. Visual review `/` at 390px + 1280px, light + dark: hierarchy intact, targets ≥44px, RTL correct, no console errors.
- [ ] **Step 3: Commit**

```bash
git add src/components/landing/qwen-customer-home.tsx
git commit -m "customer home: stock shadcn restyle, zero qhp classes"
```

---

### Task 10: Booking flow restyle

**Files:**
- Modify: `src/components/booking/qwen-booking-flow.tsx` (1169 lines), `src/components/booking/pin-input.tsx`, `src/components/booking/jalali-calendar.tsx`, `src/components/booking/booking-confirm.tsx`, `src/app/book/route-shell.tsx`
- Consumes: Task 5's static receipt, Task 6's instant sheets, Task 2 tokens.

**Class → component mapping (same discipline as Task 9):**

| Legacy | Replacement |
|---|---|
| `.qwen-book-page`/`.qwen-book-shell` | `<div className="min-h-dvh bg-background text-foreground"><div className="mx-auto w-full max-w-[var(--frame-max-w)] p-4 pb-28">` |
| `.qbf-card` panels | `<Card className="p-4">` |
| `.qbf-btn` primary/secondary | `<Button>` / `<Button variant="outline">` |
| `.qbf-round-btn` back/close buttons | `<Button variant="ghost" size="icon" className="h-11 w-11 rounded-full">` |
| `.qbf-input` | `<Input className="h-12 text-base" />` (phone stays `dir="ltr"`, Persian digits via existing `digits.ts` helpers) |
| `.qbf-chip` service/time chips | `<Button variant={selected ? "default" : "outline"} size="sm" className="h-11 rounded-lg">` |
| step header/progress | plain text: `<p className="text-sm text-muted-foreground">گام {n} از ۵</p>` + `<h2 className="text-lg font-semibold">` |
| Jalali calendar cells | grid of `<button className="flex h-11 w-11 items-center justify-center rounded-lg text-sm" + selected ? "bg-primary text-primary-foreground" : "hover:bg-muted">` — **delete the `useHorizontalDrag` month-swipe import and gesture code; month navigation is prev/next buttons only** |
| PIN input | keep `pin-input.tsx` logic; restyle boxes to `h-14 w-12 rounded-lg border-input text-center text-xl` |
| confirm + receipt | `booking-confirm.tsx` + static receipt inside `<Card>` |

- [ ] **Step 1: Apply the mapping to all five files.** Zero `qbf-|qwen-` class references remain in `src/components/booking/*`.
- [ ] **Step 2: `npm run check`** green. Walk the full flow in dev: phone → PIN → service → date/time → confirm; instant transitions; 44px targets; `dir="ltr"` on phone and times.
- [ ] **Step 3: Commit**

```bash
git add src/components/booking src/app/book
git commit -m "booking flow: stock shadcn restyle, no swipe physics"
```

---

### Task 11: Customer pages restyle (bookings, profile, login) + delete legacy CSS blocks

**Files:**
- Modify: `src/app/bookings/page.tsx`, `src/app/bookings/[id]/page.tsx`, `src/app/profile/page.tsx`, `src/app/login/page.tsx`
- Modify: `src/app/globals.css` (delete the now-orphaned `.qhp-*`, `.qbf-*`, `.qwen-book-*` rule blocks — after Tasks 9–10 no tsx references them)
- Consumes: `statusBadgeClass` from `src/lib/design-tokens.ts` (rebased in Task 13; existing classes are already semantic-token based and keep working).

- [ ] **Step 1: Restyle the four pages with the same primitives** (`Card`, `Button`, `Badge` with `statusBadgeClass[status]`, `Input`, sticky footer CTA via existing `sticky-action-bar.tsx`). Bookings list rows: `<Card className="p-4">` with service name, Jalali date, time (`dir="ltr"`), status `<Badge className={statusBadgeClass[b.status]}>`. Login: centered `<Card className="mx-auto max-w-sm p-6">` with `<Input className="h-12 text-base" dir="ltr">` phone field and OTP step.
- [ ] **Step 2: Delete legacy CSS blocks from globals.css** — every rule whose selector starts with `.qhp-`, `.qbf-`, `.qwen-book`, `.qhp-drawer`, `.qhp-sheet`, `.qhp-look`, `.qhp-row`, `.qhp-cta`, `.qhp-work`, `.qhp-soc`, `.qhp-top`, `.qhp-open`, `.qhp-addr`, `.qhp-kicker`, `.qhp-name`, `.qhp-tagline`, `.qhp-micro`, `.qhp-foot`, `.qhp-sec`, `.qhp-badge`, `.qhp-dot`, `.qhp-hero`, `.qhp-profile`, `.qhp-mask`, `.qhp-menu`, `.qhp-contact`, `.qhp-hours`, `.qhp-page`. After deletion, `Select-String -Path src\app\globals.css -Pattern "qhp-|qbf-|qwen-"` returns only the alias block from Task 2.
- [ ] **Step 3: Delete the legacy alias vars** appended in Task 2 (the whole block) — nothing references them now.
- [ ] **Step 4: `npm run check` + `npm run check:build`** green. Visual pass `/bookings`, `/profile`, `/login` at 390/1280, both themes.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "customer surface: stock restyle complete; delete warm-paper CSS system"
```

---

### Task 12: Owner + admin motion strip, nav consolidation, normalize

**Files:**
- Modify: `src/app/owner/**` pages, `src/app/owner/layout.tsx`, `src/components/owner/*` (timeline.tsx, schedule-manager.tsx, service-manager.tsx, earnings-modal.tsx, booking-modal.tsx, block-time-modal.tsx, manual-reserve-modal.tsx, activity-log.tsx), `src/app/admin/**` pages, `src/components/admin/*`, `src/components/ui/skeleton.tsx`
- These surfaces already use stock primitives (Clean Slate was zinc-like); the work is motion removal + token consistency + the spec §5.2 owner-nav consolidation.

- [ ] **Step 1: Strip every motion token the no-motion gate still reports** across these files (known: `src/app/owner/settings/page.tsx:254,445` `transition-colors` + `press-feedback`; `src/app/admin/salons/page.tsx:64` `transition-colors`; `src/app/admin/salons/[id]/page.tsx:128`; `src/app/admin/page.tsx:180`; `admin/login/page.tsx:98` `transition-colors`). Also replace every `animate-spin` usage (~14 sites: admin salons pages, admin export, admin login, sonner.tsx:27) by deleting the `animate-spin` token; where a spinner is the sole loading affordance, pair the static `<Loader2 />` with `<span className="text-sm text-muted-foreground">در حال بارگذاری…</span>`.
- [ ] **Step 2: `skeleton.tsx`** — change `className={cn("animate-pulse rounded-md bg-muted", className)}` to `className={cn("rounded-md bg-muted", className)}`.
- [ ] **Step 3: Owner nav consolidation (spec §5.2).** Read `src/app/owner/layout.tsx` and `src/components/layout/menu-context.tsx` / `app-navbar.tsx`. If owner pages navigate through more than one chrome pattern (drawer + menu-context + inline headers), unify on ONE pattern: a single header (`<header className="sticky top-0 z-40 border-b bg-background">` with page title + logout `Button variant="ghost" size="icon"`) plus a single bottom tab bar built from the existing customer bottom-nav component (`app-navbar.tsx`) with the owner destinations (داشبورد، نوبت‌ها، خدمات، تنظیمات) — keep existing routes unchanged; only the chrome is unified. Every `/owner/*` page must render inside this single chrome after the task.
- [ ] **Step 4: `npm test -- src/lib/no-motion.test.ts`** → green (this is the phase's acceptance). `npm run check:build` green.
- [ ] **Step 5: Visual pass** on `/owner`, `/owner/services`, `/owner/schedule`, `/admin`, `/admin/salons` (desktop 1280 + 390) — zinc-consistent, single nav chrome, instant, no console errors.
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "owner+admin: motion strip, unified owner nav chrome, static loading states"
```

---

### Task 13: design-tokens.ts slim + splash field cleanup + docs

**Files:**
- Modify: `src/lib/design-tokens.ts` — keep `servicePalette`, `chartColors` (rebased: `reserved/bar` → `#18181b`/`#fafafa`, `confirmed` → `--success` value `#16a34a`/`#22c55e`, `completed` → `#7c3aed`/`#a78bfa` stays, `cancelled/destructive` → `#dc2626`/`#ef4444`, axis `#a1a1aa`/`#52525b`, tooltip `#fff`/`#101012`, border `#e4e4e7`/`#26262a`), `statusBadgeClass` (unchanged — already semantic). **Delete** `statusColors` and `themeColor()`; fix their importers (grep `statusColors|themeColor` across `src/**` — expected in owner timeline/components; replace each `themeColor(light, dark, isDark)` call with the existing `useIsDark()` hook pattern or the semantic CSS class equivalent).
- Modify: `src/app/owner/settings/page.tsx` — remove the `splash_title`/`splash_slogan` form fields (no UI consumer anymore; DB fields stay, API untouched).
- Rewrite: `DESIGN-SYSTEM.md` — replace its content with the stock-shadcn + Persian rules doc per spec §3.1–3.4: token table (zinc values above), zero-motion policy, type utilities, RTL rules, QA gates. Reference the spec file.
- [ ] **Step 1: Apply.** `npm run check` green (vitest covers `salon-settings.test.ts` — if it asserts splash fields in the settings payload, update the test to expect the fields absent from the *form* but still accepted by the API).
- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "tokens: slim design-tokens.ts, drop splash settings, rewrite DESIGN-SYSTEM.md"
```

---

### Task 14: Final verification against the spec

- [ ] **Step 1:** `npm run check` and `npm run check:build` green.
- [ ] **Step 2:** `npm test -- src/lib/no-motion.test.ts` green; repo-wide `Select-String -Path src\**\* -Pattern "framer-motion|animate-|@keyframes|transition-"` → only `src/lib/haptics.ts` and comment-free matches.
- [ ] **Step 3:** Spec §7 checklist: full visual pass of `/`, `/book`, `/bookings`, `/profile`, `/login`, `/owner/*`, `/admin/*` at 1280px and 390px, light + dark, RTL verified, zero console errors, 44px targets, focus rings visible, Escape/backdrop dismissal on every overlay.
- [ ] **Step 4:** Push:

```bash
git push origin master
```
