"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSalon } from "@/lib/salon-context";

const SPLASH_DEFAULTS = {
  title: "Forehand Nail",
  slogan: "Nail Art Studio",
} as const;

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
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const exitStartedRef = useRef(false);
  const { salon, loaded } = useSalon();

  useEffect(() => {
    const timer = setTimeout(() => setMinimumTimeElapsed(true), 1500);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    media.addEventListener("change", updateMotion);
    return () => {
      clearTimeout(timer);
      media.removeEventListener("change", updateMotion);
    };
  }, []);

  useEffect(() => {
    // Keep the brand screen over the first data request. This prevents the
    // homepage fallback from flashing between the splash and real content.
    if (!loaded || !minimumTimeElapsed || exitStartedRef.current) return;
    exitStartedRef.current = true;
    const exitTimer = window.setTimeout(() => {
      setExiting(!reducedMotion);
      window.setTimeout(() => setVisible(false), reducedMotion ? 0 : 420);
    }, 0);
    return () => window.clearTimeout(exitTimer);
  }, [loaded, minimumTimeElapsed, reducedMotion]);

  if (!visible) return null;

  const title = salon.splash_title?.trim() || SPLASH_DEFAULTS.title;
  const slogan = salon.splash_slogan?.trim() || SPLASH_DEFAULTS.slogan;
  const logoUrl = salon.splash_logo_url || null;

  return (
    <div className={`splash-screen ${exiting ? "splash-screen-exit" : ""}`}>
      <div className="splash-logo flex flex-col items-center gap-5">
        <div className="relative w-[72px] h-[72px]">
          {logoUrl ? (
            <div className="absolute inset-0 rounded-2xl bg-card border border-border overflow-hidden flex items-center justify-center shadow-elevated">
              <Image
                src={logoUrl}
                alt={title}
                width={72}
                height={72}
                unoptimized
                priority
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="absolute inset-0 rounded-2xl bg-foreground shadow-elevated flex items-center justify-center text-background">
              <BrandMark className="w-10 h-10" />
            </div>
          )}
          <div className="splash-logo-ring" />
        </div>
        <div className="text-center">
          <h1 className="text-h1 text-foreground">{title}</h1>
          <p className="splash-tagline text-caption text-muted-foreground mt-1 uppercase">
            {slogan}
          </p>
        </div>
      </div>
    </div>
  );
}
