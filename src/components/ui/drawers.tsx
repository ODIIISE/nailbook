"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEsc } from "@/lib/hooks/use-esc";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
  side?: "right" | "left";
  width?: number | string;
  z?: number;
}

/* Studio side drawer: spring slide, scrim, head/body/foot. */
export function Drawer({ open, onClose, title, sub, children, foot, side = "right", width, z = 0 }: DrawerProps) {
  useEsc(open, onClose);
  const initial = { x: side === "right" ? "100%" : "-100%" };
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            style={{ zIndex: 60 + z }}
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            className={`drawer${side === "left" ? " left" : ""}`}
            style={{ zIndex: 61 + z, width: width || undefined }}
            initial={initial}
            animate={{ x: 0 }}
            exit={initial}
            transition={{ type: "spring", stiffness: 320, damping: 38 }}
          >
            {title !== undefined && (
              <div className="drawer-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="h-m">{title}</div>
                  {sub && <div className="t-s">{sub}</div>}
                </div>
                <button type="button" className="iconbtn" onClick={onClose} aria-label="بستن">
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>
            )}
            <div className="drawer-body">{children}</div>
            {foot && <div className="drawer-foot">{foot}</div>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
