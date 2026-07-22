# NailBook UX Improvements - Detailed Analysis

## HIGH Priority Improvements

### 1. Step Progress Indicator
**File:** `src/app/book/content.tsx`
- Add visual breadcrumb/progress bar showing current step (1/4, 2/4, etc.)
- Users cannot tell how many steps remain
- Simple dots or numbered steps work well

### 2. Skip Empty Addons Step
**File:** `src/app/book/content.tsx` (line 83-84)
- When service has no addons, skip the step entirely
- Don't show "آپشن اضافی برای این خدمت وجود ندارد" message
- Go directly to date/time selection

### 3. Forgot PIN Recovery
**Files:** `src/app/login/page.tsx`, `src/app/book/content.tsx`
- Add "فراموشی رمز" link on PIN entry screens
- Re-verify phone number → create new PIN
- Owner can also reset via users management

### 4. Service Images
**Files:** `src/components/landing/service-card-grid.tsx`, `src/lib/types.ts`
- Add `image_url` field to Service type
- Show real service photos instead of gradient placeholders
- Upload via owner dashboard

### 5. Customer Reviews
**New feature:** Post-booking rating system
- After booking completion, prompt for 1-5 star rating
- Show average rating on service cards
- Owner can view ratings in dashboard

### 6. Total Price in Bookings
**File:** `src/app/bookings/page.tsx` (lines 180-183, 296-302)
- Currently shows only base service price
- Calculate total: service price + addon prices
- Show breakdown in booking detail modal

### 7. Change PIN from Profile
**File:** `src/app/profile/page.tsx`
- Add "تغییر رمز" button
- Verify current PIN → enter new PIN → confirm
- Similar flow to owner reset-pin

### 8. Booking Notifications
**New feature:** Push/SMS reminders
- 24 hours before booking: SMS reminder
- 1 hour before: push notification (if PWA installed)
- Owner: instant notification on new booking

### 9. Weekly/Monthly Overview
**File:** `src/app/owner/page.tsx`
- Currently only shows one day at a time
- Add week view (7-day grid) and month view (calendar)
- Show booking density heatmap

### 10. User Booking Count
**File:** `src/app/owner/users/page.tsx`
- Show booking count and total spending per user
- Query: `SELECT COUNT(*), SUM(price) FROM bookings WHERE user_id = ?`
- Sort by most active customers

## MEDIUM Priority Improvements

### 11. Service Summary Card
**File:** `src/app/book/content.tsx`
- Show persistent card during date/time selection
- Display: service name, duration, price, selected addons
- Helps users remember what they're booking

### 12. Collapse Unavailable Slots
**File:** `src/components/booking/time-slots.tsx`
- Collapse "unavailable" and "booked" sections by default
- Show "show more" toggle
- Reduces page length significantly

### 13. Pull-to-Refresh
**Files:** `src/app/bookings/page.tsx`, `src/app/owner/page.tsx`
- Add pull-to-refresh gesture on mobile
- Currently only 10-second polling
- Use CSS `overscroll-behavior` or JS gesture

### 14. Filter Bookings by Status
**File:** `src/app/bookings/page.tsx`
- Add filter tabs: upcoming, past, cancelled
- Currently grouped by date only
- Helps users with many bookings

### 15. Quick Rebook
**File:** `src/app/bookings/page.tsx`
- Add "رزرو مجدد" button on completed bookings
- Pre-fill service and date from previous booking
- One-tap rebooking flow

### 16. Map/Directions
**File:** `src/components/landing/hero.tsx` (line 46)
- Link address to Google Maps
- Use `https://maps.google.com/?q=...`
- Add "نحوه دسترسی" button

### 17. Offline Detection
**File:** `src/app/layout.tsx`
- Listen to `navigator.onLine` events
- Show toast when going offline/online
- Queue failed API calls for retry

### 18. Consistent Modals
- All action modals should use BottomSheet on mobile
- Currently: block-time = BottomSheet, booking = Dialog, earnings = Dialog
- Standardize to BottomSheet for all mobile modals

### 19. Calendar Scroll Indicator
**File:** `src/components/booking/jalali-calendar.tsx` (line 173-184)
- Add gradient fade on right edge
- Hint that more dates are available
- Common pattern in horizontal scroll

### 20. PWA Service Worker
**Files:** `public/manifest.json`, `src/app/layout.tsx`
- Register service worker for offline support
- Enable "Add to Home Screen" prompt
- Cache static assets for faster loading

## Architecture Notes

### Cal.com Patterns Worth Adopting

1. **Slot generation with resolution** - Generate slots at 15min intervals, merge with buffer
2. **Atomic booking with ON CONFLICT** - Database-level conflict detection
3. **Working hours as JSONB** - Flexible per-day configuration
4. **Blocked times as separate table** - Clean separation from bookings
5. **Service duration + addons + buffer** - Compound duration calculation

### What NailBook Does Better Than Most

1. **Jalali calendar** - Native Persian date handling
2. **PIN-based auth** - Simpler than email/password for mobile
3. **Anti-spam system** - Per-phone daily limits + cooldown
4. **Paper theme** - Unique, warm aesthetic
5. **RTL-first** - Proper right-to-left layout
6. **Atomic booking** - ON CONFLICT prevents double-booking
7. **PBKDF2 for owner PINs** - Secure hashing for sensitive accounts
