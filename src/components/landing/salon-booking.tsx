"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { LuxHome } from "@/components/landing/lux-home";
import { SalonGuard } from "@/components/ui/salon-guard";

import { toast } from "sonner";

export function SalonBooking() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const welcome = searchParams.get("welcome");
    if (welcome === "1") {
      const name = searchParams.get("name");
      toast.success(name ? `خوش آمدید ${name}` : "خوش آمدید", {
        description: searchParams.get("name") ? "حساب شما با موفقیت ساخته شد" : "ورود شما با موفقیت انجام شد",
        duration: 3000,
      });
      router.replace("/", { scroll: false });
    }
  }, [router, searchParams]);

  return (
    <SalonGuard fallback={<div className="min-h-screen bg-background" aria-hidden="true" />}>
      <LuxHome />
    </SalonGuard>
  );
}
