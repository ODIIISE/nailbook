"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Puzzle, Check, ChevronLeft } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { Addon } from "@/lib/mock-data";

interface AddonSelectProps {
  addons: Addon[];
  selectedAddons: string[];
  onToggle: (addonId: string) => void;
  onContinue: () => void;
}

export function AddonSelect({
  addons,
  selectedAddons,
  onToggle,
  onContinue,
}: AddonSelectProps) {
  const activeAddons = addons.filter((a) => a.is_active);

  if (activeAddons.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Puzzle className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">آپشن‌های اضافی</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        خدمات اضافی را به نوبت خود اضافه کنید
      </p>

      <div className="space-y-2">
        {activeAddons.map((addon) => {
          const isSelected = selectedAddons.includes(addon.id);
          return (
            <div
              key={addon.id}
              onClick={() => onToggle(addon.id)}
              className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                isSelected
                  ? "glass border border-primary/30 shadow-card"
                  : "glass border border-border/50 hover:border-primary/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center border-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
                <div>
                  <span className="text-sm font-medium">{addon.name}</span>
                  <p className="text-[11px] text-muted-foreground">
                    +{toPersianDigits(addon.duration_minutes)} دقیقه
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-primary">
                +{toPersianDigits(addon.price.toLocaleString("fa-IR"))} تومان
              </span>
            </div>
          );
        })}
      </div>

      <Button
        onClick={onContinue}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl text-base font-semibold"
      >
        انتخاب زمان
        <ChevronLeft className="h-5 w-5 mr-2" />
      </Button>
    </div>
  );
}
