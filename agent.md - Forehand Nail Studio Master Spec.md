Forehand Nail Studio: Master Specification

1. Project Identity & Core Objective

Project Name: Forehand Nail Studio (Mobile-First Booking Web App)
Core Goal: Automate the booking process for a single nail artist to maximize schedule density, eliminate phone-based bookings, and provide a premium, frictionless "Link-in-bio" reservation experience. Target User: High-end clients seeking a luxury, minimalist aesthetic.

2. Design System: "Aether Glass & Minimal Editorial"

Every UI component must strictly adhere to these visual principles:





Aesthetic: High-end, editorial, minimalist, and airy.



Glassmorphism: Heavy use of backdrop blur, subtle borders, and soft shadows to create depth.



Typography: High-contrast, sophisticated pairings. Use system sans-serif for UI elements and elegant Persian fonts for headings and branding.



Mobile-First UX: All interactions must be thumb-friendly. Avoid small touch targets. Use bottom sheets, horizontal swipes, and haptic-ready feedback patterns.



Color Palette: Neutral, sophisticated tones (whites, creams, soft greys, or deep blacks) to allow the nail art photography to remain the focal point.

3. The Booking Engine: "Gap Minimization" Protocol

The engine is the single source of truth. It must calculate availability based on the following priority hierarchy to ensure the artist's schedule is as compact as possible:

A. Logic Levels (Prioritization)





Level 1 (Seed): Identify any valid slot that fits the service duration (excluding the very start or end of the artist's shift).



Level 2 (Proximity): Prioritize slots within (\pm 2) hours (expandable to (\pm 4) hours) of an existing booking to prevent "Swiss Cheese" schedules.



Level 3 (Adjacency/Filling): Highest priority given to "internal dead gaps" and attaching new bookings directly to the edges of existing ones.

B. Technical Constraints





Resolution: All time slots must operate on a 15-minute interval.



Service Awareness: Availability must be dynamically calculated based on service_duration + buffer_time.



Buffer Management: Automatically inject mandatory buffer times between services to allow for cleaning and rest.



Jalali Calendar: All date logic, displays, and backend storage must handle the Jalali (Persian) calendar seamlessly.

4. UI/UX Component Specifications

A. Date Selection (Horizontal Strip)





Pattern: A horizontally scrollable 7-day view.



States:





Today: Distinctive styling.



Selected: High-contrast/glassmorphic highlight.



Full/Closed: Visual indication (e.g., subtle opacity reduction or "Full" label).



Behavior: Smooth scrolling; immediate update of the Time Block section upon selection.

B. Time Block Selection





Grouping: Separate "Suggested Times" (calculated via Gap Minimization) from "Other Available Times".



Cognitive Load Reduction:





Hide past times.



Hide unavailable or fully booked slots unless explicitly requested.



Use "Suggested" labels to guide the user toward the most efficient business slots.

5. Edge Case & Error Handling





Race Conditions: Implement optimistic UI updates but ensure a server-side "lock" or re-validation occurs before confirming a booking to prevent double-booking.



Manual Overrides: The artist has absolute authority. Manual bookings or "Blackout Blocks" must trigger an immediate recalculation of the "Suggested Times" for all other users.



Empty States: If no slots are available, provide a graceful "No availability found" message with an option to "Notify me when a slot opens."

6. Tech Stack Summary





Frontend: JavaScript (React/Next.js preferred), Shadcn UI, Tailwind CSS.



Calendar: Jalali-compatible logic.



Styling: Tailwind with heavy use of backdrop-blur and arbitrary values for glass effects.