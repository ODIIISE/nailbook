# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Customers (primary):** People in Mashhad, Iran who want to book nail appointments at Forehand Nail Studio. They browse services, pick a time slot, and book. They may or may not have an account (PIN-based auth).
- **Salon Owner:** The studio manager who manages services, pricing, working hours, bookings, blocked times, user accounts, and views earnings/activity logs.

## Product Purpose

Enable online booking for a nail salon. Reduce phone calls and walk-in chaos. Give the owner a dashboard to manage the business. Give customers a fast, mobile-friendly way to see availability and book.

## Positioning

A lightweight, Persian-first booking app specifically designed for Iranian nail salons. Not a generic booking platform — it understands Jalali calendar, Persian digits, and local UX patterns.

## Operating Context

- Mobile-first (portrait phone screens)
- RTL Persian language throughout
- Jalali calendar for date selection
- Persian/Arabic digit input
- No app store — accessed via URL (PWA-ready)
- Owner accesses a separate dashboard at /owner
- Customers access the public site at /

## Capabilities and Constraints

- Services with pricing and duration
- Addon services that extend duration
- Time slot availability engine with buffer/interval/resolution controls
- Blocked time management (owner)
- Working hours configuration with day-specific overrides
- Booking flow: phone → PIN → select service → pick date/time → confirm
- Owner dashboard: timeline view, earnings, manual booking, block time
- User management (owner can create/edit/delete users)
- Activity logging
- Backup/restore
- Image upload (highlights, logo) via Vercel Blob
- Anti-spam: rate limiting per phone per day
- Account lockout after failed PIN attempts
- Session auth with HMAC-signed cookies

## Brand Commitments

- Salon name: Forehand Nail Studio (استدیو تخصصی ناخن فورهند)
- Persian-first, RTL layout
- Paper texture theme (soft, feminine aesthetic)
- Color accent: #E86A92 (pink)

## Evidence on Hand

- Working Next.js app with full booking flow
- Custom design system with paper texture background
- Active Vercel deployment
- Supabase database with salon data

## Product Principles

1. Fast — every interaction should feel instant on mobile
2. Simple — minimal steps to complete a booking
3. Persian-first — every label, error, and flow in natural Persian
4. Secure — PIN auth, rate limiting, lockout protection
5. Owner-friendly — dashboard should be intuitive for a non-technical salon manager
