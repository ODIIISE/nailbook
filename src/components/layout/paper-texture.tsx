"use client";

import { useEffect } from "react";

/**
 * Generates a subtle paper texture tile and applies it as a CSS variable.
 * The texture is a 200x200px canvas with very fine grain (±2 brightness).
 * This creates the barely-visible paper fiber effect.
 */
export function PaperTexture() {
  useEffect(() => {
    const size = 200;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = ctx.createImageData(size, size);
    const d = img.data;

    // Base: #ebe8e4 = rgb(235, 232, 228)
    const bR = 235, bG = 232, bB = 228;

    for (let i = 0; i < d.length; i += 4) {
      // Subtle noise — max ±2 brightness
      const n = (Math.random() - 0.5) * 4;
      d[i]     = bR + n;
      d[i + 1] = bG + n;
      d[i + 2] = bB + n;
      d[i + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);

    // Convert to data URL and set as CSS custom property
    const dataUrl = canvas.toDataURL("image/png");
    document.documentElement.style.setProperty(
      "--paper-tile",
      `url("${dataUrl}")`
    );
  }, []);

  return null;
}
