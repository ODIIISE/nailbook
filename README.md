# Forehand Nail Studio — Online Booking App

A Persian-language online booking platform for nail salons, built with Next.js 16 and Vercel.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (base-nova)
- **Database**: Vercel Postgres (Neon)
- **File Storage**: Vercel Blob
- **Hosting**: Vercel (serverless functions)
- **Font**: Vazirmatn (Persian/Arabic)
- **Calendar**: Jalali (Persian calendar)

## Features

### Customer
- Browse services with prices and durations
- Select addons/options per service
- Pick date and time slot from Jalali calendar
- Phone-based registration and login (4-digit PIN)
- View booking history
- Contact via phone/WhatsApp/SMS

### Owner
- Dashboard with daily timeline view
- Manage services and addons (add/edit/delete)
- Manage working hours and days off
- Block time slots
- Manual reservation
- User management (create/edit/delete customers)
- Salon settings (name, logo, description, hours)
- Highlight management (Instagram-style stories)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes (serverless functions)
│   │   ├── auth/           # Customer auth (phone + PIN)
│   │   ├── owner/          # Owner-only routes (auth required)
│   │   ├── read/           # Public read endpoints
│   │   ├── book/           # Booking slot validation
│   │   └── upload-*        # File upload to Vercel Blob
│   ├── owner/              # Owner dashboard pages
│   └── [customer pages]    # Landing, booking, profile, etc.
├── components/
│   ├── ui/                 # Reusable UI primitives (Button, Card, Input, etc.)
│   ├── landing/            # Landing page components
│   ├── booking/            # Booking flow components
│   ├── owner/              # Owner dashboard components
│   └── layout/             # Header, nav, background
├── lib/
│   ├── db/data.ts          # Client-side data fetching (via API routes)
│   ├── owner-auth.ts       # Owner session verification (HMAC)
│   ├── salon-context.tsx   # Global state provider
│   ├── auth-context.tsx    # Customer auth provider
│   ├── slots.ts            # Time slot generation engine
│   ├── jalali.ts           # Jalali calendar utilities
│   ├── digits.ts           # Persian/English digit conversion
│   ├── time.ts             # Tehran timezone helpers
│   └── anti-spam.ts        # Booking rate limiting
└── types/                  # TypeScript declarations
```

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
- `POSTGRES_URL` — Vercel Postgres connection string
- `POSTGRES_PRISMA_URL` — Prisma-compatible connection string
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob access token
- `OWNER_SESSION_SECRET` — Secret for signing owner session cookies

### Database Setup

Run the SQL migration in your Neon/Vercel Postgres dashboard. See `supabase/schema.sql` for the full schema.

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
| `/api/owner/addons` | PUT | Owner | Save addons |
| `/api/owner/users` | GET/POST/PUT/DELETE | Owner | User CRUD |
| `/api/owner/blocked-times` | GET/PUT | Owner (PUT) | Manage blocked times |
| `/api/update-salon` | POST | Owner | Update salon info |
| `/api/read/salon` | GET | None | Public salon info |
| `/api/read/services` | GET | None | Public services list |
| `/api/read/addons` | GET | None | Public addons list |
| `/api/read/bookings` | GET | Owner | Owner's bookings |
| `/api/read/booking` | POST | None | Create booking |
| `/api/upload-logo` | POST | Owner | Upload salon logo |
| `/api/upload-highlight` | POST | Owner | Upload highlight image |
| `/api/book/reserve` | POST | None | Check slot availability |

## License

Private — Forehand Nail Studio
