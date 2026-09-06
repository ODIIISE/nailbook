"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SalonGuard } from "@/components/ui/salon-guard";
import { useSalon } from "@/lib/salon-context";

export default function PortfolioPage() {
  const router = useRouter();
  const { salon, highlights } = useSalon();
  const title = salon.lookbook_title?.trim() || "نمونه‌کارها";
  const items = highlights.slice().sort((a, b) => a.sort_order - b.sort_order);

  return (
    <SalonGuard fallback={<div className="min-h-screen bg-background" aria-hidden="true" />}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
        <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3.5 pb-2 pt-3">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
            onClick={() => router.push("/")}
            aria-label="بازگشت"
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 overflow-hidden text-center">
            <h2 className="truncate text-lg font-bold">{title}</h2>
          </div>
          <span className="h-11 w-11" />
        </header>

        <div className="page-gutter min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8 pt-2">
          {items.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center shadow-card">
              <h3 className="text-sm font-extrabold">هنوز نمونه‌کاری ثبت نشده است</h3>
              <p className="mx-auto mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
                به‌زودی مدل‌های جدید اضافه می‌شوند.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={title}>
              {items.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="group text-start"
                  onClick={() => router.push(`/book?look=${h.id}`)}
                >
                  <span className="block aspect-[3/4] overflow-hidden rounded-xl border border-border bg-muted">
                    {h.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded cover in a fixed frame; next/image config not needed
                      <img
                        src={h.cover_url}
                        alt={h.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span className="mt-1.5 block truncate text-small font-semibold">{h.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </SalonGuard>
  );
}
