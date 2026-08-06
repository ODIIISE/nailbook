"use client";

import { useSearchParams } from "next/navigation";
import BookContent from "./content";

export function BookingRouteShell() {
  const searchParams = useSearchParams();
  return <BookContent key={searchParams.toString()} />;
}
