# Forehand Nail Studio — Design System

> V2 Soft Rounded — Mobile-first, RTL, minimal luxury design system.

---

## 1. Philosophy

- **Mobile-first** — every component designed for 375px+, thumb-friendly
- **RTL** — full Persian right-to-left layout
- **Soft Rounded** — 12px radius, pill buttons, subtle shadows
- **Minimal luxury** — warm neutrals, black CTAs, rose accents, clean whitespace
- **Accessible** — 44pt+ touch targets, focus-visible, reduced motion support

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Components | shadcn/ui (Base UI primitives) |
| Styling | Tailwind CSS v4, CSS variables |
| Font | Vazirmatn (Persian, CDN, weights 400-900) |
| Icons | Heroicons (outline default, solid active) + Lucide (supplementary) |
| Notifications | Sonner (toast) |

---

## 3. Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#F8F6F4` | Page background (warm white) |
| `--foreground` | `#2C2424` | Primary text (dark brown) |
| `--primary` | `#1A1A1A` | Button fill, CTAs (pure black) |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--secondary` | `#F0ECE8` | Subtle backgrounds |
| `--muted` | `#EDE9E4` | Muted backgrounds |
| `--muted-foreground` | `#7A7068` | Secondary text |
| `--destructive` | `#DC3545` | Errors, delete actions |
| `--success` | `#28A745` | Confirmations |
| `--rose` | `#B87070` | Calendar highlights, accent |
| `--gold` | `#C49A5C` | Secondary accent |

---

## 4. Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 10px | Small elements |
| `--radius-md` | 14px | Cards, inputs |
| `--radius-lg` | 18px | Default radius |
| `--radius-xl` | 24px | Modals, sheets |
| `--radius-3xl` | 32px | Large containers |

---

## 5. Shadows (V2 Soft)

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-card` | `0 1px 4px rgba(44,36,36,0.04)` | Resting cards |
| `--shadow-elevated` | `0 4px 16px rgba(44,36,36,0.06)` | Elevated cards |
| `--shadow-floating` | `0 8px 32px rgba(44,36,36,0.08)` | Modals, drawers |

---

## 6. Glass System (V2 Soft)

```css
.glass {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(20px) saturate(1.15);
  border: 1px solid rgba(232, 224, 214, 0.6);
  box-shadow: 0 1px 4px rgba(44, 36, 36, 0.04);
}
```

---

## 7. Components

### Button

- **Shape:** Pill (`rounded-full`)
- **Variants:** default (black), outline, secondary, ghost, destructive, link
- **Sizes:** default (h-8), sm (h-7), lg (h-9), icon, icon-sm, icon-lg
- **Interaction:** `active:translate-y-px`, `focus-visible:ring-2`

### Card

- Glass background with blur
- `rounded-[14px]`
- `shadow-card` at rest

### Input

- `h-12` (48px) minimum height
- `rounded-[14px]`
- RTL-aware with `dir="ltr"` for numbers/times

---

## 8. Navigation

### Bottom Nav Icons (Heroicons)

| Tab | Default (outline) | Active (solid) |
|-----|-------------------|----------------|
| خانه | `HomeIcon` outline | `HomeIcon` solid |
| نوبت‌ها | `CalendarDaysIcon` outline | `CalendarDaysIcon` solid |
| پروفایل | `UserIcon` outline | `UserIcon` solid |

- Height: 56px
- Gap between icon and label: `gap-1.5`
- Background: `bg-background/80 backdrop-blur-xl`

### Side Menu

- Auth-aware: shows "ورود" when not logged in, "خروج" when logged in
- "ورود مدیر" pinned to bottom of customer menu only
- Owner menu: no "ورود مدیر" (middleware enforces auth)

---

## 9. Animations

| Class | Duration | Effect |
|-------|----------|--------|
| `animate-fade` | 200ms | Opacity 0→1 |
| `animate-scale` | 180ms | Scale 0.92→1 + fade |
| `animate-slideUp` | 220ms | TranslateY 10px→0 + fade |

**Reduced motion:** All animations disabled via `@media (prefers-reduced-motion: reduce)`

---

## 10. Loading States

All loading states use shadcn `<Skeleton>` component (rounded-[12px], shimmer animation).

---

## 11. Auth System

- **Customer PINs:** Plain 4-digit text (owner can see them)
- **Owner PINs:** PBKDF2 hashed (secure)
- **Sessions:** HMAC-SHA256 signed cookies (httpOnly, secure, sameSite: lax)
- **Middleware:** Protects `/owner/*` and `/api/owner/*` routes
