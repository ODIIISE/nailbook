"use client";

import { useRouter } from "next/navigation";
import { useSalon } from "@/lib/salon-context";
import { ServiceCard } from "@/components/booking/service-card";
import { toPersianDigits } from "@/lib/jalali";
import { compactToman } from "@/lib/pricing";

/* Standalone customer menu (v-2 ServicesSheet): every active service with
   its add-ons and a per-row deep-link into the booking flow. Booking logic
   itself stays in /book — this page only links with ?service=. */
export default function ServicesPage() {
  const router = useRouter();
  const { services, addons, loaded } = useSalon();

  const activeServices = services
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="page-gutter mx-auto w-full max-w-xl pb-10 pt-6">
      <p className="text-micro font-normal tracking-widest text-muted-foreground" dir="ltr">
        MENU · {toPersianDigits(activeServices.length)}
      </p>
      <h1 className="mt-1 text-h1 font-normal">هر خدمت، با دقتی آهسته.</h1>

      {!loaded && activeServices.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">در حال بارگذاری خدمات…</p>
      ) : activeServices.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">در حال حاضر خدمتی ثبت نشده است.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {activeServices.map((s) => {
            const serviceAddons = addons.filter((a) => s.addon_ids.includes(a.id) && a.is_active);
            return (
              <ServiceCard
                key={s.id}
                title={s.name}
                price={Number(s.price)}
                badges={[
                  `${toPersianDigits(serviceAddons.length)} افزودنی`,
                  `از ${toPersianDigits(s.duration_minutes)} دقیقه`,
                ]}
                action={{ label: "رزرو این خدمت", expanded: serviceAddons.length > 0 }}
                selected={false}
                onToggle={() => router.push(`/book?service=${s.id}`)}
              >
                {serviceAddons.length > 0 ? (
                  <div>
                    {serviceAddons.map((a) => (
                      <div key={a.id} className="mt-1.5 flex w-full items-center gap-2 text-start text-card-foreground">
                        <span className="min-w-0 flex-1">
                          <b className="block text-sm font-normal">{a.name}</b>
                          <small className="mt-0.5 block text-xs text-card-foreground/60">
                            +{toPersianDigits(a.duration_minutes)} دقیقه
                          </small>
                        </span>
                        <span className="shrink-0 text-xs font-normal text-card-foreground">
                          +{compactToman(Number(a.price))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </ServiceCard>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-center text-xs leading-7 text-muted-foreground">
        طراحی‌های «هر انگشت» با نرخ یک انگشت محاسبه می‌شوند.
      </p>
    </div>
  );
}
