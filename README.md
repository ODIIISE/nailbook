# Forehand Nail Studio — Online Booking App

A Persian-language online booking platform for nail salons, built with Next.js 16 and Vercel.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix UI + Base UI)
- **Database**: Vercel Postgres (Neon)
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
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `SUPABASE_URL` — Supabase project URL (server)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server)
- `OWNER_SESSION_SECRET` — Secret for signing owner session cookies

### Database Setup

The app auto-migrates missing columns on first load. No manual migration needed.

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
| `/api/auth/check-phone` | POST | None | Check if phone exists |
| `/api/auth/create-pin` | POST | None | Register new customer |
| `/api/auth/verify-pin` | POST | None | Login with PIN |
| `/api/owner-login` | POST | None | Owner login |
| `/api/owner/services` | PUT | Owner | Save services |
| `/api/owner/users` | GET/POST/PUT/DELETE | Owner | User CRUD |
| `/api/owner/blocked-times` | GET/PUT | Owner (PUT) | Manage blocked times |
| `/api/update-salon` | POST | Owner | Update salon info + config |
| `/api/read/salon` | GET | None | Public salon info (auto-migrates) |
| `/api/read/services` | GET | None | Public services list |
| `/api/read/addons` | GET | None | Public addons list |
| `/api/book/reserve` | POST | None | Server-side slot validation |
| `/api/upload-logo` | POST | Owner | Upload salon logo |
| `/api/upload-highlight` | POST | Owner | Upload highlight image |

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
