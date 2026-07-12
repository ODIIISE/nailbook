# Forehand Nail Studio — Design System

> Mobile-first, RTL, glassmorphism design system for a luxury nail studio booking app.

---

## 1. Philosophy

- **Mobile-first** — every component designed for 375px+, thumb-friendly
- **RTL** — full Persian/Arabic right-to-left layout
- **Glassmorphism** — frosted glass cards over soft gradient blobs
- **Minimal luxury** — warm neutrals, rose accents, clean whitespace
- **Accessible** — 44pt+ touch targets, focus-visible, reduced motion support

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Components | shadcn/ui (Radix UI + Base UI) |
| Styling | Tailwind CSS v4, CSS variables |
| Font | Vazirmatn (Persian, CDN, weights 400/500/700/800) |
| Icons | Lucide React |
| Notifications | Sonner (toast) |
| PWA | manifest.json, standalone display |

---

## 3. Color Tokens

### Core Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#F8F6F4` | Page background (warm white) |
| `--foreground` | `#2C2424` | Primary text (dark brown) |
| `--primary` | `#B87070` | Rose accent (CTAs, highlights) |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--secondary` | `#F0ECE8` | Subtle backgrounds |
| `--secondary-foreground` | `#2C2424` | Text on secondary |
| `--muted` | `#EDE9E4` | Muted backgrounds |
| `--muted-foreground` | `#7A7068` | Secondary text |
| `--destructive` | `#DC3545` | Errors, delete actions |
| `--success` | `#28A745` | Confirmations |

### Surface Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--card` | `rgba(255,255,255,0.72)` | Glass card background |
| `--card-foreground` | `#2C2424` | Card text |
| `--popover` | `rgba(255,255,255,0.92)` | Modal/dropdown background |
| `--border` | `rgba(44,36,36,0.08)` | Subtle borders |
| `--input` | `rgba(44,36,36,0.06)` | Input borders |
| `--ring` | `#D4A0A0` | Focus ring |

### Accent Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--rose` | `#B87070` | Primary accent |
| `--gold` | `#C49A5C` | Secondary accent |
| `--navy` | `#2C2424` | Dark alternative |

---

## 4. Typography

### Font

- **Family:** Vazirmatn (Persian)
- **Fallback:** `-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`
- **Weights:** 400 (Regular), 500 (Medium), 700 (Bold), 800 (ExtraBold)
- **Loading:** `font-display: swap` from jsDelivr CDN

### Type Scale

| Class | Size | Line Height | Weight | Letter Spacing | Use |
|-------|------|-------------|--------|----------------|-----|
| `text-display` | 34px | 1.08 | 800 | -0.025em | Hero heading |
| `text-h1` | 24px | 1.2 | 700 | -0.015em | Page titles |
| `text-h2` | 20px | 1.25 | 700 | -0.01em | Section headings |
| `text-h3` | 17px | 1.3 | 600 | — | Card headings |
| `text-body-lg` | 17px | 1.6 | 400 | — | Descriptions |
| `text-body` | 15px | 1.55 | 400 | — | Body text |
| `text-caption` | 13px | 1.4 | 500 | — | Labels, metadata |
| `text-small` | 12px | 1.4 | 400 | — | Fine print |

---

## 5. Spacing & Layout

### Container

- Max width: `max-w-lg` (512px) centered
- Horizontal padding: `px-4` (16px)

### Touch Targets

- **Minimum:** 44×44pt (Apple HIG)
- **Buttons:** `min-h-[48px] min-w-[48px]`
- **Nav items:** `h-[56px]`
- **Slot buttons:** `h-[46px]`

### Safe Areas

- Bottom nav: `paddingBottom: env(safe-area-inset-bottom, 0px)`
- Viewport: `viewportFit: "cover"` (notch support)

### Spacing Scale (Tailwind)

Use Tailwind's spacing: `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px)

---

## 6. Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 10px | Small elements |
| `--radius-md` | 14px | Cards, inputs |
| `--radius-lg` | 18px | Default radius |
| `--radius-xl` | 24px | Modals, sheets |
| `--radius-3xl` | 32px | Large containers |

---

## 7. Shadows

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-card` | `0 2px 12px rgba(44,36,36,0.05)` | Resting cards |
| `--shadow-elevated` | `0 8px 28px rgba(44,36,36,0.08)` | Hovered/elevated cards |
| `--shadow-floating` | `0 16px 48px rgba(44,36,36,0.10)` | Modals, drawers |

---

## 8. Glass System

### `.glass`

```css
background: rgba(255, 255, 255, 0.42);
backdrop-filter: blur(28px) saturate(1.2);  /* 20px on mobile */
border: 1px solid rgba(255, 255, 255, 0.55);
box-shadow: 0 8px 32px rgba(44, 36, 36, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5);
```

### `.glass-strong`

```css
background: rgba(255, 255, 255, 0.62);
backdrop-filter: blur(36px) saturate(1.3);  /* 24px on mobile */
border: 1px solid rgba(255, 255, 255, 0.6);
```

**Mobile optimization:** Blur reduced on screens < 640px for performance.

---

## 9. Gradient Background

Three blurred gradient blobs behind all content:

| Blob | Color | Size | Position |
|------|-------|------|----------|
| 1 | `#D4A0A0` (light rose) | 340×340px | Top 15% |
| 2 | `#C49A5C` (gold) | 280×280px | Middle 50% |
| 3 | `#B87070` (rose) | 300×300px | Bottom 80% |

All: `filter: blur(100px)`, `opacity: 0.12`, `z-index: -1`, `pointer-events: none`

---

## 10. Components

### Button

**Variants:**

| Variant | Style |
|---------|-------|
| `default` | Rose background, white text, rose shadow |
| `outline` | Glass background, white border |
| `secondary` | Glass background, subtle border |
| `ghost` | Transparent, white hover |
| `destructive` | Red background, white text |
| `link` | Text-only, underline on hover |

**Sizes:**

| Size | Height | Padding | Radius |
|------|--------|---------|--------|
| `default` | 48px | 24px | 14px |
| `sm` | 44px | 16px | 12px |
| `lg` | 56px | 32px | 16px |
| `icon` | 48×48px | — | 14px |
| `icon-sm` | 40×40px | — | 12px |

**Interaction:** `active:scale-[0.97]` press feedback, `focus-visible:ring-2`

### Card

- Glass background with blur
- `rounded-[14px]` or `rounded-[18px]`
- `shadow-card` at rest, `shadow-elevated` on hover

### Input

- `h-12` (48px) minimum height
- Glass or solid background
- `rounded-[14px]`
- RTL-aware with `dir="ltr"` for numbers/times

### Switch

- Toggle for boolean settings
- Rose accent when active

### Badge

- Small status indicators
- Variants: default, secondary, destructive

---

## 11. Animations

| Class | Duration | Effect |
|-------|----------|--------|
| `animate-fade` | 200ms | Opacity 0→1 |
| `animate-scale` | 180ms | Scale 0.92→1 + fade (spring easing) |
| `animate-slideUp` | 220ms | TranslateY 10px→0 + fade |
| `animate-stagger` | 220ms each | Staggered slideUp (40ms delay per child) |

**Easing:** `cubic-bezier(0.25, 0.1, 0.25, 1)` (ease-out), spring for scale: `cubic-bezier(0.34, 1.4, 0.64, 1)`

**Press feedback:** `active:scale-[0.97]` on buttons, `active:scale-95` on slot buttons

**Reduced motion:** All animations disabled via `@media (prefers-reduced-motion: reduce)`

---

## 12. Loading States

### Skeleton

```css
.skeleton {
  background: linear-gradient(90deg, rgba(212,160,160,0.08) 25%, rgba(212,160,160,0.15) 50%, rgba(212,160,160,0.08) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.8s infinite;
  border-radius: 14px;
}
```

---

## 13. Navigation

### Bottom Nav (Customer)

| Item | Icon | Path |
|------|------|------|
| خانه | Home | `/` |
| نوبت‌ها | CalendarDays | `/bookings` |
| پروفایل | User | `/profile` |
| منو | Menu | (drawer) |

### Bottom Nav (Owner)

| Item | Icon | Path |
|------|------|------|
| زمان‌بندی | LayoutGrid | `/owner` |
| خدمات | Briefcase | `/owner/services` |
| ساعات | Clock | `/owner/schedule` |
| منو | Menu | (drawer) |

- Height: 56px
- Background: `bg-background/80 backdrop-blur-xl`
- Active: rose color, bold icon stroke
- Safe area padding at bottom

---

## 14. RTL Layout

- `<html dir="rtl" lang="fa">`
- All text right-aligned by default
- Numbers and times use `dir="ltr"` for correct rendering
- Back arrow points right (← becomes →)
- Horizontal scroll goes left-to-right

---

## 15. Accessibility

- **Focus-visible:** 2px solid primary ring with 2px offset
- **Touch targets:** Minimum 44pt (48px for buttons)
- **Reduced motion:** All animations disabled
- **Zoom:** `maximumScale: 5, userScalable: true`
- **Tap highlight:** Disabled on iOS for clean taps
- **Selection:** Primary color background

---

## 16. Patterns

### Empty States

- Icon (muted, 24px) + message (15px muted) + optional CTA button

### Error States

- Destructive text color + clear message + retry action

### Toast Notifications

- Sonner library
- Success: green, Error: destructive
- Auto-dismiss after 3-5 seconds

### Form Validation

- Error message below field
- Red text color
- Clear recovery path

---

## 17. File Structure

```
src/
├── app/
│   ├── globals.css          ← Design tokens + utilities
│   ├── layout.tsx           ← Root layout, viewport, metadata
│   └── providers.tsx        ← Context providers
├── components/
│   ├── ui/                  ← shadcn/ui primitives
│   ├── booking/             ← Booking flow components
│   ├── landing/             ← Home page components
│   ├── layout/              ← Header, navbar, gradient
│   └── owner/               ← Owner admin components
└── lib/
    ├── utils.ts             ← cn() helper
    ├── jalali.ts            ← Persian calendar
    ├── time.ts              ← Asia/Tehran timezone
    └── slots.ts             ← Booking engine
```
