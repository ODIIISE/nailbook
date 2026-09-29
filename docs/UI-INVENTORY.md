# Nailbook UI Inventory

One line per screen: what the user sees, does, and which states exist. This is the
reference for every later audit — if a state isn't listed here, it wasn't designed.

Areas: **Brand** · **Customer** · **Booking** · **Owner** · **Admin** · **Global**.
Modes: Editorial (homepage) vs Atelier (everything else) per DESIGN-SYSTEM.md.

## Brand

| Screen | Route | User actions | States |
|---|---|---|---|
| Homepage (Editorial) | `/` | book CTA → `/book`, portfolio CTA, tel/Instagram links, address toast, hero slideshow (swipe/autoplay/dots), hamburger menu | loaded · data-missing (salon fields) · slideshow manual/auto · reduced-motion |
| Portfolio / Looks | `/portfolio` | browse looks, open look → `/book?look=` | grid loaded · empty · image missing |

## Customer

| Screen | Route | User actions | States |
|---|---|---|---|
| Login | `/login` | phone entry, OTP verify, resend (cooldown), back | idle · sending · code sent · verified · wrong code · invalid phone · server error |
| Bootstrap | `/bootstrap` | first-run salon setup | loading · error |
| Profile | `(main)/profile` | edit name, view/edit phone, open booking detail (مشاهده), cancel, logout, back | loaded · saving · saved · error |
| Bookings list | `(main)/bookings` | open detail, cancel, back | logged-out CTA · empty · grouped-by-date list · polling refresh · detail sheet open · cancel confirm · cancel in-flight · cancel success/fail toast |
| Booking detail | sheet on bookings | view full receipt fields, cancel (inline confirm), close | sheet · confirming · cancelling · cancelled elsewhere (status rollback) |
| Booking receipt (shareable) | `(main)/bookings/[id]` | view receipt, back, new booking | server-rendered · not-found |

## Booking (the money path)

| Screen | Route | User actions | States |
|---|---|---|---|
| Flow: service | `/book` (step 1) | pick service (accordion), toggle addons, look banner (deep link) | no services · look preset · look cleared · selected card |
| Flow: time | `/book` (step 2) | pick date strip (14d, availability-aware), pick slot, day navigation | closed day · fully booked (auto-anchor) · slots load · sold-out race (conflict recovery) |
| Flow: review | `/book` (step 3) | verify phone (inline OTP), edit name, confirm | unverified · verifying · name saving · submitting · double-submit guard |
| Flow: success | `/book` (step 4) | add to calendar (ICS/Google), done | custom owner title · tracking code · |
| Printed receipt | `/book` receipt | print/save | image snapshot |

## Owner

| Screen | Route | User actions | States |
|---|---|---|---|
| Owner login | `/owner/login` | phone + OTP | idle · sending · error |
| Dashboard | `/owner` | today's timeline, status changes, manual reserve, open booking | empty day · live polling · conflict on change |
| Schedule | `/owner/schedule` | weekly hours, days off, blocked times | unsaved changes · validation (end<start) |
| Services | `/owner/services` | CRUD service, addons, ordering, active toggle, image upload | no services · upload error · repriced after bookings (snapshot rule) |
| Users | `/owner/users` | list customers, view history | empty |
| Settings | `/owner/settings` | salon fields, Instagram/phone, success title, slot engine config | invalid URL/phone · saving · saved |
| Activity | `/owner/activity` | log feed | empty |
| Highlights | `/owner/highlights` | CRUD looks, cover upload, link service/addons | no looks · upload error |

## Admin

| Screen | Route | User actions | States |
|---|---|---|---|
| Admin login / panel | `/admin/login`, `/admin` | gate, overview | unauthorized |
| Salons | `/admin/salons` (+ new/[id]) | CRUD salons | empty · validation |
| Import/Export/Migrate/Bootstrap | `/admin/*` | data ops | in-flight · error · done |

## Global (cross-screen)

| Piece | Where | States |
|---|---|---|
| Hamburger menu | customer shell | open · close · reduced-motion |
| Toasts (Sonner) | everywhere | success · error · stacked · safe-area |
| Sheets/dialogs | bookings, owner modals | open · focus-trapped · ESC/scrim close · portal (transform-safe) |
| SalonGuard | salon-dependent pages | resolving · fallback |
| Polling | bookings/owner | interval · focus/visibility refresh |
| Skeletons | lists | shimmer per `.skeleton` |
| Haptics | taps, success, warning | tap/success/warning |

## Known conventions (do not re-litigate per screen)

- Phone frame: `--frame-max-w` (min(100vw, 480px)); gutter `--page-gutter` 20px.
- Header pattern: 44px icon slot / centered kicker+title / 44px slot.
- Status pills: single shared component `src/components/ui/status-pill.tsx` — labels, token colors, and dot per status; `completed` is intentionally neutral (green is reserved for "تأیید شده"). Never copy STATUS_MAP into a page.
- Dates: Jalali + Persian digits; times/phones/tracking `dir="ltr"`.
- Touch: 44px targets; icon-btn utility; pills for primary CTAs.
