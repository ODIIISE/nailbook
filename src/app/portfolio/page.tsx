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
        <header className="hd">
          <button
            type="button"
            className="iconbtn"
            onClick={() => router.push("/")}
            aria-label="بازگشت"
          >
            <ArrowRight size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <h2 className="h-m">{title}</h2>
          <span style={{ width: 40 }} />
        </header>

        <div className="page-gutter min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8">
          {items.length === 0 ? (
            <div className="panel center" style={{ padding: "52px 24px" }}>
              <h3>هنوز نمونه‌کاری ثبت نشده است</h3>
              <p className="t-s">به‌زودی مدل‌های جدید اضافه می‌شوند.</p>
            </div>
          ) : (
            <section className="lk-grid" aria-label={title}>
              {items.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="lk"
                  onClick={() => router.push(`/book?look=${h.id}`)}
                >
                  {h.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded cover in a fixed frame; next/image config not needed
                    <img
                      src={h.cover_url}
                      alt={h.name}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : null}
                  <span>{h.name}</span>
                </button>
              ))}
            </section>
          )}
        </div>
      </div>
    </SalonGuard>
  );
}
