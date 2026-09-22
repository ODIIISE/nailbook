"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { LuxHome } from "@/components/landing/lux-home";
import { useSalon } from "@/lib/salon-context";

import { toast } from "sonner";

/**
 * The ?welcome=1 query is the only thing that needs useSearchParams. Keeping
 * it in its own Suspense boundary lets LuxHome (hero + mascot) server-render
 * into the initial HTML — hoisting the hook into this component previously
 * suspended the whole tree, so the hero only appeared after hydration.
 */
function WelcomeToast() {
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

  return null;
}

export function SalonBooking() {
  // specs/003: the shell (navbar + hero + mascot) renders immediately — the
  // old full-page skeleton gate hid everything until the slowest of six
  // fetches landed. LuxHome already falls back per-field when data is still
  // empty, so the page is interactive from the first paint; only the CTAs
  // wait for the critical payload.
  const { loaded } = useSalon();

  return (
    <>
      <Suspense fallback={null}>
        <WelcomeToast />
      </Suspense>
      <LuxHome ctasEnabled={loaded} />
    </>
  );
}
