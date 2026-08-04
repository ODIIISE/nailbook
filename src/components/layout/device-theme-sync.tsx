"use client";

import { useTheme } from "@/lib/hooks/use-theme";

/** Mounts the device-theme subscription once for the whole application. */
export function DeviceThemeSync() {
  useTheme();
  return null;
}
