"use client";

import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactButtonsProps {
  phone: string;
}

export function ContactButtons({ phone }: ContactButtonsProps) {
  const whatsappUrl = `https://wa.me/98${phone.slice(1)}`;
  const telegramUrl = `https://t.me/+98${phone.slice(1)}`;

  return (
    <div className="px-4 mb-6">
      <Card className="mx-auto max-w-lg p-4 glass shadow-card">
        <p className="text-sm text-muted-foreground text-center mb-3">تماس با ما</p>
        <div className="flex gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 border-green-500/30 text-green-600 hover:bg-green-50 transition-colors duration-200"
            )}
          >
            <MessageCircle className="h-4 w-4 ml-2" />
            واتساپ
          </a>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 border-blue-500/30 text-blue-500 hover:bg-blue-50 transition-colors duration-200"
            )}
          >
            <Send className="h-4 w-4 ml-2" />
            تلگرام
          </a>
        </div>
      </Card>
    </div>
  );
}
