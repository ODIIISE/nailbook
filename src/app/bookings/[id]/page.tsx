import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { sql } from "@vercel/postgres";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CalendarDays, Clock, MapPin, Phone, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, gregorianToJalali, toPersianDigits, formatJalaliDate } from "@/lib/jalali";
import { parseGregorianDateKey } from "@/lib/time";

export const metadata = {
  title: "تأیید نوبت",
};

const STATUS_LABELS: Record<string, string> = {
  reserved: "ثبت شده",
  confirmed: "تایید شده",
  pending: "در انتظار",
  completed: "انجام شده",
  cancelled: "لغو شده",
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
      s.name AS service_name,
      s.price AS service_price,
      salon.name AS salon_name,
      salon.phone AS salon_phone,
      salon.address AS salon_address,
      salon.logo_url AS salon_logo_url
    FROM bookings b
    JOIN services s ON s.id = b.service_id
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
  const statusLabel = STATUS_LABELS[statusKey] || statusKey;
  const isActive = statusKey === "reserved" || statusKey === "confirmed";
  const isCancelled = statusKey === "cancelled";

  return (
    <div className="min-h-screen bg-background p-4 animate-fade">
      <div className="mx-auto max-w-md pt-8 animate-slideUp">
        <Card className="overflow-hidden border-border shadow-card">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">تأیید نوبت</CardTitle>
              <Badge variant={isCancelled ? "destructive" : isActive ? "default" : "secondary"}>{statusLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Salon */}
            <div className="flex items-center gap-3">
              {booking.salon_logo_url ? (
                <Image
                  src={booking.salon_logo_url}
                  alt={booking.salon_name}
                  width={48}
                  height={48}
                  unoptimized
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <span className="text-xs font-bold text-foreground">
                    {booking.salon_name?.slice(0, 2) || "FN"}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-foreground">{booking.salon_name}</p>
                {booking.salon_address && (
                  <div className="flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="leading-4">{booking.salon_address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Service */}
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">خدمت</p>
              <p className="text-sm font-bold text-foreground">{booking.service_name}</p>
              {booking.service_price != null && (
                <p className="mt-1 text-xs font-bold text-foreground">
                  {formatPrice(Number(booking.service_price))} تومان
                </p>
              )}
            </div>

            {/* Date / Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>تاریخ</span>
                </div>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {formatJalaliDate(jalali.jy, jalali.jm, jalali.jd)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>ساعت</span>
                </div>
                <p className="mt-1 text-sm font-bold text-foreground" dir="ltr">
                  {toPersianDigits(booking.start_time.slice(0, 5))} - {toPersianDigits(booking.end_time.slice(0, 5))}
                </p>
              </div>
            </div>

            {/* Tracking id */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">کد رهگیری</span>
              <span className="text-sm font-bold tabular-nums text-foreground" dir="ltr">
                #{displayId}
              </span>
            </div>

            {booking.salon_phone && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span dir="ltr">{booking.salon_phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <ArrowLeft className="h-4 w-4" />
            رزرو نوبت جدید
          </Link>
        </div>
      </div>
    </div>
  );
}
