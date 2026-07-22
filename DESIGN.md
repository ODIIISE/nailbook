---
name: NailBook
description: Persian-first nail salon booking app with paper texture aesthetic
colors:
  primary: "#2888d0"
  primary-foreground: "#FFFFFF"
  accent: "#5bb3e4"
  accent-foreground: "#FFFFFF"
  secondary: "#e2dfdb"
  secondary-foreground: "#2a2a2a"
  background: "#e5e2dd"
  foreground: "#2a2a2a"
  muted: "#e2dfdb"
  muted-foreground: "#6a6a6a"
  destructive: "#DC3545"
  success: "#28A745"
  rose: "#B87070"
  gold: "#C49A5C"
  warm-white: "#F8F6F4"
  navy: "#2C2424"
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
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  card:
    backgroundColor: "rgba(255, 255, 255, 0.55)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "rgba(44, 36, 36, 0.04)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: NailBook

## Overview

**Creative North Star: "The Paper Atelier"**

NailBook's design language draws from the tactile warmth of craft paper and the precision of a nail artist's workspace. The aesthetic is soft, feminine, and intentionally understated — letting content breathe rather than competing for attention. Every surface feels like premium stationery: matte, warm-toned, with subtle depth created through layered shadows rather than gradients or glass effects.

The paper theme replaces the default glassmorphism with a grounded, paper-like texture that feels premium without being flashy. Blue accents (#2888d0) provide clear action signals against the warm neutral canvas. Typography is exclusively Vazirmatn — a Persian-optimized variable font that reads beautifully in RTL at every weight.

**Key Characteristics:**
- Paper texture backgrounds (warm gray #e5e2dd base, #f2f0ec surfaces)
- Warm-tinted multi-layer shadows instead of hard drop shadows
- Blue accent system for primary actions (CTA buttons, active states)
- Generous rounded corners (10-32px) on all interactive elements
- RTL-first layout with natural Persian text flow
- Subtle staggered entrance animations (fade, scale, slide-up)

## Colors

The palette is warm-neutral with a single blue accent. Rose and gold appear as decorative accents in gradient blobs, never as functional UI colors.

### Primary
- **Sky Blue** (#2888d0): Primary action buttons, focus rings, active navigation states, CTA gradients. The single trust signal color.
- **Light Blue** (#5bb3e4): Accent hover states, secondary emphasis, gradient endpoints. Lighter companion to primary.

### Neutral
- **Paper Background** (#e5e2dd): Page background. Warm gray with slight pink undertone.
- **Paper Surface** (#f2f0ec): Card, popover, and elevated surface background. One step lighter than background.
- **Muted** (#e2dfdb): Borders, dividers, secondary backgrounds, disabled states.
- **Foreground** (#2a2a2a): Primary text color. Near-black with warm tint — never pure #000.
- **Muted Foreground** (#6a6a6a): Secondary text, labels, captions. Warm gray, never cold.

### Decorative (gradient blobs only)
- **Rose** (#B87070): Background gradient blob accent. Not used in UI components.
- **Gold** (#C49A5C): Background gradient blob accent. Not used in UI components.

### Named Rules
**The Blue-Only Action Rule.** Blue (#2888d0) is the only color used for interactive primary actions. Rose and gold exist solely as ambient background decoration. Never use them for buttons, links, or active states.

**The Warm-Tint Rule.** All neutrals carry a warm (pink/amber) undertone. Pure gray, pure white, and pure black are never used. This preserves the paper-craft atmosphere.

## Typography

**Display Font:** Vazirmatn (with system fallback stack)
**Body Font:** Vazirmatn (same family, lighter weights)

**Character:** Vazirmatn is a variable Persian font designed for screen readability. It handles RTL text with natural letterforms and generous x-height. The weight range (400-800) covers the full hierarchy from body to display.

### Hierarchy
- **Display** (800, 34px, 1.08): Hero headlines on landing page. Tight tracking (-0.025em).
- **Headline** (700, 24px, 1.2): Section titles, page headers. Slight negative tracking.
- **Title** (700, 20px, 1.25): Card titles, modal headers.
- **Body** (400, 15px, 1.55): Primary reading text. Comfortable line height for RTL.
- **Caption** (500, 13px, 1.4): Labels, metadata, timestamps. Medium weight for visibility at small size.

### Named Rules
**The Single-Family Rule.** Vazirmatn is the only font family in the system. No secondary fonts for headings, code, or display. This keeps the Persian-first identity consistent.

## Layout

Mobile-first, single-column layout constrained to max-width 512px (max-w-lg). Content centers on wider screens. Generous vertical rhythm: 16px between related elements, 24-32px between sections.

The bottom navigation bar (AppNavbar) is fixed to the viewport bottom on mobile. The header (AppHeader) is sticky at top. Content scrolls between them with 20px bottom padding to prevent overlap.

RTL is set at the HTML level (dir="rtl"). All padding/margin utilities use logical properties (ps/pe instead of pl/pr) for automatic RTL mirroring.

## Elevation & Depth

Depth is conveyed through warm-tinted multi-layer box-shadows with very low opacity. No hard drop shadows. No colored shadows. The shadow system has three levels:

### Shadow Vocabulary
- **Card** (4 layers, max opacity 0.06): Subtle lift for cards, list items. Used on most surfaces at rest.
- **Elevated** (4 layers, max opacity 0.07): Modals, dropdowns, popovers. Medium lift for elements above the base layer.
- **Floating** (4 layers, max opacity 0.08): Toast notifications, full-screen overlays. Maximum lift.

### Named Rules
**The Warm Shadow Rule.** All shadows use rgba(80,70,60,...) or rgba(60,50,40,...) tinting — never pure black. This preserves the paper warmth even in depth.

## Shapes

Generous, consistent rounding across all interactive elements. The radius scale is intentionally larger than typical web apps (starting at 10px, not 4-6px) to reinforce the soft, approachable character.

- **Small** (10px): Input fields, small badges, chips
- **Medium** (14px): Buttons, tags, form elements
- **Large** (18px): Cards, containers, modals (default --radius)
- **XL** (24px): Hero cards, large feature blocks
- **3XL** (32px): Avatar containers, circular feature elements

No sharp corners exist anywhere in the system. No borders on cards (shadows define edges instead).

## Components

### Buttons
- **Shape:** Gently curved (18px radius, matching --radius)
- **Primary:** Sky Blue (#2888d0) background, white text. Blue gradient variant for hero CTAs (linear-gradient 135deg from #5bb3e4 to #2888d0) with triple-layer blue box-shadow.
- **Hover / Focus:** Shadow intensifies on hover (blue-tinted). Focus ring uses primary blue with 2px offset.
- **Ghost:** Transparent background, foreground text. Used for secondary actions and navigation.

### Cards / Containers
- **Corner Style:** Large rounding (18px)
- **Background:** Paper Surface (#f2f0ec) — matte, no backdrop-filter in paper mode
- **Shadow Strategy:** Card-level warm shadows at rest, Elevated on hover/focus
- **Border:** None — shadow defines the edge. Subtle 1px top highlight line for paper effect.
- **Internal Padding:** 16px (4-unit)

### Inputs / Fields
- **Style:** Warm-tinted background (rgba(44,36,36,0.04)), 14px radius, no visible border at rest
- **Focus:** 2px blue outline with 2px offset
- **Error:** Red destructive color for border/label

### Navigation
- **Bottom Bar:** Fixed, 4-5 icon tabs, paper surface background, subtle top border. Active state uses primary blue.
- **Side Menu:** Drawer from right (RTL), paper surface background, icon + label items.

### Skeleton Loader
- **Style:** Rose-tinted gradient shimmer (rgba(212,160,160,0.08) to 0.15), 12px radius, 1.8s animation cycle

## Do's and Don'ts

### Do:
- **Do** use blue (#2888d0) for all primary actions — it's the only action color.
- **Do** use warm-tinted shadows for depth — never pure black shadows.
- **Do** keep surfaces matte and paper-like — no glassmorphism in paper mode.
- **Do** use Vazirmatn at every weight and size — no other fonts.
- **Do** respect RTL layout — use logical CSS properties (ps/pe, ms/me).

### Don't:
- **Don't** use rose or gold for interactive elements — they're decorative background accents only.
- **Don't** use pure white (#FFFFFF) or pure black (#000000) — always warm-tinted.
- **Don't** add borders to cards — shadows define the edges.
- **Don't** use sharp corners (below 10px radius) — the system is intentionally rounded.
- **Don't** nest cards inside cards — use elevation levels instead.
