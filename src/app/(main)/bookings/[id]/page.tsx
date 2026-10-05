import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { sql } from "@vercel/postgres";
import { CalendarDays, Clock, MapPin, Phone, ArrowRight } from "lucide-react";
import { compactToman } from "@/lib/pricing";
import { StatusPill } from "@/components/ui/status-pill";
import { gregorianToJalali, toPersianDigits, formatJalaliDate } from "@/lib/jalali";
import { parseGregorianDateKey } from "@/lib/time";

export const metadata = {
  title: "تأیید نوبت",
};

// Status pill comes from the shared component — see src/components/ui/status-pill.tsx.

interface BookingVerifyPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingVerifyPage({ params }: BookingVerifyPageProps) {
  const { id } = await params;

  // Guard the UUID cast: a garbage id previously surfaced as a 22P02 500.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const { rows } = await sql`
    SELECT
      b.id,
      b.date,
      b.date_gregorian,
      b.start_time,
      b.end_time,
      b.status,
      b.customer_phone,
      -- Snapshot (migration 022) first: a renamed/repriced/deleted service
      -- must not change what the customer's shared receipt says. The live
      -- service row is only a fallback for legacy bookings.
      COALESCE(b.service_name, s.name) AS service_name,
      COALESCE(b.price_total, s.price) AS service_price,
      salon.name AS salon_name,
      salon.phone AS salon_phone,
      salon.address AS salon_address,
      salon.logo_url AS salon_logo_url
    FROM bookings b
    LEFT JOIN services s ON s.id = b.service_id
    CROSS JOIN salon_info salon
    WHERE b.id = ${id}
    LIMIT 1
  `;

  if (!rows[0]) {
    notFound();
  }

  const booking = rows[0];
  const dateKey = String(booking.date_gregorian ?? "").slice(0, 10);
  const parsedDate = parseGregorianDateKey(dateKey);
  // A malformed legacy row must produce a normal not-found page rather than
  // throwing during Jalali conversion and taking down the whole route tree.
  if (Number.isNaN(parsedDate.getTime())) {
    notFound();
  }
  const jalali = gregorianToJalali(parsedDate);
  const displayId = String(booking.id).slice(-6).toUpperCase();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
      <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3.5 pb-2 pt-3">
        <Link
          href="/"
          className="icon-btn text-foreground"
          aria-label="بازگشت"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="text-center">
          <span className="block text-kicker text-muted-foreground" dir="ltr">
            NAILBOOK
          </span>
          <h2 className="text-lg font-normal">تأیید نوبت</h2>
        </div>
        <span />
      </header>

      <div className="min-h-0 flex-1 page-gutter pb-8 pt-2">
        <div className="rounded-none border border-border bg-card p-4">
          {/* Salon */}
          <div className="flex items-center gap-3">
            {booking.salon_logo_url ? (
              <Image
                src={booking.salon_logo_url}
                alt={booking.salon_name}
                width={44}
                height={44}
                unoptimized
                className="h-11 w-11 rounded-none object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-muted text-xs font-normal text-foreground">
                {String(booking.salon_name || "FN").slice(0, 2)}
              </span>
            )}
            <span className="text-sm font-normal">{booking.salon_name}</span>
            <StatusPill status={String(booking.status || "pending")} className="ms-auto shrink-0" />
          </div>
          {booking.salon_address && (
            <div className="mt-4 flex items-start justify-between gap-3 border-t border-border pt-3">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                آدرس
              </span>
              <span className="text-start text-xs">{booking.salon_address}</span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">خدمت</span>
            <span className="text-sm font-normal">{booking.service_name}</span>
          </div>
          {booking.service_price != null && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">هزینه</span>
              <span className="text-sm font-normal">{compactToman(Number(booking.service_price))}</span>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              تاریخ
            </span>
            <span className="text-sm font-normal">{formatJalaliDate(jalali.jy, jalali.jm, jalali.jd)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              ساعت
            </span>
            <span className="text-sm font-normal" dir="ltr">
              {toPersianDigits(booking.start_time.slice(0, 5))} - {toPersianDigits(booking.end_time.slice(0, 5))}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">کد رهگیری</span>
            <span className="text-xs text-muted-foreground" dir="ltr">#{displayId}</span>
          </div>
          {booking.salon_phone && (
            <div className="mt-4 flex justify-center border-t border-border pt-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground" dir="ltr">
                <Phone className="h-4 w-4" aria-hidden="true" />
                {booking.salon_phone}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Link
            href="/"
            className="flex h-12 w-full items-center justify-center rounded-none bg-primary text-sm font-normal text-primary-foreground"
          >
            رزرو نوبت جدید
          </Link>
        </div>
      </div>
    </div>
  );
}
