"use client";

import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MessageCircle, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";

interface ContactButtonsProps {
  phone: string;
}

export function ContactButtons({ phone }: ContactButtonsProps) {
  const telUrl = `tel:${phone}`;
  const smsUrl = `sms:${phone}`;
  const whatsappUrl = `https://wa.me/98${phone.slice(1)}`;

  return (
    <div className="px-4 mb-5">
      <Card className="mx-auto max-w-lg p-4 shadow-card">
        <p className="text-[12px] text-muted-foreground text-center mb-3 font-medium">تماس با ما</p>
        <div className="flex gap-2">
          <a
            href={telUrl}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 h-11 text-[13px] border-success/25 text-success hover:bg-success/5"
            )}
          >
            <Phone className="h-3.5 w-3.5 ml-1.5" />
            تماس
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 h-11 text-[13px] border-success/25 text-success hover:bg-success/5"
            )}
          >
            <WhatsAppIcon className="h-3.5 w-3.5 ml-1.5" />
            واتساپ
          </a>
          <a
            href={smsUrl}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 h-11 text-[13px] border-primary/25 text-primary hover:bg-primary/5"
            )}
          >
            <MessageCircle className="h-3.5 w-3.5 ml-1.5" />
            پیامک
          </a>
        </div>
      </Card>
    </div>
  );
}
