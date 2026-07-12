# Forehand Nail Studio — Full Application Documentation

> Complete documentation of every flow, logic, decision, rule, design, and code in the NailBook application.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Project Structure](#3-project-structure)
4. [Design System & Visual Language](#4-design-system--visual-language)
5. [Database Schema (Supabase)](#5-database-schema-supabase)
6. [State Management](#6-state-management)
7. [Authentication System](#7-authentication-system)
8. [Booking Engine (Slot Generation)](#8-booking-engine-slot-generation)
9. [Customer Flows](#9-customer-flows)
10. [Owner Flows](#10-owner-flows)
11. [API Routes](#11-api-routes)
12. [Component Reference](#12-component-reference)
13. [Utility Libraries](#13-utility-libraries)
14. [Security & Anti-Spam](#14-security--anti-spam)
15. [Edge Cases & Error Handling](#15-edge-cases--error-handling)

---

## 1. Project Overview

**Name:** Forehand Nail Studio (NailBook)
**Purpose:** A mobile-first booking web app for a single nail artist studio in Mashhad, Iran. Replaces phone-based bookings with a "link-in-bio" reservation experience.
**Target Users:** High-end clients seeking a luxury, minimalist aesthetic.
**Language:** Persian (Farsi), RTL layout throughout.

---

## 2. Tech Stack & Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| UI | shadcn/ui (Radix UI + Tailwind CSS v4) |
| Styling | Tailwind CSS v4, custom CSS variables, glassmorphism |
| Font | Vazirmatn (Persian font, loaded via CDN) |
| Backend DB | Supabase (PostgreSQL + Storage) |
| Auth | Custom PIN-based auth (SHA-256 hashed), no OAuth |
| Calendar | Jalali (Persian) calendar via `jalaali-js` |
| Timezone | Asia/Tehran (UTC+03:30, fixed — no DST) |
| Image Crop | `react-easy-crop` |
| Notifications | Sonner (toast) |
| Icons | Lucide React, Heroicons, Iconscout Unicons |
| PWA | `manifest.json` with standalone display |

**Architecture pattern:** Client-side SPA with server-side API routes. All pages are `"use client"` components. Data flows through two React contexts (`AuthProvider` + `SalonProvider`). Supabase client SDK is used on the client; `supabaseAdmin` (service role key) is used server-side in API routes.

---

## 3. Project Structure

```
nailbook/
├── public/
│   ├── favicon.svg
│   ├── manifest.json          # PWA manifest
│   └── *.svg                  # Static assets
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout (RTL, lang="fa")
│   │   ├── page.tsx           # Home / landing page
│   │   ├── providers.tsx      # AuthProvider + SalonProvider wrapper
│   │   ├── globals.css        # Tailwind + design tokens + glassmorphism
│   │   ├── login/             # Customer login/register page
│   │   ├── book/              # Booking flow (5-step wizard)
│   │   │   ├── page.tsx       # Suspense wrapper
│   │   │   └── content.tsx    # Main booking logic (542 lines)
│   │   ├── bookings/          # Customer's booking history
│   │   ├── profile/           # Customer profile (edit name, logout)
│   │   ├── owner/             # Owner admin panel
│   │   │   ├── layout.tsx     # Owner shell (sidebar menu, bottom nav)
│   │   │   ├── page.tsx       # Owner dashboard (timeline + calendar)
│   │   │   ├── login/         # Owner login (separate from customer)
│   │   │   ├── services/      # Service & addon management
│   │   │   ├── schedule/      # Working hours & days-off management
│   │   │   ├── settings/      # Salon info editing (name, logo, etc.)
│   │   │   ├── highlights/    # Instagram-style highlight management
│   │   │   └── users/         # User CRUD (add, edit, delete, reset PIN, block)
│   │   └── api/               # Server-side API routes
│   │       ├── auth/
│   │       │   ├── check-phone/
│   │       │   ├── create-pin/
│   │       │   ├── verify-pin/
│   │       │   └── update-profile/
│   │       ├── book/reserve/
│   │       ├── anti-spam/
│   │       ├── owner-login/
│   │       ├── owner/
│   │       │   ├── blocked-times/
│   │       │   ├── reset-pin/
│   │       │   └── users/
│   │       ├── update-salon/
│   │       ├── upload-logo/
│   │       └── upload-highlight/
│   ├── components/
│   │   ├── booking/           # JalaliCalendar, TimeSlots, BookingConfirm, PinInput
│   │   ├── landing/           # Hero, Highlights, HighlightViewer, ServiceCardGrid, etc.
│   │   ├── layout/            # Header, CustomerNav, GradientBackground
│   │   ├── owner/             # Timeline, ServiceManager, ScheduleManager, modals
│   │   └── ui/                # shadcn/ui primitives (Button, Card, Input, etc.)
│   ├── lib/
│   │   ├── auth-context.tsx   # Customer auth state + API calls
│   │   ├── salon-context.tsx  # Salon data state + CRUD operations
│   │   ├── slots.ts           # Booking engine (slot generation algorithm)
│   │   ├── mock-data.ts       # TypeScript interfaces + mock data defaults
│   │   ├── time.ts            # Asia/Tehran timezone helpers
│   │   ├── jalali.ts          # Jalali calendar conversion + formatting
│   │   ├── owner-auth.ts      # Owner session verification (HMAC-signed cookie)
│   │   ├── digits.ts          # Persian ↔ English digit conversion
│   │   ├── anti-spam.ts       # Rate limiting logic
│   │   ├── utils.ts           # cn() helper (clsx + tailwind-merge)
│   │   └── supabase/
│   │       ├── client.ts      # Supabase client (anon key, browser)
│   │       ├── server.ts      # Supabase admin (service role key, server)
│   │       └── data.ts        # All Supabase CRUD functions
│   └── types/
│       └── unicons.d.ts       # Icon type declarations
```

---

## 4. Design System & Visual Language

### 4.1 Aesthetic: "Aether Glass & Minimal Editorial"

- **Style:** High-end, editorial, minimalist, airy
- **Glassmorphism:** Heavy use of `backdrop-filter: blur(24px)`, subtle white borders, soft shadows
- **Mobile-First:** All interactions thumb-friendly. Bottom sheets, horizontal swipes, 44px+ touch targets
- **Color Palette:** Neutral, sophisticated — warm whites, soft greys, rose accents. Nail art photography stays focal

### 4.2 Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#FAFAFA` | Page background |
| `--foreground` | `#1A1A1A` | Primary text |
| `--primary` | `#C97B7B` | Rose/mauve accent (CTAs, highlights) |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--secondary` | `#F4F4F6` | Subtle backgrounds |
| `--destructive` | `#FF3B30` | Errors, delete actions |
| `--success` | `#34C759` | Confirmations, paid states |
| `--rose` | `#C97B7B` | Accent color |
| `--gold` | `#D4A853` | Secondary accent |
| `--border` | `rgba(0,0,0,0.08)` | Subtle borders |
| `--card` | `rgba(255,255,255,0.85)` | Glass card background |

### 4.3 Typography Scale

| Class | Size | Weight | Use |
|-------|------|--------|-----|
| `text-display` | 32px | 800 | Hero heading |
| `text-h1` | 24px | 700 | Page titles |
| `text-h2` | 20px | 700 | Section headings |
| `text-h3` | 17px | 600 | Card headings |
| `text-body-lg` | 17px | 400 | Descriptions |
| `text-body` | 15px | 400 | Body text |
| `text-caption` | 13px | 500 | Labels, metadata |
| `text-small` | 12px | 400 | Fine print |

Font: **Vazirmatn** (Persian font), weights 400/500/700/800, loaded from CDN.

### 4.4 Shadow System

| Token | Value |
|-------|-------|
| `--shadow-card` | `0 4px 24px rgba(0,0,0,0.04)` |
| `--shadow-elevated` | `0 8px 32px rgba(0,0,0,0.06)` |
| `--shadow-floating` | `0 12px 40px rgba(0,0,0,0.08)` |
| `--shadow-glass` | `0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)` |

### 4.5 Animations

- `animate-fade`: 200ms opacity fade-in
- `animate-scale`: 150ms scale-in (0.9 → 1) with spring easing
- `animate-slideUp`: 200ms slide-up with fade
- `animate-stagger`: Staggered slide-up for grid children (50ms delay per child)
- `skeleton`: Shimmer loading animation
- All animations respect `prefers-reduced-motion: reduce`

### 4.6 Gradient Background

Three blurred gradient blobs (rose, gold, rose) positioned behind all content via `GradientBackground` component. `z-index: -1`, `pointer-events: none`.

### 4.7 Glass Effect Classes

- `.glass`: `rgba(255,255,255,0.35)` + `blur(24px)` + white border
- `.glass-strong`: `rgba(255,255,255,0.55)` + `blur(32px)`

---

## 5. Database Schema (Supabase)

### Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `phone` | text | Unique, 10-digit Iranian mobile |
| `pin` | text | SHA-256 hash of 4-digit PIN |
| `name` | text | Display name |
| `role` | text | `"customer"` or `"owner"` |
| `failed_attempts` | integer | Counter for PIN attempts |
| `locked_until` | timestamptz | Account lockout expiry |
| `created_at` | timestamptz | Registration timestamp |

#### `sessions`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID | FK to users |
| `token` | text | Session token |
| `expires_at` | timestamptz | 30-day expiry |

#### `salon_info`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Singleton row |
| `name` | text | Salon name |
| `description` | text | Description |
| `slogan` | text | Marketing slogan |
| `phone` | text | Contact phone |
| `address` | text | Physical address |
| `hero_image_url` | text | Hero background |
| `logo_url` | text | Logo image |
| `working_hours` | jsonb | `{sat: {open, close}, ...}` |
| `slot_buffer_minutes` | integer | Buffer between slots (default 0) |
| `slot_interval_minutes` | integer | Slot interval (default 15) |
| `early_extra_hours` | integer | Hours before shift for expansion (default 0) |
| `late_extra_hours` | integer | Hours after shift for expansion (default 0) |
| `expand_threshold` | integer | Fill % to trigger expansion (default 80) |
| `proximity_window_hours` | integer | ± hours around bookings (default 2) |
| `allow_overflow` | boolean | Allow booking past shift end (default false) |
| `overflow_minutes` | integer | Minutes past shift allowed (default 0) |
| `specific_days_off` | text[] | Array of gregorian date strings |

#### `services`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | text | Service name |
| `description` | text | Description |
| `duration_minutes` | integer | Duration |
| `price` | integer | Price in Tomans |
| `is_active` | boolean | Visibility toggle |
| `sort_order` | integer | Display order |
| `addon_ids` | text[] | Associated addon IDs |
| `priority_score` | integer | 1-10, affects slot suggestion |

#### `addons`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | text | Addon name |
| `price` | integer | Extra cost |
| `duration_minutes` | integer | Extra time |
| `is_active` | boolean | Visibility toggle |

#### `bookings`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to users (nullable for guests) |
| `service_id` | UUID | FK to services |
| `selected_addons` | text[] | Chosen addon IDs |
| `customer_name` | text | Customer display name |
| `customer_phone` | text | Customer phone |
| `date` | text | Jalali date string |
| `date_gregorian` | text | Gregorian date (YYYY-MM-DD) |
| `start_time` | text | HH:MM:SS |
| `end_time` | text | HH:MM:SS |
| `status` | text | `"pending"`, `"confirmed"`, `"completed"`, `"cancelled"` |
| `phone_verified` | boolean | Always true on create |
| `paid` | boolean | Payment tracking |
| `created_at` | timestamptz | Creation timestamp |

#### `blocked_times`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `date_gregorian` | text | Date string |
| `start_time` | text | Start time |
| `end_time` | text | End time |

#### `highlights`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | text | Highlight group name |
| `cover_url` | text | Cover image |
| `sort_order` | integer | Display order |

#### `highlight_images`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `highlight_id` | UUID | FK to highlights |
| `image_url` | text | Image URL |
| `caption` | text | Optional caption |
| `sort_order` | integer | Display order |

### Storage Buckets

- `logos` — Salon logo uploads (path: `logos/{timestamp}_{random}.{ext}`)
- `highlights` — Highlight image uploads (path: `highlights/{timestamp}_{random}.{ext}`)

---

## 6. State Management

### 6.1 Provider Hierarchy

```
<AuthProvider>          ← AuthContext (user, login, logout)
  <SalonProvider>       ← SalonContext (salon, services, bookings, etc.)
    {children}
  </SalonProvider>
</AuthProvider>
```

### 6.2 AuthContext (`lib/auth-context.tsx`)

**State:** `user` (persisted to `localStorage`), `isLoading`

**Methods:**
- `checkPhone(phone)` → POST `/api/auth/check-phone` → `{exists, locked, hasPin}`
- `createPin(phone, pin, name)` → POST `/api/auth/create-pin` → `{success, user}`
- `verifyPin(phone, pin)` → POST `/api/auth/verify-pin` → `{success, user, attemptsLeft}`
- `logout()` → clears localStorage + cookie

**Persistence:** User object stored in `localStorage` as `"auth_user"`. Cookie `"auth_token"` set by API routes (httpOnly, secure, 30-day expiry).

### 6.3 SalonContext (`lib/salon-context.tsx`)

**State:** `salon`, `workingHours`, `specificDaysOff`, `services`, `addons`, `bookings`, `highlights`, `blockedTimes`, `loaded`

**On mount:** Parallel fetches all data from Supabase via `Promise.all` (7 queries). Falls back to mock data if DB empty.

**Optimistic updates:** All mutations update local state first, then persist to Supabase. On failure, reverts to previous state.

**Methods:**
- `updateWorkingHours(hours)` / `updateSpecificDaysOff(daysOff)` / `saveSchedule(hours, daysOff)`
- `updateServices(services)` / `updateAddons(addons)`
- `updateSalon(updates)` → POST `/api/update-salon`
- `updateBlockedTimes(blocks)` → PUT `/api/owner/blocked-times`
- `addBooking(booking)` → inserts to Supabase
- `refreshBookings()` → re-fetches all bookings
- `addHighlight/updateHighlight/removeHighlight` — CRUD for highlights
- `addHighlightImage/removeHighlightImage/uploadHighlightImage` — image management

---

## 7. Authentication System

### 7.1 Customer Auth Flow

**PIN-based, no SMS/OTP.** Uses 4-digit numeric PIN.

**Registration flow:**
1. User enters phone number
2. `checkPhone` API checks if phone exists in `users` table
3. If new user → "Create PIN" step → enter 4-digit PIN → confirm PIN → `createPin` API
4. If existing user → "Verify PIN" step → enter PIN → `verifyPin` API
5. On success: session token created in `sessions` table, cookie set, user stored in localStorage

**Login flow:**
1. Same as registration — phone check determines path
2. If locked (`locked_until > now`), shows lockout message with remaining minutes

### 7.2 Account Lockout Rules

| Rule | Value |
|------|-------|
| Max failed attempts | 5 |
| Lockout duration (customer) | 60 minutes |
| Lockout duration (owner) | 30 minutes |
| Reset on success | `failed_attempts = 0`, `locked_until = null` |

### 7.3 Owner Auth Flow

Separate from customer auth. Two paths:
1. **Owner Login page** (`/owner/login`) — phone + PIN → POST `/api/owner-login`
2. **Owner session cookie** — HMAC-signed (`userId:timestamp:signature`), 7-day expiry, verified by `verifyOwner()` in every owner API route

**Owner session signing:** `crypto.createHmac("sha256", SECRET).update(payload).digest("hex")` where SECRET is from `OWNER_SESSION_SECRET` env var.

**Owner logout:** Clears `owner_session` cookie, redirects to `/owner/login`.

### 7.4 PIN Hashing

All PINs are hashed with SHA-256 before storage:
```ts
crypto.createHash("sha256").update(pin).digest("hex")
```

### 7.5 Anti-Enumeration

`checkPhone` API returns consistent response structure for both existing and non-existing users: `{exists: boolean, locked: false, hasPin: boolean}`. This prevents attackers from determining if a phone number is registered.

### 7.6 Delayed Response

`verifyPin` API includes a 2-second delay (`await new Promise(resolve => setTimeout(resolve, 2000))`) to slow brute-force attacks.

---

## 8. Booking Engine v7 (Slot Generation)

### 8.1 Core Algorithm (`lib/slots.ts`)

The booking engine calculates available time slots using a **3-level gap minimization model**.

**Input parameters:**
- `workingHours` — per-day open/close times
- `date` — the target date
- `serviceDurationMinutes` — base service duration
- `addonsDurationMinutes` — addon duration sum
- `slotIntervalMinutes` — R (resolution)
- `bufferMinutes` — mandatory gap after each booking
- `existingBookings` — array of `{start_time, end_time}` for the day
- `activeLocks` — blocked time ranges
- `config` — owner settings (proximity, expansion, overflow)

**Processing steps:**

#### Step 1: Compute Effective Duration
```
effectiveDuration = ceil((service + addons + buffer) / R) * R
```

#### Step 2: Determine Shift Boundaries
- Raw shift: A → B
- If fill % ≥ threshold: expand to (A - E_early) → (B + E_late)
- Hard limit: B + overflow_minutes (if overflow enabled)

#### Step 3: Generate Candidates
Loop from shiftStart to B at R intervals. Each candidate must:
- Start before B
- Not extend past hard limit
- Not be in the past (today only)

#### Step 4: Filter Overlaps
Remove candidates that overlap existing bookings or blocked times.

#### Step 5: Apply Level Filtering
- **Level 1** (0 bookings): All valid slots shown
- **Level 2** (1 booking): Only slots within ±P of existing booking
- **Level 3** (2+ bookings): All valid slots, then classify suggested vs other

#### Step 6: Classify Suggested vs Other
- **Suggested**: Gap-filling slots or adjacent to booking edges
- **Other**: All other valid slots

**Output:** Array of `TimeSlot` objects: `{time, available, booked, locked, suggested}`

### 8.2 Nearest Available Slot (14-day scan)

`getNearestAvailableSlot()` scans 14 days forward from today (Jalali) and returns the first available slot for a given service.

### 8.3 Configurable Variables

| Variable | Default | Owner setting |
|----------|---------|---------------|
| Resolution (R) | 15 min | Segmented buttons: 5/10/15/20/30/60 |
| Buffer | 0 min | Number input |
| Proximity (P) | ±2h | Number input (1-8 hours) |
| Early Extra (E_early) | 0 | Number input (0-4 hours) |
| Late Extra (E_late) | 0 | Number input (0-4 hours) |
| Threshold (T) | 80% | Number input (10-100%) |
| Overflow | OFF | Toggle switch |
| Overflow Minutes | 0 | Number input (0-180 min) |

---

## 9. Customer Flows

### 9.1 Home Page (`/`)

**Sections (top to bottom):**
1. **Header** — salon name, hamburger menu (slide-out drawer)
2. **Highlights** — horizontal scrollable Instagram-style stories (with placeholder items if empty)
3. **Hero** — salon logo, name, slogan, description, "Book Now" CTA, address/phone/hours card
4. **Service Card Grid** — list of active services with name, description, duration, price
5. **Trust Signals** — "527+ successful bookings" counter
6. **Contact Buttons** — WhatsApp and Telegram links
7. **Footer** — "Made with love" credit
8. **Bottom Nav** — Home, Bookings, Profile

**Interactions:**
- "Book Now" smooth-scrolls to services section
- Clicking a service navigates to `/book?service={id}`
- Highlight circles open `HighlightViewer` (fullscreen image viewer)
- Hamburger menu opens slide-out drawer with: Home, Owner Login, Phone, Instagram, Address, Hours

### 9.2 Highlight Viewer

- Fullscreen overlay, black background
- Progress bars at top (one per image)
- Auto-advances every 10 seconds
- Tap left 1/3 = previous, tap right 2/3 = next
- Keyboard: Arrow keys, Space, Escape
- Shows highlight name + "1/5" counter at bottom

### 9.3 Booking Flow (`/book`)

**5-step wizard:**

#### Step 1: Addons (if service has addons)
- Shows available addons for the selected service
- Each addon displays: name, extra duration, extra price
- Toggle selection with checkmark
- "Select Time" button to proceed

#### Step 2: Date & Time
- **JalaliCalendar** — horizontal 7-day strip (today + 6 days) with tap-to-select
  - "Calendar" button opens full month-view modal
  - Touch drag for horizontal scrolling
  - Today gets primary border highlight
  - Selected gets primary background
- **Selected date display** — full Jalali date
- **TimeSlots** — grid of available slots
  - "Suggested Times" section (first 4 slots, sparkles icon)
  - "Other Times" section (remaining slots)
  - Legend: available / booked / inactive
  - Empty state: "No availability" with "Go to next day" button
  - Selected slot gets dark foreground background

#### Step 3: Auth (if not logged in)
- Same phone → PIN flow as login page, embedded inline
- If already logged in, skips to Step 4

#### Step 4: Confirm
- Summary card: service, date/time, duration, addons count, total price
- "Confirm & Book" button

#### Step 5: Receipt
- `BookingConfirm` component: success icon, booking details, tracking code
- **Add to Google Calendar** — generates calendar URL
- **Share** — Web Share API or clipboard fallback
- **WhatsApp** — pre-filled message with booking details

**Navigation:** Back button goes to previous step. Receipt step has no back button.

**Sticky CTAs:** "Continue" button fixed at bottom during Addons and DateTime steps.

### 9.4 Bookings Page (`/bookings`)

- **Not logged in:** Login prompt with avatar icon
- **No bookings:** Empty state with "Book now" CTA
- **With bookings:** Grouped by date (most recent first), each date shows Jalali date header
  - Booking cards: service name, customer name, time, price, status badge
  - Tapping a card opens `BookingDetailModal` (bottom sheet)
    - Shows: service, customer, date, time range, duration, addons, price, status, tracking code

### 9.5 Profile Page (`/profile`)

- **Not logged in:** Login prompt
- **Logged in:**
  - Avatar icon (initials fallback)
  - Name (editable inline — pencil icon → input → save/cancel)
  - Phone number (display only, Persian digits)
  - "Logout" button (destructive style)

---

## 10. Owner Flows

### 10.1 Owner Login (`/owner/login`)

Separate login from customers. Two-step: phone → PIN. Uses `owner_session` HMAC cookie.

### 10.2 Owner Layout

**Top bar:** Salon name + hamburger menu (slide-out)
**Bottom nav:** Timeline (home), Services, Menu (hamburger)
**Menu items:** Home, Working Hours, Highlights, Users, Salon Settings, Logout

### 10.3 Owner Dashboard (`/owner`)

The main owner view. Contains:

#### Jalali Calendar
Same as customer but with `showPast` enabled (shows ±7 days).

#### Date Display
Full Jalali date below calendar.

#### Booking Search
Text input to filter bookings by name or phone.

#### Daily Accounting Card
Three columns: Paid (green), Unpaid (red), Total — calculated from today's confirmed bookings.

#### Timeline (`components/owner/timeline.tsx`)
Visual day schedule from 08:00-22:00:
- Hour grid lines + half-hour dashed lines
- Booking blocks (rose-tinted) showing: customer name, service, time range, price, paid/unpaid badge
- Blocked time blocks (amber-tinted) showing: "Rest", time range, "Click to remove"
- Current time indicator (primary-colored line)
- Height-aware: blocks show more detail when taller (>40px, >55px)

#### Action Buttons
- "Block Time" → opens `BlockTimeModal` (start time, end time, optional reason)
- "Manual Reserve" → opens `ManualReserveModal` (customer name, phone, service, start/end time)

#### Booking Modal
Tapping a booking block opens detail modal with:
- Customer name + phone
- Service, date, time range, duration
- Price
- **Paid toggle** (Switch component) — persists to localStorage

#### Earnings Modal
Period selector (Today / This Week / This Month):
- Paid amount + count
- Unpaid amount + count
- Total

### 10.4 Services Management (`/owner/services`)

**Tabbed interface:** Services | Addons

#### Services Tab
- List of services with: name, duration, price, active/inactive badge
- **Reorder:** Up/Down arrows change `sort_order`
- **Toggle active/inactive**
- **Edit:** Inline form (name, description, duration, price)
- **Delete:** Removes from pending list
- **Add new:** Form with name, description, duration, price, priority score (1-10)
- **Addon assignment:** Toggle pills showing which addons are linked to each service
- **Save/Discard:** Changes are staged locally; explicit save pushes to Supabase

#### Addons Tab
- Same CRUD pattern as services
- Fields: name, duration, price
- Reorder, toggle active, edit, delete

### 10.5 Schedule Management (`/owner/schedule`)

**Working Hours section:**
- **Per-day toggles:** Switch to enable/disable each day (Sat-Fri)
- **Time pickers:** Open/close time for each active day
- **"Apply to all"** — copies one day's hours to all active days

**Slot Engine section (تنظیمات نوبت‌دهی):**
- **Resolution (R):** Segmented buttons [5, 10, 15, 20, 30, 60] min, default 15
- **Buffer:** Gap after each booking, default 0 min

**Extra Hours section (ساعت اضافی):**
- **Threshold (T):** Fill % to trigger expansion, default 80%
- **Early extra hours (E_early):** Hours before shift start, default 0
- **Late extra hours (E_late):** Hours after shift end, default 0

**Smart Scheduling section (تنظیمات هوشمند):**
- **Proximity window (P):** ± hours around existing bookings, default 2h
- **Overflow toggle:** Allow booking past shift end
- **Overflow minutes:** Minutes past shift allowed (shown when overflow ON)

**Days Off section:**
- Two-month Jalali calendar grid (current + next month)
- Click a day to toggle as day off (red background)
- Removable tags for each selected day

### 10.6 Salon Settings (`/owner/settings`)

- **Logo:** Upload with image crop (1:1 aspect, round crop), delete option
- **Basic info:** Name, slogan, description
- **Contact:** Phone, address
- **Save button** — persists all changes

### 10.7 Highlights Management (`/owner/highlights`)

- Create new highlight (name input)
- List of highlights with: cover thumbnail, name, image count, delete button
- Expandable panel for each highlight:
  - **Name editing** with save
  - **Cover image** — upload/change
  - **Images grid** — add multiple images, remove individual images
  - Upload progress indicator

### 10.8 User Management (`/owner/users`)

- **User list** — cards showing: avatar, name, role badge ("Manager" for owner), lock badge, phone, join date
- **Search** — filter by name or phone
- **Actions per user:**
  - **Lock/Unlock** — toggle account lockout
  - **Reset PIN** — modal with new PIN + confirm
  - **Edit** — modal with name, phone, role, optional PIN change
  - **Delete** — confirmation modal (prevents self-deletion)
- **Add user** — modal with name, phone, role, PIN

---

## 11. API Routes

### 11.1 Authentication

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/check-phone` | None | Check if phone exists, check lockout |
| POST | `/api/auth/create-pin` | None | Register new user with PIN |
| POST | `/api/auth/verify-pin` | None | Verify PIN for existing user |
| POST | `/api/auth/update-profile` | None | Update user name |

### 11.2 Booking

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/book/reserve` | None | Validate slot availability (conflict check) |
| POST | `/api/anti-spam` | None | Check rate limits for phone |

### 11.3 Owner

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/owner-login` | None | Owner login (PIN → HMAC cookie) |
| GET | `/api/owner/blocked-times` | None | Fetch blocked times |
| PUT | `/api/owner/blocked-times` | Owner | Replace all blocked times |
| POST | `/api/owner/reset-pin` | Owner | Reset a user's PIN |
| GET | `/api/owner/users` | Owner | List all users |
| POST | `/api/owner/users` | Owner | Create new user |
| PUT | `/api/owner/users` | Owner | Update user (name, phone, role, PIN, lock) |
| DELETE | `/api/owner/users` | Owner | Delete user |

### 11.4 Salon

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/update-salon` | None | Update salon info |
| POST | `/api/upload-logo` | None | Upload logo to Supabase storage |
| POST | `/api/upload-highlight` | None | Upload highlight image to Supabase storage |

### 11.5 Slot Validation (`/api/book/reserve`)

Checks two things before allowing a booking:
1. **Booking conflicts:** Queries `bookings` for overlapping confirmed slots on the same date
2. **Blocked times:** Queries `blocked_times` for overlapping blocks on the same date

Returns `409 Conflict` with `{conflict: true}` if either check fails.

---

## 12. Component Reference

### 12.1 Layout Components

| Component | File | Description |
|-----------|------|-------------|
| `Header` | `components/layout/header.tsx` | Sticky top bar with salon name, back button, hamburger menu |
| `CustomerNav` | `components/layout/customer-nav.tsx` | Fixed bottom nav: Home, Bookings, Profile |
| `GradientBackground` | `components/layout/gradient-background.tsx` | Three blurred gradient blobs behind all content |

### 12.2 Booking Components

| Component | File | Description |
|-----------|------|-------------|
| `JalaliCalendar` | `components/booking/jalali-calendar.tsx` | Horizontal 7-day strip + full month modal |
| `TimeSlots` | `components/booking/time-slots.tsx` | Slot grid with suggested/other sections |
| `BookingConfirm` | `components/booking/booking-confirm.tsx` | Receipt with Google Calendar, Share, WhatsApp |
| `PinInput` | `components/booking/pin-input.tsx` | 4-digit PIN entry with auto-advance |

### 12.3 Landing Components

| Component | File | Description |
|-----------|------|-------------|
| `Hero` | `components/landing/hero.tsx` | Salon logo, name, description, CTA, info card |
| `Highlights` | `components/landing/highlights.tsx` | Horizontal scrollable highlight circles |
| `HighlightViewer` | `components/landing/highlight-viewer.tsx` | Fullscreen image viewer with progress bars |
| `ServiceCardGrid` | `components/landing/service-card-grid.tsx` | Service list with gradient placeholders |
| `ServiceCard` | `components/landing/service-card.tsx` | Individual service card (not used in main flow) |
| `TrustSignals` | `components/landing/trust-signals.tsx` | Booking count display |
| `ContactButtons` | `components/landing/contact-buttons.tsx` | WhatsApp + Telegram links |
| `NextAvailable` | `components/landing/next-available.tsx` | Next available slot display (not currently used) |

### 12.4 Owner Components

| Component | File | Description |
|-----------|------|-------------|
| `Timeline` | `components/owner/timeline.tsx` | Visual day schedule with booking/blocked blocks |
| `ServiceManager` | `components/owner/service-manager.tsx` | Service + addon CRUD with tabs |
| `ScheduleManager` | `components/owner/schedule-manager.tsx` | Working hours + days-off editor |
| `BookingModal` | `components/owner/booking-modal.tsx` | Booking detail + paid toggle |
| `BlockTimeModal` | `components/owner/block-time-modal.tsx` | Block time form |
| `EarningsModal` | `components/owner/earnings-modal.tsx` | Earnings by period |
| `ManualReserveModal` | `components/owner/manual-reserve-modal.tsx` | Manual booking form |

### 12.5 UI Components (shadcn/ui)

| Component | Description |
|-----------|-------------|
| `Button` | Multiple variants: default, destructive, outline, ghost, link |
| `Card` | Glass-styled container |
| `Input` | Text input with RTL support |
| `Label` | Form label |
| `Badge` | Status indicator (default, secondary, destructive) |
| `Dialog` | Modal dialog |
| `Tabs` | Tabbed interface |
| `Switch` | Toggle switch |
| `Separator` | Horizontal divider |
| `BottomSheet` | Mobile bottom sheet modal |
| `Sonner` | Toast notifications |
| `ImageCrop` | Fullscreen image cropper (react-easy-crop) |
| `ErrorBoundary` | React error boundary |

---

## 13. Utility Libraries

### 13.1 `lib/jalali.ts`

Jalali (Persian) calendar utilities:
- `gregorianToJalali(date)` — converts Date to `{jy, jm, jd}`
- `jalaliToGregorian(jy, jm, jd)` — converts to Date
- `getJalaliDate(date)` — shorthand
- `getJalaliMonthDays(year, month)` — days in Jalali month
- `formatJalaliDate(y, m, d)` — "۱۵ تیر ۱۴۰۵"
- `formatJalaliDateShort(y, m, d)` — "۱۵ تیر"
- `formatJalaliTime(time)` — "۱۲:۳۰"
- `toPersianDigits(num)` — converts "123" to "۱۲۳"
- `getJalaliWeekdayName(date)` — short Persian weekday
- `getJalaliWeekdayFullName(date)` — full Persian weekday

### 13.2 `lib/time.ts`

Timezone helpers:
- `getTehranDateKey(date)` — "YYYY-MM-DD" in Tehran timezone
- `getTehranNow()` — `{dateKey, minutes}` of current Tehran time
- `isTehranToday(date)` — checks if date is today in Tehran

Uses `Intl.DateTimeFormat` with `"Asia/Tehran"` for timezone-independent calculations.

### 13.3 `lib/digits.ts`

- `normalizeDigits(input)` — converts Persian digits to English + strips non-digits
- `displayDigits(input)` — converts English digits to Persian

### 13.4 `lib/owner-auth.ts`

- `verifyOwnerSession(cookieValue)` — validates HMAC signature + 7-day expiry
- `verifyOwner(request)` — extracts cookie + verifies against `users` table

### 13.5 `lib/anti-spam.ts`

Rate limiting:
- Max 3 bookings per day per phone number
- 120-minute cooldown between bookings
- Queries `bookings` table for recent activity

### 13.6 `lib/slots.ts`

Booking engine (detailed in Section 8).

### 13.7 `lib/utils.ts`

- `cn(...inputs)` — merges Tailwind classes via `clsx` + `tailwind-merge`

---

## 14. Security & Anti-Spam

### 14.1 PIN Security

- PINs are SHA-256 hashed before storage (never stored in plaintext)
- 5 failed attempts → 60-minute lockout (customers) / 30-minute lockout (owners)
- Lockout checked before revealing if user exists (anti-enumeration)
- 2-second delay on verify to slow brute-force

### 14.2 Session Security

- `auth_token` cookie: httpOnly, secure, sameSite: lax, 30-day expiry
- `owner_session` cookie: HMAC-signed, httpOnly, secure, sameSite: lax, 7-day expiry
- Owner session verified on every owner API route via `verifyOwner()`

### 14.3 Anti-Spam

- Max 3 bookings per phone per day
- 120-minute cooldown between bookings
- Server-side enforcement via `checkAntiSpam()` in `lib/anti-spam.ts`

### 14.4 Double-Booking Prevention

- `/api/book/reserve` checks for overlapping confirmed bookings before allowing reservation
- Checks both `bookings` and `blocked_times` tables
- Returns `409 Conflict` if slot is taken

### 14.5 Input Validation

- Phone numbers: minimum 10 characters after normalization
- PINs: exactly 4 digits
- All API routes validate required fields before processing

### 14.6 Owner Authorization

- All owner API routes call `verifyOwner(request)` which:
  1. Extracts `owner_session` cookie
  2. Verifies HMAC signature
  3. Checks 7-day expiry
  4. Verifies user exists in DB with `role: "owner"`
- Returns `401 Unauthorized` if any check fails

---

## 15. Edge Cases & Error Handling

### 15.1 Empty States

| Scenario | Behavior |
|----------|----------|
| No services | Empty service grid (no error) |
| No slots available | "No availability" message + "Go to next day" button |
| No bookings | "No bookings yet" with "Book now" CTA |
| No highlights | Placeholder icons (Scissors, Sparkles, Heart, Star, Palette) |
| No users | "No users found" message |
| No addons for service | "No additional options" message |

### 15.2 Optimistic UI Updates

All mutations in `SalonContext` follow the pattern:
1. Update local state immediately
2. Attempt to persist to Supabase
3. On failure: revert to previous state + log error

### 15.3 Error Boundaries

Root `ErrorBoundary` component wraps all children. Catches React rendering errors.

### 15.4 Loading States

- Skeleton loading animations for pages (`loading.tsx` files in each route)
- `SalonProvider` returns no-op functions while `loaded` is false
- Button loading states with "Saving..." text

### 15.5 Timezone Handling

All slot calculations use Asia/Tehran timezone via `Intl.DateTimeFormat`. Iran has no DST (abolished 2022), but the code uses `Intl` for future-proofing.

### 15.6 Jalali Calendar Edge Cases

- Month boundaries handled correctly (12→1 year transition)
- Days-in-month: `[31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]`
- Leap year handled by `jalaali-js` library

### 15.7 Past Slot Filtering

For today's date, slots starting before the current Tehran time are filtered out. The owner timeline shows past times for reference.

### 15.8 Profile Update Sync

When owner updates a user's phone number, all bookings with the old phone number are synced to the new number (`/api/owner/users` PUT route).

### 15.9 Self-Deletion Prevention

Owner cannot delete their own account via the user management interface.

---

## Appendix A: Default Working Hours

```
Saturday:    10:00 - 18:00
Sunday:      10:00 - 18:00
Monday:      10:00 - 18:00
Tuesday:     10:00 - 18:00
Wednesday:   10:00 - 18:00
Thursday:    10:00 - 18:00
Friday:      Closed
```

## Appendix B: Default Services

| # | Name | Duration | Price | Priority |
|---|------|----------|-------|----------|
| 1 | ژلیش ناخن (Gelish) | 45 min | 350,000 T | 7 |
| 2 | فرنچ ناخن (French) | 60 min | 450,000 T | 8 |
| 3 | طراحی ناخن (Nail Art) | 90 min | 600,000 T | 10 |
| 4 | پدیکور (Pedicure) | 60 min | 400,000 T | 6 |
| 5 | ترمیم ناخن (Repair) | 45 min | 300,000 T | 5 |

## Appendix C: Default Addons

| ID | Name | Duration | Price |
|----|------|----------|-------|
| a1 | طراحی ساده (Simple Design) | 10 min | 50,000 T |
| a2 | سنگ ناخن (Nail Stone) | 5 min | 30,000 T |
| a3 | کروم ناخن (Nail Chrome) | 5 min | 40,000 T |
| a4 | فرنچ رنگی (Colored French) | 5 min | 30,000 T |
| a5 | نگین فرنچ (French Gems) | 10 min | 40,000 T |
| a6 | لاک ژل پا (Foot Gel Polish) | 15 min | 100,000 T |

## Appendix D: Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase anonymous key |
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase service role key |
| `OWNER_SESSION_SECRET` | Server | HMAC secret for owner sessions |
