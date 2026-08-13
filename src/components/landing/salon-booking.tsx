"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { QwenCustomerHome } from "@/components/landing/qwen-customer-home";
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
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <QwenCustomerHome />
      </div>
    </div>
    </SalonGuard>
  );
}
