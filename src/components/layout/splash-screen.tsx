"use client";

import { useState, useEffect } from "react";

// Brand mark — a hand-drawn "N" with an accent dot, drawn inline so it
// matches the foreground token and renders crisply in both themes.
function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M14 8 L14 40"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 8 L34 40"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 24 L34 24"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="36" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash-screen">
      <div className="splash-logo flex flex-col items-center gap-5">
        <div className="relative w-[72px] h-[72px]">
          <div className="absolute inset-0 rounded-2xl bg-foreground shadow-elevated flex items-center justify-center text-background">
            <BrandMark className="w-10 h-10" />
          </div>
          <div className="splash-logo-ring" />
        </div>
        <div className="text-center">
          <h1 className="text-h1 text-foreground">Forehand Nail</h1>
          <p className="splash-tagline text-caption text-muted-foreground mt-1 uppercase">
            Nail Art Studio
          </p>
        </div>
      </div>
    </div>
  );
}
