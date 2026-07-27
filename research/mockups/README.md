# NailBook Booking Flow Mockups

## Overview

This directory contains interactive mockups for the improved NailBook booking flow. Each mockup demonstrates a specific improvement with a clean black/white design theme supporting both dark and light modes.

## Features

- **Clean Design**: Black and white theme with minimal aesthetics
- **Dark/Light Mode**: Toggle with the ◑ button in top-right corner
- **Interactive**: Click through different steps and options
- **Mobile-First**: Designed for 375px+ screens (iPhone frame)

## Mockup Files

### 1. Simplified Auth (SMS OTP)
**File**: `01-simplified-auth.html`

- Replaces 4-step PIN creation with 2-step SMS OTP
- Reduces authentication friction by 75%
- Shows phone input → OTP verification flow

### 2. Guest Booking
**File**: `02-guest-booking.html`

- Allows booking without mandatory account creation
- Phone number only required for guests
- Optional name field
- Comparison with current 4-step flow

### 3. Visual Service Cards
**File**: `03-visual-service-cards.html`

- Service cards with images, price, duration, and ratings
- Enhanced addon selection with visual feedback
- Running total calculation
- Before/after comparison

### 4. Improved Calendar & Time Picker
**File**: `04-improved-calendar.html`

- Grid-based time slot layout
- Availability indicators (high/medium/low)
- Popular time slot badges
- "Next day" quick navigation

### 5. Complete Flow Comparison
**File**: `05-complete-flow.html`

- Side-by-side comparison of current vs improved flow
- All improvements in one view
- Expected impact metrics
- Visual flow diagram

## How to Use

1. Open `index.html` in a web browser to see all mockups
2. Click on any mockup card to view details
3. Use the ◑ button to toggle between dark and light modes
4. Navigate through different steps using the buttons

## Design System

The mockups use a clean design system defined in `clean-theme.css`:

- **Colors**: Pure black (#000) and white (#fff) with gray accents
- **Typography**: System font stack (San Francisco, Segoe UI, etc.)
- **Spacing**: Consistent 8px grid system
- **Border Radius**: 8px, 12px, 16px, 24px scales
- **Shadows**: Subtle, minimal shadows

## Expected Impact

| Improvement | Expected Impact |
|-------------|-----------------|
| Simplified Auth | +20-30% booking completion |
| Guest Booking | +15-25% conversion rate |
| Visual Service Cards | +20-30% user engagement |
| Improved Calendar | Better UX, fewer errors |

## Files

```
mockups/
├── index.html              # Main page with all mockups
├── clean-theme.css         # Design system CSS
├── 01-simplified-auth.html # SMS OTP authentication
├── 02-guest-booking.html   # Guest booking flow
├── 03-visual-service-cards.html # Enhanced service cards
├── 04-improved-calendar.html    # Better calendar UX
└── 05-complete-flow.html        # Complete flow comparison
```

## Next Steps

1. Review all mockups in both dark and light modes
2. Select preferred design direction for each improvement
3. Prioritize based on development effort vs impact
4. Implement changes in phases:
   - Phase 1: Quick wins (1-2 weeks)
   - Phase 2: Medium effort (2-4 weeks)
   - Phase 3: Advanced features (4-6 weeks)

---

Created: July 2026
