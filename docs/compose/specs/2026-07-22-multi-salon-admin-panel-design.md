# Multi-Salon Admin Panel — Design Spec

## [S1] Problem

NailBook currently supports a single salon. The user needs to manage multiple salons from a central admin panel, with each salon having its own owners, customers, bookings, and settings. The admin panel should be accessible at `/admin` within the same Vercel deployment.

## [S2] Architecture

**Single-app, multi-tenant, path-based routing.**

```
booking.vercel.app/                      ← Landing (salon directory)
booking.vercel.app/admin                 ← Super-admin dashboard
booking.vercel.app/admin/salons          ← Manage all salons
booking.vercel.app/admin/salons/[id]     ← Salon detail view
booking.vercel.app/salon/[slug]          ← Public booking for salon
booking.vercel.app/salon/[slug]/owner    ← Owner dashboard
```

**One Next.js app. One Vercel project. One database.**

## [S3] Database Changes

### New Tables

```sql
-- Salons table
CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  description TEXT,
  slogan TEXT,
  hero_image_url TEXT,
  logo_url TEXT,
  working_hours JSONB DEFAULT '{}',
  working_hours_text TEXT DEFAULT '',
  specific_days_off JSONB DEFAULT '[]',
  slot_buffer_minutes INTEGER DEFAULT 0,
  slot_interval_minutes INTEGER DEFAULT 15,
  early_extra_hours INTEGER DEFAULT 0,
  late_extra_hours INTEGER DEFAULT 0,
  expand_threshold INTEGER DEFAULT 80,
  proximity_window_hours INTEGER DEFAULT 2,
  allow_overflow BOOLEAN DEFAULT false,
  overflow_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Super admins table
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Modified Tables (add salon_id)

```sql
ALTER TABLE users ADD COLUMN salon_id UUID REFERENCES salons(id);
ALTER TABLE services ADD COLUMN salon_id UUID REFERENCES salons(id);
ALTER TABLE addons ADD COLUMN salon_id UUID REFERENCES salons(id);
ALTER TABLE bookings ADD COLUMN salon_id UUID REFERENCES salons(id);
ALTER TABLE blocked_times ADD COLUMN salon_id UUID REFERENCES salons(id);
ALTER TABLE highlights ADD COLUMN salon_id UUID REFERENCES salons(id);
ALTER TABLE highlight_images ADD COLUMN salon_id UUID REFERENCES salons(id);
ALTER TABLE activity_logs ADD COLUMN salon_id UUID REFERENCES salons(id);

-- Backfill existing data to first salon
-- (run after salon is created)
```

### Indexes

```sql
CREATE INDEX idx_users_salon ON users(salon_id);
CREATE INDEX idx_services_salon ON services(salon_id);
CREATE INDEX idx_bookings_salon ON bookings(salon_id);
CREATE INDEX idx_bookings_salon_date ON bookings(salon_id, date_gregorian);
CREATE INDEX idx_blocked_times_salon ON blocked_times(salon_id);
```

## [S4] Authentication

### Super-Admin Auth
- PBKDF2 hashed PIN (same as owner)
- Session cookie: `super_admin_session`
- Middleware protects `/admin/*` routes
- Bootstrap endpoint: `/api/bootstrap-super-admin` (only works when zero super-admins exist)

### Tenant Resolution
- URL contains `salon_id` or `slug`
- All API routes filter by `salon_id`
- Owner auth includes `salon_id` in session
- Customer auth includes `salon_id` in session

### Session Token Format
```
super_admin_session: {userId}:{timestamp}:{version}:{signature}
owner_session: {userId}:{timestamp}:{version}:{salon_id}:{signature}
session: {userId}:{timestamp}:{version}:{salon_id}:{signature}
```

## [S5] API Routes

### Super-Admin APIs
```
POST   /api/bootstrap-super-admin     ← Create first super-admin
POST   /api/super-admin/login         ← Login
POST   /api/super-admin/logout        ← Logout
GET    /api/admin/salons              ← List all salons
POST   /api/admin/salons              ← Create salon
PUT    /api/admin/salons/[id]         ← Update salon
DELETE /api/admin/salons/[id]         ← Delete salon
GET    /api/admin/salons/[id]/users   ← List salon users
POST   /api/admin/salons/[id]/users   ← Create salon user
GET    /api/admin/salons/[id]/bookings ← List salon bookings
GET    /api/admin/stats               ← Cross-salon statistics
```

### Modified Existing APIs (add salon_id filtering)
All existing API routes must filter by `salon_id` from the session or URL:
```
GET    /api/read/salon?salon_id=...      ← Read specific salon
GET    /api/read/services?salon_id=...   ← Read salon services
GET    /api/read/bookings?salon_id=...   ← Read salon bookings
POST   /api/book                         ← Create booking (includes salon_id)
GET    /api/owner/blocked-times          ← Read salon blocked times
PUT    /api/owner/blocked-times          ← Update salon blocked times
... (all owner routes)
```

## [S6] Frontend Routes

### Landing Page (`/`)
- Show all active salons as cards
- Each card links to `/salon/[slug]`
- Simple directory layout

### Super-Admin Panel (`/admin`)
- `/admin` — Dashboard with stats (total salons, users, bookings, revenue)
- `/admin/salons` — Salon list with create/edit/delete
- `/admin/salons/[id]` — Salon detail: users, bookings, settings
- `/admin/salons/[id]/users` — User management for this salon
- `/admin/salons/[id]/bookings` — Booking management for this salon

### Salon Public App (`/salon/[slug]`)
- Same as current `/` route but scoped to salon
- Booking flow, service list, highlights
- All data filtered by salon_id

### Owner Dashboard (`/salon/[slug]/owner`)
- Same as current `/owner` route but scoped to salon
- Timeline, bookings, users, settings

## [S7] Migration Strategy

1. Create `salons` and `super_admins` tables
2. Add `salon_id` columns to all tables (nullable initially)
3. Create default salon from existing salon_info data
4. Backfill all existing data with default salon_id
5. Make `salon_id` NOT NULL on all tables
6. Update all API routes to filter by salon_id
7. Update all frontend routes to include salon context
8. Remove old single-salon routes (`/`, `/owner`, etc.)

## [S8] Vercel Deployment

**Free tier is sufficient** for 1-20 salons:
- 100 deployments/day (only need ~5-10)
- 100 GB data transfer (only need ~1-2 GB)
- 1M function invocations (only need ~100K)
- 10s function timeout (all operations <5s)

**Upgrade triggers:**
- 50+ salons with heavy traffic → Pro ($20/mo)
- Need >60s function timeouts → Pro
- Need >100 deployments/day → Pro

## [S9] Implementation Phases

### Phase 1: Database Schema
- Create migration for salons/super_admins tables
- Add salon_id columns to all tables
- Backfill existing data
- Update types.ts with Salon type

### Phase 2: Super-Admin Auth
- Create super-admin auth library
- Create bootstrap endpoint
- Create login/logout APIs
- Add middleware for /admin routes

### Phase 3: Super-Admin Panel
- Create /admin layout
- Create salon management pages
- Create user management per salon
- Create booking overview per salon
- Create stats dashboard

### Phase 4: Multi-Tenant API
- Update all API routes to filter by salon_id
- Add salon_id to session tokens
- Update all database queries

### Phase 5: Landing & Routing
- Update landing page to show salon directory
- Create /salon/[slug] dynamic route
- Update booking flow to include salon_id
- Update owner dashboard to be salon-scoped

### Phase 6: Testing & Deployment
- Test multi-tenant data isolation
- Test super-admin permissions
- Test booking flow across salons
- Deploy to Vercel
