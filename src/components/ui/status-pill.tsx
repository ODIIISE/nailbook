/* ── Booking status — one definition for every surface ──────────────
   The bookings list, profile recents, and the shareable receipt page
   all render status pills from here, so labels, colors, and markup
   can never drift apart. Token-only colors (Constitution P2):
   `--warning` resolves to amber-700 in light / amber-500 in dark via
   globals.css — no raw Tailwind palette colors. */

const STATUS_PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-micro font-bold";

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  reserved: { label: "ثبت شده", cls: "bg-primary/10 text-primary", dot: "bg-primary" },
  confirmed: { label: "تأیید شده", cls: "bg-success/10 text-success", dot: "bg-success" },
  in_progress: { label: "در حال انجام", cls: "bg-warning/10 text-warning", dot: "bg-warning" },
  pending: { label: "در انتظار", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  /* "انجام شده" is intentionally neutral: green is reserved for "تأیید شده"
     (the state the customer waits for); a finished past visit reads as
     settled history, matching the bookings list and profile. */
  completed: { label: "انجام شده", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  cancelled: { label: "لغو شده", cls: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

export function bookingStatus(status: string) {
  return STATUS_MAP[status] || STATUS_MAP.pending;
}

export function StatusPill({ status, className = "" }: { status: string; className?: string }) {
  const s = bookingStatus(status);
  return (
    <span className={`${STATUS_PILL_BASE} ${s.cls} ${className}`}>
      <i aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
