"use client";

import { Card } from "@/components/ui/card";
import { MessageCircle, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { isValidIranianPhone } from "@/lib/digits";
import { cn } from "@/lib/utils";

interface ContactButtonsProps {
  phone: string;
}

export function ContactButtons({ phone }: ContactButtonsProps) {
  const valid = isValidIranianPhone(phone);
  const telUrl = `tel:${phone}`;
  const smsUrl = valid ? `sms:${phone}` : null;
  const whatsappUrl = valid ? `https://wa.me/98${phone.slice(1)}` : null;

  const pillClass =
    "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-border/70 bg-transparent px-3 py-3 text-caption font-medium transition-all duration-200 hover:bg-muted/60 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <section className="px-4 pb-3" aria-labelledby="contact-heading">
      <Card className="mx-auto max-w-lg rounded-[24px] border-border/80 bg-card/80 p-5 shadow-card backdrop-blur-sm">
        <h2 id="contact-heading" className="mb-4 text-center text-h3 font-medium text-foreground">
          تماس با ما
        </h2>
        <div className="flex gap-2.5">
          <a
            href={telUrl}
            className={cn(pillClass, "text-success hover:border-success/30 hover:text-success")}
            aria-label="تماس با سالن"
          >
            <Phone className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className="truncate">تماس</span>
          </a>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(pillClass, "text-success hover:border-success/30 hover:text-success")}
              aria-label="تماس در واتساپ"
            >
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              <span className="truncate">واتساپ</span>
            </a>
          )}
          {smsUrl && (
            <a
              href={smsUrl}
              className={cn(pillClass, "text-foreground hover:border-foreground/25")}
              aria-label="ارسال پیامک"
            >
              <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span className="truncate">پیامک</span>
            </a>
          )}
        </div>
      </Card>
    </section>
  );
}
