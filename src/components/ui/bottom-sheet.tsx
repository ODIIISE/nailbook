"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  title: string;
  sub?: ReactNode;
  children: ReactNode;
  /* Persian-first app: the sheet is always RTL unless a caller overrides.
   * Without this, sheets opened from inside LTR islands inherit dir="ltr"
   * and every logical property flips. */
  dir?: "rtl" | "ltr";
  /* "auto" grows with content. "full" pins the panel to 94dvh so children
   * with absolute/flex-fill layouts get a definite height. */
  size?: "auto" | "full";
}

/* Studio bottom sheet: dark glass panel, grab handle, spring rise,
 * drag-to-dismiss. Focus trap + Escape + scroll lock preserved. */
export function BottomSheet({ open, onClose, onClosed, title, sub, children, dir = "rtl", size = "auto" }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  return (
    <AnimatePresence onExitComplete={onClosed}>
      {open && (
        <>
          <motion.div
            className="scrim"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            dir={dir}
            className={`sheet${size === "full" ? " tall" : ""}`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
            dragControls={controls}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140 || info.velocity.y > 700) onClose();
            }}
          >
            <div
              onPointerDown={(e) => controls.start(e)}
              style={{ padding: "4px 0 6px", cursor: "grab", touchAction: "none", flex: "none" }}
            >
              <div className="grab" aria-hidden="true" />
            </div>
            <div className="sheet-head">
              <h2 className="h-m" style={{ flex: 1 }}>{title}</h2>
              {sub}
              <button type="button" className="iconbtn bare" onClick={onClose} aria-label="بستن">
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="sheet-body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
