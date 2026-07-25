"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash-screen">
      <div className="splash-logo flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-background" />
        </div>
        <div className="text-center">
          <h1 className="text-h1 text-foreground">Forehand Nail</h1>
          <p className="splash-tagline text-caption text-muted-foreground mt-1">
            Nail Art Studio
          </p>
        </div>
      </div>
    </div>
  );
}
