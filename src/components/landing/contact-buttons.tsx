"use client";

import { MessageCircle, Phone, MapPin } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { isValidIranianPhone } from "@/lib/digits";
import type { WorkingHours } from "@/lib/slots";

interface ContactButtonsProps {
  phone: string;
  address?: string;
  workingHoursText?: string;
  workingHours?: WorkingHours;
}

const DAY_LABELS: Record<keyof WorkingHours, string> = { sat: "شنبه", sun: "یکشنبه", mon: "دوشنبه", tue: "سه‌شنبه", wed: "چهارشنبه", thu: "پنجشنبه", fri: "جمعه" };

function formatWorkingHours(workingHours?: WorkingHours): string {
  if (!workingHours) return "اطلاعات ثبت نشده";
  return (Object.entries(workingHours) as Array<[keyof WorkingHours, WorkingHours[keyof WorkingHours]]>)
    .filter(([, hours]) => hours)
    .map(([day, hours]) => `${DAY_LABELS[day]} ${hours!.open} تا ${hours!.close}`)
    .join(" · ") || "اطلاعات ثبت نشده";
}

export function ContactButtons({ phone, address = "", workingHoursText = "", workingHours }: ContactButtonsProps) {
  const valid = isValidIranianPhone(phone);
  const smsUrl = valid ? `sms:${phone}` : null;
  const whatsappUrl = valid ? `https://wa.me/98${phone.slice(1)}` : null;
  const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const actionClass = "qwen-quick-link";

  return (
    <section className="qwen-contact" aria-labelledby="contact-heading">
      <div className="qwen-hours-line"><span className="font-semibold text-foreground">ساعات کاری</span><span aria-hidden="true"> · </span><span>{workingHoursText || formatWorkingHours(workingHours)}</span></div>
      <h2 id="contact-heading" className="sr-only">راه‌های ارتباطی</h2>
      <div className="qwen-quick-links">
        {phone && <a href={`tel:${phone}`} className={actionClass} aria-label="تماس با سالن"><Phone className="h-5 w-5" aria-hidden="true" /></a>}
        {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={actionClass} aria-label="تماس در واتساپ"><WhatsAppIcon className="h-5 w-5" /></a>}
        {smsUrl && <a href={smsUrl} className={actionClass} aria-label="ارسال پیامک"><MessageCircle className="h-5 w-5" aria-hidden="true" /></a>}
        {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={actionClass} aria-label={`باز کردن مسیر ${address} در نقشه`}><MapPin className="h-5 w-5" aria-hidden="true" /></a>}
      </div>
    </section>
  );
}
