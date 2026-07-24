# Multi-Salon Deployment Guide

## Architecture

```
nailbook-admin.vercel.app      ← Admin panel (manages all salons)
forehand-nail.vercel.app       ← Forehand Nail Studio
barberman-nail.vercel.app      ← Barber Man
any-salon.vercel.app           ← Any new salon
```

**One repo. Multiple Vercel deployments. Each filtered by SALON_ID.**

## Quick Start (2 steps)

### Step 1: Deploy Admin Panel

```bash
./scripts/deploy-admin.sh
```

Then visit `https://nailbook-admin.vercel.app/bootstrap` to create your super-admin account.

### Step 2: Create + Deploy Salon (via Admin Panel)

1. Login to admin panel → click "سالن جدید"
2. Enter salon info (name, slug, phone, address)
3. Set working hours
4. Review and click "ایجاد و ادامه"
5. Click "استقرار" — the wizard handles everything:
   - Creates Vercel project
   - Sets SALON_ID and session secrets
   - Deploys the code
   - Seeds 5 default services
6. Show the salon owner their bootstrap link: `https://<slug>.vercel.app/bootstrap`

That's it! The salon is live.

## What the Wizard Does Automatically

| Step | What happens |
|------|-------------|
| Create | Inserts salon into `salons` table |
| Deploy | Creates Vercel project via API, sets env vars, triggers deployment |
| Seed | Adds 5 default nail services (manicure, pedicure, gel polish, etc.) |
| Done | Shows live URL + owner bootstrap link |

## After Deployment

The salon owner needs to:

1. Visit `https://<slug>.vercel.app/bootstrap`
2. Enter their phone number and create a 4-digit PIN
3. Start adding/managing services and bookings

## Environment Variables (set automatically by wizard)

| Variable | Purpose |
|----------|---------|
| `SALON_ID` | Identifies which salon this deployment serves |
| `SALON_NAME` | Display name for the salon |
| `CUSTOMER_SESSION_SECRET` | Signs customer session cookies |
| `OWNER_SESSION_SECRET` | Signs owner session cookies |

## Cost

| Item | Cost |
|------|------|
| Vercel Hobby (admin) | Free |
| Vercel Hobby (per salon) | Free |
| Vercel Postgres (shared) | Free |
| **Total** | **$0** (up to 200 Vercel projects) |
