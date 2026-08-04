> ⚠️ **DEPRECATED**: This document describes a paper-blue (#2888d0) design system that no longer reflects the actual implementation. The live app uses a monochromatic Clean Slate theme (#0A0A0A + cool grays). See `src/app/globals.css` and `src/lib/design-tokens.ts` for the source of truth.

---
name: NailBook
description: Persian-first nail salon booking app with a clean, high-contrast aesthetic
colors:
  background: "#FFFFFF"
  foreground: "#0A0A0A"
  card: "#FFFFFF"
  card-foreground: "#0A0A0A"
  popover: "#FFFFFF"
  popover-foreground: "#0A0A0A"
  primary: "#0A0A0A"
  primary-foreground: "#FFFFFF"
  secondary: "#F5F5F5"
  secondary-foreground: "#0A0A0A"
  muted: "#F5F5F5"
  muted-foreground: "#737373"
  accent: "#0A0A0A"
  accent-foreground: "#FFFFFF"
  destructive: "#DC2626"
  success: "#16A34A"
  border: "#E5E5E5"
  input: "#F5F5F5"
  ring: "#0A0A0A"
typography:
  display:
    fontFamily: "Vazirmatn, -apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: "1.08"
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Vazirmatn, -apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "1.2"
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Vazirmatn, -apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "1.25"
    letterSpacing: "-0.01em"
  subtitle:
    fontFamily: "Vazirmatn, -apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "1.3"
  body-lg:
    fontFamily: "Vazirmatn, -apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "1.6"
  body:
    fontFamily: "Vazirmatn, -apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "1.55"
  caption:
    fontFamily: "Vazirmatn, -apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "1.4"
  small:
    fontFamily: "Vazirmatn, -apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "1.4"
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  "3xl": "32px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "var(--foreground)"
    textColor: "var(--background)"
    rounded: "18px"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "var(--foreground)"
    rounded: "18px"
    padding: "12px 24px"
  card:
    backgroundColor: "var(--card)"
    textColor: "var(--card-foreground)"
    rounded: "18px"
    padding: "16px"
    border: "1px solid var(--border)"
  input:
    backgroundColor: "var(--input)"
    textColor: "var(--foreground)"
    rounded: "14px"
    padding: "10px 14px"
---

# Design System: NailBook

## Overview

NailBook uses a **Clean Slate** visual language: a minimal, high-contrast black-and-white system that keeps attention on the content. It is intentionally neutral so that salon photos, service images, and status colors stand out.

**Key Characteristics:**
- Pure white background in light mode, pure black in dark mode.
- Near-black/white foregrounds for maximum readability.
- Subtle elevation through light shadows and borders.
- RTL-first Persian layout.
- Generous rounded corners and comfortable touch targets.

## Colors

The palette is intentionally small. Almost everything derives from the CSS variables in `globals.css`.

### Neutral
- **Background** (`#FFFFFF` light / `#000000` dark): Page background.
- **Foreground** (`#0A0A0A` light / `#FAFAFA` dark): Primary text, icons, primary buttons.
- **Card** (`#FFFFFF` light / `#0A0A0A` dark): Card and elevated surface backgrounds.
- **Muted** (`#F5F5F5` light / `#171717` dark): Secondary backgrounds, disabled states.
- **Muted Foreground** (`#737373` light / `#A3A3A3` dark): Secondary text, captions, placeholders.
- **Border** (`#E5E5E5` light / `#262626` dark): Dividers, input borders, card borders.

### Semantic
- **Primary / Foreground**: Main actions, focus rings, active nav items.
- **Destructive** (`#DC2626` / `#EF4444`): Errors, cancellations, delete actions.
- **Success** (`#16A34A` / `#22C55E`): Confirmations, paid status, success toasts.

### Named Rules
**The Variable-First Rule.** Always use `bg-foreground`, `text-background`, `border-border`, etc. Never hardcode `bg-white`, `text-white`, `bg-black`, or `text-black`.

**The Contrast Rule.** Foreground and background maintain high contrast in both modes. Decorative gradients should not reduce readability.

## Typography

**Font:** Vazirmatn (with system fallback stack)

### Hierarchy
- **Display** (800, 34px): Hero headlines.
- **Headline** (700, 24px): Page/section titles.
- **Title** (700, 20px): Card titles, modal headers.
- **Subtitle** (600, 17px): Section subheadings.
- **Body-LG** (400, 17px): Large reading text, stat values.
- **Body** (400, 15px): Primary reading text.
- **Caption** (500, 13px): Labels, metadata.
- **Small** (400, 12px): Footnotes, dense metadata. 12px is the floor — never smaller on mobile.

## Layout

Mobile-first, single-column layout constrained to `max-w-lg` (512 px). Content centers on wider screens. RTL is set at the HTML level (`dir="rtl"`). Use logical CSS utilities (`ps/pe`, `ms/me`) for automatic mirroring.

## Elevation & Depth

Elevation is conveyed through subtle shadows and 1 px borders, not heavy drop shadows. The scale has three levels:

- **Card**: `0 1px 2px rgba(0,0,0,0.04)`
- **Elevated**: `0 4px 12px rgba(0,0,0,0.08)`
- **Floating**: `0 8px 24px rgba(0,0,0,0.12)`

## Shapes

Generous, consistent rounding:

- **Small** (10px): badges, chips
- **Medium** (14px): inputs, buttons
- **Large** (18px): cards (default)
- **XL** (24px): modals, hero cards
- **3XL** (32px): avatars, circular elements

## Components

### Buttons
- Primary CTA: `bg-foreground text-background` with full rounding.
- Secondary actions: `variant="outline"` or `variant="ghost"`.
- Destructive actions: red-tinted.

### Cards
- Background: `var(--card)`
- Border: `1px solid var(--border)`
- Shadow: `var(--shadow-card)`
- Border radius: `18px`

### Inputs
- Background: `var(--input)`
- Border: `1px solid var(--border)`
- Focus ring: `var(--ring)`

## Dark Mode

Dark mode is controlled by the `dark` class on `<html>`. Components should use CSS variables or Tailwind `dark:` variants. For JavaScript that depends on the current mode, use `useIsDark()`.

## Do's and Don'ts

### Do
- Use CSS variables and `dark:` variants for theme-aware colors.
- Keep touch targets at least 44 × 44 px.
- Use Vazirmatn for all text.
- Respect RTL with logical properties.
- Test both light and dark modes.

### Don't
- Use hardcoded `bg-white`, `text-white`, `bg-black`, or `text-black`.
- Read `document.documentElement.classList.contains("dark")` directly without reactivity.
- Use colored shadows or heavy drop shadows in dark mode.
- Introduce new accent colors without updating the design tokens.
