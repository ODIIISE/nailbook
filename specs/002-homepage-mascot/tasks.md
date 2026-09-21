# Tasks: Homepage Cat Mascot

**Input**: specs/002-homepage-mascot/spec.md

- [x] T001 Vendor cat sheets to `public/mascots/` and install `page-mascot` (license attribution in touch-mascot.tsx)
- [x] T002 Create `src/components/landing/touch-mascot.tsx` — vendored fork with touch-gaze branch (FR-2..FR-5)
- [ ] T003 `lux-home.tsx`: remove slideshow state/effects/handlers/dots; render `TouchMascot` in the hero frame
- [ ] T004 `lux-home.module.css`: prune dead slideshow/slide/dot rules; keep entrance choreography
- [ ] T005 Run `npm run check` + `npm run build`
- [ ] T006 Commit → push → CI → Vercel, verify both projects deploy
