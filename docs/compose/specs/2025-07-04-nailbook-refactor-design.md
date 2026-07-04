# NailBook Refactor Design Spec

**Date:** 2025-07-04
**Project:** Forehand Nail Studio Booking App
**Scope:** Major refactor of existing Next.js + Supabase app

---

## [S1] Architecture Overview

**Current Structure Issues:**
- Mixed concerns (components do too many things)
- Inconsistent data flow
- Performance problems from unnecessary re-renders

**New Architecture:**

```
src/
├── app/                    # Next.js pages (minimal, just routing)
│   ├── page.tsx           # Landing page
│   ├── book/              # 3-tap booking flow
│   ├── owner/             # Owner dashboard
│   └── api/               # API routes
├── components/
│   ├── booking/           # Booking-specific components
│   ├── owner/             # Owner-specific components
│   ├── ui/                # Reusable UI primitives
│   └── layout/            # Layout components
├── lib/
│   ├── supabase/          # Database queries
│   ├── hooks/             # Custom React hooks
│   └── utils/             # Utility functions
└── types/                 # TypeScript types
```

**Key Principles:**
- Components are small and focused (one job each)
- Data flows top-down (no prop drilling)
- Hooks handle business logic
- UI components are pure (just render)

---

## [S2] Customer Flow: 3-Tap Booking

**Current Flow (5+ steps):**
1. Landing page
2. Services page
3. Select service
4. Select date
5. Select time
6. Auth (phone → name → PIN)
7. Confirm booking
8. Receipt

**New Flow (3 taps):**

**Tap 1: Select Service**
- Clean service cards with photo, name, price, duration
- Tap to select → immediately show available times

**Tap 2: Select Time**
- Calendar strip at top (7 days)
- Time slots below (grouped: "Suggested" vs "Available")
- Tap time → proceed to confirm

**Tap 3: Confirm & Book**
- Simple summary card
- One tap to confirm (if logged in)
- If not logged in: quick phone + PIN (2 fields, not 5)

**Key UX Improvements:**
- No separate services page - services shown on landing
- Date selection integrated with time slots
- Auth simplified (phone + PIN only, no name field on first booking)
- Instant feedback (loading states, success animation)

---

## [S3] Owner Dashboard: Simple Schedule View

**Current Dashboard Issues:**
- Too many features at once
- Confusing layout
- Not focused on daily workflow

**New Dashboard Design:**

**Top Section: Today's Summary**
- Date display (Jalali)
- Quick stats: Bookings count, Earnings, Available slots

**Main Section: Timeline View**
- Vertical timeline (9 AM - 9 PM)
- Bookings shown as colored blocks
- Blocked times shown as gray blocks
- Empty slots shown as dashed lines

**Bottom Actions:**
- "Block Time" button (opens simple modal)
- "Manual Booking" button (opens simple form)
- "View All Bookings" link

**Key UX Improvements:**
- Focus on TODAY (not week view)
- Visual timeline (not list)
- Quick actions (2 taps to block time)
- No accounting on main view (move to separate page)

---

## [S4] Technical Fixes & Performance

**Current Issues:**
- Slow performance (unnecessary re-renders)
- Components not behaving correctly
- Data not loading properly

**Fixes:**

**1. Performance Optimization**
- Use `React.memo` for pure components
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers
- Lazy load non-critical components
- Optimize Supabase queries (select only needed fields)

**2. Component Behavior Fixes**
- Fix state management (useReducer for complex state)
- Fix form validation (real-time feedback)
- Fix loading states (skeleton loaders)
- Fix error handling (user-friendly messages)

**3. Data Flow Fixes**
- Single source of truth (Supabase)
- Real-time updates for owner dashboard
- Optimistic UI updates for bookings
- Proper error boundaries

**4. Mobile Optimization**
- Touch-friendly targets (44px minimum)
- Swipe gestures for calendar
- Bottom sheets for modals
- Haptic feedback for actions

---

## [S5] Design System: Consistent UI/UX

**Current Issues:**
- Inconsistent styling across components
- Not truly mobile-first
- Glassmorphism overused

**New Design System:**

**Color Palette:**
- Primary: Soft rose (#E8B4B8) - feminine, elegant
- Background: Off-white (#FAFAFA) - clean, airy
- Text: Dark gray (#1A1A1A) - high contrast
- Accent: Deep rose (#C97B7B) - for CTAs

**Typography:**
- Headings: Vazirmatn (Persian, elegant)
- Body: Vazirmatn (readable, modern)
- Numbers: Vazirmatn (consistent)

**Components:**
- Cards: Subtle shadows, rounded corners (16px)
- Buttons: Full-width, 48px height, rounded (12px)
- Inputs: Clean borders, clear labels
- Modals: Bottom sheets on mobile

**Spacing:**
- Base unit: 4px
- Consistent padding: 16px (cards), 24px (sections)
- Touch targets: 48px minimum

**Animations:**
- Subtle fade-ins (200ms)
- Smooth transitions (150ms)
- No flashy effects (keep it professional)

---

## Implementation Priority

1. **Phase 1: Foundation** (Week 1)
   - Fix critical technical bugs
   - Optimize performance
   - Clean up data flow

2. **Phase 2: Customer Flow** (Week 2)
   - Implement 3-tap booking
   - Redesign service cards
   - Simplify auth flow

3. **Phase 3: Owner Dashboard** (Week 3)
   - Build timeline view
   - Add quick actions
   - Simplify schedule management

4. **Phase 4: Polish** (Week 4)
   - Apply design system
   - Add animations
   - Mobile optimization
   - Testing

---

## Success Metrics

- **Booking completion rate**: >80%
- **Time to book**: <30 seconds
- **Owner daily usage**: Check schedule 3+ times/day
- **App performance**: <2 second load time
- **Mobile usability**: 100% touch-friendly targets
