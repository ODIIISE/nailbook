# NailBook Design System - Clean Slate

## Overview

Replaced the paper texture theme with a clean, minimal black and white design system supporting both dark and light modes.

## Design Philosophy

- **Minimal**: Clean, uncluttered interface
- **High Contrast**: Black text on white (light mode), white text on black (dark mode)
- **Consistent**: Unified spacing, typography, and component styling
- **Accessible**: High contrast ratios for readability
- **Modern**: Contemporary design patterns

## Color System

### Light Mode
| Element | Color | Value |
|---------|-------|-------|
| Background | White | `#ffffff` |
| Secondary BG | Light Gray | `#f8f9fa` |
| Tertiary BG | Lighter Gray | `#f1f3f5` |
| Text Primary | Black | `#000000` |
| Text Secondary | Gray | `#6c757d` |
| Text Muted | Light Gray | `#adb5bd` |
| Border | Gray | `#e9ecef` |
| Accent | Black | `#000000` |
| Success | Green | `#22c55e` |
| Error | Red | `#ef4444` |

### Dark Mode
| Element | Color | Value |
|---------|-------|-------|
| Background | Black | `#000000` |
| Secondary BG | Dark Gray | `#111111` |
| Tertiary BG | Darker Gray | `#1a1a1a` |
| Text Primary | White | `#ffffff` |
| Text Secondary | Light Gray | `#a1a1a1` |
| Text Muted | Dark Gray | `#666666` |
| Border | Dark Gray | `#2a2a2a` |
| Accent | White | `#ffffff` |
| Success | Green | `#22c55e` |
| Error | Red | `#ef4444` |

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Scale
| Element | Size | Weight |
|---------|------|--------|
| H1 | 24px | 700 |
| H2 | 20px | 600 |
| H3 | 18px | 600 |
| Body | 16px | 400 |
| Small | 14px | 400 |
| Caption | 12px | 400 |

## Spacing System

Based on 8px grid:
- 4px (xs)
- 8px (sm)
- 12px (md)
- 16px (lg)
- 20px (xl)
- 24px (2xl)
- 32px (3xl)
- 40px (4xl)
- 48px (5xl)

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 8px | Small elements |
| `--radius-md` | 12px | Cards, inputs |
| `--radius-lg` | 16px | Containers |
| `--radius-xl` | 24px | Modals, sheets |

## Shadows

### Light Mode
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
```

### Dark Mode
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.4);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5);
```

## Components

### Buttons

**Primary**
```css
background: var(--accent);
color: var(--bg-primary);
border: none;
border-radius: var(--radius-md);
padding: 16px;
font-size: 16px;
font-weight: 600;
```

**Outline**
```css
background: transparent;
border: 1px solid var(--border-color);
color: var(--text-primary);
border-radius: var(--radius-md);
padding: 16px;
font-size: 16px;
font-weight: 600;
```

### Inputs

```css
width: 100%;
padding: 16px;
border-radius: var(--radius-md);
border: 1px solid var(--border-color);
background: var(--bg-secondary);
color: var(--text-primary);
font-size: 16px;
```

### Cards

```css
background: var(--bg-secondary);
border-radius: var(--radius-lg);
border: 1px solid var(--border-color);
padding: 16px;
```

## Dark/Light Mode Toggle

```javascript
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}
```

## Implementation Notes

1. **CSS Variables**: All colors and spacing use CSS variables for easy theming
2. **Data Attribute**: Theme toggled via `data-theme="dark"` on `<html>`
3. **Transitions**: Smooth 0.3s transition for theme changes
4. **No Paper Texture**: Removed all canvas-generated textures and warm tints
5. **Minimal Shadows**: Subtle, modern shadow system

## Comparison: Old vs New

| Aspect | Paper Theme | Clean Slate |
|--------|-------------|-------------|
| Background | Warm gray (#e5e2dd) | Pure white (#ffffff) |
| Surface | Paper texture | Solid colors |
| Shadows | Warm brown tints | Neutral gray |
| Accents | Blue gradient | Black/White |
| Mode | Single mode | Dark + Light |
| Complexity | Canvas textures | CSS-only |

## Migration Guide

To implement Clean Slate in the actual app:

1. Replace `globals.css` with new color variables
2. Remove all paper texture related code
3. Update component styles to use new tokens
4. Add theme toggle functionality
5. Test in both dark and light modes

---

Created: July 2026
