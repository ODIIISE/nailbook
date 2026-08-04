"use client";

import { Sparkles } from "lucide-react";

export function LoadingScreen({ label = "در حال بارگذاری" }: { label?: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4"
      role="status"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <div className="loading-orbit" aria-hidden="true">
          <div className="loading-orbit-core">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
        <span className="text-small">{label}...</span>
      </div>
    </div>
  );
}
