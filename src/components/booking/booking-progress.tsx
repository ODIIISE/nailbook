"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";

type BookingStep = "addons" | "datetime" | "auth" | "confirm" | "receipt";

interface StepConfig {
  id: BookingStep;
  label: string;
  shortLabel: string;
}

interface BookingProgressProps {
  currentStep: BookingStep;
  hasAddons: boolean;
  isLoggedIn: boolean;
}

export function BookingProgress({ currentStep, hasAddons, isLoggedIn }: BookingProgressProps) {
  // Build the actual flow based on current state
  const steps = useMemo(() => {
    const allSteps: StepConfig[] = [];

    if (hasAddons) {
      allSteps.push({ id: "addons", label: "آپشن‌ها", shortLabel: "آپشن" });
    }

    allSteps.push({ id: "datetime", label: "انتخاب زمان", shortLabel: "زمان" });

    if (!isLoggedIn) {
      allSteps.push({ id: "auth", label: "ورود", shortLabel: "ورود" });
    }

    allSteps.push({ id: "confirm", label: "تایید رزرو", shortLabel: "تایید" });

    return allSteps;
  }, [hasAddons, isLoggedIn]);

  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const isReceipt = currentStep === "receipt";

  return (
    <div className="px-4 pt-3 pb-2">
      {/* Progress Bar */}
      <div className="flex gap-1 mb-2">
        {steps.map((step, index) => {
          const isCompleted = isReceipt || index < currentIndex;
          const isCurrent = index === currentIndex && !isReceipt;

          return (
            <div
              key={step.id}
              className="flex-1 h-[3px] rounded-full transition-colors duration-300"
              style={{
                backgroundColor: isCompleted
                  ? "var(--success, #22c55e)"
                  : isCurrent
                  ? "var(--foreground)"
                  : "var(--border, #e5e5e5)",
              }}
            />
          );
        })}
      </div>

      {/* Step Labels */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = isReceipt || index < currentIndex;
          const isCurrent = index === currentIndex && !isReceipt;

          return (
            <div
              key={step.id}
              className="flex items-center gap-1 transition-colors duration-300"
              style={{
                color: isCompleted
                  ? "var(--success, #22c55e)"
                  : isCurrent
                  ? "var(--foreground)"
                  : "var(--muted-foreground, #a3a3a3)",
              }}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : (
                <span className="text-[10px] font-bold">
                  {toPersianDigits(String(index + 1))}
                </span>
              )}
              <span className={`text-[10px] font-medium ${isCurrent ? "font-bold" : ""}`}>
                {step.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
