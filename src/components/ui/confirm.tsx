"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEsc } from "@/lib/hooks/use-esc";

interface ConfirmProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  okLabel?: string;
  danger?: boolean;
  onOk: () => void;
  onClose: () => void;
}

/* Studio confirm: glass card pop over a scrim. */
export function Confirm({ open, title, body, okLabel = "تأیید", danger, onOk, onClose }: ConfirmProps) {
  useEsc(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            style={{ zIndex: 80 }}
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="glass"
            style={{
              position: "fixed",
              zIndex: 81,
              left: "50%",
              top: "50%",
              width: "min(420px, calc(100% - 32px))",
              padding: 28,
              direction: "rtl",
              background: "rgba(30,25,21,.96)",
            }}
            initial={{ opacity: 0, scale: 0.92, x: "-50%", y: "-46%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.96, x: "-50%", y: "-48%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="h-m">{title}</div>
            {body && <p className="t-s" style={{ marginTop: 10 }}>{body}</p>}
            <div className="row" style={{ marginTop: 24, justifyContent: "flex-start" }}>
              <button
                type="button"
                className={`btn sm ${danger ? "danger" : "pri"}`}
                onClick={() => {
                  onOk();
                  onClose();
                }}
              >
                {okLabel}
              </button>
              <button type="button" className="btn sm ghost" onClick={onClose}>
                انصراف
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
