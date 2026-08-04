"use client";

import { MessageCircle, Phone, MapPin } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { isValidIranianPhone } from "@/lib/digits";
import { cn } from "@/lib/utils";

interface ContactButtonsProps {
  phone: string;
  address?: string;
}

export function ContactButtons({ phone, address = "" }: ContactButtonsProps) {
  const valid = isValidIranianPhone(phone);
  const smsUrl = valid ? `sms:${phone}` : null;
  const whatsappUrl = valid ? `https://wa.me/98${phone.slice(1)}` : null;
  const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const actionClass = "home-contact-action flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-border bg-card px-2 py-2.5 text-small font-medium transition-[background-color,border-color,transform] duration-200 hover:border-foreground/20 hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

  return (
    <section className="px-4 pb-3" aria-labelledby="contact-heading">
      <div className="mx-auto max-w-lg">
        <h2 id="contact-heading" className="mb-3 px-1 text-small font-bold tracking-wide text-muted-foreground">اطلاعات و ارتباط</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {phone && <a href={`tel:${phone}`} className={cn(actionClass, "text-success")} aria-label="تماس با سالن"><Phone className="h-4 w-4" aria-hidden="true" /><span>تماس</span></a>}
          {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={cn(actionClass, "text-success")} aria-label="تماس در واتساپ"><WhatsAppIcon className="h-4 w-4" /><span>واتساپ</span></a>}
          {smsUrl && <a href={smsUrl} className={actionClass} aria-label="ارسال پیامک"><MessageCircle className="h-4 w-4" aria-hidden="true" /><span>پیامک</span></a>}
          {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={actionClass} aria-label="باز کردن مسیر سالن در نقشه"><MapPin className="h-4 w-4" aria-hidden="true" /><span>مسیریابی</span></a>}
        </div>
      </div>
    </section>
  );
}
