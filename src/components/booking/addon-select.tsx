"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Puzzle, Check } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { Addon } from "@/lib/mock-data";

interface AddonSelectProps {
  addons: Addon[];
  selectedAddons: string[];
  onToggle: (addonId: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}

export function AddonSelect({
  addons,
  selectedAddons,
  onToggle,
  onContinue,
  onSkip,
}: AddonSelectProps) {
  const activeAddons = addons.filter((a) => a.is_active);

  if (activeAddons.length === 0) {
    return null;
  }

  const totalPrice = selectedAddons.reduce((sum, id) => {
    const addon = activeAddons.find((a) => a.id === id);
    return sum + (addon?.price || 0);
  }, 0);

  const totalDuration = selectedAddons.reduce((sum, id) => {
    const addon = activeAddons.find((a) => a.id === id);
    return sum + (addon?.duration_minutes || 0);
  }, 0);

  return (
    <Card className="mx-auto max-w-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Puzzle className="h-5 w-5 text-navy" />
        <h3 className="font-semibold text-foreground">آپشن‌های اضافی</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        خدمات اضافی را به نوبت خود اضافه کنید
      </p>

      <div className="space-y-2">
        {activeAddons.map((addon) => {
          const isSelected = selectedAddons.includes(addon.id);
          return (
            <div
              key={addon.id}
              onClick={() => onToggle(addon.id)}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? "bg-navy/10 border border-navy/30"
                  : "bg-secondary/50 border border-transparent hover:bg-secondary"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all ${
                    isSelected
                      ? "bg-navy border-navy text-white"
                      : "border-border"
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </div>
                <div>
                  <span className="text-sm font-medium">{addon.name}</span>
                  <p className="text-[11px] text-muted-foreground">
                    +{toPersianDigits(addon.duration_minutes)} دقیقه
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-navy">
                +{toPersianDigits(addon.price.toLocaleString("fa-IR"))} تومان
              </span>
            </div>
          );
        })}
      </div>

      {selectedAddons.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-navy/5 border border-navy/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">آپشن‌های انتخابی</span>
            <Badge variant="secondary" className="bg-navy/10 text-navy">
              {toPersianDigits(selectedAddons.length)} مورد
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">هزینه اضافی</span>
            <span className="font-bold text-navy">
              +{toPersianDigits(totalPrice.toLocaleString("fa-IR"))} تومان
            </span>
          </div>
          {totalDuration > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">زمان اضافی</span>
              <span className="text-foreground">
                +{toPersianDigits(totalDuration)} دقیقه
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <Button
          onClick={onContinue}
          className="flex-1 bg-navy hover:bg-navy/90 text-white rounded-xl"
        >
          ادامه
        </Button>
        <Button
          variant="outline"
          onClick={onSkip}
          className="flex-1"
        >
          رد شدن
        </Button>
      </div>
    </Card>
  );
}
