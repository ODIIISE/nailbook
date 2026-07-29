"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { haptic } from "@/lib/haptics";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef(0);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      // Sub-tick haptic on sheet open — listener gets a tactile anchor that
      // the sheet has actually materialised behind the dimmed backdrop.
      haptic.select();
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = useCallback(() => {
    haptic.tap();
    setIsVisible(false);
    setDragOffset(0);
    setTimeout(() => onCloseRef.current(), 200);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, handleClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragOffset(delta);
  };

  const onTouchEnd = () => {
    if (dragOffset > 100) {
      handleClose();
    } else {
      setDragOffset(0);
    }
  };

  if (!open && !isVisible) return null;

  const isDragging = dragOffset > 0;
  const sheetTranslateY = !isVisible ? "100%" : isDragging ? `${dragOffset}px` : "0";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: `opacity var(--dur-base) var(--ease-out)`,
        }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg bg-card rounded-t-2xl p-4"
        style={{
          transform: `translateY(${sheetTranslateY})`,
          opacity: isVisible ? 1 : 0,
          transition: isDragging
            ? `opacity var(--dur-fast) var(--ease-out)`
            : `transform var(--dur-base) var(--ease-spring-decay), opacity var(--dur-base) var(--ease-out)`,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle — taller hit area + grab cursor feels android-native */}
        <div
          className="flex justify-center mb-4 -mt-2 pt-2 cursor-grab active:cursor-grabbing"
          aria-hidden="true"
        >
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h3 text-foreground">{title}</h3>
          <Button variant="ghost" size="icon-sm" onClick={handleClose} aria-label="بستن">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
