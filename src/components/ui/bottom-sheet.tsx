"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { haptic } from "@/lib/haptics";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  title: string;
  children: ReactNode;
}

const CLOSE_DURATION_MS = 200;

export function BottomSheet({ open, onClose, onClosed, title, children }: BottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const visibilityTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  const onClosedRef = useRef(onClosed);
  const previousOverflowRef = useRef("");
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const closingRef = useRef(false);
  const sheetTitleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
    onClosedRef.current = onClosed;
  }, [onClose, onClosed]);

  const clearTimers = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (visibilityTimerRef.current !== null) {
      window.clearTimeout(visibilityTimerRef.current);
      visibilityTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimers();

    if (open) {
      wasOpenRef.current = true;
      closingRef.current = false;
      previousOverflowRef.current = document.body.style.overflow;
      previousActiveElementRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      document.body.style.overflow = "hidden";
      haptic.select();

      visibilityTimerRef.current = window.setTimeout(() => {
        visibilityTimerRef.current = null;
        setIsMounted(true);
        setIsVisible(true);
        window.requestAnimationFrame(() => {
          sheetRef.current?.querySelector<HTMLElement>("[data-sheet-close]")?.focus();
        });
      }, 16);
    } else if (wasOpenRef.current) {
      // Keep the sheet mounted during its exit transition. This also covers
      // callers that close it by changing `open` instead of using handleClose.
      closingRef.current = true;
      document.body.style.overflow = previousOverflowRef.current;
      setIsVisible(false);
      setDragOffset(0);
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        wasOpenRef.current = false;
        closingRef.current = false;
        setIsMounted(false);
        previousActiveElementRef.current?.focus();
        previousActiveElementRef.current = null;
        onClosedRef.current?.();
      }, CLOSE_DURATION_MS);
    }

    return () => {
      clearTimers();
      document.body.style.overflow = previousOverflowRef.current;
    };
  }, [open, clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    haptic.tap();
    setIsVisible(false);
    setDragOffset(0);
    // Close immediately at the source of the interaction; the effect above
    // owns the 200ms exit lifecycle and calls onClosed exactly once.
    onCloseRef.current();
  }, []);

  useEffect(() => {
    // Keep the trap active through the exit transition so keyboard focus cannot
    // escape behind the sheet before it is unmounted.
    if (!open && !isMounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;

      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      );
      if (focusable.length === 0) {
        event.preventDefault();
        sheetRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (!sheetRef.current.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isMounted, handleClose]);

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartY.current = event.touches[0]?.clientY ?? 0;
  };

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const delta = (event.touches[0]?.clientY ?? touchStartY.current) - touchStartY.current;
    if (delta > 0) setDragOffset(delta);
  };

  const onTouchEnd = () => {
    if (dragOffset > 100) {
      handleClose();
    } else {
      setDragOffset(0);
    }
  };

  if (!open && !isMounted) return null;

  const isDragging = dragOffset > 0;
  const sheetTranslateY = !isVisible ? "100%" : isDragging ? `${dragOffset}px` : "0";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-[var(--booking-sheet-scrim)] backdrop-blur-sm"
        aria-hidden="true"
        onClick={handleClose}
        style={{
          opacity: isVisible ? 1 : 0,
          transition: `opacity var(--dur-base) var(--ease-out)`,
        }}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={sheetTitleId}
        tabIndex={-1}
        className="relative max-h-[min(88dvh,680px)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[var(--radius-sheet)] bg-card p-4"
        style={{
          transform: `translateY(${sheetTranslateY})`,
          opacity: isVisible ? 1 : 0,
          transition: isDragging
            ? `opacity var(--dur-fast) var(--ease-out)`
            : `transform var(--dur-base) var(--ease-spring-decay), opacity var(--dur-base) var(--ease-out)`,
        }}
      >
        <div
          className="mb-4 -mt-2 flex min-h-8 touch-none cursor-grab justify-center pt-2 active:cursor-grabbing"
          aria-hidden="true"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1 w-10 rounded-[var(--radius-sheet-handle)] bg-muted-foreground/30" />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 id={sheetTitleId} className="text-h3 text-foreground">{title}</h3>
          <Button data-sheet-close variant="ghost" size="icon-sm" onClick={handleClose} aria-label="بستن">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {children}
      </div>
    </div>
  );
}
