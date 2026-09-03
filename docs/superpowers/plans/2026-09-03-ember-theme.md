# Ember Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Re-skin the barebone app to the Ember dark-orange theme from Figma node 69-733, rebuild the homepage to that design, and wire personalized greeting data.

**Architecture:** Token-value swap in `globals.css` (structure unchanged from barebone), homepage component rebuild, then customer-surface restyle passes. Zero-motion gate stays authoritative throughout.

**Tech Stack:** Next.js 16, Tailwind v4, shadcn/Base UI, Vazirmatn. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-03-ember-theme-design.md`

## Global Constraints

- Zero motion (no-motion gate `src/lib/no-motion.test.ts` must stay green; only allowed exception remains `src/lib/haptics.ts`).
- Vazirmatn only; Persian digits; `dir="ltr"` islands for times/phones; logical properties only.
- 44px minimum targets; Escape/backdrop/focus-trap on overlays preserved.
- No new dependencies. No changes to scheduler/API/DB logic (data *reads* of existing endpoints are fine).
- Every task ends with lint+tsc+tests green and a commit.

---

### Task 1: Ember tokens + utilities

**Files:** Modify `src/app/globals.css`, `src/lib/design-tokens.ts`

- [ ] **Step 1:** Replace `:root` and `.dark` values in `globals.css` with the Ember token tables from spec §3 (dark block first — dark is default). Keep variable names identical.
- [ ] **Step 2:** Add utilities in `@layer utilities`: `.glass` (see spec) and `.gradient-text` (bg-clip:text, ember text gradient). Add `.ember-glow` (radial-gradient circle using `--ember-grad-a/b`, static).
- [ ] **Step 3:** `design-tokens.ts`: rebase `chartColors`/`statusBadgeClass` to Ember-friendly values (reserved→`bg-primary/10 text-primary`, confirmed→success, completed→violet-400, cancelled→destructive; chart: bar `#E25024`/`#FF9778`, axis `rgba(255,247,242,.4)`, tooltip `#241410`).
- [ ] **Step 4:** `npm run check` green; commit `tokens: ember palette`.

### Task 2: Theme default = dark

**Files:** Modify `src/app/layout.tsx` (inline theme script)

- [ ] **Step 1:** Inline script: when no stored mode, default to `dark` (instead of `prefers-color-scheme`). Stored override still respected.
- [ ] **Step 2:** Verify first paint has no light flash (localStorage empty → dark). Commit `theme: dark default`.

### Task 3: Homepage rebuild (customer-home.tsx)

**Files:** Modify `src/components/landing/customer-home.tsx`

- [ ] **Step 1:** Hero: full-bleed image block h-[45vh], `bg-gradient-to-b from-transparent to-background` fade; `.ember-glow` circle 404px absolutely positioned at the seam (translate-y-1/2), behind content, pointer-events-none.
- [ ] **Step 2:** Header row: salon name (`.text-caption` font-medium), Jalali date today («امروز» + weekday + `formatJalaliDate`), menu round button (74px, `.glass`).
- [ ] **Step 3:** Greeting: first name from `useAuth().user` (already in component) → «{name} جون، خوش اومدی» `.text-display font-bold` + smiley span. Subtitle: fetch days-since-visit from existing bookings data (salon context already exposes bookings for logged-in users — reuse `useBookingsPolling` data or the `/api/read/bookings` fetch the component already has access to); weeks = floor(days/7); render `.gradient-text` 12px w900; hide if not logged in or no past bookings.
- [ ] **Step 4:** نوبت‌های من section: title 20px w400 + receipt icon, divider, active bookings (reserved/confirmed/in_progress) as pill rows (service, Jalali date, time dir=ltr) linking to `/bookings/[id]`; empty state per Figma; «همه» link when >3.
- [ ] **Step 5:** گالری section: title pill `.glass` (74×31) + icon; rail `flex gap-3 overflow-x-auto` of lookbook cards `h-44 w-[91px] rounded-full border border-border overflow-hidden` (Image fill, cover); opens existing lookbook sheet; hide when salon has no highlight images.
- [ ] **Step 6:** CTA: full-width `h-[72px] rounded-full .glass` «رزرو نوبت» text-2xl font-light text-foreground/80 + nail icon → `/book`.
- [ ] **Step 7:** Bottom nav: restyle `AppNavbar` to floating pill — centered fixed `w-[240px] bottom-4`, `.glass` + backdrop-blur, 3 items (خانه/نوبت‌ها/پروفایل), active = solid white circle `h-[58px] w-[58px] rounded-full bg-white` + black icon, inactive `.glass` circles with white@80% icons, 12px labels below. Customer items only (owner nav unchanged in shape, Ember colors only).
- [ ] **Step 8:** Drawer/menu + lookbook sheet: restyle internals to Ember glass/dark (structure kept).
- [ ] **Step 9:** `npm run check`; visual check via dev server + Playwright (390px, dark); commit `homepage: ember rebuild per figma 69-733`.

### Task 4: Booking flow + customer pages restyle

**Files:** Modify `src/components/booking/*`, `src/app/book/*`, `src/app/bookings/*`, `src/app/login/*`, `src/app/profile/*`

- [ ] **Step 1:** Booking flow: backgrounds → `bg-background`; cards → `glass`-style (solid `--card` + `border-border`); chips/slots → `rounded-full` selected `bg-primary text-primary-foreground`; primary buttons `bg-primary`; receipt card dark.
- [ ] **Step 2:** Bookings list/detail/verify: dark cards (`bg-card border-border rounded-2xl`), status pills from rebased `statusBadgeClass`, time islands `dir="ltr"`.
- [ ] **Step 3:** Login/OTP + profile: dark card surfaces, `bg-primary` CTAs, inputs `bg-input border-border rounded-full` (h-12).
- [ ] **Step 4:** Route loading skeletons: `bg-muted` (already token-based — verify only).
- [ ] **Step 5:** `npm run check`; visual pass 390px dark; commit `customer surfaces: ember restyle`.

### Task 5: Owner/admin Ember-light verification

**Files:** Modify `src/app/owner/**`, `src/app/admin/**`, `src/components/owner/*`, `src/components/admin/*` (class tweaks only)

- [ ] **Step 1:** Grep for hardcoded zinc-era classes (`text-zinc`, `bg-white`, `bg-black/x`) in owner/admin; replace with semantic tokens. Verify dashboards readable in Ember light mode.
- [ ] **Step 2:** `npm run check` + visual pass `/owner`, `/admin` light mode; commit `owner/admin: ember-light verification`.

### Task 6: Final QA + deploy

- [ ] **Step 1:** `npm run check` + `npm run check:build` green; no-motion gate green.
- [ ] **Step 2:** Playwright screenshots: `/` (logged-out + logged-in mock), `/book`, `/bookings`, `/profile`, `/login`, `/owner`, `/admin` — 390px dark + light, desktop 1280; zero rebuild console errors.
- [ ] **Step 3:** Commit, push `main`, watch Vercel auto-deploy to READY, verify live CSS has ember values (`#1D0E0C`, `#E25024`) and no zinc (`#09090b`).
