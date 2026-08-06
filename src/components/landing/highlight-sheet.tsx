"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { ArrowLeft, Images } from "lucide-react";
import type { Highlight, Service } from "@/lib/types";
import { formatPrice } from "@/lib/jalali";

interface Props {
  highlight: Highlight;
  service?: Service;
  salonName: string;
  onClose: () => void;
  onBook: (serviceId: string) => void;
}

export function HighlightSheet({ highlight, service, salonName, onClose, onBook }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => closeRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      prevFocus.current?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="qh-scrim" onClick={onClose} aria-hidden="true">
      <div className="qh-sheet" role="dialog" aria-modal="true"
        aria-label={`مدل ${highlight.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="qh-sheet-handle" aria-hidden="true" />
        <div className="qh-sheet-img">
          {highlight.cover_url ? (
            <Image src={highlight.cover_url} alt={highlight.name} fill unoptimized
              sizes="430px" className="qh-sheet-image" />
          ) : (
            <div className="qh-sheet-fallback" aria-hidden="true">
              <Images className="h-10 w-10" /><strong>{highlight.name}</strong>
            </div>
          )}
        </div>
        <div className="qh-sheet-head">
          <h3>{highlight.name}</h3>
          {service && <span className="qh-sheet-price">از {formatPrice(Number(service.price))} تومان</span>}
        </div>
        <p className="qh-sheet-sub">
          این مدل را دوست داری؟ با یک ضربه خدمت مربوطه را در صفحهٔ رزرو باز کن.
        </p>
        <div className="qh-chips">
          {service ? (
            <>
              <span className="qh-chip main">{service.name}</span>
              <span className="qh-chip">{formatPrice(Number(service.price))} تومان · پایه</span>
            </>
          ) : (
            <span className="qh-chip">مدل الهام‌بخش</span>
          )}
        </div>
        {service ? (
          <button ref={closeRef} type="button" className="qh-sheet-cta" onClick={() => onBook(service.id)}>
            رزرو این مدل
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button ref={closeRef} type="button" className="qh-sheet-cta ghost" onClick={onClose}>بستن</button>
        )}
        <p className="qh-sheet-foot">{salonName}</p>
      </div>
    </div>,
    document.body,
  );
}
