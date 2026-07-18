# Replace Custom Components with shadcn/ui

> Replace all hand-built modals, dropdowns, tooltips, skeletons, and selects with official shadcn/ui components.

## Tasks

### T1: Replace booking-modal custom overlay → Dialog
- File: `src/components/owner/booking-modal.tsx`
- Replace custom `fixed inset-0 z-50` overlay with `<Dialog>` + `<DialogContent>`
- Replace custom status dropdown with `<Select>` or `<DropdownMenu>`
- Replace inline delete confirm with `<AlertDialog>`

### T2: Replace earnings-modal custom overlay → Dialog
- File: `src/components/owner/earnings-modal.tsx`
- Replace custom overlay with `<Dialog>` + `<DialogContent>`

### T3: Replace manual-reserve-modal native select → Select
- File: `src/components/owner/manual-reserve-modal.tsx`
- Replace `<select>` with shadcn `<Select>`

### T4: Replace block-time-modal (BottomSheet → Drawer)
- File: `src/components/owner/block-time-modal.tsx`
- Already uses BottomSheet, can keep or migrate to `<Drawer>`

### T5: Replace timeline inline block-removal confirm → AlertDialog
- File: `src/components/owner/timeline.tsx`
- Replace inline confirm state with `<AlertDialog>`

### T6: Replace bookings-page inline modal → Drawer
- File: `src/app/bookings/page.tsx`
- Replace inline `BookingDetailModal` with `<Drawer>`
- Replace inline cancel confirm with `<AlertDialog>`

### T7: Replace owner/users inline modals → Dialog + AlertDialog
- File: `src/app/owner/users/page.tsx`
- Replace add/edit modal with `<Dialog>`
- Replace delete confirm with `<AlertDialog>`
- Replace reset PIN modal with `<Dialog>`
- Replace native `<select>` with `<Select>`

### T8: Replace owner/highlights inline modal → Dialog
- File: `src/app/owner/highlights/page.tsx`
- Replace create modal with `<Dialog>`

### T9: Replace schedule-manager Help tooltip → Tooltip
- File: `src/components/owner/schedule-manager.tsx`
- Replace hand-built `Help` component with shadcn `<Tooltip>`

### T10: Replace all custom skeletons → Skeleton component
- Files: all `loading.tsx` files + inline skeleton states
- Replace `animate-pulse bg-muted` divs with `<Skeleton>` from shadcn

### T11: Replace booking-modal status dropdown → DropdownMenu
- File: `src/components/owner/booking-modal.tsx`
- Replace hand-built status selector with `<DropdownMenu>`
