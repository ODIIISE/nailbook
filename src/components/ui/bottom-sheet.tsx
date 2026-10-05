"use client";

import { useEffect, useRef, useState, type ReactNode, type TransitionEvent } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  title: string;
  children: ReactNode;
}

/* Glass bottom sheet — mounted through both phases so open AND close animate.
 * Enter: overlay fades 150ms, panel rises 240ms ease-out. Exit: both snap shut
 * in 150ms along the same path (spatial consistency). Interruptible: toggling
 * mid-flight re-targets the live transition, never restarts a keyframe.
 * Phase state uses render-adjust (never setState-in-effect); the exit phase
 * ends on transitionend. Glass surface with solid fallback under
 * prefers-reduced-transparency. */
export function BottomSheet({ open, onClose, onClosed, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  const [leaving, setLeaving] = useState(false);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setLeaving(prevOpen && !open);
  }
  const visible = open || leaving;
  useFocusTrap(sheetRef, visible);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [visible, onClose]);

  const endLeave = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "transform" || e.target !== e.currentTarget) return;
    if (!leaving) return;
    setLeaving(false);
    onClosed?.();
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="sheet-overlay absolute inset-0 bg-black/40"
        data-open={open}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className="sheet-panel glass-panel relative z-10 flex max-h-[88dvh] w-full max-w-[var(--frame-max-w)] flex-col border-t pb-[env(safe-area-inset-bottom)] text-popover-foreground"
        data-open={open}
        data-closing={leaving}
        onTransitionEnd={endLeave}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden="true" />
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-h3 leading-snug">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="native-scroll min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
