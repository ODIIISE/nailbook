# Forehand Nail Studio — Design System

> Clean Slate — a minimal, high-contrast, black-and-white design system.

---

## 1. Philosophy

- **Minimal and focused** — content-first, low visual noise.
- **High contrast** — pure black on white in light mode, near-white on black in dark mode.
- **Mobile-first** — 375 px+, thumb-friendly touch targets.
- **RTL** — full Persian right-to-left layout.
- **Accessible** — 44 pt+ touch targets, visible focus rings, reduced-motion support.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Components | shadcn/ui (Base UI primitives) |
| Styling | Tailwind CSS v4, CSS variables |
| Font | Vazirmatn (Persian, CDN, weights 400-900) |
| Icons | Heroicons + Lucide |
| Notifications | Sonner (toast) |

---

## 3. Color Tokens

### Primitive variables

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `#FFFFFF` | `#000000` | Page background |
| `--foreground` | `#0A0A0A` | `#FAFAFA` | Primary text, icons |
| `--card` | `#FFFFFF` | `#0A0A0A` | Cards, elevated surfaces |
| `--card-foreground` | `#0A0A0A` | `#FAFAFA` | Text on cards |
| `--popover` | `#FFFFFF` | `#0A0A0A` | Popovers, dropdowns |
| `--popover-foreground` | `#0A0A0A` | `#FAFAFA` | Text on popovers |
| `--primary` | `#0A0A0A` | `#FAFAFA` | Primary buttons, active states |
| `--primary-foreground` | `#FFFFFF` | `#000000` | Text/icons on primary |
| `--secondary` | `#F5F5F5` | `#171717` | Secondary backgrounds |
| `--secondary-foreground` | `#0A0A0A` | `#FAFAFA` | Text on secondary |
| `--muted` | `#F5F5F5` | `#171717` | Muted surfaces |
| `--muted-foreground` | `#737373` | `#A3A3A3` | Secondary text |
| `--accent` | `#0A0A0A` | `#FAFAFA` | Accent (same as primary) |
| `--accent-foreground` | `#FFFFFF` | `#000000` | Text on accent |
| `--destructive` | `#DC2626` | `#EF4444` | Errors, delete |
| `--success` | `#16A34A` | `#22C55E` | Confirmations, paid |
| `--border` | `#E5E5E5` | `#262626` | Borders, dividers |
| `--input` | `#F5F5F5` | `#171717` | Input backgrounds |
| `--ring` | `#0A0A0A` | `#FAFAFA` | Focus rings |

### Shadow tokens

```css
--shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-elevated: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-floating: 0 8px 24px rgba(0, 0, 0, 0.12);
```

Shadows are deliberately subtle; in dark mode the lower ambient brightness makes them read as depth rather than hard shadows.

---

## 4. CTA Button

Primary CTA uses the inverted foreground color:

```tsx
<Button size="xl" className="w-full bg-foreground text-background hover:bg-foreground/90">
  رزرو
</Button>
```

```css
background: var(--foreground);
color: var(--background);
```

Hover reduces opacity to `0.9`. Avoid hardcoded `bg-black`/`text-white`; use `bg-foreground`/`text-background` or `bg-primary`/`text-primary-foreground`.

---

## 5. Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 10px | Small elements |
| `--radius-md` | 14px | Inputs, chips |
| `--radius-lg` | 18px | Cards (default) |
| `--radius-xl` | 24px | Modals, large containers |
| `--radius-3xl` | 32px | Circular avatars, hero elements |

---

## 6. Components

### Card

```tsx
<Card className="p-4">...</Card>
```

- Background: `var(--card)`
- Border: `1px solid var(--border)`
- Border radius: `var(--radius-lg)`
- Shadow: `var(--shadow-card)`

### Button

| Variant | Style |
|---------|-------|
| `default` | `bg-primary text-primary-foreground` |
| `outline` | border only, transparent bg |
| `ghost` | transparent, hover bg |
| `secondary` | muted bg |
| `destructive` | red-tinted |
| `paper` | inverted CTA (`bg-foreground text-background`) |

### Input

- Height: `48px` (`--field-xl`)
- Background: `var(--input)`
- Border radius: `var(--radius-md)`
- Focus ring: `var(--ring)`

---

## 7. Dark Mode

Dark mode is toggled by adding/removing the `dark` class on `<html>`. All components must use the CSS variables above or Tailwind `dark:` variants, not hardcoded `bg-white`, `text-white`, `bg-black`, or `text-black`.

Use the reactive `useIsDark()` hook when JavaScript needs to know the current mode (e.g., canvas or decorative colors).

---

## 8. Typography

**Font:** Vazirmatn across the app.

| Class | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-display` | 34px | 800 | Hero headlines |
| `text-h1` | 24px | 700 | Page titles |
| `text-h2` | 20px | 700 | Card titles |
| `text-h3` | 17px | 600 | Sub-headings |
| `text-body-lg` | 17px | 400 | Large body |
| `text-body` | 15px | 400 | Body text |
| `text-caption` | 13px | 500 | Labels, captions |
| `text-small` | 12px | 400 | Metadata |

---

## 9. Animations

| Class | Duration | Effect |
|-------|----------|--------|
| `animate-fade` | 200ms | opacity 0→1 |
| `animate-scale` | 180ms | scale + fade |
| `animate-slideUp` | 220ms | translate + fade |
| `step-animate` | 250ms | step slide-in |

---

## 10. Do's and Don'ts

### Do

- Use CSS variables for colors and elevation.
- Use `text-foreground`, `bg-background`, `border-border`, etc.
- Test both light and dark modes before shipping UI changes.
- Use logical properties (`ps/pe`, `ms/me`) for RTL.
- Use the `dark:` Tailwind variant or `useIsDark()` for JS logic.

### Don't

- Use hardcoded `bg-white`, `text-white`, `bg-black`, or `text-black`.
- Use `document.documentElement.classList.contains("dark")` directly in render without reactivity.
- Rely on browser default colors that ignore the theme.
- Use pure-black shadows on dark surfaces.

---

## 11. Theme Switching

The `useTheme()` hook in `src/lib/hooks/use-theme.ts` persists the user's choice in `localStorage` and falls back to the system preference. The `ThemeToggle` component can be placed in headers or menus. `useIsDark()` should be used in components that need to react to theme changes outside of CSS.
