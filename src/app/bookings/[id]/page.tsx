import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { sql } from "@vercel/postgres";
import { CalendarDays, Clock, MapPin, Phone, ArrowRight } from "lucide-react";
import { compactToman } from "@/lib/pricing";
import { gregorianToJalali, toPersianDigits, formatJalaliDate } from "@/lib/jalali";
import { parseGregorianDateKey } from "@/lib/time";

export const metadata = {
  title: "تأیید نوبت",
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  reserved: { label: "ثبت شده", cls: "reserved" },
  confirmed: { label: "تایید شده", cls: "confirmed" },
  pending: { label: "در انتظار", cls: "pending" },
  completed: { label: "انجام شده", cls: "completed" },
  cancelled: { label: "لغو شده", cls: "cancelled" },
};

interface BookingVerifyPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingVerifyPage({ params }: BookingVerifyPageProps) {
  const { id } = await params;

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

  const statusKey = String(booking.status || "pending");
  const status = STATUS_MAP[statusKey] || STATUS_MAP.pending;

  return (
    <div className="qbf-page">
      <header className="qbf-head">
        <Link href="/" className="qbf-round-btn" style={{ textDecoration: "none" }} aria-label="بازگشت">
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="qbf-mid">
          <span className="qbf-kicker">نوبت شما</span>
          <h2 className="qbf-title">تأیید نوبت</h2>
        </div>
        <span className="qbf-head-spacer" />
      </header>

      <div className="qbp-body">
        <div className="qbf-form-card" style={{ padding: 0 }}>
          {/* Salon */}
          <div className="qbp-detail-row" style={{ alignItems: "center" }}>
            {booking.salon_logo_url ? (
              <Image
                src={booking.salon_logo_url}
                alt={booking.salon_name}
                width={44}
                height={44}
                unoptimized
                className="h-11 w-11 rounded-xl object-cover"
              />
            ) : (
              <span className="qbf-rev-ic">
                {String(booking.salon_name || "FN").slice(0, 2)}
              </span>
            )}
            <span className="qbp-dlabel" style={{ fontWeight: 800, color: "var(--qbf-ink)", fontSize: 14 }}>
              {booking.salon_name}
            </span>
            <span className={`qbp-status ${status.cls}`}><i aria-hidden="true" />{status.label}</span>
          </div>
          {booking.salon_address && (
            <div className="qbp-detail-row">
              <span className="qbp-dlabel"><MapPin className="h-4 w-4" style={{ verticalAlign: -3, marginInlineEnd: 4 }} aria-hidden="true" />آدرس</span>
              <span className="qbp-dvalue small" style={{ textAlign: "left" }}>{booking.salon_address}</span>
            </div>
          )}

          <div className="qbp-detail-row">
            <span className="qbp-dlabel">خدمت</span>
            <span className="qbp-dvalue">{booking.service_name}</span>
          </div>
          {booking.service_price != null && (
            <div className="qbp-detail-row">
              <span className="qbp-dlabel">هزینه</span>
              <span className="qbp-dvalue">{compactToman(Number(booking.service_price))}</span>
            </div>
          )}
          <div className="qbp-detail-row">
            <span className="qbp-dlabel"><CalendarDays className="h-4 w-4" style={{ verticalAlign: -3, marginInlineEnd: 4 }} aria-hidden="true" />تاریخ</span>
            <span className="qbp-dvalue">{formatJalaliDate(jalali.jy, jalali.jm, jalali.jd)}</span>
          </div>
          <div className="qbp-detail-row">
            <span className="qbp-dlabel"><Clock className="h-4 w-4" style={{ verticalAlign: -3, marginInlineEnd: 4 }} aria-hidden="true" />ساعت</span>
            <span className="qbp-dvalue" dir="ltr">
              {toPersianDigits(booking.start_time.slice(0, 5))} - {toPersianDigits(booking.end_time.slice(0, 5))}
            </span>
          </div>
          <div className="qbp-detail-row">
            <span className="qbp-dlabel">کد رهگیری</span>
            <span className="qbp-dvalue small" dir="ltr">#{displayId}</span>
          </div>
          {booking.salon_phone && (
            <div className="qbp-detail-row" style={{ justifyContent: "center" }}>
              <span className="qbp-dvalue small" style={{ textAlign: "center" }} dir="ltr">
                <Phone className="h-4 w-4" style={{ verticalAlign: -3, marginInlineEnd: 6 }} aria-hidden="true" />
                {booking.salon_phone}
              </span>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <Link href="/" className="qbf-empty-cta" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>
            رزرو نوبت جدید
          </Link>
        </div>
      </div>
    </div>
  );
}
