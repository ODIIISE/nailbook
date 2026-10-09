"use client";

import { useId } from "react";
import { motion } from "framer-motion";

interface SegOption<T extends string> {
  value: T;
  label: string;
}

interface SegProps<T extends string> {
  value: T;
  options: Array<SegOption<T>>;
  onChange: (value: T) => void;
  label: string;
  size?: number;
}

/* Studio segmented control with sliding knob. */
export function Seg<T extends string>({ value, options, onChange, label, size }: SegProps<T>) {
  const id = useId();
  return (
    <div className="seg" role="tablist" aria-label={label} style={size ? { fontSize: size } : undefined}>
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          className={value === opt.value ? "on" : ""}
          onClick={() => onChange(opt.value)}
        >
          {value === opt.value && (
            <motion.i layoutId={`knob-${id}`} className="knob" transition={{ type: "spring", stiffness: 380, damping: 34 }} />
          )}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
