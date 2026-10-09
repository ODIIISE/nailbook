---
name: NailBook
description: Persian-first nail salon booking app — warm dark cinematic Studio theme
colors:
  background: "#12100e"
  foreground: "#efe7db"
  card: "#1a1613"
  card-foreground: "#efe7db"
  popover: "#1a1613"
  popover-foreground: "#efe7db"
  primary: "#e9dcc3"
  primary-foreground: "#1b1511"
  secondary: "#221d19"
  secondary-foreground: "#efe7db"
  muted: "#221d19"
  muted-foreground: "#9e9384"
  accent: "#d4b06a"
  accent-foreground: "#1b1511"
  destructive: "#d0687a"
  success: "#a9b79a"
  border: "#efe7db17"
  input: "#efe7db29"
  ring: "#e9dcc3"
typography:
  display:
    fontFamily: "Vazirmatn, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 100
    lineHeight: "1.25"
  headline:
    fontFamily: "Vazirmatn, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 100
    lineHeight: "1.35"
  title:
    fontFamily: "Vazirmatn, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 200
    lineHeight: "1.5"
  body:
    fontFamily: "Vazirmatn, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 300
    lineHeight: "1.7"
  caption:
    fontFamily: "Vazirmatn, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "1.45"
rounded:
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "24px"
  "3xl": "32px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "linear-gradient(135deg,#f3e8d2,#d9c6a4 60%,#cdb28f)"
    textColor: "#1b1511"
    rounded: "999px"
    padding: "0 28px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "var(--mute)"
    rounded: "999px"
    padding: "0 28px"
  card:
    backgroundColor: "var(--card)"
    textColor: "var(--card-foreground)"
    rounded: "22px"
    padding: "16px"
    border: "1px solid var(--border)"
  input:
    backgroundColor: "#efe7db0a"
    textColor: "var(--foreground)"
    rounded: "16px"
    padding: "0 18px"
---

# Design System: NailBook — Studio (v3)

> The full specification lives in `DESIGN-SYSTEM.md`. This file is the
> machine-readable summary. Source of truth is always `src/app/globals.css`.

## Overview

NailBook uses a **warm dark cinematic** visual language: deep espresso
surfaces, cream ink, pearl/gold accents, glass blur, spring motion. One theme
for customer, owner, and homepage. Persian-first RTL, thin Vazirmatn voice.

## Colors

- **Background** (`#12100e`) / surfaces `#1a1613` / `#221d19`: layered depth.
- **Foreground** (`#efe7db` cream): primary text. Muted tier `rgba(239,231,219,.62)`.
- **Primary pearl** (`#e9dcc3` on `#1b1511`): main actions, focus rings.
- **Gold** (`#d4b06a`): accent, suggestions, key figures. **Wine** (`#8c2a3a`/`#d0687a`): danger, no-show. **Sage** (`#a9b79a`): success. **Rose** (`#c7a08e`): tertiary.
- **Border** hairlines `rgba(239,231,219,.09)`, strong `.16`.

## Named Rules

**The Variable-First Rule.** Always use `bg-background`, `text-foreground`, `border-border`, kit classes (`.btn`, `.chip`, `.panel`). Never hardcode hex in components.

**The Contrast Rule.** Cream-on-espresso pairings hold AA; status is never color-alone (tone badge + label).

**The Honesty Rule.** No rendered data without a backend field. No fake states, no demo actions, no hotlinked demo assets (grain is inline SVG).
