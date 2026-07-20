"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-2xl">!</span>
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">خطایی رخ داد</h2>
        <p className="text-sm text-muted-foreground mb-6">
          متأسفانه مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.
        </p>
        <Button variant="paper" onClick={reset}>
          تلاش مجدد
        </Button>
      </div>
    </div>
  );
}
