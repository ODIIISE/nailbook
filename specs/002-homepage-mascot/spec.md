# Feature Specification: Homepage Cat Mascot Replaces the Hero Slideshow

**Feature Branch**: `main` (no branch hook registered; team ships via main)
**Created**: 2026-09-22
**Status**: Approved (plan approved by user)
**Input**: User description: "can you use this interactive mascot in homepage of app instead of slideshow? … its just a test. i want to use finger touch instead of mouse hover"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A touchable cat greets the customer (Priority: P1)

A customer opens the homepage on their phone. Where the image slideshow used to
be, an illustrated cat sits inside the same framed hero. When they touch and
drag anywhere on the screen, the cat's head follows their finger (nine head
directions). When they lift the finger, the cat settles back to looking
straight ahead. Tapping the cat squashes it playfully and cycles reactions
(blink → heart/sparkle/delighted → dizzy on rapid pokes).

**Why**: the owner explicitly requested an interactive character instead of the
passive slideshow, with finger touch as the primary input (mobile-first salon
app).

### User Story 2 - Desktop keeps cursor-following (Priority: P2)

On a desktop browser the cat watches the cursor across the page with the same
sector/hysteresis/dead-zone feel as the upstream library; hovering remains
passive (no touch needed).

### Edge Cases

- **Reduced motion**: the squash animation is skipped; reaction changes remain
  (they are opacity swaps, not motion).
- **No touch, no fine pointer** (rare hybrids): the cat simply stays centered.
- **Scrolling is never hijacked**: touch listeners are passive; vertical scroll
  gestures behave exactly as before.
- **Sheet load**: the reaction sheet is mounted from first render so the first
  tap never waits on a fetch.
- **Test reversibility**: the owner's `home_gallery_urls` data is untouched;
  the lookbook still shows owner images. Reverting is a one-commit change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-1**: The homepage hero replaces the slideshow (autoplay, swipe, dots)
  with the cat mascot rendered inside the existing framed/parallax/tilt hero.
- **FR-2**: While a finger is down anywhere on the page, the cat's head aims at
  the finger using the upstream 9-sector geometry (dead zone 70px, hysteresis
  0.12). On release it returns to center.
- **FR-3**: Taps produce the upstream reaction sequence and squash; 4 rapid
  taps within 1.6s produce the dizzy easter egg.
- **FR-4**: Desktop (fine pointer) follows the cursor exactly like upstream.
- **FR-5**: `prefers-reduced-motion` disables the squash animation.
- **FR-6**: Character assets are the upstream `cat` sheets, served from
  `public/mascots/`.

### Key Entities

- `TouchMascot` (`src/components/landing/touch-mascot.tsx`): vendored,
  MIT-attributed fork of `page-mascot` with the touch branch added; props:
  `directions`, `reactions`, `size`, `className`, `label`.
- `lux-home.tsx`: hero host; slideshow state/handlers removed.

## Success Criteria *(mandatory)*

- **SC-001**: On a phone, dragging a finger moves the cat's gaze; lifting
  recenters; tapping reacts; scrolling is unaffected.
- **SC-002**: On desktop, the cat follows the cursor.
- **SC-003**: No autoplay timers, swipe handlers, or slide-dot markup remain on
  the homepage.
- **SC-004**: Full check suite (lint + tsc + tests) and production build pass.
