# Forehand Nail Studio — Design System

> Paper Theme — Samsung-inspired, warm, tactile design system.

---

## 1. Philosophy

- **Paper texture** — subtle canvas-generated grain on all surfaces
- **Warm shadows** — multi-layered with brown tints, not gray
- **Blue gradient CTAs** — consistent `#5bb3e4` → `#2888d0`
- **Mobile-first** — 375px+, thumb-friendly
- **RTL** — full Persian right-to-left layout
- **Accessible** — 44pt+ touch targets, focus-visible

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

### Background & Surfaces

| Token | Value | Usage |
|-------|-------|-------|
| `--paper-bg` | `#e5e2dd` | Page background (warm gray) |
| `--paper-surface` | `#f2f0ec` | Cards, buttons, surfaces |
| `--paper-tile` | canvas-generated | Subtle fiber texture |

### Primary (Blue Gradient)

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#2888d0` | Primary blue |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--accent` | `#5bb3e4` | Light blue accent |
| `--ring` | `#2888d0` | Focus rings |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `--foreground` | `#2a2a2a` | Primary text |
| `--muted-foreground` | `#6a6a6a` | Secondary text |
| `--card-foreground` | `#2a2a2a` | Card text |

### Semantic

| Token | Value | Usage |
|-------|-------|-------|
| `--destructive` | `#DC3545` | Errors, delete |
| `--success` | `#28A745` | Confirmations |
| `--rose` | `#B87070` | Calendar highlights (legacy) |
| `--gold` | `#C49A5C` | Secondary accent (legacy) |

---

## 4. CTA Button (Paper Variant)

```tsx
<Button variant="paper">Action</Button>
```

```css
background: linear-gradient(135deg, #5bb3e4 0%, #2888d0 100%);
color: white;
border: none;
box-shadow:
  0 2px 4px rgba(40,136,208,0.12),
  0 4px 12px rgba(40,136,208,0.18),
  0 8px 24px rgba(40,136,208,0.12);

/* Hover */
transform: translateY(-0.5px);
box-shadow:
  0 3px 6px rgba(40,136,208,0.15),
  0 6px 18px rgba(40,136,208,0.22),
  0 12px 32px rgba(40,136,208,0.15);
```

---

## 5. Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 10px | Small elements |
| `--radius-md` | 14px | Cards, inputs |
| `--radius-lg` | 18px | Default radius |
| `--radius-xl` | 24px | Modals, sheets |
| `--radius-3xl` | 32px | Large containers |

---

## 6. Shadows (Paper Theme)

Warm-tinted multi-layer system. Uses brown/amber tints instead of pure gray.

### Card Shadow

```css
--shadow-card:
  0 0.5px 1px rgba(80,70,60,0.06),
  0 1px 3px rgba(60,50,40,0.05),
  0 2px 6px rgba(50,40,30,0.04),
  0 4px 12px rgba(50,40,30,0.03);
```

### Elevated Shadow

```css
--shadow-elevated:
  0 1px 2px rgba(80,70,60,0.07),
  0 3px 8px rgba(60,50,40,0.06),
  0 6px 16px rgba(50,40,30,0.04),
  0 12px 28px rgba(50,40,30,0.03);
```

### Floating Shadow

```css
--shadow-floating:
  0 2px 4px rgba(80,70,60,0.07),
  0 6px 16px rgba(60,50,40,0.06),
  0 16px 32px rgba(50,40,30,0.04),
  0 32px 64px rgba(50,40,30,0.03);
```

---

## 7. Paper Texture

Canvas-generated 200x200px tile with subtle fiber grain.

- Base color: `#f2f0ec` (rgb 242, 240, 236)
- Noise range: ±2 brightness
- Applied via CSS custom property: `var(--paper-tile)`
- Background-size: 200px 200px, repeat

---

## 8. Components

### Card

```tsx
<Card className="p-4">
  {/* Content */}
</Card>
```

- Paper surface background with texture
- Multi-layer warm shadow
- Top-edge highlight (light catch)

### Button

| Variant | Style |
|---------|-------|
| `default` | Primary blue fill |
| `paper` | Blue gradient with shadow |
| `outline` | Border only, white fill |
| `ghost` | Transparent, hover effect |
| `secondary` | Muted background |
| `destructive` | Red tint |

### Input

- Height: 48px (`--field-xl`)
- Border radius: 14px
- RTL-aware with `dir="ltr"` for numbers/times

---

## 9. Navigation

### Bottom Nav

- Height: 56px
- Paper surface background with texture
- Top-edge highlight
- Active: blue gradient indicator

### Side Menu

- Paper surface background
- Auth-aware: shows login/logout
- Owner menu: no login option (middleware enforces)

---

## 10. Calendar

### Date Strip

- Selected: blue gradient + shadow
- Today: blue outline border
- Fully booked: muted, 60% opacity

### Date Display

```css
background: rgba(40,136,208,0.05);
border: 1px solid rgba(40,136,208,0.1);
```

---

## 11. Animations

| Class | Duration | Effect |
|-------|----------|--------|
| `animate-fade` | 200ms | Opacity 0→1 |
| `animate-scale` | 180ms | Scale 0.92→1 + fade |
| `animate-slideUp` | 220ms | TranslateY 10px→0 + fade |

---

## 12. Loading States

All loading states use shadcn `<Skeleton>` component (rounded-[12px], shimmer animation).

---

## 13. Revert Guide

To switch back to original theme:

1. Set `USE_PAPER_THEME = false` in `layout.tsx`
2. All original variables are preserved in `:root`
