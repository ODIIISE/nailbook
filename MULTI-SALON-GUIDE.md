# Multi-Salon Deployment Guide

## Architecture

```
nailbook-admin.vercel.app      ← Admin panel (manages all salons)
forehand-nail.vercel.app       ← Forehand Nail Studio
barberman-nail.vercel.app      ← Barber Man
any-salon.vercel.app           ← Any new salon
```

**One repo. Multiple Vercel deployments. Each filtered by SALON_ID.**

## Quick Start (3 steps)

### Step 1: Deploy Admin Panel

```bash
./scripts/deploy-admin.sh
```

Then visit `https://nailbook-admin.vercel.app/bootstrap` to create your super-admin account.

### Step 2: Create Salon in Admin Panel

1. Login to admin panel
2. Click "Create Salon"
3. Enter salon name, phone, address
4. Copy the salon UUID shown

### Step 3: Deploy Salon

```bash
./scripts/deploy-salon.sh forehand-nail <salon-uuid-from-step-2>
```

That's it! The salon is now live at `https://forehand-nail.vercel.app`.

## Repeat for Each New Salon

```bash
# Create salon in admin panel → copy UUID
./scripts/deploy-salon.sh barberman-nail <uuid>
./scripts/deploy-salon.sh salon3-nail <uuid>
```

## Manual Steps Required

1. **Deploy admin panel** — run the script
2. **Create super-admin** — visit bootstrap page
3. **Create salons** — in admin panel UI
4. **Deploy each salon** — run the script per salon

**Total: 4 one-time steps + 1 step per new salon**

## Environment Variables

| Deployment | SALON_ID | What it shows |
|------------|----------|---------------|
| Admin panel | Not set | All salons, all data |
| Salon app | Set to salon UUID | Only that salon's data |

## Cost

| Item | Cost |
|------|------|
| Vercel Hobby (admin) | Free |
| Vercel Hobby (per salon) | Free |
| Supabase/Vercel Postgres | Free |
| **Total** | **$0** (up to 200 Vercel projects) |
