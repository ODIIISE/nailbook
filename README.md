# Forehand Nail Studio — Online Booking App

A Persian-language online booking platform for nail salons, built with Next.js 16 and Vercel.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (Base UI)
- **Database**: Vercel Postgres (`@vercel/postgres` — Neon-backed)
- **File Storage**: Vercel Blob
- **Hosting**: Vercel (serverless functions)
- **Font**: Vazirmatn (Persian/Arabic)
- **Calendar**: Jalali (Persian calendar)
- **Timezone**: Asia/Tehran (UTC+03:30, fixed)

## Features

### Customer
- Browse services with prices and durations
- Select addons/options per service
- Pick date and time slot from Jalali calendar
- 3-level gap-minimized time suggestions
- Phone-based registration and login (4-digit PIN)
- View booking history
- Contact via WhatsApp

### Owner
- Dashboard with daily timeline view
- Manage services and addons (add/edit/delete)
- Manage working hours and days off
- Smart scheduling settings (proximity, expansion, overflow)
- Block time slots
- Manual reservation
- User management (create/edit/delete customers)
- Salon settings (name, logo, description)
- Highlight management (Instagram-style stories)

### Booking Engine (v7)
- 3-level gap minimization (proximity-based slot filtering)
- Configurable resolution (5/10/15/20/30/60 min)
- Buffer time between bookings
- Dynamic shift expansion at fill threshold
- Overflow support (extend past shift hours)
- Service-aware day availability
- Server-side concurrent booking protection

## Getting Started

### Prerequisites

- Node.js 18+
- A Vercel account (for Postgres + Blob)

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Required variables:
- `POSTGRES_URL` — Vercel Postgres connection string (auto-set by Vercel)
- `POSTGRES_PRISMA_URL` — Vercel Postgres Prisma-compatible URL (auto-set by Vercel)
- `OWNER_SESSION_SECRET` — Secret for signing owner session cookies (min 32 chars)
- `BOOTSTRAP_OWNER_SECRET` — Required for the one-time owner bootstrap route outside development
- `BOOTSTRAP_SUPER_ADMIN_SECRET` — Required for the one-time super-admin bootstrap route outside development

Optional variables:
- `CUSTOMER_SESSION_SECRET` — Secret for customer sessions (falls back to OWNER_SESSION_SECRET)

### Database Setup

Run the checked-in migrations before exposing a production deployment:

```bash
node scripts/apply-migrations.mjs
```

The one-time bootstrap routes require their corresponding setup secret in production. Treat both secrets as deployment credentials, not user passwords, and remove or rotate them after initial setup.

The app keeps a small compatibility fallback for selected legacy columns, but schema creation and migrations should not be delegated to public read requests.

The migration set creates the required tables before application traffic. Required tables include:
- `users` — Customer and owner accounts
- `salon_info` — Salon configuration (singleton)
- `services` — Available services
- `addons` — Service add-ons
- `bookings` — Customer reservations
- `blocked_times` — Owner-blocked time slots
- `highlights` — Instagram-style highlight groups
- `highlight_images` — Images within highlights

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

### Deploy

Push to `main` branch — Vercel auto-deploys.

## API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/auth/send-otp` | POST | None | Send login OTP (customer + owner) |
| `/api/auth/verify-otp` | POST | None | Verify OTP, create session |
| `/api/auth/me` | GET | Customer | Current session user |
| `/api/auth/update-profile` | POST | Customer | Update name / phone |
| `/api/auth/logout` | POST | Customer | End session |
| `/api/auth/google` + `/api/auth/google/callback` | GET/POST | None | Google sign-in |
| `/api/owner-logout` | POST | Owner | Owner logout (clears cookie) |
| `/api/owner/services` | PUT | Owner | Save services |
| `/api/owner/addons` | PUT | Owner | Save addons |
| `/api/owner/users` | GET/POST/PUT/DELETE | Owner | User CRUD |
| `/api/owner/users/check` | POST | Owner | Check user before edit |
| `/api/owner/blocked-times` | GET/PUT | Owner | Manage blocked times |
| `/api/owner/bookings` | GET | Owner | Owner booking list |
| `/api/owner/bookings/paid` + `/status` | POST | Owner | Mark paid / update status |
| `/api/owner/activity-logs` | GET | Owner | Audit log |
| `/api/owner/backup` | GET/POST | Owner | Backup / restore |
| `/api/owner/migrate` | GET | Owner | Migration helpers |
| `/api/update-salon` | POST | Owner | Update salon info + config |
| `/api/read/salon` | GET | None | Public salon info |
| `/api/read/services` | GET | None | Public services list |
| `/api/read/addons` | GET | None | Public addons list |
| `/api/read/blocked-times` | GET | None | Public blocked times |
| `/api/read/bootstrap` | GET | None | Public shell data (+ owner/customer scope when signed in) |
| `/api/read/bookings` | GET | None | Public availability; owner/customer scopes when signed in |
| `/api/read/highlights` | GET | None | Public highlights |
| `/api/read/highlights` | PUT/DELETE | Owner | Highlight CRUD |
| `/api/read/highlight-images` | POST/DELETE | Owner | Highlight image CRUD |
| `/api/book` | POST | Customer | Create booking (verified session, anti-spam) |
| `/api/bookings/[id]` | PATCH/DELETE | Owner or booker | Cancel booking (customers: reserved/confirmed only) |
| `/api/upload-logo` | POST | Owner | Upload salon logo |
| `/api/upload-highlight` | POST | Owner | Upload highlight image |
| `/api/upload-service-image` | POST | Owner | Upload service image |
| `/api/upload-hero-video` | POST | Owner | Upload hero video |
| `/api/config` | GET | None | Public salon config |
| `/api/social-proof` | GET | None | Social proof feed |
| `/api/bootstrap-owner` | POST | None | First-run owner setup |
| `/api/bootstrap-super-admin` | POST | None | First-run super-admin setup |
| `/api/admin/*` | * | Super Admin | Multi-salon admin |
| `/api/super-admin/login` + `/me` + `/logout` | POST/GET | Super Admin | Super-admin auth |

## Booking Engine Variables

All configurable from the owner schedule page:

| Variable | Default | Description |
|----------|---------|-------------|
| Shift Start/End | Required | Working hours per day |
| Resolution | 15 min | Slot interval (5/10/15/20/30/60) |
| Proximity Window | ±2h | Range around existing bookings |
| Buffer | 0 min | Gap after each booking |
| Early Extra Hours | 0 | Hours before shift start |
| Late Extra Hours | 0 | Hours after shift end |
| Fill Threshold | 80% | Triggers expansion |
| Overflow | OFF | Allow extend past shift |
| Overflow Minutes | 0 | Minutes past shift allowed |

## License

Private — Forehand Nail Studio
