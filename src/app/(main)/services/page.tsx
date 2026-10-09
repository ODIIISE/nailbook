"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useSalon } from "@/lib/salon-context";
import { Nail } from "@/components/ui/nail";
import { toPersianDigits, formatPrice } from "@/lib/jalali";
import { SalonGuard } from "@/components/ui/salon-guard";

/* Standalone customer menu (v2 ServicesSheet): every active service with
   its add-ons and a per-row deep-link into the booking flow. */
export default function ServicesPage() {
  const router = useRouter();
  const { services, addons, loaded } = useSalon();

  const activeServices = services
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <SalonGuard fallback={<div className="min-h-screen bg-background" aria-hidden="true" />}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
        <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3 pb-2 pt-3">
          <button type="button" className="iconbtn" onClick={() => router.push("/")} aria-label="بازگشت">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="h-m truncate text-center">خدمات و قیمت‌ها</h2>
          <span className="h-11 w-11" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain page-gutter pb-8 pt-2">
          <div className="eyebrow" style={{ textAlign: "right" }}>
            MENU · {toPersianDigits(activeServices.length)}
          </div>
          <h2 className="h-l" style={{ margin: "4px 0 18px" }}>
            هر خدمت، با دقتی آهسته.
          </h2>

          {!loaded && activeServices.length === 0 ? (
            <div className="empty">در حال بارگذاری خدمات…</div>
          ) : activeServices.length === 0 ? (
            <div className="empty">در حال حاضر خدمتی ثبت نشده است.</div>
          ) : (
            <div className="list">
              {activeServices.map((s, i) => {
                const serviceAddons = addons.filter((a) => s.addon_ids.includes(a.id) && a.is_active);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.05 }}
                    style={{ padding: "18px 0" }}
                  >
                    <div className="row">
                      <Nail lacquer={s.lacquer || "pearl"} size={56} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17 }}>{s.name}</div>
                        <div className="t-s">
                          {s.description}، {toPersianDigits(s.duration_minutes)} دقیقه
                        </div>
                      </div>
                      <div className="num pearl" style={{ fontSize: 16 }}>
                        {formatPrice(Number(s.price))}
                        <span className="faint" style={{ fontSize: 14 }}> هزار</span>
                      </div>
                    </div>
                    {serviceAddons.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingInlineStart: 70 }}>
                        {serviceAddons.map((a) => (
                          <span key={a.id} className="badge tone-mute" style={{ height: 30 }}>
                            {a.name}{" "}
                            <span className="num">
                              +{toPersianDigits(Math.round(Number(a.price) / 1000))}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ paddingInlineStart: 70, marginTop: 10 }}>
                      <button type="button" className="btn gl sm" onClick={() => router.push(`/book?service=${s.id}`)}>
                        رزرو این خدمت
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          <p className="t-s" style={{ marginTop: 12 }}>
            طراحی‌های «هر انگشت» با نرخ یک انگشت محاسبه می‌شوند.
          </p>
        </div>
      </div>
    </SalonGuard>
  );
}
