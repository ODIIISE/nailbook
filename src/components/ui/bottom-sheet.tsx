"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-fade"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-lg bg-white rounded-t-2xl p-4 animate-slideUp"
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h3 text-foreground">{title}</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
