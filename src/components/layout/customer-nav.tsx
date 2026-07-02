"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar, Phone, MessageCircle } from "lucide-react";
import { useSalon } from "@/lib/salon-context";

export function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { salon } = useSalon();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 glass-strong border-t border-border">
      <div className="mx-auto max-w-lg flex">
        <button
          onClick={() => router.push("/")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            isActive("/") ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-bold">خانه</span>
        </button>
        <button
          onClick={() => router.push("/book")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            isActive("/book") ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[10px] font-bold">رزرو</span>
        </button>
        <a
          href={`tel:${salon.phone}`}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Phone className="h-5 w-5" />
          <span className="text-[10px] font-bold">تماس</span>
        </a>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[10px] font-bold">پیام</span>
        </a>
      </div>
    </div>
  );
}
