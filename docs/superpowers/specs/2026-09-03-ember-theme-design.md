# Ember Theme — Design Spec Addendum

> Date: 2026-09-03 · Status: Approved (brainstorm summary) · Extends: `2026-09-03-frontend-rebuild-design.md`
> Source of truth for visuals: Figma file `Os7RRGFREXJDMeKeKId6HC` node `69-733` ("forehand nail homepage"), extracted node-tree + pixel measurements in this doc.

## 1. What changes

The barebone zinc system is replaced by **Ember** — a dark, warm, orange-accented theme extracted from the user's Figma design. Stock shadcn structure/behavior is kept (primitives, tokens layout, zero-motion gate); only the values and surface styling change.

- **Zero-motion policy: unchanged** — `src/lib/no-motion.test.ts` stays authoritative. The Figma design is static; nothing animates.
- **Global scope:** customer surfaces (homepage, booking, bookings, profile, login) are fully rebuilt in Ember. Owner/admin keep their stock layouts and get Ember light-mode values through tokens only.
- **Personalization is real data:** greeting uses the logged-in customer's name; the gradient subtitle computes days since their last booking.

## 2. Extracted design values (from Figma node tree + pixel sampling)

### Layout (440×956 frame)
- Hero image full-bleed, top ~45% of viewport, fading to background
- Orange radial glow circle: 404×404, radial `#AD3C22 → #E25024`, positioned at the hero/content seam (x=18, y=428)
- Content column: 400px wide, x=20 inset
- Floating bottom nav: 240×108 (three 74px circles + 12px labels), centered, y=815

### Sections (top to bottom)
1. **Header** (y=55): salon name 12px/500 white; Jalali date 12px/300 white@80%; menu button 74px circle white@10% with 20px icon
2. **Greeting** (y≈134): "«{firstName}» جون خوش اومدی" 24px/700 + smile glyph; subtitle 12px/900 **linear gradient text** `#FF9778 → #FFD399`; hairline divider
3. **نوبت‌های من** (y=289): title 20px/400 + receipt icon; divider; empty state row (arrow icon + "هنوز نوبت فعالی نداری" 12px/400)
4. **گالری** (y=419): title 20px/400 inside 74×31 white@10% pill + gallery icon; divider; horizontal rail of 5 pill cards 91×173, r=999, white@10% border, IMAGE fill inside
5. **CTA** (y=702): 400×72 pill, white@10%, "رزرو نوبت" 24px/300 white@80% + nail icon 20px
6. **Bottom nav**: 3 items — پروفایل / خانه (active: solid white circle, black icon) / نوبت‌ها; inactive circles white@10% with white@80% icons; labels 12px/400

### Color system (pixel-sampled)
| Role | Value |
|---|---|
| Background (content) | `#1D0E0C` (near-black warm) |
| Radial accent | `#AD3C22 → #E25024` |
| Gradient text accent | `#FF9778 → #FFD399` |
| Surfaces/chrome | `rgba(255,255,255,0.10)` |
| Foreground | `#FFFFFF` / `#FFFFFF`@80% |
| Hero photo mood | terracotta/coral (photo asset) |

### Typography
Vazirmatn only; scale 12/20/24px, weights 300/400/500/700/900. Maps onto existing `.text-caption`(12)/`.text-h2`(20)/`.text-display`(24) utilities; weights adjusted per section.

### Geometry
Pill geometry system-wide: nav circles 74px (r=999), gallery cards r=999, CTA r=999, title pills r=999, menu button r=999. Content cards keep large radii; nothing uses the old 10px "card" look on customer surfaces.

## 3. Token values (implementation)

### Dark (default)
```
--background: #1D0E0C;
--foreground: #FFF7F2;
--card: #241410;            /* solid base under glass */
--card-foreground: #FFF7F2;
--popover: #241410;
--popover-foreground: #FFF7F2;
--primary: #E25024;
--primary-foreground: #FFF7F2;
--secondary: #2A1813;
--secondary-foreground: #FFF7F2;
--muted: #2A1813;
--muted-foreground: rgba(255,247,242,0.70);
--accent: rgba(255,255,255,0.10);   /* glass surface token */
--accent-foreground: #FFF7F2;
--destructive: #FF6B5E;
--success: #5FBF77;
--warning: #F5A623;
--border: rgba(255,247,242,0.14);
--input: rgba(255,247,242,0.10);
--ring: #E25024;
--ember-grad-a: #AD3C22;    /* radial glow */
--ember-grad-b: #E25024;
--ember-text-a: #FF9778;    /* gradient text */
--ember-text-b: #FFD399;
```
Utilities: `.glass` = `background: var(--accent); border: 1px solid var(--border); border-radius: 999px` (static; backdrop-filter only on the floating nav). `.gradient-text` = background-clip text with the ember text gradient.

### Light ("daylight ember")
```
--background: #FAF3EF;  --foreground: #2A130D;
--card: #FFFFFF;  --popover: #FFFFFF;
--primary: #D6471C;  --primary-foreground: #FFFFFF;
--muted: #F3E4DC;  --muted-foreground: #8A6A5E;
--accent: #F3E4DC;  --border: #EBDCD4;  --input: #EBDCD4;  --ring: #D6471C;
--success: #1E7D3C;  --destructive: #C2372B;  --warning: #B45309;
```
Glass surfaces become solid `--accent` in light mode (no white-on-white translucency).

## 4. Data wiring

- **Greeting:** `useAuth().user` → first name → «{name} جون، خوش اومدی». Not logged in → «خوش اومدی» alone, no subtitle.
- **Days-since-visit subtitle:** from `/api/read/bookings` (existing) — most recent past booking → «{n} هفته از آخرین نوبتت گذشته . . .» (weeks, rounded; «دیگه چیزی نمانده…» variants not needed — one template). No history → hide subtitle.
- **نوبت‌های من:** active (reserved/confirmed/in_progress) bookings from the same fetch; empty → the Figma empty state; non-empty → compact list (service + Jalali date + time, pill rows), «همه» link to `/bookings`.
- **گالری:** highlights/lookbook images from `useSalon()` (existing), rail links open the existing lookbook sheet. Fallback: hide section when salon has no images.
- **Header date:** today's Jalali date via existing `jalali.ts` («امروز پنجشنبه ۱۲ شهریور ۱۴۰۵» format).
- **Assets:** hero + gallery images uploaded via existing Vercel Blob owner endpoints (`/api/upload-hero` path already supports hero_image_url); Figma stock photos seeded through the owner settings UI — no new backend.

## 5. Nav mapping

Floating pill nav (customer surfaces): خانه `/` · نوبت‌ها `/bookings` · پروفایل `/profile`. Active = solid white circle + black icon. `AppNavbar` restyled to this geometry; menu button opens the existing drawer (Ember-styled).

## 6. Acceptance criteria

1. `npm run check` + `check:build` green; no-motion gate green.
2. Homepage pixel-comparable to Figma: section order, pill geometry, radial glow seam, gradient subtitle, floating nav.
3. All interactive targets ≥44px; focus rings visible; overlays keep Escape/backdrop/focus-trap.
4. Persian digits, Jalali dates, `dir="ltr"` time islands preserved.
5. Owner/admin surfaces render correctly in Ember light tokens (no dark-on-dark text).
6. Not-logged-in homepage shows generic greeting without personal data calls failing.
